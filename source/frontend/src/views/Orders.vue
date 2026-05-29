<template>
  <div class="orders-page">
    <div class="page-header">
      <t-space>
        <t-input
          v-model="searchKeyword"
          placeholder="搜索订单（编号、客户）"
          clearable
          style="width: 300px;"
          @change="handleSearch"
        >
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
        <t-button theme="primary" @click="handleAdd">
          <template #icon><t-icon name="add" /></template>
          新建订单
        </t-button>
      </t-space>
    </div>

    <t-table
      :data="orders"
      :columns="columns"
      :loading="loading"
      row-key="id"
      stripe
      hover
    >
      <template #orderStatus="{ row }">
        <t-tag :theme="row.orderStatus === 1 ? 'success' : row.orderStatus === 2 ? 'warning' : 'default'">
          {{ orderStatusLabels[row.orderStatus] || '未知' }}
        </t-tag>
      </template>
      <template #action="{ row }">
        <t-space>
          <t-link theme="primary" @click="handleView(row)">查看</t-link>
          <t-popconfirm content="确定删除此订单吗？" @confirm="handleDelete(row.id)">
            <t-link theme="danger">删除</t-link>
          </t-popconfirm>
        </t-space>
      </template>
    </t-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <t-pagination
        v-model="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        :pageSizeOptions="[10, 20, 50, 100]"
        show-jumper
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { orderApi, type Order } from '@/api/order'
import { MessagePlugin } from 'tdesign-vue-next'

const orders = ref<Order[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const orderStatusLabels: Record<number, string> = {
  0: '待确认',
  1: '进行中',
  2: '已完成',
  3: '已取消'
}

const columns = [
  { colKey: 'code', title: '编号', width: 180 },
  { colKey: 'customer', title: '客户', width: 150 },
  { colKey: 'orderDate', title: '订单日期', width: 120 },
  { colKey: 'totalAmount', title: '总金额', width: 120 },
  { colKey: 'orderStatus', title: '状态', width: 100 },
  { colKey: 'action', title: '操作', width: 150, fixed: 'right' }
]

const loadOrders = async () => {
  loading.value = true
  try {
    const result = await orderApi.getAll(searchKeyword.value, pagination.value.current, pagination.value.pageSize)
    orders.value = result.data
    pagination.value.total = result.total
  } catch (error) {
    MessagePlugin.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  loadOrders()
}

const handlePageChange = () => {
  loadOrders()
}

const handleAdd = () => {
  MessagePlugin.info('订单创建功能将在Phase 2实现')
}

const handleView = (order: Order) => {
  MessagePlugin.info(`订单详情: ${order.code}`)
}

const handleDelete = async (id: number) => {
  try {
    await orderApi.delete(id)
    MessagePlugin.success('删除成功')
    loadOrders()
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.orders-page {
  background: #fff;
  padding: 24px;
  border-radius: 4px;
}

.page-header {
  margin-bottom: 24px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
</style>
