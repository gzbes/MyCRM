import api from './index'

export interface Product {
  id: number
  name: string
  spec?: string
  defaultPrice: string
  status: number
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProductData {
  name: string
  spec?: string
  defaultPrice?: number
  remark?: string
}

export interface ProductListResult {
  data: Product[]
  total: number
  page: number
  pageSize: number
}

export const productApi = {
  getAll(keyword?: string, page?: number, pageSize?: number, sortField?: string, sortOrder?: string) {
    const params: any = {}
    if (keyword) params.keyword = keyword
    if (page) params.page = page
    if (pageSize) params.pageSize = pageSize
    if (sortField) params.sortField = sortField
    if (sortOrder) params.sortOrder = sortOrder
    return api.get<any, ProductListResult>('/products', { params })
  },

  getOne(id: number) {
    return api.get<any, Product>(`/products/${id}`)
  },

  create(data: CreateProductData) {
    return api.post<any, Product>('/products', data)
  },

  update(id: number, data: Partial<CreateProductData>) {
    return api.patch<any, Product>(`/products/${id}`, data)
  },

  delete(id: number) {
    return api.delete(`/products/${id}`)
  },

  toggleStatus(id: number) {
    return api.patch<any, Product>(`/products/${id}/toggle-status`)
  }
}
