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
            placeholder="搜索订单编号/客户/备注"
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
      <template #totalAmount="{ row }">
        ¥{{ parseFloat(row.totalAmount).toFixed(2) }}
      </template>
      <template #orderStatus="{ row }">
        <StatusBar :all-statuses="allOrderStatuses" :current-status="row.orderStatus" :status-theme-map="orderStatusThemeMap" />
      </template>
      <template #invoiceStatus="{ row }">
        <StatusBar :all-statuses="allInvoiceStatuses" :current-status="row.invoiceStatus" :status-theme-map="invoiceStatusThemeMap" />
      </template>
      <template #paymentStatus="{ row }">
        <StatusBar :all-statuses="allPaymentStatuses" :current-status="row.paymentStatus" :status-theme-map="paymentStatusThemeMap" />
      </template>
      <template #action="{ row }">
        <t-space>
          <t-link theme="primary" @click="handleView(row)">查看</t-link>
          <t-link theme="danger" @click="handleDelete(row.id)">删除</t-link>
        </t-space>
      </template>
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import StatusBar from '@/components/StatusBar.vue'
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
  { colKey: 'code', title: '订单编号', width: 180 },
  { colKey: 'customer', title: '客户', width: 140, sorter: true },
  { colKey: 'orderDate', title: '下单日期', width: 110, sorter: true },
  { colKey: 'totalAmount', title: '总金额', width: 120, sorter: true },
  { colKey: 'orderStatus', title: '订单状态', width: 380, sorter: true },
  { colKey: 'invoiceStatus', title: '开票状态', width: 400, sorter: true },
  { colKey: 'paymentStatus', title: '收款状态', width: 260, sorter: true },
  { colKey: 'action', title: '操作', width: 120, fixed: 'right' },
]

// 全状态显示 - 所有可能状态的完整列表
const allOrderStatuses = ['待处理', '生产中', '已发货', '已完成', '已取消']
const allInvoiceStatuses = ['未开票', '已开增值税专用发票', '已开普通发票', '无需开票']
const allPaymentStatuses = ['未收款', '部分收款', '已结清']

// 状态主题映射
const orderStatusThemeMap: Record<string, string> = { '待处理': 'warning', '生产中': 'primary', '已发货': 'success', '已完成': 'success', '已取消': 'danger' }
const invoiceStatusThemeMap: Record<string, string> = { '未开票': 'default', '已开增值税专用发票': 'success', '已开普通发票': 'success', '无需开票': 'default' }
const paymentStatusThemeMap: Record<string, string> = { '未收款': 'warning', '部分收款': 'warning', '已结清': 'success' }

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

function handleSearch() { pagination.page = 1; loadOrders() }
function handlePageChange(pageInfo: any) { pagination.page = pageInfo.page; pagination.pageSize = pageInfo.pageSize; loadOrders() }
function handleSortChange(ctx: any) {
  sortState.value.sortBy = ctx.sortBy || ''
  sortState.value.descending = ctx.descending !== false
  loadOrders()
}
function handleAdd() { router.push('/orders/new') }
function handleView(order: Order) { router.push(`/orders/${order.id}`) }

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
