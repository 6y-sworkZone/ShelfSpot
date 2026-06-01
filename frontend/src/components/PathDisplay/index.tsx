import { useState } from 'react'
import { Tag, Popover, Button } from 'antd'
import {
  HomeOutlined,
  ApartmentOutlined,
  InboxOutlined,
  RightOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Item } from '@/types'

interface PathDisplayProps {
  item: Item
  onContainerClick?: (containerId: string) => void
}

const PathDisplay = ({ item, onContainerClick }: PathDisplayProps) => {
  const navigate = useNavigate()
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
      id: house.id,
    })
  }
  if (room) {
    parts.push({
      type: 'room',
      name: room.name,
      icon: <ApartmentOutlined />,
      color: 'cyan',
      id: room.id,
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

  const handleNavigateToSpace = (part: Part) => {
    if (part.type === 'container' && part.id && onContainerClick) {
      onContainerClick(part.id)
    } else {
      navigate(`/space?type=${part.type}&id=${part.id}`)
    }
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
                  cursor: 'pointer',
                  margin: 0,
                }}
                onClick={() => handleNavigateToSpace(part)}
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
        <div style={{ minWidth: 200 }}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: '#666', fontSize: 12 }}>
            点击跳转查看对应层级物品
          </div>
          {parts.map((part, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: index < parts.length - 1 ? 4 : 0 }}>
              {part.icon}
              <span>{part.name}</span>
              <Button
                type="link"
                size="small"
                style={{ marginLeft: 'auto', padding: 0 }}
                icon={<ArrowRightOutlined />}
                onClick={() => handleNavigateToSpace(part)}
              >
                跳转
              </Button>
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
