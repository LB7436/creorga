import { useState, useEffect, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Monitor, CalendarDays, Package, Star,
  ChefHat, Clock, Users, TrendingUp,
  ArrowUpRight, ShoppingBag, CreditCard, AlertTriangle,
  Mic, Sparkles, Plus, X, Settings, Cloud, CloudRain, Sun,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSocketEvent } from '@/hooks/useSocket'
import { toastInfo, toastSuccess } from '@/lib/toast'

/* ─────────────────────── MOCK DATA ─────────────────────── */

const revenueWeek = [
  { jour: 'Lun', ca: 1420, prev: 1280 },
  { jour: 'Mar', ca: 1690, prev: 1450 },
  { jour: 'Mer', ca: 1350, prev: 1520 },
  { jour: 'Jeu', ca: 1780, prev: 1390 },
  { jour: 'Ven', ca: 2210, prev: 1870 },
  { jour: 'Sam', ca: 2640, prev: 2340 },
  { jour: 'Dim', ca: 1847, prev: 1650 },
]

const revenueBreakdown = [
  { name: 'Boissons', value: 42, color: '#6366f1' },
  { name: 'Cuisine', value: 35, color: '#f59e0b' },
  { name: 'Desserts', value: 15, color: '#ec4899' },
  { name: 'Événements', value: 8, color: '#10b981' },
]

const liveOrders = [
  { id: 1, table: 'Table 3', items: 4, total: 62.50, elapsed: 8, status: 'En préparation' },
  { id: 2, table: 'Terrasse 2', items: 2, total: 24.00, elapsed: 18, status: 'En préparation' },
  { id: 3, table: 'Table 7', items: 6, total: 97.80, elapsed: 32, status: 'En préparation' },
  { id: 4, table: 'Table 1', items: 3, total: 41.50, elapsed: 5, status: 'Prêt' },
  { id: 5, table: 'Bar 4', items: 1, total: 8.50, elapsed: 2, status: 'Servi' },
  { id: 6, table: 'Table 12', items: 5, total: 78.00, elapsed: 22, status: 'En préparation' },
]

const alerts = [
  { type: 'red' as const, icon: '⚠', text: 'Stock bas : Café en grains (2.5kg restants)' },
  { type: 'orange' as const, icon: '🕐', text: 'Réservation 19:30 — Famille Braun (6 pers)' },
  { type: 'blue' as const, icon: '🎂', text: 'Anniversaire client : Marie Weber' },
  { type: 'green' as const, icon: '✅', text: 'HACCP Journée : 8/14 tâches complétées' },
  { type: 'yellow' as const, icon: '💳', text: '2 factures en retard' },
]

const topProducts = [
  { name: 'Café espresso', qty: 47, revenue: 141 },
  { name: 'Bière Diekirch', qty: 38, revenue: 190 },
  { name: 'Croque-monsieur', qty: 24, revenue: 216 },
  { name: 'Eau minérale', qty: 31, revenue: 77.50 },
  { name: 'Tarte aux pommes', qty: 19, revenue: 114 },
]

const staffOnDuty = [
  { name: 'Marie Dupont', role: 'Serveur', task: 'Service Table 7', since: '08:00', hours: '6h12', color: '#6366f1' },
  { name: 'Jean Muller', role: 'Cuisinier', task: 'Préparation plats chauds', since: '07:30', hours: '6h42', color: '#f59e0b' },
  { name: 'Sophie Klein', role: 'Serveur', task: 'Encaissement Terrasse', since: '10:00', hours: '4h12', color: '#ec4899' },
  { name: 'Luc Bernard', role: 'Barman', task: 'Service bar', since: '11:00', hours: '3h12', color: '#10b981' },
]

const upcomingEvents = [
  { when: "Aujourd'hui · 19:30", title: 'Famille Braun', kind: 'reservation', party: '6 pers', color: '#6366f1' },
  { when: "Aujourd'hui · 20:15", title: 'M. & Mme Schmitz', kind: 'reservation', party: '2 pers', color: '#6366f1' },
  { when: 'Demain · 12:00', title: 'Déjeuner entreprise', kind: 'evenement', party: '14 pers', color: '#f59e0b' },
  { when: 'Vendredi · 19:00', title: 'Soirée dégustation vins', kind: 'evenement', party: '22 pers', color: '#ec4899' },
  { when: 'Samedi · 20:00', title: 'Mariage Rodrigues', kind: 'evenement', party: '45 pers', color: '#10b981' },
  { when: 'Dimanche · 12:30', title: 'Brunch Fête des Mères', kind: 'evenement', party: '60 pers', color: '#0ea5e9' },
]

