import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { Attachment } from '../common/database/entities/attachment.entity';
import { Order } from '../common/database/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, Order]),
    MulterModule.register({}),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
