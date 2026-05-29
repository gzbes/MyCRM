/**
 * JSON → MySQL 数据迁移脚本
 * 从 ../data/ 目录读取旧 JSON 数据文件，导入到 MySQL 数据库
 *
 * 运行: npx ts-node src/migrate-data.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { User } from './common/database/entities/user.entity';
import { Customer } from './common/database/entities/customer.entity';
import { Product } from './common/database/entities/product.entity';
import { Order } from './common/database/entities/order.entity';
import { OrderItem } from './common/database/entities/order-item.entity';
import { StatusLog } from './common/database/entities/status-log.entity';
import { Attachment } from './common/database/entities/attachment.entity';

const DATA_DIR = path.join(process.cwd(), '..', 'data');

interface OldCustomer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

async function readJsonFile<T>(fileName: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, `${fileName}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`  [跳过] ${fileName}.json 不存在`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function migrate() {
  console.log('=== JSON → MySQL 数据迁移 ===\n');

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'Abc@123456',
    database: process.env.DB_DATABASE || 'mycrm',
    entities: [User, Customer, Product, Order, OrderItem, StatusLog, Attachment],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('数据库连接成功\n');

  // 1. 迁移客户数据
  console.log('1. 迁移客户数据...');
  const oldCustomers = await readJsonFile<OldCustomer>('customers');
  if (oldCustomers.length > 0) {
    const customerRepo = dataSource.getRepository(Customer);
    const existingCount = await customerRepo.count();
    if (existingCount > 0) {
      console.log(`   数据库中已有 ${existingCount} 条客户记录，跳过迁移`);
    } else {
      const usedNames = new Set<string>();
      let imported = 0;
      for (const old of oldCustomers) {
        // 处理重复名称
        let name = old.name;
        if (usedNames.has(name)) {
          let suffix = 1;
          while (usedNames.has(`${name}_${suffix}`)) suffix++;
          name = `${name}_${suffix}`;
        }
        usedNames.add(name);

        // 自动生成客户编号: CUST-YYYYMMDD-XXXX
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `CUST-${dateStr}-`;

        const lastCustomer = await customerRepo
          .createQueryBuilder('customer')
          .where('customer.code LIKE :prefix', { prefix: `${prefix}%` })
          .orderBy('customer.code', 'DESC')
          .getOne();

        let seq = 1;
        if (lastCustomer) {
          const lastSeq = parseInt(lastCustomer.code.slice(-4), 10);
          seq = lastSeq + 1;
        }
        const code = `${prefix}${seq.toString().padStart(4, '0')}`;

        await customerRepo.save({
          code,
          name,
          contact: old.contact || null,
          phone: old.phone || null,
          address: old.address || null,
        } as any);
        imported++;
      }
      console.log(`   成功导入 ${imported} 条客户记录`);
    }
  }

  console.log('\n数据迁移完成!');
  await dataSource.destroy();
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
