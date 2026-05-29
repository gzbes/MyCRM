# 轻量级客户订单管理系统 — 需求规格说明书 v2.0

> **文档版本：** 2.0
> **更新日期：** 2026-05-29
> **更新说明：** 基于 v1.0 评审意见优化，补充产品管理、存储方案决策、状态流转规则、ECS 部署计划、MVP 项目规划

---

## 一、项目概述

### 1.1 项目背景

目前业务处于起步阶段，由单人独立运营。随着客户与订单量逐步增加，传统的手工记录（Excel）已难以满足订单全生命周期（下单 → 开票 → 收款）的精细化管理需求。为解决信息分散、状态追踪困难及数据统计繁琐等痛点，决定基于开源项目 **FlowCRM**（NO-CRM 源码版，Vue3 + NestJS + TypeScript）进行轻量级二次开发。

### 1.2 项目目标

构建一套低成本、易维护的 Web 端客户订单管理系统，实现：
- 客户信息集中存储与管理
- 产品信息标准化维护（从产品库选择，确保数据一致性）
- 订单状态、开票状态、收款状态的独立流转与可视化追踪
- 自动生成多维度经营报表，辅助业务决策
- 核心操作闭环：新建客户 → 新建产品 → 新建订单 → 变更状态 → 查看报表

### 1.3 技术选型与约束

| 维度 | 选择 | 说明 |
|------|------|------|
| **基础框架** | **FlowCRM** 二次开发（Vue3 + NestJS + TypeScript + Pinia） | 保留原项目基础架构 |
| **前端 UI** | TDesign Vue Next（项目自带） | 腾讯开源企业级组件库 |
| **数据存储** | **MySQL 8.0** | ECS 已预装，替换原 JSON 文件存储 |
| **ORM 框架** | **TypeORM**（NestJS 官方推荐） | 与 MySQL 配合，支持迁移脚本 |
| **认证** | JWT + Passport（项目已有） | 保留并适配 |
| **文件存储** | 服务器本地文件系统 `./uploads/` | Nginx 代理静态访问 |
| **部署环境** | **阿里云 ECS**（已预装 MySQL 8.0） | Ubuntu / CentOS + Nginx + PM2 |
| **开发工具** | VSCode + Claude Code | |
| **版本控制** | Git + 私有仓库 | |

### 1.4 数据存储说明

#### 数据切换路径：JSON → MySQL

FlowCRM 原项目使用 JSON 文件存储，本项目将改造为 MySQL 8.0 存储。

| 对比项 | JSON 文件（原） | MySQL 8.0（目标） |
|--------|----------------|-------------------|
| 查询能力 | 全量读入 JS 过滤 | 完整 SQL + 索引 |
| 事务支持 | 无 | 完整 ACID |
| 并发安全 | 无 | 行级锁 + 事务 |
| 千万级数据 | 不适用 | 毫秒级查询 |
| 备份恢复 | 文件拷贝 | mysqldump / 主从复制 |
| 数据完整性 | 代码层校验 | 外键约束 + Unique 索引 |

#### 迁移策略

1. **开发阶段** — 直接用 MySQL，TypeORM 同步建表
2. **原项目数据** — 提供脚本将 `data/*.json` 导入 MySQL
3. **混合模式（过渡）** — `JsonStorageService` 保留，新增 `TypeOrmService`，通过配置切换

---

## 二、源码分析：FlowCRM 项目架构

### 2.1 目录结构

```
FlowCRM/source/
├── backend/                    # NestJS 后端
│   └── src/
│       ├── auth/               # 认证模块（JWT + Passport）
│       ├── customers/          # 客户管理模块
│       ├── leads/              # 线索管理模块
│       ├── activities/         # 跟进记录模块（时间线）
│       ├── tasks/              # 任务提醒模块
│       ├── statistics/         # 统计数据模块
│       └── common/             # 公共模块
│           ├── json-storage.service.ts   # JSON 存储服务
│           └── interfaces.ts            # 类型定义
├── frontend/                   # Vue3 前端
│   └── src/
│       ├── views/              # 页面组件
│       ├── router/             # 路由配置
│       ├── stores/             # Pinia 状态管理
│       └── layouts/            # 布局组件
├── deploy/                     # 部署脚本
└── docs/                       # 文档
```

