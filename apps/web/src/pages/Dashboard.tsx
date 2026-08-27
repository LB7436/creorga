import { useState, useEffect, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Monitor, CalendarDays, QrCode, BookOpen,
  ChefHat, Clock, Users, TrendingUp,
  ArrowUpRight, ShoppingBag, CreditCard, AlertTriangle,
  Bot, Sparkles, Plus, X, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { toastError } from '@/lib/toast'
import { useTodayStats, useWeekStats, useTopProductsToday } from '@/hooks/api/useStats'
import { useOrders } from '@/hooks/api/useOrders'

/* ────────────────── DONNÉES RÉELLES (/api/stats) ────────────────── */
//
// Ce tableau de bord était intégralement fictif et statique (constat d'audit
// vérifié) : chiffre d'affaires, commandes en cours, alertes, équipe, agenda,
// plan de salle et « insights IA » étaient des valeurs écrites en dur.
//
// Désormais : ce que /api/stats fournit réellement est affiché (CA du jour,
// commandes payées, tables occupées, panier moyen, CA des 7 derniers jours,
// top 5 produits). Les sections sans source serveur indiquent clairement
// qu'elles ne sont pas encore connectées, au lieu d'inventer des valeurs.

const JOURS_COURT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function formatEuros(n: number) {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/* ─────────────────────── HELPERS ─────────────────────── */

function statusColor(status: string) {
  if (status === 'Prête') return { bg: '#dcfce7', text: '#166534' }
  if (status === 'Servie') return { bg: '#dbeafe', text: '#1e40af' }
  return { bg: '#fef3c7', text: '#92400e' }
}

function urgencyBorder(minutes: number) {
  if (minutes >= 30) return '3px solid #ef4444'
  if (minutes >= 15) return '3px solid #f97316'
  return '3px solid transparent'
}

function formatDate() {
  const d = new Date()
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ──────────────────── PROGRESS RING ──────────────────── */

function ProgressRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = value / max
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={18} cy={18} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
      <circle
        cx={18} cy={18} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

/* La météo n'est pas simulée : tant qu'aucun fournisseur n'est configuré,
   cette carte affiche uniquement l'heure locale certaine. */
function ClockWidget({ now }: { now: Date }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: '#f8fafc', borderRadius: 16, padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(15,23,42,0.14)',
        display: 'flex', alignItems: 'center', gap: 14, minWidth: 0,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Clock size={26} color="#c7d2fe" />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{formatTime(now)}</div>
        <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>Heure locale · mise à jour automatique</div>
      </div>
    </motion.div>
  )
}

/* ─────────────────── ANIMATION VARIANTS ─────────────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ─────────────────── SHARED STYLES ─────────────────── */

const card: CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  padding: 24,
}

const sectionTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: 16,
  letterSpacing: '-0.01em',
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════ */

type SectionKey = 'weather' | 'stats' | 'orders' | 'alerts' | 'events' | 'floor' | 'target' | 'charts' | 'ai' | 'voice' | 'quick' | 'top' | 'staff'

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  weather: true, stats: true, orders: true, alerts: true,
  events: true, floor: true, target: true, charts: true,
  ai: true, voice: true, quick: true, top: true, staff: true,
}

