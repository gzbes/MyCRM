import api from './index'

export interface StatisticsData {
  totalCustomers: number
  totalProducts: number
  totalOrders: number
  monthlyOrderAmount: number
  recentTrend: { date: string; count: number; amount: number }[]
}

export const statisticsApi = {
  async getOverview(): Promise<StatisticsData> {
    return api.get<any, StatisticsData>('/statistics/overview')
  }
}
