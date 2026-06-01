import { useState, useEffect } from 'react'
import { Card, Table, Button, Tag, Space, message, Spin, Empty, Modal, Alert } from 'antd'
import { EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SpaceTree from '@/components/SpaceTree'
import PathDisplay from '@/components/PathDisplay'
import { getItems, deleteItem, getHouses, getRooms, getContainers } from '@/api'
import type { Item, TreeItem } from '@/types'
import { formatDate, buildSpaceTree } from '@/utils/common'

const SpaceManagement = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedNode, setSelectedNode] = useState<TreeItem | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [navigatedFromPath, setNavigatedFromPath] = useState(false)

  const loadItems = async (node: TreeItem | null, page = 1, pageSize = 10) => {
    if (!node) {
      setItems([])
      setPagination({ current: 1, pageSize: 10, total: 0 })
      return
    }

    setLoading(true)
    try {
      const params: {
        page: number
        page_size: number
        container_id?: string
        room_id?: string
        house_id?: string
      } = {
        page,
        page_size: pageSize,
      }

      if (node.type === 'container') {
        params.container_id = node.id
      } else if (node.type === 'room') {
        params.room_id = node.id
      } else if (node.type === 'house') {
        params.house_id = node.id
      }

      const result = await getItems(params)
      setItems(result.items)
      setPagination({
        current: page,
        pageSize: pageSize,
        total: result.total,
      })
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (type && id) {
      setNavigatedFromPath(true)
      const findNodeAndSelect = async () => {
        try {
          const [houses, rooms, containers] = await Promise.all([
            getHouses(),
            getRooms(),
            getContainers(),
          ])
          const treeItems = buildSpaceTree(houses, rooms, containers)
          
          const findNode = (items: TreeItem[], targetType: string, targetId: string): TreeItem | null => {
            for (const item of items) {
              if (item.type === targetType && item.id === targetId) {
                return item
              }
              if (item.children) {
                const found = findNode(item.children, targetType, targetId)
                if (found) return found
              }
            }
            return null
          }
          
          const node = findNode(treeItems, type, id)
          if (node) {
            setSelectedNode(node)
          }
        } catch (error) {
          console.error('Failed to find node:', error)
        }
      }
      findNodeAndSelect()
    }
  }, [searchParams])

  useEffect(() => {
    loadItems(selectedNode, pagination.current, pagination.pageSize)
  }, [selectedNode])

  const handleNodeSelect = (node: TreeItem | null) => {
    setSelectedNode(node)
    setNavigatedFromPath(false)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const handleClearNavigatedState = () => {
    setSearchParams({})
    setNavigatedFromPath(false)
    setSelectedNode(null)
  }

  const handleTableChange = (page: number, pageSize: number) => {
    loadItems(selectedNode, page, pageSize)
  }

  const handleDelete = async (item: Item) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除物品"${item.name}"吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteItem(item.id)
          message.success('删除成功')
          loadItems(selectedNode, pagination.current, pagination.pageSize)
        } catch (error) {
          console.error('Delete failed:', error)
        }
      },
    })
  }

  const handleContainerClick = (_containerId: string) => {
    navigate('/space')
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
      render: (_: unknown, record: Item) => <PathDisplay item={record} onContainerClick={handleContainerClick} />,
    },
    {
      title: '购入日期',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date: string) => formatDate(date),
      width: 120,
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: Item) => (
        <Space>
          {record.is_idle && <Tag color="orange">闲置</Tag>}
          {record.is_expiry_handled && <Tag color="green">已处理</Tag>}
        </Space>
      ),
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Item) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/items?edit=${record.id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const getNodeTitle = () => {
    if (!selectedNode) return '请选择空间节点'
    const typeMap = { house: '房屋', room: '房间', container: '容器' }
    return `${typeMap[selectedNode.type]}: ${selectedNode.title}`
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card
        title="空间导航"
        style={{ width: 320, flexShrink: 0 }}
        bodyStyle={{ height: 'calc(100% - 74px)', overflow: 'auto' }}
      >
        <SpaceTree onSelect={handleNodeSelect} />
      </Card>

      <Card
        title={getNodeTitle()}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadItems(selectedNode, pagination.current, pagination.pageSize)}
            >
              刷新
            </Button>
            <Button type="primary" onClick={() => navigate('/items?action=add')}>
              新增物品
            </Button>
          </Space>
        }
        style={{ flex: 1 }}
      >
        {navigatedFromPath && (
          <Alert
            message="已自动定位到对应空间节点"
            type="info"
            showIcon
            closable
            onClose={handleClearNavigatedState}
            style={{ marginBottom: 16 }}
          />
        )}
        <Spin spinning={loading}>
          {selectedNode ? (
            <Table
              columns={columns}
              dataSource={items}
              rowKey="id"
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
                onChange: handleTableChange,
              }}
            />
          ) : (
            <Empty description="请在左侧选择空间节点查看物品" />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default SpaceManagement
