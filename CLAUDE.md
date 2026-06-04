# 轻量级客户订单管理系统 — 项目上下文

> 基于 FlowCRM（NO-CRM 源码版，Vue3 + NestJS + TypeScript）二次开发。
> 详细需求见 [source/docs/BR.md](source/docs/BR.md)，开发计划见 [source/docs/Plan.md](source/docs/Plan.md)。

---

## 一、项目核心信息

| 项 | 内容 |
|---|------|
| **项目目标** | 单人运营场景的轻量级客户订单管理系统，替代 Excel 手工记录 |
| **核心闭环** | 新建客户 → 新建产品 → 新建订单 → 变更状态 → 查看报表 |
| **技术栈** | Vue3 + NestJS + TypeScript + Pinia + TDesign + TypeORM + MySQL 8.0 |
| **部署** | 阿里云 ECS (Nginx + PM2)，文件存储本地 `./uploads/` |
| **认证** | JWT + Passport（项目已有，适配 MySQL） |
| **开发工具** | VSCode + Claude Code |

---

## 二、数据存储策略

FlowCRM 原项目使用 **JSON 文件存储**，本项目改造为 **MySQL 8.0 + TypeORM**。

**迁移策略：**
- 开发阶段：TypeORM `synchronize: true` 自动建表
- 原项目数据：`JsonStorageService` 保留为迁移工具，提供导入脚本
- 混合模式（过渡）：通过配置切换 JsonStorageService / TypeOrmService

---

## 三、核心功能模块

### 3.1 客户管理
- 字段：客户编号（`CUST-YYYYMMDD-XXXX` 自动生成）、名称（防重）、联系人、电话、地址
- 列表：按名称模糊搜索，展示客户画像（订单总数、累计消费、未结清金额）
- 关联订单：详情页查看名下所有订单
- 删除校验：有未完成订单的客户禁止删除

### 3.2 产品管理
- 字段：产品名称、规格型号、默认单价、备注
- 功能：启用/停用（停用后新建订单不可选）
- 删除校验：被订单引用的产品禁止删除
- 订单与产品关系：
  - 订单从产品库选择，自动填充名称/规格/默认单价
  - 订单中可手动修改成交价，**不影响产品库默认单价**
  - 订单明细冗余保存产品名称/规格快照（产品变更不影响历史订单）

### 3.3 订单管理（核心）

**订单头：** 订单编号（`ORD-YYYYMMDD-XXXX` 自动生成）、关联客户（下拉）、下单日期、备注

**订单明细（多行）：** 产品（下拉联动规格/单价）、单价（可修改）、数量（>0）、小计自动计算、总金额自动计算

**开票信息：** 开票要求（无需开票/3%专票/普票）、发票号、发票附件（JPG/PNG/PDF，≤10MB）

**收款信息：** 收款状态、已收金额、收款方式（银行转账/微信/支付宝/现金）、收款日期

**附件管理：** `./uploads/orders/{orderId}/`，支持图片/PDF 预览，单文件 ≤10MB

### 3.4 三状态独立流转

| 状态类型 | 流转路径 |
|---------|---------|
| **订单状态** | 待处理 → 生产中 → 已发货 → 已完成 / 已取消 |
| **开票状态** | 未开票 → 已开增值税专用发票 / 已开普通发票 / 无需开票 |
| **收款状态** | 未收款 → 部分收款 → 已结清 |

### 3.5 状态关联规则（强制校验）

| 场景 | 规则 |
|------|------|
| 订单→已取消 | 自动设开票为"无需开票"，若已开票则阻止取消 |
| 订单→已完成 | 若收款为"未收款"则弹窗确认 |
| 开票→已开票 | 发票金额不可超过订单总金额 |
| 收款→已结清 | 已收金额必须 ≥ 订单总金额 |
| 订单未取消 | 不允许将开票设为"无需开票" |
| 部分收款 | 已收金额必须 < 订单总金额 |

### 3.6 报表中心（四维）

1. **按产品汇总** — 销量排行，排除已取消订单
2. **按客户汇总（对账单）** — 订单数 / 累计消费 / 已收款 / 未结清
3. **按时间段汇总（营收趋势）** — 新增订单数 / 已开票金额 / 实收金额，ECharts 柱状图+折线图
4. **按状态汇总** — 各状态订单数 + 总金额分组统计
5. **导出** — 报表 CSV 导出，对账单 PDF 导出

