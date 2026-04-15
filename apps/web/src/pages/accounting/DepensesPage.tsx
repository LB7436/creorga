import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, UtensilsCrossed, Users, Zap, Package, Receipt, X } from 'lucide-react'

interface Expense {
  id: number
  date: string
  categorie: string
  description: string
  montant: number
  hasReceipt: boolean
}

const categories: Record<string, { label: string; color: string }> = {
  FOOD_COST: { label: 'Nourriture', color: '#f59e0b' },
  STAFF: { label: 'Personnel', color: '#8b5cf6' },
  UTILITIES: { label: 'Charges', color: '#3b82f6' },
  SUPPLIES: { label: 'Fournitures', color: '#10b981' },
}

const mockExpenses: Expense[] = [
  { id: 1, date: '2026-04-14', categorie: 'FOOD_COST', description: 'Boucherie Schmit - Viandes semaine', montant: 485.00, hasReceipt: true },
  { id: 2, date: '2026-04-13', categorie: 'STAFF', description: 'Intérimaire service weekend', montant: 320.00, hasReceipt: true },
  { id: 3, date: '2026-04-13', categorie: 'UTILITIES', description: 'Facture électricité mars', montant: 412.50, hasReceipt: true },
  { id: 4, date: '2026-04-12', categorie: 'FOOD_COST', description: 'Marché Findel - Légumes frais', montant: 178.30, hasReceipt: false },
  { id: 5, date: '2026-04-12', categorie: 'SUPPLIES', description: 'Serviettes, produits nettoyage', montant: 95.60, hasReceipt: true },
  { id: 6, date: '2026-04-11', categorie: 'FOOD_COST', description: 'Poissonnerie Luxembourg', montant: 340.00, hasReceipt: true },
  { id: 7, date: '2026-04-10', categorie: 'STAFF', description: 'Formation hygiène personnel', montant: 220.00, hasReceipt: true },
  { id: 8, date: '2026-04-10', categorie: 'UTILITIES', description: 'Internet & téléphone avril', montant: 89.90, hasReceipt: true },
  { id: 9, date: '2026-04-09', categorie: 'FOOD_COST', description: 'Boulangerie artisanale - Pain', montant: 67.20, hasReceipt: false },
  { id: 10, date: '2026-04-08', categorie: 'STAFF', description: 'Heures supplémentaires mars', montant: 1000.00, hasReceipt: true },
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

const catIcons: Record<string, typeof TrendingDown> = {
  FOOD_COST: UtensilsCrossed,
  STAFF: Users,
  UTILITIES: Zap,
  SUPPLIES: Package,
}

export default function DepensesPage() {
  const [filter, setFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const totalMois = mockExpenses.reduce((s, e) => s + e.montant, 0)
  const totalFood = mockExpenses.filter(e => e.categorie === 'FOOD_COST').reduce((s, e) => s + e.montant, 0)
  const totalStaff = mockExpenses.filter(e => e.categorie === 'STAFF').reduce((s, e) => s + e.montant, 0)

  const filtered = filter ? mockExpenses.filter(e => e.categorie === filter) : mockExpenses

  const stats = [
    { label: 'Total ce mois', value: `${totalMois.toFixed(2).replace('.', ',')} €`, icon: TrendingDown, color: '#ef4444' },
    { label: 'Nourriture', value: `${totalFood.toFixed(2).replace('.', ',')} €`, icon: UtensilsCrossed, color: '#f59e0b' },
    { label: 'Personnel', value: `${totalStaff.toFixed(2).replace('.', ',')} €`, icon: Users, color: '#8b5cf6' },
  ]

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Dépenses</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Suivi et catégorisation des dépenses</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: '#1F2937',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TrendingDown size={16} />
          Ajouter une dépense
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
        {Object.entries(categories).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: 'none',
              background: filter === key ? cat.color : 'rgba(255,255,255,0.03)',
              color: filter === key ? '#fff' : '#64748b',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Catégorie', 'Description', 'Montant', ''].map(h => (
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
            {filtered.map(expense => {
              const cat = categories[expense.categorie]
              const Icon = catIcons[expense.categorie] || Package
              return (
                <tr key={expense.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>{formatDate(expense.date)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: cat.color,
                      background: `${cat.color}15`,
                    }}>
                      <Icon size={13} />
                      {cat.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{expense.description}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
                    -{expense.montant.toFixed(2).replace('.', ',')} €
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {expense.hasReceipt && (
                      <Receipt size={16} style={{ color: '#10b981' }} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 24,
                padding: 32,
                width: 480,
                maxWidth: '90vw',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Nouvelle dépense</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>Catégorie</label>
                  <select style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', background: '#fff' }}>
                    {Object.entries(categories).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>Description</label>
                  <input type="text" placeholder="Description de la dépense" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>Montant (€)</label>
                  <input type="number" placeholder="0.00" step="0.01" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', boxSizing: 'border-box' }} />
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    marginTop: 8,
                    padding: '12px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#1F2937',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
