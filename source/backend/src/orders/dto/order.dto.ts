import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, Min, IsIn, ValidateNested, IsDateString, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsString()
  @IsNotEmpty({ message: '产品名称不能为空' })
  productName: string;

  @IsString()
  @IsOptional()
  productSpec?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: '单价不能小于0' })
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: '数量必须大于0' })
  quantity: number;
}

export class CreateOrderDto {
  @IsNumber()
  @IsNotEmpty({ message: '请选择客户' })
  customerId: number;

  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  @IsIn(['无需开票', '3%专票', '普票'], { message: '开票要求无效' })
  invoiceRequirement?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1, { message: '请添加至少一个产品' })
  items: OrderItemDto[];
}

export class UpdateOrderDto {
  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsString()
  @IsOptional()
  @IsIn(['无需开票', '3%专票', '普票'], { message: '开票要求无效' })
  invoiceRequirement?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];
}

export class OrderStatusChangeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['order', 'invoice', 'payment'], { message: '状态类型无效' })
  statusType: string;

  @IsString()
  @IsNotEmpty({ message: '请指定新状态' })
  newStatus: string;

  @IsString()
  @IsOptional()
  operator?: string;

  // 收款相关
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  receivedAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  // 开票相关
  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsString()
  @IsOptional()
  invoiceFile?: string;
}
