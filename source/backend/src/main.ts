import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用CORS（开发模式：Vite 端口 5173 跨域访问）
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // 全局路由前缀
  app.setGlobalPrefix('api');

  // 生产模式：托管前端构建产物（编译后路径: dist/ → ../../frontend/dist/）
  // 访问 http://localhost:3000 即可打开前端页面
  app.useStaticAssets(join(__dirname, '../../frontend/dist'));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:3000`);
  console.log(`Frontend static files: http://localhost:3000 (production mode)`);
}
bootstrap();
