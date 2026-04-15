import { useState, useEffect, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Monitor, CalendarDays, Package, Star,
  ChefHat, Clock, Users, TrendingUp,
  ArrowUpRight, ShoppingBag, CreditCard, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

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
  { name: 'Evenements', value: 8, color: '#10b981' },
]

const liveOrders = [
  { id: 1, table: 'Table 3', items: 4, total: 62.50, elapsed: 8, status: 'En preparation' },
  { id: 2, table: 'Terrasse 2', items: 2, total: 24.00, elapsed: 18, status: 'En preparation' },
  { id: 3, table: 'Table 7', items: 6, total: 97.80, elapsed: 32, status: 'En preparation' },
  { id: 4, table: 'Table 1', items: 3, total: 41.50, elapsed: 5, status: 'Pret' },
  { id: 5, table: 'Bar 4', items: 1, total: 8.50, elapsed: 2, status: 'Servi' },
  { id: 6, table: 'Table 12', items: 5, total: 78.00, elapsed: 22, status: 'En preparation' },
]

const alerts = [
  { type: 'red' as const, icon: '\u26a0', text: 'Stock bas : Cafe en grains (2.5kg restants)' },
  { type: 'orange' as const, icon: '\ud83d\udd50', text: 'Reservation 19:30 \u2014 Famille Braun (6 pers)' },
  { type: 'blue' as const, icon: '\ud83c\udf82', text: 'Anniversaire client : Marie Weber' },
  { type: 'green' as const, icon: '\u2705', text: 'HACCP Journee : 8/14 taches completees' },
  { type: 'yellow' as const, icon: '\ud83d\udcb3', text: '2 factures en retard' },
]

const topProducts = [
  { name: 'Cafe espresso', qty: 47, revenue: 141 },
  { name: 'Biere Diekirch', qty: 38, revenue: 190 },
  { name: 'Croque-monsieur', qty: 24, revenue: 216 },
  { name: 'Eau minerale', qty: 31, revenue: 77.50 },
  { name: 'Tarte aux pommes', qty: 19, revenue: 114 },
]

const staffOnDuty = [
  { name: 'Marie Dupont', role: 'Serveur', since: '08:00', hours: '6h12', color: '#6366f1' },
  { name: 'Jean Muller', role: 'Cuisinier', since: '07:30', hours: '6h42', color: '#f59e0b' },
  { name: 'Sophie Klein', role: 'Serveur', since: '10:00', hours: '4h12', color: '#6366f1' },
  { name: 'Luc Bernard', role: 'Barman', since: '11:00', hours: '3h12', color: '#10b981' },
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

function statusColor(status: string) {
  if (status === 'Pret') return { bg: '#dcfce7', text: '#166534' }
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
  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
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

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon apres-midi' : 'Bonsoir'
  const firstName = user?.firstName ?? 'Admin'

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
          <HeaderBtn label="Modules" icon="\u25a6" onClick={() => navigate('/modules')} />
          <HeaderBtn label="Admin" icon="\u2699" onClick={() => navigate('/admin')} />
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
        style={{ maxWidth: 1360, margin: '0 auto', padding: '28px 32px 60px' }}
      >
        {/* ════════ ROW 1: Welcome + Stats ════════ */}
        <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                {greeting}, {firstName} {'\ud83d\udc4b'}
              </h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                {formatDate()} &nbsp;&middot;&nbsp; {'\u2600'} 12\u00b0C Rumelange
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Restaurant ouvert
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {/* Stat 1 */}
            <StatCard
              label="CA Aujourd'hui"
              value="1 847 \u20ac"
              sub="+12% vs hier"
              subColor="#16a34a"
              icon={<TrendingUp size={20} color="#6366f1" />}
              iconBg="#eef2ff"
              sparkline={<MiniSparkline data={sparkData} color="#6366f1" />}
            />
            {/* Stat 2 */}
            <StatCard
              label="Commandes"
              value="34"
              sub="En cours : 5"
              subColor="#d97706"
              icon={<ShoppingBag size={20} color="#f59e0b" />}
              iconBg="#fffbeb"
            />
            {/* Stat 3 */}
            <StatCard
              label="Tables"
              value="4 / 12"
              sub="occupees"
              subColor="#64748b"
              icon={<Users size={20} color="#0ea5e9" />}
              iconBg="#f0f9ff"
              ring={<ProgressRing value={4} max={12} color="#0ea5e9" />}
            />
            {/* Stat 4 */}
            <StatCard
              label="Clients"
              value="18"
              sub="3 nouveaux"
              subColor="#7c3aed"
              icon={<CreditCard size={20} color="#ec4899" />}
              iconBg="#fdf2f8"
            />
          </div>
        </motion.div>

        {/* ════════ ROW 2: Live Activity ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24,
        }}>
          {/* Live Orders */}
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
              {liveOrders.map((o) => {
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
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{o.total.toFixed(2)} \u20ac</div>
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

          {/* Alerts */}
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
        </motion.div>

        {/* ════════ ROW 3: Revenue Chart + Pie ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 20, marginBottom: 24,
        }}>
          {/* Area Chart */}
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
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}\u20ac`} />
                  <RTooltip
                    contentStyle={{
                      background: '#1e293b', border: 'none', borderRadius: 10,
                      fontSize: 13, color: '#f8fafc', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    }}
                    formatter={(v: number) => [`${v} \u20ac`, '']}
                    labelFormatter={(l: string) => `${l}`}
                  />
                  <Area
                    type="monotone" dataKey="prev" stroke="#cbd5e1"
                    strokeWidth={2} strokeDasharray="6 4"
                    fill="none" dot={false} name="Sem. precedente"
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

          {/* Pie Chart */}
          <div style={card}>
            <h2 style={sectionTitle}>Repartition</h2>
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

        {/* ════════ ROW 4: Quick Access ════════ */}
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
            subtitle="4 employes en service"
            gradient="linear-gradient(135deg, #f97316, #fb923c)"
            icon={<CalendarDays size={28} color="#fff" />}
            onClick={() => navigate('/hr/planning')}
          />
          <QuickCard
            title="Gerer le stock"
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

        {/* ════════ ROW 5: Top Products + Staff ════════ */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
        }}>
          {/* Top Products */}
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
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.revenue.toFixed(2)} \u20ac</span>
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

          {/* Staff On Duty */}
          <div style={card}>
            <h2 style={sectionTitle}>Equipe en service</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffOnDuty.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 12, background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, color: s.color,
                    }}>
                      {s.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{s.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: s.color, display: 'inline-block',
                        }} />
                        <span style={{ fontSize: 12, color: '#64748b' }}>{s.role}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{s.hours}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>depuis {s.since}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
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
      {/* Decorative circle */}
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
