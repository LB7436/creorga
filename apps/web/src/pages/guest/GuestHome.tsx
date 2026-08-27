import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, Check,
  UtensilsCrossed, MessageSquare, X, Megaphone,
  Globe, Gamepad2,
  ShoppingCart, Plus, Minus, ChevronDown, ChevronUp,
  Star,
} from 'lucide-react'
import GamesSection from './GamesSection'
import { useAuthStore } from '@/stores/authStore'
import { usePortalConfig } from '@/hooks/usePortalConfig'
import GuestRegistrationModal from './GuestRegistrationModal'
import {
  guestDisplayName,
  loadGuestClient,
  recordGuestEvent,
  type GuestClientProfile,
} from './guestClient'
import { useGuestLang } from './i18n'
import OrderTracking from './OrderTracking'
import GuestCallButtons from './GuestCallButtons'
import GuestLoyaltyCard from './GuestLoyaltyCard'

// ─── Types ─────────────────────────────────────────────

interface Announcement {
  id: string
  message: string
}

export const ACCENT = '#a855f7'
export const ACCENT2 = '#06b6d4'
export const BG = '#05050f'
export const SURFACE = '#0e0d20'
export const SURFACE2 = '#16153a'
export const BORDER = 'rgba(168,85,247,0.18)'
export const TEXT = '#f8fafc'
export const MUTED = '#94a3b8'

function guestTheme(mode?: 'dark' | 'light') {
  if (mode === 'light') {
    return {
      bg: '#f6f8fb',
      surface: '#ffffff',
      border: '#dbe4f0',
      text: '#0f172a',
      muted: '#64748b',
    }
  }
  return { bg: BG, surface: SURFACE, border: BORDER, text: TEXT, muted: MUTED }
}

// ─── Announcements ──────────────────────────────────────

