# UAT 第 4 轮修复计划

> 基于 [UAT4.md](UAT4.md) 提出的 2 项优化需求，分析和修复计划。

---

## 分析

### 问题 1：新建订单按钮文本

**问题：** 新建订单页面底部提交按钮显示"创建订单"，与编辑模式下的"保存修改"不一致。

**分析：**
- 文件：`source/frontend/src/views/OrderForm.vue:179`
- 代码：`{{ isEdit ? '保存修改' : '创建订单' }}`
- 新建模式下仅需显示"保存"即可，简洁统一

**修复方案：** 将 `'创建订单'` 改为 `'保存'`。

### 问题 2：PDF 对账单订单编号

**问题：** 对账单 PDF 中订单明细显示的 `订单: ORD-20260601-0001` 是系统内部编号，对客户无意义，应显示客户单号 `customerOrderNo`。

**分析：**
- 文件：`source/backend/src/reports/reports.service.ts:311`
- 代码：`订单: ${order.code}`
- `exportPdf()` 方法通过 `this.orderRepository.find()` 查询完整 Order 实体（含 `customerOrderNo` 字段）
- 部分订单可能没有 `customerOrderNo`（历史数据为空），需降级显示 `code`

**修复方案：** 将 `order.code` 改为 `order.customerOrderNo || order.code`，优先显示客户单号，无客户单号时回退显示内部编号。

---

## 执行计划

| 编号 | 文件 | 修改内容 | 类型 |
|:----:|------|---------|:----:|
| 1 | [OrderForm.vue](../../source/frontend/src/views/OrderForm.vue#L179) | `创建订单` → `保存` | UI 文本 |
| 2 | [reports.service.ts](../../source/backend/src/reports/reports.service.ts#L311) | `order.code` → `order.customerOrderNo \|\| order.code` | PDF 内容 |

**影响范围：** 前端 1 文件 + 后端 1 文件，无需数据库变更，无需新增依赖。

**验证方式：**
1. 新建订单页面打开，确认按钮显示"保存"而非"创建订单"
2. 客户对账单导出 PDF，确认订单编号列显示为客户单号
