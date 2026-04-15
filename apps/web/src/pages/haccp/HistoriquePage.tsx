import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Filter, ShieldCheck } from 'lucide-react'

interface AuditEntry {
  id: string
  date: string
  type: 'FRIDGE_TEMP' | 'CLEANING' | 'RECEIVING'
  value: string
  conforme: boolean
  operator: string
  notes: string
}

const typeLabels: Record<string, string> = {
  FRIDGE_TEMP: 'Température',
  CLEANING: 'Nettoyage',
  RECEIVING: 'Réception',
}

const typeColors: Record<string, { bg: string; text: string }> = {
  FRIDGE_TEMP: { bg: '#dbeafe', text: '#1d4ed8' },
  CLEANING: { bg: '#dcfce7', text: '#16a34a' },
  RECEIVING: { bg: '#fef3c7', text: '#92400e' },
}

const mockEntries: AuditEntry[] = [
  { id: '1', date: '14/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.2°C', conforme: true, operator: 'Marie L.', notes: 'RAS' },
  { id: '2', date: '14/04/2026 08:15', type: 'CLEANING', value: 'Surfaces cuisine', conforme: true, operator: 'Marie L.', notes: 'Nettoyage complet' },
  { id: '3', date: '14/04/2026 09:00', type: 'RECEIVING', value: 'Livraison Metro', conforme: true, operator: 'Thomas R.', notes: 'DLC vérifiées' },
  { id: '4', date: '13/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.4°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '5', date: '13/04/2026 08:20', type: 'CLEANING', value: 'Plan de travail', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '6', date: '13/04/2026 11:00', type: 'RECEIVING', value: 'Livraison Bofrost', conforme: true, operator: 'Lucas D.', notes: 'Température conforme' },
  { id: '7', date: '12/04/2026 08:00', type: 'FRIDGE_TEMP', value: '9.1°C', conforme: false, operator: 'Marie L.', notes: 'Frigo 2 en panne - technicien appelé' },
  { id: '8', date: '12/04/2026 08:30', type: 'CLEANING', value: 'Hotte aspirante', conforme: true, operator: 'Marie L.', notes: 'Nettoyage hebdomadaire' },
  { id: '9', date: '12/04/2026 14:00', type: 'FRIDGE_TEMP', value: '5.2°C', conforme: true, operator: 'Marie L.', notes: 'Frigo 2 réparé' },
  { id: '10', date: '11/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.1°C', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '11', date: '11/04/2026 09:30', type: 'RECEIVING', value: 'Ferme locale', conforme: true, operator: 'Lucas D.', notes: 'Légumes frais' },
  { id: '12', date: '11/04/2026 22:00', type: 'CLEANING', value: 'Nettoyage complet', conforme: true, operator: 'Thomas R.', notes: 'Fermeture' },
  { id: '13', date: '10/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.3°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '14', date: '10/04/2026 08:15', type: 'CLEANING', value: 'Surfaces', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '15', date: '09/04/2026 08:00', type: 'FRIDGE_TEMP', value: '3.9°C', conforme: true, operator: 'Marie L.', notes: '' },
  { id: '16', date: '09/04/2026 09:00', type: 'RECEIVING', value: 'Livraison boissons', conforme: false, operator: 'Marie L.', notes: 'Cartons abîmés - retour partiel' },
  { id: '17', date: '08/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.0°C', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '18', date: '08/04/2026 22:00', type: 'CLEANING', value: 'Nettoyage complet', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '19', date: '07/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.2°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '20', date: '07/04/2026 10:00', type: 'RECEIVING', value: 'Livraison Metro', conforme: true, operator: 'Thomas R.', notes: '' },
]

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

export default function HistoriquePage() {
  const [filterType, setFilterType] = useState<string>('ALL')

  const filtered =
    filterType === 'ALL'
      ? mockEntries
      : mockEntries.filter((e) => e.type === filterType)

  const conformeCount = mockEntries.filter((e) => e.conforme).length
  const totalCount = mockEntries.length
  const tauxConformite = Math.round((conformeCount / totalCount) * 100)

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
              Historique HACCP
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Traçabilité et audit des contrôles
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
              background: '#B45309',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Exporter CSV
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
              <ShieldCheck size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: 13, color: '#475569' }}>
                Taux de conformité
              </span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              {tauxConformite}%
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <p
              style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}
            >
              Contrôles ce mois
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>
              124
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <p
              style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}
            >
              Non-conformités
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>
              {totalCount - conformeCount}
            </p>
          </div>
        </motion.div>

        {/* Filter */}
        <motion.div
          variants={fadeUp}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <Filter size={16} style={{ color: '#475569' }} />
          <span style={{ fontSize: 13, color: '#475569' }}>Filtrer :</span>
          {['ALL', 'FRIDGE_TEMP', 'CLEANING', 'RECEIVING'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: '5px 14px',
                borderRadius: 10,
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                background: filterType === t ? '#B45309' : '#f1f5f9',
                color: filterType === t ? '#fff' : '#475569',
                transition: 'all 0.2s',
              }}
            >
              {t === 'ALL' ? 'Tous' : typeLabels[t]}
            </button>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUp} style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Date', 'Type', 'Valeur', 'Conforme', 'Opérateur', 'Notes'].map(
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
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#475569',
                      }}
                    >
                      {entry.date}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          background: typeColors[entry.type].bg,
                          color: typeColors[entry.type].text,
                        }}
                      >
                        {typeLabels[entry.type]}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#1e293b',
                        fontWeight: 500,
                      }}
                    >
                      {entry.value}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 14 }}>
                      {entry.conforme ? '✅' : '❌'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#475569',
                      }}
                    >
                      {entry.operator}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#475569',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
