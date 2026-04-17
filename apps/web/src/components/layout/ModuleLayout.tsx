import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useThemeColors, useTheme } from '@/lib/theme'

interface NavItem { label: string; path: string; icon: LucideIcon }
interface ModuleLayoutProps { title: string; color: string; items: NavItem[]; backPath?: string; banner?: React.ReactNode }

export default function ModuleLayout({ title, color, items, backPath = '/modules', banner }: ModuleLayoutProps) {
  const navigate = useNavigate()
  const colors = useThemeColors()
  const isDark = useTheme((s) => s.resolvedTheme) === 'dark'

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* sidebar */}
      <aside
        style={{
          width: 208,
          flexShrink: 0,
          background: colors.bgSidebar,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 16,
          paddingBottom: 16,
          overflowY: 'auto',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 16 }}>
          <button
            onClick={() => navigate(backPath)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: colors.textLight,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 12,
              padding: 0,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.textMuted }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textLight }}
          >
            <ChevronLeft size={12} /> Modules
          </button>
          <h2 style={{ fontWeight: 700, fontSize: 14, color: colors.text, margin: 0 }}>{title}</h2>
        </div>
        <nav style={{ flex: 1, paddingLeft: 8, paddingRight: 8 }}>
          {items.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
                marginBottom: 2,
                transition: 'all 0.15s ease',
                backgroundColor: isActive ? color : 'transparent',
                color: isActive ? '#ffffff' : colors.textMuted,
                boxShadow: isActive ? `0 2px 8px ${color}40` : 'none',
              })}
              onMouseEnter={(e) => {
                const link = e.currentTarget
                const isActive = link.getAttribute('aria-current') === 'page'
                if (!isActive) {
                  link.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'
                  link.style.color = colors.text
                }
              }}
              onMouseLeave={(e) => {
                const link = e.currentTarget
                const isActive = link.getAttribute('aria-current') === 'page'
                if (!isActive) {
                  link.style.backgroundColor = 'transparent'
                  link.style.color = colors.textMuted
                }
              }}
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: colors.bg,
          transition: 'background 0.3s ease',
        }}
      >
        {banner && (
          <div style={{ borderBottom: `1px solid ${colors.border}` }}>
            {banner}
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}
