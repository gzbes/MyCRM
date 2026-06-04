<template>
  <div class="order-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <t-space align="center">
        <t-button variant="text" @click="goBack">
          <template #icon><t-icon name="arrow-left" /></template>
          返回列表
        </t-button>
        <h2 class="page-title" v-if="order">订单详情</h2>
      </t-space>
    </div>

    <t-loading :loading="loading" size="large" show-overlay>
      <template v-if="order">
        <!-- 第一部分：订单头信息（含订单状态操作 + 行内编辑） -->
        <t-card title="订单信息" class="section-card">
          <template #actions>
            <t-space>
              <t-button v-if="!editingOrderInfo" size="small" variant="outline" @click="startEditOrderInfo">
                <template #icon><t-icon name="edit-1" /></template>编辑
              </t-button>
              <template v-else>
                <t-button size="small" theme="primary" @click="handleSaveOrderInfo">保存</t-button>
                <t-button size="small" variant="outline" @click="cancelEditOrderInfo">取消</t-button>
              </template>
            </t-space>
          </template>
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="客户名称">{{ order.customer?.name || '-' }}</t-descriptions-item>
            <t-descriptions-item label="客户单号">
              <template v-if="editingOrderInfo">
                <t-input v-model="editOrderForm.customerOrderNo" placeholder="输入客户单号" />
              </template>
              <template v-else>{{ order.customerOrderNo || '-' }}</template>
            </t-descriptions-item>
            <t-descriptions-item label="下单日期">
              <template v-if="editingOrderInfo">
                <t-date-picker v-model="editOrderForm.orderDate" placeholder="选择下单日期" style="width: 100%" />
              </template>
              <template v-else>{{ order.orderDate || '-' }}</template>
            </t-descriptions-item>
            <t-descriptions-item label="订单交期">
              <template v-if="editingOrderInfo">
                <t-date-picker v-model="editOrderForm.deliveryDate" placeholder="选择订单交期" style="width: 100%" />
              </template>
              <template v-else>{{ order.deliveryDate || '-' }}</template>
            </t-descriptions-item>
            <t-descriptions-item label="送货地址">
              <template v-if="editingOrderInfo">
                <t-select v-model="editOrderForm.deliveryAddress" placeholder="选择或输入送货地址" allow-create filterable clearable style="width: 100%">
                  <t-option v-for="addr in customerAddresses" :key="addr.address" :value="addr.address" :label="`${addr.address}${addr.isDefault ? ' (默认)' : ''}`" />
                </t-select>
              </template>
              <template v-else>{{ order.deliveryAddress || '-' }}</template>
            </t-descriptions-item>
            <t-descriptions-item label="结算方式">
              <template v-if="editingOrderInfo">
                <t-input v-model="editOrderForm.orderPaymentMethod" placeholder="输入结算方式" />
              </template>
              <template v-else>{{ order.orderPaymentMethod || '-' }}</template>
            </t-descriptions-item>
            <t-descriptions-item label="订单状态" :span="3">
              <div class="status-with-actions">
                <StatusBar :all-statuses="allOrderStatuses" :current-status="order.orderStatus" :status-theme-map="orderStatusThemeMap" />
                <t-space :size="4" style="margin-top: 6px">
                  <t-button
                    v-for="btn in orderStatusActions"
                    :key="btn.value"
                    :theme="btn.theme || 'default'"
                    :variant="btn.variant || 'outline'"
                    :disabled="btn.disabled"
                    size="small"
                    @click="handleChangeStatus('order', btn.value)"
                  >
                    {{ btn.label }}
                  </t-button>
                </t-space>
              </div>
            </t-descriptions-item>
            <t-descriptions-item label="收款状态" :span="3">
              <StatusBar :all-statuses="allPaymentStatuses" :current-status="order.paymentStatus" :status-theme-map="paymentStatusThemeMap" />
            </t-descriptions-item>
            <t-descriptions-item label="备注" :span="3">
              <template v-if="editingOrderInfo">
                <t-textarea v-model="editOrderForm.remark" placeholder="输入备注" />
              </template>
              <template v-else>{{ order.remark || '-' }}</template>
            </t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 总金额 -->
        <t-card class="section-card">
          <div class="total-amount-row">
            <span class="total-label">订单总金额：</span>
            <span class="total-value">&yen; {{ order.totalAmount }}</span>
          </div>
        </t-card>

        <!-- 第二部分：订单明细 -->
        <t-card title="订单明细" class="section-card">
          <t-table
            :data="order.items"
            :columns="itemColumns"
            row-key="id"
            stripe
            hover
          />
        </t-card>

        <!-- 第三部分：开票信息（含开票状态操作） -->
        <t-card title="开票信息" class="section-card">
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="开票要求" :span="3">
              <div class="status-with-actions">
                <template v-if="order.invoiceStatus === '未开票'">
                  <t-select
                    :value="order.invoiceRequirement"
                    style="width: 200px"
                    @change="handleInvoiceRequirementChange"
                  >
                    <t-option value="3%专票" label="3%专票" />
                    <t-option value="普票" label="普票" />
                    <t-option value="无需开票" label="无需开票" :disabled="true" />
                  </t-select>
                  <t-space :size="4" style="margin-top: 6px">
                    <t-tag theme="warning" size="small">未开票状态下可修改</t-tag>
                  </t-space>
                </template>
                <template v-else>
                  <StatusBar :all-statuses="allInvoiceRequirements" :current-status="order.invoiceRequirement" :status-theme-map="invoiceReqThemeMap" />
                </template>
              </div>
            </t-descriptions-item>
            <t-descriptions-item label="开票状态" :span="3">
              <div class="status-with-actions">
                <StatusBar :all-statuses="allInvoiceStatuses" :current-status="order.invoiceStatus" :status-theme-map="invoiceStatusThemeMap" />
                <t-space :size="4" style="margin-top: 6px">
                  <t-button
                    v-for="btn in invoiceStatusActions"
                    :key="btn.value"
                    :theme="btn.theme || 'default'"
                    :variant="btn.variant || 'outline'"
                    :disabled="btn.disabled"
                    size="small"
                    @click="handleChangeStatus('invoice', btn.value)"
                  >
                    {{ btn.label }}
                  </t-button>
                </t-space>
              </div>
            </t-descriptions-item>
            <t-descriptions-item label="发票号">
              <template v-if="editingInvoiceNo">
                <t-input
                  v-model="invoiceNoInput"
                  placeholder="输入发票号"
                  style="width: 240px"
                  @keyup.enter="handleSaveInvoiceNo"
                />
                <t-space :size="4" style="margin-left: 8px; display: inline-flex">
                  <t-button size="small" theme="primary" variant="base" @click="handleSaveInvoiceNo">保存</t-button>
                  <t-button size="small" theme="default" variant="outline" @click="editingInvoiceNo = false">取消</t-button>
                </t-space>
              </template>
              <template v-else>
                <span>{{ order.invoiceNo || '-' }}</span>
                <t-button size="small" variant="text" @click="startEditInvoiceNo">
                  <template #icon><t-icon name="edit-1" /></template>
                </t-button>
              </template>
            </t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 第四部分：收款信息（含收款状态操作） -->
        <t-card title="收款信息" class="section-card">
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="收款状态" :span="3">
              <div class="status-with-actions">
                <StatusBar :all-statuses="allPaymentStatuses" :current-status="order.paymentStatus" :status-theme-map="paymentStatusThemeMap" />
                <t-space :size="4" style="margin-top: 6px">
                  <t-button
                    v-for="btn in paymentStatusActions"
                    :key="btn.value"
                    :theme="btn.theme || 'default'"
                    :variant="btn.variant || 'outline'"
                    :disabled="btn.disabled"
                    size="small"
                    @click="handleChangeStatus('payment', btn.value)"
                  >
                    {{ btn.label }}
                  </t-button>
                </t-space>
              </div>
            </t-descriptions-item>
          </t-descriptions>

          <!-- 收款记录明细 -->
          <div v-if="order.paymentRecords && order.paymentRecords.length > 0" style="margin-top: 12px">
            <t-table
              :data="order.paymentRecords"
              :columns="paymentRecordColumns"
              row-key="index"
              stripe
              hover
              size="small"
            />
            <div class="payment-summary">
              累计已收：<strong>&yen; {{ order.receivedAmount || '0.00' }}</strong>
              &nbsp;&nbsp;订单总额：<strong>&yen; {{ order.totalAmount }}</strong>
              &nbsp;&nbsp;收款比例：<strong>{{ paymentRatio }}%</strong>
            </div>
          </div>
          <t-empty v-else description="暂无收款记录" style="margin-top: 12px" />
        </t-card>

        <!-- 第五部分：发货信息 -->
        <t-card title="发货信息" class="section-card">
          <div class="delivery-actions">
            <t-button variant="outline" size="small" @click="addDelivery">
              <template #icon><t-icon name="add" /></template>
              添加发货记录
            </t-button>
          </div>
          <t-table
            :data="order.deliveries || []"
            :columns="deliveryColumns"
            row-key="index"
            stripe
            hover
            size="small"
          >
            <template #action="{ rowIndex }">
              <t-space>
                <t-link theme="primary" @click="editDelivery(rowIndex)">编辑</t-link>
                <t-link theme="danger" @click="removeDelivery(rowIndex)">删除</t-link>
              </t-space>
            </template>
          </t-table>
          <t-empty v-if="!order.deliveries || order.deliveries.length === 0" description="暂无发货记录" style="margin-top: 12px" />
        </t-card>

        <!-- 第六部分：附件管理 -->
        <t-card title="附件管理" class="section-card">
          <div class="attachment-upload">
            <t-upload
              :autoUpload="true"
              accept=".jpg,.jpeg,.png,.pdf"
              :max="10"
              :sizeLimit="10 * 1024 * 1024"
              :requestMethod="handleUploadFile"
              :onSuccess="handleUploadSuccess"
              :onFail="handleUploadFail"
            >
              <t-button variant="outline">
                <template #icon><t-icon name="upload" /></template>
                上传附件
              </t-button>
            </t-upload>
          </div>
          <t-table
            :data="order.attachments || []"
            :columns="attachmentColumns"
            row-key="id"
            stripe
            hover
          >
            <template #fileSize="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
            <template #createdAt="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
            <template #action="{ row }">
              <t-space>
                <t-link theme="primary" @click="handlePreview(row.filePath)">预览</t-link>
                <t-link theme="primary" @click="handleDownload(row.filePath, row.fileName)">下载</t-link>
                <t-link theme="danger" @click="handleDeleteAttachment(row.id)">删除</t-link>
              </t-space>
            </template>
          </t-table>
        </t-card>

        <!-- 第七部分：状态变更日志 -->
        <t-card title="状态变更日志" class="section-card">
          <div class="timeline" v-if="order.statusLogs && order.statusLogs.length > 0">
            <div
              class="timeline-item"
              v-for="log in sortedLogs"
              :key="log.id"
            >
              <div class="timeline-dot" :class="log.statusType"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <t-tag size="small" :theme="logTheme(log.statusType)">
                    {{ log.statusType === 'order' ? '订单' : log.statusType === 'invoice' ? '开票' : '收款' }}
                  </t-tag>
                  <span class="timeline-status">{{ log.oldStatus }} → {{ log.newStatus }}</span>
                  <span class="timeline-meta">
                    {{ log.operator }} · {{ formatTime(log.createdAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <t-empty v-else description="暂无状态变更记录" />
        </t-card>
      </template>
    </t-loading>

    <!-- 发货信息编辑对话框 -->
    <t-dialog
      v-model:visible="deliveryDialogVisible"
      :header="editingDeliveryIndex >= 0 ? '编辑发货记录' : '添加发货记录'"
      :confirmBtn="'确认'"
      :cancelBtn="'取消'"
      @confirm="handleDeliveryConfirm"
      width="700px"
    >
      <t-form :data="deliveryForm" label-width="100px">
        <t-form-item label="实际交期" name="actualDeliveryDate">
          <t-date-picker
            v-model="deliveryForm.actualDeliveryDate"
            placeholder="请选择实际交期"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="送货地址" name="deliveryAddress">
          <template v-if="customerDeliveryAddresses.length > 0">
            <t-select
              v-model="deliveryForm.deliveryAddress"
              placeholder="从客户地址中选择或输入"
              allow-create
              filterable
              clearable
              style="width: 100%"
            >
              <t-option
                v-for="addr in customerDeliveryAddresses"
                :key="addr.address"
                :value="addr.address"
                :label="`${addr.address}${addr.isDefault ? ' (默认)' : ''}${addr.contact ? ' [' + addr.contact + ']' : ''}`"
              />
            </t-select>
          </template>
          <template v-else>
            <t-input
              v-model="deliveryForm.deliveryAddress"
              placeholder="请输入送货地址（客户暂无默认地址）"
            />
          </template>
        </t-form-item>
        <t-form-item label="发货明细" name="deliveryItems">
          <div style="width: 100%">
            <t-table
              :data="deliveryFormItems"
              :columns="deliveryItemColumns"
              size="small"
              stripe
              max-height="300"
            >
              <template #deliveryQuantity="{ rowIndex }">
                <t-input-number
                  v-model="deliveryFormItems[rowIndex].deliveryQuantity"
                  :min="0"
                  :decimal-places="0"
                  theme="normal"
                  style="width: 120px"
                />
              </template>
            </t-table>
          </div>
        </t-form-item>
        <t-form-item label="运费" name="freight">
          <t-input-number
            v-model="deliveryForm.freight"
            :min="0"
            :decimal-places="2"
            theme="normal"
            placeholder="请输入运费"
            style="width: 100%"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 状态变更对话框 -->
    <t-dialog
      v-model:visible="statusDialogVisible"
      :header="statusDialogTitle"
      :confirmBtn="'确认变更'"
      :cancelBtn="'取消'"
      @confirm="handleStatusConfirm"
      width="500px"
    >
      <div v-if="statusDialogType === 'payment'">
        <div class="payment-summary-dialog" v-if="order">
          <t-descriptions :column="3" style="margin-bottom: 16px">
            <t-descriptions-item label="订单总额">
              <strong style="color: #e34d59">¥{{ Number(order.totalAmount).toFixed(2) }}</strong>
            </t-descriptions-item>
            <t-descriptions-item label="已收金额">
              <strong style="color: #00a870">¥{{ Number(order.receivedAmount || 0).toFixed(2) }}</strong>
            </t-descriptions-item>
            <t-descriptions-item label="未收金额">
              <strong :style="{ color: (Number(order.totalAmount) - Number(order.receivedAmount || 0)) > 0 ? '#e34d59' : '#00a870' }">
                ¥{{ (Number(order.totalAmount) - Number(order.receivedAmount || 0)).toFixed(2) }}
              </strong>
            </t-descriptions-item>
          </t-descriptions>
        </div>
        <t-form :data="statusForm" label-width="100px">
          <t-form-item label="本次收款金额" name="receivedAmount">
            <t-input-number
              v-model="statusForm.receivedAmount"
              :min="0"
              :decimal-places="2"
              theme="normal"
              placeholder="请输入已收金额"
              style="width: 100%"
            />
          </t-form-item>
          <t-form-item label="收款方式" name="paymentMethod">
            <t-select
              v-model="statusForm.paymentMethod"
              placeholder="请选择收款方式"
              :options="[
                { label: '银行转账', value: '银行转账' },
                { label: '微信', value: '微信' },
                { label: '支付宝', value: '支付宝' },
                { label: '现金', value: '现金' },
              ]"
              style="width: 100%"
            />
          </t-form-item>
          <t-form-item label="收款日期" name="paymentDate">
            <t-date-picker
              v-model="statusForm.paymentDate"
              placeholder="请选择收款日期"
              style="width: 100%"
            />
          </t-form-item>
        </t-form>
        <div v-if="statusDialogNewStatus === '已结清'" class="dialog-warning">
          <t-alert theme="info" message="已收金额必须大于等于订单总金额" />
        </div>
      </div>

      <div v-if="statusDialogType === 'invoice'">
        <t-form :data="statusForm" label-width="100px">
          <t-form-item label="发票号" name="invoiceNo">
            <t-input
              v-model="statusForm.invoiceNo"
              placeholder="请输入发票号"
            />
          </t-form-item>
        </t-form>
      </div>

      <div v-if="statusDialogType === 'order'">
        <div v-if="statusDialogNewStatus === '已完成' && order && order.paymentStatus === '未收款'" class="dialog-warning">
          <t-alert theme="warning" message="当前收款状态为'未收款'，确认完成订单？" />
        </div>
        <div v-if="statusDialogNewStatus === '已取消'" class="dialog-warning">
          <t-alert theme="warning" message="取消后开票将自动设为无需开票" />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi, type Order, type DeliveryItem } from '@/api/order'
import { customerApi } from '@/api/customer'
import { MessagePlugin } from 'tdesign-vue-next'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const order = ref<Order | null>(null)

// 发票号编辑状态
const editingInvoiceNo = ref(false)
const invoiceNoInput = ref('')

// 订单信息行内编辑状态
const editingOrderInfo = ref(false)
const editOrderForm = ref({ customerOrderNo: '', orderDate: '', deliveryDate: '', deliveryAddress: '', orderPaymentMethod: '', remark: '' })
const customerAddresses = ref<{ address: string; contact?: string; phone?: string; isDefault?: boolean }[]>([])

// 发货明细产品级数量
const deliveryFormItems = ref<DeliveryItem[]>([])
const deliveryItemColumns = [
  { colKey: 'productName', title: '产品名称', width: 180 },
  { colKey: 'productSpec', title: '规格型号', width: 100 },
  { colKey: 'orderQuantity', title: '订单数量', width: 100 },
  { colKey: 'deliveryQuantity', title: '送货数量', width: 140 },
]
const customerDeliveryAddresses = ref<{ address: string; contact?: string; phone?: string; isDefault?: boolean }[]>([])

// 状态变更对话框
const statusDialogVisible = ref(false)
const statusDialogType = ref<'order' | 'invoice' | 'payment'>('order')
const statusDialogNewStatus = ref('')
const statusForm = ref({
  receivedAmount: 0,
  paymentMethod: '',
  paymentDate: '',
  invoiceNo: '',
})

// 订单明细表格列
const itemColumns = [
  { colKey: 'productName', title: '产品名称' },
  { colKey: 'productSpec', title: '规格型号' },
  { colKey: 'customerProductCode', title: '客户货物编码' },
  { colKey: 'unitPrice', title: '单价', cell: (_h: any, { row }: any) => `¥ ${row.unitPrice}` },
  { colKey: 'quantity', title: '数量' },
  { colKey: 'subtotal', title: '小计', cell: (_h: any, { row }: any) => `¥ ${row.subtotal}` },
]

// 收款记录表格列
const paymentRecordColumns = [
  { colKey: 'index', title: '#', width: 40, cell: (_h: any, { rowIndex }: any) => rowIndex + 1 },
  { colKey: 'amount', title: '收款金额', cell: (_h: any, { row }: any) => `¥${Number(row.amount).toFixed(2)}` },
  { colKey: 'method', title: '收款方式' },
  { colKey: 'date', title: '收款日期' },
]

// 收款比例
const paymentRatio = computed(() => {
  if (!order.value || !Number(order.value.totalAmount)) return '0.00'
  const ratio = (Number(order.value.receivedAmount) / Number(order.value.totalAmount)) * 100
  return ratio.toFixed(1)
})

// 发货表格列
const deliveryColumns = [
  { colKey: 'index', title: '#', width: 40, cell: (_h: any, { rowIndex }: any) => rowIndex + 1 },
  { colKey: 'actualDeliveryDate', title: '实际交期' },
  { colKey: 'deliveryAddress', title: '送货地址' },
  { colKey: 'deliveryQuantity', title: '送货数量', cell: (_h: any, { row }: any) => {
    if (row.items && row.items.length > 0) {
      return row.items.map((i: any) => `${i.productName}×${i.deliveryQuantity}`).join('; ')
    }
    return row.deliveryQuantity != null ? String(row.deliveryQuantity) : '-'
  }},
  { colKey: 'freight', title: '运费', cell: (_h: any, { row }: any) => `¥${Number(row.freight).toFixed(2)}` },
  { colKey: 'action', title: '操作', width: 120 },
]

// 发货信息对话框
const deliveryDialogVisible = ref(false)
const editingDeliveryIndex = ref(-1)
const deliveryForm = ref({ actualDeliveryDate: '', deliveryAddress: '', deliveryQuantity: 0, freight: 0 })

function addDelivery() {
  editingDeliveryIndex.value = -1
  deliveryForm.value = { actualDeliveryDate: '', deliveryAddress: '', deliveryQuantity: 0, freight: 0 }
  // 初始化产品级发货数量
  if (order.value?.items) {
    deliveryFormItems.value = order.value.items.map(item => ({
      productName: item.productName,
      productSpec: item.productSpec,
      orderQuantity: item.quantity,
      deliveryQuantity: 0,
    }))
  } else {
    deliveryFormItems.value = []
  }
  // 加载客户送货地址
  loadCustomerDeliveryAddresses()
  deliveryDialogVisible.value = true
}

async function loadCustomerDeliveryAddresses() {
  if (!order.value?.customerId) return
  try {
    const customer = await customerApi.getOne(order.value.customerId)
    customerDeliveryAddresses.value = customer.deliveryAddresses || []
    // 默认选中默认地址
    const defaultAddr = customerDeliveryAddresses.value.find(a => a.isDefault)
    if (defaultAddr && !deliveryForm.value.deliveryAddress) {
      deliveryForm.value.deliveryAddress = defaultAddr.address
    }
  } catch (e) {
    console.error('[OrderDetail] failed to load customer addresses:', e)
    customerDeliveryAddresses.value = []
  }
}

function editDelivery(index: number) {
  const d = (order.value?.deliveries || [])[index]
  if (!d) return
  editingDeliveryIndex.value = index
  deliveryForm.value = { ...d, deliveryQuantity: d.deliveryQuantity ?? 0 }
  // 恢复产品级发货数量
  if (d.items && d.items.length > 0) {
    deliveryFormItems.value = d.items.map(item => ({ ...item }))
  } else if (order.value?.items) {
    // 兼容旧数据：只有总数量，按比例均分到各产品
    deliveryFormItems.value = order.value.items.map(item => ({
      productName: item.productName,
      productSpec: item.productSpec,
      orderQuantity: item.quantity,
      deliveryQuantity: d.deliveryQuantity ? Math.round(d.deliveryQuantity / order.value!.items.length) : 0,
    }))
  }
  loadCustomerDeliveryAddresses()
  deliveryDialogVisible.value = true
}

async function removeDelivery(index: number) {
  if (!order.value) return
  const deliveries = [...(order.value.deliveries || [])]
  deliveries.splice(index, 1)
  try {
    const updated = await orderApi.update(order.value.id, { deliveries })
    order.value = updated
    await MessagePlugin.success('发货记录已删除')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '操作失败'
    await MessagePlugin.error(msg)
  }
}

async function handleDeliveryConfirm() {
  if (!order.value) return
  // 计算总送货数量并保存产品级明细
  const items = deliveryFormItems.value.map(item => ({ ...item }))
  const totalQty = items.reduce((sum, item) => sum + (item.deliveryQuantity || 0), 0)
  const deliveryRecord = {
    ...deliveryForm.value,
    deliveryQuantity: totalQty,
    items,
  }
  const deliveries = [...(order.value.deliveries || [])]
  if (editingDeliveryIndex.value >= 0) {
    deliveries[editingDeliveryIndex.value] = deliveryRecord
  } else {
    deliveries.push(deliveryRecord)
  }
  try {
    const updated = await orderApi.update(order.value.id, { deliveries })
    order.value = updated
    deliveryDialogVisible.value = false
    await MessagePlugin.success('发货记录已保存')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '操作失败'
    await MessagePlugin.error(msg)
  }
}

// 附件表格列
const attachmentColumns = [
  { colKey: 'fileName', title: '文件名' },
  { colKey: 'fileSize', title: '文件大小' },
  { colKey: 'createdAt', title: '上传时间' },
  { colKey: 'action', title: '操作', width: 150 },
]

// 时间格式化
function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

// 文件大小格式化
function formatFileSize(bytes: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 从文件路径中提取文件名（兼容 Windows 反斜杠和 Linux 正斜杠）
function getFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() || filePath
}

// 预览附件（通过 axios 获取 blob，在新标签页打开）
async function handlePreview(filePath: string) {
  if (!order.value) return
  try {
    const filename = getFilePath(filePath)
    const blob = await orderApi.getFileBlob(order.value.id, filename)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '预览失败'
    await MessagePlugin.error(msg)
  }
}

// 下载附件（通过 axios 发送 JWT 认证，再用 blob URL 触发下载）
async function handleDownload(filePath: string, displayName?: string) {
  if (!order.value) return
  try {
    const filename = getFilePath(filePath)
    const blob = await orderApi.getFileBlob(order.value.id, filename)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = displayName || filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '下载失败'
    await MessagePlugin.error(msg)
  }
}

// 排序后的日志（倒序）
const sortedLogs = computed(() => {
  if (!order.value?.statusLogs) return []
  return [...order.value.statusLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

// ── 全状态列表 ──
const allOrderStatuses = ['待处理', '生产中', '已发货', '已完成', '已取消']
const allInvoiceStatuses = ['未开票', '已开增值税专用发票', '已开普通发票', '无需开票']
const allInvoiceRequirements = ['无需开票', '3%专票', '普票']
const allPaymentStatuses = ['未收款', '部分收款', '已结清']

// ── 状态主题映射 ──
const orderStatusThemeMap: Record<string, string> = { '待处理': 'warning', '生产中': 'primary', '已发货': 'success', '已完成': 'success', '已取消': 'danger' }
const invoiceStatusThemeMap: Record<string, string> = { '未开票': 'default', '已开增值税专用发票': 'success', '已开普通发票': 'success', '无需开票': 'default' }
const invoiceReqThemeMap: Record<string, string> = { '无需开票': 'default', '3%专票': 'primary', '普票': 'default' }
const paymentStatusThemeMap: Record<string, string> = { '未收款': 'warning', '部分收款': 'warning', '已结清': 'success' }

function logTheme(type: string): string {
  const map: Record<string, string> = {
    order: 'primary',
    invoice: 'success',
    payment: 'warning',
  }
  return map[type] || 'default'
}

// 订单状态操作按钮（自由选择，不限制顺序）
const orderStatusActions = computed(() => {
  const current = order.value?.orderStatus || ''
  const allStatuses = ['待处理', '生产中', '已发货', '已完成', '已取消']

  // 已完成和已取消是终态
  if (['已完成', '已取消'].includes(current)) return []

  // 已开票的订单不可取消
  const invoiceStatus = order.value?.invoiceStatus || ''
  const cannotCancel = invoiceStatus.includes('已开')

  return allStatuses
    .filter(s => s !== current)
    .filter(s => !(s === '已取消' && cannotCancel))
    .map(s => ({
      label: s,
      value: s,
      theme: s === '已取消' ? 'danger' : 'primary',
      variant: 'outline' as const,
      disabled: false,
    }))
})

// 开票状态操作按钮
const invoiceStatusActions = computed(() => {
  const current = order.value?.invoiceStatus || ''
  const nextMap: Record<string, { label: string; value: string }[]> = {
    '未开票': [
      { label: '已开增值税专用发票', value: '已开增值税专用发票' },
      { label: '已开普通发票', value: '已开普通发票' },
    ],
  }

  const btns = nextMap[current] || []
  return btns.map(b => ({
    ...b,
    theme: 'success' as const,
    variant: 'outline' as const,
    disabled: false,
  }))
})

// 收款状态操作按钮（支持多次部分收款）
const paymentStatusActions = computed(() => {
  const current = order.value?.paymentStatus || ''
  if (current === '未收款') {
    return [
      { label: '部分收款', value: '部分收款', theme: 'warning' as const, variant: 'outline' as const, disabled: false },
      { label: '已结清', value: '已结清', theme: 'success' as const, variant: 'outline' as const, disabled: false },
    ]
  }
  if (current === '部分收款') {
    return [
      { label: '追加收款', value: '部分收款', theme: 'warning' as const, variant: 'outline' as const, disabled: false },
      { label: '已结清', value: '已结清', theme: 'success' as const, variant: 'outline' as const, disabled: false },
    ]
  }
  return []
})

// 对话框标题
const statusDialogTitle = computed(() => {
  const typeMap: Record<string, string> = {
    order: '订单',
    invoice: '开票',
    payment: '收款',
  }
  return `变更${typeMap[statusDialogType.value]}状态为「${statusDialogNewStatus.value}」`
})

// 处理状态变更按钮点击
function handleChangeStatus(type: 'order' | 'invoice' | 'payment', newStatus: string) {
  // 重置表单
  statusForm.value = {
    receivedAmount: 0,
    paymentMethod: '',
    paymentDate: '',
    invoiceNo: '',
  }
  statusDialogType.value = type
  statusDialogNewStatus.value = newStatus
  statusDialogVisible.value = true
}

// 编辑发票号
function startEditInvoiceNo() {
  invoiceNoInput.value = order.value?.invoiceNo || ''
  editingInvoiceNo.value = true
}

// 保存发票号
async function handleSaveInvoiceNo() {
  if (!order.value) return
  try {
    const updated = await orderApi.update(order.value.id, { invoiceNo: invoiceNoInput.value })
    order.value = updated
    editingInvoiceNo.value = false
    await MessagePlugin.success('发票号已更新')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '更新发票号失败'
    await MessagePlugin.error(msg)
  }
}

// 处理开票要求变更（未开票状态下可直接修改）
async function handleInvoiceRequirementChange(value: string) {
  if (!order.value) return
  try {
    const updated = await orderApi.update(order.value.id, { invoiceRequirement: value })
    order.value = updated
    await MessagePlugin.success('开票要求已更新')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '更新开票要求失败'
    await MessagePlugin.error(msg)
  }
}

// ── 订单信息行内编辑 ──
async function startEditOrderInfo() {
  if (!order.value) return
  editOrderForm.value = {
    customerOrderNo: order.value.customerOrderNo || '',
    orderDate: order.value.orderDate || '',
    deliveryDate: order.value.deliveryDate || '',
    deliveryAddress: order.value.deliveryAddress || '',
    orderPaymentMethod: order.value.orderPaymentMethod || '',
    remark: order.value.remark || '',
  }
  // 加载客户送货地址用于选择
  if (order.value.customerId) {
    try {
      const customer = await customerApi.getOne(order.value.customerId)
      customerAddresses.value = customer.deliveryAddresses || []
    } catch (e) {
      customerAddresses.value = []
    }
  }
  editingOrderInfo.value = true
}

async function handleSaveOrderInfo() {
  if (!order.value) return
  try {
    const updated = await orderApi.update(order.value.id, editOrderForm.value)
    order.value = updated
    editingOrderInfo.value = false
    await MessagePlugin.success('订单信息已更新')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '更新失败'
    await MessagePlugin.error(msg)
  }
}

function cancelEditOrderInfo() {
  editingOrderInfo.value = false
}

// 处理状态变更确认
async function handleStatusConfirm() {
  if (!order.value) return

  const payload: any = {
    statusType: statusDialogType.value,
    newStatus: statusDialogNewStatus.value,
  }

  if (statusDialogType.value === 'payment') {
    payload.receivedAmount = statusForm.value.receivedAmount
    payload.paymentMethod = statusForm.value.paymentMethod
    payload.paymentDate = statusForm.value.paymentDate
  }

  if (statusDialogType.value === 'invoice') {
    payload.invoiceNo = statusForm.value.invoiceNo
  }

  try {
    const updated = await orderApi.changeStatus(order.value.id, payload)
    order.value = updated
    statusDialogVisible.value = false
    await MessagePlugin.success('状态变更成功')
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '状态变更失败'
    await MessagePlugin.error(msg)
  }
}

// 附件上传
async function handleUploadFile(file: any) {
  if (!order.value) return { status: 'fail', error: '订单未加载' }

  try {
    // TDesign 的 requestMethod 传入的是 UploadFile 包装对象，需提取原始 File
    const rawFile = file.raw || file
    await orderApi.uploadAttachment(order.value.id, rawFile)
    return { status: 'success' }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '上传失败'
    return { status: 'fail', error: msg }
  }
}

function handleUploadSuccess() {
  MessagePlugin.success('附件上传成功')
  loadOrder()
}

function handleUploadFail() {
  MessagePlugin.error('附件上传失败')
}

// 删除附件
async function handleDeleteAttachment(attachmentId: number) {
  if (!order.value) return
  try {
    await orderApi.deleteAttachment(order.value.id, attachmentId)
    await MessagePlugin.success('附件删除成功')
    loadOrder()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '删除失败'
    await MessagePlugin.error(msg)
  }
}

// 加载订单
async function loadOrder() {
  const id = Number(route.params.id)
  if (!id) {
    await MessagePlugin.error('无效的订单ID')
    router.push('/orders')
    return
  }

  loading.value = true
  try {
    order.value = await orderApi.getOne(id)
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '加载订单失败'
    await MessagePlugin.error(msg)
    router.push('/orders')
  } finally {
    loading.value = false
  }
}

// 返回列表
function goBack() {
  router.push('/orders')
}

onMounted(() => {
  loadOrder()
})
</script>

<style scoped>
.order-detail-page {
  background: #fff;
  padding: 24px;
  min-height: 100%;
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--td-border-level-1-color, #e8e8e8);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--td-text-color-primary, #333);
}

.section-card {
  margin-bottom: 16px;
}

.total-amount-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 0;
}

.total-label {
  font-size: 16px;
  color: var(--td-text-color-secondary, #666);
  font-weight: 500;
}

.total-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--td-error-color, #e34d59);
  margin-left: 8px;
}

.status-with-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attachment-upload {
  margin-bottom: 16px;
}

/* 时间线样式 */
.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline-item {
  position: relative;
  padding-bottom: 24px;
  padding-left: 16px;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 12px;
  bottom: 0;
  width: 2px;
  background: var(--td-border-level-2-color, #dcdcdc);
}

.timeline-dot {
  position: absolute;
  left: -13px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--td-brand-color, #0052d9);
  border: 2px solid var(--td-bg-color-component, #fff);
}

.timeline-dot.order {
  background: var(--td-brand-color, #0052d9);
}

.timeline-dot.invoice {
  background: var(--td-success-color, #00a870);
}

.timeline-dot.payment {
  background: var(--td-warning-color, #e37318);
}

.timeline-content {
  background: var(--td-bg-color-secondarycontainer, #f3f3f3);
  border-radius: 6px;
  padding: 10px 14px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.timeline-status {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary, #333);
}

.timeline-meta {
  font-size: 12px;
  color: var(--td-text-color-placeholder, #bbb);
}

.payment-summary {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--td-bg-color-secondarycontainer, #f9f9f9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--td-text-color-secondary, #666);
}

.dialog-warning {
  margin-top: 16px;
}
</style>