### 2.2 可直接复用的模块

| 模块 | 复用策略 |
|------|---------|
| Auth（认证） | **保留** — JWT 认证逻辑，适配 MySQL |
| Customers（客户） | **改造** — 从 JSON 改为 MySQL，按本项目需求扩展字段 |
| Dashboard（仪表盘） | **改造** — 替换为订单经营报表 |
| 前端布局/路由 | **保留** — MainLayout + 路由守卫 |
| 部署脚本 | **保留** — Nginx + PM2 配置，适配 MySQL |

### 2.3 需要重写的模块

| 模块 | 原因 |
|------|------|
| Orders（订单） | 全新模块，FlowCRM 无订单功能 |
| Products（产品） | 全新模块，FlowCRM 无产品管理 |
| Reports（报表） | 替换原 statistics 模块，改为订单维度报表 |
| JsonStorageService | 替换为 TypeORM + 数据库连接 |

---

## 三、核心功能需求

### 3.1 客户信息管理模块

#### 功能列表

| 功能 | 说明 |
|------|------|
| 客户档案 | 录入客户名称、联系人、联系电话、地址 |
| 客户列表 | 支持按客户名称模糊搜索，展示客户基础画像（订单总数、累计消费、未结清金额） |
| 关联订单 | 客户详情页可直接查看该客户名下的所有历史订单记录 |
| 客户编号 | 系统自动生成唯一客户编号，格式：`CUST-YYYYMMDD-XXXX` |

#### 非功能性要求
- 客户名称不允许重复（防重校验）
- 删除客户前需确认该客户名下是否有未完成的订单，有则阻止删除并提示

### 3.2 产品信息管理模块（v1.0 后期扩展 → 升级为核心模块）

#### 为什么需要产品管理

订单中的"产品名称、规格、单价"若手动输入，会导致：
- 同一产品名称不统一（如"蓝牙耳机" vs "蓝牙耳机Pro"）
- 单价数据分散，无法批量更新
- "按产品汇总"报表数据不准确

#### 功能列表

| 功能 | 说明 |
|------|------|
| 产品档案 | 录入产品名称、规格型号、默认单价、备注 |
| 产品列表 | 支持按名称/规格搜索 |
| 产品启用/停用 | 停用的产品在新建订单时不可选，已有订单不受影响 |

#### 订单与产品的关系规则

- 订单从产品库中选择产品，自动填充名称、规格、默认单价
- 允许手动修改订单中的单价（记录当时的实际成交价），**不影响产品库中的默认单价**
- 订单明细中冗余保存产品名称、规格快照（产品信息变更不影响历史订单）
- 产品删除时需校验是否被订单引用，引用中则阻止删除

### 3.3 订单全生命周期管理模块（核心）

#### 3.3.1 订单录入

**订单头信息：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 订单编号 | 自动生成 | — | 格式：`ORD-YYYYMMDD-XXXX` |
| 关联客户 | 下拉选择 | 是 | 从客户库中选择 |
| 下单日期 | 日期 | 是 | 默认当天 |
| 备注 | 文本 | 否 | — |

**订单明细（支持多行）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 产品 | 下拉选择 | 是 | 从产品库中选择 |
| 规格 | 自动填充 | — | 从产品库联动 |
| 单价 | 数字(2位小数) | 是 | 默认填充产品标准单价，可修改 |
| 数量 | 整数 | 是 | 必须 > 0 |
| 明细小计 | 自动计算 | — | 单价 × 数量 |
| 订单总金额 | 自动计算 | — | 所有明细小计之和 |

