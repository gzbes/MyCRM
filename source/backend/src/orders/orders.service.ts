import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../common/database/entities/order.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';
import { StatusLog } from '../common/database/entities/status-log.entity';
import { Attachment } from '../common/database/entities/attachment.entity';
import { CreateOrderDto, UpdateOrderDto, OrderStatusChangeDto } from './dto/order.dto';

// 订单状态流转图
const ORDER_STATUS_FLOW = ['待处理', '生产中', '已发货', '已完成'];
const CANCELABLE_STATUSES = ['待处理', '生产中', '已发货'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(StatusLog)
    private readonly statusLogRepository: Repository<StatusLog>,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
  ) {}

  async create(createOrderDto: CreateOrderDto, operator: string = 'system'): Promise<Order> {
    const code = await this.generateOrderCode();
    const orderDate = createOrderDto.orderDate || new Date().toISOString().slice(0, 10);

    // 计算各条目小计和总金额
    const itemsData = createOrderDto.items.map(item => ({
      productId: item.productId || undefined,
      productName: item.productName,
      productSpec: item.productSpec || undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
    }));
    const totalAmount = itemsData.reduce((sum, item) => sum + item.subtotal, 0);

    // 先创建订单头
    const order = this.orderRepository.create({
      code,
      customerId: createOrderDto.customerId,
      orderDate,
      totalAmount: Math.round(totalAmount * 100) / 100,
      invoiceRequirement: createOrderDto.invoiceRequirement || '无需开票',
      invoiceStatus: createOrderDto.invoiceRequirement === '无需开票' ? '无需开票' : '未开票',
      remark: createOrderDto.remark,
    });

    const saved = await this.orderRepository.save(order);

    // 再创建订单明细
    const orderItems = itemsData.map(item => this.orderItemRepository.create({ ...item, orderId: saved.id }));
    await this.orderItemRepository.save(orderItems);

    // 记录创建日志
    await this.statusLogRepository.save({
      orderId: saved.id,
      statusType: 'order',
      oldStatus: '-',
      newStatus: '待处理',
      operator,
    });

    return this.findOne(saved.id);
  }

  async findAll(
    keyword?: string,
    customerId?: number,
    orderStatus?: string,
    invoiceStatus?: string,
    paymentStatus?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const qb = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.customer', 'customer');

    if (keyword) {
      qb.andWhere(
        '(order.code LIKE :keyword OR customer.name LIKE :keyword OR order.remark LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (customerId) qb.andWhere('order.customerId = :customerId', { customerId });
    if (orderStatus) qb.andWhere('order.orderStatus = :orderStatus', { orderStatus });
    if (invoiceStatus) qb.andWhere('order.invoiceStatus = :invoiceStatus', { invoiceStatus });
    if (paymentStatus) qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize };
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true, customer: true, statusLogs: true, attachments: true },
      order: {
        items: { id: 'ASC' },
        statusLogs: { createdAt: 'DESC' },
        attachments: { createdAt: 'DESC' },
      },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (!['待处理', '生产中'].includes(order.orderStatus)) {
      throw new BadRequestException('当前订单状态不允许修改');
    }

    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      // 删除旧明细，创建新明细
      await this.orderItemRepository.delete({ orderId: id });

      const orderItems = updateOrderDto.items.map(item =>
        this.orderItemRepository.create({
          orderId: id,
          productId: item.productId || undefined,
          productName: item.productName,
          productSpec: item.productSpec || undefined,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
        }),
      );
      const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

      await this.orderItemRepository.save(orderItems);
      order.totalAmount = Math.round(totalAmount * 100) / 100;
    }

    if (updateOrderDto.orderDate) order.orderDate = updateOrderDto.orderDate;
    if (updateOrderDto.remark !== undefined) order.remark = updateOrderDto.remark;
    if (updateOrderDto.invoiceRequirement) {
      order.invoiceRequirement = updateOrderDto.invoiceRequirement;
      if (updateOrderDto.invoiceRequirement === '无需开票') {
        order.invoiceStatus = '无需开票';
      }
    }

    // 清除 items 引用，防止 cascade 干扰手动管理的明细
    (order as any).items = undefined;
    await this.orderRepository.save(order);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const order = await this.findOne(id);
    if (order.orderStatus !== '待处理') {
      throw new BadRequestException('只能删除待处理状态的订单');
    }
    await this.orderRepository.remove(order);
  }

  /**
   * 状态变更（核心逻辑，含所有关联规则校验）
   */
  async changeStatus(id: number, dto: OrderStatusChangeDto): Promise<Order> {
    const order = await this.findOne(id);
    const operator = dto.operator || 'system';

    if (dto.statusType === 'order') {
      return this.changeOrderStatus(order, dto.newStatus, operator);
    } else if (dto.statusType === 'invoice') {
      return this.changeInvoiceStatus(order, dto.newStatus, operator, {
        invoiceNo: dto.invoiceNo,
        invoiceFile: dto.invoiceFile,
      });
    } else if (dto.statusType === 'payment') {
      return this.changePaymentStatus(order, dto.newStatus, operator, {
        receivedAmount: dto.receivedAmount,
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate,
      });
    }
    throw new BadRequestException('无效的状态类型');
  }

  private async changeOrderStatus(order: Order, newStatus: string, operator: string): Promise<Order> {
    // 校验流转合法性
    if (newStatus === '已取消') {
      if (!CANCELABLE_STATUSES.includes(order.orderStatus)) {
        throw new BadRequestException('当前订单状态不允许取消');
      }
      // 规则：若已开票则阻止取消
      if (order.invoiceStatus && order.invoiceStatus.includes('已开')) {
        throw new ConflictException('该订单已开票，无法取消');
      }
    } else if (ORDER_STATUS_FLOW.includes(newStatus)) {
      const currentIdx = ORDER_STATUS_FLOW.indexOf(order.orderStatus);
      const newIdx = ORDER_STATUS_FLOW.indexOf(newStatus);
      if (newIdx <= currentIdx) {
        throw new BadRequestException('订单状态只能向前流转');
      }
    } else {
      throw new BadRequestException(`无效的订单状态: ${newStatus}`);
    }

    const oldStatus = order.orderStatus;

    // 自动关联规则
    if (newStatus === '已取消') {
      order.invoiceStatus = '无需开票';
      order.invoiceRequirement = '无需开票';
    }

    order.orderStatus = newStatus;
    const saved = await this.orderRepository.save(order);

    // 记录日志
    await this.statusLogRepository.save({
      orderId: order.id,
      statusType: 'order',
      oldStatus,
      newStatus,
      operator,
    });

    return this.findOne(saved.id);
  }

  private async changeInvoiceStatus(
    order: Order, newStatus: string, operator: string,
    extra: { invoiceNo?: string; invoiceFile?: string },
  ): Promise<Order> {
    const validStatuses = ['未开票', '已开增值税专用发票', '已开普通发票', '无需开票'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`无效的开票状态: ${newStatus}`);
    }

    // 规则：订单未取消时，不允许设为"无需开票"
    if (newStatus === '无需开票' && order.orderStatus !== '已取消') {
      throw new BadRequestException('订单未取消，不允许将开票设为"无需开票"');
    }

    // 规则：不允许从未开票直接跳到无需开票（除了取消时自动设置）
    if (newStatus === '无需开票' && order.orderStatus === '已取消') {
      // 已取消自动设置，允许
    }

    const oldStatus = order.invoiceStatus;
    order.invoiceStatus = newStatus;
    if (extra.invoiceNo) order.invoiceNo = extra.invoiceNo;
    if (extra.invoiceFile) order.invoiceFile = extra.invoiceFile;

    const saved = await this.orderRepository.save(order);

    await this.statusLogRepository.save({
      orderId: order.id,
      statusType: 'invoice',
      oldStatus,
      newStatus,
      operator,
    });

    return this.findOne(saved.id);
  }

  private async changePaymentStatus(
    order: Order, newStatus: string, operator: string,
    extra: { receivedAmount?: number; paymentMethod?: string; paymentDate?: string },
  ): Promise<Order> {
    const validStatuses = ['未收款', '部分收款', '已结清'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`无效的收款状态: ${newStatus}`);
    }

    const totalAmount = Number(order.totalAmount);
    const receivedAmount = extra.receivedAmount ?? Number(order.receivedAmount);

    if (newStatus === '已结清') {
      // 规则：已收金额必须 ≥ 订单总金额
      if (receivedAmount < totalAmount) {
        throw new BadRequestException(`已收金额(${receivedAmount})必须≥订单总金额(${totalAmount})才能结清`);
      }
    } else if (newStatus === '部分收款') {
      // 规则：已收金额必须 < 订单总金额
      if (receivedAmount >= totalAmount) {
        throw new BadRequestException('已收金额已达到或超过订单总金额，请选择"已结清"');
      }
      if (receivedAmount <= 0) {
        throw new BadRequestException('部分收款需要已收金额大于0');
      }
    } else if (newStatus === '未收款') {
      if (receivedAmount > 0) {
        throw new BadRequestException('已存在收款记录，无法设为未收款');
      }
    }

    const oldStatus = order.paymentStatus;
    order.paymentStatus = newStatus;
    order.receivedAmount = receivedAmount;
    if (extra.paymentMethod) order.paymentMethod = extra.paymentMethod;
    if (extra.paymentDate) order.paymentDate = extra.paymentDate;

    const saved = await this.orderRepository.save(order);

    await this.statusLogRepository.save({
      orderId: order.id,
      statusType: 'payment',
      oldStatus,
      newStatus,
      operator,
    });

    return this.findOne(saved.id);
  }

  private async generateOrderCode(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}-`;

    const lastOrder = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.code', 'DESC')
      .getOne();

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.code.slice(-4), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
