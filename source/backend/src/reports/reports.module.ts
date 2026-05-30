import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Order } from '../common/database/entities/order.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';
import { Customer } from '../common/database/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Customer]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
