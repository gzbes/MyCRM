# UAT 第 3 轮 — 分析与修复计划

> **基于** [UAT3.md](UAT3.md)
> **日期：** 2026-06-01
> **分析范围：** 产品管理 3 项 + 客户管理 4 项 + 订单管理 11 项 = **18 项变更**

---

## 一、变更规模总览

| 类别 | 数量 | 后端实体 | 后端DTO | 后端Service | 后端Controller | 前端 API | 前端 View |
|------|:----:|:--------:|:--------:|:-----------:|:--------------:|:--------:|:----------|
| 产品管理 | 3 | — | — | — | — | — | Products.vue |
| 客户管理 | 4 | customer.entity.ts | customer.dto.ts | customers.service.ts | — | customer.ts | Customers.vue, Reports.vue |
| 订单管理 | 11 | order.entity.ts, order-item.entity.ts | order.dto.ts | orders.service.ts | orders.controller.ts | order.ts | Orders.vue, OrderDetail.vue, OrderForm.vue, Reports.vue |
| **合计** | **18** | **4** | **3** | **2** | **1** | **2** | **7** |

---

## 二、逐项分析与实现方案

### 2.1 产品管理（3 项）

| 编号 | 需求 | 影响范围 | 实现方案 |
|:----:|------|---------|---------|
| P1 | "名称"改为"货物规格"、"规格"改为"单位" | Products.vue | 纯 UI 标签修改：表头列名 + 对话框表单 label + 搜索框 placeholder。**实体字段名不变**（name/spec 内部语义保留）。 |
| P2 | 默认单价取消 +/- 按钮，输入框至少显示 12 位 | Products.vue | 现有代码使用 `<t-input-number decimal-places="2">` → 改为 `<t-input-number :theme="'normal'" hide-button>` 或 `<t-input>`。设置宽度 `240px` + `style="max-width: 280px"` 确保 12 位显示。 |

### 2.2 客户管理（4 项）

| 编号 | 需求 | 影响范围 | 实现方案 |
|:----:|------|---------|---------|
| C1 | 内部`编号`(code)不再显示在前端 | Customers.vue, Reports.vue, reports.service.ts | ① Customers.vue: 表格列移除`code`；详情对话框移除 code 行。② Reports.vue: 客户对账单 tab 中隐藏 code 列。③ reports.service.ts: CSV"客户编号"列改为 `customerCode`(新字段)，PDF 对账单"客户编号"行改为新字段。 |
| C2 | 新增"客户编码"(customerCode)，可编辑，显示在列表/详情/报表 | **Entity + DTO + Service + Frontend + Reports** | ① `customer.entity.ts`: 新增 `customerCode varchar(100) nullable`。② `customer.dto.ts`: CreateCustomerDto + UpdateCustomerDto 加 `customerCode?`。③ `customers.service.ts`: 无需特殊逻辑。④ Customers.vue: 表格新增列、编辑对话框新增输入框、详情对话框展示。⑤ Reports.vue + reports.service.ts: 用 customerCode 替换 code。 |
| C3 | 新增"付款方式"(paymentMethod)，可编辑，显示在列表/详情/报表 | **Entity + DTO + Service + Frontend + OrderForm** | ① `customer.entity.ts`: 新增 `paymentMethod varchar(50) nullable`。② DTO 同步更新。③ Customers.vue: 表格列、编辑框、详情框。④ Orders.vue: 列表新增列。⑤ OrderForm.vue: 客户选择后自动带出该字段。 |
| C4 | 新增"送货地址"(deliveryAddresses)，允许多个，仅详情页 | **Entity + Frontend** | ① `customer.entity.ts`: 新增 `deliveryAddresses json nullable` (数组如 `[{address, contact, phone, isDefault}]`)。② Customers.vue: 详情对话框新增地址列表模块（支持添加/编辑/删除/设为默认）。③ OrderForm.vue: 选择客户后，默认地址自动填入。 |

### 2.3 订单管理（11 项）

