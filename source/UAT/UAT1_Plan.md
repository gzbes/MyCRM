# UAT1 修复计划

> 基于 [UAT1.md](UAT1.md) 发现的问题制定修复计划。
> 共 **17 项子任务**，按模块分组，预估总工时 **6-9 天**。
> 优先级：P0=阻塞（报表导出/附件上传），P1=高（功能缺失/逻辑问题），P2=中（UI 优化），P3=低（文案替换）

---

## 任务总览

| 模块 | 任务数 | 预估工时 | 优先级分布 |
|------|--------|---------|-----------|
| 品牌更名 | 1 | 0.5 天 | P3 |
| 客户管理 | 3 | 1.5 天 | P1×2, P2×1 |
| 产品管理 | 1 | 0.5 天 | P2 |
| 订单管理 | 8 | 3-4 天 | P0×1, P1×4, P2×3 |
| 报表中心 | 4 | 1-2 天 | P0×4 |
| **合计** | **17** | **6-9 天** | |

---

## 一、品牌更名（P3）

### UAT1-1: "NO-CRM" → "My-CRM" + 功能描述更新

| 项 | 内容 |
|---|------|
| **影响文件** | `frontend/src/views/Login.vue`（line 20 标题 + line 21 副标题 + lines 99-104 功能列表）<br>`frontend/src/layouts/MainLayout.vue`（line 4 侧栏 Logo + line 85 页面标题 fallback）<br>所有文档类文件（BR.md、人工验收步骤.md、DEPLOY.md、QUICKSTART.md、nginx.conf、seed.ts）|
| **改动内容** | 1. 登录页标题 `NO-CRM` → `My-CRM`，副标题不变<br>2. 登录页 4 条功能描述替换为：客户管理 / 产品管理 / 订单管理 / 报表中心<br>3. 侧栏 Logo `NO-CRM` → `My-CRM`<br>4. 页面标题 fallback 改为 `My-CRM`<br>5. 文档类文件同步替换 |
| **注意事项** | 文档类文件仅替换界面/品牌相关字样，不涉及技术说明的内容<br>数据库 `seed.ts` 中的法人代表名称和测试数据保持不动 |
| **验收标准** | 登录页、侧栏、页面标题均显示 `My-CRM`，4 个功能描述正确 |

---

## 二、客户管理

### UAT1-2: 客户列表按表头排序（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端：** `backend/src/customers/customers.service.ts`（line 49 orderBy）<br>**后端：** `backend/src/customers/customers.controller.ts`（line 16-26 findAll 接收 sort 参数）<br>**后端：** `backend/src/customers/dto/customer.dto.ts`（新增 Query DTO）<br>**前端：** `frontend/src/api/customer.ts`（getAll 传递 sort 参数）<br>**前端：** `frontend/src/views/Customers.vue`（columns 添加 sortable + 事件处理）|
| **改动内容** | 1. 后端 `findAll` 新增可选参数 `sortField` 和 `sortOrder`（ASC/DESC）<br>2. 当前硬编码 `orderBy('customer.createdAt', 'DESC')` 改为动态排序，默认降序<br>3. 支持排序的字段：`name`, `contact`, `phone`, `address`, `createdAt`<br>4. 前端 `columns` 添加 `sorter: true` 到需要排序的列<br>5. 前端处理 `sort-change` 事件，携带 `sortBy` 和 `descending` 参数发送 API |
| **验收标准** | 点击表头"名称"可升序/降序切换，其它列同理，默认按创建时间降序 |

### UAT1-3: 新建客户增加备注输入框（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **数据库实体：** `backend/src/common/database/entities/customer.entity.ts`（新增 `remark` 字段）<br>**后端 DTO：** `backend/src/customers/dto/customer.dto.ts`（CreateDto / UpdateDto 新增 `remark`）<br>**前端：** `frontend/src/views/Customers.vue`（表单新增备注文本框 + 详情展示备注）|
| **改动内容** | 1. 实体新增 `remark` 字段，类型 `TEXT`，nullable<br>2. DTO 新增可选 `remark` 字段<br>3. 表单编辑区新增 `<t-textarea>` 备注输入框<br>4. 查看/编辑对话框展示备注内容 |
| **验收标准** | 新建客户时可填写备注，查看/编辑时可看到备注，备注不超过合理字数限制 |

