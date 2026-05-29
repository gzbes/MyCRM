import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ValidationPipe, ParseIntPipe, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderStatusChangeDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body(ValidationPipe) createOrderDto: CreateOrderDto, @Req() req: any) {
    const operator = req.user?.name || 'system';
    return this.ordersService.create(createOrderDto, operator);
  }

  @Get()
  findAll(
    @Query('keyword') keyword?: string,
    @Query('customerId') customerId?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('invoiceStatus') invoiceStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ordersService.findAll(
      keyword,
      customerId ? parseInt(customerId, 10) : undefined,
      orderStatus,
      invoiceStatus,
      paymentStatus,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ordersService.remove(id);
    return { message: '删除成功' };
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) statusChangeDto: OrderStatusChangeDto,
    @Req() req: any,
  ) {
    statusChangeDto.operator = req.user?.name || 'system';
    return this.ordersService.changeStatus(id, statusChangeDto);
  }
}
