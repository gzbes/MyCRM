<template>
  <div class="order-form-container">
    <div class="form-header">
      <t-link theme="primary" hover="color" @click="goBack">
        <template #prefix-icon><t-icon name="chevron-left" /></template>
        返回订单列表
      </t-link>
      <h2>{{ isEdit ? '编辑订单' : '新建订单' }}</h2>
    </div>

    <div class="form-body">
      <t-form :data="formData" ref="formRef" :rules="formRules" @submit="onSubmit" layout="vertical">
        <!-- 基本信息 -->
        <t-form-item label="客户" name="customerId">
          <t-select
            v-model="formData.customerId"
            placeholder="请选择客户"
            :options="customerOptions"
            clearable
            filterable
            style="width: 400px"
          />
        </t-form-item>

        <t-form-item label="下单日期" name="orderDate">
          <t-date-picker
            v-model="formData.orderDate"
            placeholder="请选择下单日期"
            style="width: 240px"
          />
        </t-form-item>

        <t-form-item label="开票要求" name="invoiceRequirement">
          <t-radio-group v-model="formData.invoiceRequirement">
            <t-radio-button value="无需开票">无需开票</t-radio-button>
            <t-radio-button value="3%专票">3%专票</t-radio-button>
            <t-radio-button value="普票">普票</t-radio-button>
          </t-radio-group>
        </t-form-item>

        <t-form-item label="备注" name="remark">
          <t-textarea
            v-model="formData.remark"
            placeholder="订单备注信息（选填）"
            :maxlength="500"
            :rows="3"
            style="width: 600px"
          />
        </t-form-item>

        <!-- 订单明细 -->
        <div class="items-section">
          <div class="items-header">
            <h3>订单明细</h3>
            <t-button theme="primary" variant="outline" size="small" @click="addItem">
              <template #icon><t-icon name="add" /></template>
              添加产品行
            </t-button>
          </div>

          <t-table
            :data="formData.items"
            :columns="itemColumns"
            row-key="index"
            style="margin-top: 16px"
            :max-height="400"
          >
            <template #productName="{ row: _row, rowIndex }">
              <t-select
                :value="formData.items[rowIndex].productId || ''"
                placeholder="选择产品"
                :options="productOptions"
                filterable
                clearable
                :style="{ width: '200px' }"
                @change="(val: any) => handleProductSelect(val, rowIndex)"
              />
            </template>

            <template #productSpec="{ row: _row, rowIndex }">
              <t-input
                v-model="formData.items[rowIndex].productSpec"
                placeholder="规格型号"
                :style="{ width: '120px' }"
              />
            </template>

            <template #unitPrice="{ row: _row, rowIndex }">
              <t-input-number
                v-model="formData.items[rowIndex].unitPrice"
                :min="0"
                :decimal-places="2"
                placeholder="单价"
                :style="{ width: '120px' }"
              />
            </template>

            <template #quantity="{ row: _row, rowIndex }">
              <t-input-number
                v-model="formData.items[rowIndex].quantity"
                :min="1"
                :decimal-places="0"
                placeholder="数量"
                :style="{ width: '140px' }"
              />
            </template>

            <template #subtotal="{ row }">
              <span class="subtotal-value">{{ formatAmount(row.unitPrice * row.quantity) }}</span>
            </template>

            <template #action="{ rowIndex }">
              <t-button
                theme="danger"
                variant="text"
                size="small"
                :disabled="formData.items.length <= 1"
                @click="removeItem(rowIndex)"
              >
                <template #icon><t-icon name="delete" /></template>
                删除
              </t-button>
            </template>
          </t-table>

          <div class="total-amount">
            <span class="total-label">订单总金额：</span>
            <span class="total-value">{{ formatAmount(totalAmount) }}</span>
          </div>
        </div>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <t-space>
            <t-button theme="primary" type="submit" :loading="submitting">
              {{ isEdit ? '保存修改' : '创建订单' }}
            </t-button>
            <t-button variant="outline" @click="goBack">取消</t-button>
          </t-space>
        </div>
      </t-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productApi, type Product } from '@/api/product'
import { orderApi, type Order } from '@/api/order'
import { customerApi, type Customer } from '@/api/customer'
import { MessagePlugin } from 'tdesign-vue-next'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

const formRef = ref<any>(null)
const customers = ref<Customer[]>([])
const products = ref<Product[]>([])
const submitting = ref(false)

const customerOptions = computed(() => {
  return customers.value.map((c: Customer) => ({
    label: c.name,
    value: c.id
  }))
})

// 已启用的产品作为下拉选项
const productOptions = computed(() => {
  return activeProducts.value.map((p: Product) => ({
    label: `${p.name}${p.spec ? ` (${p.spec})` : ''}`,
    value: p.id,
  }))
})

const activeProducts = computed(() => products.value.filter(p => p.status === 1))

