import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ValueRange {
  min: number
  max: number
  unit: string
}

interface HACCPTask {
  id: string
  label: string
  description: string
  checked: boolean
  requiresPhoto: boolean
  requiresValue: boolean
  valueRange?: ValueRange
  value?: string
  photoUrl?: string
  completedAt?: string
  operator?: string
  conforme?: boolean | null
}

interface TimeBlock {
  id: string
  title: string
  time: string
  icon: string
  color: string
  tasks: HACCPTask[]
}

interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  message: string
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const OPERATOR = 'Marie D.'

const buildInitialBlocks = (): TimeBlock[] => [
  {
    id: 'ouverture',
    title: 'Ouverture',
    time: '06:00',
    icon: '\u2600\uFE0F',
    color: '#f59e0b',
    tasks: [
      {
        id: 'o1', label: 'V\u00e9rifier temp\u00e9ratures frigos',
        description: 'Relev\u00e9 des temp\u00e9ratures de tous les r\u00e9frig\u00e9rateurs. Plage conforme : 0 \u00e0 8\u00b0C.',
        checked: true, requiresPhoto: false, requiresValue: true,
        valueRange: { min: 0, max: 8, unit: '\u00b0C' },
        value: '4.2', completedAt: '06:12', operator: OPERATOR, conforme: true,
      },
      {
        id: 'o2', label: 'V\u00e9rifier temp\u00e9rature cong\u00e9lateur',
        description: 'Relev\u00e9 cong\u00e9lateur. Plage conforme : -25 \u00e0 -15\u00b0C.',
        checked: true, requiresPhoto: false, requiresValue: true,
        valueRange: { min: -25, max: -15, unit: '\u00b0C' },
        value: '-18.5', completedAt: '06:14', operator: OPERATOR, conforme: true,
      },
      {
        id: 'o3', label: 'Contr\u00f4le DLC produits',
        description: 'V\u00e9rifier les dates limites de consommation de tous les produits en stock.',
        checked: false, requiresPhoto: false, requiresValue: false,
        conforme: null,
      },
      {
        id: 'o4', label: 'Nettoyage plan de travail',
        description: 'Nettoyer et d\u00e9sinfecter toutes les surfaces de travail. Photo obligatoire.',
        checked: true, requiresPhoto: true, requiresValue: false,
        photoUrl: '/mock/nettoyage-plan.jpg', completedAt: '06:22', operator: OPERATOR, conforme: true,
      },
      {
        id: 'o5', label: 'Lavage des mains',
        description: 'Tous les op\u00e9rateurs doivent se laver les mains avant de commencer.',
        checked: true, requiresPhoto: false, requiresValue: false,
        completedAt: '06:25', operator: OPERATOR, conforme: true,
      },
    ],
  },
  {
    id: 'midi',
    title: 'Midi',
    time: '12:00',
    icon: '\u2614',
    color: '#3b82f6',
    tasks: [
      {
        id: 'm1', label: 'Re-contr\u00f4le temp\u00e9ratures',
        description: 'Deuxi\u00e8me relev\u00e9 de la journ\u00e9e. Plage conforme : 0 \u00e0 8\u00b0C.',
        checked: true, requiresPhoto: false, requiresValue: true,
        valueRange: { min: 0, max: 8, unit: '\u00b0C' },
        value: '9.2', completedAt: '12:05', operator: OPERATOR, conforme: false,
      },
      {
        id: 'm2', label: 'V\u00e9rification plats chauds >63\u00b0C',
        description: 'Les plats chauds doivent \u00eatre maintenus au-dessus de 63\u00b0C.',
        checked: false, requiresPhoto: false, requiresValue: true,
        valueRange: { min: 63, max: 100, unit: '\u00b0C' },
        conforme: null,
      },
      {
        id: 'm3', label: 'Nettoyage poste de travail',
        description: 'Nettoyage mi-journ\u00e9e des postes. Photo obligatoire.',
        checked: false, requiresPhoto: true, requiresValue: false,
        conforme: null,
      },
      {
        id: 'm4', label: 'V\u00e9rification huile de friture',
        description: 'Contr\u00f4ler la qualit\u00e9 et la temp\u00e9rature de l\u2019huile de friture.',
        checked: false, requiresPhoto: false, requiresValue: false,
        conforme: null,
      },
    ],
  },
  {
    id: 'fermeture',
    title: 'Fermeture',
    time: '22:00',
    icon: '\uD83C\uDF19',
    color: '#8b5cf6',
    tasks: [
      {
        id: 'f1', label: 'Nettoyage complet cuisine',
        description: 'Nettoyage int\u00e9gral de la cuisine en fin de service. Photo obligatoire.',
        checked: false, requiresPhoto: true, requiresValue: false,
        conforme: null,
      },
      {
        id: 'f2', label: 'Sortie poubelles',
        description: '\u00c9vacuer toutes les poubelles et remplacer les sacs.',
        checked: false, requiresPhoto: false, requiresValue: false,
        conforme: null,
      },
      {
        id: 'f3', label: 'Contr\u00f4le DLC fin de journ\u00e9e',
        description: 'V\u00e9rification finale des DLC. Retirer les produits p\u00e9rim\u00e9s.',
        checked: false, requiresPhoto: false, requiresValue: false,
        conforme: null,
      },
      {
        id: 'f4', label: 'Temp\u00e9rature frigo fin de journ\u00e9e',
        description: 'Dernier relev\u00e9 de temp\u00e9rature. Plage conforme : 0 \u00e0 8\u00b0C.',
        checked: false, requiresPhoto: false, requiresValue: true,
        valueRange: { min: 0, max: 8, unit: '\u00b0C' },
        conforme: null,
      },
      {
        id: 'f5', label: 'Fermeture et s\u00e9curisation',
        description: 'V\u00e9rifier la fermeture de toutes les portes, fen\u00eatres et \u00e9quipements.',
        checked: false, requiresPhoto: false, requiresValue: false,
        conforme: null,
      },
    ],
  },
]

