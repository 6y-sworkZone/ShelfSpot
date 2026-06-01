import request from '@/utils/request'
import type {
  HealthCheckResponse,
  House,
  Room,
  Container,
  Category,
  Item,
  TreeItem,
  CategoryTreeItem,
  StatsOverview,
  ReminderResponse,
  MovingSummary,
  ImportResult,
  PieChartData,
} from '@/types'

export const getHealthCheck = () => {
  return request<unknown, HealthCheckResponse>('/health') as Promise<HealthCheckResponse>
}

export const getTree = () => {
  return request<unknown, TreeItem[]>('/tree') as Promise<TreeItem[]>
}

export const getHouses = () => {
  return request<unknown, House[]>('/houses') as Promise<House[]>
}

export const getHouse = (id: string) => {
  return request<unknown, House>(`/houses/${id}`) as Promise<House>
}

export const createHouse = (data: { name: string; remark?: string }) => {
  return request<unknown, House>('/houses', {
    method: 'POST',
    data,
  }) as Promise<House>
}

export const updateHouse = (id: string, data: { name?: string; remark?: string }) => {
  return request<unknown, House>(`/houses/${id}`, {
    method: 'PUT',
    data,
  }) as Promise<House>
}

export const deleteHouse = (id: string) => {
  return request<unknown, void>(`/houses/${id}`, {
    method: 'DELETE',
  }) as Promise<void>
}

export const getRooms = (houseId?: string) => {
  const params = houseId ? { house_id: houseId } : {}
  return request<unknown, Room[]>('/rooms', { params }) as Promise<Room[]>
}

export const getRoom = (id: string) => {
  return request<unknown, Room>(`/rooms/${id}`) as Promise<Room>
}

export const createRoom = (data: { house_id: string; name: string; remark?: string }) => {
  return request<unknown, Room>('/rooms', {
    method: 'POST',
    data,
  }) as Promise<Room>
}

export const updateRoom = (id: string, data: { name?: string; remark?: string }) => {
  return request<unknown, Room>(`/rooms/${id}`, {
    method: 'PUT',
    data,
  }) as Promise<Room>
}

export const deleteRoom = (id: string) => {
  return request<unknown, void>(`/rooms/${id}`, {
    method: 'DELETE',
  }) as Promise<void>
}

export const getContainers = (roomId?: string) => {
  const params = roomId ? { room_id: roomId } : {}
  return request<unknown, Container[]>('/containers', { params }) as Promise<Container[]>
}

export const getContainer = (id: string) => {
  return request<unknown, Container>(`/containers/${id}`) as Promise<Container>
}

export const createContainer = (data: {
  room_id: string
  name: string
  remark?: string
  location?: string
  capacity?: string
}) => {
  return request<unknown, Container>('/containers', {
    method: 'POST',
    data,
  }) as Promise<Container>
}

export const updateContainer = (
  id: string,
  data: { name?: string; remark?: string; location?: string; capacity?: string }
) => {
  return request<unknown, Container>(`/containers/${id}`, {
    method: 'PUT',
    data,
  }) as Promise<Container>
}

export const deleteContainer = (id: string) => {
  return request<unknown, void>(`/containers/${id}`, {
    method: 'DELETE',
  }) as Promise<void>
}

export const getCategoryTree = () => {
  return request<unknown, CategoryTreeItem[]>('/categories/tree') as Promise<CategoryTreeItem[]>
}

export const getCategories = (parentId?: string | null) => {
  const params = parentId !== undefined ? { parent_id: parentId } : {}
  return request<unknown, Category[]>('/categories', { params }) as Promise<Category[]>
}

export const getCategory = (id: string) => {
  return request<unknown, Category>(`/categories/${id}`) as Promise<Category>
}

export const createCategory = (data: { name: string; parent_id?: string | null }) => {
  return request<unknown, Category>('/categories', {
    method: 'POST',
    data,
  }) as Promise<Category>
}

