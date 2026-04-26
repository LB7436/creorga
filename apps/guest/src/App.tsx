import { useState, useEffect } from 'react'
import { useGuest } from './store'
import TabBar from './components/TabBar'
import GuestHome from './pages/GuestHome'
import MenuPage from './pages/MenuPage'
import OrderPage from './pages/OrderPage'
import AccountPage from './pages/AccountPage'
import FeedbackPage from './pages/FeedbackPage'
import { usePortalConfig } from './usePortalConfig'

export type GuestTab = 'home' | 'menu' | 'order' | 'account' | 'feedback'

export default function App() {
  const [tab, setTab] = useState<GuestTab>('home')
  const guest = useGuest()
  const cartCount = guest.cart.reduce((s, c) => s + c.qty, 0)

  // Live portal config — admin changes at :5174/clients appear here live.
  const { config } = usePortalConfig(2500)
  const accent = config?.accentColor || '#6366f1'
  const toggles = config?.toggles || {}

  // If admin hides the current tab, snap back to home.
  useEffect(() => {
    if (tab === 'menu' && toggles.menu === false) setTab('home')
    if (tab === 'order' && toggles.order === false) setTab('home')
    if (tab === 'feedback' && toggles.reviews === false) setTab('home')
  }, [toggles, tab])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 480, margin: '0 auto', background: '#fff', position: 'relative' }}>
      {/* Live sync chip so you can see admin changes land in real time */}
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
          feedback: toggles.reviews === false,
        }}
        accent={accent}
      />
    </div>
  )
}
