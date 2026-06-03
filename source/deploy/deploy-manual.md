# MyCRM 系统 Windows 部署操作手册

> 目标：从零开始，在空白 Windows 操作系统上部署并运行轻量级客户订单管理系统。

---

## 目录

- [1. 环境准备](#1-环境准备)
- [2. 获取代码](#2-获取代码)
- [3. 安装 MySQL 8.0 并创建数据库](#3-安装-mysql-80-并创建数据库)
- [4. 配置环境变量](#4-配置环境变量)
- [5. 安装项目依赖](#5-安装项目依赖)
- [6. 构建项目](#6-构建项目)
- [7. 启动服务](#7-启动服务)
- [8. 验收验证](#8-验收验证)
- [9. 常见问题](#9-常见问题)

---

## 1. 环境准备

### 1.1 安装 Git

下载地址：https://git-scm.com/downloads/win

安装选项推荐：
- **选择组件**：勾选"Git Bash Here"、"Git GUI Here"
- **默认编辑器**：选择 Vim 或 Notepad++
- **PATH 环境**：选择 "Git from the command line and also from 3rd-party software"
- **行尾转换**：选择 "Checkout as-is, commit as-is"（避免 Windows 换行符问题）

验证安装：

```cmd
git --version
```

### 1.2 安装 Node.js

下载地址：https://nodejs.org/ （推荐 LTS 版本 v22+，或当前最新版本 v24+）

安装选项：
- 勾选 "Automatically install the necessary tools"
- 安装完成后打开新命令行窗口验证：

```cmd
node --version
npm --version
```

### 1.3 安装 MySQL 8.0

下载地址：https://dev.mysql.com/downloads/installer/

**安装步骤：**

1. 运行 MySQL Installer，选择 **"Server only"** 安装类型
2. 安装类型选择 **"Standalone MySQL Server / Classic MySQL Replication"**
3. 配置类型选择 **"Development Computer"**
4. **认证方式**：选择 **"Use Legacy Authentication Method (Retain MySQL 5.x Compatibility)"**
   > 注意：MySQL 8.0 默认使用 `caching_sha2_password`，但 Node.js 的 `mysql2` 驱动可能兼容性问题较少。如果选择 Legacy 认证方式，兼容性更好。
5. **Root 密码**：设置 root 密码（请记住，后续配置需要用到，例如 `Abc@123456`）
6. **Windows Service**：勾选 "Configure MySQL Server as a Windows Service"，开机自启动

**验证安装：**

```cmd
mysql --version
mysql -u root -p
```

输入密码后能进入 MySQL 命令行即表示安装成功。输入 `exit;` 退出。

---

## 2. 获取代码

### 2.1 克隆仓库

```cmd
cd C:\
git clone https://github.com/gzbes/MyCRM.git
cd MyCRM
```

### 2.2 查看目录结构

```cmd
dir source
```

确认看到以下目录：
- `backend/` — NestJS 后端
- `frontend/` — Vue3 前端

---

## 3. 安装 MySQL 8.0 并创建数据库

### 3.1 创建数据库

打开 MySQL 命令行（或使用任何 MySQL 管理工具如 MySQL Workbench）：

```cmd
mysql -u root -p
```

在 MySQL 提示符下执行：

```sql
-- 创建数据库（使用 utf8mb4 字符集以支持中文）
CREATE DATABASE IF NOT EXISTS mycrm
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 查看已创建的数据库
SHOW DATABASES;

-- 退出
exit;
```

### 3.2 确认数据库连接

```cmd
mysql -u root -p mycrm -e "SELECT '连接成功' AS status;"
```

> 如果希望使用非 root 用户（推荐），可以创建一个专用数据库用户：
> ```sql
> CREATE USER 'mycrm'@'localhost' IDENTIFIED BY '你的密码';
> GRANT ALL PRIVILEGES ON mycrm.* TO 'mycrm'@'localhost';
> FLUSH PRIVILEGES;
> ```

---

## 4. 配置环境变量

后端通过 `.env` 文件加载配置。官方提供了模板文件，直接复制使用：

```cmd
cd C:\MyCRM\source\backend
copy .env.example .env
```

编辑 `.env` 文件，填入实际值：

```ini
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Abc@123456          # ← 改为你第 1.3 步设置的 root 密码
DB_DATABASE=mycrm

# JWT 配置
JWT_SECRET=mycrm-jwt-secret-2026  # ← 生产环境请改为强随机字符串
JWT_EXPIRES_IN=24h

# 应用配置
PORT=3000
```

> **安全提醒**：生产环境部署时，请将 `JWT_SECRET` 替换为强随机字符串，可用以下命令生成（需安装 Git Bash）：
> ```bash
> openssl rand -base64 32
> ```

---

## 5. 安装项目依赖

### 5.1 安装后端依赖

```cmd
cd C:\MyCRM\source\backend
npm install
```

安装时间约 1-3 分钟，视网络情况而定。

### 5.2 安装前端依赖

```cmd
cd C:\MyCRM\source\frontend
npm install
```

---

## 6. 构建项目

### 6.1 构建后端（TypeScript 编译）

```cmd
cd C:\MyCRM\source\backend
npx nest build
```

构建成功则无错误输出，编译后的 JS 文件生成到 `dist/` 目录。

### 6.2 构建前端（生产模式）

```cmd
cd C:\MyCRM\source\frontend
npm run build
```

构建成功后，静态文件生成到 `dist/` 目录（注意前端的输出目录默认就是 `dist/`）。

---

## 7. 启动服务

本系统采用**单进程部署方案**：后端 NestJS 服务同时托管 API 和前端静态页面。只需启动后端一个进程，即可通过 `http://localhost:3000` 访问完整应用。

提供两种模式：

### 方案 A：PM2 进程管理（推荐，支持开机自启）

PM2 是 Node.js 进程管理器，支持崩溃自动重启和开机自启。

**安装 PM2：**

```cmd
npm install -g pm2
```

**启动后端（首次）：**

```cmd
cd C:\MyCRM\source\backend
pm2 start dist/main.js --name mycrm-backend
pm2 save
```

**配置开机自启（以管理员身份运行）：**

```cmd
pm2 startup
```

执行上述命令后，PM2 会在 Windows **计划任务**中创建一个名为 `PM2` 的开机启动项。系统重启后，PM2 会自动恢复 `mycrm-backend` 进程。

> **⚠️ Windows 计划任务关键配置**
>
> `pm2 startup` 生成的计划任务默认仅在**当前用户登录后**触发。若服务器重启后无人登录（如远程服务器自动重启），服务不会启动。请按以下步骤检查并修正：
>
> 1. 按 `Win + R` → 输入 `taskschd.msc` → 回车打开**任务计划程序**
> 2. 在左侧导航栏选择 **"任务计划程序库"**
> 3. 在列表中找到名为 **`PM2`** 的任务
> 4. 右键 → **属性** → **"常规"** 标签页
>    - 勾选 **"不管用户是否登录都要运行"**
>    - 勾选 **"使用最高权限运行"**
>    - 如果提示输入密码，输入当前 Windows 用户密码即可
> 5. **"触发器"** 标签页 → 确认存在 **"启动时"** 触发器（如无则新建）
> 6. 点击 **"确定"** 保存

**查看进程状态：**

```cmd
pm2 list
pm2 show mycrm-backend
```

**管理命令：**

```cmd
pm2 restart mycrm-backend    :: 重启
pm2 stop mycrm-backend       :: 停止
pm2 logs mycrm-backend       :: 查看日志
pm2 delete mycrm-backend     :: 删除进程
```

### 方案 B：临时启动（适合调试/测试）

```cmd
cd C:\MyCRM\source\backend
npx nest start
```

看到 `Nest application successfully started` 表示启动成功。命令行窗口关闭后服务即停止。

### 开发模式（可选）

如果需要在开发中修改代码实时生效，可以用 Vite 开发服务器：

```cmd
cd C:\MyCRM\source\frontend
npm run dev
```

开发模式下访问 `http://localhost:5173`（Vite 自动代理 `/api` 请求到后端 3000 端口）。

### 7.2 重启后自动恢复验证

> 在完成 PM2 开机自启配置（§7 方案 A）后，建议模拟一次系统重启，确认服务自动恢复。

**验证步骤：**

```cmd
:: 1. 手动重启 PM2 进程（模拟重启后再恢复）
pm2 restart mycrm-backend

:: 2. 等待 3 秒后检查进程状态
timeout /t 3 /nobreak
pm2 list
:: ↑ 确认 mycrm-backend 状态为 "online"，非 "errored" 或 "stopped"

:: 3. 测试 API 是否正常响应
curl http://localhost:3000/api
:: ↑ 预期返回 JSON（非 "Connection refused" 错误）

:: 4. 确认 PM2 进程列表已持久化
pm2 save
:: ↑ 输出应显示 "Successfully saved"（确认自启配置是最新状态）
```

**验证清单：**

| 检查项 | 预期结果 | 失败处理 |
|--------|---------|---------|
| `pm2 list` | mycrm-backend 状态为 **online** | 执行 `pm2 start dist/main.js --name mycrm-backend` 重新启动 |
| `curl http://localhost:3000/api` | 返回 JSON 响应 | 检查 `.env` 配置和 MySQL 是否启动 |
| 前端页面 `http://localhost:3000` | 正常显示登录页 | 确认前端已构建（见 §6.2）且后端 `main.ts` 静态文件路径正确（见 §8.2） |

> 如使用 **方案 B（临时启动）**，重启后需手动执行 `npx nest start`，不支持自动恢复。

---

## 8. 验收验证

### 8.1 检查服务是否正常运行

```cmd
curl http://localhost:3000/api
```

预期返回：`{"message":"Hello World"}`（或类似 JSON 响应）

### 8.2 访问前端页面

打开浏览器访问：`http://localhost:3000`

> **说明**：后端启动时自动托管前端构建的静态文件。`localhost:3000` 既是 API 地址也是前端页面地址，不需要再额外启动前端服务。

**前端静态文件路径关系：**

后端代码中（`source/backend/src/main.ts:28`）通过以下路径加载前端构建产物：

```typescript
app.useStaticAssets(join(__dirname, '../../frontend/dist'));
```

- 后端编译后：`source/backend/dist/main.js`
- 运行时查找：`../../frontend/dist/` → 即 `source/frontend/dist/`

**因此必须先执行** `cd source/frontend && npm run build`（§6.2）生成 `frontend/dist/` 目录，后端才能正常托管家前端页面。如果前端页面显示白屏或 404，请检查：

1. `source/frontend/dist/` 目录是否存在（含 `index.html` 等文件）
2. 如丢失，重新执行 `cd source/frontend && npm run build`

### 8.3 登录系统

使用默认管理员账号登录：
- **邮箱**：`admin@no-crm.com`
- **密码**：`admin123`

> 首次启动后数据库为空白（0 客户、0 产品、0 订单），需要手动创建。

### 8.4 功能验证流程

登录成功后，按以下流程验证核心功能：

```
新建客户 → 新建产品 → 新建订单 → 变更订单状态 → 查看报表
```

各功能模块验证点：

| 模块 | 验证点 |
|------|--------|
| **客户管理** | 新增/编辑/搜索客户，名称防重校验 |
| **产品管理** | 新增/编辑/启用/停用产品，删除引用校验 |
| **订单管理** | 新建订单（明细行联动）、编辑、状态流转、附件上传 |
| **报表中心** | 4 个统计页面数据展示、CSV 导出、PDF 对账单导出 |
| **仪表盘** | 经营概览指标卡片、7 日趋势图、待处理订单列表 |

---

## 9. 常见问题

### Q1: 后端启动报错 `ECONNREFUSED :3306`

**原因**：MySQL 服务未启动或连接配置错误。

**解决**：
1. 检查 MySQL 服务是否运行：`net start MySQL80`
2. 检查 `.env` 中的数据库密码是否正确
3. 确认数据库 `mycrm` 已创建

### Q2: 后端启动报错 `Unknown database 'mycrm'`

**原因**：数据库未创建。

**解决**：执行第 3 步中的 `CREATE DATABASE` 语句创建数据库。

### Q3: 后端启动报错 `Client does not support authentication protocol`

**原因**：MySQL 8.0 默认使用 `caching_sha2_password` 认证插件。

**解决**：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;
```

### Q4: `npx nest build` 报错找不到模块

**原因**：依赖未安装完整。

**解决**：重新执行 `npm install` 确保依赖安装成功。

### Q5: 前端页面空白或请求 404

**原因**：Vite 代理或 Nginx 反向代理配置问题。

**解决**：
- 检查后端是否运行在 3000 端口
- 检查前端 `vite.config.ts` 中的 proxy 配置是否正确
- 如使用 Nginx，确认 `location /api/` 配置正确

### Q6: 中文文件名附件乱码

**原因**：Windows 下 multer 文件名编码问题。

**解决**：代码已处理此问题（`upload.controller.ts` 中做了 `latin1→utf8` 转换），如仍有问题请确认操作系统区域语言设置为中文。

### Q7: PDF 对账单中文显示为空白方块

**原因**：中文字体文件缺失。

**解决**：确认 `source/backend/assets/fonts/` 目录下存在 `simfang.ttf` 和 `simhei.ttf`（Windows 系统字体，可从 `C:\Windows\Fonts\` 复制）。

---

## 附录：目录结构参考

```
C:\MyCRM\
├── source\
│   ├── backend\          # NestJS 后端
│   │   ├── src\          # TypeScript 源码
│   │   ├── dist\         # 编译产物（构建后生成）
│   │   ├── assets\       # 静态资源（字体等）
│   │   ├── uploads\      # 用户上传文件
│   │   ├── .env          # 环境配置（需手动创建）
│   │   └── package.json
│   │
│   ├── frontend\         # Vue3 前端
│   │   ├── src\          # 源码
│   │   ├── dist\         # 构建产物
│   │   └── package.json
│   │
│   ├── docs\             # 项目文档
│   └── UAT\              # 验收测试文档
│
└── README.md
```

---

## 附录：快速启动命令速查

```cmd
:: 1. 克隆代码
git clone https://github.com/gzbes/MyCRM.git
cd MyCRM

:: 2. 配置环境
copy source\backend\.env.example source\backend\.env
:: 编辑 .env 填入数据库密码

:: 3. 安装依赖
cd source\backend && npm install
cd ..\frontend && npm install

:: 4. 创建数据库（需先安装 MySQL）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mycrm DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

:: 5. 构建
cd ..\backend && npx nest build
cd ..\frontend && npm run build

:: 6. 构建前端（准备静态文件）
cd source\frontend && npm run build

:: 7. 启动（单进程，同时托管前端 + API）
:: 首次启动（临时模式）：
cd source\backend && npx nest start
:: 或使用 PM2（推荐，支持开机自启）：
:: pm2 start source\backend\dist\main.js --name mycrm-backend
:: pm2 startup && pm2 save

:: 8. 访问
:: http://localhost:3000
:: 登录：admin@no-crm.com / admin123
```
