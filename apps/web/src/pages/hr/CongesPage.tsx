import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isWithinInterval,
  addMonths, subMonths, isToday, differenceInBusinessDays,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, X, ChevronLeft, ChevronRight, Check, XCircle,
  Calendar, Umbrella, Thermometer, Users as UsersIcon, Clock,
  BookOpen, Baby, Download, AlertTriangle, FileText, Upload,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────
type LeaveType = 'Vacances' | 'Maladie' | 'Personnel' | 'Formation' | 'Parental'
type LeaveStatus = 'En attente' | 'Approuvée' | 'Refusée'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  color: string
  type: LeaveType
  startDate: Date
  endDate: Date
  reason: string
  status: LeaveStatus
  hasCertificate?: boolean
}

interface LeaveBalance {
  employeeId: string
  employeeName: string
  avatar: string
  color: string
  acquired: number
  taken: number
  remaining: number
  toTake: number
  vacances: number
  rtt: number
  formation: number
}

// ── Luxembourg 2026 public holidays ──────────────────────────────────────
const LU_HOLIDAYS_2026 = [
  { date: '2026-01-01', label: 'Nouvel An' },
  { date: '2026-04-06', label: 'Lundi de Pâques' },
  { date: '2026-05-01', label: 'Fête du Travail' },
  { date: '2026-05-09', label: 'Fête de l\'Europe' },
  { date: '2026-05-14', label: 'Ascension' },
  { date: '2026-05-25', label: 'Lundi de Pentecôte' },
  { date: '2026-06-23', label: 'Fête Nationale' },
  { date: '2026-08-15', label: 'Assomption' },
  { date: '2026-11-01', label: 'Toussaint' },
  { date: '2026-12-25', label: 'Noël' },
  { date: '2026-12-26', label: 'Saint-Étienne' },
]

function isHoliday(date: Date) {
  const iso = date.toISOString().slice(0, 10)
  return LU_HOLIDAYS_2026.some(h => h.date === iso)
}

// ── Type config ──────────────────────────────────────────────────────────
const TYPE_CFG: Record<LeaveType, { color: string; bg: string; icon: any }> = {
  Vacances:  { color: '#0284c7', bg: '#e0f2fe', icon: Umbrella },
  Maladie:   { color: '#dc2626', bg: '#fee2e2', icon: Thermometer },
  Personnel: { color: '#7c3aed', bg: '#ede9fe', icon: UsersIcon },
  Formation: { color: '#f59e0b', bg: '#fef3c7', icon: BookOpen },
  Parental:  { color: '#ec4899', bg: '#fce7f3', icon: Baby },
}

// ── Mock data ────────────────────────────────────────────────────────────
const EMPLOYEES = [
  { id: 'e1', name: 'Sophie Martin',   avatar: 'SM', color: '#6366f1' },
  { id: 'e2', name: 'Marc Dubois',     avatar: 'MD', color: '#10b981' },
  { id: 'e3', name: 'Julie Lefèvre',   avatar: 'JL', color: '#f59e0b' },
  { id: 'e4', name: 'Alex Weber',      avatar: 'AW', color: '#ec4899' },
  { id: 'e5', name: 'Nora Schmitt',    avatar: 'NS', color: '#14b8a6' },
  { id: 'e6', name: 'Tom Becker',      avatar: 'TB', color: '#8b5cf6' },
]

function d(y: number, m: number, day: number) { return new Date(y, m - 1, day) }

const REQUESTS: LeaveRequest[] = [
  { id: 'r1', employeeId: 'e1', employeeName: 'Sophie Martin', avatar: 'SM', color: '#6366f1', type: 'Vacances',  startDate: d(2026, 4, 20), endDate: d(2026, 4, 30), reason: 'Vacances de Pâques en famille',     status: 'En attente' },
  { id: 'r2', employeeId: 'e2', employeeName: 'Marc Dubois',   avatar: 'MD', color: '#10b981', type: 'Maladie',   startDate: d(2026, 4, 14), endDate: d(2026, 4, 16), reason: 'Gastro-entérite',                    status: 'Approuvée', hasCertificate: true },
  { id: 'r3', employeeId: 'e3', employeeName: 'Julie Lefèvre', avatar: 'JL', color: '#f59e0b', type: 'Formation', startDate: d(2026, 5, 4),  endDate: d(2026, 5, 6),  reason: 'Formation HACCP avancée',            status: 'Approuvée' },
  { id: 'r4', employeeId: 'e4', employeeName: 'Alex Weber',    avatar: 'AW', color: '#ec4899', type: 'Personnel', startDate: d(2026, 4, 22), endDate: d(2026, 4, 22), reason: 'Rendez-vous notaire',                status: 'En attente' },
  { id: 'r5', employeeId: 'e5', employeeName: 'Nora Schmitt',  avatar: 'NS', color: '#14b8a6', type: 'Parental',  startDate: d(2026, 6, 1),  endDate: d(2026, 8, 31), reason: 'Congé parental',                     status: 'Approuvée' },
  { id: 'r6', employeeId: 'e6', employeeName: 'Tom Becker',    avatar: 'TB', color: '#8b5cf6', type: 'Vacances',  startDate: d(2026, 4, 18), endDate: d(2026, 4, 19), reason: 'Weekend prolongé',                   status: 'Refusée' },
  { id: 'r7', employeeId: 'e2', employeeName: 'Marc Dubois',   avatar: 'MD', color: '#10b981', type: 'Vacances',  startDate: d(2026, 5, 15), endDate: d(2026, 5, 25), reason: 'Voyage Italie',                      status: 'En attente' },
]

