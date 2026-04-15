import { motion } from 'framer-motion'
import { FileMinus, Euro, Calendar, Plus, FileText, ArrowRight } from 'lucide-react'

interface Avoir {
  id: number
  numero: string
  factureAssociee: string
  client: string
  montant: number
  date: string
  raison: string
}

const mockAvoirs: Avoir[] = [
  { id: 1, numero: 'AV-2026-012', factureAssociee: 'FAC-2026-085', client: 'Trattoria Roma', montant: 630.00, date: '2026-04-12', raison: 'Erreur de facturation - double saisie' },
  { id: 2, numero: 'AV-2026-011', factureAssociee: 'FAC-2026-078', client: 'Brasserie Mansfeld', montant: 890.00, date: '2026-04-05', raison: 'Retour marchandise - produits non conformes' },
  { id: 3, numero: 'AV-2026-010', factureAssociee: 'FAC-2026-072', client: 'Café des Artistes', montant: 340.00, date: '2026-03-28', raison: 'Remise commerciale accordée après négociation' },
  { id: 4, numero: 'AV-2026-009', factureAssociee: 'FAC-2026-065', client: 'Hotel Parc Belair', montant: 480.00, date: '2026-03-15', raison: 'Annulation partielle de commande' },
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

export default function AvoirsPage() {
  const totalAvoirs = mockAvoirs.reduce((s, a) => s + a.montant, 0)
  const ceMois = mockAvoirs.filter(a => a.date >= '2026-04-01').length

  const stats = [
    { label: 'Total avoirs', value: `${totalAvoirs.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, icon: Euro, color: '#ef4444' },
    { label: 'Ce mois', value: String(ceMois), icon: Calendar, color: '#3b82f6' },
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Avoirs</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Notes de crédit et remboursements</p>
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
          Créer un avoir
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

      <motion.div variants={itemVariants} style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Numéro', 'Facture associée', 'Client', 'Montant', 'Date', 'Raison'].map(h => (
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
            {mockAvoirs.map(avoir => (
              <tr key={avoir.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileMinus size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{avoir.numero}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={13} style={{ color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 500 }}>{avoir.factureAssociee}</span>
                    <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>{avoir.client}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
                  -{avoir.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(avoir.date)}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569', maxWidth: 220 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {avoir.raison}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  )
}
