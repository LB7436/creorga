import { motion } from 'framer-motion'
import { AlertTriangle, Euro, Send, Clock, Mail } from 'lucide-react'

interface OverdueInvoice {
  id: number
  client: string
  facture: string
  montant: number
  joursRetard: number
  derniereRelance: string | null
}

const mockOverdue: OverdueInvoice[] = [
  { id: 1, client: 'Trattoria Roma', facture: 'FAC-2026-085', montant: 630.00, joursRetard: 14, derniereRelance: '2026-04-08' },
  { id: 2, client: 'Bistro Kirchberg', facture: 'FAC-2026-083', montant: 980.00, joursRetard: 9, derniereRelance: '2026-04-10' },
  { id: 3, client: 'La Table du Chef', facture: 'FAC-2026-076', montant: 450.00, joursRetard: 22, derniereRelance: '2026-04-01' },
  { id: 4, client: 'Brasserie du Grund', facture: 'FAC-2026-071', montant: 720.00, joursRetard: 31, derniereRelance: '2026-03-25' },
  { id: 5, client: 'Pizzeria Napoli', facture: 'FAC-2026-069', montant: 340.00, joursRetard: 7, derniereRelance: null },
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

function getRetardColor(jours: number): string {
  if (jours >= 30) return '#dc2626'
  if (jours >= 14) return '#ef4444'
  return '#f59e0b'
}

function getRetardBg(jours: number): string {
  if (jours >= 30) return '#dc262618'
  if (jours >= 14) return '#ef444418'
  return '#f59e0b18'
}

export default function RelancesPage() {
  const totalImpaye = mockOverdue.reduce((s, o) => s + o.montant, 0)

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const stats = [
    { label: 'Factures en retard', value: String(mockOverdue.length), icon: AlertTriangle, color: '#ef4444' },
    { label: 'Montant impayé', value: `${totalImpaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, icon: Euro, color: '#f59e0b' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Relances</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Suivi des factures impayées et relances clients</p>
        </div>
        <button
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Send size={16} />
          Relancer tout
        </button>
      </motion.div>

      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 28 }}>
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

      <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mockOverdue.map((invoice, index) => (
          <motion.div
            key={invoice.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06, duration: 0.35 }}
            style={{
              ...cardStyle,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: getRetardBg(invoice.joursRetard),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={20} style={{ color: getRetardColor(invoice.joursRetard) }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{invoice.client}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>{invoice.facture}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {invoice.derniereRelance
                      ? `Dernière relance : ${formatDate(invoice.derniereRelance)}`
                      : 'Aucune relance envoyée'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  {invoice.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: getRetardColor(invoice.joursRetard),
                    background: getRetardBg(invoice.joursRetard),
                  }}
                >
                  {invoice.joursRetard} jours
                </span>
              </div>
              <button
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#065F46',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <Mail size={14} />
                Envoyer une relance
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
