import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, comment: '客户编号, 格式: CUST-YYYYMMDD-XXXX' })
  code: string;

  @Column({ type: 'varchar', length: 100, unique: true, comment: '客户名称' })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null, comment: '联系人' })
  contact: string;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null, comment: '联系电话' })
  phone: string;

  @Column({ type: 'text', nullable: true, default: null, comment: '地址' })
  address: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => Order, order => order.customer)
  orders: Order[];
}
