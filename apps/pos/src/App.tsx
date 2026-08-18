import { useState, useEffect } from 'react'
// framer-motion animations handled within individual pages
import FloorPlanPage from './pages/FloorPlanPage'
import OrderPage from './pages/OrderPage'
import PaymentPage from './pages/PaymentPage'
import ConfigPage from './pages/ConfigPage'
import PinLoginPage from './pages/PinLoginPage'
import KioskPage from './pages/KioskPage'
import FloorPlanEditor from './pages/FloorPlanEditor'
import WaiterMode from './pages/WaiterMode'
import KitchenDisplay from './pages/KitchenDisplay'
import JournalPage from './pages/JournalPage'
import { usePOS } from './store/posStore'

export type AppView = 'pin_login' | 'floor' | 'order' | 'payment' | 'config' | 'kiosk' | 'editor' | 'waiter' | 'kitchen' | 'journal'

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

  /**
   * Reverrouillage automatique après 10 minutes sans interaction.
   *
   * La session n'était JAMAIS reverrouillée : une tablette laissée sur le
   * comptoir restait ouverte au nom du serveur connecté, avec accès aux
   * ventes, aux annulations et à la configuration. En kiosque, on ne
   * reverrouille pas — c'est un mode public, sans session à protéger.
   */
  useEffect(() => {
    if (!currentStaff || kioskMode) return
    let minuteur: number
    const reprogrammer = () => {
      window.clearTimeout(minuteur)
      minuteur = window.setTimeout(() => {
        logoutStaff()
        setView('pin_login')
      }, 10 * 60_000)
    }
    const evenements = ['pointerdown', 'keydown', 'touchstart'] as const
    evenements.forEach(e => window.addEventListener(e, reprogrammer, { passive: true }))
    reprogrammer()
    return () => {
      window.clearTimeout(minuteur)
      evenements.forEach(e => window.removeEventListener(e, reprogrammer))
    }
  }, [currentStaff, kioskMode, logoutStaff])

  const activeTable = activeTableId ? tables.find(t => t.id === activeTableId) : null
  const occupiedCount = tables.filter(t => t.status === 'occupied').length

  function openOrder(tableId: string) {
    setActiveTableId(tableId)
    setView('order')
  }

  function openPayment(tableId: string) {
    setActiveTableId(tableId)
    setView('payment')
  }

  /**
   * Raccourcis clavier globaux (poste de caisse avec clavier) :
   *   N  nouvelle commande — première table libre, ou la table active
   *   P  paiement de la table active
   *   K  écran cuisine
   *   T  retour au plan de salle (rechercher une table)
   *   Échap  fermer le panneau / revenir en arrière
   * Ctrl/Cmd+K est laissé au navigateur et au back-office (recherche
   * globale) : la caisse ne le capture pas.
   *
   * Aucun raccourci ne se déclenche depuis un champ de saisie : taper « n »
   * dans une note cuisine ne doit pas ouvrir une commande.
   */
  useEffect(() => {
    if (!currentStaff || kioskMode) return
    const gestionnaire = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      const saisie = cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable)
      if (saisie) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const touche = e.key.toLowerCase()
      if (e.key === 'Escape') {
        if (view !== 'floor') { e.preventDefault(); goBack() }
        return
      }
      if (touche === 'n' && view === 'floor') {
        e.preventDefault()
        const libre = tables.find(t => t.status === 'available')
        if (libre) { usePOS.getState().openTable(libre.id, 2); openOrder(libre.id) }
        return
      }
      if (touche === 'p' && (view === 'order' || view === 'floor') && activeTableId) {
        e.preventDefault()
        openPayment(activeTableId)
        return
      }
      if (touche === 'k' && view === 'floor') {
        e.preventDefault()
        setView('kitchen')
        return
      }
      if (touche === 't' && view !== 'floor' && view !== 'payment') {
        e.preventDefault()
        setActiveTableId(null)
        setView('floor')
      }
    }
    window.addEventListener('keydown', gestionnaire)
    return () => window.removeEventListener('keydown', gestionnaire)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStaff, kioskMode, view, activeTableId, tables])

  function goBack() {
    if (view === 'payment') {
      setView('order')
    } else if (view === 'order') {
      setActiveTableId(null)
      setView('floor')
    } else if (view === 'config') {
      setView('floor')
    } else if (view === 'editor') {
      setView('floor')
    } else if (view === 'kiosk') {
      setKioskMode(false)
      setView('floor')
    } else if (view === 'waiter') {
      setView('floor')
    } else if (view === 'kitchen') {
      setView('floor')
    }
  }

  // ── PIN login screen (full takeover) ──
  if (view === 'pin_login' || !currentStaff) {
    return <PinLoginPage />
  }

  // ── Kiosk mode (full takeover) ──
  if (view === 'kiosk' || kioskMode) {
    return <KioskPage onExit={() => { setKioskMode(false); setView('floor') }} />
  }

  // ── Waiter tablet mode (full takeover) ──
  if (view === 'waiter') {
    return <WaiterMode onExit={() => setView('floor')} />
  }

  // ── Kitchen Display System (full takeover) ──
  if (view === 'kitchen') {
    return <KitchenDisplay onExit={() => setView('floor')} />
  }

  // ── Journal des ventes et clôture (ticket Z) ──
  if (view === 'journal') {
    return <JournalPage onExit={() => setView('floor')} />
  }

  // ── Breadcrumb segments ──
  function renderBreadcrumb() {
    if (view === 'floor') return null
    const segments: { label: string; color: string }[] = []
    if (view === 'config') {
      segments.push({ label: 'Configuration', color: 'rgba(255,255,255,0.5)' })
    } else {
      if (activeTable) segments.push({ label: activeTable.name, color: 'rgba(255,255,255,0.5)' })
      if (view === 'payment') segments.push({ label: 'Paiement', color: '#a5b4fc' })
    }
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'rgba(255,255,255,0.25)',
      }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>/</span>
            <span style={{ color: seg.color }}>{seg.label}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      background: '#07070d',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* ── Header bar ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 52,
        background: 'rgba(10,10,22,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Left: logo + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo icon (4 squares) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#818cf8',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
              <rect x="13" y="3" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
              <rect x="3" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".5"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="#6366f1" opacity=".9"/>
            </svg>
            {settings.restaurantName}
          </div>

          {/* Breadcrumb */}
          {renderBreadcrumb()}
        </div>

        {/* Right: badges + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Occupied table count badge */}
          {occupiedCount > 0 && (
            <div style={{
              fontSize: 12, color: '#818cf8', fontWeight: 600,
              background: 'rgba(99,102,241,0.1)',
              padding: '4px 12px', borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              {occupiedCount} table{occupiedCount > 1 ? 's' : ''} occupée{occupiedCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Back button */}
          {view !== 'floor' && (
            <button onClick={goBack} style={headerBtn()}>
              ← Retour
            </button>
          )}

          {/* Cuisine (KDS) button */}
          {view === 'floor' && (
            <button
              onClick={() => setView('kitchen')}
              style={headerBtn()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z"/>
                <line x1="6" y1="17" x2="18" y2="17"/>
              </svg>
              Cuisine
            </button>
          )}

          {/* Journal des ventes — la caisse n'enregistrait rien avant. */}
          {view === 'floor' && (
            <button
              onClick={() => setView('journal')}
              style={headerBtn()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 3h12l4 4v14H4z"/>
                <line x1="8" y1="9" x2="16" y2="9"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="13" y2="17"/>
              </svg>
              Journal
            </button>
          )}

          {/* Serveur (Waiter) button */}
          {view === 'floor' && (
            <button
              onClick={() => setView('waiter')}
              style={headerBtn()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Serveur
            </button>
          )}

          {/* Kiosque button */}
          {view === 'floor' && (
            <button
              onClick={() => { setKioskMode(true); setView('kiosk') }}
              style={headerBtn()}
            >
              Kiosque
            </button>
          )}

          {/* Editor button */}
          {view === 'floor' && (
            <button onClick={() => setView('editor')} style={headerBtn()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Éditeur
            </button>
          )}

          {/* Config (gear) button */}
          {view !== 'config' && view !== 'editor' && (
            <button onClick={() => setView('config')} style={headerBtn()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Config
            </button>
          )}

          {/* Staff name + colored dot + logout */}
          {currentStaff && (
            <button
              onClick={() => { logoutStaff(); setView('pin_login') }}
              style={headerBtn(false, true)}
              title="Déconnexion"
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: currentStaff.color,
                boxShadow: `0 0 6px ${currentStaff.color}`,
                flexShrink: 0,
              }} />
              {currentStaff.name}
              <span style={{ opacity: 0.6, marginLeft: 2 }}>✕</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' as const }}>
        {view === 'floor' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <FloorPlanPage onOpenOrder={openOrder} />
          </div>
        )}

        {view === 'order' && activeTableId && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <OrderPage
              tableId={activeTableId}
              onBack={() => { setActiveTableId(null); setView('floor') }}
              onPay={() => openPayment(activeTableId)}
            />
          </div>
        )}

        {view === 'payment' && activeTableId && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <PaymentPage
              tableId={activeTableId}
              onBack={() => setView('order')}
              onDone={() => { setActiveTableId(null); setView('floor') }}
            />
          </div>
        )}

        {view === 'config' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <ConfigPage onBack={() => setView('floor')} onOpenEditor={() => setView('editor')} />
          </div>
        )}

        {view === 'editor' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <FloorPlanEditor onBack={() => setView('floor')} />
          </div>
        )}
      </main>
    </div>
  )
}

/* ── Header button helper ─────────────────────────────────────────────────── */
function headerBtn(active = false, danger = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    border: active
      ? '1px solid rgba(129,140,248,0.5)'
      : danger
        ? '1px solid rgba(244,63,94,0.3)'
        : '1px solid rgba(255,255,255,0.08)',
    background: active
      ? 'rgba(99,102,241,0.15)'
      : danger
        ? 'rgba(244,63,94,0.1)'
        : 'rgba(255,255,255,0.04)',
    color: active
      ? '#a5b4fc'
      : danger
        ? '#fb7185'
        : '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all .15s',
    fontFamily: 'inherit',
  }
}
