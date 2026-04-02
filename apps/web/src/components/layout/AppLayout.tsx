import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import Sidebar from './Sidebar'
import { useAuthStore } from '@/stores/authStore'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, company, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        user={user}
        companyName={company?.name}
        onLogout={handleLogout}
      />
      <main
        className={clsx(
          'min-h-screen transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-[260px]',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
