import api from './index'

export interface Customer {
  id: number
  code: string
  name: string
  contact?: string
  phone?: string
  address?: string
  orderCount?: number
  totalConsumption?: number
  outstandingAmount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerData {
  name: string
  contact?: string
  phone?: string
  address?: string
}

export interface CustomerListResult {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}

export const customerApi = {
  getAll(keyword?: string, page?: number, pageSize?: number) {
    const params: any = {}
    if (keyword) params.keyword = keyword
    if (page) params.page = page
    if (pageSize) params.pageSize = pageSize
    return api.get<any, CustomerListResult>('/customers', { params })
  },

  getOne(id: number) {
    return api.get<any, Customer>(`/customers/${id}`)
  },

  create(data: CreateCustomerData) {
    return api.post<any, Customer>('/customers', data)
  },

  update(id: number, data: Partial<CreateCustomerData>) {
    return api.patch<any, Customer>(`/customers/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/customers/${id}`)
  },

  getOrders(id: number) {
    return api.get<any, any[]>(`/customers/${id}/orders`)
  }
}
