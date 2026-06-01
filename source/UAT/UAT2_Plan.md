# UAT Phase 2 改进修复计划

> 基于 UAT2.md 验收报告制定的改进方案，包含根因分析、修复方案、优先级和验收标准。

---

## 总体概要

| 模块 | 问题数量 | BUG | 优化 | 预估工时 |
|------|---------|:---:|:----:|:--------:|
| 客户管理 | 1 | 0 | 1 | 0.5h |
| 产品管理 | 1 | 0 | 1 | 0.5h |
| 订单管理 | 9 | 2 | 7 | 6h |
| 报表中心 | 1 | 1 | 0 | 2h |
| **合计** | **12** | **3** | **9** | **9h** |

---

## 一、客户管理

### 1.1 备注内容保留多行格式

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐ 中 |
| **预估工时** | 0.5h |

**问题描述：** 新增客户时备注使用多行文本输入（`<t-textarea :rows="3" />`），但在查看/编辑详情页中，`{{ viewingCustomer.remark }}` 以纯文本方式渲染，所有换行符被忽略，多行内容合并为单行展示。

**根因分析：** `Customers.vue` 详情 Dialog（第 96 行）使用 Vue 文本插值 `{{ viewingCustomer.remark || '-' }}` 渲染备注。Vue 的 `{{ }}` 插值会对 HTML 转义，且不会将 `\n` 渲染为换行。数据库存储的 `\n` 字符在 HTML 中仅显示为空格。

**修复方案：**

| 方案 | 说明 | 推荐 |
|------|------|:----:|
| A. `white-space: pre-line` | 在备注 span 上添加 CSS `style="white-space: pre-line;"`，保留换行但自动合并多余空格 | ✅ 推荐，安全简单 |
| B. `<br>` 替换 | 将 `\n` 替换为 `<br>` 并用 `v-html` 渲染 | ❌ 有 XSS 风险 |

**涉及文件：**
- `source/frontend/src/views/Customers.vue` — 详情 Dialog 备注展示处

**验收标准：**
- [ ] 新增客户时输入多行备注（含空行），详情页保留输入的换行格式
- [ ] 编辑客户后再次查看，备注换行依然保留

---

## 二、产品管理

### 2.1 产品列表支持表头点击排序

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐ 中 |
| **预估工时** | 0.5h |

**问题描述：** 产品列表需要支持按表头字段点击排序（如按名称升序/降序）。

**现状分析：** 已有排序功能（4 列支持 `sorter: true`），后端也支持 `sortField` 和 `sortOrder` 参数。对比 `Orders.vue` 的排序通过 `handleSortChange` 事件触发，且 `Orders.vue` 设置 `sorter: true` 时同时传入 `sortOnClickDriven: true`。

**对比 Orders.vue 的排序实现：**
```
Orders.vue:  `sorter: true` + TTable `@sort-change="handleSortChange"`
Products.vue: `sorter: true` + TTable `@sort-change="handleSortChange"`
```
两者实现一致，当前已可点击表头排序。需要 **验证功能是否正常**。

**涉及文件：**
- `source/frontend/src/views/Products.vue` — 确认排序事件绑定（第 113-118 行 `@sort-change`）

**验收标准：**
- [ ] 点击"名称"列头，产品按名称升序/降序切换
- [ ] 点击"规格"、"默认价格"、"状态"列头，均可排序
- [ ] 排序后分页重置为第 1 页

---

## 三、订单管理

### 3.1 订单列表开票状态展示优化

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐⭐ 高 |
| **预估工时** | 0.5h |

**问题描述（3 个子问题）：**
1. "未开票"状态未高亮显示（`default` 主题不明显）
2. 开票状态文字太长（"已开增值税专用发票" 11 个字），列宽 400px 占用过多空间
3. 操作列应显示在第 1 列，订单编号移至最后

**根因分析：**
- 开票状态使用 `StatusBar` 组件渲染，"未开票"映射为 `default` theme，在 StatusBar 中仅显示为普通文本无高亮背景
- 状态值"已开增值税专用发票"有 11 个中文字符，导致列宽巨大
- 列顺序由 `Orders.vue` 的 columns 数组顺序决定

**修改方案：**

