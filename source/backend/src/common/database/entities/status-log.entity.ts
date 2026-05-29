import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('status_logs')
export class StatusLog {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId: number;

  @Column({ type: 'varchar', length: 20, comment: '状态类型: order/invoice/payment' })
  statusType: string;

  @Column({ type: 'varchar', length: 30, comment: '旧状态' })
  oldStatus: string;

  @Column({ type: 'varchar', length: 30, comment: '新状态' })
  newStatus: string;

  @Column({ type: 'varchar', length: 50, default: 'system', comment: '操作人' })
  operator: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => Order, order => order.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
