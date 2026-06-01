import { Layout, Menu, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  HomeOutlined,
  BoxPlotOutlined,
  SearchOutlined,
  BellOutlined,
  CarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

type MenuItem = Required<MenuProps>['items'][number]

const { Header, Sider, Content } = Layout

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const menuItems: { key: string; label: string; icon: React.ReactNode; path: string }[] = [
    {
      key: '1',
      label: '仪表盘',
      icon: <DashboardOutlined />,
      path: '/',
    },
    {
      key: '2',
      label: '空间管理',
      icon: <HomeOutlined />,
      path: '/space',
    },
    {
      key: '3',
      label: '物品登记',
      icon: <BoxPlotOutlined />,
      path: '/items',
    },
    {
      key: '4',
      label: '快速定位',
      icon: <SearchOutlined />,
      path: '/search',
    },
    {
      key: '5',
      label: '保质期提醒',
      icon: <BellOutlined />,
      path: '/reminders',
    },
    {
      key: '6',
      label: '搬家清单',
      icon: <CarOutlined />,
      path: '/moving',
    },
    {
      key: '7',
      label: '闲置物品',
      icon: <ClockCircleOutlined />,
      path: '/idle',
    },
  ]

  const antdMenuItems: MenuItem[] = menuItems.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
  }))

  const handleMenuClick = ({ key }: { key: string }) => {
    const item = menuItems.find((i) => i.key === key)
    if (item) {
      navigate(item.path)
    }
  }

  const getSelectedKeys = () => {
    const item = menuItems.find((i) => i.path === location.pathname)
    return item ? [item.key] : ['1']
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 'bold',
            background: 'rgba(255, 255, 255, 0.1)',
            margin: 16,
            borderRadius: 8,
          }}
        >
          {collapsed ? 'SS' : 'ShelfSpot'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={antdMenuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div style={{ padding: '0 24px', fontSize: 18, fontWeight: 500 }}>
            家居物品收纳管理系统
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
