<template>
  <div class="products-page">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <t-row justify="space-between" align="middle">
        <t-col>
          <t-space>
            <t-button theme="primary" @click="handleAdd">
              <template #icon><t-icon name="add" /></template>
              新建产品
            </t-button>
          </t-space>
        </t-col>
        <t-col>
          <t-input
            v-model="keyword"
            placeholder="搜索产品名称/规格"
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

    <!-- 产品表格 -->
    <t-table
      :data="products"
      :columns="columns"
      :loading="loading"
      row-key="id"
      stripe
      hover
      :pagination="pagination"
      @page-change="handlePageChange"
      @sort-change="handleSortChange"
    >
      <template #defaultPrice="{ row }">
        {{ parseFloat(row.defaultPrice).toFixed(2) }}
      </template>
      <template #status="{ row }">
        <t-switch
          :value="row.status === 1"
          @change="handleToggleStatus(row)"
          :label="row.status === 1 ? '启用' : '停用'"
        />
      </template>
      <template #action="{ row }">
        <t-space>
          <t-link theme="primary" @click="handleEdit(row)">编辑</t-link>
          <t-popconfirm content="确定删除此产品吗？" @confirm="handleDelete(row.id)">
            <t-link theme="danger">删除</t-link>
          </t-popconfirm>
        </t-space>
      </template>
    </t-table>

    <!-- 创建/编辑对话框 -->
    <t-dialog
      v-model:visible="showDialog"
      :header="editingProduct ? '编辑产品' : '新建产品'"
      width="500px"
      :confirm-btn="{ content: '确认', loading: submitting }"
      :cancel-btn="'取消'"
      @confirm="handleSubmit"
      @close="handleClose"
    >
      <t-form :data="formData" label-align="right" :label-width="100">
        <t-form-item label="名称" name="name">
          <t-input v-model="formData.name" placeholder="请输入产品名称" />
        </t-form-item>
        <t-form-item label="规格" name="spec">
          <t-input v-model="formData.spec" placeholder="如：A4/500张/包" />
        </t-form-item>
        <t-form-item label="默认价格" name="defaultPrice">
          <t-input-number
            v-model="formData.defaultPrice"
            :min="0"
            :decimal-places="2"
            placeholder="请输入价格"
          >
            <template #suffix>元</template>
          </t-input-number>
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea v-model="formData.remark" placeholder="请输入备注" :autosize="{ minRows: 2 }" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { productApi, type Product } from '@/api/product'
import { MessagePlugin } from 'tdesign-vue-next'

const products = ref<Product[]>([])
const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const editingProduct = ref<Product | null>(null)
const keyword = ref('')
const sortState = reactive({ sortBy: '', descending: true })

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const formData = ref({
  name: '',
  spec: '',
  defaultPrice: 0,
  remark: '',
})

const columns = [
  { colKey: 'name', title: '名称', width: 160, ellipsis: true, sorter: true },
  { colKey: 'spec', title: '规格', width: 140, ellipsis: true, sorter: true },
  { colKey: 'defaultPrice', title: '默认价格', width: 120, sorter: true },
  { colKey: 'status', title: '状态', width: 100, sorter: true },
  { colKey: 'remark', title: '备注', width: 200, ellipsis: true },
  { colKey: 'action', title: '操作', width: 150, fixed: 'right' },
]

const loadProducts = async () => {
  loading.value = true
  try {
    const result = await productApi.getAll(
      keyword.value,
      pagination.page,
      pagination.pageSize,
      sortState.sortBy || undefined,
      sortState.descending ? 'DESC' : 'ASC',
    )
    products.value = result.data
    pagination.total = result.total
  } catch (error: any) {
    MessagePlugin.error(error?.response?.data?.message || '加载产品列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadProducts()
}

const handlePageChange = (pageInfo: any) => {
  pagination.page = pageInfo.page
  pagination.pageSize = pageInfo.pageSize
  loadProducts()
}

const handleSortChange = (ctx: any) => {
  sortState.sortBy = ctx.sortBy || ''
  sortState.descending = ctx.descending !== undefined ? ctx.descending : true
  pagination.page = 1
  loadProducts()
}

const handleAdd = () => {
  editingProduct.value = null
  formData.value = { name: '', spec: '', defaultPrice: 0, remark: '' }
  showDialog.value = true
}

const handleEdit = (product: Product) => {
  editingProduct.value = product
  formData.value = {
    name: product.name,
    spec: product.spec || '',
    defaultPrice: parseFloat(product.defaultPrice) || 0,
    remark: product.remark || '',
  }
  showDialog.value = true
}

const handleDelete = async (id: number) => {
  try {
    await productApi.delete(id)
    MessagePlugin.success('删除成功')
    if (products.value.length === 1 && pagination.page > 1) {
      pagination.page--
    }
    loadProducts()
  } catch (error: any) {
    MessagePlugin.error(error?.response?.data?.message || '删除失败')
  }
}

const handleToggleStatus = async (product: Product) => {
  try {
    const updated = await productApi.toggleStatus(product.id)
    const idx = products.value.findIndex((p) => p.id === product.id)
    if (idx !== -1) {
      products.value[idx] = updated
    }
    MessagePlugin.success(updated.status === 1 ? '产品已启用' : '产品已停用')
  } catch (error: any) {
    MessagePlugin.error(error?.response?.data?.message || '操作失败')
  }
}

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    MessagePlugin.warning('请填写产品名称')
    return
  }
  submitting.value = true
  try {
    if (editingProduct.value) {
      await productApi.update(editingProduct.value.id, formData.value)
      MessagePlugin.success('更新成功')
    } else {
      await productApi.create(formData.value)
      MessagePlugin.success('创建成功')
    }
    showDialog.value = false
    loadProducts()
  } catch (error: any) {
    MessagePlugin.error(error?.response?.data?.message || (editingProduct.value ? '更新失败' : '创建失败'))
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  editingProduct.value = null
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.products-page {
  background: #fff;
  padding: 24px;
  border-radius: 4px;
}

.page-header {
  margin-bottom: 24px;
}
</style>