**开票信息：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 开票要求 | 单选 | 是 | 无需开票 / 需开3%增值税专用发票 / 需开普通发票 |
| 发票号 | 文本 | 否 | 开票后补充 |
| 发票附件 | 文件上传 | 否 | 支持 JPG/PNG/PDF，单文件 ≤ 10MB |

**收款信息：**

| 字段 | 类型 | 说明 |
|------|------|------|
| 收款状态 | 状态 | 详见 §3.3.3 |
| 已收金额 | 数字(2位小数) | 部分收款时记录 |
| 收款方式 | 文本 | 银行转账/微信/支付宝/现金 |
| 收款日期 | 日期 | 实际收款日期 |

**附件管理：**
- 支持上传订单沟通截图或 PDF 文件
- 文件存储路径：`./uploads/orders/{orderId}/`
- 支持在线预览图片和 PDF
- 单文件大小限制：≤ 10MB
- 支持文件删除

#### 3.3.2 三种状态的独立定义

| 状态类型 | 可选值 | 说明 |
|----------|--------|------|
| **订单状态** | 待处理 → 生产中 → 已发货 → 已完成 / 已取消 | 线性流转 |
| **开票状态** | 未开票 / 无需开票 / 已开增值税专用发票 / 已开普通发票 | 根据开票要求自动建议 |
| **收款状态** | 未收款 / 部分收款 / 已结清 | 部分收款时记录已收金额 |

#### 3.3.3 状态关联规则

三种状态并非完全独立，需遵循以下规则：

| 场景 | 自动行为 | 违规阻止 |
|------|----------|----------|
| 订单 → **已取消** | 自动将开票状态设为"无需开票" | 若已开票则阻止取消 |
| 订单 → **已完成** | — | 若收款状态为"未收款"则提示确认 |
| 开票 → **已开发票** | — | 发票金额不可超过订单总金额 |
| 收款 → **已结清** | — | 已收金额必须 ≥ 订单总金额 |
| 订单 **未取消** | — | 不允许将开票设为"无需开票" |
| 收款 **部分收款** | 已收金额初始化为 0 | 已收金额必须 < 订单总金额 |

> **说明：** 单人场景下，UI 层做友好提示，后端做强制校验。

#### 3.3.4 状态操作

- 订单列表和详情页提供快捷操作按钮
- 状态变更需记录操作日志（时间、旧状态、新状态）

### 3.4 智能报表中心模块

#### 3.4.1 按产品汇总

- 选择时间段，统计各产品销售数量、销售总额
- 按销量或销售额降序排列（产品销量排行）
- 仅统计状态**非"已取消"**的订单

#### 3.4.2 按客户汇总（客户对账单）

- 选择客户，统计：订单总数、累计消费金额、已收款金额、当前未结清金额
- 未结清金额 = 累计消费金额 − 已收款金额

#### 3.4.3 按时间段汇总（营收趋势）

- 自定义起止时间
- 指标：新增订单数、已开票金额、实际收款金额
- 图表：柱状图（按日/周/月聚合）+ 折线图（累计趋势）
- 图表库：项目已有的 ECharts

#### 3.4.4 按状态汇总

- 分别按订单状态、开票状态、收款状态分组
- 统计各状态下的订单数量、总金额

#### 3.4.5 报表导出

- 所有报表支持导出为 CSV 格式
- 对账单支持导出为 PDF（方便发给客户对账）

---

## 四、非功能需求

### 4.1 易用性

- 界面保持 NO-CRM 原有的简洁风格
- 核心字段支持默认值填充（如下单日期默认当天）
- 高频操作（新建订单、状态变更）控制在 2 次点击以内
- 响应式布局，适配 1366px+ 桌面显示

### 4.2 性能要求