---

## 四、数据模型（MySQL 8.0）

6 张核心表：

| 表名 | 说明 | 关键约束 |
|------|------|---------|
| `users` | 用户认证 | 适配现有 Auth |
| `customers` | 客户 | `uk_code`, `uk_name`（名称防重） |
| `products` | 产品 | `idx_name`, `idx_status` |
| `orders` | 订单头 | `uk_code`, `fk→customers` (RESTRICT), 多状态索引 |
| `order_items` | 订单明细 | `fk→orders` (CASCADE), 含产品快照字段 |
| `status_logs` | 状态变更日志 | `fk→orders` (CASCADE), 记录旧/新状态 |
| `attachments` | 附件 | `fk→orders` (CASCADE) |

---

## 五、开发阶段计划（4 Phase）

总工期预估 **20-26 人天**（单人开发约 3-4 周）。

### Phase 1：基础框架搭建（5-7 天）
**目标：** 项目跑通，MySQL 替换 JSON，Auth + Customers 可用
- 1.1 初始化工程，跑通 `npm run start:dev`
- 1.2 TypeORM + MySQL 集成，创建所有实体类
- 1.3 Auth 模块适配 MySQL
- 1.4 Customers 模块迁移（防重校验、删除校验、编号自动生成）
- 1.5 前端路由调整（精简菜单）
- 1.6 数据迁移脚本（JSON → MySQL）
- 1.7 集成测试

### Phase 2：核心业务开发（7-10 天）
**目标：** 产品 + 订单完整功能上线
- 2.1 产品管理 CRUD（含启用/停用、删除引用校验）
- 2.2 订单管理后端 API（嵌套创建/状态变更/文件上传/日志记录）
- 2.3 订单前端列表页（筛选/分页/快捷操作）
- 2.4 订单前端表单页（多行明细/联动/文件上传）
- 2.5 订单详情页（状态操作/附件预览/日志时间线）
- 2.6 状态关联规则实现（前后端校验）

### Phase 3：报表赋能（4-5 天）
**目标：** 四维报表 + 导出
- 3.1 报表后端 API（4 个统计接口）
- 3.2 报表前端 ECharts 图表
- 3.3 CSV 导出
- 3.4 PDF 对账单导出
- 3.5 仪表盘改造（经营概览）

### Phase 4：部署与运维（3-4 天）
**目标：** ECS 上线 + 运维体系
- 4.1 ECS 环境配置（Node + Nginx + PM2）
- 4.2 MySQL 数据库初始化
- 4.3 构建与部署
- 4.4 备份脚本（每日 mysqldump，保留 7 天）
- 4.5 域名/HTTPS（可选）
- 4.6 验收测试

---

## 六、开发规范与提醒

### Git 提交规范
- 提交粒度：每个子任务完成即提交
- 格式：`Phase X.Y: 描述`（如 `Phase 2.1: 完成产品管理 CRUD`）

### 代码质量
- 每个 API 完成后用 curl / Postman 测试
- 前端页面完成后 UI 走查
- 状态关联规则：后端强制校验 + 前端友好提示
- 单人场景下，UI 层做友好提示，后端做强制校验

### 性能目标
- 页面加载 ≤ 2s | 列表查询 ≤ 300ms | 报表生成 ≤ 1s | 状态变更 ≤ 200ms

### 日志与审计
- 所有订单创建、状态变更、删除操作需记录操作日志
- 日志字段：操作时间、操作类型、变更前内容、变更后内容

### 开发提醒
- 每天记录开发进度
- 每周做一次回顾
- 遇到阻塞项（如 ECharts 图表配置、文件上传预览）及时记录，集中解决
- Phase 1-2 优先上线，Phase 3 可延后

### 安全规范（提交代码前必须检查）

#### 禁止提交到 Git 的内容
- `.env` 文件（已加入 `.gitignore`，包含数据库密码、JWT 密钥等敏感信息）
- 任何包含真实密码、API Key、Token、密钥的文件
- `templogin_response.json` 等临时文件（可能包含 JWT Token）
- IDE 配置文件（`.vscode/`, `.idea/` 等）
- `node_modules/`、`dist/` 等构建产物

