import api from './index'

export interface ProductReportItem {
  productName: string
  productSpec: string
  orderCount: number
  totalQuantity: number
  totalAmount: number
}

export interface CustomerReportItem {
  customerId: number
  customerCode: string
  customerName: string
  contact: string
  orderCount: number
  totalConsumption: number
  totalReceived: number
  outstanding: number
}

export interface TimeReportItem {
  period: string
  newOrders: number
  invoicedAmount: number
  receivedAmount: number
}

export interface StatusReportItem {
  statusType: string
  statusValue: string
  count: number
  totalAmount: number
}

// 创建隐藏的 a 标签触发下载
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// 直接通过 API 路径下载（不经过 axios interceptor）
function downloadDirect(path: string, filename: string) {
  const token = localStorage.getItem('token')
  const baseUrl = '/api'
  const a = document.createElement('a')
  a.href = `${baseUrl}${path}`
  a.download = filename
  // 添加 Authorization header 需要 fetch
  fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => res.blob())
    .then(blob => downloadBlob(blob, filename))
    .catch(() => {})
}

export const reportsApi = {
  async getByProduct(): Promise<ProductReportItem[]> {
    return api.get<any, ProductReportItem[]>('/reports/by-product')
  },

  async getByCustomer(): Promise<CustomerReportItem[]> {
    return api.get<any, CustomerReportItem[]>('/reports/by-customer')
  },

  async getByTime(params: {
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month'
  }): Promise<TimeReportItem[]> {
    return api.get<any, TimeReportItem[]>('/reports/by-time', { params })
  },

  async getByStatus(): Promise<StatusReportItem[]> {
    return api.get<any, StatusReportItem[]>('/reports/by-status')
  },

  downloadCsv(type: string, params?: { startDate?: string; endDate?: string }) {
    let path = `/reports/csv/${type}`
    if (params?.startDate && params?.endDate) {
      path += `?startDate=${params.startDate}&endDate=${params.endDate}`
    }
    const filenameMap: Record<string, string> = {
      product: `产品汇总_${new Date().toISOString().slice(0, 10)}.csv`,
      customer: `客户对账单_${new Date().toISOString().slice(0, 10)}.csv`,
      time: `营收趋势_${new Date().toISOString().slice(0, 10)}.csv`,
      status: `状态汇总_${new Date().toISOString().slice(0, 10)}.csv`,
    }
    downloadDirect(path, filenameMap[type] || `report_${type}.csv`)
  },

  downloadPdf(customerId: number) {
    const path = `/reports/pdf/customer/${customerId}`
    downloadDirect(path, `对账单_${customerId}_${new Date().toISOString().slice(0, 10)}.pdf`)
  },
}
