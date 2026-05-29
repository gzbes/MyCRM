# 轻量级客户订单管理系统 — 阶段性开发计划

> **文档版本：** 1.0
> **更新日期：** 2026-05-29
> **依据文档：** [BR.md](./BR.md) — 需求规格说明书 v2.0

---

## 一、项目概览

### 1.1 项目信息

| 项目 | 内容 |
|------|------|
| **项目名称** | 轻量级客户订单管理系统 |
| **开发模式** | 基于 FlowCRM（NO-CRM 源码版）二次开发 |
| **技术栈** | Vue3 + NestJS + TypeScript + Pinia + TDesign + TypeORM + MySQL 8.0 |
| **部署环境** | 阿里云 ECS（Ubuntu / CentOS + Nginx + PM2） |
| **开发工具** | VSCode + Claude Code |
| **预估工期** | 20-26 人天（单人开发约 3-4 周） |

### 1.2 总体时间线

```
Week 1          Week 2          Week 3          Week 4
├────────────────┼────────────────┼────────────────┼───────────────
 Phase 1          Phase 2         Phase 2          Phase 3    Phase 4
(基础框架搭建)    (订单后端开发)   (订单前端开发)    (报表)     (部署+缓冲)
```

### 1.3 核心业务闭环

```
新建客户 → 新建产品 → 新建订单 → 变更状态 → 查看报表
```

---

## 二、开发原则

### 2.1 增量迭代

