<template>
  <div class="order-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <t-space align="center">
        <t-button variant="text" @click="goBack">
          <template #icon><t-icon name="arrow-left" /></template>
          返回列表
        </t-button>
        <h2 class="page-title" v-if="order">订单详情 - {{ order.code }}</h2>
      </t-space>
    </div>

    <t-loading :loading="loading" size="large" show-overlay>
      <template v-if="order">
        <!-- 第一部分：订单头信息 -->
        <t-card title="订单信息" class="section-card">
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="订单编号">{{ order.code }}</t-descriptions-item>
            <t-descriptions-item label="客户名称">{{ order.customer?.name || '-' }}</t-descriptions-item>
            <t-descriptions-item label="下单日期">{{ order.orderDate || '-' }}</t-descriptions-item>
            <t-descriptions-item label="订单状态" :span="1">
              <t-tag :theme="orderStatusTheme(order.orderStatus)">{{ order.orderStatus }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="开票状态" :span="1">
              <t-tag :theme="invoiceStatusTheme(order.invoiceStatus)">{{ order.invoiceStatus }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="收款状态" :span="1">
              <t-tag :theme="paymentStatusTheme(order.paymentStatus)">{{ order.paymentStatus }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="备注" :span="3">{{ order.remark || '-' }}</t-descriptions-item>
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

        <!-- 第三部分：开票信息 -->
        <t-card title="开票信息" class="section-card">
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="开票要求">{{ order.invoiceRequirement || '-' }}</t-descriptions-item>
            <t-descriptions-item label="开票状态">
              <t-tag :theme="invoiceStatusTheme(order.invoiceStatus)">{{ order.invoiceStatus }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="发票号">{{ order.invoiceNo || '-' }}</t-descriptions-item>
            <t-descriptions-item label="发票附件" :span="3">
              <template v-if="order.invoiceFile">
                <t-link :href="getInvoiceFileUrl()" target="_blank" :theme="'primary'">
                  <t-icon name="file-pdf" /> 查看发票文件
                </t-link>
              </template>
              <span v-else>-</span>
            </t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 第四部分：收款信息 -->
        <t-card title="收款信息" class="section-card">
          <t-descriptions bordered layout="vertical" :column="3">
            <t-descriptions-item label="收款状态">
              <t-tag :theme="paymentStatusTheme(order.paymentStatus)">{{ order.paymentStatus }}</t-tag>
            </t-descriptions-item>
            <t-descriptions-item label="已收金额">&yen; {{ order.receivedAmount || '0.00' }}</t-descriptions-item>
            <t-descriptions-item label="收款方式">{{ order.paymentMethod || '-' }}</t-descriptions-item>
            <t-descriptions-item label="收款日期">{{ order.paymentDate || '-' }}</t-descriptions-item>
          </t-descriptions>
        </t-card>

        <!-- 第五部分：状态操作按钮 -->
        <t-card title="状态操作" class="section-card">
          <div class="status-actions">
            <div class="status-action-row">
              <span class="action-label">订单状态：</span>
              <t-space>
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
            <div class="status-action-row">
              <span class="action-label">开票状态：</span>
              <t-space>
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
            <div class="status-action-row">
              <span class="action-label">收款状态：</span>
              <t-space>
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
          </div>
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
            <template #attachment-fileSize="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
            <template #attachment-createdAt="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
            <template #attachment-action="{ row }">
              <t-space>
                <t-link :href="getDownloadUrl(row.filePath)" target="_blank" theme="primary">下载</t-link>
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
        <t-form :data="statusForm" label-width="100px">
          <t-form-item label="已收金额" name="receivedAmount">
            <t-input-number
              v-model="statusForm.receivedAmount"
              :min="0"
              :decimalPlaces="2"
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
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi, type Order } from '@/api/order'
import { MessagePlugin } from 'tdesign-vue-next'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const order = ref<Order | null>(null)

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
  { colKey: 'unitPrice', title: '单价', cell: (_h: any, { row }: any) => `¥ ${row.unitPrice}` },
  { colKey: 'quantity', title: '数量' },
  { colKey: 'subtotal', title: '小计', cell: (_h: any, { row }: any) => `¥ ${row.subtotal}` },
]

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

// 从文件路径中提取文件名
function getFilePath(filePath: string): string {
  const parts = filePath.split('\\').pop() || filePath.split('/').pop() || filePath
  return parts
}

// 获取附件下载链接
function getDownloadUrl(filePath: string): string {
  if (!order.value) return ''
  const filename = getFilePath(filePath)
  return orderApi.getFileUrl(order.value.id, filename)
}

// 获取发票附件的下载地址
function getInvoiceFileUrl(): string {
  if (!order.value?.invoiceFile) return ''
  const filename = getFilePath(order.value.invoiceFile)
  return orderApi.getFileUrl(order.value!.id, filename)
}

// 排序后的日志（倒序）
const sortedLogs = computed(() => {
  if (!order.value?.statusLogs) return []
  return [...order.value.statusLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

// 状态标签颜色
function orderStatusTheme(status: string): string {
  const map: Record<string, string> = {
    '待处理': 'warning',
    '生产中': 'primary',
    '已发货': 'success',
    '已完成': 'success',
    '已取消': 'danger',
  }
  return map[status] || 'default'
}

function invoiceStatusTheme(status: string): string {
  const map: Record<string, string> = {
    '未开票': 'default',
    '已开增值税专用发票': 'success',
    '已开普通发票': 'success',
    '无需开票': 'default',
  }
  return map[status] || 'default'
}

function paymentStatusTheme(status: string): string {
  const map: Record<string, string> = {
    '未收款': 'warning',
    '部分收款': 'warning',
    '已结清': 'success',
  }
  return map[status] || 'default'
}

function logTheme(type: string): string {
  const map: Record<string, string> = {
    order: 'primary',
    invoice: 'success',
    payment: 'warning',
  }
  return map[type] || 'default'
}

// 订单状态操作按钮
const orderStatusActions = computed(() => {
  const current = order.value?.orderStatus || ''
  const allStatuses = ['待处理', '生产中', '已发货', '已完成', '已取消']
  const flow: Record<string, string[]> = {
    '待处理': ['生产中', '已取消'],
    '生产中': ['已发货', '已取消'],
    '已发货': ['已完成'],
    '已完成': [],
    '已取消': [],
  }

  const nextStatuses = flow[current] || []
  return allStatuses
    .filter(s => nextStatuses.includes(s))
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

// 收款状态操作按钮
const paymentStatusActions = computed(() => {
  const current = order.value?.paymentStatus || ''
  const nextMap: Record<string, { label: string; value: string }[]> = {
    '未收款': [
      { label: '部分收款', value: '部分收款' },
      { label: '已结清', value: '已结清' },
    ],
    '部分收款': [
      { label: '已结清', value: '已结清' },
    ],
  }

  const btns = nextMap[current] || []
  return btns.map(b => ({
    ...b,
    theme: b.value === '已结清' ? 'success' : ('warning' as const),
    variant: 'outline' as const,
    disabled: false,
  }))
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
async function handleUploadFile(file: File) {
  if (!order.value) return { status: 'fail', error: '订单未加载' }

  try {
    await orderApi.uploadAttachment(order.value.id, file)
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

.status-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary, #333);
  min-width: 80px;
  flex-shrink: 0;
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

.dialog-warning {
  margin-top: 16px;
}
</style>
