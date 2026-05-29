import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId: number;

  @Column({ type: 'varchar', length: 255, comment: '原始文件名' })
  fileName: string;

  @Column({ type: 'varchar', length: 500, comment: '存储路径' })
  filePath: string;

  @Column({ type: 'int', unsigned: true, comment: '文件大小(字节)' })
  fileSize: number;

  @Column({ type: 'varchar', length: 50, comment: 'MIME类型' })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => Order, order => order.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
