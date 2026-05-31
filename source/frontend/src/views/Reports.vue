<template>
  <div class="reports-page">
    <!-- 页头 -->
    <div class="page-header">
      <h2>报表中心</h2>
    </div>

    <!-- Tab 切换 -->
    <t-tabs v-model="activeTab" @change="onTabChange">
      <!-- 产品汇总 -->
      <t-tab-panel value="product" label="产品汇总">
        <div class="toolbar">
          <t-button theme="default" @click="reportsApi.downloadCsv('product')">
            <template #icon><t-icon name="download" /></template>
            导出 CSV
          </t-button>
        </div>
        <div v-if="productLoading" class="loading-wrap"><t-loading /></div>
        <template v-else>
          <div v-if="productData.length === 0" class="empty-wrap">暂无数据</div>
          <template v-else>
            <div ref="productChartRef" class="chart-large"></div>
            <t-table
              :data="productData"
              :columns="productColumns"
              row-key="productName"
              stripe
              size="small"
              style="margin-top: 16px"
            />
          </template>
        </template>
      </t-tab-panel>

      <!-- 客户对账单 -->
      <t-tab-panel value="customer" label="客户对账单">
        <div class="toolbar">
          <t-button theme="default" @click="reportsApi.downloadCsv('customer')">
            <template #icon><t-icon name="download" /></template>
            导出 CSV
          </t-button>
        </div>
        <div v-if="customerLoading" class="loading-wrap"><t-loading /></div>
        <div v-else-if="customerData.length === 0" class="empty-wrap">暂无数据</div>
        <t-table
          v-else
          :data="customerData"
          :columns="customerColumns"
          row-key="customerId"
          stripe
          size="small"
          style="margin-top: 16px"
        >
          <template #actions="{ row }">
            <t-button theme="primary" size="small" @click="reportsApi.downloadPdf(row.customerId)">
              导出 PDF
            </t-button>
          </template>
        </t-table>
      </t-tab-panel>

      <!-- 营收趋势 -->
      <t-tab-panel value="time" label="营收趋势">
        <div class="toolbar">
          <div class="filter-group">
            <t-date-range-picker
              :value="timeRange"
              @change="onTimeRangeChange"
              :enable-time-picker="false"
              clearable
              style="width: 260px"
            />
            <t-select
              :value="groupBy"
              @change="onGroupByChange"
              style="width: 100px; margin-left: 8px"
            >
              <t-option value="day" label="按日" />
              <t-option value="week" label="按周" />
              <t-option value="month" label="按月" />
            </t-select>
          </div>
          <t-button theme="default" @click="reportsApi.downloadCsv('time', { startDate: timeRange[0], endDate: timeRange[1] })">
            <template #icon><t-icon name="download" /></template>
            导出 CSV
          </t-button>
        </div>
        <div v-if="timeLoading" class="loading-wrap"><t-loading /></div>
        <div v-else-if="timeData.length === 0" class="empty-wrap">暂无数据</div>
        <div v-else ref="timeChartRef" class="chart-large"></div>
      </t-tab-panel>

      <!-- 状态汇总 -->
      <t-tab-panel value="status" label="状态汇总">
        <div class="toolbar">
          <t-button theme="default" @click="reportsApi.downloadCsv('status')">
            <template #icon><t-icon name="download" /></template>
            导出 CSV
          </t-button>
        </div>
        <div v-if="statusLoading" class="loading-wrap"><t-loading /></div>
        <div v-else-if="statusData.length === 0" class="empty-wrap">暂无数据</div>
        <template v-else>
          <div class="status-charts-row">
            <div class="chart-card">
              <h4>订单状态</h4>
              <div ref="orderStatusChartRef" class="chart-medium"></div>
            </div>
            <div class="chart-card">
              <h4>开票状态</h4>
              <div ref="invoiceStatusChartRef" class="chart-medium"></div>
            </div>
            <div class="chart-card">
              <h4>收款状态</h4>
              <div ref="paymentStatusChartRef" class="chart-medium"></div>
            </div>
          </div>
          <t-table
            :data="statusData"
            :columns="statusColumns"
            row-key="statusValue"
            stripe
            size="small"
            style="margin-top: 16px"
          />
        </template>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { reportsApi, type ProductReportItem, type CustomerReportItem, type TimeReportItem, type StatusReportItem } from '@/api/reports'

const activeTab = ref('product')

// ── 数据 ──
const productData = ref<ProductReportItem[]>([])
const customerData = ref<CustomerReportItem[]>([])
const timeData = ref<TimeReportItem[]>([])
const statusData = ref<StatusReportItem[]>([])