#### 硬编码密码/密钥禁令
- **禁止**在 `.ts` / `.vue` 文件中硬编码任何形式的密码、密钥、Token 作为 fallback
- 所有敏感配置必须通过 `.env` 环境变量传入
- 如果环境变量缺失，应当让程序启动失败（抛异常），而非使用硬编码默认值
- 示例：
  ```typescript
  // ❌ 禁止: 硬编码 fallback
  password: process.env.DB_PASSWORD || 'Abc@123456',
  secret: process.env.JWT_SECRET || 'mycrm-jwt-secret-2026',

  // ✅ 正确: 环境变量缺失时启动失败
  password: process.env.DB_PASSWORD,
  secret: process.env.JWT_SECRET,
  ```

#### 提交前自我检查清单
1. 运行 `git diff --cached` 检查暂存区，确认无密码/密钥/Token
2. 运行 `git diff --name-only` 确认无临时文件被包含
3. 确认 `.env.example` 同步更新（如有新增环境变量）
4. 确认 `synchronize: true` 受 `NODE_ENV` 保护（仅开发环境可用）
5. 运行 `git status` 确认无意外文件被跟踪

#### 已有问题的处理
- 如果发现已提交的代码中包含密码/密钥，立即：
  1. 从源代码中移除硬编码值，改用环境变量
  2. 将 `.env` 加入 `.gitignore`（如未加）
  3. 通知团队所有成员更换泄露的密码/密钥
  4. 考虑轮换所有已泄露的凭据

---

## 七、文件结构（关键路径）

```
source/
├── backend/
│   ├── src/
│   │   ├── auth/              # [保留适配] JWT + Passport
│   │   ├── customers/         # [改造] JSON → TypeORM
│   │   ├── products/          # [新增] 产品管理
│   │   ├── orders/            # [新增] 订单管理
│   │   ├── reports/           # [新增] 报表（替换原 statistics）
│   │   ├── upload/            # [新增] 文件上传
│   │   └── common/database/   # [新增] TypeORM 配置 + 实体
│   └── assets/fonts/          # [新增] PDF 中文字体（SimFang/SimHei TrueType）
├── frontend/src/
│   ├── views/
│   │   ├── Customers.vue      # [改造]
│   │   ├── Products.vue       # [新增]
│   │   ├── Orders.vue         # [新增] 列表页
│   │   ├── OrderDetail.vue    # [新增] 详情页
│   │   ├── Reports.vue        # [新增]
│   │   └── Dashboard.vue      # [改造] 经营概览
│   ├── components/            # [新增] 组件目录
│   └── router/index.ts        # [改造]
├── UAT/                       # [新增] 用户验收测试文档
│   ├── UAT2.md                # UAT 第 2 轮问题报告
│   ├── UAT2_Plan.md           # UAT 修复计划
│   ├── UAT3.md                # UAT 第 3 轮验收问题
│   ├── UAT3_Plan.md           # UAT 第 3 轮修复计划
│   ├── UAT4.md                # UAT 第 4 轮验收问题
│   └── UAT4_Plan.md           # UAT 第 4 轮修复计划
├── deploy/
│   └── deploy-manual.md       # [新增] Windows 部署操作手册
└── docs/
    ├── BR.md                  # 需求规格说明书
    ├── Plan.md                # 开发计划
    └── UserManual.md          # [新增] 前端用户使用手册
```

---

## 八、当前状态

<!-- 开发过程中请更新此处 -->
- **当前阶段：** Phase 4 — 部署与运维（进行中）
- **当前任务：** 部署文档 + 用户手册编写
- **完成进度：** 27 / 28 天
- **最后更新：** 2026-06-03

### Phase 2 完成总结

| 子任务 | 状态 | 说明 |
|-------|------|------|
| 2.1 产品管理 CRUD | ✓ | 含启用/停用、删除引用校验、搜索、分页（10/10 测试通过） |
| 2.2 订单管理后端 API | ✓ | 嵌套创建/修改/删除/查询/状态变更/日志/文件上传（9 个端点） |
| 2.3 订单前端列表页 | ✓ | 搜索、分页、状态标签着色、查看/删除操作 |
| 2.4 订单前端表单页 | ✓ | 客户下拉、多行明细（自动计算小计/总金额）、开票要求单选 |
| 2.5 订单详情页 | ✓ | 订单头/明细/开票/收款/状态操作/附件/日志时间线 |
| 2.6 状态关联规则 | ✓ | 9 条规则后端强制校验，含自动关联（取消→无需开票） |
| 2.7 集成测试 | ✓ | 19/19 测试通过（创建/查询/修改/状态流转/删除/日志） |