export const updateCategory = (id: string, data: { name?: string; parent_id?: string | null }) => {
  return request<unknown, Category>(`/categories/${id}`, {
    method: 'PUT',
    data,
  }) as Promise<Category>
}

export const deleteCategory = (id: string) => {
  return request<unknown, void>(`/categories/${id}`, {
    method: 'DELETE',
  }) as Promise<void>
}

export const getItems = (params: {
  page?: number
  page_size?: number
  container_id?: string
  room_id?: string
  house_id?: string
  category_id?: string
  search?: string
  is_idle?: boolean
}) => {
  return request<unknown, { items: Item[]; total: number }>('/items', {
    params,
  }) as Promise<{ items: Item[]; total: number }>
}

export const getItem = (id: string) => {
  return request<unknown, Item>(`/items/${id}`) as Promise<Item>
}

export const createItem = (data: {
  name: string
  quantity: number
  category_id: string
  container_id: string
  purchase_date?: string
  expiry_date?: string
  photos?: string
}) => {
  return request<unknown, Item>('/items', {
    method: 'POST',
    data,
  }) as Promise<Item>
}

export const updateItem = (
  id: string,
  data: {
    name?: string
    quantity?: number
    category_id?: string
    container_id?: string
    purchase_date?: string
    expiry_date?: string
    photos?: string
    is_idle?: boolean
    is_expiry_handled?: boolean
  }
) => {
  return request<unknown, Item>(`/items/${id}`, {
    method: 'PUT',
    data,
  }) as Promise<Item>
}

export const deleteItem = (id: string) => {
  return request<unknown, void>(`/items/${id}`, {
    method: 'DELETE',
  }) as Promise<void>
}

export const searchItems = (params: { name?: string; category_id?: string; search?: string }) => {
  return request<unknown, Item[]>('/items/search', {
    params,
  }) as Promise<Item[]>
}

export const toggleItemIdle = (id: string) => {
  return request<unknown, Item>(`/items/${id}/idle`, {
    method: 'PATCH',
  }) as Promise<Item>
}

export const markExpiryHandled = (id: string) => {
  return request<unknown, Item>(`/items/${id}/expiry-handled`, {
    method: 'PATCH',
  }) as Promise<Item>
}

export const uploadItemPhotos = (id: string, files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('photos', file)
  })
  return request<unknown, { urls: string[] }>(`/items/${id}/photos`, {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<{ urls: string[] }>
}

export const importItemsCSV = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request<unknown, ImportResult>('/items/import', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }) as Promise<ImportResult>
}

export const getReminders = () => {
  return request<unknown, ReminderResponse>('/reminders') as Promise<ReminderResponse>
}

export const markReminderHandled = (id: string) => {
  return request<unknown, ReminderResponse>(`/reminders/${id}/handled`, {
    method: 'PATCH',
  }) as Promise<ReminderResponse>
}

export const generateMovingList = (data: { room_ids?: string[]; container_ids?: string[] }) => {
  return request<unknown, MovingSummary>('/moving/generate', {
    method: 'POST',
    data,
  }) as Promise<MovingSummary>
}

export const exportMovingListCSV = (data: { room_ids?: string[]; container_ids?: string[] }) => {
  return request<unknown, Blob>('/moving/export', {
    method: 'POST',
    data,
    responseType: 'blob',
  }) as Promise<Blob>
}

export const getStatsOverview = () => {
  return request<unknown, StatsOverview>('/stats/overview') as Promise<StatsOverview>
}

export const getIdleItems = (categoryId?: string) => {
  const params = categoryId ? { category_id: categoryId } : {}
  return request<unknown, Item[]>('/stats/idle-items', { params }) as Promise<Item[]>
}

export const getCategoryPieChart = () => {
  return request<unknown, PieChartData[]>('/stats/category-pie') as Promise<PieChartData[]>
}
