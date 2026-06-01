import api from './index'

export interface DeliveryAddress {
  address: string
  contact?: string
  phone?: string
  isDefault?: boolean
}

export interface Customer {
  id: number
  code: string
  name: string
  customerCode?: string
  contact?: string
  phone?: string
  paymentMethod?: string
  deliveryAddresses?: DeliveryAddress[]
  address?: string
  remark?: string
  orderCount?: number
  totalConsumption?: number
  outstandingAmount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerData {
  name: string
  customerCode?: string
  contact?: string
  phone?: string
  paymentMethod?: string
  deliveryAddresses?: DeliveryAddress[]
  address?: string
  remark?: string
}

export interface CustomerListResult {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}

export const customerApi = {
  getAll(keyword?: string, page?: number, pageSize?: number, sortField?: string, sortOrder?: string) {
    const params: any = {}
    if (keyword) params.keyword = keyword
    if (page) params.page = page
    if (pageSize) params.pageSize = pageSize
    if (sortField) params.sortField = sortField
    if (sortOrder) params.sortOrder = sortOrder
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

  updateDeliveryAddresses(id: number, deliveryAddresses: DeliveryAddress[]) {
    return api.patch<any, Customer>(`/customers/${id}`, { deliveryAddresses })
  },

  delete(id: number) {
    return api.delete(`/customers/${id}`)
  },

  getOrders(id: number) {
    return api.get<any, any[]>(`/customers/${id}/orders`)
  }
}
