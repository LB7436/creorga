import { useState } from 'react'
import { useGuest } from './store'
import TabBar from './components/TabBar'
import GuestHome from './pages/GuestHome'
import MenuPage from './pages/MenuPage'
import OrderPage from './pages/OrderPage'
import AccountPage from './pages/AccountPage'
import FeedbackPage from './pages/FeedbackPage'

export type GuestTab = 'home' | 'menu' | 'order' | 'account' | 'feedback'

export default function App() {
  const [tab, setTab] = useState<GuestTab>('home')
  const guest = useGuest()
  const cartCount = guest.cart.reduce((s, c) => s + c.qty, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 480, margin: '0 auto', background: '#fff', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 72 }}>
        {tab === 'home' && <GuestHome onNavigate={setTab} />}
        {tab === 'menu' && <MenuPage />}
        {tab === 'order' && <OrderPage />}
        {tab === 'account' && <AccountPage />}
        {tab === 'feedback' && <FeedbackPage />}
      </div>
      <TabBar active={tab} onChange={setTab} cartCount={cartCount} />
    </div>
  )
}
