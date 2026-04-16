import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Users, ShoppingCart, Euro, Utensils, Coins, Clock,
  ChevronDown, Lightbulb, CreditCard, Banknote, Smartphone,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
type Period = 'aujourd_hui' | 'cette_semaine' | 'ce_mois' | 'ce_trimestre' | 'cette_annee'
type ChartMetric = 'ca' | 'commandes' | 'couverts'

/* ------------------------------------------------------------------ */
/*  ANIMATION                                                          */
/* ------------------------------------------------------------------ */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/*  PERIOD CONFIG                                                      */
/* ------------------------------------------------------------------ */
const periodLabels: Record<Period, string> = {
  aujourd_hui: "Aujourd'hui",
  cette_semaine: 'Cette semaine',
  ce_mois: 'Ce mois',
  ce_trimestre: 'Ce trimestre',
  cette_annee: "Cette ann\u00e9e",
}

/* ------------------------------------------------------------------ */
/*  KPI DATA                                                           */
/* ------------------------------------------------------------------ */
const kpis = [
  { label: 'Chiffre d\'affaires', value: '24 350\u00a0\u20ac', trend: 12, icon: Euro, sparkline: [18, 22, 19, 25, 28, 24, 30], color: '#2563eb' },
  { label: 'Commandes', value: '287', trend: 8, icon: ShoppingCart, sparkline: [30, 35, 28, 40, 38, 42, 45], color: '#7c3aed' },
  { label: 'Panier moyen', value: '84,80\u00a0\u20ac', trend: -2, icon: Coins, sparkline: [88, 86, 85, 87, 84, 83, 85], color: '#ea580c' },
  { label: 'Couverts', value: '412', trend: 15, icon: Utensils, sparkline: [50, 55, 48, 62, 58, 65, 70], color: '#059669' },
  { label: 'Pourboires', value: '890\u00a0\u20ac', trend: 5, icon: Coins, sparkline: [60, 65, 70, 68, 72, 75, 80], color: '#0891b2' },
  { label: "Taux d'occupation", value: '67\u00a0%', trend: 3, icon: Clock, sparkline: [55, 60, 58, 65, 62, 68, 67], color: '#d946ef' },
]

/* ------------------------------------------------------------------ */
/*  REVENUE CHART DATA                                                 */
/* ------------------------------------------------------------------ */
const revenueData = [
  { jour: 'Lun', ca: 3200, commandes: 38, couverts: 52 },
  { jour: 'Mar', ca: 2800, commandes: 32, couverts: 45 },
  { jour: 'Mer', ca: 3500, commandes: 42, couverts: 60 },
  { jour: 'Jeu', ca: 3100, commandes: 36, couverts: 55 },
  { jour: 'Ven', ca: 4200, commandes: 52, couverts: 78 },
  { jour: 'Sam', ca: 4800, commandes: 58, couverts: 85 },
  { jour: 'Dim', ca: 2750, commandes: 29, couverts: 37 },
]

const metricConfig: Record<ChartMetric, { label: string; color: string; suffix: string }> = {
  ca: { label: 'CA (\u20ac)', color: '#2563eb', suffix: ' \u20ac' },
  commandes: { label: 'Commandes', color: '#7c3aed', suffix: '' },
  couverts: { label: 'Couverts', color: '#059669', suffix: '' },
}

/* ------------------------------------------------------------------ */
/*  HEATMAP DATA  (7 days x 18 hours: 06-23)                          */
/* ------------------------------------------------------------------ */
const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const hours = Array.from({ length: 18 }, (_, i) => i + 6)

function generateHeatmapData(): number[][] {
  return days.map((_, dayIdx) => {
    return hours.map((h) => {
      const isWeekday = dayIdx < 5
      const isWeekend = dayIdx >= 5
      // Lunch peak
      if (h >= 12 && h <= 13 && isWeekday) return 80 + Math.floor(Math.random() * 20)
      if (h >= 12 && h <= 13 && isWeekend) return 70 + Math.floor(Math.random() * 25)
      // Dinner peak
      if (h >= 19 && h <= 21 && isWeekday) return 70 + Math.floor(Math.random() * 25)
      if (h >= 19 && h <= 21 && isWeekend) return 85 + Math.floor(Math.random() * 15)
      // Moderate
      if (h >= 11 && h <= 14) return 30 + Math.floor(Math.random() * 30)
      if (h >= 18 && h <= 22) return 25 + Math.floor(Math.random() * 30)
      // Low
      if (h >= 8 && h <= 10) return 5 + Math.floor(Math.random() * 15)
      if (h >= 15 && h <= 17) return 5 + Math.floor(Math.random() * 10)
      return Math.floor(Math.random() * 5)
    })
  })
}
const heatmapData = generateHeatmapData()

