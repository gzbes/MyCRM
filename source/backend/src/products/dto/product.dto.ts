import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: '产品名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  spec?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: '单价不能小于0' })
  @IsOptional()
  defaultPrice?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  spec?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: '单价不能小于0' })
  @IsOptional()
  defaultPrice?: number;

  @IsIn([0, 1], { message: '状态值无效' })
  @IsOptional()
  status?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}
