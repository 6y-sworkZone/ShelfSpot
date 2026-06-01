export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface HealthCheckResponse {
  status: string
  message: string
}

export interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  path: string
  children?: never
}

export interface House {
  id: string
  name: string
  remark: string
  rooms?: Room[]
  item_count?: number
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  house_id: string
  name: string
  remark: string
  house?: House
  containers?: Container[]
  item_count?: number
  created_at: string
  updated_at: string
}

export interface Container {
  id: string
  room_id: string
  name: string
  remark: string
  location: string
  capacity: string
  room?: Room
  items?: Item[]
  item_count?: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  parent_id?: string
  name: string
  parent?: Category
  children?: Category[]
  items?: Item[]
  item_count?: number
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  name: string
  quantity: number
  category_id: string
  container_id: string
  purchase_date?: string
  expiry_date?: string
  photos?: string[]
  is_idle: boolean
  is_expiry_handled: boolean
  full_path?: string
  created_at: string
  updated_at: string
  category?: Category
  container?: Container & { room?: Room & { house?: House } }
}

export interface TreeItem {
  id: string
  key: string
  title: string
  type: 'house' | 'room' | 'container'
  parentId?: string
  children?: TreeItem[]
  isLeaf?: boolean
  data?: Record<string, unknown>
}

export interface CategoryTreeItem {
  key: string
  title: string
  children?: CategoryTreeItem[]
  isLeaf?: boolean
  data?: Category
}

export interface StatsOverview {
  total_items: number
  idle_count: number
  idle_rate: number
  total_quantity: number
  idle_quantity: number
  idle_rate_by_quantity: number
  expired_count: number
  urgent_count: number
  category_stats: { id: string; name: string; count: number; ratio: number }[]
  house_stats: { id: string; name: string; count: number }[]
  room_stats: { id: string; name: string; count: number }[]
}

export interface ReminderItem {
  id: string
  name: string
  item_name: string
  expiry_date: string
  days_remaining: number
  status: 'expired' | 'urgent' | 'expiring'
  full_path: string
  is_expiry_handled: boolean
  is_handled: boolean
  item_id: string
}

export interface ReminderResponse {
  total: number
  expired: number
  urgent: number
  items: ReminderItem[]
}

export interface MovingItem {
  id: string
  name: string
  quantity: number
  category_name: string
  container_name: string
  full_path: string
}

export interface MovingSummary {
  total_items: number
  total_quantity: number
  category_counts: Record<string, number>
  room_counts: Record<string, number>
  items: MovingItem[]
}

export interface ImportResult {
  success_count: number
  fail_count: number
  errors: { row: number; message: string }[]
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface PieChartData {
  name: string
  value: number
}