const BALANCES: LeaveBalance[] = EMPLOYEES.map((e, i) => {
  const acquired = [26, 25, 28, 25, 25, 26][i]
  const taken = [8, 12, 10, 5, 18, 6][i]
  return {
    employeeId: e.id, employeeName: e.name, avatar: e.avatar, color: e.color,
    acquired, taken, remaining: acquired - taken, toTake: Math.max(0, acquired - taken - 2),
    vacances: acquired - 4, rtt: 3, formation: 1,
  }
})

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 18,
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: `${color}15`, color, display: 'grid', placeItems: 'center', marginBottom: 10,
      }}><Icon size={19} /></div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 34 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── Type badge ───────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: LeaveType }) {
  const cfg = TYPE_CFG[type]
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <Icon size={11} /> {type}
    </span>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const cfg = {
    'En attente': { bg: '#fef3c7', fg: '#d97706' },
    'Approuvée':  { bg: '#dcfce7', fg: '#16a34a' },
    'Refusée':    { bg: '#fee2e2', fg: '#dc2626' },
  }[status]
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.fg,
      fontSize: 11, fontWeight: 700,
    }}>{status}</span>
  )
}

// ── Demandes tab ─────────────────────────────────────────────────────────
function DemandesTab({ onNew }: { onNew: () => void }) {
  const [fStatus, setFStatus] = useState<LeaveStatus | 'Tous'>('Tous')
  const [fType, setFType]     = useState<LeaveType | 'Tous'>('Tous')
  const [list, setList]       = useState(REQUESTS)

  const filtered = list.filter(r =>
    (fStatus === 'Tous' || r.status === fStatus) &&
    (fType === 'Tous' || r.type === fType)
  )

  function updateStatus(id: string, status: LeaveStatus) {
    setList(v => v.map(r => r.id === id ? { ...r, status } : r))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={fStatus} onChange={e => setFStatus(e.target.value as any)} style={{ ...inputStyle, width: 170 }}>
          <option value="Tous">Tous les statuts</option>
          <option value="En attente">En attente</option>
          <option value="Approuvée">Approuvée</option>
          <option value="Refusée">Refusée</option>
        </select>
        <select value={fType} onChange={e => setFType(e.target.value as any)} style={{ ...inputStyle, width: 170 }}>
          <option value="Tous">Tous les types</option>
          {Object.keys(TYPE_CFG).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={onNew} style={primaryBtn}>
          <Plus size={15} /> Nouvelle demande
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Employé', 'Type', 'Période', 'Durée', 'Raison', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const days = Math.max(1, differenceInBusinessDays(r.endDate, r.startDate) + 1)
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...tdStyle, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={r.avatar} color={r.color} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.employeeName}</div>
                          {r.hasCertificate && <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={11} /> Certificat</div>}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}><TypeBadge type={r.type} /></td>
                    <td style={tdStyle}>{format(r.startDate, 'dd MMM', { locale: fr })} → {format(r.endDate, 'dd MMM yyyy', { locale: fr })}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{days}j</td>
                    <td style={{ ...tdStyle, maxWidth: 240, color: '#64748b' }}>{r.reason}</td>
                    <td style={tdStyle}><StatusBadge status={r.status} /></td>
                    <td style={tdStyle}>
                      {r.status === 'En attente' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => updateStatus(r.id, 'Approuvée')}
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #16a34a40', background: '#16a34a15', color: '#16a34a', cursor: 'pointer' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => updateStatus(r.id, 'Refusée')}
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #dc262640', background: '#dc262615', color: '#dc2626', cursor: 'pointer' }}>
                            <XCircle size={13} />
                          </button>
                        </div>
                      ) : <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Aucune demande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Calendar tab ─────────────────────────────────────────────────────────
