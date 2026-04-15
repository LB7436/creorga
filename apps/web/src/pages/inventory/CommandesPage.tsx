import { motion } from 'framer-motion'
import { Plus, ShoppingCart, Package, TrendingUp } from 'lucide-react'

interface Order {
  id: string
  number: string
  supplier: string
  date: string
  status: 'DRAFT' | 'SENT' | 'RECEIVED'
  total: number
  items: number
}

const mockOrders: Order[] = [
  { id: '1', number: 'CMD-2026-042', supplier: 'Metro Cash & Carry', date: '14/04/2026', status: 'DRAFT', total: 845.60, items: 12 },
  { id: '2', number: 'CMD-2026-041', supplier: 'Bofrost Luxembourg', date: '12/04/2026', status: 'SENT', total: 1234.50, items: 8 },
  { id: '3', number: 'CMD-2026-040', supplier: 'Ferme Bio Schengen', date: '11/04/2026', status: 'SENT', total: 356.80, items: 15 },
  { id: '4', number: 'CMD-2026-039', supplier: 'Boissons du Grand-Duché', date: '08/04/2026', status: 'RECEIVED', total: 2100.00, items: 24 },
  { id: '5', number: 'CMD-2026-038', supplier: 'Metro Cash & Carry', date: '05/04/2026', status: 'RECEIVED', total: 967.30, items: 18 },
  { id: '6', number: 'CMD-2026-037', supplier: 'Bofrost Luxembourg', date: '01/04/2026', status: 'RECEIVED', total: 1450.20, items: 10 },
]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Brouillon', bg: '#f1f5f9', text: '#475569' },
  SENT: { label: 'Envoyée', bg: '#dbeafe', text: '#1d4ed8' },
  RECEIVED: { label: 'Reçue', bg: '#dcfce7', text: '#16a34a' },
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

export default function CommandesPage() {
  const enCours = mockOrders.filter((o) => o.status !== 'RECEIVED').length
  const recuesCeMois = mockOrders.filter((o) => o.status === 'RECEIVED').length
  const totalMois = mockOrders
    .filter((o) => o.status === 'RECEIVED')
    .reduce((s, o) => s + o.total, 0)

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
              Commandes
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Suivi des bons de commande fournisseurs
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
              background: '#92400E',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Nouvelle commande
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
              <ShoppingCart size={18} style={{ color: '#1d4ed8' }} />
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
              <Package size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                Reçues ce mois
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {recuesCeMois}
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
              <TrendingUp size={18} style={{ color: '#92400E' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                Total achats mois
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {fmt(totalMois)}
            </p>
          </div>
        </motion.div>

        {/* Orders table */}
        <motion.div variants={fadeUp} style={card}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 16,
            }}
          >
            Toutes les commandes
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Numéro', 'Fournisseur', 'Date', 'Articles', 'Total', 'Statut'].map(
                    (h) => (
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
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {mockOrders.map((order) => {
                  const st = statusConfig[order.status]
                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 14,
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                      >
                        {order.number}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {order.supplier}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {order.date}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {order.items} articles
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: 14,
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(order.total)}
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