**步骤 1 — 简化开票状态值（涉及前后端）**
| 旧值 | 新值 |
|------|------|
| 未开票 | 未开票（不变） |
| 已开增值税专用发票 | 已开专票 |
| 已开普通发票 | 已开普票 |
| 无需开票 | **删除此状态** |

> ⚠️ **涉及前后端修改：** 状态值是业务数据，存储在数据库 `orders.invoiceStatus` 字段中。删除"无需开票"状态意味着：
> - 前端列表页过滤掉此选项
> - 后端状态校验逻辑需同步
> - 数据库中已有数据的兼容处理

**步骤 2 — "未开票"高亮**
- `Orders.vue` 中为 `invoiceStatus` 列传自定义 theme 映射：
  ```typescript
  const invoiceStatusThemeMap: Record<string, string> = {
    '未开票': 'warning',  // 黄色高亮
    '已开专票': 'success',
    '已开普票': 'success',
  }
  ```

**步骤 3 — 表格列顺序调整**
- columns 数组中将 `action` 移到第 1 位，`code` 移到最后
- 调整列宽适配

**涉及文件：**
- `source/frontend/src/views/Orders.vue` — columns 定义、StatusBar theme map
- `source/frontend/src/components/StatusBar.vue` — 确认 default theme 渲染逻辑
- `source/backend/src/orders/orders.service.ts` — 状态值校验常量
- `source/backend/src/orders/dto/order.dto.ts` — 状态值枚举校验

**验收标准：**
- [ ] 开票状态列显示为"未开票"、"已开专票"、"已开普票"三项
- [ ] "未开票"以 warning 颜色高亮
- [ ] 操作列在表格第 1 列，订单编号在最后 1 列

---

### 3.2 新建订单 — 产品名称选择后显示为空（BUG）

| 项 | 内容 |
|---|------|
| **类型** | BUG |
| **优先级** | ⭐⭐⭐ 紧急 |
| **预估工时** | 0.5h |

**问题描述：** 新建订单时，从产品下拉列表选中一个产品后，下拉框显示为空（回到 placeholder "选择产品"），但单价和规格已自动填充。

**根因分析：** `OrderForm.vue` `handleProductSelect` 函数（第 181-188 行）设置了 `productName`、`productSpec`、`unitPrice`，但 **遗漏了最关键的一行** — 没有设置 `productId`。

```typescript
// 当前代码（缺少 productId 赋值）
function handleProductSelect(productId: number, rowIndex: number) {
  const p = products.value.find(p => p.id === productId)
  if (p) {
    formData.items[rowIndex].productName = p.name
    formData.items[rowIndex].productSpec = p.spec || ''
    formData.items[rowIndex].unitPrice = Number(p.defaultPrice) || 0
    // 缺少: formData.items[rowIndex].productId = productId  ← 这就是 BUG
  }
}
```

`<t-select>` 的 `:value` 绑定到 `formData.items[rowIndex].productId`，由于 `productId` 始终为 `undefined`，`t-select` 找不到匹配项，回退显示 placeholder。

**修复方案：** 在 `handleProductSelect` 中添加一行 `formData.items[rowIndex].productId = productId`

**涉及文件：**
- `source/frontend/src/views/OrderForm.vue` — `handleProductSelect` 函数（第 181 行附近）
- `source/frontend/src/api/order.ts` — 确认 `OrderItem` 接口包含 `productId`

**验收标准：**
- [ ] 新建订单时，从下拉列表选择产品后，下拉框正确显示选中的产品名称
- [ ] 切换不同产品，名称/规格/单价联动正确
- [ ] 编辑订单时，已有产品名称正确回显

---

### 3.3 删除单价和数量输入框的 +/- 按钮

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐ 中 |
| **预估工时** | 0.5h |

**问题描述：** 单价和数量输入框使用 `t-input-number` 组件，默认带 +/- 步进按钮，UAT 要求删除这两个按钮，由客户直接输入数值。

**根因分析：** `OrderForm.vue` 第 88-106 行使用 `<t-input-number>` 组件，该组件默认显示 stepper buttons。

**修复方案：** 将 `<t-input-number>` 替换为 `<t-input>`，设置 `type="number"` 以保持数字输入体验：

