<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <h1>数据大屏</h1>
      <div class="refresh-info">
        <span>最后更新：{{ lastUpdateTime }}</span>
        <t-button theme="primary" size="small" @click="refreshData" :loading="loading">
          <template #icon><t-icon name="refresh" /></template>
          刷新数据
        </t-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" v-for="(stat, index) in statsCards" :key="index" :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="stat-icon" :style="{ background: stat.color }">
          <t-icon :name="stat.icon" size="32px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <div class="chart-row">
        <div class="chart-card chart-large">
          <div class="chart-header">
            <h3>最近7天数据趋势</h3>
          </div>
          <div ref="trendChartRef" class="chart-content"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { statisticsApi, type StatisticsData } from '@/api/statistics'
import { MessagePlugin } from 'tdesign-vue-next'

const loading = ref(false)
const lastUpdateTime = ref('')
const statsData = ref<StatisticsData | null>(null)

const trendChartRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null

const statsCards = ref([
  { icon: 'user', label: '客户总数', value: 0, color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: 'gift', label: '产品总数', value: 0, color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: 'order', label: '订单总数', value: 0, color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { icon: 'money', label: '本月订单金额', value: '¥0', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
])

const loadData = async () => {
  loading.value = true
  try {
    statsData.value = await statisticsApi.getOverview()

    // 更新统计卡片
    statsCards.value[0].value = statsData.value.totalCustomers
    statsCards.value[1].value = statsData.value.totalProducts
    statsCards.value[2].value = statsData.value.totalOrders
    statsCards.value[3].value = `¥${statsData.value.monthlyOrderAmount.toFixed(2)}`

    // 更新时间
    lastUpdateTime.value = new Date().toLocaleString('zh-CN')

    // 初始化图表
    initCharts()
  } catch (error) {
    MessagePlugin.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const initCharts = () => {
  if (!statsData.value) return

  // 趋势图
  if (trendChartRef.value) {
    if (trendChart) trendChart.dispose()
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['订单数', '金额'],
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: statsData.value.recentTrend.map(t => t.date),
        axisLine: { lineStyle: { color: '#999' } }
      },
      yAxis: [
        {
          type: 'value',
          name: '订单数',
          axisLine: { lineStyle: { color: '#999' } },
          splitLine: { lineStyle: { color: '#f0f0f0' } }
        },
        {
          type: 'value',
          name: '金额',
          axisLine: { lineStyle: { color: '#999' } },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '订单数',
          type: 'bar',
          data: statsData.value.recentTrend.map(t => t.count),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ])
          },
          barWidth: '40%'
        },
        {
          name: '金额',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: statsData.value.recentTrend.map(t => t.amount),
          itemStyle: { color: '#43e97b' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(67, 233, 123, 0.3)' },
              { offset: 1, color: 'rgba(67, 233, 123, 0.05)' }
            ])
          }
        }
      ]
    })
  }
}

// 响应式调整
const handleResize = () => {
  trendChart?.resize()
}

onMounted(() => {
  loadData()
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

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.refresh-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #666;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* 图表容器 */
.charts-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.chart-content {
  height: 300px;
}
</style>
