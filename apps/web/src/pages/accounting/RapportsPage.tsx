import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ChevronDown, FileText, FileSpreadsheet,
  ArrowUpRight, ArrowDownRight, Calendar, ToggleLeft, ToggleRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
type Period = 'ce_mois' | 'mois_dernier' | 'ce_trimestre' | 'cette_annee'

interface KpiCard {
  label: string
  value: string
  trend: number
  trendLabel: string
  sparkline: number[]
  prefix?: string
  isCurrency?: boolean
  bold?: boolean
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */
const periodLabels: Record<Period, string> = {
  ce_mois: 'Ce mois',
  mois_dernier: 'Mois dernier',
  ce_trimestre: 'Ce trimestre',
  cette_annee: 'Cette année',
}

const periodDates: Record<Period, string> = {
  ce_mois: '1 Avr. — 15 Avr. 2026',
  mois_dernier: '1 Mars — 31 Mars 2026',
  ce_trimestre: '1 Jan. — 15 Avr. 2026',
  cette_annee: '1 Jan. — 15 Avr. 2026',
}

const kpis: KpiCard[] = [
  { label: "Chiffre d'affaires", value: '24 350', trend: 12.3, trendLabel: '+12,3%', sparkline: [18, 20, 19, 22, 21, 24, 23, 25], isCurrency: true },
  { label: 'Coût des marchandises', value: '8 120', trend: 5.1, trendLabel: '+5,1%', sparkline: [6, 7, 6.5, 7.2, 7.8, 8, 7.5, 8.1], isCurrency: true },
  { label: 'Marge brute', value: '16 230', trend: 66.7, trendLabel: '66,7%', sparkline: [12, 13, 12.5, 14, 13.5, 15, 15.5, 16.2], isCurrency: true },
  { label: 'Charges de personnel', value: '9 450', trend: -2.1, trendLabel: '-2,1%', sparkline: [9.8, 9.6, 9.5, 9.7, 9.4, 9.5, 9.3, 9.45], isCurrency: true },
  { label: 'Charges fixes', value: '3 200', trend: 0, trendLabel: '0,0%', sparkline: [3.2, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2, 3.2], isCurrency: true },
  { label: 'Résultat net', value: '3 580', trend: 18.2, trendLabel: '+18,2%', sparkline: [2.1, 2.5, 2.8, 3.0, 2.9, 3.2, 3.4, 3.58], isCurrency: true, bold: true },
]

const dailyRevenue = [
  { jour: '1', courant: 1450, precedent: 1280 },
  { jour: '2', courant: 1620, precedent: 1350 },
  { jour: '3', courant: 1380, precedent: 1420 },
  { jour: '4', courant: 2250, precedent: 1950 },
  { jour: '5', courant: 2680, precedent: 2200 },
  { jour: '6', courant: 2420, precedent: 2100 },
  { jour: '7', courant: 1520, precedent: 1380 },
  { jour: '8', courant: 1680, precedent: 1450 },
  { jour: '9', courant: 1750, precedent: 1520 },
  { jour: '10', courant: 1480, precedent: 1390 },
  { jour: '11', courant: 2350, precedent: 2050 },
  { jour: '12', courant: 2780, precedent: 2400 },
  { jour: '13', courant: 2550, precedent: 2250 },
  { jour: '14', courant: 1600, precedent: 1500 },
  { jour: '15', courant: 1840, precedent: 1610 },
]

const categoryData = [
  { name: 'Cuisine', value: 40, color: '#6366f1' },
  { name: 'Boissons', value: 35, color: '#06b6d4' },
  { name: 'Desserts', value: 15, color: '#f59e0b' },
  { name: 'Événements', value: 10, color: '#10b981' },
]

const topProducts = [
  { name: 'Menu du jour', montant: 4850 },
  { name: 'Entrecôte grillée', montant: 3920 },
  { name: 'Crémant Luxembourg', montant: 3180 },
  { name: 'Plateau fruits de mer', montant: 2740 },
  { name: 'Dessert du chef', montant: 2100 },
]

const monthlyData = [
  { mois: 'Jan.', ca: 21200, couts: 7100, marge: 14100, personnel: 8900, resultat: 2000 },
  { mois: 'Fév.', ca: 22800, couts: 7600, marge: 15200, personnel: 9100, resultat: 2800 },
  { mois: 'Mars', ca: 23500, couts: 7900, marge: 15600, personnel: 9300, resultat: 3100 },
  { mois: 'Avr.', ca: 24350, couts: 8120, marge: 16230, personnel: 9450, resultat: 3580 },
]

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS                                                 */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                             */
/* ------------------------------------------------------------------ */
const cardBase: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 24,
}