const initialAlerts: Alert[] = [
  { id: 'a1', type: 'danger', message: 'Frigo 2 hors norme (9.2\u00b0C)', timestamp: '12:05' },
  { id: 'a2', type: 'warning', message: 'T\u00e2che midi non compl\u00e9t\u00e9e', timestamp: '13:30' },
  { id: 'a3', type: 'info', message: 'Ouverture valid\u00e9e \u00e0 80%', timestamp: '07:00' },
  { id: 'a4', type: 'warning', message: 'Photo manquante \u2014 Nettoyage poste midi', timestamp: '13:45' },
  { id: 'a5', type: 'info', message: 'Cong\u00e9lateur conforme (-18.5\u00b0C)', timestamp: '06:14' },
]

/* ------------------------------------------------------------------ */
/*  Mock photo thumbnails                                              */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_PHOTOS = [
  { color: '#e0f2fe', label: 'Nettoyage plan' },
  { color: '#fef3c7', label: 'Surface d\u00e9sinfect\u00e9e' },
  { color: '#f0fdf4', label: 'Frigo propre' },
]

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  padding: 0,
  overflow: 'hidden',
}

const cardBody: React.CSSProperties = { padding: '20px 24px 24px' }

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ------------------------------------------------------------------ */
/*  SVG Progress Ring                                                  */
/* ------------------------------------------------------------------ */

function ProgressRing({ pct, size = 120, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: 26, fontWeight: 800, fill: '#1e293b' }}
      >
        {pct}%
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Animated Checkbox                                                  */
/* ------------------------------------------------------------------ */

function AnimatedCheck({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
        border: checked ? 'none' : '2px solid #cbd5e1',
        background: checked ? '#16a34a' : '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s, border 0.2s',
      }}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            width="14" height="14" viewBox="0 0 14 14" fill="none"
          >
            <motion.path
              d="M2 7.5L5.5 11L12 3"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Photo Upload Mock                                                  */
/* ------------------------------------------------------------------ */

