import { useState, useEffect } from 'react'
import { Tree, Dropdown, Spin, message, Modal, Form, Input, Button } from 'antd'
import type { MenuProps, TreeDataNode } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  ApartmentOutlined,
  InboxOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import {
  getHouses,
  getRooms,
  getContainers,
  createHouse,
  createRoom,
  createContainer,
  updateHouse,
  updateRoom,
  updateContainer,
  deleteHouse,
  deleteRoom,
  deleteContainer,
} from '@/api'
import type { House, Room, Container, TreeItem } from '@/types'
import { buildSpaceTree } from '@/utils/common'

interface SpaceTreeProps {
  onSelect?: (node: TreeItem | null) => void
  showCheckbox?: boolean
  onCheck?: (checked: { container_ids: string[]; room_ids: string[] }) => void
}

interface FormValues {
  name: string
  remark?: string
}

const SpaceTree = ({ onSelect, showCheckbox = false, onCheck }: SpaceTreeProps) => {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    node: TreeItem | null
  }>({ visible: false, x: 0, y: 0, node: null })
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit'>('add')
  const [editingNode, setEditingNode] = useState<TreeItem | null>(null)
  const [addType, setAddType] = useState<'house' | 'room' | 'container'>('house')
  const [parentId, setParentId] = useState<string | null>(null)
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [housesData, roomsData, containersData] = await Promise.all([
        getHouses(),
        getRooms(),
        getContainers(),
      ])
      setHouses(housesData)
      setRooms(roomsData)
      setContainers(containersData)
      setTreeData(buildAntdTree(housesData, roomsData, containersData))
    } catch (error) {
      console.error('Failed to load space tree:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildAntdTree = (
    houses: House[],
    rooms: Room[],
    containers: Container[]
  ): TreeDataNode[] => {
    const iconMap = {
      house: <HomeOutlined />,
      room: <ApartmentOutlined />,
      container: <InboxOutlined />,
    }

    const mapItem = (item: TreeItem): TreeDataNode => ({
      key: item.key,
      title: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('.ant-dropdown-trigger') || target.closest('.space-tree-action-btn')) {
              e.stopPropagation()
            }
          }}
        >
          <span
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setContextMenu({ visible: true, x: e.clientX, y: e.clientY, node: item })
            }}
            style={{ flex: 1 }}
          >
            {item.title}
          </span>
          <Dropdown
            menu={{ items: getMenuItems(item) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className="space-tree-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              style={{ padding: '0 4px' }}
            />
          </Dropdown>
        </div>
      ),
      icon: iconMap[item.type],
      isLeaf: item.isLeaf,
      children: item.children?.map(mapItem),
    })

    return buildSpaceTree(houses, rooms, containers).map(mapItem)
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, node: null })
  }

  const getMenuItems = (node: TreeItem | null): MenuProps['items'] => {
    if (!node) {
      return [
        {
          key: 'add-house',
          icon: <PlusOutlined />,
          label: '新增房屋',
          onClick: () => openAddModal('house', null),
        },
      ]
    }

    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => openEditModal(node),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(node),
      },
    ]

    if (node.type === 'house') {
      items.unshift({
        key: 'add-room',
        icon: <PlusOutlined />,
        label: '新增房间',
        onClick: () => openAddModal('room', node.id),
      })
    }

    if (node.type === 'room') {
      items.unshift({
        key: 'add-container',
        icon: <PlusOutlined />,
        label: '新增容器',
        onClick: () => openAddModal('container', node.id),
      })
    }

    return items
  }

  const openAddModal = (type: 'house' | 'room' | 'container', parent: string | null) => {
    setModalType('add')
    setAddType(type)
    setParentId(parent)
    setEditingNode(null)
    form.resetFields()
    setModalVisible(true)
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }

  const openEditModal = (node: TreeItem) => {
    setModalType('edit')
    setEditingNode(node)
    setAddType(node.type)

    let currentData: House | Room | Container | undefined
    if (node.type === 'house') {
      currentData = houses.find((h) => h.id === node.id)
      form.setFieldsValue({ name: currentData?.name, remark: (currentData as House)?.remark })
    } else if (node.type === 'room') {
      currentData = rooms.find((r) => r.id === node.id)
      form.setFieldsValue({ name: currentData?.name, remark: (currentData as Room)?.remark })
    } else {
      currentData = containers.find((c) => c.id === node.id)
      form.setFieldsValue({
        name: currentData?.name,
        remark: (currentData as Container)?.remark,
      })
    }

    setModalVisible(true)
    setContextMenu({ visible: false, x: 0, y: 0, node: null })
  }

  const handleDelete = async (node: TreeItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除"${node.title}"吗？删除后所有子节点也将被删除。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (node.type === 'house') {
            await deleteHouse(node.id)
          } else if (node.type === 'room') {
            await deleteRoom(node.id)
          } else {
            await deleteContainer(node.id)
          }
          message.success('删除成功')
          loadData()
          if (onSelect) onSelect(null)
        } catch (error) {
          console.error('Delete failed:', error)
        }
      },
    })
  }

  const handleFormSubmit = async (values: FormValues) => {
    try {
      if (modalType === 'add') {
        if (addType === 'house') {
          await createHouse({ name: values.name, remark: values.remark })
        } else if (addType === 'room' && parentId) {
          await createRoom({ house_id: parentId, name: values.name, remark: values.remark })
        } else if (addType === 'container' && parentId) {
          await createContainer({ room_id: parentId, name: values.name, remark: values.remark })
        }
        message.success('创建成功')
      } else if (modalType === 'edit' && editingNode) {
        if (editingNode.type === 'house') {
          await updateHouse(editingNode.id, { name: values.name, remark: values.remark })
        } else if (editingNode.type === 'room') {
          await updateRoom(editingNode.id, { name: values.name, remark: values.remark })
        } else {
          await updateContainer(editingNode.id, { name: values.name, remark: values.remark })
        }
        message.success('更新成功')
      }
      setModalVisible(false)
      loadData()
    } catch (error) {
      console.error('Form submit failed:', error)
    }
  }

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) {
      onSelect?.(null)
      return
    }

    const key = selectedKeys[0]

    const treeItems = buildSpaceTree(houses, rooms, containers)
    const findNode = (items: TreeItem[]): TreeItem | null => {
      for (const item of items) {
        if (item.key === key) return item
        if (item.children) {
          const found = findNode(item.children)
          if (found) return found
        }
      }
      return null
    }

    const node = findNode(treeItems)
    onSelect?.(node)
  }

  const handleTreeCheck = (checkedKeys: any) => {
    if (!onCheck) return

    const containerIds: string[] = []
    const roomIds: string[] = []
    const collectIds = (items: TreeItem[]) => {
      for (const item of items) {
        if (item.type === 'container' && checkedKeys.checked.includes(item.key)) {
          containerIds.push(item.id)
        }
        if (item.type === 'room' && checkedKeys.checked.includes(item.key)) {
          roomIds.push(item.id)
        }
        if (item.children) {
          collectIds(item.children)
        }
      }
    }

    const treeItems = buildSpaceTree(houses, rooms, containers)
    collectIds(treeItems)
    onCheck({ container_ids: containerIds, room_ids: roomIds })
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const node = contextMenu.node
    if (!node) return

    if (key === 'add-house') {
      openAddModal('house', null)
    } else if (key === 'add-room') {
      openAddModal('room', node.id)
    } else if (key === 'add-container') {
      openAddModal('container', node.id)
    } else if (key === 'edit') {
      openEditModal(node)
    } else if (key === 'delete') {
      handleDelete(node)
    }
  }

  return (
    <div onContextMenu={handleRightClick} style={{ height: '100%' }}>
      <Spin spinning={loading}>
        <Tree
          showLine
          showIcon
          treeData={treeData}
          onSelect={handleTreeSelect}
          checkable={showCheckbox}
          onCheck={showCheckbox ? handleTreeCheck : undefined}
          defaultExpandAll
        />
      </Spin>

      <Dropdown
        menu={{ items: getMenuItems(contextMenu.node), onClick: handleMenuClick }}
        open={contextMenu.visible}
        trigger={['contextMenu']}
        onOpenChange={(open) => {
          if (!open) setContextMenu({ visible: false, x: 0, y: 0, node: null })
        }}
      >
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </Dropdown>

      <Modal
        title={modalType === 'add' ? `新增${addType === 'house' ? '房屋' : addType === 'room' ? '房间' : '容器'}` : '编辑'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          {addType === 'house' && (
            <Form.Item name="remark" label="备注">
              <Input placeholder="请输入备注（可选）" />
            </Form.Item>
          )}
          {addType === 'room' && (
            <Form.Item name="remark" label="备注">
              <Input placeholder="请输入备注（可选）" />
            </Form.Item>
          )}
          {addType === 'container' && (
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={3} placeholder="请输入备注（可选）" />
            </Form.Item>
          )}
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确定
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f0f5ff',
          borderRadius: 8,
          border: '1px dashed #91caff',
        }}
      >
        <Button
          type="primary"
          block
          icon={<PlusOutlined />}
          onClick={() => openAddModal('house', null)}
          style={{ marginBottom: 12 }}
        >
          新增房屋
        </Button>
        {!showCheckbox && (
          <p style={{ margin: 0, color: '#666', fontSize: 12, textAlign: 'center' }}>
            💡 点击节点右侧的 ··· 按钮可进行更多操作
          </p>
        )}
      </div>
    </div>
  )
}

export default SpaceTree