### UAT1-4: 客户详情展示备注（P2）

| 项 | 内容 |
|---|------|
| **说明** | 与 UAT1-3 是同一个实体的两个面（输入+展示），归入同一子任务<br>详情对话框中备注应显示在地址之后、操作按钮之前 |
| **验收标准** | 新建/编辑时填入的备注，在查看详情中完整显示 |

---

## 三、产品管理

### UAT1-5: 产品列表按表头排序（P2）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端：** `backend/src/products/products.service.ts`（line 47 orderBy）<br>**后端：** `backend/src/products/products.controller.ts`<br>**前端：** `frontend/src/api/product.ts`<br>**前端：** `frontend/src/views/Products.vue` |
| **改动内容** | 与客户排序逻辑相同，新增 `sortField` / `sortOrder` 参数<br>支持排序字段：`name`, `spec`, `defaultPrice`, `status`, `createdAt` |
| **验收标准** | 点击产品列表表头可按对应字段排序 |

---

## 四、订单管理

### UAT1-6: 订单列表按表头排序（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端：** `backend/src/orders/orders.service.ts`（line 95 orderBy）<br>**后端：** `backend/src/orders/orders.controller.ts`<br>**前端：** `frontend/src/api/order.ts`<br>**前端：** `frontend/src/views/Orders.vue` |
| **改动内容** | 与客户排序逻辑相同，新增 `sortField` / `sortOrder` 参数<br>支持排序字段：`customer`（关联客户名称）、`orderStatus`、`invoiceStatus`、`paymentStatus`、`totalAmount`、`orderDate`、`createdAt`<br>特别注意：按客户排序需要 JOIN 查询或前端排序 |
| **验收标准** | 点击"客户"、"订单状态"、"开票状态"、"收款状态"等表头可排序 |

### UAT1-7: 订单管理菜单图标（P3）

| 项 | 内容 |
|---|------|
| **影响文件** | `frontend/src/layouts/MainLayout.vue`（line 19 订单菜单项）|
| **改动内容** | 经代码审查，`<t-menu-item value="orders">` 已配置 `<t-icon name="order" />` 图标。如果图标未正常显示，检查：<br>1. TDesign 图标包 `tdesign-icons-vue-next` 是否已安装<br>2. 图标名 `order` 是否有效<br>3. 尝试替换为已知有效图标如 `list` 或 `bullet-point` |
| **验收标准** | 侧栏"订单管理"前面显示图标，与其它菜单项风格一致 |

### UAT1-8: 新建订单产品选择改为下拉联动（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **前端：** `frontend/src/views/OrderForm.vue`（lines 68-74 产品名称输入框 → 改为筛选下拉框）<br>**前端：** `frontend/src/api/product.ts`（可能需要新增精简列表接口）|
| **改动内容** | 1. 产品名称从 `<t-input>` 改为 `<t-select filterable>`，从产品库加载可选产品列表<br>2. 选择产品后，自动填充规格型号（`productSpec`）和单价（`unitPrice`）<br>3. 规格和单价仍允许手动修改（不影响产品库默认值）<br>4. 只加载已启用（`status = 1`）的产品<br>5. 数量输入框占位符/宽度扩大（如 `width: 160px`）<br>6. 搜索/筛选产品时支持按产品名称模糊匹配 |
| **验收标准** | 新建订单时，产品名称下拉可选择已启用的产品，选择后自动带出规格和单价，允许手动修改，数量输入框宽度合理 |