| 编号 | 需求 | 影响范围 | 实现方案 |
|:----:|------|---------|---------|
| O1 | 内部`订单编号`(code)不再显示在前端 | Orders.vue, OrderDetail.vue, Reports.vue, reports.service.ts | ① Orders.vue: 表格移除 code 列（有序号列替代）。② OrderDetail.vue: 订单头部移除 code 显示。③ Reports.vue: 报表隐藏 code。④ reports.service.ts: PDF/CSV 中订单编号改用更有意义的标识。 |
| O2 | 新增"客户单号"(customerOrderNo)，可编辑 | **Entity + DTO + Service + Frontend(3)** | ① `order.entity.ts`: 新增 `customerOrderNo varchar(100) nullable`。② `order.dto.ts`: CreateOrderDto + UpdateOrderDto 加 `customerOrderNo?`。③ `orders.service.ts`: create/update 传递新字段。④ OrderForm.vue: 新增输入框。⑤ OrderDetail.vue: 展示。⑥ Orders.vue: 列表列。 |
| O3 | 新增"订单交期"(deliveryDate)，可编辑日期 | **Entity + DTO + Service + Frontend(2)** | ① `order.entity.ts`: 新增 `deliveryDate date nullable`。② DTO 同步更新。③ Service 传递。④ OrderForm.vue: 日期选择器。⑤ Orders.vue: 列表列。 |
| O4 | "送货地址"从客户带出默认地址，可编辑 | **Order entity + OrderForm.vue** | ① `order.entity.ts`: 新增 `deliveryAddress varchar(255) nullable`（当前订单选用的地址快照）。② OrderForm.vue: 选择客户后自动填入客户默认送货地址；允许修改。③ OrderDetail.vue: 展示送货地址。 |
| O5 | "付款方式"从客户带出，可编辑 | **Order entity + OrderForm.vue + OrderDetail.vue** | 注意：Order 实体已有 `paymentMethod` 字段（最近收款方式），但语义不同。建议新增 `orderPaymentMethod varchar(50) nullable` 用于"订单约定的付款方式"。① Entity 新增字段。② DTO 同步。③ OrderForm: 客户选择后带出，可修改。④ OrderDetail: 展示/编辑。⑤ Orders.vue: 列表列。 |
| O6 | 订单明细每行增加"客户货物编码"(customerProductCode) | **OrderItem entity + DTO + Service + Frontend(2)** | ① `order-item.entity.ts`: 新增 `customerProductCode varchar(100) nullable`（快照字段）。② `order.dto.ts`: OrderItemDto 加 `customerProductCode?`。③ Service: create/update 传递。④ OrderForm.vue: 明细行新增输入框。⑤ OrderDetail.vue: 表格新增列。 |
| O7 | 详情页增加发货信息模块(实际交期/地址/运费)，可添加多条 | **Order entity + OrderDetail.vue** | ① `order.entity.ts`: 新增 `deliveries json nullable` 数组 `[{actualDeliveryDate, deliveryAddress, freight}]`。② OrderDetail.vue: 新增"发货信息"区块，表格或卡片形式，支持添加/编辑/删除行。 |
| O8 | 列表中"订单状态/开票状态/收款状态"改为下拉菜单模式 | **Orders.vue** | **重大 UI 变更：** 将 StatusBar 标签替换为 `<t-select>` 下拉框，选项为对应状态的可选值。选择后直接调用 `changeStatus` API 进行状态变更。需处理：① 订单状态排除终态。② 开票状态按规则过滤（仅未开票时才可切换）。③ 状态变更后刷新行数据。④ 需要有操作确认或即时生效。 |
| O9 | 列表新增列：客户单号、订单交期、实际交期、付款方式、已收金额 | **Orders.vue** | 新增 5 列到表格定义中。实际交期取 deliverie s 数组中最新的 `actualDeliveryDate`。 |
| O10 | 操作列"查看"改为"编辑" | **Orders.vue** | 按钮文字"查看"→"编辑"。点击后导航到 OrderForm 编辑模式（原"查看"导航到 OrderDetail，改为跳转 `router.push('/orders/edit/' + row.id)`）。 |
| O11 | 列顺序调整 | **Orders.vue** | 调整为：操作、客户、客户单号、下单日期、订单交期、付款方式、总金额、订单状态、开票状态、收款状态、实际交期、已收金额 |

---

## 三、实施步骤（按依赖关系排序）

### Phase U3-A: 后端实体与 DTO 变更（数据层）

**涉及文件：**
- [source/backend/src/common/database/entities/customer.entity.ts](source/backend/src/common/database/entities/customer.entity.ts) — 新增 `customerCode`, `paymentMethod`, `deliveryAddresses`
- [source/backend/src/common/database/entities/order.entity.ts](source/backend/src/common/database/entities/order.entity.ts) — 新增 `customerOrderNo`, `deliveryDate`, `deliveryAddress`, `orderPaymentMethod`, `deliveries`
- [source/backend/src/common/database/entities/order-item.entity.ts](source/backend/src/common/database/entities/order-item.entity.ts) — 新增 `customerProductCode`

