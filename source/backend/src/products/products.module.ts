import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from '../common/database/entities/product.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, OrderItem])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
