import { useState, useEffect } from 'react'
import { useGuest } from './store'
import TabBar from './components/TabBar'
import GuestHome from './pages/GuestHome'
import MenuPage from './pages/MenuPage'
import OrderPage from './pages/OrderPage'
import AccountPage from './pages/AccountPage'
import FeedbackPage from './pages/FeedbackPage'
import GamesPage from './pages/GamesPage'
import { usePortalConfig } from './usePortalConfig'

export type GuestTab = 'home' | 'menu' | 'order' | 'games' | 'account' | 'feedback'

type ClientTheme = 'light' | 'dark' | 'mauve'

const THEME_STYLES: Record<ClientTheme, { bg: string; text: string }> = {
  light: { bg: '#fff', text: '#1e293b' },
  dark:  { bg: '#0f0f1f', text: '#e2e8f0' },
  mauve: { bg: 'linear-gradient(135deg,#1a0a2e,#0d0b24)', text: '#f1f5f9' },
}

export default function App() {
  const [tab, setTab] = useState<GuestTab>('home')
  const guest = useGuest()
  const cartCount = guest.cart.reduce((s, c) => s + c.qty, 0)

  // Live portal config — admin changes at :5174/clients appear here live.
  const { config } = usePortalConfig(2500)
  const accent = config?.accentColor || '#6366f1'
  const toggles = config?.toggles || {}

  // Client-side theme picker (independent of admin) — persisted localStorage
  // Default: 'mauve' (Creorga signature dark theme — matches main app)
  const [clientTheme, setClientTheme] = useState<ClientTheme>(() => {
    const saved = localStorage.getItem('creorga-guest-theme')
    return (saved as ClientTheme) || 'mauve'
  })
  useEffect(() => {
    localStorage.setItem('creorga-guest-theme', clientTheme)
    // Apply theme on <body> + <html> so all child pages (Menu, Order…) inherit dark bg
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-guest-theme', clientTheme)
      const styles = THEME_STYLES[clientTheme]
      document.body.style.background = styles.bg
      document.body.style.color = styles.text
      document.body.style.minHeight = '100vh'
    }
  }, [clientTheme])

  // If admin hides the current tab, snap back to home.
  useEffect(() => {
    if (tab === 'menu' && toggles.menu === false) setTab('home')
    if (tab === 'order' && toggles.order === false) setTab('home')
    if (tab === 'feedback' && toggles.reviews === false) setTab('home')
    if (tab === 'games' && toggles.games === false) setTab('home')
  }, [toggles, tab])

  const themeStyle = THEME_STYLES[clientTheme]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', maxWidth: 480, margin: '0 auto',
      background: themeStyle.bg, color: themeStyle.text,
      position: 'relative',
    }}>
      {/* Theme picker (top-right floating) */}
      <div style={{
        position: 'absolute', top: 8, left: 12, zIndex: 100,
        display: 'flex', gap: 4,
      }}>
        {(['light', 'dark', 'mauve'] as ClientTheme[]).map((t) => (
          <button key={t} onClick={() => setClientTheme(t)} style={{
            width: 22, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: t === 'light' ? '#fff' : t === 'dark' ? '#0f0f1f' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
            outline: clientTheme === t ? `2px solid ${accent}` : `1px solid rgba(148,163,184,0.3)`,
          }} title={t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Mauve'} />
        ))}
      </div>

      {/* Live sync chip */}
      {config && (
        <div style={{
          position: 'absolute', top: 8, right: 12, zIndex: 100,
          fontSize: 9, padding: '3px 8px', borderRadius: 999,
          background: `${accent}22`, color: accent, fontWeight: 700,
          pointerEvents: 'none', letterSpacing: 0.6,
        }}>● LIVE</div>
      )}

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 72 }}>
        {tab === 'home' && <GuestHome onNavigate={setTab} />}
        {tab === 'menu' && toggles.menu !== false && <MenuPage />}
        {tab === 'order' && toggles.order !== false && <OrderPage />}
        {tab === 'games' && toggles.games !== false && <GamesPage />}
        {tab === 'account' && <AccountPage />}
        {tab === 'feedback' && toggles.reviews !== false && <FeedbackPage />}
      </div>

      <TabBar
        active={tab}
        onChange={setTab}
        cartCount={cartCount}
        hide={{
          menu: toggles.menu === false,
          order: toggles.order === false,
          games: toggles.games === false,
          feedback: toggles.reviews === false,
        }}
        accent={accent}
      />
    </div>
  )
}
