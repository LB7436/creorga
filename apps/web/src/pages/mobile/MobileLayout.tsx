import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Bell, Bot, Activity, Settings, Globe, Sparkles, Camera, Mic } from 'lucide-react'
import { useAssistant } from '@/stores/assistantStore'
import AssistantMascot from '@/components/AssistantMascot'
import { WakeWordListener } from '@/lib/assistantFeatures'
import { useNavigate } from 'react-router-dom'

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
  { to: '/m',           label: 'Live',     icon: Activity, end: true },
  { to: '/m/briefing',  label: 'Brief',    icon: Sparkles },
  { to: '/m/robi',      label: 'Robi',     icon: Bot },
  { to: '/m/magic',     label: 'Magic',    icon: Camera },
  { to: '/m/settings',  label: 'Réglages', icon: Settings },
]

export default function MobileLayout() {
  const a = useAssistant()
  const location = useLocation()
  const navigate = useNavigate()
  const [wakeActive, setWakeActive] = useState(false)

  // v3.17 — Hey Robi wake word listener (toggle via header pill)
  useEffect(() => {
    if (!wakeActive) return
    const wake = new WakeWordListener(a.name || 'Robi', () => {
      // Wake → navigate to Robi page (where the user can speak the command)
      navigate('/m/robi')
    })
    wake.start()
    return () => wake.stop()
  }, [wakeActive, a.name, navigate])

  // Lock viewport for mobile feel — v3.15 : overflow-x hidden global pour bloquer scroll horizontal
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
    const prevOverflow = document.body.style.overflowX
    const prevBehavior = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'
    return () => {
      if (meta) meta.setAttribute('content', 'width=device-width,initial-scale=1')
      document.body.style.overscrollBehavior = prevBehavior
      document.body.style.overflowX = prevOverflow
      document.documentElement.style.overflowX = ''
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* v3.17 — Hey Robi wake-word toggle */}
            <button onClick={() => setWakeActive((v) => !v)}
              style={{
                padding: '4px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: wakeActive ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'rgba(255,255,255,0.05)',
                color: wakeActive ? '#fff' : '#94a3b8',
                border: `1px solid ${wakeActive ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <Mic size={10} /> {wakeActive ? `Écoute "Hey ${a.name}"` : 'Mains-libres'}
            </button>
            <span style={{
              padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.15)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>● LIVE</span>
          </div>
        </div>
      </header>

      {/* Main content — overflow-x: hidden bloque scroll horizontal forcé par contenus large */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
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