const peakHours = [
  { label: '12h \u2013 14h (semaine)', value: 92, pct: 100 },
  { label: '19h \u2013 21h (samedi)', value: 88, pct: 95 },
  { label: '19h \u2013 21h (vendredi)', value: 78, pct: 85 },
]

/* ------------------------------------------------------------------ */
/*  TOP PRODUCTS                                                       */
/* ------------------------------------------------------------------ */
const topProducts = [
  { name: 'Entrecôte grillée', revenue: 3840, qty: 96, margin: 62 },
  { name: 'Saumon mi-cuit', revenue: 3120, qty: 78, margin: 58 },
  { name: 'Burger maison', revenue: 2660, qty: 95, margin: 55 },
  { name: 'Risotto truffe', revenue: 2340, qty: 52, margin: 68 },
  { name: 'Crème brûlée', revenue: 1950, qty: 130, margin: 72 },
  { name: 'Tiramisu', revenue: 1680, qty: 112, margin: 70 },
  { name: 'Cocktail signature', revenue: 1540, qty: 110, margin: 78 },
  { name: 'Vin rouge maison', revenue: 1380, qty: 92, margin: 65 },
  { name: 'Salade César', revenue: 1260, qty: 70, margin: 60 },
  { name: 'Espresso', revenue: 980, qty: 280, margin: 82 },
]

/* ------------------------------------------------------------------ */
/*  CATEGORIES                                                         */
/* ------------------------------------------------------------------ */
const categories = [
  { name: 'Cuisine', value: 12600, color: '#2563eb', pct: 52 },
  { name: 'Boissons', value: 7300, color: '#7c3aed', pct: 30 },
  { name: 'Desserts', value: 4450, color: '#059669', pct: 18 },
]

/* ------------------------------------------------------------------ */
/*  STAFF PERFORMANCE                                                  */
/* ------------------------------------------------------------------ */
const staffData = [
  { name: 'Marie Dupont', ca: 7850, commandes: 82, panier: 95.70, tips: 320 },
  { name: 'Lucas Martin', ca: 6420, commandes: 74, panier: 86.80, tips: 245 },
  { name: 'Sophie Laurent', ca: 5890, commandes: 68, panier: 86.60, tips: 198 },
  { name: 'Thomas Muller', ca: 4190, commandes: 63, panier: 66.50, tips: 127 },
]

/* ------------------------------------------------------------------ */
/*  PAYMENT METHODS                                                    */
/* ------------------------------------------------------------------ */
const paymentMethods = [
  { name: 'Carte bancaire', value: 62, color: '#2563eb', icon: CreditCard },
  { name: 'Espèces', value: 28, color: '#059669', icon: Banknote },
  { name: 'Sans contact', value: 10, color: '#7c3aed', icon: Smartphone },
]

/* ------------------------------------------------------------------ */
/*  COMPARISON DATA                                                    */
/* ------------------------------------------------------------------ */
const comparison = {
  current: { label: 'Cette semaine', ca: '24 350 \u20ac', commandes: '287', panier: '84,80 \u20ac', couverts: '412', meilleur: 'Samedi' },
  previous: { label: 'Semaine derni\u00e8re', ca: '21 740 \u20ac', commandes: '265', panier: '86,60 \u20ac', couverts: '358', meilleur: 'Vendredi' },
  trends: { ca: 12, commandes: 8, panier: -2, couverts: 15 },
}

/* ------------------------------------------------------------------ */
/*  SPARKLINE MINI                                                     */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
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

