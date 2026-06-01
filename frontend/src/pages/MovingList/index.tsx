import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  message,
  Spin,
  Empty,
  Alert,
} from 'antd'
import {
  DownloadOutlined,
  ReloadOutlined,
  InboxOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import SpaceTree from '@/components/SpaceTree'
import { generateMovingList, exportMovingListCSV } from '@/api'
import type { MovingSummary } from '@/types'

const MovingList = () => {
  const [checkedContainerIds, setCheckedContainerIds] = useState<string[]>([])
  const [checkedRoomIds, setCheckedRoomIds] = useState<string[]>([])
  const [summary, setSummary] = useState<MovingSummary | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleCheck = (checked: { container_ids: string[]; room_ids: string[] }) => {
    setCheckedContainerIds(checked.container_ids)
    setCheckedRoomIds(checked.room_ids)
  }

  const handleGenerate = async () => {
    if (checkedContainerIds.length === 0 && checkedRoomIds.length === 0) {
      message.warning('请先在左侧选择要搬家的房间或容器')
      return
    }

    setGenerating(true)
    try {
      const data = await generateMovingList({
        container_ids: checkedContainerIds,
        room_ids: checkedRoomIds,
      })
      setSummary(data)
      message.success('清单生成成功')
    } catch (error) {
      console.error('Generate moving list failed:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleExportCSV = async () => {
    if (checkedContainerIds.length === 0 && checkedRoomIds.length === 0) {
      message.warning('请先在左侧选择要搬家的房间或容器')
      return
    }

    try {
      const blob = await exportMovingListCSV({
        container_ids: checkedContainerIds,
        room_ids: checkedRoomIds,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `搬家清单_${new Date().toLocaleDateString('zh-CN')}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      console.error('Export CSV failed:', error)
    }
  }

  const pieChartOption = {
    title: {
      text: '分类分布',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    series: [
      {
        name: '分类',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '55%'],
        data: summary
          ? Object.entries(summary.category_counts).map(([name, value]) => ({
              value,
              name,
            }))
          : [],
      },
    ],
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
      dataIndex: 'category_name',
      key: 'category_name',
      render: (name: string) => <Tag color="blue">{name}</Tag>,
      width: 120,
    },
    {
      title: '所属容器',
      dataIndex: 'container_name',
      key: 'container_name',
      width: 150,
    },
    {
      title: '完整路径',
      dataIndex: 'full_path',
      key: 'full_path',
      ellipsis: true,
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card
        title="选择空间"
        style={{ width: 320, flexShrink: 0 }}
        bodyStyle={{ height: 'calc(100% - 74px)', overflow: 'auto' }}
      >
        <SpaceTree showCheckbox onCheck={handleCheck} />
        <div style={{ marginTop: 16 }}>
          <Alert
            message="已选择"
            description={`${checkedRoomIds.length} 个房间，${checkedContainerIds.length} 个容器`}
            type={checkedRoomIds.length > 0 || checkedContainerIds.length > 0 ? 'success' : 'info'}
            showIcon
          />
        </div>
      </Card>

      <Card
        title="搬家清单"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleGenerate} disabled={generating}>
              刷新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={!summary}
            >
              导出 CSV
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleGenerate}
              loading={generating}
              disabled={checkedContainerIds.length === 0 && checkedRoomIds.length === 0}
            >
              生成清单
            </Button>
          </Space>
        }
        style={{ flex: 1 }}
      >
        <Spin spinning={generating}>
          {summary ? (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card>
                    <Statistic
                      title="总物品数"
                      value={summary.total_items}
                      prefix={<InboxOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card>
                    <Statistic
                      title="总数量"
                      value={summary.total_quantity}
                      prefix={<AppstoreOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card>
                    <ReactECharts option={pieChartOption} style={{ height: 120 }} />
                  </Card>
                </Col>
              </Row>

              <Table
                columns={columns}
                dataSource={summary.items}
                rowKey="id"
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
              />
            </>
          ) : (
            <Empty
              description="请在左侧选择要搬家的容器，然后点击生成清单"
              style={{ marginTop: 60 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default MovingList
