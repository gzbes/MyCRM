import { Controller, Get, Param, Query, UseGuards, Res, ParseIntPipe, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('by-product')
  async byProduct() {
    return this.reportsService.byProduct();
  }

  @Get('by-customer')
  async byCustomer() {
    return this.reportsService.byCustomer();
  }

  @Get('by-time')
  async byTime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    if (!startDate || !endDate) {
      // 默认最近30天
      const now = new Date();
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      startDate = past.toISOString().slice(0, 10);
      endDate = now.toISOString().slice(0, 10);
    }
    const validGroupBy = (['day', 'week', 'month'] as const).includes(groupBy as 'day' | 'week' | 'month') ? groupBy as 'day' | 'week' | 'month' : 'day';
    return this.reportsService.byTimePeriod(startDate, endDate, validGroupBy);
  }

  @Get('by-status')
  async byStatus() {
    return this.reportsService.byStatus();
  }

  @Get('csv/:type')
  async exportCsv(
    @Res() res: Response,
    @Param('type') type: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const validTypes = ['product', 'customer', 'time', 'status'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`不支持的导出类型: ${type}`);
    }

    const csv = await this.reportsService.exportCsv(type, startDate, endDate);

    const filenameMap: Record<string, string> = {
      product: '产品汇总',
      customer: '客户对账单',
      time: '营收趋势',
      status: '状态汇总',
    };

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameMap[type]}_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get('pdf/customer/:customerId')
  async exportPdf(
    @Res() res: Response,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    const pdf = await this.reportsService.exportPdf(customerId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="对账单_${customerId}_${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdf);
  }
}