**状态关联规则清单：**

| 规则 | 校验方式 | 状态 |
|------|---------|------|
| 订单状态自由流转（UAT 2 修改） | 后端 400（仅阻止终态变更/重复设置） | ✓ |
| 已开票订单不能取消 | 后端 409 Conflict | ✓ |
| 取消自动设开票为"无需开票" | 后端自动 | ✓ |
| 未取消不允许设开票为"无需开票" | 后端 400 | ✓ |
| 收款结清需金额≥订单总额 | 后端 400 | ✓ |
| 部分收款需 0<金额<订单总额 | 后端 400 | ✓ |
| 已有收款记录不允许设为未收款 | 后端 400 | ✓ |
| 仅待处理订单可删除 | 后端 400 | ✓ |
| 仅待处理/生产中订单可修改（发票号/开票要求除外） | 后端 400（仅订单主体字段） | ✓ |

### Phase 2 安全审计

| 子任务 | 状态 | 说明 |
|-------|------|------|
| 移除硬编码 DB 密码 | ✓ | database.module.ts / seed.ts / migrate-data.ts |
| 移除硬编码 JWT 密钥 | ✓ | auth.module.ts / jwt.strategy.ts |
| synchronize 环境感知 | ✓ | `synchronize: process.env.NODE_ENV !== 'production'` |
| .env.example 模板 | ✓ | 占位符，随 .env 同步更新 |
| .gitignore 加固 | ✓ | 排除 .env / 临时文件 / 工件 |
| CLAUDE.md 安全规范 | ✓ | 禁止硬编码 + 提交前检查清单 |
| 人工验收文档 | ✓ | 56 个验收用例（Phase 1: 10 + Phase 2: 46） |

### Phase 3 完成总结

| 子任务 | 状态 | 说明 |
|-------|------|------|
| 3.1 报表后端 API | ✓ | 4 个统计接口 + CSV 导出 + PDF 对账单（6 端点全部通过 curl 验证） |
| 3.2 报表前端 ECharts | ✓ | Reports.vue (4 Tab: 产品排行柱状图/客户对账单/营收趋势组合图/状态饼图) |
| 3.3 CSV 导出 | ✓ | 后端生成带 BOM 的 CSV，前端 fetch 触发下载（4 种类型） |
| 3.4 PDF 对账单 | ✓ | pdfkit 生成含客户信息+订单明细的格式化 PDF |
| 3.5 仪表盘经营概览 | ✓ | Dashboard.vue 全面改版（欢迎横幅+4 指标卡片+7 日趋势图+待处理订单表） |

### Phase 3 Bug 修复记录

| Bug | 原因 | 修复 |
|-----|------|------|
| 报表中心显示"暂无数据" | TDesign `cell` 函数签名是 `(h, props)`，代码只用 `({ row })` 导致 `row` 为 `undefined` | 全部 5 处 `cell` 改为 `(h: any, { row }: any)` |
| 图表不渲染 | `loading=false` 和 DOM 渲染/图表初始化时序问题 | `finally` 释放 loading → `await nextTick()` → `renderChart()` |
| CSV/PDF 导出报错 | `Content-Disposition` header 含中文导致 HTTP 协议错误 | 改用 `filename*=UTF-8''${encodeURIComponent()}` 格式 |

### Phase 4 完成总结

| 子任务 | 状态 | 说明 |
|-------|:----:|------|
| 4.1 ECS 环境配置 | ⏳ | Node.js + Nginx + PM2 安装配置（待执行） |
| 4.2 MySQL 数据库初始化 | ⏳ | 创建数据库 + 用户 + 导入建表脚本（待执行） |
| 4.3 构建与部署 | ✅ | 后端 `NestExpressApplication` 单进程部署，`main.ts` 配置静态文件托管 |
| 4.4 备份脚本 | ⏳ | 每日 mysqldump，保留 7 天（待执行） |
| 4.5 部署文档 | ✅ | `deploy-manual.md` — Windows 部署操作手册，含 PM2 开机自启 + 重启验证 |
| 4.6 用户手册 | ✅ | `UserManual.md` — 前端用户使用手册，覆盖全功能模块操作说明 |

### Phase 2 UAT 修复总结

#### UAT 第 2 轮（12 项：3 BUG + 9 优化）