### UAT1-9: 订单列表状态展示"全状态高亮"（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **前端：** `frontend/src/views/Orders.vue`（lines 40-53 + lines 93-104 状态列渲染逻辑）|
| **改动内容** | 1. 订单状态列：显示「待处理 / 生产中 / 已发货 / 已完成 / 已取消」全部标签<br>2. 当前状态标签高亮（主色），其它状态灰暗色（disabled 样式）<br>3. 开票状态列同理：显示「未开票 / 已开专票 / 已开普票 / 无需开票」<br>4. 收款状态列同理：显示「未收款 / 部分收款 / 已结清」<br>5. 封装公共状态渲染组件或函数，供列表页和详情页复用 |
| **验收标准** | 列表页每行三列均显示所有状态，当前状态高亮，其它灰暗，一目了然 |

### UAT1-10: 订单详情页状态展示 + 操作合并（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **前端：** `frontend/src/views/OrderDetail.vue` |
| **改动内容** | 1. "订单信息"卡片中的订单状态/开票状态/收款状态改为"全状态高亮"显示（复用 UAT1-9 组件）<br>2. 将原本独立卡片"状态操作"中的操作按钮合并到"订单信息"卡片中（在状态下面或旁边放置操作按钮）<br>3. 移除独立的"状态操作"卡片区域<br>4. 开票信息中的开票要求/开票状态也改为全状态高亮显示，操作按钮合并到开票信息卡片中 |
| **验收标准** | 详情页一张卡片看全状态，操作按钮就近放置，无需跳转查找 |

### UAT1-11: 部分收款改为多次收款（P1）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端实体：** `backend/src/common/database/entities/order.entity.ts`（新增收款记录子表或 JSON 字段）<br>**后端 DTO：** `backend/src/orders/dto/order.dto.ts`（新增多笔收款记录 DTO）<br>**后端 Service：** `backend/src/orders/orders.service.ts`（lines 272-320 收款逻辑重构）<br>**前端：** `frontend/src/views/OrderDetail.vue`（收款信息展示改为多记录表格）|
| **改动内容** | 1. 设计收款记录数据结构：支持多次收款，每条记录包含金额、方式、日期<br>2. 后端实体调整：`receivedAmount` 保留为汇总金额，新增 `paymentRecords` 字段（JSON 数组：`[{amount, method, date}, ...]`）<br>3. 每次部分收款新增一条记录，更新汇总金额<br>4. 收款信息展示改为表格：列出每笔金额、方式、日期，底部显示汇总（总已收金额 + 订单总金额 + 收款比例百分比）<br>5. 后端校验：所有已收金额之和 ≤ 订单总金额 |
| **验收标准** | 可分多次记录部分收款，每次记录金额/方式/日期，汇总行正确显示总金额和收款比例 |

### UAT1-12: 开票信息展示优化（P2）

| 项 | 内容 |
|---|------|
| **影响文件** | **前端：** `frontend/src/views/OrderDetail.vue`（开票信息卡片）|
| **改动内容** | 1. "开票要求"和"开票状态"改为全状态高亮显示（复用 UAT1-9 组件）<br>2. 开票操作按钮合并到开票信息卡片中<br>3. 与 UAT1-10 的第 4 点重复，统一处理 |
| **验收标准** | 开票信息卡片完整展示所有状态 + 操作按钮 |

### UAT1-13: 附件上传 400 错误修复（P0）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端：** `backend/src/upload/upload.controller.ts`（lines 25-69 文件上传逻辑）<br>**前端：** `frontend/src/views/OrderDetail.vue`（lines 139-177 附件上传组件）|
| **改动内容** | 1. 排查 400 错误根因：<br>   - 检查 multer 上传配置（文件大小限制 10MB，MIME 类型白名单）<br>   - 检查前端 `<t-upload>` 组件的请求 URL、header、文件格式<br>   - 检查上传目录权限（`./uploads/orders/{orderId}/` 是否自动创建）<br>   - 检查前端请求是否携带了 JWT Token（可能需要调整 upload URL 或自定义请求）<br>2. 常见原因及修复：<br>   - 前端 TUpload 默认发起的请求可能不带认证 header → 需要自定义 `requestMethod`<br>   - 文件名加密逻辑报错（`crypto.createHash` 在 Windows 可能路径分隔符问题）<br>   - 目录创建失败（`existsSync` + `mkdirSync` 递归创建）<br>3. 后端增加明确错误提示，前端显示友好错误消息 |
| **验收标准** | PNG/JPG/PDF 文件（≤10MB）上传成功，服务端返回 200，附件可预览 |