const floorTables = [
  { id: 'T1', x: 12, y: 18, status: 'free' },
  { id: 'T2', x: 32, y: 18, status: 'occupied' },
  { id: 'T3', x: 52, y: 18, status: 'occupied' },
  { id: 'T4', x: 72, y: 18, status: 'reserved' },
  { id: 'T5', x: 12, y: 42, status: 'free' },
  { id: 'T6', x: 32, y: 42, status: 'free' },
  { id: 'T7', x: 52, y: 42, status: 'occupied' },
  { id: 'T8', x: 72, y: 42, status: 'free' },
  { id: 'T9', x: 12, y: 66, status: 'free' },
  { id: 'T10', x: 32, y: 66, status: 'reserved' },
  { id: 'T11', x: 52, y: 66, status: 'free' },
  { id: 'T12', x: 72, y: 66, status: 'occupied' },
] as const

const forecast = [
  { h: '15h', t: 13, icon: '☀' },
  { h: '16h', t: 12, icon: '⛅' },
  { h: '17h', t: 11, icon: '⛅' },
]

const aiInsights = [
  { icon: '💡', text: "Aujourd'hui est votre meilleur mercredi du mois", tone: 'good' },
  { icon: '☕', text: 'Stock café bas — commande suggérée demain', tone: 'warn' },
  { icon: '📈', text: 'Pic attendu entre 19h et 21h (+18% vs moy.)', tone: 'info' },
]

const sparkData = [38, 42, 35, 50, 47, 55, 60, 58, 65, 62, 70, 68]

/* ─────────────────────── HELPERS ─────────────────────── */

