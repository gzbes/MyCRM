import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { StatusLog } from './status-log.entity';
import { Attachment } from './attachment.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, comment: '订单编号, 格式: ORD-YYYYMMDD-XXXX' })
  code: string;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId: number;

  @Column({ name: 'order_date', type: 'date', comment: '下单日期' })
  orderDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00, comment: '订单总金额' })
  totalAmount: number;

  @Column({ type: 'varchar', length: 20, default: '待处理', comment: '订单状态' })
  orderStatus: string;

  @Column({ type: 'varchar', length: 30, default: '未开票', comment: '开票状态' })
  invoiceStatus: string;

  @Column({ type: 'varchar', length: 30, default: '无需开票', comment: '开票要求' })
  invoiceRequirement: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null, comment: '发票号' })
  invoiceNo: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null, comment: '发票附件路径' })
  invoiceFile: string;

  @Column({ type: 'varchar', length: 20, default: '未收款', comment: '收款状态' })
  paymentStatus: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00, comment: '已收金额' })
  receivedAmount: number;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null, comment: '收款方式' })
  paymentMethod: string;

  @Column({ name: 'payment_date', type: 'date', nullable: true, default: null, comment: '收款日期' })
  paymentDate: string;

  @Column({ type: 'text', nullable: true, default: null, comment: '备注' })
  remark: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => Customer, customer => customer.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => StatusLog, log => log.order)
  statusLogs: StatusLog[];

  @OneToMany(() => Attachment, attachment => attachment.order)
  attachments: Attachment[];
}
