import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ListChecks } from 'lucide-react'

interface HaccpTask {
  id: string
  name: string
  category: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  moment: 'MORNING' | 'MIDDAY' | 'CLOSING'
  active: boolean
}

const initialTasks: HaccpTask[] = [
  { id: '1', name: 'Nettoyage plan de travail', category: 'Nettoyage', frequency: 'DAILY', moment: 'MORNING', active: true },
  { id: '2', name: 'Relevé températures frigos', category: 'Température', frequency: 'DAILY', moment: 'MORNING', active: true },
  { id: '3', name: 'Contrôle réception marchandises', category: 'Réception', frequency: 'DAILY', moment: 'MIDDAY', active: true },
  { id: '4', name: 'Désinfection surfaces cuisine', category: 'Nettoyage', frequency: 'DAILY', moment: 'CLOSING', active: true },
  { id: '5', name: 'Nettoyage hotte aspirante', category: 'Nettoyage', frequency: 'WEEKLY', moment: 'CLOSING', active: true },
  { id: '6', name: 'Vérification pièges nuisibles', category: 'Pest Control', frequency: 'MONTHLY', moment: 'MORNING', active: true },
  { id: '7', name: 'Calibration thermomètres', category: 'Température', frequency: 'MONTHLY', moment: 'MORNING', active: false },
  { id: '8', name: 'Inventaire produits chimiques', category: 'Nettoyage', frequency: 'WEEKLY', moment: 'MIDDAY', active: true },
]

const freqColors: Record<string, { bg: string; text: string }> = {
  DAILY: { bg: '#dbeafe', text: '#1d4ed8' },
  WEEKLY: { bg: '#fef3c7', text: '#92400e' },
  MONTHLY: { bg: '#ede9fe', text: '#6d28d9' },
}

const freqLabels: Record<string, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdo',
  MONTHLY: 'Mensuel',
}

const momentLabels: Record<string, string> = {
  MORNING: 'Matin',
  MIDDAY: 'Midi',
  CLOSING: 'Fermeture',
}

const momentColors: Record<string, { bg: string; text: string }> = {
  MORNING: { bg: '#fef9c3', text: '#854d0e' },
  MIDDAY: { bg: '#fed7aa', text: '#9a3412' },
  CLOSING: { bg: '#e0e7ff', text: '#3730a3' },
}

const categoryColors: Record<string, string> = {
  Nettoyage: '#059669',
  Température: '#0284c7',
  Réception: '#d97706',
  'Pest Control': '#7c3aed',
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

export default function TachesPage() {
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)

  const toggleActive = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    )
  }

  const categories = [...new Set(tasks.map((t) => t.category))]

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
              Tâches HACCP
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Gestion des tâches récurrentes
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
            Ajouter une tâche
          </button>
        </motion.div>

        {/* Category summary */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
            gap: 12,
          }}
        >
          {categories.map((cat) => {
            const count = tasks.filter(
              (t) => t.category === cat && t.active
            ).length
            return (
              <div
                key={cat}
                style={{
                  ...card,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: categoryColors[cat] || '#64748b',
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#475569',
                      marginBottom: 2,
                    }}
                  >
                    {cat}
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#1e293b',
                    }}
                  >
                    {count}
                  </p>
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* Add form */}
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
                marginBottom: 14,
              }}
            >
              Nouvelle tâche
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: 10,
                alignItems: 'end',
              }}
            >
              {[
                { label: 'Nom de la tâche', type: 'text', placeholder: 'ex: Nettoyage hotte' },
              ].map((f) => (
                <div key={f.label}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
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
              ))}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#475569',
                    marginBottom: 4,
                  }}
                >
                  Catégorie
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
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
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
                  Fréquence
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
                  <option value="DAILY">Quotidien</option>
                  <option value="WEEKLY">Hebdo</option>
                  <option value="MONTHLY">Mensuel</option>
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
                  Moment
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
                  <option value="MORNING">Matin</option>
                  <option value="MIDDAY">Midi</option>
                  <option value="CLOSING">Fermeture</option>
                </select>
              </div>
              <button
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  background: '#16a34a',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Ajouter
              </button>
            </div>
          </motion.div>
        )}

        {/* Tasks table */}
        <motion.div variants={fadeUp} style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <ListChecks size={18} style={{ color: '#B45309' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Toutes les tâches ({tasks.length})
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {[
                    'Tâche',
                    'Catégorie',
                    'Fréquence',
                    'Moment',
                    'Active',
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
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      opacity: task.active ? 1 : 0.5,
                    }}
                  >
                    <td
                      style={{
                        padding: '12px',
                        fontSize: 14,
                        color: '#1e293b',
                        fontWeight: 500,
                      }}
                    >
                      {task.name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          color: categoryColors[task.category] || '#64748b',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            background:
                              categoryColors[task.category] || '#64748b',
                          }}
                        />
                        {task.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          background: freqColors[task.frequency].bg,
                          color: freqColors[task.frequency].text,
                        }}
                      >
                        {freqLabels[task.frequency]}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          background: momentColors[task.moment].bg,
                          color: momentColors[task.moment].text,
                        }}
                      >
                        {momentLabels[task.moment]}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => toggleActive(task.id)}
                        style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          border: 'none',
                          cursor: 'pointer',
                          background: task.active ? '#16a34a' : '#cbd5e1',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 3,
                            left: task.active ? 21 : 3,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            background: '#fff',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        />
                      </button>
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
