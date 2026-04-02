import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Lock,
  LayoutGrid,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  user: { firstName: string; lastName: string; email: string; avatar?: string | null } | null
  companyName?: string
  onLogout: () => void
}

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  disabled?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/pos', icon: ShoppingCart, label: 'Point de vente' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
]

const futureModules = [
  { label: 'Réservations', disabled: true },
  { label: 'Inventaire', disabled: true },
  { label: 'Comptabilité', disabled: true },
  { label: 'RH & Planning', disabled: true },
]

export default function Sidebar({
  collapsed,
  onToggle,
  user,
  companyName,
  onLogout,
}: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-white border-r border-gray-100 z-40',
        'flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="font-bold text-primary text-lg leading-tight">Creorga</h1>
            {companyName && (
              <p className="text-xs text-gray-400 truncate">{companyName}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/')

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'text-sm font-medium',
                isActive
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-surface-2 hover:text-gray-900',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}

        {/* Future modules */}
        {!collapsed && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Modules
            </p>
            {futureModules.map((mod) => (
              <div
                key={mod.label}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 cursor-not-allowed"
              >
                <Lock size={16} />
                <span>{mod.label}</span>
                <Badge variant="neutral" className="ml-auto text-[10px]">
                  Bientôt
                </Badge>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Back to modules */}
      <div className="px-3 pb-2">
        <button
          onClick={() => navigate('/modules')}
          className={clsx(
            'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-surface-2 hover:text-gray-600 transition-all',
          )}
          title={collapsed ? 'Modules' : undefined}
        >
          <LayoutGrid size={18} className="shrink-0" />
          {!collapsed && <span className="text-xs">Changer de module</span>}
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-2 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3">
          <Avatar
            name={user ? `${user.firstName} ${user.lastName}` : 'U'}
            src={user?.avatar}
            size="sm"
          />
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
