import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isWithinInterval,
  addMonths, subMonths, isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, X, ChevronLeft, ChevronRight, Check, XCircle,
  Calendar, Umbrella, Thermometer, HelpCircle, Clock,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
type LeaveType = 'Vacances' | 'Maladie' | 'Autre'
type LeaveStatus = 'En attente' | 'Approuvé' | 'Refusé'

interface LeaveRequest {
  id: string
  employeeName: string
  type: LeaveType
  startDate: Date
  endDate: Date
  status: LeaveStatus
  notes: string
}

interface LeaveBalance {
  employeeName: string
  total: number
  used: number
  pending: number
}

// ── Constants ──────────────────────────────────────────────────────────
const TYPE_COLORS: Record<LeaveType, string> = {
  Vacances: '#6366f1',
  Maladie: '#f97316',
  Autre: '#94a3b8',
}

const TYPE_BG: Record<LeaveType, string> = {
  Vacances: 'rgba(99,102,241,0.15)',
  Maladie: 'rgba(249,115,22,0.15)',
  Autre: 'rgba(148,163,184,0.15)',
}

const TYPE_ICONS: Record<LeaveType, typeof Umbrella> = {
  Vacances: Umbrella,
  Maladie: Thermometer,
  Autre: HelpCircle,
}

const STATUS_COLORS: Record<LeaveStatus, string> = {
  'En attente': '#eab308',
  'Approuvé': '#10b981',
  'Refusé': '#ef4444',
}

const STATUS_BG: Record<LeaveStatus, string> = {
  'En attente': 'rgba(234,179,8,0.12)',
  'Approuvé': 'rgba(16,185,129,0.12)',
  'Refusé': 'rgba(239,68,68,0.12)',
}

const MOCK_LEAVES: LeaveRequest[] = [
  { id: 'l1', employeeName: 'Marie Dupont', type: 'Vacances', startDate: new Date(2026, 3, 20), endDate: new Date(2026, 3, 24), status: 'Approuvé', notes: 'Vacances de Pâques' },
  { id: 'l2', employeeName: 'Jean Muller', type: 'Maladie', startDate: new Date(2026, 3, 14), endDate: new Date(2026, 3, 15), status: 'Approuvé', notes: 'Certificat médical fourni' },
  { id: 'l3', employeeName: 'Sophie Klein', type: 'Vacances', startDate: new Date(2026, 4, 4), endDate: new Date(2026, 4, 8), status: 'En attente', notes: 'Voyage famille' },
  { id: 'l4', employeeName: 'Luc Weber', type: 'Autre', startDate: new Date(2026, 3, 28), endDate: new Date(2026, 3, 28), status: 'En attente', notes: 'Rendez-vous administratif' },
  { id: 'l5', employeeName: 'Anna Schmit', type: 'Vacances', startDate: new Date(2026, 5, 22), endDate: new Date(2026, 5, 26), status: 'En attente', notes: 'Fête Nationale prolongée' },
  { id: 'l6', employeeName: 'Pierre Martin', type: 'Maladie', startDate: new Date(2026, 2, 10), endDate: new Date(2026, 2, 14), status: 'Approuvé', notes: '' },
  { id: 'l7', employeeName: 'Marie Dupont', type: 'Vacances', startDate: new Date(2026, 6, 13), endDate: new Date(2026, 6, 24), status: 'Refusé', notes: 'Période haute saison' },
]

const MOCK_BALANCES: LeaveBalance[] = [
  { employeeName: 'Marie Dupont', total: 26, used: 5, pending: 0 },
  { employeeName: 'Jean Muller', total: 26, used: 2, pending: 0 },
  { employeeName: 'Sophie Klein', total: 26, used: 0, pending: 5 },
  { employeeName: 'Luc Weber', total: 30, used: 0, pending: 1 },
  { employeeName: 'Anna Schmit', total: 26, used: 0, pending: 5 },
  { employeeName: 'Pierre Martin', total: 26, used: 5, pending: 0 },
]

