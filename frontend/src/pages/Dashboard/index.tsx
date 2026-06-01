import { Card, Row, Col, Statistic, Table, Tag, Button, List } from 'antd'
import {
  InboxOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RightOutlined,
  HomeOutlined,
  BoxPlotOutlined,
  SearchOutlined,
  BellOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getStatsOverview,
  getReminders,
  getHealthCheck,
  getCategoryPieChart,
} from '@/api'
import type {
  StatsOverview,
  ReminderItem,
  HealthCheckResponse,
  PieChartData,
} from '@/types'
import { formatDate } from '@/utils/common'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [pieData, setPieData] = useState<PieChartData[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, remindersData, healthData, pieDataRes] = await Promise.all([
        getStatsOverview().catch(() => null),
        getReminders().catch(() => null),
        getHealthCheck().catch(() => null),
        getCategoryPieChart().catch(() => []),
      ])
      if (statsData) setStats(statsData)
      if (remindersData?.items) {
        setReminders(remindersData.items.slice(0, 10))
      } else {
        setReminders([])
      }
      if (healthData) setHealth(healthData)
      if (pieDataRes) setPieData(pieDataRes)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const pieChartOption = {
    title: {
      text: '分类占比',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '分类',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: pieData,
      },
    ],
  }

  const quickActions = [
    {
      title: '空间管理',
      icon: <HomeOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      description: '管理房屋、房间、容器',
      path: '/space',
    },
    {
      title: '物品登记',
      icon: <BoxPlotOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      description: '新增、编辑、导入物品',
      path: '/items',
    },
    {
      title: '快速定位',
      icon: <SearchOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      description: '搜索物品位置',
      path: '/search',
    },
    {
      title: '保质期提醒',
      icon: <BellOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
      description: '查看过期和即将过期物品',
      path: '/reminders',
    },
  ]

  const reminderColumns = [
    {
      title: '物品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '过期日期',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (date: string) => formatDate(date),
    },
    {
      title: '剩余天数',
      dataIndex: 'days_remaining',
      key: 'days_remaining',
      render: (days: number) => {
        if (days < 0) {
          return <Tag color="red">已过期 {Math.abs(days)} 天</Tag>
        }
        if (days <= 7) {
          return <Tag color="orange">剩余 {days} 天</Tag>
        }
        return <Tag color="gold">剩余 {days} 天</Tag>
      },
    },
    {
      title: '位置',
      dataIndex: 'full_path',
      key: 'full_path',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          expired: { color: 'red', text: '已过期' },
          urgent: { color: 'orange', text: '紧急' },
          expiring: { color: 'gold', text: '即将过期' },
        }
        const s = statusMap[status] || { color: 'default', text: status }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
  ]

  return (
    <div>
      {health && (
        <Card style={{ marginBottom: 24 }}>
          <Tag color="green">后端服务状态: {health.status}</Tag>
          <span style={{ marginLeft: 16, color: '#666' }}>{health.message}</span>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总物品数"
              value={stats?.total_items || 0}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="闲置率"
              value={stats?.idle_rate || 0}
              suffix="%"
              precision={1}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="紧急提醒"
              value={(stats?.expired_count || 0) + (stats?.urgent_count || 0)}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={
                <span style={{ fontSize: 12, marginLeft: 8 }}>
                  已过期 {stats?.expired_count || 0}，即将过期 {stats?.urgent_count || 0}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="分类数量"
              value={stats?.category_stats?.length || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card
            title="快捷操作"
            extra={
              <Button type="link" onClick={() => navigate('/space')}>
                查看全部 <RightOutlined />
              </Button>
            }
          >
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={quickActions}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => navigate(item.path)}
                  >
                    <div style={{ marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                      {item.description}
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="分类占比">
            <ReactECharts option={pieChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="保质期提醒"
        extra={
          <Button type="link" onClick={() => navigate('/reminders')}>
            查看全部 <RightOutlined />
          </Button>
        }
      >
        <Table
          columns={reminderColumns}
          dataSource={reminders}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default Dashboard