const SECTION_LABELS: Record<SectionKey, string> = {
  weather: 'Heure locale', stats: 'Indicateurs', orders: 'Commandes', alerts: 'Alertes',
  events: 'Événements', floor: 'Occupation des tables', target: 'Encaissements',
  charts: 'Graphique du CA', ai: 'Assistant', voice: 'Ouvrir Robi',
  quick: 'Accès rapides', top: 'Top produits', staff: 'Équipe en service',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, companyId } = useAuthStore()
  const [now, setNow] = useState(new Date())
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS)
  const [showCustomize, setShowCustomize] = useState(false)
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const dashboardStorageKey = `creorga:dashboard-sections:${companyId ?? user?.id ?? 'local'}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(dashboardStorageKey)
      if (!stored) return
      const parsed = JSON.parse(stored) as Partial<Record<SectionKey, unknown>>
      const safe = { ...DEFAULT_SECTIONS }
      for (const key of Object.keys(DEFAULT_SECTIONS) as SectionKey[]) {
        if (typeof parsed[key] === 'boolean') safe[key] = parsed[key] as boolean
      }
      setSections(safe)
    } catch {
      localStorage.removeItem(dashboardStorageKey)
    }
  }, [dashboardStorageKey])

  // ── Statistiques réelles (/api/stats) ─────────────────────────
  const { data: today, isLoading: loadingToday, isError: errorToday } = useTodayStats()
  const { data: week } = useWeekStats()
  const { data: topProductsData } = useTopProductsToday()

  useEffect(() => {
    // Ne jamais masquer un échec : une absence de données et une API en erreur
    // ne veulent pas dire la même chose.
    if (errorToday) toastError('Impossible de charger les statistiques du jour')
  }, [errorToday])

  const weekChartData = (week ?? []).map((p) => {
    const [y, m, d] = p.date.split('-').map(Number)
    return { jour: JOURS_COURT[new Date(y, m - 1, d).getDay()], ca: p.revenue }
  })

  const topProductsView = (topProductsData ?? [])
    .filter((tp) => tp.product)
    .map((tp) => ({
      name: tp.product!.name,
      qty: tp.totalQuantity ?? 0,
      // CA approximatif : prix catalogue actuel × quantité vendue. Le serveur
      // ne renvoie pas le CA encaissé par produit ; ce calcul reste transparent
      // et repose sur deux valeurs réelles.
      revenue: tp.product!.price * (tp.totalQuantity ?? 0),
    }))

  // ── Commandes réelles, rafraîchies par le hook authentifié ──
  interface LiveOrder {
    id: number | string
    table: string
    items: number
    total: number
    elapsed: number
    status: string
  }
  const { data: ordersData } = useOrders()
  const statusLabel: Record<string, string> = {
    OPEN: 'Ouverte', PREPARING: 'En préparation', READY: 'Prête', SERVED: 'Servie',
  }
  const ordersToDisplay: LiveOrder[] = (ordersData ?? [])
    .filter((order) => !['PAID', 'CANCELLED'].includes(order.status))
    .slice(0, 8)
    .map((order) => ({
      id: order.orderNumber ?? order.id,
      table: order.table?.name || order.tableId || 'Sans table',
      items: order.items.reduce((sum, item: any) => sum + Number(item.quantity ?? item.qty ?? 1), 0),
      total: Number(order.total || 0),
      elapsed: order.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000)) : 0,
      status: statusLabel[order.status] || order.status,
    }))

  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.firstName ?? 'Admin'

  const toggleSection = (k: SectionKey) => setSections(s => ({ ...s, [k]: !s[k] }))

  const saveSections = () => {
    localStorage.setItem(dashboardStorageKey, JSON.stringify(sections))
    setShowCustomize(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .dashboard-header-label { display: none; }
          .dashboard-order-row { align-items: flex-start !important; flex-wrap: wrap; gap: 10px; }
          .dashboard-order-meta { width: 100%; justify-content: space-between; padding-left: 54px; }
        }
      `}</style>
      {/* ── HEADER BAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(12px, 3vw, 32px)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>C</span>
          </div>
          <span style={{
            fontWeight: 800, fontSize: 18, color: '#1e293b', letterSpacing: '-0.02em',
          }}>Creorga</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HeaderBtn label="Modules" icon="▦" onClick={() => navigate('/modules')} />
          <HeaderBtn label="Admin" icon="⚙" onClick={() => navigate('/admin')} />
          <button onClick={() => navigate('/admin/company')} aria-label="Ouvrir les paramètres de l'entreprise" style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: 'none',
          }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0] ?? ''}
            </span>
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(18px, 3vw, 28px) clamp(12px, 3vw, 32px) 100px' }}
      >
        {/* ════════ ROW 1: Welcome + Weather ════════ */}
        <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16, marginBottom: 20,
          }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                {greeting}, {firstName} 👋
              </h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                {formatDate()} &nbsp;·&nbsp;
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 12,
                  background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  Données de votre entreprise
                </span>
                &nbsp;·&nbsp;
                <button
                  onClick={() => setShowCustomize(true)}
                  style={{
                    border: 'none', background: 'transparent', padding: 0,
                    color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    textDecoration: 'underline', textDecorationColor: 'rgba(99,102,241,0.3)',
                  }}
                >Personnaliser le dashboard</button>
              </p>
            </div>
            {sections.weather && <ClockWidget now={now} />}
          </div>

          {sections.stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
              {/* Valeurs réelles de /api/stats/today. Aucune comparaison
                  « vs hier » : le serveur ne la fournit pas. */}
              <StatCard
                label="CA Aujourd'hui"
                value={loadingToday ? '…' : today ? formatEuros(today.revenue) : '—'}
                sub="commandes payées"
                subColor="#64748b"
                icon={<TrendingUp size={20} color="#6366f1" />}
                iconBg="#eef2ff"
              />
              <StatCard
                label="Commandes"
                value={loadingToday ? '…' : today ? String(today.orderCount) : '—'}
                sub="payées aujourd'hui"
                subColor="#64748b"
                icon={<ShoppingBag size={20} color="#f59e0b" />}
                iconBg="#fffbeb"
              />
              <StatCard
                label="Tables"
                value={loadingToday ? '…' : today ? `${today.tablesOccupied} / ${today.tablesTotal}` : '—'}
                sub="occupées"
                subColor="#64748b"
                icon={<Users size={20} color="#0ea5e9" />}
                iconBg="#f0f9ff"
                ring={today && today.tablesTotal > 0
                  ? <ProgressRing value={today.tablesOccupied} max={today.tablesTotal} color="#0ea5e9" />
                  : undefined}
              />
              <StatCard
                label="Panier moyen"
                value={loadingToday ? '…' : today && today.orderCount > 0 ? formatEuros(today.avgTicket) : '—'}
                sub="par commande"
                subColor="#64748b"
                icon={<CreditCard size={20} color="#ec4899" />}
                iconBg="#fdf2f8"
              />
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 2: encaissements + assistant ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 16, marginBottom: 24,
        }}>
          {sections.target && (
            <div style={card}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#6366f1" />
                Encaissements du jour
              </h2>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.03em' }}>
                {loadingToday ? '…' : today ? formatEuros(today.revenue) : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                {today
                  ? `${today.orderCount} commande${today.orderCount > 1 ? 's' : ''} payée${today.orderCount > 1 ? 's' : ''} aujourd'hui`
                  : 'Statistiques indisponibles'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                Aucun objectif n'est inventé : un réglage dédié pourra l'activer plus tard.
              </div>
            </div>
          )}

          {sections.ai && (
            <div style={{
              ...card,
              background: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
              border: '1px solid #e9d5ff',
            }}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="#8b5cf6" />
                Assistant Robi
              </h2>
              <p style={{ fontSize: 12.5, color: '#5b21b6', lineHeight: 1.55, margin: '0 0 12px' }}>
                Robi répond à vos questions et ouvre les écrans disponibles. Les actions non migrées sont signalées honnêtement.
              </p>
              <button onClick={() => navigate('/ai')} style={{
                border: 'none', borderRadius: 10, padding: '9px 13px', cursor: 'pointer',
                background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700,
              }}>Ouvrir l'assistant</button>
            </div>
          )}

          {sections.voice && (
            <div style={{
              ...card,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid #334155',
              color: '#f1f5f9',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center',
            }}>
              <motion.button
                onClick={() => navigate('/ai')}
                whileTap={{ scale: 0.93 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
                aria-label="Ouvrir Robi"
              >
                <Bot size={26} color="#fff" />
              </motion.button>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                Ouvrir Robi
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, maxWidth: 220 }}>
                Accédez au véritable assistant. Aucun microphone fictif ne s'active ici.
              </div>
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 3: Live Orders + Alerts ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20, marginBottom: 24,
        }}>
          {sections.orders && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChefHat size={18} color="#f59e0b" />
                  Commandes en cours
                </h2>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#6366f1',
                  background: '#eef2ff', padding: '4px 10px', borderRadius: 12,
                }}>{ordersToDisplay.length} active{ordersToDisplay.length > 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ordersToDisplay.length === 0 && (
                  <DataEmptyState text="Aucune commande active pour le moment." />
                )}
                {ordersToDisplay.map((o) => {
                  const sc = statusColor(o.status)
                  return (
                    <div key={o.id} className="dashboard-order-row" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 12,
                      background: '#f8fafc', borderLeft: urgencyBorder(o.elapsed),
                      transition: 'background 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13, color: '#6366f1',
                        }}>
                          {o.table.split(' ')[0][0]}{o.table.split(' ')[1]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{o.table}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{o.items} articles</div>
                        </div>
                      </div>
                      <div className="dashboard-order-meta" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{o.total.toFixed(2)} €</div>
                          <div style={{
                            fontSize: 12, color: o.elapsed >= 30 ? '#ef4444' : o.elapsed >= 15 ? '#f97316' : '#94a3b8',
                            fontWeight: o.elapsed >= 15 ? 600 : 400,
                          }}>
                            <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
                            {o.elapsed} min
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                          background: sc.bg, color: sc.text, whiteSpace: 'nowrap',
                        }}>{o.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {sections.alerts && (
            <div style={card}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#ef4444" />
                Alertes &amp; Rappels
              </h2>
              <DataEmptyState text="Aucune source d'alertes n'est connectée. Aucune alerte simulée n'est affichée." />
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 4: Events Timeline + Floor Plan ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20, marginBottom: 24,
        }}>
          {sections.events && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={18} color="#8b5cf6" />
                  Prochains événements (7j)
                </h2>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#8b5cf6',
                  background: '#f5f3ff', padding: '4px 10px', borderRadius: 12,
                }}>Non connecté</span>
              </div>
              <DataEmptyState text="Le calendrier des réservations n'est pas encore connecté au dashboard." />
            </div>
          )}

          {sections.floor && (
            <div style={card}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#0ea5e9" />
                Occupation des tables
              </h2>
              {today ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 18, borderRadius: 12, background: '#fef2f2' }}>
                    <div style={{ fontSize: 27, fontWeight: 800, color: '#b91c1c' }}>{today.tablesOccupied}</div>
                    <div style={{ fontSize: 12, color: '#991b1b' }}>occupée{today.tablesOccupied > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ padding: 18, borderRadius: 12, background: '#f0fdf4' }}>
                    <div style={{ fontSize: 27, fontWeight: 800, color: '#15803d' }}>{today.tablesFree}</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>libre{today.tablesFree > 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => navigate('/pos/floor')} style={{
                    gridColumn: '1 / -1', border: 'none', borderRadius: 10, padding: 10,
                    background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontWeight: 700,
                  }}>Ouvrir le plan réel</button>
                </div>
              ) : <DataEmptyState text="Occupation indisponible." />}
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 5: Revenue Chart ════════ */}
        {sections.charts && (
          <motion.div variants={fadeUp} style={{
            marginBottom: 24,
          }}>
            <div style={card}>
              <h2 style={sectionTitle}>CA des 7 derniers jours</h2>
              <div style={{ width: '100%', height: 260 }}>
                {weekChartData.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart data={weekChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}€`} />
                    <RTooltip
                      contentStyle={{
                        background: '#1e293b', border: 'none', borderRadius: 10,
                        fontSize: 13, color: '#f8fafc', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      }}
                      formatter={(v: number) => [`${v} €`, '']}
                      labelFormatter={(l: string) => `${l}`}
                    />
                    <Area
                      type="monotone" dataKey="ca" stroke="#6366f1"
                      strokeWidth={2.5} fill="url(#caGrad)"
                      dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                      name="Cette semaine"
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <DataEmptyState text="Aucune donnée d'encaissement disponible pour cette semaine." />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════ ROW 6: Quick Access ════════ */}
        {sections.quick && (
          <motion.div variants={fadeUp} style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24,
          }}>
            <QuickCard
              title="Ouvrir le POS"
              subtitle={`${ordersToDisplay.length} commande${ordersToDisplay.length > 1 ? 's' : ''} active${ordersToDisplay.length > 1 ? 's' : ''}`}
              gradient="linear-gradient(135deg, #6366f1, #818cf8)"
              icon={<Monitor size={28} color="#fff" />}
              onClick={() => navigate('/pos/dashboard')}
            />
            <QuickCard
              title="Voir le planning"
              subtitle="Consulter, modifier et publier"
              gradient="linear-gradient(135deg, #f97316, #fb923c)"
              icon={<CalendarDays size={28} color="#fff" />}
              onClick={() => navigate('/hr/planning')}
            />
            <QuickCard
              title="Configurer le menu"
              subtitle="Catalogue et catégories"
              gradient="linear-gradient(135deg, #d97706, #fbbf24)"
              icon={<BookOpen size={28} color="#fff" />}
              onClick={() => navigate('/admin/catalog')}
            />
            <QuickCard
              title="Portail QR client"
              subtitle="Configurer et prévisualiser"
              gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)"
              icon={<QrCode size={28} color="#fff" />}
              onClick={() => navigate('/qrmenu')}
            />
          </motion.div>
        )}

        {/* ════════ ROW 7: Top Products + Staff ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20,
        }}>
          {sections.top && (
            <div style={card}>
              <h2 style={sectionTitle}>Top 5 Produits</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topProductsView.length === 0 && (
                  <DataEmptyState text="Aucune vente payée aujourd'hui : le classement est vide." />
                )}
                {topProductsView.map((p, i) => {
                  const maxRev = Math.max(1, ...topProductsView.map(x => x.revenue))
                  const pct = (p.revenue / maxRev) * 100
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fff7ed' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 12,
                        color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : i === 2 ? '#ea580c' : '#94a3b8',
                      }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.revenue.toFixed(2)} €</span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${pct}%`,
                            background: i === 0 ? '#6366f1' : i === 1 ? '#8b5cf6' : i === 2 ? '#a78bfa' : '#c4b5fd',
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.qty} vendus</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {sections.staff && (
            <div style={card}>
              <h2 style={sectionTitle}>Équipe en service</h2>
              <DataEmptyState
                text="Les présences ne sont pas reliées au dashboard. Ouvrez l'équipe pour consulter les membres enregistrés."
                action="Ouvrir l'équipe"
                onAction={() => navigate('/hr/equipe')}
              />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ═════════ FLOATING ACTION BUTTON ═════════ */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 60 }}>
        <AnimatePresence>
          {showFab && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute', bottom: 72, right: 0,
                display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240,
              }}
            >
              <FabItem
                label="Nouvelle commande" icon="🍽️" color="#6366f1"
                onClick={() => { navigate('/pos/floor'); setShowFab(false) }}
              />
              <FabItem
                label="Nouveau devis" icon="🧾" color="#ec4899"
                onClick={() => { navigate('/invoices/devis'); setShowFab(false) }}
              />
              <FabItem
                label="Ajouter dépense" icon="💸" color="#f59e0b"
                onClick={() => { navigate('/accounting/depenses'); setShowFab(false) }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setShowFab(v => !v)}
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: showFab ? 45 : 0 }}
          style={{
            width: 58, height: 58, borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(99,102,241,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={26} />
        </motion.button>
      </div>

      {/* ═════════ CUSTOMIZE MODAL ═════════ */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCustomize(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 20, padding: 28,
                width: '100%', maxWidth: 520,
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
                    <Settings size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />
                    Personnaliser le dashboard
                  </h2>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                    Afficher ou masquer les sections
                  </p>
                </div>
                <button
                  onClick={saveSections}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {(Object.keys(SECTION_LABELS) as SectionKey[]).map(k => (
                  <label key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: sections[k] ? '#eef2ff' : '#f8fafc',
                    border: `1px solid ${sections[k] ? '#c7d2fe' : '#e2e8f0'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <input
                      type="checkbox"
                      checked={sections[k]}
                      onChange={() => toggleSection(k)}
                      style={{ accentColor: '#6366f1', width: 16, height: 16 }}
                    />
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: sections[k] ? '#4338ca' : '#64748b',
                    }}>{SECTION_LABELS[k]}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => setSections(DEFAULT_SECTIONS)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#fff',
                    color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Réinitialiser</button>
                <button
                  onClick={() => setShowCustomize(false)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  }}
                >Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────── SUB-COMPONENTS ─────────────────── */

function DataEmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{
      padding: '24px 18px', borderRadius: 12, background: '#f8fafc',
      border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b',
      fontSize: 12.5, lineHeight: 1.55,
    }}>
      <div>{text}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          marginTop: 12, border: 'none', borderRadius: 9, padding: '8px 12px',
          background: '#e0e7ff', color: '#4338ca', cursor: 'pointer', fontWeight: 700,
        }}>{action}</button>
      )}
    </div>
  )
}

function HeaderBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: hovered ? '#f1f5f9' : '#fff',
        color: hovered ? '#6366f1' : '#64748b',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span className="dashboard-header-label">{label}</span>
    </button>
  )
}

interface StatCardProps {
  label: string
  value: string
  sub: string
  subColor: string
  icon: React.ReactNode
  iconBg: string
  sparkline?: React.ReactNode
  ring?: React.ReactNode
}

function StatCard({ label, value, sub, subColor, icon, iconBg, sparkline, ring }: StatCardProps) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...card,
        padding: '20px 22px',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        {ring ?? sparkline ?? null}
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginTop: 2, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {sub.startsWith('+') && <ArrowUpRight size={13} color={subColor} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: subColor }}>{sub}</span>
        </div>
      </div>
    </div>
  )
}

function QuickCard({ title, subtitle, gradient, icon, onClick }: {
  title: string; subtitle: string; gradient: string; icon: React.ReactNode; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: gradient,
        borderRadius: 16, padding: '24px 22px', cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hov ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hov
          ? '0 12px 32px rgba(0,0,0,0.15)'
          : '0 4px 12px rgba(0,0,0,0.08)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, right: 20, width: 60, height: 60,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 16 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{subtitle}</div>
      </div>
    </div>
  )
}

function FabItem({ label, icon, color, onClick }: {
  label: string; icon: string; color: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px', borderRadius: 14,
        background: '#fff', border: `1px solid ${hov ? color : '#e2e8f0'}`,
        color: '#1e293b', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', textAlign: 'left',
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: 10,
        background: `${color}15`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </motion.button>
  )
}
