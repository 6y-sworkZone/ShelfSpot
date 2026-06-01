import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Tabs,
  message,
  Spin,
  Empty,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { getReminders, markReminderHandled } from '@/api'
import type { ReminderItem } from '@/types'
import { formatDate } from '@/utils/common'

const ExpiryReminder = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'expired'>('all')
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async (type: 'all' | 'expiring' | 'expired' = activeTab) => {
    setLoading(true)
    try {
      const data = await getReminders()
      let items = data.items
      
      if (type === 'expiring') {
        items = items.filter((item) => item.days_remaining >= 0 && item.days_remaining <= 30)
      } else if (type === 'expired') {
        items = items.filter((item) => item.days_remaining < 0)
      }
      
      setReminders(
        items.sort((a, b) => {
          if (a.days_remaining < 0 && b.days_remaining >= 0) return -1
          if (a.days_remaining >= 0 && b.days_remaining < 0) return 1
          return a.days_remaining - b.days_remaining
        })
      )
    } catch (error) {
      console.error('Failed to load reminders:', error)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'all' | 'expiring' | 'expired')
  }

  const handleMarkHandled = async (item: ReminderItem) => {
    try {
      await markReminderHandled(item.id)
      message.success('已标记为已处理')
      setReminders((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, is_handled: true } : r))
      )
    } catch (error) {
      console.error('Mark handled failed:', error)
    }
  }

  const getExpiryTag = (days: number) => {
    if (days < 0) {
      return (
        <Tag color="red" icon={<WarningOutlined />}>
          已过期 {Math.abs(days)} 天
        </Tag>
      )
    }
    if (days <= 30) {
      return (
        <Tag color="orange" icon={<ClockCircleOutlined />}>
          剩余 {days} 天
        </Tag>
      )
    }
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        剩余 {days} 天
      </Tag>
    )
  }

  const columns = [
    {
      title: '物品名称',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text: string, record: ReminderItem) => (
        <span style={{ color: record.days_remaining < 0 && !record.is_handled ? '#f5222d' : 'inherit' }}>
          {text}
        </span>
      ),
    },
    {
      title: '过期日期',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date: string) => formatDate(date),
      width: 120,
    },
    {
      title: '剩余天数',
      dataIndex: 'days_remaining',
      key: 'days_remaining',
      render: (days: number) => getExpiryTag(days),
      width: 150,
    },
    {
      title: '位置',
      dataIndex: 'full_path',
      key: 'full_path',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'is_handled',
      key: 'is_handled',
      render: (handled: boolean) =>
        handled ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            已处理
          </Tag>
        ) : (
          <Tag icon={<WarningOutlined />} color="warning">
            待处理
          </Tag>
        ),
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ReminderItem) => (
        <Button
          type="link"
          size="small"
          icon={<CheckCircleOutlined />}
          disabled={record.is_handled}
          onClick={() => handleMarkHandled(record)}
        >
          {record.is_handled ? '已处理' : '标记已处理'}
        </Button>
      ),
    },
  ]

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'expiring', label: '即将过期（30天内）' },
    { key: 'expired', label: '已过期' },
  ]

  const getRowClassName = (record: ReminderItem) => {
    if (record.days_remaining < 0 && !record.is_handled) {
      return 'expired-row'
    }
    return ''
  }

  return (
    <Card
      title={
        <Space>
          <span>保质期提醒</span>
          <Button icon={<ReloadOutlined />} onClick={() => loadData()} size="small">
            刷新
          </Button>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} items={tabItems} onChange={handleTabChange} />

      <Spin spinning={loading}>
        {reminders.length > 0 ? (
          <Table
            columns={columns}
            dataSource={reminders}
            rowKey="id"
            rowClassName={getRowClassName}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        ) : (
          <Empty description="暂无提醒数据" style={{ marginTop: 60 }} />
        )}
      </Spin>

      <style>{`
        .expired-row {
          background-color: #fff1f0 !important;
        }
        .expired-row:hover > td {
          background-color: #ffccc7 !important;
        }
      `}</style>
    </Card>
  )
}

export default ExpiryReminder
