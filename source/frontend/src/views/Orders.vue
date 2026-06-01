<template>
  <div class="orders-page">
    <div class="page-header">
      <t-row justify="space-between" align="middle">
        <t-col>
          <t-space>
            <t-button theme="primary" @click="handleAdd">
              <template #icon><t-icon name="add" /></template>
              新建订单
            </t-button>
          </t-space>
        </t-col>
        <t-col>
          <t-input
            v-model="keyword"
            placeholder="搜索客户/备注"
            clearable
            style="width: 280px"
            @enter="handleSearch"
            @clear="handleSearch"
          >
            <template #suffix-icon>
              <t-icon name="search" @click="handleSearch" style="cursor: pointer" />
            </template>
          </t-input>
        </t-col>
      </t-row>
    </div>

    <t-table
      :data="orders"
      :columns="columns"
      :loading="loading"
      row-key="id"
      stripe
      hover
      :pagination="pagination"
      @page-change="handlePageChange"
      @sort-change="handleSortChange"
    >
      <template #customer="{ row }">
        {{ row.customer?.name || '-' }}
      </template>
      <template #orderDate="{ row }">
        {{ row.orderDate }}
      </template>
      <template #totalAmount="{ row }">
        ¥{{ parseFloat(row.totalAmount).toFixed(2) }}
      </template>
      <template #receivedAmount="{ row }">
        ¥{{ parseFloat(row.receivedAmount).toFixed(2) }}
      </template>
      <template #orderStatus="{ row }">
        <t-select
          :model-value="row.orderStatus"
          :style="{ width: '120px' }"
          size="small"
          @change="(val: string) => handleStatusChange(row, 'order', val)"
        >
          <t-option
            v-for="s in allOrderStatuses"
            :key="s"
            :value="s"
            :label="s"
            :disabled="s === row.orderStatus || (isTerminalStatus(row.orderStatus))"
          />
        </t-select>
      </template>
      <template #invoiceStatus="{ row }">
        <t-select
          :model-value="row.invoiceStatus"
          :style="{ width: '120px' }"
          size="small"
          @change="(val: string) => handleStatusChange(row, 'invoice', val)"
        >
          <t-option
            v-for="s in allInvoiceStatusesForSelect"
            :key="s"
            :value="s"
            :label="s === '已开增值税专用发票' ? '已开专票' : s === '已开普通发票' ? '已开普票' : s"
            :disabled="s === row.invoiceStatus"
          />
        </t-select>
      </template>
      <template #paymentStatus="{ row }">
        <t-select
          :model-value="row.paymentStatus"
          :style="{ width: '120px' }"
          size="small"
          @change="(val: string) => handleStatusChange(row, 'payment', val)"
        >
          <t-option
            v-for="s in allPaymentStatuses"
            :key="s"
            :value="s"
            :label="s"
            :disabled="s === row.paymentStatus"
          />
        </t-select>
      </template>
      <template #actualDeliveryDate="{ row }">
        {{ getLatestDeliveryDate(row) }}
      </template>
      <template #action="{ row }">
        <t-space>
          <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
          <t-link theme="danger" @click="handleDelete(row.id)">删除</t-link>
        </t-space>
      </template>
    </t-table>

    <!-- 收款对话框 -->
    <t-dialog
      v-model:visible="paymentDialogVisible"
      :header="paymentDialogNewStatus === '已结清' ? '收款结清' : '部分收款'"
      :confirmBtn="'确认'"
      :cancelBtn="'取消'"
      @confirm="handlePaymentConfirm"
      width="500px"
    >
      <div v-if="paymentTargetOrder" class="payment-summary-dialog">
        <t-descriptions :column="3" style="margin-bottom: 16px">
          <t-descriptions-item label="订单总额">
            <strong style="color: #e34d59">¥{{ Number(paymentTargetOrder.totalAmount).toFixed(2) }}</strong>
          </t-descriptions-item>
          <t-descriptions-item label="已收金额">
            <strong style="color: #00a870">¥{{ Number(paymentTargetOrder.receivedAmount || 0).toFixed(2) }}</strong>
          </t-descriptions-item>
          <t-descriptions-item label="未收金额">
            <strong :style="{ color: (Number(paymentTargetOrder.totalAmount) - Number(paymentTargetOrder.receivedAmount || 0)) > 0 ? '#e34d59' : '#00a870' }">
              ¥{{ (Number(paymentTargetOrder.totalAmount) - Number(paymentTargetOrder.receivedAmount || 0)).toFixed(2) }}
            </strong>
          </t-descriptions-item>
        </t-descriptions>
      </div>
      <t-form :data="paymentForm" label-width="100px">
        <t-form-item label="本次收款金额" name="receivedAmount">
          <t-input-number
            v-model="paymentForm.receivedAmount"
            :min="0"
            :decimal-places="2"
            theme="normal"
            placeholder="请输入收款金额"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="收款方式" name="paymentMethod">
          <t-select
            v-model="paymentForm.paymentMethod"
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
            v-model="paymentForm.paymentDate"
            placeholder="请选择收款日期"
            style="width: 100%"
          />
        </t-form-item>
      </t-form>
      <div v-if="paymentDialogNewStatus === '已结清'" class="dialog-warning">
        <t-alert theme="info" message="已收金额必须大于等于订单总金额" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi, type Order } from '@/api/order'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(false)
