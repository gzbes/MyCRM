import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId: number;

  @Column({ name: 'product_id', type: 'int', unsigned: true, nullable: true, default: null, comment: '关联产品ID(nullable, 产品删除后保留记录)' })
  productId: number;

  @Column({ type: 'varchar', length: 100, comment: '产品名称(快照)' })
  productName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: '规格(快照)' })
  productSpec: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '成交单价' })
  unitPrice: number;

  @Column({ type: 'int', unsigned: true, comment: '数量' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, comment: '小计' })
  subtotal: number;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
