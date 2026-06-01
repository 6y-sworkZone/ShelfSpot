import { useState } from 'react'
import { Tag, Popover } from 'antd'
import { HomeOutlined, ApartmentOutlined, InboxOutlined, RightOutlined } from '@ant-design/icons'
import type { Item } from '@/types'

interface PathDisplayProps {
  item: Item
  onContainerClick?: (containerId: string) => void
}

const PathDisplay = ({ item, onContainerClick }: PathDisplayProps) => {
  const [expanded, setExpanded] = useState(false)

  if (!item.container) {
    return <span style={{ color: '#999' }}>未设置位置</span>
  }

  interface Part {
    type: string
    name: string
    icon: React.ReactNode
    color: string
    id?: string
  }
  const parts: Part[] = []
  const house = item.container.room?.house
  const room = item.container.room
  const container = item.container

  if (house) {
    parts.push({
      type: 'house',
      name: house.name,
      icon: <HomeOutlined />,
      color: 'blue',
    })
  }
  if (room) {
    parts.push({
      type: 'room',
      name: room.name,
      icon: <ApartmentOutlined />,
      color: 'cyan',
    })
  }
  if (container) {
    parts.push({
      type: 'container',
      name: container.name,
      icon: <InboxOutlined />,
      color: 'geekblue',
      id: container.id,
    })
  }

  const handleClick = (part: Part) => {
    if (part.type === 'container' && part.id && onContainerClick) {
      onContainerClick(part.id)
    }
    setExpanded(!expanded)
  }

  const renderPath = () => {
    if (expanded) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {parts.map((part, index) => (
            <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {index > 0 && <RightOutlined style={{ color: '#999', fontSize: 10 }} />}
              <Tag
                icon={part.icon}
                color={part.color}
                style={{
                  cursor: part.type === 'container' && onContainerClick ? 'pointer' : 'default',
                  margin: 0,
                }}
                onClick={() => handleClick(part)}
              >
                {part.name}
              </Tag>
            </span>
          ))}
        </div>
      )
    }

    const fullPath = parts.map((p) => p.name).join(' / ')
    return (
      <span
        style={{
          cursor: 'pointer',
          color: '#1890ff',
        }}
        onClick={() => setExpanded(true)}
      >
        {fullPath}
      </span>
    )
  }

  return (
    <Popover
      content={
        <div>
          {parts.map((part, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: index < parts.length - 1 ? 4 : 0 }}>
              {part.icon}
              <span>{part.name}</span>
              {part.type === 'container' && onContainerClick && (
                <Tag
                  color="geekblue"
                  style={{ marginLeft: 'auto', cursor: 'pointer' }}
                  onClick={() => handleClick(part)}
                >
                  查看物品
                </Tag>
              )}
            </div>
          ))}
        </div>
      }
      title="完整位置"
      trigger="hover"
    >
      {renderPath()}
    </Popover>
  )
}

export default PathDisplay