const keyword = ref('')
const sortState = ref({ sortBy: '', descending: true })

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 收款对话框状态
const paymentDialogVisible = ref(false)
const paymentTargetOrder = ref<Order | null>(null)
const paymentDialogNewStatus = ref('')
const paymentForm = ref({ receivedAmount: 0, paymentMethod: '', paymentDate: '' })

const columns = [
  { colKey: 'action', title: '操作', width: 120, fixed: 'left' },
  { colKey: 'customer', title: '客户', width: 140, sorter: true },
  { colKey: 'customerOrderNo', title: '客户单号', width: 130 },
  { colKey: 'orderDate', title: '下单日期', width: 110, sorter: true },
  { colKey: 'deliveryDate', title: '订单交期', width: 110 },
  { colKey: 'orderPaymentMethod', title: '结算方式', width: 100 },
  { colKey: 'totalAmount', title: '总金额', width: 120, sorter: true },
  { colKey: 'orderStatus', title: '订单状态', width: 140, sorter: true },
  { colKey: 'invoiceStatus', title: '开票状态', width: 140, sorter: true },
  { colKey: 'paymentStatus', title: '收款状态', width: 140, sorter: true },
  { colKey: 'actualDeliveryDate', title: '实际交期', width: 110 },
  { colKey: 'receivedAmount', title: '已收金额', width: 120 },
]

// 全状态显示
const allOrderStatuses = ['待处理', '生产中', '已发货', '已完成', '已取消']
const allInvoiceStatusesForSelect = ['未开票', '已开增值税专用发票', '已开普通发票']
const allPaymentStatuses = ['未收款', '部分收款', '已结清']

function isTerminalStatus(status: string): boolean {
  return ['已完成', '已取消'].includes(status)
}

function getLatestDeliveryDate(order: Order): string {
  if (!order.deliveries || order.deliveries.length === 0) return '-'
  return order.deliveries[order.deliveries.length - 1]?.actualDeliveryDate || '-'
}

async function loadOrders() {
  loading.value = true
  try {
    const result = await orderApi.getAll({
      keyword: keyword.value || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      sortField: sortState.value.sortBy || undefined,
      sortOrder: sortState.value.descending ? 'desc' : 'asc',
    })
    orders.value = result.data
    pagination.total = result.total
  } catch (err: any) {
    MessagePlugin.error(err?.response?.data?.message || '加载订单列表失败')
  } finally {
    loading.value = false
  }
}

async function handleStatusChange(row: Order, statusType: string, newStatus: string) {
  if (newStatus === row.orderStatus && statusType === 'order') return
  if (newStatus === row.invoiceStatus && statusType === 'invoice') return
  if (newStatus === row.paymentStatus && statusType === 'payment') return

  // 收款状态变更需弹出对话框录入金额/方式/日期
  if (statusType === 'payment' && (newStatus === '部分收款' || newStatus === '已结清')) {
    paymentTargetOrder.value = row
    paymentDialogNewStatus.value = newStatus
    paymentForm.value = { receivedAmount: 0, paymentMethod: '', paymentDate: '' }
    paymentDialogVisible.value = true
    return
  }

  try {
    const payload: any = { statusType, newStatus }
    await orderApi.changeStatus(row.id, payload)
    MessagePlugin.success('状态更新成功')
    await loadOrders()
  } catch (err: any) {
    MessagePlugin.error(err?.response?.data?.message || '状态更新失败')
  }
}

async function handlePaymentConfirm() {
  if (!paymentTargetOrder.value) return
  const order = paymentTargetOrder.value
  const payload: any = {
    statusType: 'payment',
    newStatus: paymentDialogNewStatus.value,
    receivedAmount: paymentForm.value.receivedAmount,
    paymentMethod: paymentForm.value.paymentMethod,
    paymentDate: paymentForm.value.paymentDate,
  }
  try {
    await orderApi.changeStatus(order.id, payload)
    MessagePlugin.success('收款成功')
    paymentDialogVisible.value = false
    await loadOrders()
  } catch (err: any) {
    MessagePlugin.error(err?.response?.data?.message || '收款失败')
  }
}

function handleSearch() { pagination.page = 1; loadOrders() }
function handlePageChange(pageInfo: any) { pagination.page = pageInfo.page; pagination.pageSize = pageInfo.pageSize; loadOrders() }
function handleSortChange(ctx: any) {
  sortState.value.sortBy = ctx.sortBy || ''
  sortState.value.descending = ctx.descending !== false
  loadOrders()
}
function handleAdd() { router.push('/orders/new') }
function handleEdit(order: Order) { router.push(`/orders/${order.id}`) }

async function handleDelete(id: number) {
  try {
    await orderApi.delete(id)
    MessagePlugin.success('删除成功')
    if (orders.value.length === 1 && pagination.page > 1) pagination.page--
    loadOrders()
  } catch (err: any) {
    MessagePlugin.error(err?.response?.data?.message || '删除失败')
  }
}

onMounted(() => loadOrders())
</script>

<style scoped>
.orders-page { background: #fff; padding: 24px; border-radius: 4px; }
.page-header { margin-bottom: 24px; }
.dialog-warning { margin-top: 16px; }
</style>