采用**增量迭代**模式，分 4 个阶段推进。每个阶段产出可独立部署验证的版本：

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
(基础框架)   (核心业务)   (报表赋能)   (部署运营)
```

### 2.2 MVP 优先

- **Phase 1-2 为核心 MVP**，优先保证业务闭环可用
- Phase 3（报表）可适当简化，先上线基础功能
- Phase 4（部署）建议尽早开始，避免上线前突击

### 2.3 质量控制

- 每阶段结束时执行验收测试，通过后方可进入下一阶段
- 每个 API 编写后使用 curl / Postman 测试
- 前端页面完成后进行 UI 走查
- Git 提交粒度：每个子任务完成即提交，commit message 标注阶段编号（如 `Phase 1.1: 初始化项目工程`）

---

## 三、Phase 1：基础框架搭建

> **目标：** 项目跑通，MySQL 替换 JSON，基础认证 + 客户管理可用
> **预估工时：** 5-7 天

### 3.1 任务分解

| 编号 | 任务 | 详细说明 | 产出 | 前置依赖 | 预估工时 |
|------|------|----------|------|----------|----------|
| 1.1 | **初始化项目工程** | Clone FlowCRM 源码，安装依赖，本地跑通 `npm run start:dev`，确认前后端能正常启动和登录 | 开发环境就绪 | 无 | 1d |
| 1.2 | **TypeORM + MySQL 集成** | 安装 TypeORM、mysql2 依赖；配置 `DataSource`（连接 MySQL 8.0）; 创建 `database.module.ts` 和所有实体类（Customer、Product、Order、OrderItem、StatusLog、Attachment、User）；配置 `synchronize: true`（开发阶段自动建表） | 数据库连接正常，表自动创建 | 1.1 | 1d |
| 1.3 | **用户认证模块适配** | 将 Auth 模块从 JSON 存储改为 TypeORM 查询；创建 `User` 实体（users 表）；迁移登录/注册逻辑；确保 JWT 认证流程正常 | Auth 模块基于 MySQL 工作 | 1.2 | 1d |
| 1.4 | **客户管理模块迁移** | 将 Customers 模块从 JSON 存储改为 TypeORM CRUD；扩展字段（客户编号 `code`、联系人 `contact`、电话 `phone`、地址 `address`）；实现客户编号自动生成（`CUST-YYYYMMDD-XXXX`）；实现客户名称防重校验；实现删除前未完成订单校验（引用计数） | Customers CRUD 基于 MySQL | 1.2 | 1d |
| 1.5 | **前端路由/布局调整** | 保留 MainLayout；调整菜单结构：去掉 Leads（线索）/ Activities（跟进）/ Tasks（任务）菜单，保留 Customers；为后续 Products、Orders、Reports 预留路由占位 | 前端导航精简可用 | 1.1 | 0.5d |
| 1.6 | **数据迁移脚本** | 编写脚本将原 `data/*.json` 中的数据导入 MySQL；保留 `JsonStorageService` 作为历史数据导入工具 | 原数据不丢失 | 1.2 | 0.5d |
| 1.7 | **集成测试** | 验证：登录/登出、客户增删改查、客户名称防重校验、客户删除时未完成订单校验、数据正确持久化到 MySQL | 全流程验证通过 | 1.3-1.6 | 1d |

### 3.2 验收标准

- [ ] 项目在本地 `npm run start:dev` 启动正常，前端能正常访问登录页
- [ ] 默认管理员账号可登录，JWT 认证流程正常
- [ ] 客户管理：新建、编辑、搜索、删除功能正常
- [ ] 删除有未完成订单的客户时被阻止
- [ ] 客户名称重复时提示错误
- [ ] 所有数据正确存储在 MySQL 中（非 JSON 文件）

### 3.3 涉及文件

| 操作 | 文件路径 |
|------|----------|
| **新增** | `backend/src/common/database/database.module.ts` |
| **新增** | `backend/src/common/database/entities/*.entity.ts`（6 个实体） |
| **改造** | `backend/src/auth/` — 切换为 TypeORM |
| **改造** | `backend/src/customers/` — 切换为 TypeORM，扩展字段 |
| **改造** | `backend/src/common/json-storage.service.ts` — 保留为迁移工具 |
| **改造** | `frontend/src/views/Customers.vue` — 适配新字段 |
| **改造** | `frontend/src/router/index.ts` — 调整菜单路由 |

---

## 四、Phase 2：核心业务开发

> **目标：** 产品管理 + 订单管理完整功能上线
> **预估工时：** 7-10 天

### 4.1 任务分解

| 编号 | 任务 | 详细说明 | 产出 | 前置依赖 | 预估工时 |
|------|------|----------|------|----------|----------|
| 2.1 | **产品管理模块** | 后端：Products CRUD API（`/api/products`），含启用/停用、名称/规格搜索、删除前引用校验；前端：产品列表页（搜索/分页）、新建/编辑表单页、启用/停用开关 | 产品管理完整 CRUD | Phase 1 | 1.5d |
| 2.2 | **订单管理后端 API** | Orders CRUD API（`/api/orders`）：订单头+明细的嵌套创建/更新/查询；订单编号自动生成（`ORD-YYYYMMDD-XXXX`）；订单总金额自动计算；状态变更 API（含关联规则校验 -> BR.md §3.3.3）；文件上传 API（`./uploads/orders/{orderId}/`，限制 10MB）；状态变更日志自动记录；附件 CRUD（上传/删除/查询） | 订单后端 API 完整 | Phase 1 | 3d |
| 2.3 | **订单前端 — 列表页** | 订单列表展示（编号/客户/日期/总金额/三状态）；按客户/日期/状态筛选；模糊搜索；分页；快捷操作按钮（状态变更入口）；三状态列标识（不同颜色标签） | 订单列表页 | 2.2 | 1.5d |
| 2.4 | **订单前端 — 表单页** | 新建/编辑订单表单：客户下拉选择、下单日期（默认当天）、多行产品明细（产品下拉联动规格/单价、可手动修改单价、自动计算小计和总金额）、开票信息（单选+发票号+附件上传）、收款信息（方式+日期）、上传附件组件（预览/删除） | 订单表单页 | 2.1, 2.2 | 2d |
| 2.5 | **订单详情页** | 展示订单全部字段；三种状态独立展示及变更按钮（带二次确认）；附件预览（图片/PDF）；状态变更时间线（操作日志列表）；打印/导出入口 | 订单详情页 | 2.2 | 1d |
| 2.6 | **状态关联规则实现** | 严格实现 BR.md §3.3.3 中的所有规则：后端强制校验 + 前端友好提示；确认对话框处理"已完成但未收款"等警告场景 | 规则全量覆盖 | 2.2 | 1d |

### 4.2 验收标准

- [ ] 产品管理：CRUD、启用/停用、搜索、删除引用校验完整
- [ ] 订单创建：可选择客户、多行产品明细（联动单价）、自动计算总金额
- [ ] 文件上传：支持图片/PDF 上传、预览、删除
- [ ] 三种状态独立流转，关联规则正确触发（阻止或警告）
- [ ] 状态变更记录可追溯（操作日志时间线）
- [ ] 订单列表页搜索/筛选/分页正常

### 4.3 涉及文件

| 操作 | 文件路径 |
|------|----------|
| **新增** | `backend/src/products/products.module.ts` + `products.service.ts` + `products.controller.ts` |
| **新增** | `backend/src/orders/orders.module.ts` + `orders.service.ts` + `orders.controller.ts` |
| **新增** | `backend/src/upload/upload.module.ts` + `upload.service.ts` + `upload.controller.ts` |
| **新增** | `frontend/src/views/Products.vue` |
| **新增** | `frontend/src/views/Orders.vue`（列表页） |
| **新增** | `frontend/src/views/OrderDetail.vue`（详情页） |
| **新增** | `frontend/src/views/OrderForm.vue`（表单页） |
| **改造** | `frontend/src/router/index.ts` — 添加产品、订单路由 |

---

## 五、Phase 3：报表赋能

> **目标：** 四维报表 + 导出功能
> **预估工时：** 4-5 天

### 5.1 任务分解

| 编号 | 任务 | 详细说明 | 产出 | 前置依赖 | 预估工时 |
|------|------|----------|------|----------|----------|
| 3.1 | **报表后端 API** | 四个统计接口：①按产品汇总（销量排行，排除已取消订单）；②按客户汇总（对账单：订单数/消费/已收/未结清）；③按时间段汇总（新增订单数/已开票金额/实收金额，支持按日/周/月聚合）；④按状态汇总（各状态订单数+金额分组） | 四维报表 API | Phase 2 | 2d |
| 3.2 | **报表前端页面** | ECharts 图表展示：时间段汇总用柱状图+折线图（累计趋势）；产品排行用横向柱状图；客户对账单用表格展示；状态汇总用饼图/环形图；筛选条件（时间段下拉、客户选择器） | 报表页面 | 3.1 | 1.5d |
| 3.3 | **CSV 导出功能** | 所有报表添加"导出 CSV"按钮；后端生成 CSV 文件流，前端触发下载 | CSV 导出 | 3.1 | 0.5d |
| 3.4 | **PDF 对账单导出** | 客户对账单支持导出 PDF（含公司名称、客户信息、订单明细、金额汇总）；使用 `pdfkit` 或 `puppeteer` 生成 | PDF 对账单 | 3.1 | 0.5d |
| 3.5 | **仪表盘改造** | 替换原 Dashboard 为经营概览：今日新增订单数、本月营收、待处理订单数、近7天营收趋势（迷你折线图）、快捷入口（新建客户/产品/订单） | 经营概览仪表盘 | 3.1 | 0.5d |

### 5.2 验收标准

- [ ] 四维报表数据与订单录入数据完全一致
- [ ] ECharts 图表正确渲染，支持按日/周/月聚合
- [ ] CSV 导出正常，数据完整
- [ ] PDF 对账单格式清晰，含客户信息和订单明细
- [ ] 仪表盘显示关键经营指标

### 5.3 涉及文件

| 操作 | 文件路径 |
|------|----------|
| **新增** | `backend/src/reports/reports.module.ts` + `reports.service.ts` + `reports.controller.ts` |
| **新增** | `frontend/src/views/Reports.vue` |
| **改造** | `frontend/src/views/Dashboard.vue` — 替换为经营概览 |
| **改造** | `frontend/src/router/index.ts` — 添加报表路由 |

---

## 六、Phase 4：部署与运维

> **目标：** 部署到 ECS 并配置运维体系
> **预估工时：** 3-4 天

### 6.1 任务分解

| 编号 | 任务 | 详细说明 | 产出 | 前置依赖 | 预估工时 |
|------|------|----------|------|----------|----------|
| 4.1 | **ECS 环境配置** | 服务器基础配置：Node.js（LTS 版本）安装、Nginx 安装配置、PM2 全局安装；配置 Nginx 反向代理（前端静态文件 + API 代理转发）；配置 Nginx 上传文件大小限制（10MB+） | 服务器环境就绪 | 无 | 1d |
| 4.2 | **MySQL 数据库初始化** | ECS MySQL 8.0 创建数据库和用户；导入表结构（TypeORM Migration 或同步建表）；配置数据库连接信息到 `.env` 文件 | 生产数据库就绪 | 4.1 | 0.5d |
| 4.3 | **构建与部署** | 前端生产构建 `npm run build`；后端生产构建 `npm run build`；配置 PM2 启动脚本（`ecosystem.config.js`）；Nginx 配置前端路由 `try_files` 支持 SPA；配置 `uploads/` 目录的 Nginx 静态访问 | 生产环境可访问 | 4.1, 4.2 | 1d |
| 4.4 | **备份脚本** | 编写 MySQL 每日备份脚本（`scripts/backup-mysql.sh`）：`mysqldump` + 压缩 + 按日期命名 + 保留最近 7 天；crontab 配置每日凌晨自动执行；支持手动触发备份（`npm run backup`） | 自动备份机制 | 4.2 | 0.5d |
| 4.5 | **域名 / HTTPS（可选）** | 域名 DNS 解析配置；Nginx 配置 HTTPS（Let's Encrypt + certbot）；HTTP 自动跳转 HTTPS | 安全访问 | 4.3 | 0.5d |
| 4.6 | **验收测试** | 在 ECS 生产环境执行完整业务闭环测试：登录 → 新建客户 → 新建产品 → 新建订单 → 状态变更 → 报表查看 → 文件上传 | 生产验收通过 | 4.3 | 0.5d |

### 6.2 验收标准

- [ ] 生产环境通过 IP/域名可正常访问
- [ ] Nginx 反向代理正常工作（前端 SPA + API 代理）
- [ ] PM2 进程守护正常（`pm2 status` 显示 online）
- [ ] 文件上传/预览正常（Nginx 静态服务配置正确）
- [ ] 每日凌晨自动备份已配置，备份文件可正常恢复
- [ ] 完整业务闭环在生产环境执行通过

### 6.3 涉及文件

| 操作 | 文件路径 |
|------|----------|
| **新增** | `deploy/ecosystem.config.js` — PM2 配置 |
| **新增** | `deploy/nginx.conf` — Nginx 配置模板 |
| **新增** | `scripts/backup-mysql.sh` — 备份脚本 |
| **新增** | `.env.production` — 生产环境配置 |

---

## 七、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| FlowCRM 升级 NestJS v11 与现有依赖不兼容 | 中 | 高 | Phase 1 先跑通 demo，锁定依赖版本。若兼容性问题严重，降级 NestJS 版本或查找替代方案 |
| TypeORM 学习成本影响进度 | 中 | 中 | 优先使用 TypeORM 基础功能（CRUD + 简单联表查询），复杂查询用 `query builder` 或原生 SQL |
| 文件上传存储无限增长 | 高 | 低 | 限制单文件 ≤ 10MB，限制文件类型，定期手工清理 |
| ECS 环境与本地环境差异 | 中 | 中 | 开发环境尽量与生产环境一致（Node 版本、MySQL 版本），尽早开始部署验证 |
| 单人开发，进度受个人因素影响 | 中 | 中 | MVP 优先：Phase 1-2 优先上线，Phase 3 延后。每天记录进度，遇到阻塞及时记录集中解决 |

---

## 八、附录：文件变更总清单

### 8.1 后端新增文件

```
backend/src/
├── common/database/
│   ├── database.module.ts              # TypeORM 配置模块
│   └── entities/
│       ├── customer.entity.ts           # 客户实体
│       ├── product.entity.ts            # 产品实体
│       ├── order.entity.ts              # 订单实体
│       ├── order-item.entity.ts         # 订单明细实体
│       ├── status-log.entity.ts         # 状态变更日志实体
│       ├── attachment.entity.ts         # 附件实体
│       └── user.entity.ts              # 用户实体
├── products/
│   ├── products.module.ts              # 产品模块
│   ├── products.service.ts             # 产品服务
│   └── products.controller.ts          # 产品控制器
├── orders/
│   ├── orders.module.ts                # 订单模块
│   ├── orders.service.ts               # 订单服务
│   └── orders.controller.ts            # 订单控制器
├── reports/
│   ├── reports.module.ts               # 报表模块
│   ├── reports.service.ts              # 报表服务
│   └── reports.controller.ts           # 报表控制器
└── upload/
    ├── upload.module.ts                # 上传模块
    ├── upload.service.ts               # 上传服务
    └── upload.controller.ts            # 上传控制器
```

### 8.2 后端改造文件

```
backend/src/
├── auth/                               # 认证模块 — 切换为 TypeORM
├── customers/                          # 客户模块 — 切换为 TypeORM，扩展字段
└── common/
    ├── json-storage.service.ts         # 保留，作为迁移工具
    └── interfaces.ts                   # 更新接口定义
```

### 8.3 前端新增文件

```
frontend/src/views/
├── Products.vue                        # 产品管理页
├── Orders.vue                          # 订单列表页
├── OrderForm.vue                       # 订单表单页
├── OrderDetail.vue                     # 订单详情页
└── Reports.vue                         # 报表页
```

### 8.4 前端改造文件

```
frontend/src/
├── views/
│   ├── Login.vue                       # 保留
│   ├── Dashboard.vue                   # 替换为经营概览
│   └── Customers.vue                   # 适配新字段
├── router/
│   └── index.ts                        # 更新路由表
└── stores/                             # 适配 MySQL 数据格式
```

### 8.5 部署相关文件

```
deploy/
├── ecosystem.config.js                 # PM2 进程配置
└── nginx.conf                          # Nginx 配置模板
scripts/
└── backup-mysql.sh                     # MySQL 每日备份脚本
.env.production                         # 生产环境配置
```

---

## 九、每日开发建议

1. **每日记录**：每天记录开发进度到项目日志中
2. **测试先行**：每个 API/组件完成后立即测试，避免问题堆积
3. **遇到阻塞**：集中记录在项目 issue 中（如 ECharts 配置、文件上传预览兼容性等）
4. **代码提交**：完成每个子任务即提交，保持粒度适中
5. **每周回顾**：每周检查进度是否偏离计划，及时调整

---

*本计划基于 [BR.md](./BR.md) 需求规格说明书 v2.0 制定，将随项目进展持续更新。*