**变更内容（所有新增字段均为 nullable，不影响已有数据）：**

```typescript
// customer.entity.ts 新增
@Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: '客户编码' })
customerCode: string;

@Column({ type: 'varchar', length: 50, nullable: true, default: null, comment: '默认付款方式' })
paymentMethod: string;

@Column({ type: 'json', nullable: true, default: null, comment: '送货地址列表 [{address, contact, phone, isDefault}]' })
deliveryAddresses: { address: string; contact: string; phone: string; isDefault: boolean }[];
```

```typescript
// order.entity.ts 新增
@Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: '客户单号' })
customerOrderNo: string;

@Column({ name: 'delivery_date', type: 'date', nullable: true, default: null, comment: '订单交期' })
deliveryDate: string;

@Column({ type: 'varchar', length: 255, nullable: true, default: null, comment: '送货地址(当前订单)' })
deliveryAddress: string;

@Column({ type: 'varchar', length: 50, nullable: true, default: null, comment: '订单付款方式' })
orderPaymentMethod: string;

@Column({ type: 'json', nullable: true, default: null, comment: '发货信息 [{actualDeliveryDate, deliveryAddress, freight}]' })
deliveries: { actualDeliveryDate: string; deliveryAddress: string; freight: number }[];
```

```typescript
// order-item.entity.ts 新增
@Column({ type: 'varchar', length: 100, nullable: true, default: null, comment: '客户货物编码' })
customerProductCode: string;
```

### Phase U3-B: 后端 DTO 与服务更新（业务层）

**涉及文件：**
- [source/backend/src/customers/dto/customer.dto.ts](source/backend/src/customers/dto/customer.dto.ts) — CreateCustomerDto + UpdateCustomerDto 添加 `customerCode`, `paymentMethod`, `deliveryAddresses`
- [source/backend/src/orders/dto/order.dto.ts](source/backend/src/orders/dto/order.dto.ts) — CreateOrderDto + UpdateOrderDto 添加 `customerOrderNo`, `deliveryDate`, `deliveryAddress`, `orderPaymentMethod`, `deliveries`；OrderItemDto 添加 `customerProductCode`
- [source/backend/src/orders/orders.service.ts](source/backend/src/orders/orders.service.ts) — create() 和 update() 中透传新增字段；findOne 返回字段自动包含
- [source/backend/src/orders/orders.controller.ts](source/backend/src/orders/orders.controller.ts) — 无需变更（已有泛型 DTO 处理）
- [source/backend/src/customers/customers.service.ts](source/backend/src/customers/customers.service.ts) — 无需变更（Object.assign 自动处理新字段）
- [source/backend/src/reports/reports.service.ts](source/backend/src/reports/reports.service.ts) — CSV/PDF 中 code 替换为 customerCode；order code 在 PDF 中保留作为内部标识

> **⚠️ DTO 注意事项：**
> - `deliveryAddresses` 和 `deliveries` 是 JSON 数组，前端传 string[] 或对象数组即可，无需特殊 DTO 校验（class-validator 的 `@IsArray()` + `@IsOptional()`）。
> - `orderPaymentMethod` 注意与已有的 `paymentMethod` 字段区分（已有的是"最近收款方式"）。

### Phase U3-C: 前端 API 层更新

**涉及文件：**
- [source/frontend/src/api/customer.ts](source/frontend/src/api/customer.ts) — CustomerData 接口新增 `customerCode`, `paymentMethod`, `deliveryAddresses`
- [source/frontend/src/api/order.ts](source/frontend/src/api/order.ts) — Order 接口新增 `customerOrderNo`, `deliveryDate`, `deliveryAddress`, `orderPaymentMethod`, `deliveries`；OrderItem 接口新增 `customerProductCode`
- [source/frontend/src/api/reports.ts](source/frontend/src/api/reports.ts) — 无需变更，报表接口返回字段由后端控制

### Phase U3-D: 产品管理 UI 修改

**涉及文件：**
- [source/frontend/src/views/Products.vue](source/frontend/src/views/Products.vue)

**变更内容：**
1. 表头列名：`名称` → `货物规格`，`规格` → `单位`
2. 对话框 label：`产品名称` → `货物规格`，`规格型号` → `单位`
3. 搜索 placeholder：`名称或规格` → `货物规格或单位`
4. 默认价格：`<t-input-number>` 添加 `:hide-button="true"` 或改用 `<t-input>`，宽度设为 `240px`