const productLoading = ref(false)
const customerLoading = ref(false)
const timeLoading = ref(false)
const statusLoading = ref(false)

const timeRange = ref<string[]>([])
const groupBy = ref<'day' | 'week' | 'month'>('day')

// ── 图表 ref ──
const productChartRef = ref<HTMLElement>()
const timeChartRef = ref<HTMLElement>()
const orderStatusChartRef = ref<HTMLElement>()
const invoiceStatusChartRef = ref<HTMLElement>()
const paymentStatusChartRef = ref<HTMLElement>()

let productChart: echarts.ECharts | null = null
let timeChart: echarts.ECharts | null = null
const orderStatusChart = { current: null as echarts.ECharts | null }
const invoiceStatusChart = { current: null as echarts.ECharts | null }
const paymentStatusChart = { current: null as echarts.ECharts | null }

// ── 列定义 ──
const productColumns = [
  { colKey: 'productName', title: '产品名称', width: 180 },
  { colKey: 'productSpec', title: '规格型号', width: 120 },
  { colKey: 'orderCount', title: '订单数', width: 80 },
  { colKey: 'totalQuantity', title: '总销量', width: 80 },
  { colKey: 'totalAmount', title: '总金额', width: 120, cell: (_h: any, { row }: any) => `¥${Number(row.totalAmount).toFixed(2)}` },
]

const customerColumns = [
  { colKey: 'customerCode', title: '客户编号', width: 160 },
  { colKey: 'customerName', title: '客户名称', width: 140 },
  { colKey: 'contact', title: '联系人', width: 100 },
  { colKey: 'orderCount', title: '订单数', width: 70 },
  { colKey: 'totalConsumption', title: '累计消费', width: 120, cell: (_h: any, { row }: any) => `¥${Number(row.totalConsumption).toFixed(2)}` },
  { colKey: 'totalReceived', title: '已收款', width: 120, cell: (_h: any, { row }: any) => `¥${Number(row.totalReceived).toFixed(2)}` },
  { colKey: 'outstanding', title: '未结清', width: 120, cell: (_h: any, { row }: any) => `¥${Number(row.outstanding).toFixed(2)}` },
  { colKey: 'actions', title: '操作', width: 100 },
]

const statusColumns = [
  { colKey: 'statusType', title: '状态类型', width: 100 },
  { colKey: 'statusValue', title: '状态值', width: 150 },
  { colKey: 'count', title: '订单数', width: 80 },
  { colKey: 'totalAmount', title: '总金额', width: 120, cell: (_h: any, { row }: any) => `¥${Number(row.totalAmount).toFixed(2)}` },
]

// ── 初始日期 ──
function initTimeRange() {
  const now = new Date()
  const past = new Date(now)
  past.setDate(past.getDate() - 30)
  timeRange.value = [
    past.toISOString().slice(0, 10),
    now.toISOString().slice(0, 10),
  ]
}

// ── 加载数据 ──
async function loadProduct() {
  productLoading.value = true
  try {
    productData.value = await reportsApi.getByProduct()
  } catch (e) {
    console.error('[Reports] loadProduct error:', e)
  } finally {
    productLoading.value = false
  }
  // 先释放 loading，让 DOM 渲染 ref 元素，再初始化图表
  await nextTick()
  renderProductChart()
}

async function loadCustomer() {
  customerLoading.value = true
  try {
    customerData.value = await reportsApi.getByCustomer()
  } catch (e) {
    console.error('[Reports] loadCustomer error:', e)
  } finally {
    customerLoading.value = false
  }
}

async function loadTime() {
  timeLoading.value = true
  try {
    timeData.value = await reportsApi.getByTime({
      startDate: timeRange.value[0],
      endDate: timeRange.value[1],
      groupBy: groupBy.value,
    })
  } catch (e) {
    console.error('[Reports] loadTime error:', e)
  } finally {
    timeLoading.value = false
  }
  await nextTick()
  renderTimeChart()
}

async function loadStatus() {
  statusLoading.value = true
  try {
    statusData.value = await reportsApi.getByStatus()
  } catch (e) {
    console.error('[Reports] loadStatus error:', e)
  } finally {
    statusLoading.value = false
  }
  await nextTick()
  renderStatusCharts()
}

function onTabChange(value: string) {
  activeTab.value = value
  if (value === 'product') loadProduct()
  else if (value === 'customer') loadCustomer()
  else if (value === 'time') loadTime()
  else if (value === 'status') loadStatus()
}

function onTimeRangeChange(value: string[]) {
  timeRange.value = value
  loadTime()
}

