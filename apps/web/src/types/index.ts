// ─── Auth ─────────────────────────────────────────────

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
}

export interface Company {
  id: string
  name: string
  legalName: string | null
  vatNumber: string | null
  currency: string
}

export interface UserCompany {
  id: string
  userId: string
  companyId: string
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'WAITER'
  isActive: boolean
  company: Company
}

export interface AuthResponse {
  accessToken: string
  user: User
  companies: UserCompany[]
}

// ─── POS ──────────────────────────────────────────────

export interface Table {
  id: string
  companyId: string
  name: string
  section: string
  capacity: number
  posX: number
  posY: number
  width: number
  height: number
  isActive: boolean
  currentOrder?: Order | null
}

export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'ADDITION' | 'RESERVEE'

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  _count?: { products: number }
}

export interface Product {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  taxRate: number
  image: string | null
  allergens: string[]
  sortOrder: number
  isActive: boolean
  stock: number | null
}

export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'READY' | 'PAID' | 'CANCELLED'
export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED'
export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED'

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  taxRate: number
  notes: string | null
  status: OrderItemStatus
  product?: Product
}

export interface Order {
  id: string
  companyId: string
  tableId: string | null
  userId: string
  orderNumber: number
  status: OrderStatus
  notes: string | null
  subtotal: number
  taxAmount: number
  total: number
  paidAt: string | null
  paymentMethod: PaymentMethod | null
  cashReceived: number | null
  cashChange: number | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  table?: Table | null
}

// ─── Stats ────────────────────────────────────────────

export interface TodayStats {
  revenue: number
  orderCount: number
  tablesOccupied: number
  tablesTotal: number
}

// ─── Company Settings ─────────────────────────────────

export interface CompanySettings {
  id: string
  companyId: string
  posMode: 'restaurant' | 'counter'
  taxRate1: number
  taxRate2: number
  taxRate3: number
  taxRate4: number
  defaultTaxRate: number
  currency: string
  receiptFooter: string | null
  printerIp: string | null
}