### Phase U3-E: 客户管理 UI 修改

**涉及文件：**
- [source/frontend/src/views/Customers.vue](source/frontend/src/views/Customers.vue)

**变更内容：**
1. 移除表格 `code` 列（序号用 ant-table 自带序号或 index 计算）
2. 新增 `customerCode` 列（可编辑）
3. 新增 `paymentMethod` 列（可编辑）
4. 详情对话框：移除 code 行，展示 customerCode + paymentMethod
5. 编辑对话框：新增 customerCode + paymentMethod 输入框
6. 详情对话框：新增"送货地址"模块，支持添加/编辑/删除多条地址

### Phase U3-F: 订单列表 UI 修改（最大变更）

**涉及文件：**
- [source/frontend/src/views/Orders.vue](source/frontend/src/views/Orders.vue)

**变更内容（逐项对应）：**

| 子项 | 变更 |
|:----:|------|
| O1 | 移除 code 列（表格列定义删除） |
| O2 | 新增 `customerOrderNo` 列 |
| O3 | 新增 `deliveryDate` 列 |
| O5 | 新增 `orderPaymentMethod` 列（显示"付款方式"） |
| O7 | 新增 `deliveries` 列 → 只取最新一条 `actualDeliveryDate`（显示"实际交期"） |
| O9 | 新增 `receivedAmount` 列（"已收金额"） |
| O8 | 三状态列由 StatusBar 标签改为 `<t-select>` 下拉框，选值后即时调用状态变更 API |
| O10 | 操作列按钮文字"查看"→"编辑"，路由改为 `/orders/edit/:id` |
| O11 | 列顺序调整为：操作、客户、客户单号、下单日期、订单交期、付款方式、总金额、订单状态、开票状态、收款状态、实际交期、已收金额 |

**新列顺序定义（伪代码）：**
```typescript
const columns = [
  { colKey: 'action', title: '操作', fixed: 'left', width: 120 },
  { colKey: 'customerName', title: '客户' },
  { colKey: 'customerOrderNo', title: '客户单号' },
  { colKey: 'orderDate', title: '下单日期' },
  { colKey: 'deliveryDate', title: '订单交期' },
  { colKey: 'orderPaymentMethod', title: '付款方式' },
  { colKey: 'totalAmount', title: '总金额', sortable: true },
  { colKey: 'orderStatus', title: '订单状态' },
  { colKey: 'invoiceStatus', title: '开票状态' },
  { colKey: 'paymentStatus', title: '收款状态' },
  { colKey: 'actualDeliveryDate', title: '实际交期' },
  { colKey: 'receivedAmount', title: '已收金额' },
];
```

**状态列下拉框方案（重要）：**
- `orderStatus` 列：渲染为 `<t-select>`，选项为 `['待处理','生产中','已发货','已完成','已取消']`，排除当前状态和终态规则
- `invoiceStatus` 列：渲染为 `<t-select>`，选项为 `['未开票','已开增值税专用发票','已开普通发票']`，根据当前状态过滤
- `paymentStatus` 列：渲染为 `<t-select>`，选项为 `['未收款','部分收款','已结清']`
- 选择后调用 `orderApi.changeStatus(id, { statusType, newStatus })`
- 成功 → 刷新行数据；失败 → 提示错误

### Phase U3-G: 订单表单 UI 修改

**涉及文件：**
- [source/frontend/src/views/OrderForm.vue](source/frontend/src/views/OrderForm.vue)

**变更内容：**
1. 新增"客户单号"输入框
2. 新增"订单交期"日期选择器
3. 新增"送货地址"输入框（选客户后自动带出，可修改）
4. 新增"付款方式"下拉框（选客户后自动带出，可修改）
5. 订单明细每行新增"客户货物编码"输入框

### Phase U3-H: 订单详情 UI 修改

**涉及文件：**
- [source/frontend/src/views/OrderDetail.vue](source/frontend/src/views/OrderDetail.vue)

**变更内容：**
1. 订单头部移除 `code` 显示
2. 展示 `customerOrderNo`、`deliveryDate`、`deliveryAddress`、`orderPaymentMethod`
3. 明细表格新增"客户货物编码"列
4. 新增"发货信息"模块（可添加多条），每条含：实际交期、送货地址、运费

### Phase U3-I: 报表适配

**涉及文件：**
- [source/frontend/src/views/Reports.vue](source/frontend/src/views/Reports.vue)
- [source/backend/src/reports/reports.service.ts](source/backend/src/reports/reports.service.ts)

