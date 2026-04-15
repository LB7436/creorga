import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle2, Euro, Plus } from 'lucide-react'

interface Devis {
  id: number
  numero: string
  client: string
  date: string
  validite: string
  montant: number
  statut: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
}

const mockDevis: Devis[] = [
  { id: 1, numero: 'DEV-2026-042', client: 'Restaurant Le Pavillon', date: '2026-04-12', validite: '2026-05-12', montant: 2450.00, statut: 'ACCEPTED' },
  { id: 2, numero: 'DEV-2026-041', client: 'Brasserie Mansfeld', date: '2026-04-10', validite: '2026-05-10', montant: 1280.00, statut: 'SENT' },
  { id: 3, numero: 'DEV-2026-040', client: 'Café des Artistes', date: '2026-04-08', validite: '2026-05-08', montant: 890.00, statut: 'DRAFT' },
  { id: 4, numero: 'DEV-2026-039', client: 'Hotel Parc Belair', date: '2026-04-05', validite: '2026-05-05', montant: 3200.00, statut: 'ACCEPTED' },
  { id: 5, numero: 'DEV-2026-038', client: 'Trattoria Roma', date: '2026-04-02', validite: '2026-05-02', montant: 630.00, statut: 'REJECTED' },
  { id: 6, numero: 'DEV-2026-037', client: 'Wine Bar Clausen', date: '2026-03-28', validite: '2026-04-28', montant: 1750.00, statut: 'SENT' },
]

const statutConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: '#475569' },
  SENT: { label: 'Envoyé', color: '#3b82f6' },
  ACCEPTED: { label: 'Accepté', color: '#10b981' },
  REJECTED: { label: 'Refusé', color: '#ef4444' },
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

export default function DevisPage() {
  const enCours = mockDevis.filter(d => d.statut === 'SENT').length
  const acceptes = mockDevis.filter(d => d.statut === 'ACCEPTED').length
  const montantTotal = mockDevis.reduce((s, d) => s + d.montant, 0)

  const stats = [
    { label: 'En cours', value: String(enCours), icon: Clock, color: '#3b82f6' },
    { label: 'Acceptés', value: String(acceptes), icon: CheckCircle2, color: '#10b981' },
    { label: 'Montant total', value: `${montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, icon: Euro, color: '#8b5cf6' },
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Devis</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Gestion et suivi des devis clients</p>
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
          Nouveau devis
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

      <motion.div variants={itemVariants} style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Numéro', 'Client', 'Date', 'Validité', 'Montant', 'Statut'].map(h => (
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
            {mockDevis.map(devis => {
              const config = statutConfig[devis.statut]
              return (
                <tr key={devis.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: '#475569' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{devis.numero}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>{devis.client}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(devis.date)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(devis.validite)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {devis.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
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
