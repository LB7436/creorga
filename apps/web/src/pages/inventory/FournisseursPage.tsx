import { motion } from 'framer-motion'
import { Plus, Phone, Mail, Calendar, Truck } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  category: string
  lastOrder: string
  totalOrders: number
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Bofrost Luxembourg',
    contact: 'Jean-Marc Weber',
    email: 'jm.weber@bofrost.lu',
    phone: '+352 26 31 45 00',
    category: 'Surgelés',
    lastOrder: '12/04/2026',
    totalOrders: 24,
  },
  {
    id: '2',
    name: 'Metro Cash & Carry',
    contact: 'Sandra Müller',
    email: 's.muller@metro.lu',
    phone: '+352 44 88 12 00',
    category: 'Grossiste alimentaire',
    lastOrder: '10/04/2026',
    totalOrders: 48,
  },
  {
    id: '3',
    name: 'Ferme Bio Schengen',
    contact: 'Pierre Hoffmann',
    email: 'contact@fermeschengen.lu',
    phone: '+352 23 66 98 10',
    category: 'Produits frais locaux',
    lastOrder: '13/04/2026',
    totalOrders: 36,
  },
  {
    id: '4',
    name: 'Boissons du Grand-Duché',
    contact: 'Marc Thill',
    email: 'm.thill@boissons-gd.lu',
    phone: '+352 27 04 55 30',
    category: 'Boissons et spiritueux',
    lastOrder: '08/04/2026',
    totalOrders: 18,
  },
]

const categoryColors: Record<string, { bg: string; text: string }> = {
  Surgelés: { bg: '#dbeafe', text: '#1d4ed8' },
  'Grossiste alimentaire': { bg: '#fef3c7', text: '#92400e' },
  'Produits frais locaux': { bg: '#dcfce7', text: '#16a34a' },
  'Boissons et spiritueux': { bg: '#ede9fe', text: '#6d28d9' },
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

export default function FournisseursPage() {
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
              Fournisseurs
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Répertoire des fournisseurs et contacts
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
            Ajouter un fournisseur
          </button>
        </motion.div>

        {/* Supplier cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {mockSuppliers.map((supplier) => {
            const colors = categoryColors[supplier.category] || {
              bg: '#f1f5f9',
              text: '#475569',
            }
            return (
              <motion.div key={supplier.id} variants={fadeUp} style={card}>
                {/* Top: name & category */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Truck size={22} style={{ color: colors.text }} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        {supplier.name}
                      </p>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          background: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {supplier.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        fontWeight: 500,
                      }}
                    >
                      Contact :
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: '#1e293b',
                        fontWeight: 500,
                      }}
                    >
                      {supplier.contact}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Mail size={14} style={{ color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      {supplier.email}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Phone size={14} style={{ color: '#475569' }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      {supplier.phone}
                    </span>
                  </div>
                </div>

                {/* Bottom stats */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={14} style={{ color: '#475569' }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>
                      Dernière commande : {supplier.lastOrder}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#92400E',
                      background: '#fef3c7',
                      padding: '3px 10px',
                      borderRadius: 8,
                    }}
                  >
                    {supplier.totalOrders} commandes
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