```html
<!-- 改前 -->
<t-input-number v-model="formData.items[rowIndex].unitPrice" :min="0" :decimal-places="2" style="width: 120px" />

<!-- 改后 -->
<t-input v-model="formData.items[rowIndex].unitPrice" type="number" style="width: 200px" />
```

> 注意：使用 `t-input type="number"` 替代 `t-input-number` 后，需要手动处理小数位数（单价保留 2 位小数，数量为整数）。

**涉及文件：**
- `source/frontend/src/views/OrderForm.vue` — 单价和数量输入组件

**验收标准：**
- [ ] 单价和数量输入框无 +/- 按钮
- [ ] 只能输入数字，单价支持小数（2 位），数量只支持整数
- [ ] 单价 ≥ 0，数量 ≥ 1

---

### 3.4 输入框宽度至少显示 12 位数据

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐ 中 |
| **预估工时** | 0.5h |

**问题描述：** 单价输入框 120px、数量输入框 140px 仅能显示约 4-5 位数字，UAT 要求至少显示 12 位数据。

**根因分析：** `OrderForm.vue` 行内样式 `style="width: 120px"` 和 `style="width: 140px"` 限制过窄。

**修复方案：** 将宽度扩大至 220px：

```html
<!-- 单价 -->
<t-input v-model="..." type="number" style="width: 220px" />

<!-- 数量 -->
<t-input v-model="..." type="number" style="width: 220px" />
```

**涉及文件：**
- `source/frontend/src/views/OrderForm.vue` — 单价/数量输入框宽度样式

**验收标准：**
- [ ] 单价输入框可完整显示 99999999.99 等 12 位数值
- [ ] 数量输入框可完整显示 999999999999 等 12 位整数

---

### 3.5 订单详情页 — 允许自由选择任何状态

| 项 | 内容 |
|---|------|
| **类型** | 优化（业务逻辑变更） |
| **优先级** | ⭐⭐⭐ 高 |
| **预估工时** | 1.5h |

**问题描述：** 当前订单状态只能顺序流转（待处理→生产中→已发货→已完成），UAT 要求允许用户随时选中任何状态（自由跳转）。

**现状分析：** 前后端均强制顺序流转：

- **前端** `OrderDetail.vue`（第 407-428 行）：`orderStatusActions` computed 属性定义各状态的下一步白名单
- **后端** `orders.service.ts`（第 203-243 行）：`ORDER_STATUS_FLOW` 数组索引比较 `newIdx <= currentIdx` 时拒绝

**修复方案：**

**前端修改（OrderDetail.vue）：** 将 `orderStatusActions` 改为返回所有有效状态（移除顺序约束），仅保留取消的约束：

```typescript
const orderStatusActions = computed(() => {
  const current = order.value?.orderStatus || ''
  // 所有状态均可用（自由选择）
  const allAvailable = allStatuses.filter(s => s !== current)
  // 已取消和已完成是终态，不可再变更
  if (['已完成', '已取消'].includes(current)) return []
  // 已开票的订单不可取消（保留约束）
  const invoiceStatus = order.value?.invoiceStatus || ''
  if (current !== '已取消' && invoiceStatus.includes('已开')) {
    return allAvailable.filter(s => s !== '已取消')
  }
  return allAvailable
})
```

**后端修改（orders.service.ts）：** 移除 `ORDER_STATUS_FLOW` 索引比较，改用白名单校验：

```typescript
// 移除: newIdx <= currentIdx 的禁止
// 改为: 校验新状态是有效状态值
const VALID_ORDER_STATUSES = ['待处理', '生产中', '已发货', '已完成', '已取消'];
if (!VALID_ORDER_STATUSES.includes(newStatus)) {
  throw new BadRequestException('无效的订单状态');
}
```

**涉及文件：**
- `source/frontend/src/views/OrderDetail.vue` — `orderStatusActions` computed
- `source/backend/src/orders/orders.service.ts` — `changeOrderStatus` 方法
- `source/backend/src/orders/orders.service.ts` — `update` 方法中的状态更改限制（第 158-163 行也需同步）

