<template>
  <div class="customers-page">
    <div class="page-header">
      <t-space>
        <t-input
          v-model="searchKeyword"
          placeholder="搜索客户（名称、联系人、电话）"
          clearable
          style="width: 300px;"
          @change="handleSearch"
        >
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
        <t-button theme="primary" @click="showCreateDialog = true">
          <template #icon><t-icon name="add" /></template>
          新建客户
        </t-button>
      </t-space>
    </div>

    <t-table
      :data="customers"
      :columns="columns"
      :loading="loading"
      row-key="id"
      stripe
      hover
    >
      <template #action="{ row }">
        <t-space>
          <t-link theme="primary" @click="handleView(row)">查看</t-link>
          <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
          <t-popconfirm content="确定删除此客户吗？" @confirm="handleDelete(row.id)">
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

    <!-- 创建/编辑对话框 -->
    <t-dialog
      v-model:visible="showCreateDialog"
      :header="editingCustomer ? '编辑客户' : '新建客户'"
      width="600px"
      @confirm="handleSubmit"
      @close="handleCloseDialog"
    >
      <t-form :data="formData" label-align="right" :label-width="80">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入客户名称（必填）" />
        </t-form-item>
        <t-form-item label="联系人" name="contact">
          <t-input v-model="formData.contact" placeholder="请输入联系人" />
        </t-form-item>
        <t-form-item label="电话" name="phone">
          <t-input v-model="formData.phone" placeholder="请输入联系电话" />
        </t-form-item>
        <t-form-item label="地址" name="address">
          <t-input v-model="formData.address" placeholder="请输入地址" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 查看详情对话框 -->
    <t-dialog
      v-model:visible="showDetailDialog"
      header="客户详情"
      width="600px"
      :footer="false"
    >
      <div v-if="viewingCustomer" class="customer-detail">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="编号">{{ viewingCustomer.code }}</t-descriptions-item>
          <t-descriptions-item label="名称">{{ viewingCustomer.name }}</t-descriptions-item>
          <t-descriptions-item label="联系人">{{ viewingCustomer.contact || '-' }}</t-descriptions-item>
          <t-descriptions-item label="电话">{{ viewingCustomer.phone || '-' }}</t-descriptions-item>
          <t-descriptions-item label="地址" :span="2">{{ viewingCustomer.address || '-' }}</t-descriptions-item>
          <t-descriptions-item label="订单数">{{ viewingCustomer.orderCount ?? 0 }}</t-descriptions-item>
          <t-descriptions-item label="消费总额">¥{{ (viewingCustomer.totalConsumption ?? 0).toFixed(2) }}</t-descriptions-item>
          <t-descriptions-item label="创建时间" :span="2">{{ formatDate(viewingCustomer.createdAt) }}</t-descriptions-item>
          <t-descriptions-item label="更新时间" :span="2">{{ formatDate(viewingCustomer.updatedAt) }}</t-descriptions-item>
        </t-descriptions>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { customerApi, type Customer } from '@/api/customer'
import { MessagePlugin } from 'tdesign-vue-next'

const customers = ref<Customer[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingCustomer = ref<Customer | null>(null)
const viewingCustomer = ref<Customer | null>(null)
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const formData = ref<{
  name: string
  contact: string
  phone: string
  address: string
}>({
  name: '',
  contact: '',
  phone: '',
  address: ''
})

const columns = [
  { colKey: 'code', title: '编号', width: 180 },
  { colKey: 'name', title: '名称', width: 150 },
  { colKey: 'contact', title: '联系人', width: 120 },
  { colKey: 'phone', title: '电话', width: 140 },
  { colKey: 'address', title: '地址', width: 200, ellipsis: true },
  { colKey: 'action', title: '操作', width: 180, fixed: 'right' }
]

const loadCustomers = async () => {
  loading.value = true
  try {
    const result = await customerApi.getAll(searchKeyword.value, pagination.value.current, pagination.value.pageSize)
    customers.value = result.data
    pagination.value.total = result.total
  } catch (error) {
    MessagePlugin.error('加载客户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  loadCustomers()
}

const handlePageChange = () => {
  loadCustomers()
}

const handleView = (customer: Customer) => {
  viewingCustomer.value = customer
  showDetailDialog.value = true
}

const handleEdit = (customer: Customer) => {
  editingCustomer.value = customer
  formData.value = {
    name: customer.name,
    contact: customer.contact || '',
    phone: customer.phone || '',
    address: customer.address || ''
  }
  showCreateDialog.value = true
}

const handleDelete = async (id: number) => {
  try {
    await customerApi.delete(id)
    MessagePlugin.success('删除成功')
    loadCustomers()
  } catch (error) {
    MessagePlugin.error('删除失败')
  }
}

const handleSubmit = async () => {
  if (!formData.value.name) {
    MessagePlugin.warning('请填写客户名称')
    return
  }

  try {
    if (editingCustomer.value) {
      await customerApi.update(editingCustomer.value.id, formData.value)
      MessagePlugin.success('更新成功')
    } else {
      await customerApi.create(formData.value)
      MessagePlugin.success('创建成功')
    }
    showCreateDialog.value = false
    loadCustomers()
  } catch (error) {
    MessagePlugin.error(editingCustomer.value ? '更新失败' : '创建失败')
  }
}

const handleCloseDialog = () => {
  editingCustomer.value = null
  formData.value = {
    name: '',
    contact: '',
    phone: '',
    address: ''
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadCustomers()
})
</script>

<style scoped>
.customers-page {
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

.customer-detail {
  padding: 16px 0;
}
</style>
