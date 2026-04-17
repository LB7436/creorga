import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutGrid,
  CalendarDays,
  Users,
  Package,
  ClipboardList,
  Wallet,
  UserCheck,
  UtensilsCrossed,
  Sparkles,
  MessageSquare,
  BarChart3,
  Bell,
  UserCog,
} from 'lucide-react'
import Avatar from '../ui/Avatar'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  user: { firstName: string; lastName: string; email: string; avatar?: string | null } | null
  companyName?: string
  onLogout: () => void
}

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  color: string
  badge?: number
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: '#0ea5e9' },
  { to: '/pos', icon: ShoppingCart, label: 'Point de vente', color: '#f97316' },
  { to: '/agenda', icon: CalendarDays, label: 'Agenda', color: '#6D28D9', badge: 3 },
  { to: '/reservations', icon: ClipboardList, label: 'Réservations', color: '#0891b2', badge: 5 },
  { to: '/kitchen', icon: UtensilsCrossed, label: 'Cuisine', color: '#dc2626' },
  { to: '/inventory', icon: Package, label: 'Inventaire', color: '#ca8a04' },
  { to: '/accounting', icon: Wallet, label: 'Comptabilité', color: '#1F2937' },
  { to: '/crm', icon: Users, label: 'CRM', color: '#7c3aed' },
  { to: '/staff', icon: UserCheck, label: 'RH & Planning', color: '#059669' },
  { to: '/marketing', icon: Sparkles, label: 'Marketing', color: '#ec4899' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', color: '#3b82f6', badge: 2 },
  { to: '/reports', icon: BarChart3, label: 'Rapports', color: '#0d9488' },
  { to: '/notifications', icon: Bell, label: 'Notifications', color: '#f59e0b' },
  { to: '/settings', icon: Settings, label: 'Paramètres', color: '#475569' },
  { to: '/profile', icon: UserCog, label: 'Profil', color: '#64748b' },
]

const COLLAPSED_WIDTH = 48
const EXPANDED_WIDTH = 240

export default function Sidebar({
  collapsed,
  onToggle,
  user,
  companyName,
  onLogout,
}: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          padding: collapsed ? '0' : '0 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: '#6D28D9',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>C</span>
        </div>
        {!collapsed && (
          <div style={{ marginLeft: 10, overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, lineHeight: 1.2 }}>
              Creorga
            </div>
            {companyName && (
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {companyName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '8px 6px',
          overflowY: 'auto',
          overflowX: 'visible',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          const Icon = item.icon

          return (
            <div
              key={item.to}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredItem(item.to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
                to={item.to}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '8px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? item.color : '#64748b',
                  background: isActive ? `${item.color}12` : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f1f5f9'
                    e.currentTarget.style.color = '#1e293b'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#64748b'
                  }
                }}
              >
                {/* Active colored bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bar"
                    style={{
                      position: 'absolute',
                      left: -6,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: '0 3px 3px 0',
                      background: item.color,
                    }}
                  />
                )}

                <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
                  <Icon size={18} />
                  {item.badge && item.badge > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -6,
                        minWidth: 14,
                        height: 14,
                        padding: '0 4px',
                        borderRadius: 7,
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: 9,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid #ffffff',
                      }}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>

              {/* Collapsed tooltip */}
              {collapsed && hoveredItem === item.to && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    left: 'calc(100% + 8px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#1e293b',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 10px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.18)',
                  }}
                >
                  {item.label}
                  {item.badge ? (
                    <span style={{ marginLeft: 6, color: '#fca5a5', fontWeight: 700 }}>
                      · {item.badge}
                    </span>
                  ) : null}
                </motion.div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Modules shortcut */}
      <div style={{ padding: '6px', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={() => navigate('/modules')}
          title={collapsed ? 'Changer de module' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 8,
            color: '#94a3b8',
            fontSize: 12,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.color = '#1e293b'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >
          <LayoutGrid size={16} />
          {!collapsed && <span>Changer de module</span>}
        </button>
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Déplier' : 'Replier'}
        style={{
          position: 'absolute',
          right: -10,
          top: 64,
          width: 20,
          height: 20,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.08)',
          color: '#64748b',
          zIndex: 41,
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* User profile */}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: collapsed ? '10px 0' : '10px',
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Avatar
              name={user ? `${user.firstName} ${user.lastName}` : 'U'}
              src={user?.avatar}
              size="sm"
            />
            <button
              onClick={onLogout}
              title="Déconnexion"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#fef2f2'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar
                name={user ? `${user.firstName} ${user.lastName}` : 'U'}
                src={user?.avatar}
                size="sm"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 11,
                    color: '#6D28D9',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.textDecoration = 'underline'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  Gérer profil
                </button>
              </div>
              <button
                onClick={onLogout}
                title="Déconnexion"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  flexShrink: 0,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#fef2f2'
                  e.currentTarget.style.color = '#ef4444'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