function CalendrierTab() {
  const [month, setMonth] = useState(new Date(2026, 3, 1))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  function leavesOnDay(date: Date) {
    return REQUESTS.filter(r => r.status === 'Approuvée' && isWithinInterval(date, { start: r.startDate, end: r.endDate }))
  }

  const today = selectedDay ?? new Date()
  const todaysLeaves = leavesOnDay(today)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setMonth(subMonths(month, 1))} style={navBtn}><ChevronLeft size={16} /></button>
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
            {format(month, 'MMMM yyyy', { locale: fr })}
          </div>
          <button onClick={() => setMonth(new Date(2026, 3, 1))}
            style={{ padding: '7px 14px', borderRadius: 9, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.08)', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Aujourd'hui
          </button>
          <button onClick={() => setMonth(addMonths(month, 1))} style={navBtn}><ChevronRight size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', padding: '6px 0', textAlign: 'center' }}>{d}</div>
          ))}
          {days.map(day => {
            const leaves = leavesOnDay(day)
            const inMonth = isSameMonth(day, month)
            const holiday = isHoliday(day)
            const sel = selectedDay && isSameDay(day, selectedDay)
            return (
              <div key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                style={{
                  minHeight: 80, padding: 6, borderRadius: 8, cursor: 'pointer',
                  background: sel ? '#991B1B08' : holiday ? '#fef3c7' : '#fff',
                  border: isToday(day) ? '2px solid #991B1B' : '1px solid #f1f5f9',
                  opacity: inMonth ? 1 : 0.4,
                }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: holiday ? '#d97706' : '#0f172a', marginBottom: 4 }}>
                  {format(day, 'd')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {leaves.slice(0, 3).map(l => (
                    <div key={l.id} style={{
                      fontSize: 10, fontWeight: 600,
                      padding: '1px 5px', borderRadius: 4,
                      background: TYPE_CFG[l.type].bg, color: TYPE_CFG[l.type].color,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {l.avatar}
                    </div>
                  ))}
                  {leaves.length > 3 && <div style={{ fontSize: 9, color: '#94a3b8' }}>+{leaves.length - 3}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Légende</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(Object.keys(TYPE_CFG) as LeaveType[]).map(t => {
              const cfg = TYPE_CFG[t]
              const Icon = cfg.icon
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: cfg.bg, color: cfg.color, display: 'grid', placeItems: 'center' }}><Icon size={9} /></div>
                  <span style={{ color: '#475569' }}>{t}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: '#fef3c7' }} />
              <span style={{ color: '#475569' }}>Jour férié (LU)</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Absents {selectedDay ? `le ${format(selectedDay, 'd MMM', { locale: fr })}` : 'aujourd\'hui'}
          </div>
          {todaysLeaves.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Personne d'absent</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todaysLeaves.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Avatar initials={l.avatar} color={l.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{l.employeeName}</div>
                    <div style={{ fontSize: 10, color: TYPE_CFG[l.type].color, fontWeight: 600 }}>{l.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button style={{ ...primaryBtn, justifyContent: 'center' }}>
          <Calendar size={14} /> Exporter vers Google Calendar
        </button>
      </div>
    </div>
  )
}

// ── Soldes tab ───────────────────────────────────────────────────────────
function SoldesTab() {
  const overBudget = BALANCES.filter(b => b.taken > b.acquired)

  return (
    <div>
      {overBudget.length > 0 && (
        <div style={{
          marginBottom: 16, padding: 14, borderRadius: 12,
          background: '#fef3c7', border: '1px solid #f59e0b40',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={18} color="#d97706" />
          <div style={{ fontSize: 13, color: '#78350f', fontWeight: 600 }}>
            {overBudget.length} employé(s) en dépassement de solde
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button style={primaryBtn}>
          <FileText size={14} /> Générer attestations
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Employé', 'Acquis', 'Pris', 'Restants', 'Progression', 'Vacances', 'RTT', 'Formation'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BALANCES.map(b => {
              const pct = Math.min(100, (b.taken / b.acquired) * 100)
              const over = b.taken > b.acquired
              return (
                <tr key={b.employeeId} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar initials={b.avatar} color={b.color} size={32} />
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{b.employeeName}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{b.acquired}j</td>
                  <td style={tdStyle}>{b.taken}j</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: over ? '#dc2626' : '#16a34a' }}>
                    {b.remaining}j
                  </td>
                  <td style={{ ...tdStyle, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: over ? '#dc2626' : pct > 75 ? '#f59e0b' : '#16a34a',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', minWidth: 32 }}>{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{b.vacances}j</td>
                  <td style={tdStyle}>{b.rtt}j</td>
                  <td style={tdStyle}>{b.formation}j</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Holidays info */}
      <div style={{ marginTop: 18, padding: 16, background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Jours fériés Luxembourg 2026 ({LU_HOLIDAYS_2026.length} jours)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {LU_HOLIDAYS_2026.map(h => (
            <div key={h.date} style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 8 }}>
              <span style={{ color: '#991B1B', fontWeight: 700, minWidth: 60 }}>{h.date.slice(5)}</span>
              <span>{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── New request modal ───────────────────────────────────────────────────
function NewRequestModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<{ employeeId: string; type: LeaveType; start: string; end: string; reason: string; hasCert: boolean }>({
    employeeId: '', type: 'Vacances', start: '', end: '', reason: '', hasCert: false,
  })

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, padding: 26, maxWidth: 500, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Nouvelle demande de congé</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Jours ouvrés — jours fériés LU exclus automatiquement</div>
          </div>
          <button onClick={onClose} style={{ ...navBtn, background: '#f1f5f9' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Employé</div>
            <select value={form.employeeId} onChange={e => setForm(v => ({ ...v, employeeId: e.target.value }))} style={inputStyle}>
              <option value="">Sélectionner…</option>
              {EMPLOYEES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Type de congé</div>
            <select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value as LeaveType }))} style={inputStyle}>
              {(Object.keys(TYPE_CFG) as LeaveType[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div style={labelStyle}>Du</div><input type="date" value={form.start} onChange={e => setForm(v => ({ ...v, start: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Au</div><input type="date" value={form.end} onChange={e => setForm(v => ({ ...v, end: e.target.value }))} style={inputStyle} /></div>
          </div>
          <div>
            <div style={labelStyle}>Raison</div>
            <textarea value={form.reason} onChange={e => setForm(v => ({ ...v, reason: e.target.value }))}
              placeholder="Motif de la demande…"
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' as const, fontFamily: 'inherit' }} />
          </div>
          {form.type === 'Maladie' && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 12,
              borderRadius: 10, border: '1px dashed #cbd5e1', cursor: 'pointer',
            }}>
              <Upload size={16} color="#0284c7" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Certificat médical</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>PDF, JPG — requis après 2 jours</div>
              </div>
              <input type="file" accept=".pdf,.jpg,.png" style={{ display: 'none' }} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid #e2e8f0',
            background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700,
          }}>Annuler</button>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
            background: '#991B1B', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>Envoyer</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ── Shared styles ───────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0',
  background: '#fff', fontSize: 13, color: '#0f172a', outline: 'none', width: '100%',
}
const thStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', color: '#475569' }
const navBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
  border: '1px solid rgba(0,0,0,0.06)', background: '#fff',
  display: 'grid', placeItems: 'center', color: '#475569',
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
  border: '1px solid #991B1B', background: '#991B1B', color: '#fff',
  fontSize: 13, fontWeight: 700,
}

// ── Main page ───────────────────────────────────────────────────────────
type Tab = 'demandes' | 'calendrier' | 'soldes'

export default function CongesPage() {
  const [tab, setTab] = useState<Tab>('demandes')
  const [showNew, setShowNew] = useState(false)

  const pending = REQUESTS.filter(r => r.status === 'En attente').length
  const approvedMonth = REQUESTS.filter(r => r.status === 'Approuvée').length
  const avgRemaining = Math.round(BALANCES.reduce((a, b) => a + b.remaining, 0) / BALANCES.length)

  return (
    <div style={{ padding: 28, maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Congés & absences</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 3 }}>Gestion des demandes, calendrier et soldes</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={Clock}     label="En attente"         value={pending}               color="#f59e0b" />
        <StatCard icon={Check}     label="Approuvées (mois)"  value={approvedMonth}         color="#16a34a" />
        <StatCard icon={Umbrella}  label="Jours restants (moy.)" value={`${avgRemaining}j`} color="#0284c7" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20, width: 'fit-content' }}>
        {([
          { id: 'demandes',   label: 'Demandes',    icon: FileText },
          { id: 'calendrier', label: 'Calendrier',  icon: Calendar },
          { id: 'soldes',     label: 'Soldes',      icon: Umbrella },
        ] as const).map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9, cursor: 'pointer', border: 'none',
                background: active ? '#991B1B' : 'transparent',
                color: active ? '#fff' : '#64748b',
                fontSize: 13, fontWeight: 700,
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === 'demandes'   && <DemandesTab onNew={() => setShowNew(true)} />}
          {tab === 'calendrier' && <CalendrierTab />}
          {tab === 'soldes'     && <SoldesTab />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>{showNew && <NewRequestModal onClose={() => setShowNew(false)} />}</AnimatePresence>
    </div>
  )
}
