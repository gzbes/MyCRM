import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 100, comment: '产品名称' })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: '规格型号' })
  spec: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, comment: '默认单价' })
  defaultPrice: number;

  @Column({ type: 'tinyint', default: 1, comment: '1:启用, 0:停用' })
  status: number;

  @Column({ type: 'text', nullable: true, default: null, comment: '备注' })
  remark: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
