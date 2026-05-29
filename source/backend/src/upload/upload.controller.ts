import { Controller, Post, Delete, Param, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req, Res, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Attachment } from '../common/database/entities/attachment.entity';
import { Order } from '../common/database/entities/order.entity';
import type { Response } from 'express';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');

@Controller()
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  @Post('orders/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const orderId = _req.params.id;
          const dir = join(UPLOAD_ROOT, 'orders', orderId);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          cb(new BadRequestException('仅支持 JPG/PNG/PDF 文件'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadAttachment(
    @Param('id', ParseIntPipe) orderId: number,
    @UploadedFile() file: any,
  ) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('订单不存在');
    if (!file) throw new BadRequestException('请选择文件');

    const attachment = this.attachmentRepository.create({
      orderId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    return this.attachmentRepository.save(attachment);
  }

  @Delete('orders/:id/attachments/:attachmentId')
  async deleteAttachment(
    @Param('id', ParseIntPipe) orderId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, orderId },
    });
    if (!attachment) throw new BadRequestException('附件不存在');

    if (existsSync(attachment.filePath)) {
      unlinkSync(attachment.filePath);
    }

    await this.attachmentRepository.remove(attachment);
    return { message: '删除成功' };
  }

  @Get('uploads/orders/:orderId/:filename')
  serveFile(
    @Param('orderId') orderId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = join(UPLOAD_ROOT, 'orders', orderId, filename);
    if (!existsSync(filePath)) {
      throw new BadRequestException('文件不存在');
    }
    return res.sendFile(filePath);
  }
}
