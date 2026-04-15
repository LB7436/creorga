import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Clock } from 'lucide-react'

const mockTransactions = [
  { id: 1, heure: '08:00', type: 'Ouverture', montant: 200.00, note: 'Fond de caisse initial' },
  { id: 2, heure: '09:15', type: 'Vente', montant: 45.50, note: 'Table 3 - Petit-déjeuner' },
  { id: 3, heure: '10:32', type: 'Vente', montant: 128.00, note: 'Table 7 - Brunch groupe' },
  { id: 4, heure: '11:45', type: 'Retrait', montant: -50.00, note: 'Achat urgent boulangerie' },
  { id: 5, heure: '12:20', type: 'Vente', montant: 312.80, note: 'Tables 1, 4, 5 - Déjeuner' },
  { id: 6, heure: '14:10', type: 'Vente', montant: 87.30, note: 'Table 2 - Menu du jour' },
  { id: 7, heure: '15:00', type: 'Retrait', montant: -100.00, note: 'Dépôt banque partiel' },
  { id: 8, heure: '16:30', type: 'Vente', montant: 273.40, note: 'Tables 6, 8 - Goûter + boissons' },
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

const typeColors: Record<string, string> = {
  Ouverture: '#10b981',
  Vente: '#3b82f6',
  Retrait: '#f59e0b',
  Fermeture: '#ef4444',
}

export default function CaissePage() {
  const [caisseOuverte, setCaisseOuverte] = useState(true)

  const totalVentes = mockTransactions
    .filter(t => t.type === 'Vente')
    .reduce((sum, t) => sum + t.montant, 0)

  const stats = [
    {
      label: 'Caisse ouverte',
      value: caisseOuverte ? 'Oui' : 'Non',
      icon: caisseOuverte ? Unlock : Lock,
      color: caisseOuverte ? '#10b981' : '#ef4444',
    },
    {
      label: 'Fond de caisse',
      value: '200,00 €',
      icon: DollarSign,
      color: '#8b5cf6',
    },
    {
      label: 'Ventes du jour',
      value: `${totalVentes.toFixed(2).replace('.', ',')} €`,
      icon: ArrowUpCircle,
      color: '#3b82f6',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
          Caisse
        </h1>
        <p style={{ fontSize: 14, color: '#475569' }}>
          Gestion du tiroir-caisse et mouvements du jour
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}
      >
        {stats.map(stat => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${stat.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => setCaisseOuverte(true)}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: caisseOuverte ? '#d1fae5' : '#10b981',
            color: caisseOuverte ? '#065f46' : '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: caisseOuverte ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: caisseOuverte ? 0.6 : 1,
          }}
          disabled={caisseOuverte}
        >
          <Unlock size={16} />
          Ouvrir la caisse
        </button>
        <button
          onClick={() => setCaisseOuverte(false)}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: !caisseOuverte ? '#fee2e2' : '#ef4444',
            color: !caisseOuverte ? '#991b1b' : '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: !caisseOuverte ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: !caisseOuverte ? 0.6 : 1,
          }}
          disabled={!caisseOuverte}
        >
          <Lock size={16} />
          Fermer la caisse
        </button>
      </motion.div>

      <motion.div variants={itemVariants} style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
          Mouvements du jour
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Heure', 'Type', 'Montant', 'Note'].map(h => (
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
              {mockTransactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={14} style={{ color: '#475569' }} />
                      {tx.heure}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: typeColors[tx.type] || '#64748b',
                        background: `${typeColors[tx.type] || '#64748b'}15`,
                      }}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: tx.montant >= 0 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {tx.montant >= 0 ? '+' : ''}{tx.montant.toFixed(2).replace('.', ',')} €
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                    {tx.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}
