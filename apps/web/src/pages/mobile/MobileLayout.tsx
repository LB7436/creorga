import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Bell, Bot, Activity, Settings, Globe } from 'lucide-react'
import { useAssistant } from '@/stores/assistantStore'
import AssistantMascot from '@/components/AssistantMascot'

/**
 * Mobile / PWA layout — designed for phone & tablet use, away from the
 * restaurant. Patron / super-admin can supervise from anywhere.
 *
 * Routes :
 *   /m          → live dashboard (KPI gros, alertes)
 *   /m/robi     → assistant plein écran tactile
 *   /m/alerts   → alertes critiques
 *   /m/settings → réglages distants (URL backend, voix, mascotte)
 */

const NAV = [
  { to: '/m',          label: 'Live',     icon: Activity, end: true },
  { to: '/m/alerts',   label: 'Alertes',  icon: Bell },
  { to: '/m/robi',     label: 'Robi',     icon: Bot },
  { to: '/m/world',    label: 'Distance', icon: Globe },
  { to: '/m/settings', label: 'Réglages', icon: Settings },
]

export default function MobileLayout() {
  const a = useAssistant()
  const location = useLocation()

  // Lock viewport for mobile feel
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no')
    document.body.style.overscrollBehavior = 'none'
    return () => {
      if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1')
      document.body.style.overscrollBehavior = ''
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg,#0a0a14 0%, #1a0a2e 100%)',
      color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Top bar */}
      <header style={{
        flexShrink: 0, padding: 'env(safe-area-inset-top, 0) 14px 0',
        background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', justifyContent: 'space-between' }}>
          <Link to="/m" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#fff' }}>
            <AssistantMascot variant={a.mascot} size={32} animated={false} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Creorga · {a.name}</div>
              <div style={{ fontSize: 10, color: '#a78bfa' }}>📱 Mode distant</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.15)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>● LIVE</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav style={{
        flexShrink: 0, padding: '6px 6px calc(6px + env(safe-area-inset-bottom, 0))',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'grid', gridTemplateColumns: `repeat(${NAV.length}, 1fr)`, gap: 4,
      }}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end as any}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', borderRadius: 10,
              background: isActive ? 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(236,72,153,0.15))' : 'transparent',
              color: isActive ? '#a78bfa' : '#94a3b8',
              textDecoration: 'none', fontSize: 10, fontWeight: 700,
            })}
          >
            <n.icon size={18} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