| 编号 | 问题 | 类型 | 根因 | 涉及文件 |
|------|------|:----:|------|---------|
| 1.1 | 备注多行展示 | 优化 | Vue 文本插值忽略 `\n` | [Customers.vue](source/frontend/src/views/Customers.vue) |
| 2.1 | 产品列表排序 | 优化 | 已有功能，确认正常 | [Products.vue](source/frontend/src/views/Products.vue) |
| 3.1 | 列表开票状态展示 | 优化 | StatusBar 渲染长文本 + 列顺序 + 主题色 | [Orders.vue](source/frontend/src/views/Orders.vue) |
| **3.2** | **产品选择后显示为空** | **BUG** | **`handleProductSelect` 未设置 `productId`** | [OrderForm.vue](source/frontend/src/views/OrderForm.vue) |
| 3.3 | 删除 +/- 按钮 | 优化 | `t-input-number` 默认带 stepper | [OrderForm.vue](source/frontend/src/views/OrderForm.vue) |
| 3.4 | 输入框加宽 | 优化 | 120px 仅显示 4 位数字 | [OrderForm.vue](source/frontend/src/views/OrderForm.vue) |
| 3.5 | 自由选择状态 | 优化 | 顺序流转限制 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) + [orders.service.ts](source/backend/src/orders/orders.service.ts) |
| 3.6 | 多次部分收款 | 优化 | 按钮在部分收款后消失 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| 3.7 | 部分收款显示金额 | 优化 | Dialog 缺金额信息 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| 3.8 | 未开票可改要求 | 优化 | 详情页只读展示 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| **3.9** | **PNG 上传 400** | **BUG** | **ValidationPipe 干扰 `@UploadedFile()`** | [main.ts](source/backend/src/main.ts) |
| **4.1** | **PDF 对账单损坏** | **BUG** | **Helvetica 不含中文字形** | [reports.service.ts](source/backend/src/reports/reports.service.ts) + `assets/fonts/` |

#### UAT 第 2 轮补修（7 项）

