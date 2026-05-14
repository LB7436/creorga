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
  light: { bg: '#f8fafc', text: '#0f172a' },
  dark: { bg: '#0f0f1f', text: '#e2e8f0' },
  mauve: { bg: 'linear-gradient(180deg,#101022 0%,#1a0a2e 100%)', text: '#f1f5f9' },
}

export default function App() {
  const [tab, setTab] = useState<GuestTab>('home')
  const guest = useGuest()
  const cartCount = guest.cart.reduce((s, c) => s + c.qty, 0)

  const { config } = usePortalConfig(2500)
  const accent = config?.accentColor || '#6366f1'
  const toggles = config?.toggles || {}

  const [clientTheme, setClientTheme] = useState<ClientTheme>(() => {
    const saved = localStorage.getItem('creorga-guest-theme')
    return (saved as ClientTheme) || 'mauve'
  })

  useEffect(() => {
    if (config?.themeMode === 'light') setClientTheme('light')
    if (config?.themeMode === 'dark') setClientTheme('dark')
  }, [config?.themeMode])

  useEffect(() => {
    localStorage.setItem('creorga-guest-theme', clientTheme)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-guest-theme', clientTheme)
      const styles = THEME_STYLES[clientTheme]
      document.body.style.background = clientTheme === 'light' ? '#f8fafc' : '#0a0a14'
      document.body.style.color = styles.text
      document.body.style.minHeight = '100vh'
    }
  }, [clientTheme])

  useEffect(() => {
    if (tab === 'menu' && toggles.menu === false) setTab('home')
    if (tab === 'order' && toggles.order === false) setTab('home')
    if (tab === 'feedback' && toggles.reviews === false) setTab('home')
    if (tab === 'games' && toggles.games === false) setTab('home')
  }, [toggles, tab])

  const themeStyle = THEME_STYLES[clientTheme]

  return (
    <div className="guest-stage" style={{ ['--guest-accent' as string]: accent }}>
      <div className="guest-device">
        <div className="guest-shell" style={{ background: themeStyle.bg, color: themeStyle.text }}>
          <div className="guest-theme-picker" aria-label="Theme client">
            {(['light', 'dark', 'mauve'] as ClientTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setClientTheme(t)}
                aria-pressed={clientTheme === t}
                style={{
                  background: t === 'light' ? '#f8fafc' : t === 'dark' ? '#0f0f1f' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                }}
                title={t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Mauve'}
              />
            ))}
          </div>

          {config && <div className="guest-live-chip">LIVE</div>}

          <div className="guest-scroll">
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
      </div>
    </div>
  )
}
