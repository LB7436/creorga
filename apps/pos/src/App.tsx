import { useState } from 'react'
import FloorPlanPage from './pages/FloorPlanPage'
import OrderPage from './pages/OrderPage'
import PaymentPage from './pages/PaymentPage'
import ConfigPage from './pages/ConfigPage'
import PinLoginPage from './pages/PinLoginPage'
import KioskPage from './pages/KioskPage'
import { usePOS } from './store/posStore'

export type AppView = 'pin_login' | 'floor' | 'order' | 'payment' | 'config' | 'kiosk'

const S = {
  app: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    height: '100vh',
    background: '#07070d',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '0 20px',
    height: 52,
    background: '#0a0a16',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
    zIndex: 20,
  },
  left: { display: 'flex' as const, alignItems: 'center' as const, gap: 12 },
  right: { display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
  logo: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: '#818cf8',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  breadcrumb: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  main: { flex: 1, overflow: 'hidden' as const, position: 'relative' as const },
}

const btn = (active = false, danger = false) => ({
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 6,
  padding: '6px 14px',
  borderRadius: 8,
  border: active ? '1px solid rgba(129,140,248,0.5)' : danger ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
  background: active ? 'rgba(99,102,241,0.15)' : danger ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.04)',
  color: active ? '#a5b4fc' : danger ? '#fb7185' : '#94a3b8',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all .15s',
})

export default function App() {
  const [view, setView] = useState<AppView>('pin_login')
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const tables = usePOS(s => s.tables)
  const settings = usePOS(s => s.settings)
  const currentStaff = usePOS(s => s.currentStaff)
  const logoutStaff = usePOS(s => s.logoutStaff)
  const kioskMode = usePOS(s => s.kioskMode)
  const setKioskMode = usePOS(s => s.setKioskMode)

  // Auto-transition when staff logs in
  if (view === 'pin_login' && currentStaff) {
    setView('floor')
  }

  const activeTable = activeTableId ? tables.find(t => t.id === activeTableId) : null

  function openOrder(tableId: string) {
    setActiveTableId(tableId)
    setView('order')
  }

  function openPayment(tableId: string) {
    setActiveTableId(tableId)
    setView('payment')
  }

  function goBack() {
    if (view === 'payment') {
      setView('order')
    } else if (view === 'order') {
      setActiveTableId(null)
      setView('floor')
    } else if (view === 'config') {
      setView('floor')
    } else if (view === 'kiosk') {
      setKioskMode(false)
      setView('floor')
    }
  }

  // PIN login screen
  if (view === 'pin_login' || !currentStaff) {
    return <PinLoginPage />
  }

  // Kiosk mode
  if (view === 'kiosk' || kioskMode) {
    return <KioskPage onExit={() => { setKioskMode(false); setView('floor') }} />
  }

  const occupiedCount = tables.filter(t => t.status === 'occupied').length

  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.left}>
          {/* Logo */}
          <div style={S.logo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
              <rect x="13" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
              <rect x="3" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
            </svg>
            {settings.restaurantName}
          </div>

          {/* Breadcrumb */}
          {view !== 'floor' && (
            <div style={S.breadcrumb}>
              <span>/</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {view === 'config' ? 'Configuration' : activeTable?.name ?? ''}
              </span>
              {view === 'payment' && <><span>/</span><span style={{ color: '#a5b4fc' }}>Paiement</span></>}
            </div>
          )}
        </div>

        <div style={S.right}>
          {/* Occupied badge */}
          {view === 'floor' && occupiedCount > 0 && (
            <div style={{ fontSize: 12, color: '#818cf8', background: 'rgba(99,102,241,0.12)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
              {occupiedCount} table{occupiedCount > 1 ? 's' : ''} occupée{occupiedCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Back button */}
          {view !== 'floor' && (
            <button onClick={goBack} style={btn()}>
              ← Retour
            </button>
          )}

          {/* Kiosk button */}
          {view === 'floor' && (
            <button onClick={() => { setKioskMode(true); setView('kiosk') }} style={btn(false)}>
              Kiosque
            </button>
          )}

          {/* Config button */}
          {view !== 'config' && (
            <button onClick={() => setView('config')} style={btn(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Config
            </button>
          )}

          {/* Staff indicator + logout */}
          {currentStaff && (
            <button onClick={() => { logoutStaff(); setView('pin_login') }} style={btn(false, true)} title="Déconnexion">
              <div style={{ width: 6, height: 6, borderRadius: 3, background: currentStaff.color }} />
              {currentStaff.name} ✕
            </button>
          )}
        </div>
      </header>

      <main style={S.main}>
        {view === 'floor' && (
          <FloorPlanPage onOpenOrder={openOrder} />
        )}
        {view === 'order' && activeTableId && (
          <OrderPage
            tableId={activeTableId}
            onBack={() => { setActiveTableId(null); setView('floor') }}
            onPay={() => openPayment(activeTableId)}
          />
        )}
        {view === 'payment' && activeTableId && (
          <PaymentPage
            tableId={activeTableId}
            onBack={() => setView('order')}
            onDone={() => { setActiveTableId(null); setView('floor') }}
          />
        )}
        {view === 'config' && (
          <ConfigPage onBack={() => setView('floor')} />
        )}
      </main>
    </div>
  )
}
