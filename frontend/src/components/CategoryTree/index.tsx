import { useState, useEffect } from 'react'
import { Tree, Spin, Button, Modal, Form, Input, Select, message } from 'antd'
import type { TreeDataNode } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api'
import type { Category, TreeItem } from '@/types'
import { buildCategoryTree } from '@/utils/common'

interface CategoryTreeProps {
  onSelect?: (categoryId: string | null) => void
  showOperations?: boolean
  selectedKey?: string
}

interface FormValues {
  name: string
  parent_id?: string | null
}

const CategoryTree = ({ onSelect, showOperations = false, selectedKey }: CategoryTreeProps) => {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit'>('add')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCategories()
      setCategories(data)
      setTreeData(buildAntdTree(data))
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildAntdTree = (cats: Category[]): TreeDataNode[] => {
    const mapItem = (item: TreeItem): TreeDataNode => ({
      key: item.key,
      title: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{item.title}</span>
          {showOperations && (
            <span style={{ marginLeft: 'auto' }}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  openAddModal(item.id)
                }}
              />
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  openEditModal(cats.find((c) => c.id === item.id)!)
                }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id, item.title)
                }}
              />
            </span>
          )}
        </span>
      ),
      icon: <FolderOutlined />,
      isLeaf: !item.children || item.children.length === 0,
      children: item.children?.map(mapItem),
    })

    return buildCategoryTree(cats).map(mapItem)
  }

  const openAddModal = (parent: string | null = null) => {
    setModalType('add')
    setEditingCategory(null)
    form.resetFields()
    if (parent) {
      form.setFieldsValue({ parent_id: parent })
    }
    setModalVisible(true)
  }

  const openEditModal = (category: Category) => {
    setModalType('edit')
    setEditingCategory(category)
    form.setFieldsValue({
      name: category.name,
      parent_id: category.parent_id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除分类"${name}"吗？删除后所有子分类也将被删除。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteCategory(id)
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
        await createCategory({ name: values.name, parent_id: values.parent_id })
        message.success('创建成功')
      } else if (modalType === 'edit' && editingCategory) {
        await updateCategory(editingCategory.id, {
          name: values.name,
          parent_id: values.parent_id,
        })
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
    const key = String(selectedKeys[0])
    const [, id] = key.split('-')
    onSelect?.(id)
  }

  const getParentOptions = () => {
    const options = categories
      .filter((c) => !editingCategory || c.id !== editingCategory.id)
      .map((c) => ({
        value: c.id,
        label: c.name,
      }))
    return [{ value: null, label: '无（顶级分类）' }, ...options]
  }

  return (
    <div>
      {showOperations && (
        <div style={{ marginBottom: 12, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal()}>
            新增分类
          </Button>
        </div>
      )}
      <Spin spinning={loading}>
        <Tree
          showLine
          showIcon
          treeData={treeData}
          onSelect={handleTreeSelect}
          selectedKeys={selectedKey ? [selectedKey] : []}
          defaultExpandAll
          blockNode
        />
      </Spin>

      <Modal
        title={modalType === 'add' ? '新增分类' : '编辑分类'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>
          <Form.Item name="parent_id" label="上级分类">
            <Select
              placeholder="请选择上级分类"
              options={getParentOptions()}
              fieldNames={{ value: 'value', label: 'label' }}
            />
          </Form.Item>
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
    </div>
  )
}

export default CategoryTree