/* ------------------------------------------------------------------ */
/*  HEATMAP CELL COLOR                                                 */
/* ------------------------------------------------------------------ */
function heatColor(val: number): string {
  if (val <= 5) return '#f1f5f9'
  if (val <= 20) return '#e0e7ff'
  if (val <= 40) return '#c7d2fe'
  if (val <= 60) return '#a5b4fc'
  if (val <= 75) return '#818cf8'
  if (val <= 90) return '#6366f1'
  return '#4338ca'
}

/* ------------------------------------------------------------------ */
/*  CUSTOM TOOLTIP                                                     */
/* ------------------------------------------------------------------ */
function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b', color: '#f8fafc', padding: '8px 12px',
      borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div>{payload[0].value?.toLocaleString('fr-FR')}{suffix}</div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('cette_semaine')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [chartMetric, setChartMetric] = useState<ChartMetric>('ca')

  const mc = metricConfig[chartMetric]

  /* ---- shared card style ---- */
  const card: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* ============================================================ */}
      {/* ROW 1 — PERIOD SELECTOR + KPIs                                */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Analytiques avanc\u00e9es</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Intelligence d'affaires \u2014 Caf\u00e9 um Rond-Point</p>
        </div>
        {/* Period selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1e293b',
            }}
          >
            {periodLabels[period]}
            <ChevronDown size={16} />
          </button>
          {showPeriodMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 44, background: '#fff', borderRadius: 10,
              border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20,
              minWidth: 180, overflow: 'hidden',
            }}>
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setShowPeriodMenu(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                    border: 'none', background: p === period ? '#f1f5f9' : 'transparent',
                    cursor: 'pointer', fontSize: 14, color: '#1e293b',
                    fontWeight: p === period ? 600 : 400,
                  }}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {kpis.map((k, i) => (
          <motion.div key={i} variants={fadeUp} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{k.label}</span>
              <k.icon size={18} color={k.color} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{k.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
                color: k.trend >= 0 ? '#059669' : '#dc2626',
              }}>
                {k.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {k.trend >= 0 ? '+' : ''}{k.trend}\u00a0%
              </span>
              <MiniSparkline data={k.sparkline} color={k.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* ROW 2 — REVENUE CHART                                         */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Chiffre d'affaires</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(metricConfig) as ChartMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: m === chartMetric ? mc.color : '#f1f5f9',
                  color: m === chartMetric ? '#fff' : '#64748b',
                  transition: 'all 0.2s',
                }}
              >
                {metricConfig[m].label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mc.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={mc.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="jour" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip suffix={mc.suffix} />} />
            <Area
              type="monotone"
              dataKey={chartMetric}
              stroke={mc.color}
              strokeWidth={3}
              fill="url(#areaGrad)"
              dot={{ r: 4, fill: mc.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: mc.color, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ============================================================ */}
      {/* ROW 3 — HEATMAP + PEAK HOURS                                  */}
      {/* ============================================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* LEFT: Heatmap */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Heures de pointe</h2>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${hours.length}, 1fr)`, gap: 2, minWidth: 580 }}>
              {/* Header row */}
              <div />
              {hours.map((h) => (
                <div key={h} style={{
                  fontSize: 10, fontWeight: 600, color: '#94a3b8',
                  textAlign: 'center', paddingBottom: 4,
                }}>
                  {h}h
                </div>
              ))}
              {/* Data rows */}
              {days.map((day, dayIdx) => (
                <>
                  <div key={`label-${dayIdx}`} style={{
                    fontSize: 12, fontWeight: 600, color: '#475569',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {day}
                  </div>
                  {hours.map((_, hIdx) => {
                    const val = heatmapData[dayIdx][hIdx]
                    return (
                      <div
                        key={`${dayIdx}-${hIdx}`}
                        title={`${day} ${hours[hIdx]}h \u2014 ${val} commandes`}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 3,
                          background: heatColor(val),
                          cursor: 'default',
                          transition: 'transform 0.15s',
                          minHeight: 18,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    )
                  })}
                </>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
              <span>Faible</span>
              {[5, 20, 40, 60, 75, 90, 100].map((v) => (
                <div key={v} style={{ width: 16, height: 10, borderRadius: 2, background: heatColor(v) }} />
              ))}
              <span>\u00c9lev\u00e9</span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Peak hours summary */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Cr\u00e9neaux cl\u00e9s</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {peakHours.map((ph, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{ph.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>{ph.value}%</span>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ph.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #4338ca)', borderRadius: 4 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div style={{
            marginTop: 24, padding: 16, borderRadius: 10,
            background: '#fef9c3', border: '1px solid #fde047',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Lightbulb size={20} color="#ca8a04" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>Recommandation</div>
              <div style={{ fontSize: 12, color: '#713f12', lineHeight: 1.5 }}>
                Renforcer le personnel entre 12h et 14h en semaine et entre 19h et 21h le week-end pour optimiser le service.
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/* ROW 4 — TOP PRODUCTS + CATEGORIES                             */}
      {/* ============================================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* LEFT: Top 10 Products */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Top 10 Produits</h2>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 500 }} width={130} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div style={{
                      background: '#1e293b', color: '#f8fafc', padding: '10px 14px',
                      borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                      <div>CA : {d.revenue.toLocaleString('fr-FR')}\u00a0\u20ac</div>
                      <div>Qt\u00e9 : {d.qty}</div>
                      <div>Marge : {d.margin}\u00a0%</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* RIGHT: Categories */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Cat\u00e9gories</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {categories.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{
                        background: '#1e293b', color: '#f8fafc', padding: '8px 12px',
                        borderRadius: 8, fontSize: 13,
                      }}>
                        {d.name} : {d.value.toLocaleString('fr-FR')}\u00a0\u20ac ({d.pct}\u00a0%)
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {categories.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{c.value.toLocaleString('fr-FR')}\u00a0\u20ac</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{c.pct}\u00a0%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/* ROW 5 — STAFF + PAYMENT METHODS                               */}
      {/* ============================================================ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* LEFT: Staff performance */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Performance \u00e9quipe</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Serveur', 'CA g\u00e9n\u00e9r\u00e9', 'Commandes', 'Panier moy.', 'Pourboires'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600,
                      color: '#94a3b8', borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffData.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][i],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700,
                        }}>
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{s.ca.toLocaleString('fr-FR')}\u00a0\u20ac</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{s.commandes}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{s.panier.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}\u00a0\u20ac</td>
                    <td style={{ padding: '12px', color: '#059669', fontWeight: 600 }}>{s.tips}\u00a0\u20ac</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* RIGHT: Payment methods */}
        <motion.div variants={fadeUp} style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Modes de paiement</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {paymentMethods.map((pm, i) => (
                    <Cell key={i} fill={pm.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{
                        background: '#1e293b', color: '#f8fafc', padding: '8px 12px',
                        borderRadius: 8, fontSize: 13,
                      }}>
                        {d.name} : {d.value}\u00a0%
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {paymentMethods.map((pm, i) => {
              const Icon = pm.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: `${pm.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={pm.color} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{pm.name}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{pm.value}\u00a0%</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/* ROW 6 — PERIOD COMPARISON                                     */}
      {/* ============================================================ */}
      <motion.div variants={fadeUp} style={card}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>Comparaison p\u00e9riodes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {([
            { label: 'Chiffre d\'affaires', curr: comparison.current.ca, prev: comparison.previous.ca, trend: comparison.trends.ca },
            { label: 'Commandes', curr: comparison.current.commandes, prev: comparison.previous.commandes, trend: comparison.trends.commandes },
            { label: 'Panier moyen', curr: comparison.current.panier, prev: comparison.previous.panier, trend: comparison.trends.panier },
            { label: 'Couverts', curr: comparison.current.couverts, prev: comparison.previous.couverts, trend: comparison.trends.couverts },
            { label: 'Meilleur jour', curr: comparison.current.meilleur, prev: comparison.previous.meilleur, trend: 0 },
          ] as const).map((item, i) => (
            <div key={i} style={{
              padding: 16, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {item.label}
              </span>

              {/* Current */}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{comparison.current.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{item.curr}</span>
                  {item.trend !== 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: item.trend > 0 ? '#dcfce7' : '#fee2e2',
                      color: item.trend > 0 ? '#15803d' : '#dc2626',
                    }}>
                      {item.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {item.trend > 0 ? '+' : ''}{item.trend}%
                    </span>
                  )}
                </div>
              </div>

              {/* Previous */}
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{comparison.previous.label}</div>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>{item.prev}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom spacer */}
      <div style={{ height: 24 }} />
    </motion.div>
  )
}
