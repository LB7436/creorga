import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CheckCircle2, Circle, Clock, Shield } from 'lucide-react'

interface Task {
  id: string
  label: string
  checked: boolean
}

interface ChecklistBlock {
  id: string
  title: string
  time: string
  tasks: Task[]
}

const initialChecklists: ChecklistBlock[] = [
  {
    id: 'ouverture',
    title: 'Ouverture',
    time: '06:00',
    tasks: [
      { id: 'o1', label: 'Vérifier températures frigo', checked: true },
      { id: 'o2', label: 'Nettoyer plan de travail', checked: true },
      { id: 'o3', label: 'Contrôle DLC produits', checked: false },
      { id: 'o4', label: 'Lavage des mains', checked: true },
      { id: 'o5', label: 'Vérifier propreté des sols', checked: false },
    ],
  },
  {
    id: 'midi',
    title: 'Midi',
    time: '12:00',
    tasks: [
      { id: 'm1', label: 'Relevé températures vitrines', checked: true },
      { id: 'm2', label: 'Contrôle chaîne du froid', checked: false },
      { id: 'm3', label: 'Nettoyage poste de travail', checked: false },
      { id: 'm4', label: 'Vérification huiles de friture', checked: false },
    ],
  },
  {
    id: 'fermeture',
    title: 'Fermeture',
    time: '22:00',
    tasks: [
      { id: 'f1', label: 'Nettoyage complet cuisine', checked: false },
      { id: 'f2', label: 'Relevé final températures', checked: false },
      { id: 'f3', label: 'Sortie poubelles', checked: false },
      { id: 'f4', label: 'Désinfection surfaces', checked: false },
      { id: 'f5', label: 'Fermeture chambres froides', checked: false },
    ],
  },
]

const card = {
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

export default function JourneePage() {
  const [checklists, setChecklists] = useState(initialChecklists)

  const toggleTask = (blockId: string, taskId: string) => {
    setChecklists((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              tasks: block.tasks.map((t) =>
                t.id === taskId ? { ...t, checked: !t.checked } : t
              ),
            }
          : block
      )
    )
  }

  const totalTasks = checklists.reduce((s, b) => s + b.tasks.length, 0)
  const doneTasks = checklists.reduce(
    (s, b) => s + b.tasks.filter((t) => t.checked).length,
    0
  )
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 4,
            }}
          >
            Journée HACCP
          </h1>
          <p style={{ fontSize: 14, color: '#475569' }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </motion.div>

        {/* Progress card */}
        <motion.div variants={fadeUp} style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} style={{ color: '#B45309' }} />
              <span
                style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}
              >
                Progression du jour
              </span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#B45309' }}>
              {pct}%
            </span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 5,
              background: '#f1f5f9',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                height: '100%',
                borderRadius: 5,
                background: 'linear-gradient(90deg, #B45309, #d97706)',
              }}
            />
          </div>
          <p
            style={{
              fontSize: 13,
              color: '#475569',
              marginTop: 8,
            }}
          >
            {doneTasks} sur {totalTasks} tâches complétées
          </p>
        </motion.div>

        {/* Checklist blocks */}
        {checklists.map((block) => {
          const blockDone = block.tasks.filter((t) => t.checked).length
          const blockTotal = block.tasks.length
          const blockPct =
            blockTotal > 0 ? Math.round((blockDone / blockTotal) * 100) : 0
          return (
            <motion.div key={block.id} variants={fadeUp} style={card}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <Clock size={16} style={{ color: '#475569' }} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  >
                    {block.title}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#475569',
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: 8,
                    }}
                  >
                    {block.time}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: blockPct === 100 ? '#16a34a' : '#B45309',
                  }}
                >
                  {blockDone}/{blockTotal}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {block.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(block.id, task.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: task.checked
                        ? 'rgba(22,163,74,0.06)'
                        : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {task.checked ? (
                      <CheckCircle2
                        size={18}
                        style={{ color: '#16a34a', flexShrink: 0 }}
                      />
                    ) : (
                      <Circle
                        size={18}
                        style={{ color: '#cbd5e1', flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        color: task.checked ? '#64748b' : '#1e293b',
                        textDecoration: task.checked
                          ? 'line-through'
                          : 'none',
                      }}
                    >
                      {task.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mini progress */}
              <div
                style={{
                  marginTop: 14,
                  height: 4,
                  borderRadius: 2,
                  background: '#f1f5f9',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${blockPct}%`,
                    borderRadius: 2,
                    background:
                      blockPct === 100
                        ? '#16a34a'
                        : 'linear-gradient(90deg, #B45309, #d97706)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </motion.div>
          )
        })}

        {/* Validate button */}
        <motion.div variants={fadeUp}>
          <button
            disabled={pct < 100}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background:
                pct === 100
                  ? 'linear-gradient(135deg, #16a34a, #15803d)'
                  : '#cbd5e1',
              cursor: pct === 100 ? 'pointer' : 'not-allowed',
              transition: 'background 0.3s',
            }}
          >
            {pct === 100
              ? 'Valider la journée'
              : `Complétez toutes les tâches (${pct}%)`}
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
