<template>
  <div class="dashboard-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-text">
        <h1>早上好/下午好，{{ authStore.user?.name || '用户' }}</h1>
        <p>今天是 {{ todayStr }}，以下是您的经营概况</p>
      </div>
      <div class="quick-actions">
        <t-button theme="primary" @click="goTo('/customers')">
          <template #icon><t-icon name="user" /></template>
          新建客户
        </t-button>
        <t-button theme="success" @click="goTo('/products')">
          <template #icon><t-icon name="gift" /></template>
          新建产品
        </t-button>
        <t-button theme="warning" @click="goTo('/orders/new')">
          <template #icon><t-icon name="order" /></template>
          新建订单
        </t-button>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <div class="stats-cards" v-if="!loading">
      <div class="stat-card" v-for="(stat, index) in statsCards" :key="index">
        <div class="stat-icon" :style="{ background: stat.color }">
          <t-icon :name="stat.icon" size="28px" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 近7天营收趋势 -->
    <div class="chart-section">
      <div class="section-header">
        <h3>近7天营收趋势</h3>
        <t-button theme="default" size="small" @click="goTo('/reports')">查看完整报表</t-button>
      </div>
      <div v-if="loading" class="loading-wrap"><t-loading /></div>
      <div v-else ref="trendChartRef" class="trend-chart"></div>
    </div>

    <!-- 快捷订单列表 -->
    <div class="section-header" style="margin-top: 24px">
      <h3>待处理订单</h3>
      <t-button theme="default" size="small" @click="goTo('/orders')">查看全部</t-button>
    </div>
    <t-table
      :data="pendingOrders"
      :columns="orderColumns"
      row-key="id"
      size="small"
      stripe
      :loading="orderLoading"
      :empty="orderLoading ? undefined : '暂无待处理订单'"
    >
      <template #orderStatus="{ row }">
        <t-tag :theme="statusTheme(row.orderStatus)" variant="light">{{ row.orderStatus }}</t-tag>
      </template>
      <template #totalAmount="{ row }">¥{{ Number(row.totalAmount).toFixed(2) }}</template>
      <template #actions="{ row }">
        <t-button theme="primary" size="small" @click="goTo(`/orders/${row.id}`)">查看详情</t-button>
      </template>
    </t-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as echarts from 'echarts'
import api from '@/api'
import { reportsApi } from '@/api/reports'

const router = useRouter()
const authStore = useAuthStore()
const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const loading = ref(false)
const orderLoading = ref(false)
const trendChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null

// ── 关键指标 ──
const statsCards = ref([
  { icon: 'order', label: '今日新增订单', value: '-', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: 'money', label: '本月营收', value: '-', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { icon: 'time', label: '待处理订单', value: '-', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: 'usergroup', label: '累计客户', value: '-', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
])

// ── 待处理订单 ──
const pendingOrders = ref<any[]>([])

const orderColumns = [
  { colKey: 'code', title: '订单编号', width: 180 },
  { colKey: 'customerName', title: '客户', width: 120 },
  { colKey: 'orderDate', title: '日期', width: 110 },
  { colKey: 'orderStatus', title: '状态', width: 100 },
  { colKey: 'totalAmount', title: '金额', width: 120 },
  { colKey: 'actions', title: '操作', width: 100 },
]

function statusTheme(status: string) {
  const map: Record<string, string> = {
    '待处理': 'warning',
    '生产中': 'primary',
    '已发货': 'success',
    '已完成': 'default',
    '已取消': 'danger',
  }
  return map[status] || 'default'
}

function goTo(path: string) {
  router.push(path)
}

// ── 加载数据 ──
async function loadDashboard() {
  loading.value = true
  let timeData: Awaited<ReturnType<typeof reportsApi.getByTime>> = []
  try {
    // 获取营收趋势
    timeData = await reportsApi.getByTime({
      startDate: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      groupBy: 'day',
    })

    // 获取订单列表统计
    const today = new Date().toISOString().slice(0, 10)
    const thisMonth = today.slice(0, 7)

    // 获取所有订单（分页获取前100条）
    const [allOrders, pendingRes] = await Promise.all([
      api.get<any, { data: any[]; total: number }>('/orders', { params: { pageSize: 100 } }),
      api.get<any, { data: any[]; total: number }>('/orders', { params: { orderStatus: '待处理', pageSize: 20 } }),
    ])

    const orders = allOrders.data || []

    // 今日新增
    const todayOrders = orders.filter((o: any) => o.orderDate === today)
    statsCards.value[0].value = String(todayOrders.length)

    // 本月营收
    const monthOrders = orders.filter((o: any) => o.orderDate && o.orderDate.startsWith(thisMonth))
    const monthRevenue = monthOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0)
    statsCards.value[1].value = `¥${monthRevenue.toFixed(2)}`

    // 待处理订单数
    statsCards.value[2].value = String(pendingRes.total || 0)

    // 累计客户数（从客户列表取）
    try {
      const customerRes = await api.get<any, { total: number }>('/customers', { params: { pageSize: 1 } })
      statsCards.value[3].value = String(customerRes.total || '-')
    } catch {
      statsCards.value[3].value = String('-')
    }

    pendingOrders.value = (pendingRes.data || []).map((o: any) => ({
      ...o,
      customerName: o.customer?.name || '-',
    }))
  } catch (e) {
    console.error('[Dashboard] loadDashboard error:', e)
  } finally {
    loading.value = false
  }
  // 释放 loading 后等待 DOM 更新，再渲染图表
  if (timeData.length > 0) {
    await nextTick()
    renderTrendChart(timeData)
  }
}

function renderTrendChart(data: { period: string; receivedAmount: number }[]) {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(r => r.period.slice(5)),
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value',
      name: '金额 (¥)',
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: data.map(r => r.receivedAmount),
        itemStyle: { color: '#43e97b' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(67, 233, 123, 0.3)' },
            { offset: 1, color: 'rgba(67, 233, 123, 0.05)' },
          ]),
        },
        symbol: 'circle',
        symbolSize: 6,
        label: {
          show: true,
          formatter: (p: any) => `¥${p.value.toFixed(0)}`,
          fontSize: 10,
        },
      },
    ],
  })
}

const handleResize = () => trendChart?.resize()

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.dashboard-page {
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
  padding: 24px;
}

/* 欢迎横幅 */
.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  margin-bottom: 24px;
}

.welcome-text h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.welcome-text p {
  margin: 6px 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-actions .t-button {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

/* 图表区域 */
.chart-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.trend-chart {
  width: 100%;
  height: 260px;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>
