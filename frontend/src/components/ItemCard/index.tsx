import { Card, Tag, Button, Image, Tooltip, Badge } from 'antd'
import {
  InboxOutlined,
  TagOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import type { Item } from '@/types'
import { formatDate, getDaysRemaining } from '@/utils/common'
import PathDisplay from '../PathDisplay'

interface ItemCardProps {
  item: Item
  showIdleButton?: boolean
  onToggleIdle?: (item: Item) => void
  onContainerClick?: (containerId: string) => void
}

const ItemCard = ({ item, showIdleButton = false, onToggleIdle, onContainerClick }: ItemCardProps) => {
  const daysRemaining = item.expiry_date ? getDaysRemaining(item.expiry_date) : Infinity

  const getExpiryStatus = () => {
    if (daysRemaining === Infinity) return null
    if (daysRemaining < 0) {
      return { color: 'red', text: `已过期 ${Math.abs(daysRemaining)} 天` }
    }
    if (daysRemaining <= 30) {
      return { color: 'orange', text: `剩余 ${daysRemaining} 天` }
    }
    return { color: 'green', text: `剩余 ${daysRemaining} 天` }
  }

  const expiryStatus = getExpiryStatus()

  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      bodyStyle={{ padding: 16 }}
      cover={
        item.photos && item.photos.length > 0 ? (
          <div style={{ height: 180, overflow: 'hidden' }}>
            <Image
              src={item.photos[0]}
              alt={item.name}
              style={{ width: '100%', height: 180, objectFit: 'cover' }}
              preview={false}
            />
            {item.photos.length > 1 && (
              <Tag
                color="default"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                }}
              >
                +{item.photos.length - 1}
              </Tag>
            )}
          </div>
        ) : (
          <div
            style={{
              height: 180,
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InboxOutlined style={{ fontSize: 48, color: '#ccc' }} />
          </div>
        )
      }
    >
      <Card.Meta
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 500 }}>{item.name}</span>
            {item.is_idle && (
              <Badge status="warning" text="闲置" />
            )}
            {item.is_expiry_handled && (
              <Badge status="success" text="已处理" />
            )}
          </div>
        }
        description={
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              <Tag icon={<TagOutlined />} color="blue">
                {item.category?.name || '未分类'}
              </Tag>
              <Tag color="purple">数量: {item.quantity}</Tag>
              {expiryStatus && (
                <Tag color={expiryStatus.color} icon={<ClockCircleOutlined />}>
                  {expiryStatus.text}
                </Tag>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 12 }}>位置：</span>
              <PathDisplay item={item} onContainerClick={onContainerClick} />
            </div>
            {item.purchase_date && (
              <div style={{ color: '#888', fontSize: 12 }}>
                购入日期：{formatDate(item.purchase_date)}
              </div>
            )}
            {item.expiry_date && (
              <div style={{ color: '#888', fontSize: 12 }}>
                保质期：{formatDate(item.expiry_date)}
              </div>
            )}
          </div>
        }
      />
      {showIdleButton && (
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Tooltip title={item.is_idle ? '取消闲置' : '标记闲置'}>
            <Button
              type={item.is_idle ? 'default' : 'primary'}
              danger={item.is_idle}
              icon={item.is_idle ? <CloseOutlined /> : <CheckOutlined />}
              size="small"
              onClick={() => onToggleIdle?.(item)}
            >
              {item.is_idle ? '取消闲置' : '标记闲置'}
            </Button>
          </Tooltip>
        </div>
      )}
    </Card>
  )
}

export default ItemCard