**验收标准：**
- [ ] 订单状态可从"待处理"直接跳转到"已完成"
- [ ] 已取消/已完成是终态，不可再变更
- [ ] 已开票的订单不能取消（保留约束）
- [ ] 状态变更后状态日志正确记录

---

### 3.6 允许多次部分收款

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐⭐ 高 |
| **预估工时** | 1h |

**问题描述：** 执行一次"部分收款"后，"部分收款"按钮消失，只能选择"已结清"。UAT 要求允许多次部分收款（如分 3 次收款）。

**根因分析：** `OrderDetail.vue`（第 450-469 行）的 `paymentStatusActions` 中，当当前状态为 `'部分收款'` 时，只有 `'已结清'` 按钮，没有"追加收款"按钮。实际上后端已支持追加收款记录（`paymentRecords` 数组 append 逻辑）。

**修复方案：** 在"部分收款"状态下新增"追加收款"按钮，且"追加收款"后的 Dialog 应复用部分收款逻辑：

```typescript
const paymentStatusActions = computed(() => {
  const current = order.value?.paymentStatus || ''
  const btns: { label: string; value: string }[] = []
  if (current === '未收款') {
    btns.push({ label: '部分收款', value: '部分收款' })
    btns.push({ label: '已结清', value: '已结清' })
  } else if (current === '部分收款') {
    btns.push({ label: '追加收款', value: '部分收款' })  // ← 新增，实际仍调部分收款逻辑
    btns.push({ label: '已结清', value: '已结清' })
  }
  return btns
})
```

**涉及文件：**
- `source/frontend/src/views/OrderDetail.vue` — `paymentStatusActions` 和收款 Dialog

**验收标准：**
- [ ] "部分收款"状态时可点击"追加收款"继续录入收款
- [ ] 每次收款记录独立保存在 `paymentRecords` 中
- [ ] 已收总金额 = 所有收款记录之和
- [ ] 已结清时总金额 ≥ 订单总金额

---

### 3.7 部分收款时显示订单总金额和未收款金额

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐⭐ 高 |
| **预估工时** | 0.5h |

**问题描述：** 进行部分收款操作时，Dialog 中没有显示订单总金额和未收款金额，用户不知道应该收多少。

**修复方案：** 在收款 Dialog 中（`OrderDetail.vue`），在"本次收款金额"输入框上方添加显示信息：

```html
<!-- 在 Dialog body 中增加 -->
<div class="payment-summary">
  <span>订单总金额：<strong>{{ order?.totalAmount }}</strong> 元</span>
  <span>已收金额：<strong>{{ totalReceived }}</strong> 元</span>
  <span>未收金额：<strong style="color: #e34d59">{{ (order?.totalAmount || 0) - totalReceived }}</strong> 元</span>
</div>
```

**涉及文件：**
- `source/frontend/src/views/OrderDetail.vue` — 收款 Dialog

**验收标准：**
- [ ] 弹出收款 Dialog 时显示订单总金额、已收金额、未收金额
- [ ] 金额数字格式正确（保留 2 位小数）
- [ ] 多次收款时未收金额实时递减

---

### 3.8 "未开票"状态时可变更开票要求

| 项 | 内容 |
|---|------|
| **类型** | 优化 |
| **优先级** | ⭐⭐⭐ 高 |
| **预估工时** | 1h |

**问题描述：** 当前"开票要求"只能在新建/编辑订单时（`OrderForm.vue`）设置，在详情页中只读展示。UAT 要求在"未开票"状态下允许从详情页变更开票要求（切换 3% 专票/普票/无需开票）。

**根因分析：** `OrderDetail.vue` 开票区域（第 60-80 行）仅展示 `invoiceRequirement` 字段值，没有操作按钮。`invoiceStatus` 的变更通过状态操作按钮完成，但 `invoiceRequirement` 本身不可在详情页修改。

**修复方案：** 在详情页开票信息卡片中，当 `invoiceStatus === '未开票'` 时，将 `invoiceRequirement` 改为可编辑的下拉选择：