function PhotoUploadArea({ photoUrl, onUpload }: { photoUrl?: string; onUpload: () => void }) {
  if (photoUrl) {
    return (
      <div style={{
        width: 72, height: 72, borderRadius: 10,
        background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
      }}>
        <span style={{ fontSize: 28 }}>{'\uD83D\uDCF7'}</span>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.5)', padding: '2px 4px',
          fontSize: 9, color: '#fff', textAlign: 'center',
        }}>
          Photo ajout\u00e9e
        </div>
      </div>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onUpload}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8,
        border: '1px dashed #94a3b8', background: '#f8fafc',
        color: '#64748b', fontSize: 12, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <span>{'\uD83D\uDCF7'}</span> Ajouter une photo
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Compliance Badge                                                   */
/* ------------------------------------------------------------------ */

function ComplianceBadge({ conforme }: { conforme: boolean | null | undefined }) {
  if (conforme === null || conforme === undefined) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: conforme ? '#f0fdf4' : '#fef2f2',
      color: conforme ? '#16a34a' : '#dc2626',
      border: `1px solid ${conforme ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {conforme ? '\u2705 Conforme' : '\u274C Non conforme'}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Value Input                                                        */
/* ------------------------------------------------------------------ */

function ValueInput({
  value, range, onChange, disabled,
}: {
  value: string; range: ValueRange; onChange: (v: string) => void; disabled: boolean
}) {
  const numVal = parseFloat(value)
  const isValid = !isNaN(numVal) && numVal >= range.min && numVal <= range.max
  const hasVal = value.length > 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${hasVal ? (isValid ? '#bbf7d0' : '#fecaca') : '#e2e8f0'}`,
        borderRadius: 10, overflow: 'hidden',
        background: disabled ? '#f8fafc' : '#fff',
        transition: 'border-color 0.2s',
      }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={`${range.min} \u00e0 ${range.max}`}
          style={{
            width: 90, padding: '6px 10px', border: 'none', outline: 'none',
            fontSize: 14, fontWeight: 600, color: '#1e293b',
            background: 'transparent', fontFamily: 'inherit',
          }}
        />
        <span style={{
          padding: '6px 10px', background: '#f1f5f9',
          fontSize: 12, color: '#64748b', fontWeight: 600,
          borderLeft: '1px solid #e2e8f0',
        }}>
          {range.unit}
        </span>
      </div>
      {hasVal && (
        <span style={{ fontSize: 11, color: isValid ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
          {isValid ? `${range.min}\u2013${range.max} ${range.unit}` : 'Hors plage !'}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Alert Card                                                         */
/* ------------------------------------------------------------------ */

function AlertCard({ alert }: { alert: Alert }) {
  const cfg = {
    danger: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', icon: '\u26A0\uFE0F' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#d97706', icon: '\uD83D\uDD14' },
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', icon: '\u2139\uFE0F' },
  }[alert.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        padding: '10px 14px', borderRadius: 10,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: cfg.color, margin: 0 }}>
          {alert.message}
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
          {alert.timestamp}
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function JourneePage() {
  const [blocks, setBlocks] = useState<TimeBlock[]>(buildInitialBlocks)
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({
    ouverture: true, midi: true, fermeture: false,
  })
  const [alerts] = useState<Alert[]>(initialAlerts)
  const [validated, setValidated] = useState(false)
  const [mockPhotos, setMockPhotos] = useState<Array<{ label: string; time: string; color: string }>>(
    [{ label: 'Nettoyage plan de travail', time: '06:22', color: '#dbeafe' }]
  )

  /* Computed */
  const totalTasks = useMemo(() => blocks.reduce((s, b) => s + b.tasks.length, 0), [blocks])
  const doneTasks = useMemo(() => blocks.reduce((s, b) => s + b.tasks.filter(t => t.checked).length, 0), [blocks])
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const statusLabel = validated ? 'Valid\u00e9' : pct === 0 ? 'Non commenc\u00e9' : 'En cours'
  const statusColor = validated ? '#16a34a' : pct === 0 ? '#ef4444' : '#f59e0b'
  const statusBg = validated ? '#f0fdf4' : pct === 0 ? '#fef2f2' : '#fffbeb'

  const now = new Date()
  const closingHour = 22
  const hoursLeft = Math.max(0, closingHour - now.getHours())

  /* Actions */
  const toggleBlock = useCallback((blockId: string) => {
    setExpandedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }))
  }, [])

  const toggleTask = useCallback((blockId: string, taskId: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return {
        ...block,
        tasks: block.tasks.map(t => {
          if (t.id !== taskId) return t
          const newChecked = !t.checked
          let conforme = t.conforme
          if (newChecked && t.requiresValue && t.valueRange && t.value) {
            const v = parseFloat(t.value)
            conforme = !isNaN(v) && v >= t.valueRange.min && v <= t.valueRange.max
          } else if (newChecked && !t.requiresValue) {
            conforme = true
          } else if (!newChecked) {
            conforme = null
          }
          return {
            ...t,
            checked: newChecked,
            conforme,
            completedAt: newChecked ? format(new Date(), 'HH:mm') : undefined,
            operator: newChecked ? OPERATOR : undefined,
          }
        }),
      }
    }))
  }, [])

  const updateValue = useCallback((blockId: string, taskId: string, val: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return {
        ...block,
        tasks: block.tasks.map(t => {
          if (t.id !== taskId) return t
          let conforme = t.conforme
          if (t.checked && t.valueRange) {
            const v = parseFloat(val)
            conforme = !isNaN(v) && v >= t.valueRange.min && v <= t.valueRange.max
          }
          return { ...t, value: val, conforme }
        }),
      }
    }))
  }, [])

  const mockUploadPhoto = useCallback((blockId: string, taskId: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block
      return {
        ...block,
        tasks: block.tasks.map(t =>
          t.id === taskId ? { ...t, photoUrl: '/mock/uploaded.jpg' } : t
        ),
      }
    }))
    const task = blocks.flatMap(b => b.tasks).find(t => t.id === taskId)
    if (task) {
      setMockPhotos(prev => [...prev, {
        label: task.label,
        time: format(new Date(), 'HH:mm'),
        color: ['#dbeafe', '#fef3c7', '#f0fdf4', '#fce7f3', '#e0e7ff'][prev.length % 5],
      }])
    }
  }, [blocks])

  const nonConformeTasks = useMemo(
    () => blocks.flatMap(b => b.tasks).filter(t => t.conforme === false),
    [blocks]
  )

  /* Date display */
  const dateStr = format(now, "EEEE d MMMM yyyy", { locale: fr })
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ======== HEADER ======== */}
        <motion.div variants={fadeUp} style={{
          ...card,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          border: 'none', color: '#fff',
        }}>
          <div style={{ padding: '28px 28px 24px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

            {/* Progress Ring */}
            <div style={{ flexShrink: 0 }}>
              <ProgressRing pct={pct} size={110} stroke={9} />
            </div>

            {/* Text info */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                Journ\u00e9e HACCP
              </h1>
              <p style={{ fontSize: 16, margin: '4px 0 0', opacity: 0.85, fontWeight: 500 }}>
                {capitalizedDate}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {/* Status badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 14px', borderRadius: 20,
                  background: statusBg, color: statusColor,
                  fontSize: 13, fontWeight: 700,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusColor,
                    boxShadow: `0 0 6px ${statusColor}`,
                  }} />
                  {statusLabel}
                </span>

                {/* Time remaining */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.12)',
                  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
                }}>
                  {'\u23F0'} Fermeture dans {hoursLeft}h
                </span>

                {/* Task counter */}
                <span style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.12)',
                  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
                }}>
                  {doneTasks}/{totalTasks} t\u00e2ches
                </span>
              </div>
            </div>

            {/* Validate button */}
            <motion.button
              whileHover={pct === 100 && !validated ? { scale: 1.03 } : {}}
              whileTap={pct === 100 && !validated ? { scale: 0.97 } : {}}
              disabled={pct < 100 || validated}
              onClick={() => setValidated(true)}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none',
                fontSize: 14, fontWeight: 700, cursor: pct === 100 && !validated ? 'pointer' : 'not-allowed',
                color: '#fff', fontFamily: 'inherit',
                background: validated
                  ? '#16a34a'
                  : pct === 100
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'rgba(255,255,255,0.15)',
                opacity: pct < 100 && !validated ? 0.5 : 1,
                transition: 'opacity 0.2s, background 0.3s',
              }}
            >
              {validated ? '\u2705 Journ\u00e9e valid\u00e9e' : 'Valider la journ\u00e9e'}
            </motion.button>
          </div>
        </motion.div>

        {/* ======== MAIN CONTENT GRID ======== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Time blocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {blocks.map((block) => {
              const blockDone = block.tasks.filter(t => t.checked).length
              const blockTotal = block.tasks.length
              const blockPct = blockTotal > 0 ? Math.round((blockDone / blockTotal) * 100) : 0
              const isExpanded = expandedBlocks[block.id] ?? false

              return (
                <motion.div key={block.id} variants={fadeUp} style={card}>
                  {/* Block Header */}
                  <div
                    onClick={() => toggleBlock(block.id)}
                    style={{
                      padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', userSelect: 'none',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      transition: 'border-bottom 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{block.icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                        {block.title}
                      </span>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: '#64748b',
                        background: '#f1f5f9', padding: '2px 10px', borderRadius: 8,
                      }}>
                        {block.time}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Completion badge */}
                      <span style={{
                        padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: blockPct === 100 ? '#f0fdf4' : '#f8fafc',
                        color: blockPct === 100 ? '#16a34a' : '#64748b',
                        border: `1px solid ${blockPct === 100 ? '#bbf7d0' : '#e2e8f0'}`,
                      }}>
                        {blockDone}/{blockTotal} t\u00e2ches
                      </span>

                      {/* Chevron */}
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1 }}
                      >
                        {'\u25BC'}
                      </motion.span>
                    </div>
                  </div>

                  {/* Block Tasks */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ ...cardBody, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {block.tasks.map((task) => (
                            <motion.div
                              key={task.id}
                              layout
                              style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: task.checked
                                  ? (task.conforme === false ? '#fef2f2' : '#f0fdf4')
                                  : '#fafbfc',
                                border: `1px solid ${task.checked
                                  ? (task.conforme === false ? '#fecaca' : '#bbf7d0')
                                  : '#f1f5f9'}`,
                                transition: 'background 0.25s, border 0.25s',
                                marginBottom: 6,
                              }}
                            >
                              {/* Task top row */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ paddingTop: 1 }}>
                                  <AnimatedCheck
                                    checked={task.checked}
                                    onClick={() => toggleTask(block.id, task.id)}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{
                                      fontSize: 14, fontWeight: 600,
                                      color: task.checked ? (task.conforme === false ? '#dc2626' : '#16a34a') : '#1e293b',
                                      textDecoration: task.checked && task.conforme !== false ? 'line-through' : 'none',
                                      textDecorationColor: '#94a3b8',
                                    }}>
                                      {task.label}
                                    </span>
                                    <ComplianceBadge conforme={task.conforme} />
                                  </div>
                                  <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }}>
                                    {task.description}
                                  </p>

                                  {/* Value input row */}
                                  {task.requiresValue && task.valueRange && (
                                    <div style={{ marginTop: 10 }}>
                                      <ValueInput
                                        value={task.value || ''}
                                        range={task.valueRange}
                                        onChange={(v) => updateValue(block.id, task.id, v)}
                                        disabled={false}
                                      />
                                    </div>
                                  )}

                                  {/* Photo row */}
                                  {task.requiresPhoto && (
                                    <div style={{ marginTop: 10 }}>
                                      <PhotoUploadArea
                                        photoUrl={task.photoUrl}
                                        onUpload={() => mockUploadPhoto(block.id, task.id)}
                                      />
                                    </div>
                                  )}

                                  {/* Completed info */}
                                  {task.checked && task.completedAt && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 12,
                                      marginTop: 8, fontSize: 11, color: '#94a3b8',
                                    }}>
                                      <span>{'\u23F0'} {task.completedAt}</span>
                                      {task.operator && <span>{'\uD83D\uDC64'} {task.operator}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}

                          {/* Block mini progress */}
                          <div style={{
                            marginTop: 8, height: 5, borderRadius: 3,
                            background: '#f1f5f9', overflow: 'hidden',
                          }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${blockPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              style={{
                                height: '100%', borderRadius: 3,
                                background: blockPct === 100
                                  ? '#16a34a'
                                  : `linear-gradient(90deg, ${block.color}, ${block.color}dd)`,
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* RIGHT: Alerts + Photos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Non-conforme summary */}
            {nonConformeTasks.length > 0 && (
              <motion.div variants={fadeUp} style={{
                ...card,
                background: '#fef2f2', border: '1px solid #fecaca',
              }}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>{'\uD83D\uDEA8'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                      Non-conformit\u00e9s ({nonConformeTasks.length})
                    </span>
                  </div>
                  {nonConformeTasks.map(t => (
                    <div key={t.id} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: '#fff', border: '1px solid #fecaca',
                      marginBottom: 6, fontSize: 13, color: '#dc2626', fontWeight: 600,
                    }}>
                      {t.label}: {t.value}{t.valueRange?.unit}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Alert Panel */}
            <motion.div variants={fadeUp} style={card}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{'\uD83D\uDD14'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    Alertes du jour
                  </span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: '#fef2f2', color: '#dc2626',
                  }}>
                    {alerts.filter(a => a.type === 'danger').length}
                  </span>
                </div>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
              <div style={{ padding: '0 20px 16px' }}>
                <button style={{
                  width: '100%', padding: '8px 0', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  color: '#64748b', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {'\u2699\uFE0F'} Configurer les alertes
                </button>
              </div>
            </motion.div>

            {/* Photo Evidence */}
            <motion.div variants={fadeUp} style={card}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{'\uD83D\uDCF7'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    Preuves photos
                  </span>
                </div>
                <span style={{
                  padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: '#eff6ff', color: '#3b82f6',
                }}>
                  {mockPhotos.length} photo{mockPhotos.length > 1 ? 's' : ''} aujourd'hui
                </span>
              </div>
              <div style={{
                padding: '16px 20px',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              }}>
                {mockPhotos.map((photo, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      aspectRatio: '1', borderRadius: 10,
                      background: `linear-gradient(135deg, ${photo.color}, ${photo.color}99)`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 4 }}>{'\uD83D\uDCF7'}</span>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(0,0,0,0.55)', padding: '4px 6px',
                    }}>
                      <p style={{ fontSize: 9, color: '#fff', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>
                        {photo.label}
                      </p>
                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                        {photo.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {/* Placeholder slots */}
                {PLACEHOLDER_PHOTOS.slice(mockPhotos.length).map((ph, i) => (
                  <div
                    key={`ph-${i}`}
                    style={{
                      aspectRatio: '1', borderRadius: 10,
                      border: '2px dashed #e2e8f0', background: '#fafbfc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 20, color: '#cbd5e1' }}>+</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ======== BOTTOM VALIDATE SECTION ======== */}
        <motion.div variants={fadeUp} style={{
          ...card, background: validated ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${validated ? '#bbf7d0' : '#e2e8f0'}`,
          textAlign: 'center' as const,
        }}>
          <div style={{ padding: '24px 28px' }}>
            {validated ? (
              <>
                <span style={{ fontSize: 40 }}>{'\u2705'}</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', margin: '8px 0 4px' }}>
                  Journ\u00e9e valid\u00e9e avec succ\u00e8s
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Valid\u00e9e par {OPERATOR} le {capitalizedDate} \u00e0 {format(now, 'HH:mm')}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px', fontWeight: 500 }}>
                  {pct < 100
                    ? `Compl\u00e9tez toutes les t\u00e2ches pour valider la journ\u00e9e (${doneTasks}/${totalTasks})`
                    : 'Toutes les t\u00e2ches sont compl\u00e9t\u00e9es. Vous pouvez valider la journ\u00e9e.'
                  }
                </p>
                <div style={{
                  height: 6, borderRadius: 3, background: '#e2e8f0',
                  overflow: 'hidden', maxWidth: 400, margin: '0 auto',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%', borderRadius: 3,
                      background: pct === 100
                        ? 'linear-gradient(90deg, #16a34a, #15803d)'
                        : 'linear-gradient(90deg, #f59e0b, #d97706)',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