| 场景 | 目标 | 数据量基准 |
|------|------|-----------|
| 页面加载 | ≤ 2s | 首次加载（含框架资源） |
| 列表查询 | ≤ 300ms | 1000 条客户/订单记录（MySQL 索引优化） |
| 报表生成 | ≤ 1s | 1000 条订单，多维度聚合 |
| 状态变更 | ≤ 200ms | 单订单操作 |
| 文件上传 | ≤ 3s | 10MB 以内文件 |

### 4.3 数据安全与备份

**MySQL 备份策略：**
- 每日凌晨自动 mysqldump 备份
- 保留最近 7 天备份文件
- 备份文件存储至 `./backups/mysql/`
- 支持手动触发备份

**通用：**
- 项目纳入 Git 版本控制（除 `node_modules/`、`uploads/`）
- 上传文件需限制类型和大小

### 4.4 日志与审计

- 记录所有订单创建、状态变更、删除操作
- 日志字段：操作时间、操作类型、变更前内容、变更后内容

---

## 五、数据模型设计

### 5.1 E-R 关系

```
客户 ──── 1:N ──── 订单 ──── 1:N ──── 订单明细 ──── N:1 ──── 产品
                      │
                      ├── 状态变更日志
                      └── (文件上传路径记录)
```

### 5.2 核心表结构（MySQL 8.0）

#### 客户表 (customers)

```sql
CREATE TABLE `customers` (
  `id`         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(32)    NOT NULL COMMENT '客户编号，格式: CUST-YYYYMMDD-XXXX',
  `name`       VARCHAR(100)   NOT NULL COMMENT '客户名称',
  `contact`    VARCHAR(50)    DEFAULT NULL COMMENT '联系人',
  `phone`      VARCHAR(20)    DEFAULT NULL COMMENT '联系电话',
  `address`    TEXT           DEFAULT NULL COMMENT '地址',
  `created_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表';
