import { motion } from 'framer-motion'
import { Plus, Building2, Mail, Phone, Calendar, TrendingUp } from 'lucide-react'

interface B2BClient {
  id: string
  company: string
  contact: string
  email: string
  phone: string
  totalEvents: number
  caCumule: number
  lastEvent: string
  sector: string
}

const mockClients: B2BClient[] = [
  {
    id: '1',
    company: 'TechCorp Luxembourg',
    contact: 'Alexandre Reuter',
    email: 'a.reuter@techcorp.lu',
    phone: '+352 26 12 34 56',
    totalEvents: 6,
    caCumule: 18500,
    lastEvent: '20/03/2026',
    sector: 'Technologie',
  },
  {
    id: '2',
    company: 'FinanceGroup SA',
    contact: 'Catherine Braun',
    email: 'c.braun@financegroup.lu',
    phone: '+352 27 88 99 00',
    totalEvents: 4,
    caCumule: 12800,
    lastEvent: '15/02/2026',
    sector: 'Finance',
  },
  {
    id: '3',
    company: 'Cabinet Avocats Muller',
    contact: 'François Muller',
    email: 'f.muller@cabinetmuller.lu',
    phone: '+352 44 55 66 77',
    totalEvents: 3,
    caCumule: 9200,
    lastEvent: '28/01/2026',
    sector: 'Juridique',
  },
  {
    id: '4',
    company: 'EuroConsult SARL',
    contact: 'Isabelle Lentz',
    email: 'i.lentz@euroconsult.lu',
    phone: '+352 33 22 11 00',
    totalEvents: 8,
    caCumule: 24300,
    lastEvent: '02/04/2026',
    sector: 'Conseil',
  },
]

const sectorColors: Record<string, { bg: string; text: string }> = {
  Technologie: { bg: '#dbeafe', text: '#1d4ed8' },
  Finance: { bg: '#dcfce7', text: '#16a34a' },
  Juridique: { bg: '#fef3c7', text: '#92400e' },
  Conseil: { bg: '#ede9fe', text: '#6d28d9' },
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

export default function ClientsB2BPage() {
  const totalCA = mockClients.reduce((s, c) => s + c.caCumule, 0)
  const totalEvents = mockClients.reduce((s, c) => s + c.totalEvents, 0)

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
              Clients B2B
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Répertoire des clients entreprise
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
            Ajouter un client B2B
          </button>
        </motion.div>

        {/* Summary stats */}
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
              <Building2 size={18} style={{ color: '#6D28D9' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                Total clients
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {mockClients.length}
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
              <Calendar size={18} style={{ color: '#1d4ed8' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                Total événements
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {totalEvents}
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
              <TrendingUp size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                CA cumulé
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {fmt(totalCA)}
            </p>
          </div>
        </motion.div>

        {/* Client cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {mockClients.map((client) => {
            const colors = sectorColors[client.sector] || {
              bg: '#f1f5f9',
              text: '#475569',
            }
            return (
              <motion.div key={client.id} variants={fadeUp} style={card}>
                {/* Company header */}
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
                      <Building2 size={22} style={{ color: colors.text }} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        {client.company}
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
                        {client.sector}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
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
                      {client.contact}
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
                      {client.email}
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
                      {client.phone}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 14,
                  }}
                >
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#475569',
                          marginBottom: 2,
                        }}
                      >
                        Événements
                      </p>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#1e293b',
                        }}
                      >
                        {client.totalEvents}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#475569',
                          marginBottom: 2,
                        }}
                      >
                        CA cumulé
                      </p>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#6D28D9',
                        }}
                      >
                        {fmt(client.caCumule)}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    Dernier : {client.lastEvent}
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
