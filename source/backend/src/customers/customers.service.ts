import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../common/database/entities/customer.entity';
import { Order } from '../common/database/entities/order.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // 检查客户名称是否已存在（防重校验）
    const existing = await this.customerRepository.findOne({ where: { name: createCustomerDto.name } });
    if (existing) {
      throw new ConflictException('客户名称已存在');
    }

    // 自动生成客户编号: CUST-YYYYMMDD-XXXX
    const code = await this.generateCustomerCode();

    const customer = this.customerRepository.create({
      ...createCustomerDto,
      code,
    });

    return this.customerRepository.save(customer);
  }

  async findAll(
    keyword?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    if (keyword) {
      queryBuilder.where(
        'customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.contact LIKE :keyword',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder.orderBy('customer.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [customers, total] = await queryBuilder.getManyAndCount();

    // 获取每个客户的订单统计
    const data = await Promise.all(
      customers.map(async (customer) => {
        const orderStats = await this.getCustomerOrderStats(customer.id);
        return {
          ...customer,
          orderCount: orderStats.orderCount,
          totalConsumption: orderStats.totalConsumption,
          outstandingAmount: orderStats.outstandingAmount,
        };
      }),
    );

    return { data, total, page, pageSize };
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }
    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    // 如果修改了名称，检查是否与其他客户重名
    if (updateCustomerDto.name && updateCustomerDto.name !== customer.name) {
      const existing = await this.customerRepository.findOne({ where: { name: updateCustomerDto.name } });
      if (existing) {
        throw new ConflictException('客户名称已存在');
      }
    }

    Object.assign(customer, updateCustomerDto);
    return this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);

    // 检查是否有未完成的订单
    const incompleteOrderCount = await this.orderRepository.count({
      where: {
        customerId: id,
        orderStatus: '已完成', // 只允许在"已完成"状态时删除客户
      },
    });

    // 实际上 BR.md 要求：有未完成的订单则阻止删除
    const totalOrderCount = await this.orderRepository.count({
      where: { customerId: id },
    });

    const completedOrderCount = await this.orderRepository.count({
      where: { customerId: id, orderStatus: '已完成' },
    });

    if (totalOrderCount > completedOrderCount) {
      throw new BadRequestException('该客户名下存在未完成的订单，无法删除');
    }

    await this.customerRepository.remove(customer);
  }

  async getCustomerOrders(id: number): Promise<Order[]> {
    const customer = await this.findOne(id);
    return this.orderRepository.find({
      where: { customerId: customer.id },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 生成客户编号: CUST-YYYYMMDD-XXXX
   */
  private async generateCustomerCode(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CUST-${dateStr}-`;

    // 查找当天最后一个编号
    const lastCustomer = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('customer.code', 'DESC')
      .getOne();

    let seq = 1;
    if (lastCustomer) {
      const lastSeq = parseInt(lastCustomer.code.slice(-4), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * 获取客户订单统计信息
   */
  private async getCustomerOrderStats(customerId: number): Promise<{
    orderCount: number;
    totalConsumption: number;
    outstandingAmount: number;
  }> {
    const orders = await this.orderRepository.find({ where: { customerId } });

    const totalConsumption = orders
      .filter((o) => o.orderStatus !== '已取消')
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const receivedAmount = orders
      .filter((o) => o.orderStatus !== '已取消')
      .reduce((sum, o) => sum + Number(o.receivedAmount), 0);

    return {
      orderCount: orders.filter((o) => o.orderStatus !== '已取消').length,
      totalConsumption,
      outstandingAmount: totalConsumption - receivedAmount,
    };
  }
}
