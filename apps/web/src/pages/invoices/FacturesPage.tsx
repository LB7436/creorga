import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Send, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react'

interface Facture {
  id: number
  numero: string
  client: string
  date: string
  echeance: string
  montant: number
  statut: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
}

const mockFactures: Facture[] = [
  { id: 1, numero: 'FAC-2026-089', client: 'Restaurant Le Pavillon', date: '2026-04-10', echeance: '2026-05-10', montant: 2450.00, statut: 'PAID' },
  { id: 2, numero: 'FAC-2026-088', client: 'Brasserie Mansfeld', date: '2026-04-08', echeance: '2026-05-08', montant: 1280.00, statut: 'SENT' },
  { id: 3, numero: 'FAC-2026-087', client: 'Café des Artistes', date: '2026-04-05', echeance: '2026-05-05', montant: 890.00, statut: 'DRAFT' },
  { id: 4, numero: 'FAC-2026-086', client: 'Hotel Parc Belair', date: '2026-03-28', echeance: '2026-04-28', montant: 3200.00, statut: 'SENT' },
  { id: 5, numero: 'FAC-2026-085', client: 'Trattoria Roma', date: '2026-03-15', echeance: '2026-04-15', montant: 630.00, statut: 'OVERDUE' },
  { id: 6, numero: 'FAC-2026-084', client: 'Wine Bar Clausen', date: '2026-03-10', echeance: '2026-04-10', montant: 1750.00, statut: 'PAID' },
  { id: 7, numero: 'FAC-2026-083', client: 'Bistro Kirchberg', date: '2026-03-05', echeance: '2026-04-05', montant: 980.00, statut: 'OVERDUE' },
  { id: 8, numero: 'FAC-2026-082', client: 'La Table du Chef', date: '2026-03-01', echeance: '2026-03-31', montant: 1540.00, statut: 'PAID' },
]

const statutConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: '#475569' },
  SENT: { label: 'Envoyée', color: '#3b82f6' },
  PAID: { label: 'Payée', color: '#10b981' },
  OVERDUE: { label: 'En retard', color: '#ef4444' },
}

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

export default function FacturesPage() {
  const [filter, setFilter] = useState<string | null>(null)

  const aEnvoyer = mockFactures.filter(f => f.statut === 'DRAFT').length
  const enAttente = mockFactures.filter(f => f.statut === 'SENT').length
  const payees = mockFactures.filter(f => f.statut === 'PAID').length

  const filtered = filter ? mockFactures.filter(f => f.statut === filter) : mockFactures

  const stats = [
    { label: 'À envoyer', value: String(aEnvoyer), icon: Send, color: '#475569' },
    { label: 'En attente', value: String(enAttente), icon: Clock, color: '#3b82f6' },
    { label: 'Payées', value: String(payees), icon: CheckCircle2, color: '#10b981' },
  ]

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Factures</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Gestion et suivi des factures</p>
        </div>
        <button
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: '#065F46',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={16} />
          Nouvelle facture
        </button>
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
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter(null)}
          style={{
            padding: '6px 16px',
            borderRadius: 20,
            border: 'none',
            background: filter === null ? '#1e293b' : 'rgba(255,255,255,0.03)',
            color: filter === null ? '#fff' : '#64748b',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Toutes
        </button>
        {Object.entries(statutConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: 'none',
              background: filter === key ? cfg.color : 'rgba(255,255,255,0.03)',
              color: filter === key ? '#fff' : '#64748b',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cfg.label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Numéro', 'Client', 'Date', 'Échéance', 'Montant', 'Statut'].map(h => (
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
            {filtered.map(facture => {
              const config = statutConfig[facture.statut]
              return (
                <tr key={facture.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: '#475569' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{facture.numero}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>{facture.client}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(facture.date)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {facture.statut === 'OVERDUE' && <AlertTriangle size={13} style={{ color: '#ef4444' }} />}
                      {formatDate(facture.echeance)}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {facture.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: config.color,
                        background: `${config.color}15`,
                      }}
                    >
                      {config.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  )
}
