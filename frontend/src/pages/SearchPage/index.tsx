import { useState, useEffect } from 'react'
import {
  Card,
  Input,
  Button,
  Row,
  Col,
  Empty,
  Spin,
  Tag,
  Space,
  message,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import CategoryTree from '@/components/CategoryTree'
import ItemCard from '@/components/ItemCard'
import { searchItems, toggleItemIdle } from '@/api'
import type { Item } from '@/types'

const SearchPage = () => {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      let result: Item[] = []

      if (keyword.trim() || selectedCategoryId) {
        const params: { search?: string; category_id?: string } = {}
        if (keyword.trim()) {
          params.search = keyword.trim()
        }
        if (selectedCategoryId) {
          params.category_id = selectedCategoryId
        }
        result = await searchItems(params)
      }

      setItems(result)
    } catch (error) {
      console.error('Failed to search items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (keyword.trim() || selectedCategoryId) {
      loadData()
    } else {
      setItems([])
    }
  }, [keyword, selectedCategoryId])

  const handleSearch = () => {
    loadData()
  }

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId)
  }

  const handleToggleIdle = async (item: Item) => {
    try {
      const updatedItem = await toggleItemIdle(item.id)
      message.success(updatedItem.is_idle ? '已标记为闲置' : '已取消闲置')
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_idle: updatedItem.is_idle } : i))
      )
    } catch (error) {
      console.error('Toggle idle failed:', error)
    }
  }

  const handleContainerClick = (_containerId: string) => {
    navigate('/space')
  }

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
            <Input.Search
              placeholder="输入物品名或分类搜索..."
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />}>搜索</Button>}
              size="large"
              style={{ width: 400 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
            />
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            {selectedCategoryId && (
              <Tag color="blue" closable onClose={() => setSelectedCategoryId(null)}>
                已选择分类
              </Tag>
            )}
          </Space>
        }
        style={{ flex: 1 }}
        bodyStyle={{ height: 'calc(100% - 74px)', overflow: 'auto' }}
      >
        <Spin spinning={loading}>
          {items.length > 0 ? (
            <Row gutter={[16, 16]}>
              {items.map((item) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                  <ItemCard
                    item={item}
                    showIdleButton
                    onToggleIdle={handleToggleIdle}
                    onContainerClick={handleContainerClick}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description={
                keyword.trim() || selectedCategoryId
                  ? '未找到匹配的物品'
                  : '请输入关键词或选择分类进行搜索'
              }
              style={{ marginTop: 60 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default SearchPage