const EMPLOYEES = ['Marie Dupont', 'Jean Muller', 'Sophie Klein', 'Luc Weber', 'Anna Schmit', 'Pierre Martin']

// ── Styles ──────────────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 12, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
}

const btnGhost: React.CSSProperties = {
  ...btnBase, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
  border: '1px solid rgba(255,255,255,0.1)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 14, outline: 'none',
}

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const }

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6,
}

// ── Component ──────────────────────────────────────────────────────────
export default function CongesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(MOCK_LEAVES)
  const [tab, setTab] = useState<'list' | 'calendar' | 'balance'>('list')
  const [showModal, setShowModal] = useState(false)
  const [calDate, setCalDate] = useState(new Date())

  const pending = leaves.filter(l => l.status === 'En attente')

  const handleApprove = (id: string) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Approuvé' as LeaveStatus } : l))
  }

  const handleReject = (id: string) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Refusé' as LeaveStatus } : l))
  }

  const handleAdd = (req: Omit<LeaveRequest, 'id' | 'status'>) => {
    setLeaves(prev => [...prev, { ...req, id: `l-${Date.now()}`, status: 'En attente' }])
    setShowModal(false)
  }

  // Calendar data
  const monthStart = startOfMonth(calDate)
  const monthEnd = endOfMonth(calDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const getLeavesForDay = (day: Date) =>
    leaves.filter(l => l.status !== 'Refusé' && isWithinInterval(day, { start: l.startDate, end: l.endDate }))

  const tabs = [
    { key: 'list' as const, label: 'Demandes', icon: Clock },
    { key: 'calendar' as const, label: 'Calendrier', icon: Calendar },
    { key: 'balance' as const, label: 'Soldes', icon: Umbrella },
  ]

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100%', color: '#f1f5f9' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Congés</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{pending.length} demande{pending.length > 1 ? 's' : ''} en attente</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btnPrimary}><Plus size={16} /> Nouvelle demande</button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {([['En attente', '#eab308'], ['Approuvé', '#10b981'], ['Refusé', '#ef4444']] as const).map(([status, color]) => (
          <div key={status} style={{
            ...glassCard, padding: '16px 20px',
            background: `linear-gradient(135deg, ${color}18, rgba(255,255,255,0.02))`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{leaves.filter(l => l.status === status).length}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{status}</div>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            ...btnBase, borderRadius: '10px 10px 0 0', fontSize: 13,
            background: tab === t.key ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: tab === t.key ? '#a5b4fc' : '#64748b',
            borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
          }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* List tab */}
      {tab === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaves.sort((a, b) => {
            const order: Record<LeaveStatus, number> = { 'En attente': 0, 'Approuvé': 1, 'Refusé': 2 }
            return order[a.status] - order[b.status]
          }).map((leave, i) => {
            const Icon = TYPE_ICONS[leave.type]
            return (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  ...glassCard, padding: '18px 22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 14,
                  borderLeft: `3px solid ${TYPE_COLORS[leave.type]}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: TYPE_BG[leave.type],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={TYPE_COLORS[leave.type]} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{leave.employeeName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {format(leave.startDate, 'd MMM', { locale: fr })} — {format(leave.endDate, 'd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: TYPE_BG[leave.type], color: TYPE_COLORS[leave.type],
                  }}>
                    {leave.type}
                  </span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: STATUS_BG[leave.status], color: STATUS_COLORS[leave.status],
                  }}>
                    {leave.status}
                  </span>
                </div>

                {leave.notes && (
                  <div style={{ fontSize: 12, color: '#475569', flex: '1 1 200px', fontStyle: 'italic' }}>
                    {leave.notes}
                  </div>
                )}

                {leave.status === 'En attente' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(leave.id)} style={{
                      ...btnBase, padding: '6px 12px', fontSize: 12,
                      background: 'rgba(16,185,129,0.15)', color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}>
                      <Check size={14} /> Approuver
                    </button>
                    <button onClick={() => handleReject(leave.id)} style={{
                      ...btnBase, padding: '6px 12px', fontSize: 12,
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                      <XCircle size={14} /> Refuser
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ ...glassCard, padding: 20 }}>
            {/* Calendar nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={() => setCalDate(v => subMonths(v, 1))} style={{ ...btnGhost, padding: 8 }}><ChevronLeft size={18} /></button>
              <span style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>
                {format(calDate, 'MMMM yyyy', { locale: fr })}
              </span>
              <button onClick={() => setCalDate(v => addMonths(v, 1))} style={{ ...btnGhost, padding: 8 }}><ChevronRight size={18} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, padding: '8px 0' }}>{d}</div>
              ))}
              {calDays.map((day, i) => {
                const dayLeaves = getLeavesForDay(day)
                const inMonth = isSameMonth(day, calDate)
                return (
                  <div key={i} style={{
                    minHeight: 72, padding: 6, borderRadius: 8,
                    background: isToday(day) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    border: isToday(day) ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.03)',
                    opacity: inMonth ? 1 : 0.25,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isToday(day) ? '#6366f1' : '#cbd5e1', marginBottom: 4 }}>
                      {format(day, 'd')}
                    </div>
                    {dayLeaves.slice(0, 2).map(l => (
                      <div key={l.id} style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 4,
                        marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        background: TYPE_BG[l.type], color: TYPE_COLORS[l.type],
                      }}>
                        {l.employeeName.split(' ')[0]}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>+{dayLeaves.length - 2}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {(Object.keys(TYPE_COLORS) as LeaveType[]).map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLORS[type] }} />
                  {type}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Balance tab */}
      {tab === 'balance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {MOCK_BALANCES.map((bal, i) => {
            const remaining = bal.total - bal.used - bal.pending
            const usedPct = (bal.used / bal.total) * 100
            const pendingPct = (bal.pending / bal.total) * 100
            return (
              <motion.div
                key={bal.employeeName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ ...glassCard, padding: 22 }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{bal.employeeName}</div>

                {/* Progress bar */}
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12, display: 'flex' }}>
                  <div style={{ width: `${usedPct}%`, background: '#6366f1', transition: 'width .3s' }} />
                  <div style={{ width: `${pendingPct}%`, background: '#eab308', transition: 'width .3s' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Pris</div>
                    <div style={{ fontWeight: 700, color: '#6366f1' }}>{bal.used}j</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>En attente</div>
                    <div style={{ fontWeight: 700, color: '#eab308' }}>{bal.pending}j</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>Restants</div>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>{remaining}j</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#475569', marginTop: 10 }}>
                  Total : {bal.total} jours/an
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* New request modal */}
      <NewLeaveModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleAdd}
      />
    </div>
  )
}

// ── New Leave Modal ────────────────────────────────────────────────────
function NewLeaveModal({ isOpen, onClose, onSave }: {
  isOpen: boolean
  onClose: () => void
  onSave: (req: Omit<LeaveRequest, 'id' | 'status'>) => void
}) {
  const [employee, setEmployee] = useState(EMPLOYEES[0])
  const [type, setType] = useState<LeaveType>('Vacances')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = () => {
    if (!startDate || !endDate) return
    onSave({
      employeeName: employee,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes,
    })
    setStartDate('')
    setEndDate('')
    setNotes('')
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 440, background: '#1e293b', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nouvelle demande de congé</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Employé</label>
              <select style={selectStyle} value={employee} onChange={e => setEmployee(e.target.value)}>
                {EMPLOYEES.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={selectStyle} value={type} onChange={e => setType(e.target.value as LeaveType)}>
                <option value="Vacances">Vacances</option>
                <option value="Maladie">Maladie</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Date début</label>
                <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Date fin</label>
                <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Motif ou commentaire..."
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimary}><Plus size={15} /> Soumettre</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
