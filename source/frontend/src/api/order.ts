import api from './index'

export interface OrderItem {
  id: number
  orderId: number
  productId?: number
  productName: string
  productSpec?: string
  unitPrice: string
  quantity: number
  subtotal: string
}

export interface Order {
  id: number
  code: string
  customerId: number
  customer?: { id: number; name: string; code: string }
  orderDate: string
  totalAmount: string
  orderStatus: number
  invoiceStatus: number
  paymentStatus: number
  remark?: string
  items?: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderData {
  customerId: number
  orderDate: string
  totalAmount: number
  remark?: string
  items: {
    productId?: number
    productName: string
    productSpec?: string
    unitPrice: number
    quantity: number
  }[]
}

export interface OrderListResult {
  data: Order[]
  total: number
  page: number
  pageSize: number
}

export const orderApi = {
  getAll(keyword?: string, page?: number, pageSize?: number) {
    const params: any = {}
    if (keyword) params.keyword = keyword
    if (page) params.page = page
    if (pageSize) params.pageSize = pageSize
    return api.get<any, OrderListResult>('/orders', { params })
  },

  getOne(id: number) {
    return api.get<any, Order>(`/orders/${id}`)
  },

  create(data: CreateOrderData) {
    return api.post<any, Order>('/orders', data)
  },

  update(id: number, data: Partial<CreateOrderData>) {
    return api.patch<any, Order>(`/orders/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/orders/${id}`)
  }
}
