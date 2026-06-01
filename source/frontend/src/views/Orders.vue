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

const columns = [
  { colKey: 'action', title: '操作', width: 120, fixed: 'left' },
  { colKey: 'customer', title: '客户', width: 140, sorter: true },
  { colKey: 'customerOrderNo', title: '客户单号', width: 130 },
  { colKey: 'orderDate', title: '下单日期', width: 110, sorter: true },
  { colKey: 'deliveryDate', title: '订单交期', width: 110 },
  { colKey: 'orderPaymentMethod', title: '付款方式', width: 100 },
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

  try {
    const payload: any = { statusType, newStatus }
    await orderApi.changeStatus(row.id, payload)
    MessagePlugin.success('状态更新成功')
    await loadOrders()
  } catch (err: any) {
    MessagePlugin.error(err?.response?.data?.message || '状态更新失败')
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
</style>