---

## 五、报表中心

### UAT1-14~17: 报表 CSV/PDF 导出 500 错误（P0）

| 项 | 内容 |
|---|------|
| **影响文件** | **后端：** `backend/src/reports/reports.controller.ts`（lines 44-86 CSV + PDF 导出处理）<br>**后端：** `backend/src/reports/reports.service.ts`（lines 196-333 `exportCsv()` / `exportPdf()`）<br>**前端：** `frontend/src/api/reports.ts`（lines 48-62 `downloadDirect()` 函数）|
| **改动内容** | 1. **后端排查（首要）：**<br>   - 在 `exportCsv()` 和 `exportPdf()` 方法体内增加 `try-catch` 日志，定位具体崩溃行<br>   - 检查 CSV 生成逻辑：各类型 CSV 的数据调用是否正确传递参数（特别是 `byTimePeriod` 需要 `startDate`/`endDate`）<br>   - 检查 PDF 生成逻辑：`pdfkit` 是否正常实例化、`fontSize`/`text` 调用是否合法、中文内容是否需要注册中文字体<br>   - 检查 `@Res()` 响应对象的 `pipe`/`send` 方式是否在新版 NestJS 中已废弃<br>2. **典型 PDF 问题：** pdfkit 未注册中文字体时渲染中文会抛出异常（可能导致 `Failed to load PDF document`）<br>3. **前端兜底：** `downloadDirect()` 中检测 HTTP 状态码，非 200 时弹窗提示错误而非生成损坏的文件<br>4. **修复顺序：**<br>   - 先修 `exportCsv()`，再修 `exportPdf()`<br>   - `exportCsv()` 4 种类型中，`product` 最简单，优先修此打通链路 |
| **验收标准** | 产品汇总/客户对账单/营收趋势/状态汇总 CSV 导出正常，文件内容正确；客户对账单 PDF 可正常打开和查看 |

---

## 执行顺序建议

### 第一梯队（P0 — 先让系统可用）
1. **UAT1-13** 附件上传 400 修复
2. **UAT1-14~17** 报表导出 500 修复（先 CSV → 后 PDF）

### 第二梯队（P1 — 核心功能完善）
3. **UAT1-8** 新建订单产品选择联动
4. **UAT1-9** 订单列表全状态高亮
5. **UAT1-10** 订单详情状态展示优化 + 操作合并
6. **UAT1-11** 多次收款功能
7. **UAT1-2** 客户列表排序
8. **UAT1-3** 客户备注字段
9. **UAT1-6** 订单列表排序

### 第三梯队（P2 — UI 优化）
10. **UAT1-5** 产品列表排序
11. **UAT1-12** 开票信息展示优化

### 第四梯队（P3 — 非功能性变更）
12. **UAT1-1** 品牌更名
13. **UAT1-7** 菜单图标检查

---

## 注意事项

1. **数据库变更**：UAT1-3（客户备注字段）、UAT1-11（多次收款记录）涉及实体变更，需注意 TypeORM `synchronize` 自动更新 schema（仅限开发环境）
2. **公共组件复用**：UAT1-9 的全状态高亮组件建议封装为可复用组件，供 Orders.vue / OrderDetail.vue 等多处使用
3. **中文字体**：PDF 导出涉及 pdfkit 中文字体注册，需要提供中文字体文件路径或使用系统字体
4. **提交粒度**：每个子任务完成后提交一次，commit 格式 `UAT1-X: 描述`
5. **回归测试**：所有修复完成后，运行 `npm run test` 确保现有测试不受影响
