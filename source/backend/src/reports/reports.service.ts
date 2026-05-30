import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../common/database/entities/order.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';
import { Customer } from '../common/database/entities/customer.entity';
import PDFDocument from 'pdfkit';

// ── 接口定义 ──

export interface ProductReportItem {
  productName: string;
  productSpec: string;
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
}

export interface CustomerReportItem {
  customerId: number;
  customerCode: string;
  customerName: string;
  contact: string;
  orderCount: number;
  totalConsumption: number;
  totalReceived: number;
  outstanding: number;
}

export interface TimeReportItem {
  period: string;
  newOrders: number;
  invoicedAmount: number;
  receivedAmount: number;
}

export interface StatusReportItem {
  statusType: string;
  statusValue: string;
  count: number;
  totalAmount: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  // ── 1. 按产品汇总（销量排行，排除已取消订单）──

  async byProduct(): Promise<ProductReportItem[]> {
    const raw = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select('oi.productName', 'productName')
      .addSelect('oi.productSpec', 'productSpec')
      .addSelect('COUNT(DISTINCT oi.orderId)', 'orderCount')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .addSelect('SUM(oi.subtotal)', 'totalAmount')
      .innerJoin('orders', 'o', 'o.id = oi.orderId')
      .where('o.orderStatus != :cancelled', { cancelled: '已取消' })
      .groupBy('oi.productName')
      .addGroupBy('oi.productSpec')
      .orderBy('SUM(oi.subtotal)', 'DESC')
      .getRawMany();

    return raw.map(r => ({
      productName: r.productName,
      productSpec: r.productSpec || '',
      orderCount: Number(r.orderCount),
      totalQuantity: Number(r.totalQuantity),
      totalAmount: Number(r.totalAmount),
    }));
  }

  // ── 2. 按客户汇总（对账单）──

  async byCustomer(): Promise<CustomerReportItem[]> {
    const raw = await this.customerRepository
      .createQueryBuilder('c')
      .select('c.id', 'customerId')
      .addSelect('c.code', 'customerCode')
      .addSelect('c.name', 'customerName')
      .addSelect('c.contact', 'contact')
      .addSelect('COUNT(DISTINCT o.id)', 'orderCount')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'totalConsumption')
      .addSelect('COALESCE(SUM(o.receivedAmount), 0)', 'totalReceived')
      .leftJoin('orders', 'o', 'o.customerId = c.id')
      .groupBy('c.id')
      .addGroupBy('c.code')
      .addGroupBy('c.name')
      .addGroupBy('c.contact')
      .orderBy('SUM(o.totalAmount)', 'DESC')
      .getRawMany();

