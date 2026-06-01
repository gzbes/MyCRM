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
      @sort-change="handleSortChange"
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
      <t-form :data="formData" label-align="right" :label-width="100">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入客户名称（必填）" />
        </t-form-item>
        <t-form-item label="客户编码" name="customerCode">
          <t-input v-model="formData.customerCode" placeholder="请输入客户编码（可选）" />
        </t-form-item>
        <t-form-item label="联系人" name="contact">
          <t-input v-model="formData.contact" placeholder="请输入联系人" />
        </t-form-item>
        <t-form-item label="电话" name="phone">
          <t-input v-model="formData.phone" placeholder="请输入联系电话" />
        </t-form-item>
        <t-form-item label="结算方式" name="paymentMethod">
          <t-input v-model="formData.paymentMethod" placeholder="请输入结算方式（如月结、款到发货等）" />
        </t-form-item>
        <t-form-item label="地址" name="address">
          <t-input v-model="formData.address" placeholder="请输入地址" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea v-model="formData.remark" placeholder="请输入备注" :rows="3" />
        </t-form-item>
      </t-form>
      <!-- 送货地址管理 -->
      <div class="address-section" style="margin-top: 16px">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--td-text-color-primary, #333);">送货地址管理</h4>
        <t-table
          :data="formData.deliveryAddresses"
          :columns="editAddressColumns"
          row-key="index"
          max-height="200"
          size="small"
          stripe
        >
          <template #isDefault="{ row }">
            <t-tag v-if="row.isDefault" theme="primary" size="small">默认</t-tag>
            <t-link v-else theme="primary" size="small" @click="setDefaultAddress(row)">设为默认</t-link>
          </template>
          <template #action="{ rowIndex }">
            <t-space>
              <t-link theme="primary" size="small" @click="editAddress(rowIndex)">编辑</t-link>
              <t-link theme="danger" size="small" @click="removeAddress(rowIndex)">删除</t-link>
            </t-space>
          </template>
        </t-table>
        <t-button variant="outline" size="small" style="margin-top: 8px" @click="addAddress">
          <template #icon><t-icon name="add" /></template>
          添加送货地址
        </t-button>
      </div>
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
          <t-descriptions-item label="客户编码">{{ viewingCustomer.customerCode || '-' }}</t-descriptions-item>
          <t-descriptions-item label="名称">{{ viewingCustomer.name }}</t-descriptions-item>
          <t-descriptions-item label="联系人">{{ viewingCustomer.contact || '-' }}</t-descriptions-item>
          <t-descriptions-item label="电话">{{ viewingCustomer.phone || '-' }}</t-descriptions-item>
          <t-descriptions-item label="结算方式">{{ viewingCustomer.paymentMethod || '-' }}</t-descriptions-item>
          <t-descriptions-item label="地址" :span="2">{{ viewingCustomer.address || '-' }}</t-descriptions-item>
          <t-descriptions-item label="备注" :span="2"><span style="white-space: pre-line;">{{ viewingCustomer.remark || '-' }}</span></t-descriptions-item>
          <t-descriptions-item label="订单数">{{ viewingCustomer.orderCount ?? 0 }}</t-descriptions-item>
          <t-descriptions-item label="消费总额">¥{{ (viewingCustomer.totalConsumption ?? 0).toFixed(2) }}</t-descriptions-item>
          <t-descriptions-item label="创建时间" :span="2">{{ formatDate(viewingCustomer.createdAt) }}</t-descriptions-item>
          <t-descriptions-item label="更新时间" :span="2">{{ formatDate(viewingCustomer.updatedAt) }}</t-descriptions-item>
        </t-descriptions>
        <!-- 送货地址列表 -->
        <div class="delivery-address-section" v-if="viewingCustomer.deliveryAddresses && viewingCustomer.deliveryAddresses.length > 0">
          <h4>送货地址</h4>
          <t-table
            :data="viewingCustomer.deliveryAddresses"
            :columns="deliveryAddressColumns"
            row-key="index"
            max-height="200"
            size="small"
          >
            <template #isDefault="{ row }">
              <t-tag v-if="row.isDefault" theme="primary" size="small">默认</t-tag>
            </template>
          </t-table>
        </div>
      </div>
    </t-dialog>

    <!-- 地址编辑子对话框 -->
    <t-dialog
      v-model:visible="addressDialogVisible"
      :header="editingAddressIndex >= 0 ? '编辑送货地址' : '添加送货地址'"
      width="500px"
      :confirmBtn="'确认'"
      :cancelBtn="'取消'"
      @confirm="handleAddressConfirm"
    >
      <t-form :data="addressForm" label-width="100px">
        <t-form-item label="地址" name="address">
          <t-input v-model="addressForm.address" placeholder="请输入送货地址" />
        </t-form-item>
        <t-form-item label="联系人" name="contact">
          <t-input v-model="addressForm.contact" placeholder="请输入联系人" />
        </t-form-item>
        <t-form-item label="电话" name="phone">
          <t-input v-model="addressForm.phone" placeholder="请输入联系电话" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { customerApi, type Customer, type DeliveryAddress } from '@/api/customer'