| 编号 | 问题 | 类 | 根因 | 修复文件 |
|------|------|:-:|------|---------|
| R1 | PDF 字体无效 | BUG | NotoSansSC.otf 实际为 GitHub HTML 页面，非真实字体 | [reports.service.ts](source/backend/src/reports/reports.service.ts) + `assets/fonts/simfang.ttf`、`simhei.ttf` |
| R2 | 附件下载/预览 401 | BUG | 文件 URL 直链接口需 JWT Auth，浏览器新标签不带 token | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) + [order.ts](source/frontend/src/api/order.ts) — 改为 axios blob 下载 |
| R3 | 操作列按钮不显示 | BUG | `#attachment-action` 模板插槽名不匹配 `colKey: 'action'` | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| R4 | 中文文件名乱码 | BUG | Windows 下 multer 的 `originalname` 使用 latin1 编码 | [upload.controller.ts](source/backend/src/upload/upload.controller.ts) |
| R5 | 附件无预览按钮 | 优化 | 仅有下载和删除，缺少预览入口 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| R6 | 发票号不可随时修改 | 优化 | `UpdateOrderDto` 无 `invoiceNo` 字段，且 `update()` 限制订单状态 | [order.dto.ts](source/backend/src/orders/dto/order.dto.ts)、[orders.service.ts](source/backend/src/orders/orders.service.ts)、[OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| **R7** | **PDF 对账单 JSON 化** | **BUG** | **NestJS `@Res({ passthrough: true })` 将 Buffer 序列化为 JSON** | [reports.controller.ts](source/backend/src/reports/reports.controller.ts) — `@Res()` + `res.send()` |

**UAT 测试文档：**
- [UAT2.md](source/UAT/UAT2.md) — 第 2 轮验收问题报告
- [UAT2_Plan.md](source/UAT/UAT2_Plan.md) — 第 2 轮修复计划
- [UAT3.md](source/UAT/UAT3.md) — 第 3 轮验收问题
- [UAT3_Plan.md](source/UAT/UAT3_Plan.md) — 第 3 轮修复计划
- [UAT4.md](source/UAT/UAT4.md) — 第 4 轮验收问题
- [UAT4_Plan.md](source/UAT/UAT4_Plan.md) — 第 4 轮修复计划

### UAT 第 3 轮（18 项：产品 3 + 客户 4 + 订单 11）

| 编号 | 需求 | 类型 | 涉及文件 |
|:----:|------|:----:|---------|
| P1 | "名称"→"货物规格"，"规格"→"单位" | UI 标签 | [Products.vue](source/frontend/src/views/Products.vue) |
| P2 | 默认单价取消 +/- 按钮，加宽至 240px | UI 优化 | [Products.vue](source/frontend/src/views/Products.vue) |
| C1 | 隐藏内部 code，改用 customerCode | 功能变更 | [Customers.vue](source/frontend/src/views/Customers.vue), [Reports.vue](source/frontend/src/views/Reports.vue), [reports.service.ts](source/backend/src/reports/reports.service.ts) |
| C2 | 新增可编辑 customerCode | 字段新增 | [customer.entity.ts](source/backend/src/common/database/entities/customer.entity.ts), [customer.dto.ts](source/backend/src/customers/dto/customer.dto.ts), [Customers.vue](source/frontend/src/views/Customers.vue), [customer.ts](source/frontend/src/api/customer.ts) |
| C3 | 新增可编辑 paymentMethod | 字段新增 | [customer.entity.ts](source/backend/src/common/database/entities/customer.entity.ts), [Customers.vue](source/frontend/src/views/Customers.vue), [Orders.vue](source/frontend/src/views/Orders.vue) |
| C4 | 新增多地址 deliveryAddresses | 字段新增 | [customer.entity.ts](source/backend/src/common/database/entities/customer.entity.ts), [Customers.vue](source/frontend/src/views/Customers.vue) |
| O1 | 隐藏订单内部 code | UI 隐藏 | [Orders.vue](source/frontend/src/views/Orders.vue), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| O2 | 新增 customerOrderNo | 字段新增 | [order.entity.ts](source/backend/src/common/database/entities/order.entity.ts), [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [Orders.vue](source/frontend/src/views/Orders.vue), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| O3 | 新增 deliveryDate | 字段新增 | [order.entity.ts](source/backend/src/common/database/entities/order.entity.ts), [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [Orders.vue](source/frontend/src/views/Orders.vue) |
| O4 | 送货地址从客户带出 | 功能变更 | [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [order.entity.ts](source/backend/src/common/database/entities/order.entity.ts) |
| O5 | 付款方式从客户带出 | 功能变更 | [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [order.entity.ts](source/backend/src/common/database/entities/order.entity.ts), [Orders.vue](source/frontend/src/views/Orders.vue), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| O6 | 明细行新增 customerProductCode | 字段新增 | [order-item.entity.ts](source/backend/src/common/database/entities/order-item.entity.ts), [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| O7 | 发货信息模块（多条目） | 功能新增 | [order.entity.ts](source/backend/src/common/database/entities/order.entity.ts), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) |
| O8 | 列表状态下拉选择 | UI 重构 | [Orders.vue](source/frontend/src/views/Orders.vue) — StatusBar → t-select |
| O9 | 列表新增 5 列 | UI 变更 | [Orders.vue](source/frontend/src/views/Orders.vue) |
| O10 | "查看"→"编辑"按钮 | UI 变更 | [Orders.vue](source/frontend/src/views/Orders.vue) |
| O11 | 列顺序重排 | UI 变更 | [Orders.vue](source/frontend/src/views/Orders.vue) |

**影响文件总计：** 后端 7 文件 (3 entity + 3 dto + 1 service) + 前端 7 文件 (5 views + 2 api) = **14 个源代码文件 + 2 个文档文件**

### UAT 3.2：功能增强（7 项）

| 编号 | 需求 | 类型 | 涉及文件 | 说明 |
|:----:|------|:----:|---------|------|
| E1 | 客户管理—送货地址管理 | 功能新增 | [Customers.vue](source/frontend/src/views/Customers.vue) | 编辑对话框内增删改查+设为默认地址；单地址自动默认；多地址可选择默认 |
| E2 | UAT3 "付款方式"→"结算方式" | UI 变更 | [Customers.vue](source/frontend/src/views/Customers.vue), [OrderForm.vue](source/frontend/src/views/OrderForm.vue), [Orders.vue](source/frontend/src/views/Orders.vue), [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) | 客户/订单中新增的 paymentMethod 改为文本输入"结算方式"；原收款记录（银行转账/微信/支付宝/现金）保持"收款方式"不变 |
| E3 | 订单详情行内编辑 | 功能新增 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) | 订单信息卡片新增编辑按钮，6 字段可切换编辑：客户单号/下单日期/订单交期/送货地址/结算方式/备注 |
| E4 | 送货地址从客户地址带出 | 功能增强 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue) | 订单详情编辑时的送货地址、发货对话框的地址均从客户 deliveryAddresses 下拉选择，支持手动输入新地址 |
| E5 | 发货产品级数量 | 功能新增 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue), [order.ts](source/frontend/src/api/order.ts) | 发货对话框展示订单所有产品行的订单数量+可编辑送货数量；保存 `items[]` 明细；列表展示 `产品×数量` 摘要 |
| E6 | 列表收款弹出对话框 | 功能增强 | [Orders.vue](source/frontend/src/views/Orders.vue) | 列表页选择"部分收款"/"已结清"时弹出金额/方式/日期对话框，与详情页一致 |
| E7 | 移除所有 +/- 按钮 | UI 优化 | [OrderDetail.vue](source/frontend/src/views/OrderDetail.vue), [Orders.vue](source/frontend/src/views/Orders.vue) | 全部 `t-input-number` 设 `theme="normal"`（配送数量/运费/收款金额）；Products.vue 已有 `hide-button` |

### UAT 第 4 轮（2 项优化）

| 编号 | 需求 | 类型 | 涉及文件 | 说明 |
|:----:|------|:----:|---------|------|
| O1 | 按钮文本"创建订单"→"保存" | UI 文本 | [OrderForm.vue](source/frontend/src/views/OrderForm.vue) | 新建订单页面提交按钮文本统一为"保存" |
| O2 | PDF 对账单显示客户单号 | 功能优化 | [reports.service.ts](source/backend/src/reports/reports.service.ts) | 对账单 PDF 订单编号优先显示 `customerOrderNo`，无客户单号时降级为内部 `code` |

---

## 九、Phase 4 启动指南

### 接下来要做的事情（剩余 3 个子任务，预估 2-3 天）

| 编号 | 任务 | 文件 | 状态 | 说明 |
|------|------|------|:----:|------|
| 4.1 | ECS 环境配置 | — | ⏳ | Node.js + Nginx + PM2 安装配置 |
| 4.2 | MySQL 数据库初始化 | — | ⏳ | 创建数据库 + 用户 + 导入建表脚本 |
| 4.3 | 构建与部署（单进程） | `source/backend/src/main.ts`, `source/deploy/deploy-manual.md` | ✅ | Nest 构建 + 静态文件托管；已编写完整部署手册 |
| 4.4 | 备份脚本 | `scripts/backup.sh` | ⏳ | 每日 mysqldump，保留 7 天 |
| 4.5 | 验收测试 | `source/docs/UserManual.md` | ✅ | 已编写用户使用手册（覆盖全功能模块操作说明） |

### 已知遗留问题（部署前解决）

| 问题 | 说明 | 状态 |
|------|------|:----:|
| `env.d.ts` 缺失 | `source/frontend/src/` 缺少 `.d.ts` 文件声明 `.vue` 模块。Vite 内置类型处理，`vue-tsc --noEmit` 通过无需额外声明 | ✅ 不阻塞 |
| ECharts 完整导入 | `import * as echarts from 'echarts'` → 改为 tree-shaking（`echarts/core` + `use()` 按需注册组件）。`Dashboard.vue` 和 `Reports.vue` 已改造 | ✅ 已解决 |
| `tdesign-icons-vue-next` | 图标库为传递依赖未声明在 `package.json`，可能被意外剪枝 | ⏳ 待解决 |
| PDF 中文字体 | 字体文件已从 Invalid HTML 替换为 Windows 系统字体 SimFang/SimHei（TrueType），部署时需确认字体文件随构建包分发 | ✅ 已解决 |
| PM2 Windows 自启 | `pm2 startup` 生成的计划任务默认仅用户登录后触发。已在部署手册给出 `taskschd.msc` 手动配置步骤 | ✅ 已记录方案 |

### 快速启动命令

```bash
# 启动后端（端口 3000）
cd source/backend && npm run start:dev

# 启动前端（端口 5173）
cd source/frontend && npm run dev

# 构建检查
cd source/backend && npx nest build
cd source/frontend && npx vue-tsc --noEmit

# 全量集成测试（Phase 1-3）
cd source/backend && npx jest --verbose
```