function onGroupByChange(value: 'day' | 'week' | 'month') {
  groupBy.value = value
  loadTime()
}

// ── 产品排行图表（横向柱状图）──
function renderProductChart() {
  if (!productChartRef.value || productData.value.length === 0) return
  if (productChart) productChart.dispose()
  productChart = echarts.init(productChartRef.value)

  const top10 = productData.value.slice(0, 10).reverse()
  productChart.setOption({
    title: { text: '产品销量排行 Top 10', left: 'center' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: { type: 'value', name: '总金额 (¥)' },
    yAxis: {
      type: 'category',
      data: top10.map(r => r.productName + (r.productSpec ? ` (${r.productSpec})` : '')),
    },
    series: [
      {
        type: 'bar',
        data: top10.map(r => r.totalAmount),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#43e97b' },
            { offset: 1, color: '#38f9d7' },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: any) => `¥${p.value.toFixed(2)}`,
        },
      },
    ],
  })
}

// ── 营收趋势图表（柱状图+折线图）──
function renderTimeChart() {
  if (!timeChartRef.value || timeData.value.length === 0) return
  if (timeChart) timeChart.dispose()
  timeChart = echarts.init(timeChartRef.value)

  timeChart.setOption({
    title: { text: '营收趋势', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['新增订单数', '已开票金额', '实收金额'], top: 30 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: timeData.value.map(r => r.period),
      axisLabel: { rotate: groupBy.value === 'day' ? 45 : 0 },
    },
    yAxis: [
      { type: 'value', name: '订单数' },
      { type: 'value', name: '金额 (¥)' },
    ],
    series: [
      {
        name: '新增订单数',
        type: 'bar',
        data: timeData.value.map(r => r.newOrders),
        itemStyle: { color: '#667eea' },
        barWidth: '30%',
      },
      {
        name: '已开票金额',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: timeData.value.map(r => r.invoicedAmount),
        itemStyle: { color: '#f093fb' },
      },
      {
        name: '实收金额',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: timeData.value.map(r => r.receivedAmount),
        itemStyle: { color: '#43e97b' },
      },
    ],
  })
}

// ── 状态汇总图表（饼图）──
const statusChartColors: Record<string, string> = {
  '待处理': '#f093fb',
  '生产中': '#4facfe',
  '已发货': '#43e97b',
  '已完成': '#38f9d7',
  '已取消': '#999',
  '未开票': '#f093fb',
  '已开增值税专用发票': '#667eea',
  '已开普通发票': '#43e97b',
  '无需开票': '#999',
  '未收款': '#f093fb',
  '部分收款': '#4facfe',
  '已结清': '#43e97b',
}

function renderStatusCharts() {
  renderSinglePie(orderStatusChartRef.value, orderStatusChart, 'order')
  renderSinglePie(invoiceStatusChartRef.value, invoiceStatusChart, 'invoice')
  renderSinglePie(paymentStatusChartRef.value, paymentStatusChart, 'payment')
}

function renderSinglePie(refEl: HTMLElement | undefined, chartVar: { current: echarts.ECharts | null }, type: string) {
  if (!refEl) return
  if (chartVar.current) chartVar.current.dispose()
  const chart = echarts.init(refEl)
  chartVar.current = chart

  const filtered = statusData.value.filter(r => r.statusType === type)
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `${p.name}: ${p.value} 单 (¥${Number(p.data.amount).toFixed(2)})`,
    },
    series: [
      {
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '50%'],
        data: filtered.map(r => ({
          name: r.statusValue,
          value: r.count,
          amount: r.totalAmount,
          itemStyle: { color: statusChartColors[r.statusValue] || '#667eea' },
        })),
        label: { formatter: (p: any) => `${p.name}\n${p.value} 单` },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
        },
      },
    ],
  })
}

// ── 响应式 ──
const handleResize = () => {
  productChart?.resize()
  timeChart?.resize()
  orderStatusChart.current?.resize()
  invoiceStatusChart.current?.resize()
  paymentStatusChart.current?.resize()
}

onMounted(() => {
  initTimeRange()
  loadProduct()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  productChart?.dispose()
  timeChart?.dispose()
  orderStatusChart.current?.dispose()
  invoiceStatusChart.current?.dispose()
  paymentStatusChart.current?.dispose()
})
</script>

<style scoped>
.reports-page {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.empty-wrap {
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 14px;
}

.chart-large {
  width: 100%;
  height: 420px;
}

.chart-medium {
  width: 100%;
  height: 280px;
}

.status-charts-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.chart-card {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
}

.chart-card h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

@media (max-width: 900px) {
  .status-charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
