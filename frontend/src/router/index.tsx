import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import SpaceManagement from '@/pages/SpaceManagement'
import ItemManagement from '@/pages/ItemManagement'
import SearchPage from '@/pages/SearchPage'
import ExpiryReminder from '@/pages/ExpiryReminder'
import MovingList from '@/pages/MovingList'
import IdleItems from '@/pages/IdleItems'
import NotFound from '@/pages/NotFound'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'space',
        element: <SpaceManagement />,
      },
      {
        path: 'items',
        element: <ItemManagement />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'reminders',
        element: <ExpiryReminder />,
      },
      {
        path: 'moving',
        element: <MovingList />,
      },
      {
        path: 'idle',
        element: <IdleItems />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

export default router
