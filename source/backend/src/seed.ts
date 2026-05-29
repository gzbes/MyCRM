/**
 * 数据库种子脚本 - 创建初始管理员账号
 * 运行: npx ts-node src/seed.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './common/database/entities/user.entity';
import { Customer } from './common/database/entities/customer.entity';
import { Product } from './common/database/entities/product.entity';
import { Order } from './common/database/entities/order.entity';
import { OrderItem } from './common/database/entities/order-item.entity';
import { StatusLog } from './common/database/entities/status-log.entity';
import { Attachment } from './common/database/entities/attachment.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'Abc@123456',
    database: process.env.DB_DATABASE || 'mycrm',
    entities: [User, Customer, Product, Order, OrderItem, StatusLog, Attachment],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('数据库连接成功');

  const userRepository = dataSource.getRepository(User);

  // 检查是否已存在默认管理员
  const existingAdmin = await userRepository.findOne({ where: { email: 'admin@no-crm.com' } });
  if (existingAdmin) {
    console.log('默认管理员账号已存在，跳过');
  } else {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      email: 'admin@no-crm.com',
      password: hashedPassword,
      name: '管理员',
      role: 'admin',
    });
    await userRepository.save(admin);
    console.log('默认管理员账号创建成功: admin@no-crm.com / admin123');
  }

  await dataSource.destroy();
  console.log('种子数据初始化完成');
}

seed().catch(err => {
  console.error('种子数据初始化失败:', err);
  process.exit(1);
});
