import type { Item, TreeItem, Category, House, Room, Container } from '@/types'

export const formatDate = (date?: string | Date): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDateTime = (date?: string | Date): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = formatDate(d)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${dateStr} ${hours}:${minutes}`
}

export const getDaysRemaining = (expiryDate?: string): number => {
  if (!expiryDate) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const getFullPath = (item: Item): string => {
  const parts: string[] = []
  if (item.container?.room?.house?.name) {
    parts.push(item.container.room.house.name)
  }
  if (item.container?.room?.name) {
    parts.push(item.container.room.name)
  }
  if (item.container?.name) {
    parts.push(item.container.name)
  }
  return parts.join(' / ')
}

export const buildSpaceTree = (
  houses: House[],
  rooms: Room[],
  containers: Container[]
): TreeItem[] => {
  return houses.map((house) => ({
    id: house.id,
    key: `house-${house.id}`,
    title: house.name,
    type: 'house',
    children: rooms
      .filter((room) => room.house_id === house.id)
      .map((room) => ({
        id: room.id,
        key: `room-${room.id}`,
        title: room.name,
        type: 'room',
        parentId: house.id,
        children: containers
          .filter((container) => container.room_id === room.id)
          .map((container) => ({
            id: container.id,
            key: `container-${container.id}`,
            title: container.name,
            type: 'container',
            parentId: room.id,
            isLeaf: true,
          })),
      })),
  }))
}

export const buildCategoryTree = (categories: Category[]): TreeItem[] => {
  const map = new Map<string, any>()
  const roots: TreeItem[] = []

  categories.forEach((cat) => {
    map.set(cat.id, {
      id: cat.id,
      key: `category-${cat.id}`,
      title: cat.name,
      type: 'house',
      parentId: cat.parent_id,
      children: [],
    })
  })

  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      const parent = map.get(item.parentId)!
      parent.children = parent.children || []
      parent.children.push(item)
    } else {
      roots.push(item)
    }
  })

  return roots
}

export const buildCategoryCascadeOptions = (categories: Category[]) => {
  const map = new Map<string, any>()
  const roots: any[] = []

  categories.forEach((cat) => {
    map.set(cat.id, {
      value: cat.id,
      label: cat.name,
      children: [],
    })
  })

  map.forEach((item) => {
    const cat = categories.find((c) => c.id === item.value)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!
      parent.children.push(item)
    } else {
      roots.push(item)
    }
  })

  return roots
}

export const buildSpaceCascadeOptions = (
  houses: House[],
  rooms: Room[],
  containers: Container[]
) => {
  return houses.map((house) => ({
    value: `house-${house.id}`,
    label: house.name,
    children: rooms
      .filter((room) => room.house_id === house.id)
      .map((room) => ({
        value: `room-${room.id}`,
        label: room.name,
        children: containers
          .filter((container) => container.room_id === room.id)
          .map((container) => ({
            value: container.id,
            label: container.name,
          })),
      })),
  }))
}

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header] ?? ''
        const strValue = String(value)
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`
        }
        return strValue
      }).join(',')
    ),
  ].join('\n')

  const BOM = '\uFEFF'
  downloadFile(BOM + csvContent, filename, 'text/csv;charset=utf-8;')
}

export const parseCSV = (content: string): Record<string, any>[] => {
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const obj: Record<string, any> = {}
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() ?? ''
    })
    return obj
  })
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