function AnnouncementsBanner({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = items.filter((a) => !dismissed.has(a.id))
  if (!visible.length) return null
  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border px-3 py-2.5" style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <Megaphone className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <p className="flex-1 text-sm text-amber-200/90">{a.message}</p>
          <button onClick={() => setDismissed((p) => new Set(p).add(a.id))}>
            <X className="h-3.5 w-3.5 text-amber-400/50 hover:text-amber-400" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Language picker ─────────────────────────────────────

const LANGS = [
  { code: 'fr', flag: '\🇫\🇷', name: 'Français' },
  { code: 'en', flag: '\🇬\🇧', name: 'English' },
  { code: 'de', flag: '\🇩\🇪', name: 'Deutsch' },
  { code: 'pt', flag: '\🇵\🇹', name: 'Português' },
]

function LangPicker({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors"
        style={{ background: SURFACE, borderColor: BORDER, color: MUTED }}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{current.code}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 rounded-xl border overflow-hidden min-w-[140px]" style={{ background: SURFACE, borderColor: BORDER }}>
            {LANGS.map(({ code, flag, name }) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:opacity-80"
                style={{
                  background: lang === code ? `rgba(109,40,217,0.15)` : 'transparent',
                  color: lang === code ? ACCENT : TEXT,
                }}
              >
                {flag} {name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────

type Tab = 'jeux' | 'menu' | 'avis'

export default function GuestHome() {
  const company = useAuthStore((s) => s.company)
  const authCompanyId = useAuthStore((s) => s.companyId)
  const [searchParams] = useSearchParams()
  const portalCompanyId = searchParams.get('companyId') || (searchParams.get('preview') === 'admin' ? authCompanyId : null)
  const { config, error: configError } = usePortalConfig(2500, portalCompanyId)
  const tableId = searchParams.get('table')
  const embed = searchParams.get('embed')

  const [tab, setTab] = useState<Tab>('jeux')
  const { lang, setLang, t } = useGuestLang()
  const [announcements] = useState<Announcement[]>([])
  const [guestClient, setGuestClient] = useState<GuestClientProfile | null>(() => loadGuestClient(portalCompanyId))
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [registrationReason, setRegistrationReason] = useState('Creorga crée votre fiche client pour les commandes, les avis et les records de jeux.')

  // Cart state shared with menu
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('creorga-cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('creorga-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const refreshGuest = () => setGuestClient(loadGuestClient(portalCompanyId))
    window.addEventListener('creorga-guest-client-updated', refreshGuest)
    window.addEventListener('storage', refreshGuest)
    return () => {
      window.removeEventListener('creorga-guest-client-updated', refreshGuest)
      window.removeEventListener('storage', refreshGuest)
    }
  }, [portalCompanyId])

  const requireGuestClient = (reason: string) => {
    const current = loadGuestClient(portalCompanyId)
    if (current) {
      setGuestClient(current)
      return true
    }
    setRegistrationReason(reason)
    setRegistrationOpen(true)
    return false
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const addToCart = (product: { id: string; name: string; price: number; emoji: string }) => {
    if (!requireGuestClient('Inscrivez-vous pour commander: email, mobile et pseudo permettent au serveur et au patron de retrouver votre demande.')) return
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0))
  }

  const clearCart = () => setCart([])

  const toggles = config?.toggles ?? {}
  const accent = config?.accentColor || ACCENT
  const restaurantName = config?.restaurantName || company?.name || 'Creorga'
  const theme = guestTheme(config?.themeMode)

  if (!portalCompanyId) {
    return <GuestPortalError title="QR incomplet" message="Ce lien ne contient pas l’identifiant de l’établissement. Scannez à nouveau le QR affiché sur votre table." />
  }

  if (configError && !config) {
    return <GuestPortalError title="Portail indisponible" message="Impossible de charger cet établissement pour le moment. Vérifiez le QR ou réessayez plus tard." />
  }

  if (!config) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: BG, color: TEXT }}><Loader2 className="h-7 w-7 animate-spin" /></main>
  }

  if (embed === 'games') {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
        <GamesSection companyId={portalCompanyId} />
      </div>
    )
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number; visible: boolean }[] = [
    { id: 'jeux', icon: <Gamepad2 className="h-5 w-5" />, label: t('tab_games'), visible: toggles.games !== false },
    { id: 'menu', icon: <UtensilsCrossed className="h-5 w-5" />, label: t('tab_menu'), badge: cartCount || undefined, visible: toggles.menu !== false },
    { id: 'avis', icon: <MessageSquare className="h-5 w-5" />, label: t('tab_reviews'), visible: toggles.reviews !== false },
  ]
  const visibleTabs = tabs.filter((item) => item.visible)
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : (visibleTabs[0]?.id ?? 'jeux')

  return (
    <div className="flex min-h-screen flex-col" style={{ background: theme.bg, color: theme.text }}>

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3"
        style={{ background: theme.bg, borderColor: theme.border }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: accent }}>
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: theme.text }}>
              {restaurantName}
            </p>
            {tableId && (
              <p className="text-[10px]" style={{ color: theme.muted }}>Table {tableId}</p>
            )}
          </div>
        </div>
        <LangPicker lang={lang} setLang={setLang} />
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <AnnouncementsBanner items={announcements} />
        {guestClient?.phone && <GuestLoyaltyCard phone={guestClient.phone} companyId={portalCompanyId} />}

        {/* JEUX */}
        {activeTab === 'jeux' && toggles.games !== false && (
          <GamesSection companyId={portalCompanyId} />
        )}

        {/* MENU */}
        {activeTab === 'menu' && toggles.menu !== false && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GuestMenu
              cart={cart}
              addToCart={addToCart}
              updateQty={updateQty}
              clearCart={clearCart}
              cartCount={cartCount}
              cartTotal={cartTotal}
              guestClient={guestClient}
              requireGuestClient={requireGuestClient}
              tableNumber={tableId}
              companyId={portalCompanyId}
              t={t}
            />
          </motion.div>
        )}

        {/* AVIS */}
        {activeTab === 'avis' && toggles.reviews !== false && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GuestFeedback
              onBack={() => setTab('jeux')}
              guestClient={guestClient}
              requireGuestClient={requireGuestClient}
              companyId={portalCompanyId}
            />
          </motion.div>
        )}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t"
        style={{ background: theme.surface, borderColor: theme.border }}
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors relative"
            style={{ color: activeTab === t.id ? accent : theme.muted }}
          >
            {t.icon}
            <span className="text-[10px] font-medium">{t.label}</span>
            {t.badge && t.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: '50%',
                marginRight: -16,
                background: '#ef4444',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <GuestRegistrationModal
        open={registrationOpen}
        reason={registrationReason}
        onClose={() => setRegistrationOpen(false)}
        onSaved={(profile) => setGuestClient(profile)}
        companyId={portalCompanyId}
      />

    </div>
  )
}

