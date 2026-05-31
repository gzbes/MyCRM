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

export interface AttachmentData {
  id: number
  orderId: number
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export interface PaymentRecord {
  amount: number
  method: string
  date: string
}

export interface StatusLogData {
  id: number
  orderId: number
  statusType: string
  oldStatus: string
  newStatus: string
  operator: string
  createdAt: string
}

export interface Order {
  id: number
  code: string
  customerId: number
  customer?: { id: number; name: string; code: string }
  orderDate: string
  totalAmount: string
  orderStatus: string
  invoiceStatus: string
  invoiceRequirement: string
  invoiceNo?: string
  invoiceFile?: string
  paymentStatus: string
  receivedAmount: string
  paymentMethod?: string
  paymentDate?: string
  paymentRecords?: PaymentRecord[]
  remark?: string
  items: OrderItem[]
  attachments?: AttachmentData[]
  statusLogs?: StatusLogData[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderData {
  customerId: number
  orderDate?: string
  remark?: string
  invoiceRequirement?: string
  items: { productId?: number; productName: string; productSpec?: string; unitPrice: number; quantity: number }[]
}

export interface OrderListResult {
  data: Order[]
  total: number
  page: number
  pageSize: number
}

export const orderApi = {
  getAll(params: {
    keyword?: string
    customerId?: number
    orderStatus?: string
    invoiceStatus?: string
    paymentStatus?: string
    page?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
  }) {
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
  },

  changeStatus(id: number, data: {
    statusType: string
    newStatus: string
    receivedAmount?: number
    paymentMethod?: string
    paymentDate?: string
    invoiceNo?: string
  }) {
    return api.patch<any, Order>(`/orders/${id}/status`, data)
  },

  uploadAttachment(orderId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    // 不显式设置 Content-Type，让 axios 自动带 boundary
    return api.post<any, AttachmentData>(`/orders/${orderId}/attachments`, formData)
  },

  deleteAttachment(orderId: number, attachmentId: number) {
    return api.delete(`/orders/${orderId}/attachments/${attachmentId}`)
  },

  getFileUrl(orderId: number, filename: string): string {
    return `/api/uploads/orders/${orderId}/${filename}`
  },
}
