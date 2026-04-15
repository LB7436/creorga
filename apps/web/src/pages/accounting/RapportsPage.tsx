import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, PieChart, DollarSign, FileDown, FileSpreadsheet, FileText } from 'lucide-react'

const revenueData = [
  { mois: 'Nov', ca: 42800 },
  { mois: 'Déc', ca: 51200 },
  { mois: 'Jan', ca: 38500 },
  { mois: 'Fév', ca: 44100 },
  { mois: 'Mar', ca: 48700 },
  { mois: 'Avr', ca: 52950 },
]

const topProduits = [
  { rang: 1, nom: 'Menu du jour', quantite: 342, ca: 5472.00 },
  { rang: 2, nom: 'Entrecôte grillée', quantite: 187, ca: 4488.00 },
  { rang: 3, nom: 'Crémant Luxembourg', quantite: 156, ca: 3900.00 },
  { rang: 4, nom: 'Plateau fruits de mer', quantite: 89, ca: 3560.00 },
  { rang: 5, nom: 'Dessert du chef', quantite: 298, ca: 2384.00 },
]

const stats = [
  { label: 'CA ce mois', value: '52 950 €', icon: TrendingUp, color: '#10b981', change: '+8,7%' },
  { label: 'Marge brute', value: '68,4%', icon: PieChart, color: '#3b82f6', change: '+1,2 pts' },
  { label: 'Résultat net', value: '12 480 €', icon: DollarSign, color: '#8b5cf6', change: '+5,3%' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: '24px',
  }

const exportButtons = [
  { label: 'PDF', icon: FileText, color: '#ef4444' },
  { label: 'Excel', icon: FileSpreadsheet, color: '#10b981' },
  { label: 'CSV', icon: FileDown, color: '#3b82f6' },
]

export default function RapportsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Rapports financiers</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Vue d'ensemble des performances financières</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {exportButtons.map(btn => (
            <button
              key={btn.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                border: `1px solid ${btn.color}30`,
                background: `${btn.color}10`,
                color: btn.color,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <btn.icon size={14} />
              {btn.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        {stats.map(stat => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{stat.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{stat.change}</span>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={{ ...cardStyle, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
          Chiffre d'affaires — 6 derniers mois
        </h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="mois" tick={{ fontSize: 13, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: 13,
                }}
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, 'CA']}
              />
              <Bar dataKey="ca" fill="#1F2937" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
          Top 5 produits les plus vendus
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Produit', 'Quantité', 'CA'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProduits.map(prod => (
              <tr key={prod.rang} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: prod.rang <= 3 ? '#f59e0b18' : 'rgba(0,0,0,0.04)',
                      color: prod.rang <= 3 ? '#f59e0b' : '#94a3b8',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {prod.rang}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                  {prod.nom}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>
                  {prod.quantite}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  {prod.ca.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  )
}