```html
<!-- 开票要求显示区域 -->
<t-form-item label="开票要求">
  <template v-if="order.invoiceStatus === '未开票'">
    <t-select v-model="order.invoiceRequirement" style="width: 200px"
      @change="handleInvoiceRequirementChange">
      <t-option value="3%专票" label="3%专票" />
      <t-option value="普票" label="普票" />
      <t-option value="无需开票" label="无需开票" />
    </t-select>
  </template>
  <template v-else>
    <span>{{ order.invoiceRequirement || '-' }}</span>
  </template>
</t-form-item>
```

调用后端 `PATCH /orders/:id` 更新 `invoiceRequirement` 字段。

> ⚠️ **注意关联规则：** 根据状态关联规则，"未取消不允许设开票为'无需开票'"，所以在"无需开票"选项需要判断订单是否已取消。

**涉及文件：**
- `source/frontend/src/views/OrderDetail.vue` — 开票信息区域
- `source/backend/src/orders/orders.service.ts` — `update` 中对 `invoiceRequirement` 的校验

**验收标准：**
- [ ] "未开票"状态时，开票要求显示为下拉框可编辑
- [ ] 选择"3%专票"/"普票"后即时保存
- [ ] 订单未取消时，"无需开票"选项不可用（或显示提示）
- [ ] 已开票后开票要求恢复只读展示

---

### 3.9 PNG 图片上传返回 400 Bad Request（BUG）

| 项 | 内容 |
|---|------|
| **类型** | BUG |
| **优先级** | ⭐⭐⭐ 紧急 |
| **预估工时** | 1h |

**问题描述：** 上传 PNG 文件时后端返回 400 Bad Request，JPG 和 PDF 正常。

**根因分析：** `Upload Controller` 第 41-48 行的 `fileFilter` 显式允许 `.png` 扩展名，文件过滤本身不会拒绝 PNG。最可能的根因是 **`main.ts` 中全局 `ValidationPipe` 干扰 `@UploadedFile()` 参数解析**：

```typescript
// main.ts 第 17 行
app.useGlobalPipes(new ValidationPipe());
```

默认 `ValidationPipe` 在 NestJS v9+ 中会对所有 controller 参数进行隐式转换/校验，而 `@UploadedFile()` 返回的 `Express.Multer.File` 对象不含 class-validator 元数据，可能导致 `ValidationPipe` 抛出 400。

此外，需排查 **Multer 文件名编码问题**：PNG 文件名可能包含非 ASCII 字符，导致 `extname()` 解析异常。

**修复方案（分步排查）：**

**步骤 1 — main.ts 增加 ValidationPipe 配置：**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
}));
```

**步骤 2 — 上传 Controller 增加 `@UsePipes()` 跳过校验：**
```typescript
import { UsePipes } from '@nestjs/common';