**变更内容：**
1. Reports.vue: 客户对账单 Tab 中 code 改为 customerCode
2. reports.service.ts: CSV 导出表头"客户编号"改为 `customerCode` 字段；PDF 代码行改为 customerCode

---

## 四、实施优先级与时间预估

| 优先级 | Phase | 任务 | 预估工时 | 前置依赖 |
|:------:|:-----:|------|:--------:|:--------:|
| P0 | U3-A | 实体 + DTO 变更 | 1h | — |
| P0 | U3-B | 后端 Service 更新 | 0.5h | U3-A |
| P0 | U3-C | 前端 API 类型更新 | 0.25h | U3-A |
| P1 | U3-D | 产品管理 UI 修改 | 0.25h | — |
| P1 | U3-E | 客户管理 UI 修改 | 1.5h | U3-A, U3-C |
| P1 | U3-F | 订单列表 UI（含状态下拉菜单） | 2.5h | U3-A, U3-C |
| P1 | U3-G | 订单表单 UI | 1.5h | U3-A, U3-C |
| P1 | U3-H | 订单详情 UI | 1.5h | U3-A, U3-C |
| P2 | U3-I | 报表适配 | 0.5h | U3-A |
| — | **合计** | | **9.5h** | |

**实施顺序建议：** U3-A → U3-B → U3-C → {U3-D, U3-E, U3-F, U3-G, U3-H} 并行 → U3-I

---

## 五、关键风险与注意事项

### 5.1 数据库变更风险
- 所有新字段均为 `nullable` 或带默认值，**不破坏已有数据**
- TypeORM `synchronize: true` 会自动加列，无需手写 migration
- 部署到生产前需确认 MySQL 版本支持 JSON 列（8.0+ 原生支持）

### 5.2 状态下拉菜单风险（O8）
- **最大单点变更**：把只读 StatusBar 改为可交互的下拉框
- 需考虑：① 下拉选项的动态过滤（终态不可选）；② 操作确认（即时变更 vs 弹窗确认）；③ 错误回滚
- 建议方案：选择后立即弹 Popconfirm 确认 → 调 API → 刷新行

### 5.3 字段重命名风险
- Products 的 name/spec 只是 UI 标签变更，**不涉及数据库**
- 实体字段名不变，保持后端一致性

### 5.4 PDF/CSV 导出兼容
- `order.code` 在 PDF 中应保留为内部辅助标识，同时展示 `customerOrderNo`
- CSV 导出的客户编号列改为 `customerCode`

### 5.5 TypeScript 类型安全
- 更新所有接口类型定义在 API 层
- order 的 `deliveries` 和 customer 的 `deliveryAddresses` 前端用 `ref<any[]>([])` 宽松类型

---

## 六、验证清单

完成所有变更后，按以下清单逐一验证：

| 编号 | 验证项 | 涉及功能 |
|:----:|--------|---------|
| V1 | 产品列表显示"货物规格"和"单位" | P1 |
| V2 | 产品编辑对话框标签正确 | P1 |
| V3 | 产品默认价格无 +/- 按钮，宽度足够 12 位输入 | P2 |
| V4 | 客户列表无 `code` 列，有 `customerCode` 和 `paymentMethod` 列 | C1, C2, C3 |
| V5 | 客户详情显示 `customerCode`、`paymentMethod` 和多地址 | C2, C3, C4 |
| V6 | 客户编辑可修改 `customerCode`、`paymentMethod` | C2, C3 |
| V7 | 客户详情可添加/编辑/删除送货地址 | C4 |
| V8 | 订单列表无 `code` 列，列顺序符合要求 | O1, O11 |
| V9 | 订单列表显示客户单号、订单交期、实际交期、付款方式、已收金额 | O9 |
| V10 | 订单列表三状态下拉选择可正常变更状态 | O8 |
| V11 | 订单列表"查看"改为"编辑"，点击进入编辑页 | O10 |
| V12 | 新建订单时可输入客户单号、订单交期 | O2, O3 |
| V13 | 选客户后自动带出送货地址和付款方式 | O4, O5 |
| V14 | 订单明细每行可输入客户货物编码 | O6 |
| V15 | 订单详情展示客户单号、订单交期等信息 | O2, O3 |
| V16 | 订单详情发货信息可添加/编辑/删除多条 | O7 |
| V17 | 报表中客户编码正确展示（无内部 code） | C1, C2 |
| V18 | CSV/PDF 导出正确（客户 customerCode，无内部 code） | C1, C2, O1 |
