import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  message,
  Spin,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Cascader,
  Upload,
  Result,
  Descriptions,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import PhotoUpload from '@/components/PhotoUpload'
import PathDisplay from '@/components/PathDisplay'
import {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getCategories,
  getHouses,
  getRooms,
  getContainers,
  importItemsCSV,
  uploadItemPhotos,
} from '@/api'
import type { Item, Category, House, Room, Container, ImportResult } from '@/types'
import { formatDate, buildCategoryCascadeOptions, buildSpaceCascadeOptions } from '@/utils/common'

interface FormValues {
  name: string
  quantity: number
  category_id: string
  container_id: string
  purchase_date?: string
  expiry_date?: string
  photos?: string[]
  space?: string[]
  category?: string[]
}

const ItemManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit'>('add')
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [form] = Form.useForm<FormValues>()

  const [categories, setCategories] = useState<Category[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [containers, setContainers] = useState<Container[]>([])

  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  useEffect(() => {
    loadData()
    loadOptions()
  }, [])

  useEffect(() => {
    const editId = searchParams.get('edit')
    const action = searchParams.get('action')
    if (editId) {
      openEditModal(editId)
      searchParams.delete('edit')
      setSearchParams(searchParams)
    } else if (action === 'add') {
      openAddModal()
      searchParams.delete('action')
      setSearchParams(searchParams)
    }
  }, [searchParams])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const result = await getItems({ page, page_size: pageSize })
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

  const loadOptions = async () => {
    try {
      const [cats, housesData, roomsData, containersData] = await Promise.all([
        getCategories(),
        getHouses(),
        getRooms(),
        getContainers(),
      ])
      setCategories(cats)
      setHouses(housesData)
      setRooms(roomsData)
      setContainers(containersData)
    } catch (error) {
      console.error('Failed to load options:', error)
    }
  }

  const openAddModal = () => {
    setModalType('add')
    setEditingItem(null)
    setPendingPhotos([])
    form.resetFields()
    form.setFieldsValue({ quantity: 1 })
    setModalVisible(true)
  }

  const openEditModal = async (id: string) => {
    try {
      const item = await getItem(id)
      setModalType('edit')
      setEditingItem(item)

      const spaceValue = item.container_id ? [
        `house-${item.container?.room?.house?.id}`,
        `room-${item.container?.room?.id}`,
        item.container_id,
      ] : undefined

      form.setFieldsValue({
        name: item.name,
        quantity: item.quantity,
        category_id: item.category_id,
        container_id: item.container_id,
        purchase_date: item.purchase_date ? formatDate(item.purchase_date) : undefined,
        expiry_date: item.expiry_date ? formatDate(item.expiry_date) : undefined,
        photos: item.photos,
        space: spaceValue,
        category: [item.category_id],
      })
      setModalVisible(true)
    } catch (error) {
      console.error('Failed to load item:', error)
    }
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
          loadData(pagination.current, pagination.pageSize)
        } catch (error) {
          console.error('Delete failed:', error)
        }
      },
    })
  }

  const handleFormSubmit = async (values: any) => {
    try {
      const containerId = values.space?.[2] || values.container_id
      const categoryId = values.category?.[values.category.length - 1] || values.category_id

      const itemData = {
        name: values.name,
        quantity: values.quantity,
        category_id: categoryId,
        container_id: containerId,
        purchase_date: values.purchase_date?.format('YYYY-MM-DD'),
        expiry_date: values.expiry_date?.format('YYYY-MM-DD'),
        photos: values.photos,
      }

      let savedItem: Item | null = null

      if (modalType === 'add') {
        savedItem = await createItem(itemData)
        message.success('创建成功')

        if (pendingPhotos.length > 0 && savedItem?.id) {
          try {
            await uploadItemPhotos(savedItem.id, pendingPhotos)
            message.success('照片上传成功')
          } catch (uploadError) {
            console.error('Photo upload failed:', uploadError)
            message.warning('物品创建成功，但照片上传失败，请稍后在编辑中重新上传')
          }
        }
      } else if (modalType === 'edit' && editingItem) {
        await updateItem(editingItem.id, itemData)
        message.success('更新成功')
      }

      setPendingPhotos([])
      setModalVisible(false)
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('Form submit failed:', error)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateContent = '名称,数量,分类,购入日期,保质期,所属容器\n示例物品,1,食品,2024-01-01,2024-12-31,冰箱'
      const blob = new Blob(['\ufeff' + templateContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '物品导入模板.csv'
      link.click()
      URL.revokeObjectURL(url)
      message.success('模板下载成功')
    } catch (error) {
      console.error('Download template failed:', error)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      message.error('请先选择文件')
      return
    }

    try {
      const result = await importItemsCSV(importFile)
      setImportResult(result)
      if (result.success_count > 0) {
        message.success(`导入成功 ${result.success_count} 条`)
        loadData(pagination.current, pagination.pageSize)
      }
      if (result.fail_count > 0) {
        message.warning(`导入失败 ${result.fail_count} 条`)
      }
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  const handleTableChange = (page: number, pageSize: number) => {
    loadData(page, pageSize)
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
      render: (_: unknown, record: Item) => <PathDisplay item={record} />,
    },
    {
      title: '购入日期',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      render: (date: string) => formatDate(date),
      width: 120,
    },
    {
      title: '保质期',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date: string) => formatDate(date),
      width: 120,
    },
    {
      title: '照片',
      dataIndex: 'photos',
      key: 'photos',
      render: (photos: string[]) => (photos && photos.length > 0 ? `${photos.length} 张` : '-'),
      width: 80,
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record.id)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const categoryOptions = buildCategoryCascadeOptions(categories)
  const spaceOptions = buildSpaceCascadeOptions(houses, rooms, containers)

  return (
    <div>
      <Card
        title="物品登记"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => loadData(pagination.current, pagination.pageSize)}>
              刷新
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => setImportModalVisible(true)}>
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              新增物品
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
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
        </Spin>
      </Card>

      <Modal
        title={modalType === 'add' ? '新增物品' : '编辑物品'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="物品名称"
            rules={[{ required: true, message: '请输入物品名称' }]}
          >
            <Input placeholder="请输入物品名称" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入数量" />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Cascader options={categoryOptions} placeholder="请选择分类" />
          </Form.Item>

          <Form.Item
            name="space"
            label="所属容器"
            rules={[{ required: true, message: '请选择所属容器' }]}
          >
            <Cascader options={spaceOptions} placeholder="请选择 房屋/房间/容器" />
          </Form.Item>

          <Space style={{ width: '100%', display: 'flex' }}>
            <Form.Item name="purchase_date" label="购入日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="选择购入日期" />
            </Form.Item>
            <Form.Item name="expiry_date" label="保质期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="选择保质期" />
            </Form.Item>
          </Space>

          <Form.Item name="photos" label="照片">
            <PhotoUpload
              itemId={editingItem?.id}
              disabled={false}
              onFilesSelect={modalType === 'add' ? setPendingPhotos : undefined}
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

      <Modal
        title="批量导入物品"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false)
          setImportResult(null)
          setImportFile(null)
        }}
        footer={null}
        width={600}
      >
        {!importResult ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#888', marginBottom: 8 }}>
                请上传 CSV 格式的文件，可先下载模板查看格式要求
              </p>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} size="small">
                下载模板
              </Button>
            </div>
            <Upload
              accept=".csv"
              showUploadList={true}
              maxCount={1}
              beforeUpload={(file) => {
                setImportFile(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>选择 CSV 文件</Button>
            </Upload>
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Button
                onClick={() => {
                  setImportModalVisible(false)
                  setImportFile(null)
                }}
                style={{ marginRight: 8 }}
              >
                取消
              </Button>
              <Button type="primary" onClick={handleImport} disabled={!importFile}>
                开始导入
              </Button>
            </div>
          </>
        ) : (
          <>
            <Result
              status={importResult.fail_count === 0 ? 'success' : 'warning'}
              title="导入完成"
              subTitle={`成功 ${importResult.success_count} 条，失败 ${importResult.fail_count} 条`}
            />
            {importResult.errors.length > 0 && (
              <Descriptions title="错误详情" bordered size="small" column={1}>
                {importResult.errors.map((error, index) => (
                  <Descriptions.Item key={index} label={`第 ${error.row} 行`}>
                    {error.message}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={() => {
                  setImportModalVisible(false)
                  setImportResult(null)
                  setImportFile(null)
                }}
              >
                完成
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default ItemManagement
