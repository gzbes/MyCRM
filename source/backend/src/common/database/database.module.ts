import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Customer } from './entities/customer.entity';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { StatusLog } from './entities/status-log.entity';
import { Attachment } from './entities/attachment.entity';

const entities = [User, Customer, Product, Order, OrderItem, StatusLog, Attachment];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'Abc@123456',
      database: process.env.DB_DATABASE || 'mycrm',
      entities: entities,
      synchronize: true, // 开发阶段自动建表，生产环境应关闭
      charset: 'utf8mb4',
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

export { User, Customer, Product, Order, OrderItem, StatusLog, Attachment };
