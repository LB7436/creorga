import { useState } from 'react'
import { motion } from 'framer-motion'
import { Thermometer, Plus, AlertTriangle } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface TempEquipment {
  id: string
  name: string
  currentTemp: number
  unit: string
  min: number
  max: number
  history: { day: string; value: number }[]
}

interface TempLog {
  id: string
  date: string
  equipment: string
  value: number
  conforme: boolean
  operator: string
}

const equipments: TempEquipment[] = [
  {
    id: 'f1',
    name: 'Frigo 1',
    currentTemp: 4.2,
    unit: '°C',
    min: 0,
    max: 8,
    history: [
      { day: 'Lun', value: 4.1 },
      { day: 'Mar', value: 4.3 },
      { day: 'Mer', value: 3.9 },
      { day: 'Jeu', value: 4.2 },
      { day: 'Ven', value: 4.0 },
      { day: 'Sam', value: 4.4 },
      { day: 'Dim', value: 4.2 },
    ],
  },
  {
    id: 'f2',
    name: 'Frigo 2',
    currentTemp: 3.8,
    unit: '°C',
    min: 0,
    max: 8,
    history: [
      { day: 'Lun', value: 3.5 },
      { day: 'Mar', value: 3.7 },
      { day: 'Mer', value: 4.0 },
      { day: 'Jeu', value: 3.8 },
      { day: 'Ven', value: 3.6 },
      { day: 'Sam', value: 3.9 },
      { day: 'Dim', value: 3.8 },
    ],
  },
  {
    id: 'c1',
    name: 'Congélateur',
    currentTemp: -18.5,
    unit: '°C',
    min: -25,
    max: -15,
    history: [
      { day: 'Lun', value: -18.2 },
      { day: 'Mar', value: -18.6 },
      { day: 'Mer', value: -18.1 },
      { day: 'Jeu', value: -18.5 },
      { day: 'Ven', value: -18.3 },
      { day: 'Sam', value: -18.7 },
      { day: 'Dim', value: -18.5 },
    ],
  },
]

const mockLogs: TempLog[] = [
  { id: '1', date: '14/04/2026 08:00', equipment: 'Frigo 1', value: 4.2, conforme: true, operator: 'Marie L.' },
  { id: '2', date: '14/04/2026 08:05', equipment: 'Frigo 2', value: 3.8, conforme: true, operator: 'Marie L.' },
  { id: '3', date: '14/04/2026 08:10', equipment: 'Congélateur', value: -18.5, conforme: true, operator: 'Marie L.' },
  { id: '4', date: '13/04/2026 08:00', equipment: 'Frigo 1', value: 4.4, conforme: true, operator: 'Thomas R.' },
  { id: '5', date: '13/04/2026 08:05', equipment: 'Frigo 2', value: 3.9, conforme: true, operator: 'Thomas R.' },
  { id: '6', date: '13/04/2026 08:10', equipment: 'Congélateur', value: -18.7, conforme: true, operator: 'Thomas R.' },
  { id: '7', date: '12/04/2026 08:00', equipment: 'Frigo 1', value: 4.0, conforme: true, operator: 'Marie L.' },
  { id: '8', date: '12/04/2026 08:05', equipment: 'Frigo 2', value: 9.1, conforme: false, operator: 'Marie L.' },
  { id: '9', date: '12/04/2026 08:10', equipment: 'Congélateur', value: -18.1, conforme: true, operator: 'Marie L.' },
  { id: '10', date: '11/04/2026 08:00', equipment: 'Frigo 1', value: 4.1, conforme: true, operator: 'Lucas D.' },
  { id: '11', date: '11/04/2026 08:05', equipment: 'Frigo 2', value: 3.7, conforme: true, operator: 'Lucas D.' },
  { id: '12', date: '11/04/2026 08:10', equipment: 'Congélateur', value: -18.3, conforme: true, operator: 'Lucas D.' },
  { id: '13', date: '10/04/2026 08:00', equipment: 'Frigo 1', value: 4.3, conforme: true, operator: 'Thomas R.' },
  { id: '14', date: '10/04/2026 08:05', equipment: 'Frigo 2', value: 3.6, conforme: true, operator: 'Thomas R.' },
  { id: '15', date: '10/04/2026 08:10', equipment: 'Congélateur', value: -18.6, conforme: true, operator: 'Thomas R.' },
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

export default function TemperaturesPage() {
  const [showForm, setShowForm] = useState(false)

  const isConform = (eq: TempEquipment) =>
    eq.currentTemp >= eq.min && eq.currentTemp <= eq.max

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
              Températures
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Suivi et enregistrement des relevés
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
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
            <Plus size={16} />
            Enregistrer une température
          </button>
        </motion.div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={card}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: 16,
              }}
            >
              Nouveau relevé
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#475569',
                    marginBottom: 4,
                  }}
                >
                  Équipement
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    color: '#1e293b',
                    background: '#fff',
                  }}
                >
                  {equipments.map((eq) => (
                    <option key={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#475569',
                    marginBottom: 4,
                  }}
                >
                  Température (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="ex: 4.2"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '9px 0',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#16a34a',
                    cursor: 'pointer',
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Equipment cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {equipments.map((eq) => {
            const conform = isConform(eq)
            return (
              <motion.div key={eq.id} variants={fadeUp} style={card}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Thermometer
                      size={18}
                      style={{ color: conform ? '#16a34a' : '#dc2626' }}
                    />
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      {eq.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 13 }}>
                    {conform ? '✅' : '❌'}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: conform ? '#1e293b' : '#dc2626',
                    marginBottom: 4,
                  }}
                >
                  {eq.currentTemp}°C
                </p>
                <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  Plage : {eq.min}°C à {eq.max}°C
                </p>
                {!conform && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: '#fef2f2',
                      marginBottom: 12,
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                    <span
                      style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}
                    >
                      Hors plage !
                    </span>
                  </div>
                )}
                <div style={{ height: 50 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eq.history}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={conform ? '#16a34a' : '#dc2626'}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: '#475569',
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  7 derniers jours
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Log table */}
        <motion.div variants={fadeUp} style={card}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 16,
            }}
          >
            Historique des relevés
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  {['Date', 'Équipement', 'Valeur', 'Conforme', 'Opérateur'].map(
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
                {mockLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#475569',
                      }}
                    >
                      {log.date}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#1e293b',
                        fontWeight: 500,
                      }}
                    >
                      {log.equipment}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: log.conforme ? '#1e293b' : '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      {log.value}°C
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {log.conforme ? '✅' : '❌'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#475569',
                      }}
                    >
                      {log.operator}
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