import { MessagePlugin } from 'tdesign-vue-next'

const customers = ref<Customer[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const editingCustomer = ref<Customer | null>(null)
const viewingCustomer = ref<Customer | null>(null)

// 送货地址编辑状态
const addressDialogVisible = ref(false)
const editingAddressIndex = ref(-1)
const addressForm = ref<DeliveryAddress>({ address: '', contact: '', phone: '', isDefault: false })
const editAddressColumns = [
  { colKey: 'address', title: '地址' },
  { colKey: 'contact', title: '联系人' },
  { colKey: 'phone', title: '电话' },
  { colKey: 'isDefault', title: '默认', width: 80 },
  { colKey: 'action', title: '操作', width: 120 },
]
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const sortState = ref<{ sortBy: string; descending: boolean }>({
  sortBy: '',
  descending: true
})

const deliveryAddressColumns = [
  { colKey: 'address', title: '地址' },
  { colKey: 'contact', title: '联系人' },
  { colKey: 'phone', title: '电话' },
  { colKey: 'isDefault', title: '默认', width: 60 },
]

const formData = ref<{
  name: string
  customerCode: string
  contact: string
  phone: string
  paymentMethod: string
  address: string
  remark: string
  deliveryAddresses: DeliveryAddress[]
}>({
  name: '',
  customerCode: '',
  contact: '',
  phone: '',
  paymentMethod: '',
  address: '',
  remark: '',
  deliveryAddresses: []
})

const columns = [
  { colKey: 'name', title: '名称', width: 150, sorter: true },
  { colKey: 'customerCode', title: '客户编码', width: 140 },
  { colKey: 'contact', title: '联系人', width: 120, sorter: true },
  { colKey: 'phone', title: '电话', width: 140, sorter: true },
  { colKey: 'paymentMethod', title: '结算方式', width: 120 },
  { colKey: 'address', title: '地址', width: 200, ellipsis: true, sorter: true },
  { colKey: 'action', title: '操作', width: 180, fixed: 'right' }
]

const loadCustomers = async () => {
  loading.value = true
  try {
    const result = await customerApi.getAll(
      searchKeyword.value,
      pagination.value.current,
      pagination.value.pageSize,
      sortState.value.sortBy || undefined,
      sortState.value.descending ? 'desc' : 'asc'
    )
    customers.value = result.data
    pagination.value.total = result.total
  } catch (error) {
    MessagePlugin.error('加载客户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSortChange = (context: any) => {
  sortState.value = {
    sortBy: context.sortBy || '',
    descending: context.descending !== undefined ? context.descending : true
  }
  loadCustomers()
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
    customerCode: customer.customerCode || '',
    contact: customer.contact || '',
    phone: customer.phone || '',
    paymentMethod: customer.paymentMethod || '',
    address: customer.address || '',
    remark: customer.remark || '',
    deliveryAddresses: customer.deliveryAddresses ? JSON.parse(JSON.stringify(customer.deliveryAddresses)) : []
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

  // 自动处理默认地址：只有一条时默认为默认地址
  const addrs = formData.value.deliveryAddresses
  if (addrs && addrs.length === 1) {
    addrs[0].isDefault = true
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
    customerCode: '',
    contact: '',
    phone: '',
    paymentMethod: '',
    address: '',
    remark: '',
    deliveryAddresses: []
  }
}

// ── 送货地址管理函数 ──
function addAddress() {
  editingAddressIndex.value = -1
  addressForm.value = { address: '', contact: '', phone: '', isDefault: false }
  addressDialogVisible.value = true
}

function editAddress(index: number) {
  const addr = formData.value.deliveryAddresses[index]
  if (!addr) return
  editingAddressIndex.value = index
  addressForm.value = { ...addr }
  addressDialogVisible.value = true
}

function removeAddress(index: number) {
  const addrs = formData.value.deliveryAddresses
  addrs.splice(index, 1)
  // 如果删除的是默认地址，自动将第一条设为默认
  if (addrs.length === 1) {
    addrs[0].isDefault = true
  }
}

function setDefaultAddress(row: DeliveryAddress) {
  formData.value.deliveryAddresses.forEach(a => { a.isDefault = false })
  row.isDefault = true
}

function handleAddressConfirm() {
  if (!addressForm.value.address) {
    MessagePlugin.warning('请输入地址')
    return
  }
  const addrs = formData.value.deliveryAddresses
  if (editingAddressIndex.value >= 0) {
    addrs[editingAddressIndex.value] = { ...addressForm.value, isDefault: addrs[editingAddressIndex.value].isDefault }
  } else {
    // 新增：如果是第一条，自动设为默认
    const isDefault = addrs.length === 0
    addrs.push({ ...addressForm.value, isDefault })
  }
  addressDialogVisible.value = false
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
