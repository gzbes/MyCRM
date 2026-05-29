import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../common/database/entities/order.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';
import { StatusLog } from '../common/database/entities/status-log.entity';
import { Attachment } from '../common/database/entities/attachment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, StatusLog, Attachment])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
