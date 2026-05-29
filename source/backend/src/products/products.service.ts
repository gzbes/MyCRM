import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../common/database/entities/product.entity';
import { OrderItem } from '../common/database/entities/order-item.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // 检查产品名称是否已存在（防重校验）
    const existing = await this.productRepository.findOne({ where: { name: createProductDto.name } });
    if (existing) {
      throw new ConflictException('产品名称已存在');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      defaultPrice: createProductDto.defaultPrice ?? 0,
      status: 1, // 新建默认启用
    });

    return this.productRepository.save(product);
  }

  async findAll(
    keyword?: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: Product[]; total: number; page: number; pageSize: number }> {
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (keyword) {
      queryBuilder.where(
        'product.name LIKE :keyword OR product.spec LIKE :keyword',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder.orderBy('product.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, pageSize };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    // 如果修改了名称，检查是否与其他产品重名
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const existing = await this.productRepository.findOne({ where: { name: updateProductDto.name } });
      if (existing) {
        throw new ConflictException('产品名称已存在');
      }
    }

    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);

    // 检查是否有订单引用该产品
    const usedCount = await this.orderItemRepository.count({
      where: { productId: id },
    });

    if (usedCount > 0) {
      throw new BadRequestException('该产品已被订单引用，无法删除');
    }

    await this.productRepository.remove(product);
  }

  /**
   * 切换产品启用/停用状态
   */
  async toggleStatus(id: number): Promise<Product> {
    const product = await this.findOne(id);
    product.status = product.status === 1 ? 0 : 1;
    return this.productRepository.save(product);
  }
}