function GuestPortalError({ title, message }: { title: string; message: string }) {
  return (
    <main style={{ minHeight: '100vh', padding: 24, display: 'grid', placeItems: 'center', background: BG, color: TEXT }}>
      <section style={{ maxWidth: 460, padding: 28, border: `1px solid ${BORDER}`, borderRadius: 20, background: SURFACE, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
        <p style={{ margin: '12px 0 0', color: MUTED, lineHeight: 1.6 }}>{message}</p>
      </section>
    </main>
  )
}


// ═══════════════════════════════════════════════════════════
// ─── MENU WITH ORDERING FLOW ─────────────────────────────
// ═══════════════════════════════════════════════════════════

interface CartItem {
  id: string
  name: string
  price: number
  emoji: string
  qty: number
}

interface MenuProduct {
  id: string
  name: string
  price: number
  description: string
  emoji: string
  stockTracked?: boolean
  stockQty?: number | null
  stockUnit?: string | null
  stockStatus?: 'UNTRACKED' | 'OUT' | 'LOW' | 'OK'
  isAvailable?: boolean
}

interface MenuCategory {
  id: string
  name: string
  emoji: string
  products: MenuProduct[]
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

function GuestMenu({
  cart, addToCart, updateQty, clearCart, cartCount, cartTotal, guestClient, requireGuestClient, tableNumber, companyId, t,
}: {
  cart: CartItem[]
  addToCart: (p: { id: string; name: string; price: number; emoji: string }) => void
  updateQty: (id: string, delta: number) => void
  clearCart: () => void
  cartCount: number
  cartTotal: number
  guestClient: GuestClientProfile | null
  requireGuestClient: (reason: string) => boolean
  tableNumber: string | null
  companyId: string
  t: (key: string) => string
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderState, setOrderState] = useState<'idle' | 'sending' | 'success'>('idle')
  // Refus du serveur (produit inconnu, table manquante, base indisponible) :
  // affiché tel quel au lieu d'un faux écran « commande envoyée ».
  const [orderError, setOrderError] = useState<string | null>(null)
  // Addition telle que calculée par le serveur (prix de la base, pas du panier).
  const [lastOrderTotal, setLastOrderTotal] = useState<number | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMenuError(null)
    fetch(`${BACKEND}/api/portal-config/menu?companyId=${encodeURIComponent(companyId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((payload) => {
        if (cancelled) return
        const enriched = (payload.categories ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          emoji: c.icon || '🍽️',
          products: (c.products ?? []).map((p: any) => ({
            ...p,
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description || '',
            emoji: p.emoji || p.icon || c.icon || '🍽️',
          })),
        })).filter((cat: MenuCategory) => cat.products.length)
        setCategories(enriched)
        setActiveCategory(enriched[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([])
          setActiveCategory(null)
          setMenuError('La carte ne peut pas être chargée pour le moment.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [companyId])

  const handleAdd = (product: MenuProduct) => {
    addToCart({ id: product.id, name: product.name, price: product.price, emoji: product.emoji })
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 600)
  }

  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  const handleSendOrder = () => {
    if (!requireGuestClient('Inscrivez-vous pour envoyer une commande: le serveur verra votre nom, mobile, table et historique client.')) return
    setOrderState('sending')
    setOrderError(null)
    // Le serveur recalcule les prix depuis sa base ; on n'envoie que les
    // identifiants et quantités (le nom sert au journal client local).
    const orderItems = cart.map((item) => ({ productId: item.id, name: item.name, qty: item.qty, price: item.price }))

    fetch(`${(import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'}/api/guest/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, tableId: tableNumber || 'sans-table', items: orderItems.map(({ productId, qty }) => ({ productId, qty })) }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error || `Commande refusée (HTTP ${r.status})`)
        return data
      })
      .then((data) => {
        if (data?.id) setLastOrderId(data.id)
        setLastOrderTotal(typeof data?.total === 'number' ? data.total : null)
        recordGuestEvent('order', guestClient ?? loadGuestClient(companyId), {
          items: orderItems,
          total: typeof data?.total === 'number' ? data.total : total,
          tableNumber,
          orderId: data?.id,
        }, companyId)
        setOrderState('success')
        clearCart()
      })
      .catch((e: any) => {
        // Un refus ou une panne n'est pas une commande envoyée : on le dit,
        // le panier reste intact pour réessayer ou appeler le serveur.
        setOrderState('idle')
        setOrderError(e?.message || 'Commande impossible pour le moment. Appelez le serveur.')
      })
  }

  // Les prix de la carte publique sont les prix finaux affichés au client.
  // Le serveur recalcule toujours ce total depuis sa propre base.
  const total = cartTotal

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
    </div>
  )

  if (menuError) return (
    <div role="alert" style={{ padding: 24, borderRadius: 16, border: `1px solid ${BORDER}`, background: SURFACE, color: '#fca5a5', textAlign: 'center' }}>
      {menuError}
    </div>
  )

  if (categories.length === 0) return (
    <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${BORDER}`, background: SURFACE, color: MUTED, textAlign: 'center' }}>
      Aucun produit n'est publié dans la carte pour le moment.
    </div>
  )

  // Order success screen
  if (orderState === 'success') return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-16 gap-5"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(34,197,94,0.3)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Check style={{ color: '#fff', width: 40, height: 40, strokeWidth: 3 }} />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
          {t('order_success_title')}
        </h3>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
          {t('order_success_subtitle')}
        </p>
      </motion.div>
      {/* Floating dots animation */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 0], y: [20, -10, -30] }}
            transition={{ delay: 0.5 + i * 0.1, duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            style={{
              width: 6, height: 6, borderRadius: 3,
              background: ['#22c55e', ACCENT, '#f59e0b', '#06b6d4', '#ec4899'][i],
            }}
          />
        ))}
      </div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => setOrderState('idle')}
        style={{
          marginTop: 12, padding: '10px 24px', borderRadius: 12,
          background: SURFACE, color: TEXT, fontSize: 14, fontWeight: 600,
          border: `1px solid ${BORDER}`,
        }}
      >
        Nouvelle commande
      </motion.button>

      {tableNumber && (
        <div style={{ width: '100%', maxWidth: 340 }}>
          {lastOrderId && <OrderTracking orderId={lastOrderId} tableId={tableNumber} companyId={companyId} />}
          {/* Montant réellement enregistré par le serveur, pas le panier local. */}
          <GuestCallButtons tableId={tableNumber} companyId={companyId} billTotal={lastOrderTotal ?? undefined} />
        </div>
      )}
    </motion.div>
  )

  const active = categories.find((c) => c.id === activeCategory)

  return (
    <div style={{ paddingBottom: cartCount > 0 ? 70 : 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderRadius: 14,
        border: `1px solid ${BORDER}`,
        background: SURFACE,
        padding: '10px 12px',
        marginBottom: 12,
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>Carte publiée par l'établissement</p>
          <p style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>
            Profil: {guestClient ? guestDisplayName(guestClient) : 'inscription requise pour commander'}
          </p>
        </div>
        {!guestClient && (
          <button
            onClick={() => requireGuestClient('Inscrivez-vous pour commander et retrouver vos commandes dans Creorga.')}
            style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: ACCENT, color: '#fff', fontSize: 11, fontWeight: 800 }}
          >
            Inscription
          </button>
        )}
      </div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              flexShrink: 0, borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
              ...(activeCategory === cat.id
                ? { background: ACCENT, color: '#fff', border: 'none' }
                : { background: SURFACE, color: MUTED, border: `1px solid ${BORDER}` }),
            }}
          >
            <span style={{ marginRight: 6 }}>{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(active?.products ?? []).map((p, idx) => {
          const inCart = cart.find(i => i.id === p.id)
          const justAdded = addedId === p.id
          const available = p.isAvailable !== false
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
                padding: 14, display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              {/* Emoji */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(168,85,247,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
              }}>
                {p.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 2 }}>{p.name}</p>
                <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
                {p.stockStatus === 'OUT' && (
                  <p style={{ fontSize: 11, color: '#f97316', marginTop: 4, fontWeight: 800 }}>
                    Stock épuisé côté inventaire
                  </p>
                )}
                {p.stockStatus === 'LOW' && (
                  <p style={{ fontSize: 11, color: '#facc15', marginTop: 4, fontWeight: 800 }}>
                    Stock bas: {p.stockQty} {p.stockUnit || ''}
                  </p>
                )}
                <p style={{ fontSize: 15, fontWeight: 700, color: ACCENT, marginTop: 4 }}>
                  {p.price.toFixed(2)} €
                </p>
              </div>

              {/* Add button or qty controls */}
              {inCart ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => updateQty(p.id, -1)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: SURFACE2, border: `1px solid ${BORDER}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: TEXT,
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, minWidth: 18, textAlign: 'center' }}>
                    {inCart.qty}
                  </span>
                  <button
                    onClick={() => handleAdd(p)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: ACCENT, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <motion.button
                  onClick={() => handleAdd(p)}
                  disabled={!available}
                  whileTap={{ scale: 0.9 }}
                  animate={justAdded ? { scale: [1, 1.15, 1] } : {}}
                  style={{
                    flexShrink: 0, borderRadius: 10, padding: '8px 14px',
                    fontSize: 12, fontWeight: 700, border: 'none',
                    background: !available ? '#475569' : justAdded ? '#22c55e' : `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
                    color: '#fff',
                    boxShadow: `0 2px 12px ${ACCENT}33`,
                    cursor: available ? 'pointer' : 'not-allowed',
                  }}
                >
                  {justAdded ? '✓' : 'Ajouter'}
                </motion.button>
              )}
            </motion.div>
          )
        })}
        {!active?.products?.length && (
          <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: MUTED }}>
            Aucun article dans cette catégorie.
          </p>
        )}
      </div>

      {/* ── Floating cart bar ── */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            style={{
              position: 'fixed', bottom: 64, left: 12, right: 12, zIndex: 45,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              borderRadius: 16, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 -4px 20px rgba(168,85,247,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingCart size={18} style={{ color: '#fff' }} />
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                {cartCount} article{cartCount > 1 ? 's' : ''} · {cartTotal.toFixed(2)} €
              </span>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              style={{
                background: '#fff', color: '#6d28d9', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 700, border: 'none',
              }}
            >
              Voir le panier
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cart slide-up panel ── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)' }}
            />
            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                background: BG, borderTop: `2px solid ${ACCENT}`,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 20px 12px',
                borderBottom: `1px solid ${BORDER}`,
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>
                  \🛒 Votre panier
                </h3>
                <button onClick={() => setCartOpen(false)} style={{ color: MUTED, padding: 4 }}>
                  <ChevronDown size={22} />
                </button>
              </div>

              {/* Items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                {cart.length === 0 ? (
                  <p style={{ textAlign: 'center', color: MUTED, padding: '24px 0', fontSize: 14 }}>
                    Votre panier est vide
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cart.map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: SURFACE, borderRadius: 12, padding: 12,
                          border: `1px solid ${BORDER}`,
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{item.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.name}</p>
                          <p style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                            {(item.price * item.qty).toFixed(2)} €
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              background: SURFACE2, border: `1px solid ${BORDER}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: TEXT,
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, minWidth: 20, textAlign: 'center' }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              background: ACCENT, border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals and send */}
              {cart.length > 0 && (
                <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${BORDER}` }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{total.toFixed(2)} €</span>
                  </div>

                  <motion.button
                    onClick={handleSendOrder}
                    disabled={orderState === 'sending'}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', padding: '14px 0', borderRadius: 14,
                      background: orderState === 'sending'
                        ? 'rgba(168,85,247,0.5)'
                        : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                      color: '#fff', fontSize: 15, fontWeight: 700, border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
                    }}
                  >
                    {orderState === 'sending' ? (
                      <>
                        <div style={{
                          width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'spin 0.6s linear infinite',
                        }} />
                        {t('sending_order')}
                      </>
                    ) : (
                      <>{t('send_order')}</>
                    )}
                  </motion.button>
                  {orderError && (
                    <p role="alert" style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 12, fontSize: 12, lineHeight: 1.4,
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.45)', color: '#fecaca',
                    }}>
                      {orderError}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spin keyframe for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// ─── PREMIUM FEEDBACK / AVIS ─────────────────────────────
// ═══════════════════════════════════════════════════════════

const CATEGORY_RATINGS = [
  { key: 'food', label: 'Nourriture', emoji: '\🍝' },
  { key: 'service', label: 'Service', emoji: '\👋' },
  { key: 'ambiance', label: 'Ambiance', emoji: '\🎶' },
  { key: 'value', label: 'Rapport qualité-prix', emoji: '\💰' },
]

const STAR_LABELS = ['', 'Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Excellent !']

function MiniStars({ rating, onRate, size = 18 }: { rating: number; onRate: (n: number) => void; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <motion.button
          key={s}
          onClick={() => onRate(s)}
          whileTap={{ scale: 1.3 }}
          style={{ fontSize: size, color: s <= rating ? '#facc15' : 'rgba(255,255,255,0.12)', lineHeight: 1, padding: 0, background: 'none', border: 'none' }}
        >
          ★
        </motion.button>
      ))}
    </div>
  )
}

function ConfettiDots() {
  const colors = ['#a855f7', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#facc15']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            opacity: 0,
            x: Math.random() * 300 - 150,
            y: 0,
            scale: 0,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, -(100 + Math.random() * 200)],
            x: (Math.random() - 0.5) * 200,
            scale: [0, 1, 0.8, 0],
            rotate: Math.random() * 720,
          }}
          transition={{
            duration: 1.8 + Math.random() * 0.6,
            delay: Math.random() * 0.4,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            bottom: '40%',
            left: '50%',
            width: 6 + Math.random() * 6,
            height: 6 + Math.random() * 6,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            background: colors[Math.floor(Math.random() * colors.length)],
          }}
        />
      ))}
    </div>
  )
}

function GuestFeedback({
  onBack,
  guestClient,
  requireGuestClient,
  companyId,
}: {
  onBack: () => void
  guestClient: GuestClientProfile | null
  requireGuestClient: (reason: string) => boolean
  companyId: string
}) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [catRatings, setCatRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const MAX_COMMENT = 1000

  const setCatRating = (key: string, val: number) => {
    setCatRatings(prev => ({ ...prev, [key]: val }))
  }

  const submit = async () => {
    if (!rating) return
    const profile = loadGuestClient(companyId) ?? guestClient
    if (!profile && !requireGuestClient('Inscrivez-vous pour envoyer un avis: il sera rattaché à votre fiche client Creorga.')) return
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch(`${BACKEND}/api/portal-config/client-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          type: 'review',
          profile,
          payload: { rating, categoryRatings: catRatings, comment: comment.trim() || null },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.persisted) throw new Error(data?.message || 'Avis non enregistré')
      setState('success')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Votre avis n’a pas pu être enregistré. Réessayez.')
      setState('error')
    }
  }

  // Success screen with confetti
  if (state === 'success') return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ position: 'relative', paddingTop: 48, paddingBottom: 24 }}
    >
      <ConfettiDots />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(34,197,94,0.35)',
          }}
        >
          <Check style={{ color: '#fff', width: 40, height: 40, strokeWidth: 3 }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <h3 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
            Merci beaucoup !
          </h3>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5, marginBottom: 8 }}>
            Votre avis nous aide à nous améliorer chaque jour.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
            {Array.from({ length: rating }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                style={{ fontSize: 24, color: '#facc15' }}
              >
                ★
              </motion.span>
            ))}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onBack}
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 12,
            background: SURFACE, color: TEXT, fontSize: 14, fontWeight: 600,
            border: `1px solid ${BORDER}`,
          }}
        >
          Retour
        </motion.button>
      </div>
    </motion.div>
  )

  const display = hovered || rating

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 16 }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={onBack} style={{ padding: 6, borderRadius: 8, color: MUTED, background: 'none', border: 'none', fontSize: 18 }}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Donnez votre avis</h2>
      </div>

      {/* ── Main star rating ── */}
      <div style={{
        background: SURFACE, borderRadius: 16, padding: 20, marginBottom: 16,
        border: `1px solid ${BORDER}`, textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 12 }}>
          Comment évaluez-vous votre expérience ?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <motion.button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              whileTap={{ scale: 1.3, rotate: 15 }}
              animate={s <= display ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 40, lineHeight: 1, padding: 4,
                color: s <= display ? '#facc15' : 'rgba(255,255,255,0.1)',
                background: 'none', border: 'none',
                filter: s <= display ? 'drop-shadow(0 0 8px rgba(250,204,21,0.4))' : 'none',
                transition: 'color 0.15s, filter 0.15s',
              }}
            >
              ★
            </motion.button>
          ))}
        </div>
        {rating > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 13, color: MUTED, marginTop: 8 }}
          >
            {STAR_LABELS[rating]}
          </motion.p>
        )}
      </div>

      {/* ── Category ratings ── */}
      <div style={{
        background: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16,
        border: `1px solid ${BORDER}`,
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 12 }}>
          Détaillez votre expérience
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CATEGORY_RATINGS.map(cat => (
            <div
              key={cat.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: SURFACE2, borderRadius: 10, padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{cat.label}</span>
              </div>
              <MiniStars
                rating={catRatings[cat.key] || 0}
                onRate={(v) => setCatRating(cat.key, v)}
                size={16}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Comment ── */}
      <div style={{
        background: SURFACE, borderRadius: 16, padding: 16, marginBottom: 16,
        border: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
            Commentaire <span style={{ color: MUTED, fontWeight: 400 }}>(optionnel)</span>
          </p>
          <span style={{
            fontSize: 11, color: comment.length > MAX_COMMENT * 0.9 ? '#ef4444' : MUTED,
            fontWeight: 500,
          }}>
            {comment.length}/{MAX_COMMENT}
          </span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience…"
          rows={4}
          maxLength={MAX_COMMENT}
          style={{
            width: '100%', borderRadius: 10, border: `1px solid ${BORDER}`,
            background: SURFACE2, color: TEXT, padding: '10px 12px', fontSize: 14,
            resize: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* ── Error ── */}
      {state === 'error' && errorMsg && (
        <div style={{
          borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.05)', padding: '8px 12px',
          fontSize: 13, color: '#f87171', marginBottom: 16,
        }}>
          {errorMsg}
        </div>
      )}

      {/* ── Submit ── */}
      <motion.button
        onClick={submit}
        disabled={!rating || state === 'submitting'}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: !rating ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
          color: '#fff', fontSize: 15, fontWeight: 700, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: !rating || state === 'submitting' ? 0.5 : 1,
          boxShadow: rating ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
          marginBottom: 24,
        }}
      >
        {state === 'submitting' ? (
          <>
            <div style={{
              width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff', borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            Envoi...
          </>
        ) : 'Envoyer mon avis'}
      </motion.button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
