import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Modal,
} from 'antd'
import {
  CloseOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import CategoryTree from '@/components/CategoryTree'
import PathDisplay from '@/components/PathDisplay'
import { getIdleItems, toggleItemIdle } from '@/api'
import type { Item } from '@/types'
import { formatDate } from '@/utils/common'

const IdleItems = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async (categoryId: string | null = selectedCategoryId) => {
    setLoading(true)
    try {
      const data = await getIdleItems(categoryId || undefined)
      setItems(data)
    } catch (error) {
      console.error('Failed to load idle items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCategoryId])

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
  }

  const handleCancelIdle = async (item: Item) => {
    Modal.confirm({
      title: '确认取消闲置',
      content: `确定要取消物品"${item.name}"的闲置标记吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await toggleItemIdle(item.id)
          message.success('已取消闲置')
          setItems((prev) => prev.filter((i) => i.id !== item.id))
        } catch (error) {
          console.error('Cancel idle failed:', error)
        }
      },
    })
  }

  const columns = [
    {
      title: '物品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (name: string) => <Tag color="blue">{name || '未分类'}</Tag>,
      width: 120,
    },
    {
      title: '位置路径',
      key: 'path',
      render: (_: unknown, record: Item) => (
        <PathDisplay item={record} />
      ),
    },
    {
      title: '购入日期',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date: string) => formatDate(date),
      width: 120,
    },
    {
      title: '闲置天数',
      key: 'idle_days',
      render: (_: unknown, record: Item) => {
        if (!record.updated_at) return '-'
        const idleDate = new Date(record.updated_at)
        const today = new Date()
        const diffTime = today.getTime() - idleDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            {diffDays} 天
          </Tag>
        )
      },
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Item) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<CloseOutlined />}
          onClick={() => handleCancelIdle(record)}
        >
          取消闲置
        </Button>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card
        title="分类筛选"
        style={{ width: 280, flexShrink: 0 }}
        bodyStyle={{ height: 'calc(100% - 74px)', overflow: 'auto' }}
      >
        <CategoryTree onSelect={handleCategorySelect} />
      </Card>

      <Card
        title={
          <Space>
            <span>闲置物品</span>
            <Tag color="orange">共 {items.length} 件</Tag>
            <Button icon={<ReloadOutlined />} onClick={() => loadData()} size="small">
              刷新
            </Button>
          </Space>
        }
        style={{ flex: 1 }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                  {items.length}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>闲置物品总数</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>总数量</div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                  {new Set(items.map((item) => item.category_id)).size}
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>涉及分类</div>
              </div>
            </Card>
          </Col>
        </Row>

        <Spin spinning={loading}>
          {items.length > 0 ? (
            <Table
              columns={columns}
              dataSource={items}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          ) : (
            <Empty
              description={
                selectedCategoryId
                  ? '该分类下暂无闲置物品'
                  : '暂无闲置物品'
              }
              style={{ marginTop: 60 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default IdleItems
