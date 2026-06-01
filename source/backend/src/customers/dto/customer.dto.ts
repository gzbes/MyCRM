import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: '客户名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  customerCode?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsArray()
  @IsOptional()
  deliveryAddresses?: { address: string; contact: string; phone: string; isDefault: boolean }[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  customerCode?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsArray()
  @IsOptional()
  deliveryAddresses?: { address: string; contact: string; phone: string; isDefault: boolean }[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