function handleProductSelect(productId: number, rowIndex: number) {
  const p = products.value.find(p => p.id === productId)
  if (p) {
    formData.items[rowIndex].productName = p.name
    formData.items[rowIndex].productSpec = p.spec || ''
    formData.items[rowIndex].unitPrice = Number(p.defaultPrice) || 0
  }
}

const formData = reactive({
  customerId: undefined as number | undefined,
  orderDate: new Date().toISOString().slice(0, 10),
  invoiceRequirement: '无需开票',
  remark: '',
  items: [{
    productId: undefined as number | undefined,
    productName: '',
    productSpec: '',
    unitPrice: 0,
    quantity: 1
  }] as { productId?: number; productName: string; productSpec: string; unitPrice: number; quantity: number }[]
})

const formRules = {
  customerId: [{ required: true, message: '请选择客户', type: 'error', trigger: 'change' }],
  orderDate: [{ required: true, message: '请选择下单日期', type: 'error', trigger: 'change' }]
}

const itemColumns = [
  { colKey: 'productName', title: '产品名称', cell: 'productName' },
  { colKey: 'productSpec', title: '规格型号', cell: 'productSpec' },
  { colKey: 'unitPrice', title: '单价', cell: 'unitPrice' },
  { colKey: 'quantity', title: '数量', cell: 'quantity' },
  { colKey: 'subtotal', title: '小计', cell: 'subtotal' },
  { colKey: 'action', title: '操作', cell: 'action', width: 80 }
]

const totalAmount = computed(() => {
  return formData.items.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity)
  }, 0)
})

function formatAmount(val: number): string {
  return '¥' + val.toFixed(2)
}

function addItem(): void {
  formData.items.push({
    productId: undefined,
    productName: '',
    productSpec: '',
    unitPrice: 0,
    quantity: 1
  })
}

function removeItem(index: number): void {
  if (formData.items.length <= 1) return
  formData.items.splice(index, 1)
}

function goBack(): void {
  router.push('/orders')
}

async function loadCustomers(): Promise<void> {
  try {
    const res = await customerApi.getAll()
    customers.value = res.data || []
  } catch (err) {
    console.error('Failed to load customers:', err)
    MessagePlugin.error('加载客户列表失败')
  }
}

async function loadProducts(): Promise<void> {
  try {
    const res = await productApi.getAll()
    products.value = res.data || []
  } catch (err) {
    console.error('Failed to load products:', err)
  }
}

async function loadOrder(id: number): Promise<void> {
  try {
    const order: Order = await orderApi.getOne(id)
    formData.customerId = order.customerId
    formData.orderDate = order.orderDate ? order.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
    formData.invoiceRequirement = order.invoiceRequirement || '无需开票'
    formData.remark = order.remark || ''
    if (order.items && order.items.length > 0) {
      formData.items = order.items.map((item: any) => ({
        productId: item.productId || undefined,
        productName: item.productName || '',
        productSpec: item.productSpec || '',
        unitPrice: item.unitPrice || 0,
        quantity: item.quantity || 1
      }))
    }
  } catch (err) {
    console.error('Failed to load order:', err)
    MessagePlugin.error('加载订单信息失败')
  }
}

async function onSubmit({ validateResult }: { validateResult: any }): Promise<void> {
  if (validateResult !== true) {
    MessagePlugin.warning('请完善表单信息')
    return
  }

  // 校验至少有一行产品有名称
  const hasValidItem = formData.items.some(item => item.productName.trim() !== '')
  if (!hasValidItem) {
    MessagePlugin.warning('请至少添加一行有效的产品明细')
    return
  }

  submitting.value = true
  try {
    const payload = {
      customerId: formData.customerId!,
      orderDate: formData.orderDate,
      invoiceRequirement: formData.invoiceRequirement,
      remark: formData.remark,
      items: formData.items.map(item => ({
        productName: item.productName,
        productSpec: item.productSpec,
        unitPrice: item.unitPrice,
        quantity: item.quantity
      }))
    }

    if (isEdit.value) {
      await orderApi.update(Number(route.params.id), payload)
      MessagePlugin.success('订单更新成功')
    } else {
      await orderApi.create(payload)
      MessagePlugin.success('订单创建成功')
    }
    router.push('/orders')
  } catch (err: any) {
    console.error('Failed to submit order:', err)
    MessagePlugin.error(err?.response?.data?.message || err?.message || '提交订单失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCustomers(), loadProducts()])
  if (isEdit.value) {
    await loadOrder(Number(route.params.id))
  }
})
</script>

<style scoped>
.order-form-container {
  background: #fff;
  border-radius: 4px;
  padding: 24px;
}

.form-header {
  margin-bottom: 24px;
}

.form-header h2 {
  margin: 12px 0 0 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.form-body {
  max-width: 900px;
}

.items-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.items-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.subtotal-value {
  color: #0052d9;
  font-weight: 500;
}

.total-amount {
  margin-top: 16px;
  text-align: right;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.total-label {
  font-size: 14px;
  color: #666;
}

.total-value {
  font-size: 20px;
  font-weight: 700;
  color: #e34d59;
  margin-left: 8px;
}

.form-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}
</style>
