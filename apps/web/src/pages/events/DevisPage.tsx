import { motion } from 'framer-motion'
import { Plus, FileText, TrendingUp, Clock } from 'lucide-react'

interface EventQuote {
  id: string
  name: string
  client: string
  date: string
  headcount: number
  amount: number
  status: 'DRAFT' | 'SENT' | 'DEPOSIT_PAID' | 'CONFIRMED'
  type: string
}

const mockQuotes: EventQuote[] = [
  { id: '1', name: 'Anniversaire 50 ans Dupont', client: 'Famille Dupont', date: '25/05/2026', headcount: 45, amount: 3200, status: 'CONFIRMED', type: 'Anniversaire' },
  { id: '2', name: 'Mariage Schmit-Kieffer', client: 'Julie Schmit', date: '14/06/2026', headcount: 120, amount: 8500, status: 'DEPOSIT_PAID', type: 'Mariage' },
  { id: '3', name: 'Team Building TechCorp', client: 'TechCorp Luxembourg', date: '20/05/2026', headcount: 35, amount: 2800, status: 'SENT', type: 'Team Building' },
  { id: '4', name: 'Cocktail inauguration', client: 'Cabinet Avocats Muller', date: '08/05/2026', headcount: 60, amount: 4200, status: 'DRAFT', type: 'Cocktail' },
  { id: '5', name: 'Brunch entreprise', client: 'FinanceGroup SA', date: '30/04/2026', headcount: 25, amount: 1500, status: 'SENT', type: 'Brunch' },
]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Brouillon', bg: '#f1f5f9', text: '#475569' },
  SENT: { label: 'Envoyé', bg: '#dbeafe', text: '#1d4ed8' },
  DEPOSIT_PAID: { label: 'Acompte reçu', bg: '#fef3c7', text: '#92400e' },
  CONFIRMED: { label: 'Confirmé', bg: '#dcfce7', text: '#16a34a' },
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  padding: 24,
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)

export default function EventsDevisPage() {
  const enCours = mockQuotes.filter(
    (q) => q.status === 'DRAFT' || q.status === 'SENT'
  ).length
  const confirmes = mockQuotes.filter(
    (q) => q.status === 'CONFIRMED' || q.status === 'DEPOSIT_PAID'
  ).length
  const caTotal = mockQuotes
    .filter((q) => q.status === 'CONFIRMED' || q.status === 'DEPOSIT_PAID')
    .reduce((s, q) => s + q.amount, 0)

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
              Devis Événements
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Gestion des devis et réservations événementielles
            </p>
          </div>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#6D28D9',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Nouveau devis événement
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          <div style={{ ...card, padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Clock size={18} style={{ color: '#6D28D9' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>En cours</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {enCours}
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <FileText size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>Confirmés</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {confirmes}
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <TrendingUp size={18} style={{ color: '#92400e' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                CA événements
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {fmt(caTotal)}
            </p>
          </div>
        </motion.div>

        {/* Quotes table */}
        <motion.div variants={fadeUp} style={card}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 16,
            }}
          >
            Tous les devis
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {[
                    'Événement',
                    'Client',
                    'Date',
                    'Couverts',
                    'Montant',
                    'Statut',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockQuotes.map((quote) => {
                  const st = statusConfig[quote.status]
                  return (
                    <tr
                      key={quote.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div>
                          <p
                            style={{
                              fontSize: 14,
                              color: '#1e293b',
                              fontWeight: 600,
                            }}
                          >
                            {quote.name}
                          </p>
                          <p style={{ fontSize: 12, color: '#475569' }}>
                            {quote.type}
                          </p>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {quote.client}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {quote.date}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {quote.headcount} pers.
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 14,
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(quote.amount)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: st.bg,
                            color: st.text,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
