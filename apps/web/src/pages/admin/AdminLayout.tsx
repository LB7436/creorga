import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Users, Package, LayoutGrid, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/admin/company', label: 'Société', icon: Building2 },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/catalog', label: 'Catalogue', icon: Package },
  { to: '/admin/modules', label: 'Modules', icon: LayoutGrid },
]

export default function AdminLayout() {
  const companies = useAuthStore((s) => s.companies)
  const currentRole = companies[0]?.role ?? 'EMPLOYEE'
  const navigate = useNavigate()

  if (currentRole !== 'OWNER' && currentRole !== 'MANAGER') {
    return <Navigate to="/modules" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => navigate('/modules')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3"
          >
            <ChevronLeft size={16} />
            Modules
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Administration</p>
              <p className="text-[10px] text-gray-400">Configuration</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8 max-w-4xl"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