    return raw.map(r => ({
      customerId: Number(r.customerId),
      customerCode: r.customerCode,
      customerName: r.customerName,
      contact: r.contact || '',
      orderCount: Number(r.orderCount),
      totalConsumption: Number(r.totalConsumption),
      totalReceived: Number(r.totalReceived),
      outstanding: Number(Number(r.totalConsumption) - Number(r.totalReceived)),
    }));
  }

  // ── 3. 按时间段汇总（营收趋势）──

  async byTimePeriod(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<TimeReportItem[]> {
    let dateFormat: string;
    if (groupBy === 'month') {
      dateFormat = "DATE_FORMAT(o.order_date, '%Y-%m')";
    } else if (groupBy === 'week') {
      dateFormat = "DATE_FORMAT(o.order_date, '%Y-%u')";
    } else {
      dateFormat = "DATE_FORMAT(o.order_date, '%Y-%m-%d')";
    }

    const raw = await this.orderRepository
      .createQueryBuilder('o')
      .select(dateFormat, 'period')
      .addSelect('COUNT(DISTINCT o.id)', 'newOrders')
      .addSelect("COALESCE(SUM(CASE WHEN o.invoiceStatus LIKE '已开%' THEN o.totalAmount ELSE 0 END), 0)", 'invoicedAmount')
      .addSelect('COALESCE(SUM(o.receivedAmount), 0)', 'receivedAmount')
      .where('o.orderDate >= :startDate', { startDate })
      .andWhere('o.orderDate <= :endDate', { endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return raw.map(r => ({
      period: r.period,
      newOrders: Number(r.newOrders),
      invoicedAmount: Number(r.invoicedAmount),
      receivedAmount: Number(r.receivedAmount),
    }));
  }

  // ── 4. 按状态汇总 ──

  async byStatus(): Promise<StatusReportItem[]> {
    // 订单状态
    const orderStatusRaw = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.orderStatus', 'statusValue')
      .addSelect('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'totalAmount')
      .groupBy('o.orderStatus')
      .getRawMany();

    // 开票状态
    const invoiceStatusRaw = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.invoiceStatus', 'statusValue')
      .addSelect('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'totalAmount')
      .groupBy('o.invoiceStatus')
      .getRawMany();

    // 收款状态
    const paymentStatusRaw = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.paymentStatus', 'statusValue')
      .addSelect('COUNT(o.id)', 'count')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'totalAmount')
      .groupBy('o.paymentStatus')
      .getRawMany();

    const mapRow = (rows: any[], type: string): StatusReportItem[] =>
      rows.map(r => ({
        statusType: type,
        statusValue: r.statusValue,
        count: Number(r.count),
        totalAmount: Number(r.totalAmount),
      }));

    return [
      ...mapRow(orderStatusRaw, 'order'),
      ...mapRow(invoiceStatusRaw, 'invoice'),
      ...mapRow(paymentStatusRaw, 'payment'),
    ];
  }

  // ── 5. CSV 导出 ──

  async exportCsv(type: string, startDate?: string, endDate?: string): Promise<string> {
    let csv = '';
    const BOM = '\uFEFF'; // Excel UTF-8 兼容

    switch (type) {
      case 'product': {
        const data = await this.byProduct();
        csv = BOM + '产品名称,规格型号,订单数,总销量,总金额\n';
        data.forEach(r => {
          csv += `"${r.productName}","${r.productSpec}",${r.orderCount},${r.totalQuantity},${r.totalAmount.toFixed(2)}\n`;
        });
        break;
      }
      case 'customer': {
        const data = await this.byCustomer();
        csv = BOM + '客户编号,客户名称,联系人,订单数,累计消费,已收款,未结清\n';
        data.forEach(r => {
          csv += `"${r.customerCode}","${r.customerName}","${r.contact}",${r.orderCount},${r.totalConsumption.toFixed(2)},${r.totalReceived.toFixed(2)},${r.outstanding.toFixed(2)}\n`;
        });
        break;
      }
      case 'time': {
        if (!startDate || !endDate) throw new BadRequestException('时间段汇总导出需要 startDate 和 endDate');
        const data = await this.byTimePeriod(startDate, endDate);
        csv = BOM + '时间段,新增订单数,已开票金额,实收金额\n';
        data.forEach(r => {
          csv += `"${r.period}",${r.newOrders},${r.invoicedAmount.toFixed(2)},${r.receivedAmount.toFixed(2)}\n`;
        });
        break;
      }
      case 'status': {
        const data = await this.byStatus();
        csv = BOM + '状态类型,状态值,订单数,总金额\n';
        data.forEach(r => {
          csv += `"${r.statusType}","${r.statusValue}",${r.count},${r.totalAmount.toFixed(2)}\n`;
        });
        break;
      }
      default:
        throw new BadRequestException(`不支持的导出类型: ${type}`);
    }

    return csv;
  }

  // ── 6. PDF 对账单导出 ──

  async exportPdf(customerId: number): Promise<Buffer> {
    const customer = await this.customerRepository.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('客户不存在');

    const orders = await this.orderRepository.find({
      where: { customerId },
      relations: { items: true },
      order: { orderDate: 'DESC' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── 标题 ──
      doc.fontSize(20).font('Helvetica-Bold').text('对 账 单', { align: 'center' });
      doc.moveDown(1.5);

      // ── 客户信息 ──
      doc.fontSize(11).font('Helvetica');
      doc.text(`客户名称：${customer.name}`);
      doc.text(`客户编号：${customer.code}`);
      if (customer.contact) doc.text(`联 系 人：${customer.contact}`);
      if (customer.phone) doc.text(`联系电话：${customer.phone}`);
      if (customer.address) doc.text(`地　　址：${customer.address}`);
      doc.text(`打印日期：${new Date().toLocaleDateString('zh-CN')}`);
      doc.moveDown(1);

      // ── 分隔线 ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(1);

      // ── 汇总 ──
      const totalConsumption = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
      const totalReceived = orders.reduce((s, o) => s + Number(o.receivedAmount), 0);
      const outstanding = totalConsumption - totalReceived;

      doc.font('Helvetica-Bold');
      doc.text(`订单总数：${orders.length} 单`);
      doc.text(`累计消费：¥${totalConsumption.toFixed(2)}`);
      doc.text(`已收金额：¥${totalReceived.toFixed(2)}`);
      doc.text(`未结清：¥${outstanding.toFixed(2)}`);
      doc.moveDown(1);

      // ── 分隔线 ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(1);

      // ── 订单明细 ──
      doc.fontSize(14).font('Helvetica-Bold').text('订单明细', { underline: true });
      doc.moveDown(0.5);

      for (const order of orders) {
        // 表头
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(
          `订单: ${order.code}    日期: ${order.orderDate}    状态: ${order.orderStatus}`,
        );
        doc.fontSize(9).font('Helvetica');

        // 明细行
        if (order.items && order.items.length > 0) {
          for (const item of order.items) {
            doc.text(
              `  ${item.productName}${item.productSpec ? ` (${item.productSpec})` : ''}  × ${item.quantity}  ¥${Number(item.unitPrice).toFixed(2)}  =  ¥${Number(item.subtotal).toFixed(2)}`,
            );
          }
        }

        doc.text(
          `  总金额: ¥${Number(order.totalAmount).toFixed(2)}    已收: ¥${Number(order.receivedAmount).toFixed(2)}    收款状态: ${order.paymentStatus}`,
        );
        doc.moveDown(0.3);

        // 订单间分隔线
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#eee');
        doc.moveDown(0.3);
      }

      // ── 页脚 ──
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999');
      doc.text('—— 本对账单由 MyCRM 系统自动生成 ——', { align: 'center' });

      doc.end();
    });
  }
}