```

#### 产品表 (products)

```sql
CREATE TABLE `products` (
  `id`            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(100)   NOT NULL COMMENT '产品名称',
  `spec`          VARCHAR(100)   DEFAULT NULL COMMENT '规格型号',
  `default_price` DECIMAL(10,2)  NOT NULL DEFAULT 0.00 COMMENT '默认单价',
  `status`        TINYINT        NOT NULL DEFAULT 1 COMMENT '1:启用, 0:停用',
  `remark`        TEXT           DEFAULT NULL COMMENT '备注',
  `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品表';
```

#### 订单表 (orders)

```sql
CREATE TABLE `orders` (
  `id`                 INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `code`               VARCHAR(32)    NOT NULL COMMENT '订单编号, 格式: ORD-YYYYMMDD-XXXX',
  `customer_id`        INT UNSIGNED   NOT NULL COMMENT '关联客户ID',
  `order_date`         DATE           NOT NULL COMMENT '下单日期',
  `total_amount`       DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
  `order_status`       VARCHAR(20)    NOT NULL DEFAULT '待处理' COMMENT '订单状态',
  `invoice_status`     VARCHAR(30)    NOT NULL DEFAULT '未开票' COMMENT '开票状态',
  `invoice_requirement` VARCHAR(30)   NOT NULL DEFAULT '无需开票' COMMENT '开票要求',
  `invoice_no`         VARCHAR(50)    DEFAULT NULL COMMENT '发票号',
  `invoice_file`       VARCHAR(255)   DEFAULT NULL COMMENT '发票附件路径',
  `payment_status`     VARCHAR(20)    NOT NULL DEFAULT '未收款' COMMENT '收款状态',
  `received_amount`    DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT '已收金额',
  `payment_method`     VARCHAR(20)    DEFAULT NULL COMMENT '收款方式',
  `payment_date`       DATE           DEFAULT NULL COMMENT '收款日期',
  `remark`             TEXT           DEFAULT NULL COMMENT '备注',
  `created_at`         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_invoice_status` (`invoice_status`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

#### 订单明细表 (order_items)

```sql
CREATE TABLE `order_items` (
  `id`           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `order_id`     INT UNSIGNED   NOT NULL COMMENT '关联订单ID',
  `product_id`   INT UNSIGNED   DEFAULT NULL COMMENT '关联产品ID(nullable, 产品删除后保留记录)',
  `product_name` VARCHAR(100)   NOT NULL COMMENT '产品名称(快照)',
  `product_spec` VARCHAR(100)   DEFAULT NULL COMMENT '规格(快照)',
  `unit_price`   DECIMAL(10,2)  NOT NULL COMMENT '成交单价',
  `quantity`     INT UNSIGNED   NOT NULL COMMENT '数量',
  `subtotal`     DECIMAL(12,2)  NOT NULL COMMENT '小计',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_item_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';
```

#### 状态变更日志表 (status_logs)

```sql
CREATE TABLE `status_logs` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `order_id`    INT UNSIGNED   NOT NULL COMMENT '关联订单ID',
  `status_type` VARCHAR(20)    NOT NULL COMMENT '状态类型: order/invoice/payment',
  `old_status`  VARCHAR(30)    NOT NULL COMMENT '旧状态',
  `new_status`  VARCHAR(30)    NOT NULL COMMENT '新状态',
  `operator`    VARCHAR(50)    DEFAULT 'system' COMMENT '操作人',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_log_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='状态变更日志表';
```

#### 附件表 (attachments)

```sql
CREATE TABLE `attachments` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `order_id`    INT UNSIGNED   NOT NULL COMMENT '关联订单ID',
  `file_name`   VARCHAR(255)   NOT NULL COMMENT '原始文件名',
  `file_path`   VARCHAR(500)   NOT NULL COMMENT '存储路径',
  `file_size`   INT UNSIGNED   NOT NULL COMMENT '文件大小(字节)',
  `mime_type`   VARCHAR(50)    NOT NULL COMMENT 'MIME类型',
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  CONSTRAINT `fk_attach_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件表';
```

---

## 六、MVP 项目实施规划

### 整体策略

采用**增量迭代**模式，分 4 个阶段推进。每阶段产出可独立部署验证的版本。

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
(基础框架)   (核心业务)   (报表赋能)   (部署运营)
```

---

### Phase 1：基础框架搭建（预计 5-7 天）

**目标：** 项目跑通，MySQL 替换 JSON，基础认证+客户管理可用

| # | 任务 | 产出 | 工时 |
|---|------|------|------|
| 1.1 | 初始化项目工程 | FlowCRM 源码跑通 `npm run start:dev` | 1d |
| 1.2 | TypeORM 集成 | TypeORM 配置 + MySQL 连接 + 初始 Migration | 1d |
| 1.3 | 用户认证模块适配 | Auth 模块从 JSON 迁移到 MySQL（users 表） | 1d |
| 1.4 | 客户管理模块适配 | Customers 模块 CRUD 迁移到 MySQL | 1d |
| 1.5 | 前端路由/布局调整 | 保留 MainLayout，调整菜单（去掉 Leads/Activities/Tasks，保留 Customers） | 0.5d |
| 1.6 | 数据迁移脚本 | 将原 `data/*.json` 导入 MySQL | 0.5d |
| 1.7 | 集成测试 | 验证认证 + 客户 CRUD 全流程 | 1d |

**Phase 1 可验收成果：**
- [x] 项目在本地启动，前端能正常登录
- [x] 客户增删改查功能正常
- [x] 数据存储在 MySQL 中
- [x] 默认管理员账号可登录

---

### Phase 2：核心业务开发（预计 7-10 天）

**目标：** 产品管理 + 订单管理完整功能上线

| # | 任务 | 产出 | 工时 |
|---|------|------|------|
| 2.1 | 产品管理模块 | 后端: Products CRUD API + 前端: 产品列表/新建/编辑页 | 1.5d |
| 2.2 | 订单管理模块 - 后端 | Orders CRUD API（含订单头+明细+状态变更+附件） | 3d |
| 2.3 | 订单管理模块 - 前端列表页 | 订单列表（搜索/筛选/分页）+ 快捷操作按钮 | 1.5d |
| 2.4 | 订单管理模块 - 前端表单页 | 新建订单（客户选择+多行产品+开票/收款信息+文件上传） | 2d |
| 2.5 | 订单详情页 | 展示全部字段 + 状态变更操作 + 附件预览 + 操作日志 | 1d |
| 2.6 | 状态关联规则实现 | 前后端校验逻辑（阻止/警告） | 1d |

**Phase 2 可验收成果：**
- [x] 产品管理完整 CRUD
- [x] 可创建完整订单（含多行明细+文件上传）
- [x] 三种状态可独立流转，关联规则正确触发
- [x] 操作日志可追溯

---

### Phase 3：报表赋能（预计 4-5 天）

**目标：** 四维报表 + 导出功能

| # | 任务 | 产出 | 工时 |
|---|------|------|------|
| 3.1 | 报表后端 API | 四维统计接口（产品/客户/时间段/状态） | 2d |
| 3.2 | 报表前端页面 | ECharts 图表展示（柱状图+折线图） | 1.5d |
| 3.3 | CSV 导出功能 | 所有报表支持导出 CSV | 0.5d |
| 3.4 | PDF 对账单导出 | 客户对账单导出为 PDF | 0.5d |
| 3.5 | 仪表盘改造 | 替换原 Dashboard 为经营概览页（今日订单/本月营收/待办等） | 0.5d |

**Phase 3 可验收成果：**
- [x] 四维报表数据准确，与订单录入一致
- [x] 图表正确渲染，支持按日/周/月聚合
- [x] CSV 导出正常，PDF 对账单格式清晰

---

### Phase 4：部署与运维（预计 3-4 天）

**目标：** 部署到 ECS 并配置运维体系

| # | 任务 | 产出 | 工时 |
|---|------|------|------|
| 4.1 | ECS 环境配置 | Node.js + Nginx + PM2 安装配置 | 1d |
| 4.2 | MySQL 数据库初始化 | 在 ECS MySQL 8.0 创建数据库、导入表结构、配置连接 | 0.5d |
| 4.3 | 构建与部署 | 前端 build + 后端 build + Nginx 配置 + PM2 启动 | 1d |
| 4.4 | 备份脚本 | MySQL 每日备份脚本 + crontab 配置 | 0.5d |
| 4.5 | 域名/HTTPS（可选） | 域名绑定 + Let's Encrypt SSL 证书 | 0.5d |
| 4.6 | 验收测试 | 在 ECS 环境执行完整业务闭环验收 | 0.5d |

**Phase 4 可验收成果：**
- [x] 生产环境通过域名/IP 可访问
- [x] Nginx 反向代理正常工作
- [x] PM2 进程守护正常
- [x] 每日自动备份已配置

---

### 项目时间线总览

```
Week 1     Week 2     Week 3     Week 4
├──────────┼──────────┼──────────┼──────────
Phase 1    Phase 2    Phase 2    Phase 3    Phase 4
(基础框架)  (订单-后端) (订单-前端) (报表)    (部署)
                                           (缓冲期)
```

**预估总工时：** 20-26 人天（单人开发约 3-4 周）

> **建议：** 每天记录开发进度，每周做一次回顾。遇到阻塞项（如 ECharts 图表库配置、文件上传预览）及时记录，集中解决。

---

## 七、状态流转图

```
订单状态流转：
  待处理 → 生产中 → 已发货 → 已完成
     ↓
  已取消 (任何阶段可取消，但受规则约束)

开票状态流转：
  未开票 → 已开增值税专用发票
         → 已开普通发票
         → 无需开票（仅订单取消时自动触发）

收款状态流转：
  未收款 → 部分收款 → 已结清
         → 已结清（一次性付清时跳过部分收款）
```

---

## 八、组织架构调整建议

### 从 FlowCRM 到本项目的新建/改造文件清单

```
backend/src/
├── auth/                         # [保留] 适配 MySQL
├── common/
│   ├── json-storage.service.ts   # [保留] 作为历史数据导入工具
│   ├── interfaces.ts             # [修改] 更新所有接口定义
│   └── database/                 # [新增] TypeORM 配置 + 实体
│       ├── database.module.ts
│       └── entities/
│           ├── customer.entity.ts
│           ├── product.entity.ts
│           ├── order.entity.ts
│           └── order-item.entity.ts
├── customers/                    # [改造] 从 JSON 切换为 TypeORM
├── products/                     # [新增] 产品管理模块
├── orders/                       # [新增] 订单管理模块
├── reports/                      # [新增] 报表模块（替换原 statistics）
└── upload/                       # [新增] 文件上传模块

frontend/src/
├── views/
│   ├── Login.vue                 # [保留]
│   ├── Dashboard.vue             # [改造] 替换为经营概览
│   ├── Customers.vue             # [改造] 适配新字段
│   ├── Products.vue              # [新增] 产品管理页
│   ├── Orders.vue                # [新增] 订单列表页
│   ├── OrderDetail.vue           # [新增] 订单详情页
│   └── Reports.vue               # [新增] 报表页
└── router/
    └── index.ts                  # [修改] 更新路由表
```

---

## 九、验收标准

### 9.1 功能验收

| # | 验收项 | 通过条件 |
|---|--------|----------|
| 1 | 系统启动 | 前端页面正常加载，后端 API 健康检查通过 |
| 2 | 业务闭环 | 可完整执行"新建客户 → 新建产品 → 新建订单 → 变更状态 → 查看报表" |
| 3 | 状态流转 | 三种状态均可正常变更，关联规则正确触发 |
| 4 | 文件上传 | 支持上传/预览/删除图片和 PDF |
| 5 | 报表数据 | 报表数据与订单录入数据完全一致，无计算误差 |
| 6 | 报表导出 | 支持 CSV 导出，对账单支持 PDF 导出 |

### 9.2 性能验收

- 在 500 条客户 + 1000 条订单数据量下，所有列表查询 ≤ 500ms
- 报表生成 ≤ 1s

### 9.3 安全验收

- 备份脚本可正常执行，备份文件可正常恢复
- 删除客户/产品时有引用校验

---

## 十、后期扩展需求（优先级排序）

| 优先级 | 需求 | 说明 |
|--------|------|------|
| P1 | 采购管理 | 根据订单生成采购单 |
| P1 | 库存管理 | 产品入库/出库/库存预警 |
| P2 | 手机端适配 | 响应式 + PWA |
| P3 | 用户管理与细粒度权限 | 多用户角色权限控制 |
| P3 | 批量操作 | 批量更新状态、批量开票、批量导出 |

---

## 十一、风险登记册

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| FlowCRM 升级 NestJS v11 与现有依赖不兼容 | 中 | 高 | 锁定依赖版本，先跑通 demo 再改造 |
| MySQL 切换到 TypeORM 学习成本 | 中 | 中 | TypeORM 官方文档 + Claude Code 辅助 |
| 文件上传存储空间增长 | 高 | 低 | 限制单文件 ≤ 10MB，定期清理 |
| 单人开发周期超出预期 | 中 | 中 | MVP 优先，Phase 1-2 优先上线，Phase 3 延后 |

---

## 十二、附录

### 12.1 FlowCRM 项目相关链接

| 资源 | 链接 |
|------|------|
| FlowCRM 源码（二开版） | https://github.com/MrXujiang/FlowCRM |
| NO-CRM 编译版 | https://github.com/MrXujiang/NO-CRM |
| 项目说明文档 | https://blog.csdn.net/KlausLily/article/details/155347026 |
| 技术栈文档 | NestJS 11.x / Vue 3.5 / TypeORM |

### 12.2 初始账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin@no-crm.com（默认） | 部署后配置 |