const alertColors: Record<string, { bg: string; border: string; text: string }> = {
  red:    { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  orange: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  blue:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  green:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  yellow: { bg: '#fefce8', border: '#fde68a', text: '#854d0e' },
}

const tableStatusColor: Record<string, { fill: string; stroke: string; glow: string }> = {
  free:     { fill: '#dcfce7', stroke: '#22c55e', glow: 'rgba(34,197,94,0.25)' },
  occupied: { fill: '#fee2e2', stroke: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
  reserved: { fill: '#fef3c7', stroke: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
}

function statusColor(status: string) {
  if (status === 'Prêt') return { bg: '#dcfce7', text: '#166534' }
  if (status === 'Servi') return { bg: '#dbeafe', text: '#1e40af' }
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

/* ─────────────────── MINI SPARKLINE (SVG) ─────────────────── */

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 80
  const h = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

/* ─────────────────── WEATHER WIDGET ─────────────────── */

function WeatherWidget({ now }: { now: Date }) {
  const hour = now.getHours()
  const isDay = hour >= 7 && hour < 20
  const temp = 12
  const condition = 'Partiellement nuageux'
  const Icon = isDay ? Sun : Cloud

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        background: isDay
          ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
          : 'linear-gradient(135deg, #1e293b, #334155)',
        color: isDay ? '#78350f' : '#f1f5f9',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 14,
        minWidth: 280,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: isDay ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} color={isDay ? '#d97706' : '#cbd5e1'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{temp}°</span>
          <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{formatTime(now)}</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>{condition} · Rumelange</div>
      </div>
      <div style={{
        display: 'flex', gap: 8, paddingLeft: 12,
        borderLeft: `1px solid ${isDay ? 'rgba(120,53,15,0.15)' : 'rgba(241,245,249,0.15)'}`,
      }}>
        {forecast.map((f, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>{f.h}</div>
            <div style={{ fontSize: 14 }}>{f.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{f.t}°</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─────────────────── FLOOR PLAN SVG ─────────────────── */

function FloorPlanMini() {
  const occupied = floorTables.filter(t => t.status === 'occupied').length
  const free = floorTables.filter(t => t.status === 'free').length
  const reserved = floorTables.filter(t => t.status === 'reserved').length

  return (
    <div>
      <div style={{
        position: 'relative', width: '100%', height: 170,
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden',
      }}>
        <svg viewBox="0 0 100 90" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          {/* walls */}
          <rect x={2} y={2} width={96} height={86} fill="none" stroke="#cbd5e1" strokeWidth={0.4} strokeDasharray="1 1" rx={2} />
          {/* bar zone */}
          <rect x={6} y={78} width={88} height={6} fill="#e0e7ff" stroke="#6366f1" strokeWidth={0.3} rx={1} />
          <text x={50} y={82.5} fontSize={2.6} fill="#4338ca" textAnchor="middle" fontWeight={700}>BAR</text>
          {/* tables */}
          {floorTables.map(t => {
            const c = tableStatusColor[t.status]
            return (
              <g key={t.id}>
                <circle
                  cx={t.x} cy={t.y} r={6}
                  fill={c.fill} stroke={c.stroke} strokeWidth={0.5}
                />
                <text x={t.x} y={t.y + 1} fontSize={2.5} fill={c.stroke} textAnchor="middle" fontWeight={700}>
                  {t.id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: '#64748b' }}>Libre ({free})</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: '#64748b' }}>Occupée ({occupied})</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ color: '#64748b' }}>Réservée ({reserved})</span>
        </span>
      </div>
    </div>
  )
}

/* ─────────────────── TARGET GAUGE ─────────────────── */

function TargetGauge({ actual, target }: { actual: number; target: number }) {
  const pct = Math.min(100, (actual / target) * 100)
  const remaining = Math.max(0, target - actual)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
            {actual.toLocaleString('fr-FR')} €
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            Objectif : {target.toLocaleString('fr-FR')} €
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 12,
          background: pct >= 100 ? '#dcfce7' : '#eef2ff',
          color: pct >= 100 ? '#166534' : '#4338ca',
          fontSize: 12, fontWeight: 700,
        }}>
          {pct.toFixed(0)}%
        </div>
      </div>
      <div style={{
        height: 10, borderRadius: 6, background: '#f1f5f9',
        overflow: 'hidden', position: 'relative',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 6,
            background: pct >= 100
              ? 'linear-gradient(90deg, #10b981, #22c55e)'
              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontWeight: 500 }}>
        {remaining > 0
          ? <>Plus que <strong style={{ color: '#1e293b' }}>{remaining.toLocaleString('fr-FR')} €</strong> pour atteindre l'objectif</>
          : <><strong style={{ color: '#16a34a' }}>🎉 Objectif atteint !</strong></>}
      </div>
    </div>
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
  weather: 'Météo', stats: 'KPIs', orders: 'Commandes', alerts: 'Alertes',
  events: 'Événements', floor: 'Plan de salle', target: 'Objectif jour',
  charts: 'Graphiques CA', ai: 'AI Insights', voice: 'Commandes vocales',
  quick: 'Accès rapides', top: 'Top produits', staff: 'Équipe en service',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [now, setNow] = useState(new Date())
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS)
  const [showCustomize, setShowCustomize] = useState(false)
  const [showFab, setShowFab] = useState(false)
  const [voicePulse, setVoicePulse] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // ── Realtime order notifications ──────────────────────────────
  const [realtimeOrders, setRealtimeOrders] = useState<typeof liveOrders>([])

  useSocketEvent<{ id: number | string; table?: string; total?: number; items?: number }>(
    'order:new',
    (data) => {
      toastSuccess(`Nouvelle commande reçue${data?.table ? ` — ${data.table}` : ''}`)
      setRealtimeOrders((prev) => {
        const incoming = {
          id: Number(data?.id) || Date.now(),
          table: data?.table ?? 'Table ?',
          items: data?.items ?? 1,
          total: data?.total ?? 0,
          elapsed: 0,
          status: 'En préparation',
        }
        return [incoming, ...prev].slice(0, 10)
      })
    },
  )

  useSocketEvent<{ id: number | string; status?: string }>('order:updated', (data) => {
    if (data?.status) toastInfo(`Commande #${data.id} — ${data.status}`)
    setRealtimeOrders((prev) =>
      prev.map((o) =>
        String(o.id) === String(data?.id) && data?.status
          ? { ...o, status: data.status as string }
          : o,
      ),
    )
  })

  // Merge realtime orders with mock list for display (realtime first).
  const ordersToDisplay = realtimeOrders.length > 0
    ? [...realtimeOrders, ...liveOrders].slice(0, 8)
    : liveOrders

  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.firstName ?? 'Admin'

  const toggleSection = (k: SectionKey) => setSections(s => ({ ...s, [k]: !s[k] }))

  const triggerVoice = () => {
    setVoicePulse(true)
    setTimeout(() => setVoicePulse(false), 2200)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ── HEADER BAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
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
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0] ?? ''}
            </span>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ maxWidth: 1360, margin: '0 auto', padding: '28px 32px 100px' }}
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
                  Restaurant ouvert
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
            {sections.weather && <WeatherWidget now={now} />}
          </div>

          {sections.stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatCard
                label="CA Aujourd'hui"
                value="1 847 €"
                sub="+12% vs hier"
                subColor="#16a34a"
                icon={<TrendingUp size={20} color="#6366f1" />}
                iconBg="#eef2ff"
                sparkline={<MiniSparkline data={sparkData} color="#6366f1" />}
              />
              <StatCard
                label="Commandes"
                value="34"
                sub="En cours : 5"
                subColor="#d97706"
                icon={<ShoppingBag size={20} color="#f59e0b" />}
                iconBg="#fffbeb"
              />
              <StatCard
                label="Tables"
                value="4 / 12"
                sub="occupées"
                subColor="#64748b"
                icon={<Users size={20} color="#0ea5e9" />}
                iconBg="#f0f9ff"
                ring={<ProgressRing value={4} max={12} color="#0ea5e9" />}
              />
              <StatCard
                label="Clients"
                value="18"
                sub="3 nouveaux"
                subColor="#7c3aed"
                icon={<CreditCard size={20} color="#ec4899" />}
                iconBg="#fdf2f8"
              />
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 2: Target + AI Insights + Voice ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 16, marginBottom: 24,
        }}>
          {sections.target && (
            <div style={card}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#6366f1" />
                Objectif du jour
              </h2>
              <TargetGauge actual={1847} target={2500} />
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
                AI Insights
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: '#8b5cf6', color: '#fff', letterSpacing: '0.05em',
                }}>BETA</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {aiInsights.map((ins, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(139,92,246,0.12)',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>{ins.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#4c1d95', lineHeight: '18px' }}>
                      {ins.text}
                    </span>
                  </div>
                ))}
              </div>
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
                onClick={triggerVoice}
                whileTap={{ scale: 0.93 }}
                animate={voicePulse ? { scale: [1, 1.12, 1] } : {}}
                transition={{ repeat: voicePulse ? Infinity : 0, duration: 1 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  background: voicePulse
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: voicePulse
                    ? '0 0 32px rgba(239,68,68,0.5)'
                    : '0 8px 24px rgba(99,102,241,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Mic size={26} color="#fff" />
              </motion.button>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                {voicePulse ? 'À l\'écoute…' : 'Commandes vocales'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, maxWidth: 220 }}>
                Dites <em style={{ color: '#a5b4fc' }}>« Afficher tables »</em> ou <em style={{ color: '#a5b4fc' }}>« Chiffre du jour »</em>
              </div>
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 3: Live Orders + Alerts ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24,
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
                }}>6 actives</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ordersToDisplay.map((o) => {
                  const sc = statusColor(o.status)
                  return (
                    <div key={o.id} style={{
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.map((a, i) => {
                  const c = alertColors[a.type]
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      background: c.bg, border: `1px solid ${c.border}`,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>{a.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: c.text, lineHeight: '20px' }}>{a.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 4: Events Timeline + Floor Plan ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24,
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
                }}>{upcomingEvents.length} à venir</span>
              </div>
              <div style={{ position: 'relative' }}>
                {/* timeline line */}
                <div style={{
                  position: 'absolute', left: 9, top: 6, bottom: 6,
                  width: 2, background: 'linear-gradient(180deg, #e9d5ff, #ddd6fe, transparent)',
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcomingEvents.map((e, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 0,
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', border: `3px solid ${e.color}`,
                        flexShrink: 0, zIndex: 1,
                      }} />
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 10,
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                      }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: e.color, letterSpacing: '0.02em' }}>
                            {e.when}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>
                            {e.title}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                            background: e.kind === 'evenement' ? '#fef3c7' : '#eef2ff',
                            color: e.kind === 'evenement' ? '#92400e' : '#4338ca',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {e.kind === 'evenement' ? 'Événement' : 'Réservation'}
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            {e.party}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sections.floor && (
            <div style={card}>
              <h2 style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#0ea5e9" />
                Plan de salle — temps réel
              </h2>
              <FloorPlanMini />
            </div>
          )}
        </motion.div>

        {/* ════════ ROW 5: Revenue Chart + Pie ════════ */}
        {sections.charts && (
          <motion.div variants={fadeUp} style={{
            display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 20, marginBottom: 24,
          }}>
            <div style={card}>
              <h2 style={sectionTitle}>CA des 7 derniers jours</h2>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={revenueWeek} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
                      type="monotone" dataKey="prev" stroke="#cbd5e1"
                      strokeWidth={2} strokeDasharray="6 4"
                      fill="none" dot={false} name="Sem. précédente"
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
              </div>
            </div>

            <div style={card}>
              <h2 style={sectionTitle}>Répartition</h2>
              <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown} dataKey="value" nameKey="name"
                      cx="50%" cy="45%" innerRadius={52} outerRadius={80}
                      paddingAngle={3} strokeWidth={0}
                    >
                      {revenueBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom" iconType="circle" iconSize={8}
                      formatter={(val: string) => (
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{val}</span>
                      )}
                    />
                    <RTooltip
                      contentStyle={{
                        background: '#1e293b', border: 'none', borderRadius: 10,
                        fontSize: 13, color: '#f8fafc',
                      }}
                      formatter={(v: number) => [`${v}%`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════ ROW 6: Quick Access ════════ */}
        {sections.quick && (
          <motion.div variants={fadeUp} style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24,
          }}>
            <QuickCard
              title="Ouvrir le POS"
              subtitle="5 commandes actives"
              gradient="linear-gradient(135deg, #6366f1, #818cf8)"
              icon={<Monitor size={28} color="#fff" />}
              onClick={() => navigate('/pos/dashboard')}
            />
            <QuickCard
              title="Voir le planning"
              subtitle="4 employés en service"
              gradient="linear-gradient(135deg, #f97316, #fb923c)"
              icon={<CalendarDays size={28} color="#fff" />}
              onClick={() => navigate('/hr/planning')}
            />
            <QuickCard
              title="Gérer le stock"
              subtitle="1 alerte stock bas"
              gradient="linear-gradient(135deg, #d97706, #fbbf24)"
              icon={<Package size={28} color="#fff" />}
              onClick={() => navigate('/inventory/stock')}
            />
            <QuickCard
              title="Voir les avis"
              subtitle="4.7 / 5 moyenne"
              gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)"
              icon={<Star size={28} color="#fff" />}
              onClick={() => navigate('/reputation/avis')}
            />
          </motion.div>
        )}

        {/* ════════ ROW 7: Top Products + Staff ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
        }}>
          {sections.top && (
            <div style={card}>
              <h2 style={sectionTitle}>Top 5 Produits</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topProducts.map((p, i) => {
                  const maxRev = Math.max(...topProducts.map(x => x.revenue))
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {staffOnDuty.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 12, background: '#f8fafc',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 14, color: s.color,
                        }}>
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span style={{
                          position: 'absolute', bottom: -1, right: -1,
                          width: 12, height: 12, borderRadius: '50%',
                          background: '#22c55e', border: '2px solid #fff',
                        }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 1 }}>{s.role}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                          ↳ {s.task}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{s.hours}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>depuis {s.since}</div>
                    </div>
                  </div>
                ))}
              </div>
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
                label="Nouvelle réservation" icon="📅" color="#6366f1"
                onClick={() => { navigate('/pos/reservations'); setShowFab(false) }}
              />
              <FabItem
                label="Envoyer newsletter" icon="📧" color="#ec4899"
                onClick={() => { navigate('/marketing/newsletter'); setShowFab(false) }}
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
                  onClick={() => setShowCustomize(false)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, border: 'none',
                    background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
      {label}
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
