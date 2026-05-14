import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronLeft, Maximize2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useThemeColors, useTheme } from '@/lib/theme'
import RobiSuggestionBanner from '@/components/RobiSuggestionBanner'

interface NavItem { label: string; path: string; icon: LucideIcon }
interface ModuleLayoutProps { title: string; color: string; items: NavItem[]; backPath?: string; banner?: React.ReactNode }

export default function ModuleLayout({ title, color, items, backPath = '/modules', banner }: ModuleLayoutProps) {
  const navigate = useNavigate()
  const colors = useThemeColors()
  const isDark = useTheme((s) => s.resolvedTheme) === 'dark'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false)
  const [kiosk, setKiosk] = useState(() => typeof window !== 'undefined' && localStorage.getItem('creorga.kioskMode') === 'true')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const onFullscreen = () => {
      const active = !!document.fullscreenElement
      setKiosk(active)
      localStorage.setItem('creorga.kioskMode', String(active))
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  const toggleKiosk = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.()
      setKiosk(true)
      localStorage.setItem('creorga.kioskMode', 'true')
    } else {
      await document.exitFullscreen?.()
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* sidebar */}
      {!isMobile && !kiosk && <aside
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
      </aside>}

      {/* content area
       * v3.18.8 — DARK THEME GLOBAL : tous les modules en sombre par cohérence.
       * Background dégradé violet/dark match le design des screenshots.
       * Les cartes claires hardcodées dans certaines pages restent visibles
       * (le contraste est correct), à migrer en v3.18.9 si besoin. */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: `linear-gradient(180deg, ${color}14 0%, transparent 220px), linear-gradient(145deg, #0a0a1a 0%, #0f0f2e 30%, #0d0b24 60%, #080818 100%)`,
          color: '#f1f5f9',
          transition: 'background 0.3s ease',
          paddingBottom: isMobile ? 72 : 0,
        }}
      >
        <button
          onClick={toggleKiosk}
          title="Mode kiosk"
          style={{ position: 'sticky', top: 12, right: 12, float: 'right', zIndex: 20, margin: 12, width: 36, height: 36, borderRadius: 12, border: `1px solid ${colors.border}`, background: 'rgba(15,23,42,0.76)', color: '#cbd5e1', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          <Maximize2 size={16} />
        </button>
        {banner && (
          <div style={{ borderBottom: `1px solid ${colors.border}` }}>
            {banner}
          </div>
        )}
        <RobiSuggestionBanner />
        <Outlet />
      </div>
      {isMobile && !kiosk && (
        <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, height: 64, background: colors.bgSidebar, borderTop: `1px solid ${colors.border}`, display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, items.length)}, 1fr)` }}>
          {items.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                color: isActive ? color : colors.textLight,
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: 800,
              })}
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