@Post(':id/attachments')
@UseInterceptors(FileInterceptor('file', { ... }))
@UsePipes(new ValidationPipe({ skipMissingProperties: true }))  // 或跳过
async uploadAttachment(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
```

**步骤 3 — 增强服务器端日志：** 在 fileFilter callback 中添加 `console.log` 记录被拒绝的文件名、扩展名和 MIME 类型，便于精确排查。

**涉及文件：**
- `source/backend/src/main.ts` — 全局 ValidationPipe 配置
- `source/backend/src/upload/upload.controller.ts` — FileInterceptor + fileFilter
- `source/backend/src/orders/orders.controller.ts` — 附件上传端点（如有独立配置）

**验收标准：**
- [ ] PNG 文件（含中文文件名）上传成功，返回 201
- [ ] JPG/PDF 上传保持正常工作
- [ ] 超过 10MB 的文件正确返回 400 及提示信息
- [ ] 非允许类型文件正确返回 400

---

## 四、报表中心

### 4.1 客户对账单 PDF 导出文件损坏（BUG）

| 项 | 内容 |
|---|------|
| **类型** | BUG |
| **优先级** | ⭐⭐⭐ 紧急 |
| **预估工时** | 2h |

**问题描述：** 导出 PDF 对账单后，下载的文件无法打开，Adobe Acrobat Reader 报 "could not open ... because it is either not a supported file type or because the file has been damaged"。

**根因分析：** `reports.service.ts` 使用 `pdfkit` 生成 PDF，所有 `.text()` 调用均使用内置 **Helvetica / Helvetica-Bold** 字体。这些字体 **不包含 CJK（中文、日文、韩文）字形**。当 `.text()` 写入中文字符串时，pdfkit 无法找到对应字形，生成的 PDF 文件流中有缺失/错误的字体数据，导致 PDF 结构损坏，阅读器无法打开。

具体涉及的中文文本（`reports.service.ts` 第 263-330 行）：
- 标题："对 账 单"
- 客户信息：`客户名称：${customer.name}`、`客户编号：${customer.code}` 等
- 汇总数据：`订单总数：${orders.length} 单`、`累计消费：${...}` 等
- 订单明细：各字段中文表头、订单状态值
- 页脚：`—— 本对账单由 MyCRM 系统自动生成 ——`

**修复方案（选其一）：**

| 方案 | 说明 | 推荐 |
|------|------|:----:|
| **A. 注册中文字体** | 下载 Noto Sans SC .ttf 字体，用 `doc.registerFont()` 注册后使用 | ✅ 推荐，pdfkit 原生方案 |
| **B. 改用 puppeteer** | HTML 模板 + puppeteer 转 PDF，原生支持中文 | ❌ 新增依赖过重 |

**方案 A 详细步骤：**

1. **下载中文字体文件**：从 Google Fonts 或阿里巴巴普惠字体下载 `.ttf` 字体文件，放入 `source/backend/assets/fonts/`
2. **在 `reports.service.ts` 中注册字体**：
   ```typescript
   const fontPath = join(__dirname, '../../assets/fonts/NotoSansSC-Regular.ttf');
   const fontBoldPath = join(__dirname, '../../assets/fonts/NotoSansSC-Bold.ttf');
   doc.registerFont('NotoSansSC', fontPath);
   doc.registerFont('NotoSansSC-Bold', fontBoldPath);
   ```
3. **替换所有 `.font()` 调用**：
   ```typescript
   // 改前
   doc.font('Helvetica-Bold').text('对 账 单', ...)
   // 改后
   doc.font('NotoSansSC-Bold').text('对 账 单', ...)
   ```
4. **处理字体文件版权**：Noto Sans SC 使用 SIL Open Font License，可免费商用

**涉及文件：**
- `source/backend/src/reports/reports.service.ts` — PDF 生成逻辑
- `source/backend/assets/fonts/` — 新建目录，存放 .ttf 字体文件

**验收标准：**
- [ ] 导出客户对账单 PDF，用 Adobe Acrobat Reader 可正常打开
- [ ] PDF 中所有中文（标题、客户信息、订单明细）正确渲染，无乱码/方框
- [ ] PDF 格式正确，页面布局完整
- [ ] 导出文件名包含正确日期和客户信息

---

## 五、修复执行计划

### 执行顺序建议

| 顺序 | 任务编号 | 原因 |
|:----:|----------|------|
| 🥇 | 4.1 PDF 损坏 | 阻塞 UAT 核心验收流程 |
| 🥇 | 3.2 产品选择为空 | 阻塞新建订单核心功能 |
| 🥇 | 3.9 PNG 上传 400 | 阻塞附件上传功能 |
| 🥈 | 3.5 自由状态选择 | 业务逻辑变更，涉及前后端 |
| 🥈 | 3.6 多次部分收款 | 业务逻辑变更，前端为主 |
| 🥈 | 3.7 显示金额信息 | 体验优化，配合 3.6 |
| 🥈 | 3.8 未开票可变更 | 业务功能增强 |
| 🥉 | 3.1 状态展示优化 | UI 调整 |
| 🥉 | 3.3/3.4 输入框优化 | UI 调整 |
| 🥉 | 1.1 备注多行展示 | UI 微调 |
| 🥉 | 2.1 产品列表排序 | 验证即可 |

### 回归测试清单

修复完成后需执行以下回归测试：
- [ ] 新建客户 → 新建产品 → 新建订单 → 订单全流程状态变更 → 报表查看 （核心闭环）
- [ ] PNG/JPG/PDF 文件上传和预览
- [ ] PDF 对账单导出并验证文件可打开
- [ ] 部分收款 → 追加收款 → 已结清 全流程
- [ ] 状态日志正确记录每次变更

---

*文档版本：v1.0 | 编写日期：2026-06-01 | 基于 UAT2.md 验收报告*