/* ------------------------------------------------------------------ */
/*  SPARKLINE COMPONENT                                                */
/* ------------------------------------------------------------------ */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 64
  const h = 24
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
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
/*  CUSTOM TOOLTIP                                                     */
/* ------------------------------------------------------------------ */
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '12px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Jour {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#64748b' }}>
            {p.dataKey === 'courant' ? 'Période actuelle' : 'Période précédente'}:
          </span>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{p.value.toLocaleString('fr-FR')} €</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */
export default function RapportsPage() {
  const [period, setPeriod] = useState<Period>('ce_mois')
  const [compare, setCompare] = useState(true)
  const [periodOpen, setPeriodOpen] = useState(false)

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  /* Monthly table totals */
  const totals = {
    ca: monthlyData.reduce((s, r) => s + r.ca, 0),
    couts: monthlyData.reduce((s, r) => s + r.couts, 0),
    marge: monthlyData.reduce((s, r) => s + r.marge, 0),
    personnel: monthlyData.reduce((s, r) => s + r.personnel, 0),
    resultat: monthlyData.reduce((s, r) => s + r.resultat, 0),
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}
    >
      {/* ============================================================ */}
      {/*  1. PERIOD SELECTOR & TOP BAR                                 */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0, marginBottom: 4 }}>
            Rapports financiers
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            Tableau de bord des performances
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Period Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#fff',
                fontSize: 13, fontWeight: 600, color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <Calendar size={14} color="#64748b" />
              {periodLabels[period]}
              <ChevronDown size={14} color="#64748b" />
            </button>
            {periodOpen && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 50,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: 180,
              }}>
                {(Object.keys(periodLabels) as Period[]).map(k => (
                  <button
                    key={k}
                    onClick={() => { setPeriod(k); setPeriodOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 16px', border: 'none',
                      background: k === period ? '#f1f5f9' : 'transparent',
                      fontSize: 13, fontWeight: k === period ? 600 : 400,
                      color: '#1e293b', cursor: 'pointer',
                    }}
                  >
                    {periodLabels[k]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range label */}
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            {periodDates[period]}
          </span>

          {/* Compare toggle */}
          <button
            onClick={() => setCompare(!compare)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 10,
              border: '1px solid #e2e8f0', background: compare ? '#eef2ff' : '#fff',
              fontSize: 12, fontWeight: 500,
              color: compare ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
            }}
          >
            {compare ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Comparer
          </button>

          {/* Export PDF */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 10,
            border: '1px solid #fecaca', background: '#fef2f2',
            fontSize: 13, fontWeight: 600, color: '#dc2626',
            cursor: 'pointer',
          }}>
            <FileText size={14} />
            PDF
          </button>

          {/* Export Excel */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 10,
            border: '1px solid #bbf7d0', background: '#f0fdf4',
            fontSize: 13, fontWeight: 600, color: '#16a34a',
            cursor: 'pointer',
          }}>
            <FileSpreadsheet size={14} />
            Excel
          </button>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  2. KPI CARDS                                                 */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 28,
      }}>
        {kpis.map((kpi, i) => {
          const isPositive = kpi.trend > 0
          const isNeutral = kpi.trend === 0
          const trendColor = isNeutral ? '#64748b' : isPositive ? '#16a34a' : '#dc2626'
          const sparkColor = kpi.bold ? '#16a34a' : '#6366f1'

          return (
            <motion.div
              key={kpi.label}
              variants={itemVariants}
              style={{
                ...cardBase,
                padding: '20px 18px',
                borderLeft: kpi.bold ? '3px solid #16a34a' : undefined,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {kpi.label}
              </div>
              <div style={{
                fontSize: kpi.bold ? 24 : 22, fontWeight: kpi.bold ? 800 : 700,
                color: kpi.bold ? '#16a34a' : '#1e293b', marginBottom: 8,
              }}>
                {kpi.value} {kpi.isCurrency ? '€' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {!isNeutral && (
                    isPositive
                      ? <ArrowUpRight size={14} color={trendColor} />
                      : <ArrowDownRight size={14} color={trendColor} />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>
                    {kpi.trendLabel}
                  </span>
                </div>
                <MiniSparkline data={kpi.sparkline} color={sparkColor} />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ============================================================ */}
      {/*  3. REVENUE AREA CHART                                        */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{ ...cardBase, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Évolution du chiffre d'affaires
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
              Revenus journaliers — {periodDates[period]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} />
              Période actuelle
            </span>
            {compare && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: '#cbd5e1', display: 'inline-block', borderTop: '1px dashed #94a3b8' }} />
                Période précédente
              </span>
            )}
          </div>
        </div>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyRevenue} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gradientCourant" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="jour"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: string) => `${v}`}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `${fmt(v)} €`}
                width={80}
              />
              <Tooltip content={<RevenueTooltip />} />
              {compare && (
                <Area
                  type="monotone"
                  dataKey="precedent"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                  dot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="courant"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#gradientCourant)"
                dot={false}
                activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  4. CATEGORY BREAKDOWN (PIE + BAR)                            */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28,
      }}>
        {/* PIE CHART */}
        <div style={cardBase}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
            Répartition du CA par catégorie
          </h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                  contentStyle={{
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART - Top 5 */}
        <div style={cardBase}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
            Top 5 produits
          </h2>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => `${fmt(v)} €`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(value: number) => [`${fmt(value)} €`, 'Montant']}
                  contentStyle={{
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 10, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar dataKey="montant" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  5. MONTHLY COMPARISON TABLE                                  */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{ ...cardBase, marginBottom: 28, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>
          Comparaison mensuelle
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Métrique', ...monthlyData.map(m => m.mois), 'Total'].map(h => (
                <th key={h} style={{
                  textAlign: h === 'Métrique' ? 'left' : 'right',
                  padding: '12px 16px', fontSize: 11, fontWeight: 700,
                  color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
                  borderBottom: '2px solid #e2e8f0',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([
              { label: "Chiffre d'affaires", key: 'ca' as const },
              { label: 'Coûts marchandises', key: 'couts' as const },
              { label: 'Marge brute', key: 'marge' as const },
              { label: 'Personnel', key: 'personnel' as const },
              { label: 'Résultat net', key: 'resultat' as const },
            ]).map((row, ri) => {
              const isResultat = row.key === 'resultat'
              return (
                <tr key={row.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{
                    padding: '14px 16px', fontWeight: isResultat ? 700 : 500,
                    color: '#1e293b',
                  }}>
                    {row.label}
                  </td>
                  {monthlyData.map((m, ci) => {
                    const val = m[row.key]
                    const prev = ci > 0 ? monthlyData[ci - 1][row.key] : null
                    const diff = prev !== null ? val - prev : 0
                    const diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b'
                    return (
                      <td key={m.mois} style={{
                        padding: '14px 16px', textAlign: 'right',
                        fontWeight: isResultat ? 700 : 400,
                        color: isResultat ? (val > 0 ? '#16a34a' : '#dc2626') : '#1e293b',
                      }}>
                        <div>{fmt(val)} €</div>
                        {compare && prev !== null && (
                          <div style={{ fontSize: 11, color: diffColor, marginTop: 2 }}>
                            {diff > 0 ? '+' : ''}{fmt(diff)} €
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td style={{
                    padding: '14px 16px', textAlign: 'right',
                    fontWeight: 700,
                    color: isResultat ? '#16a34a' : '#1e293b',
                    borderLeft: '2px solid #e2e8f0',
                  }}>
                    {fmt(totals[row.key])} €
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

      {/* ============================================================ */}
      {/*  6. CASH FLOW SUMMARY                                         */}
      {/* ============================================================ */}
      <motion.div variants={itemVariants} style={{
        ...cardBase,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
      }}>
        {/* Encaissements */}
        <div style={{
          padding: '28px 32px', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Encaissements
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} color="#16a34a" />
            <span style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>26 780 €</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            Total des entrées
          </div>
        </div>

        {/* Decaissements */}
        <div style={{
          padding: '28px 32px', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Décaissements
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={20} color="#dc2626" />
            <span style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>23 200 €</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            Total des sorties
          </div>
        </div>

        {/* Solde */}
        <div style={{
          padding: '28px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: '#f0fdf4', borderRadius: '0 16px 16px 0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
            Solde
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpRight size={20} color="#16a34a" />
            <span style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>+3 580 €</span>
          </div>
          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 500 }}>
            Trésorerie positive
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
