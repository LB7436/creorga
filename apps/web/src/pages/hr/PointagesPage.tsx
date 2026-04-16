import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  Clock, LogIn, LogOut, Coffee, Play, Download, Users, Timer,
  AlertTriangle, TrendingUp, CheckCircle2, XCircle, Calendar,
  MapPin, Camera, Plus, ChevronLeft, ChevronRight, FileDown, X,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────
type PointageStatus = 'pointe' | 'non_pointe' | 'pause'

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  status: PointageStatus
  clockIn: string | null
  clockOut: string | null
  pauseStart: string | null
  todayHours: number
  contractHours: number
}

interface HistoryEntry {
  id: string
  date: string
  employeeId: string
  employeeName: string
  clockIn: string
  clockOut: string
  pauseMinutes: number
  workedHours: number
  overtimeHours: number
  validatedBy: string
  location: string
}

// ── Mock data ────────────────────────────────────────────────────────────
const EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Sophie Martin',   role: 'Manager',     avatar: 'SM', color: '#6366f1', status: 'pointe',     clockIn: '08:12', clockOut: null, pauseStart: null, todayHours: 6.25, contractHours: 40 },
  { id: 'e2', name: 'Marc Dubois',     role: 'Serveur',     avatar: 'MD', color: '#10b981', status: 'pointe',     clockIn: '09:05', clockOut: null, pauseStart: null, todayHours: 5.3,  contractHours: 35 },
  { id: 'e3', name: 'Julie Lefèvre',   role: 'Chef',        avatar: 'JL', color: '#f59e0b', status: 'pause',      clockIn: '07:30', clockOut: null, pauseStart: '12:15', todayHours: 4.75, contractHours: 40 },
  { id: 'e4', name: 'Alex Weber',      role: 'Commis',      avatar: 'AW', color: '#ec4899', status: 'pointe',     clockIn: '08:45', clockOut: null, pauseStart: null, todayHours: 5.5,  contractHours: 40 },
  { id: 'e5', name: 'Nora Schmitt',    role: 'Barmaid',     avatar: 'NS', color: '#14b8a6', status: 'non_pointe', clockIn: null,   clockOut: null, pauseStart: null, todayHours: 0,    contractHours: 30 },
  { id: 'e6', name: 'Tom Becker',      role: 'Serveur',     avatar: 'TB', color: '#8b5cf6', status: 'pointe',     clockIn: '09:22', clockOut: null, pauseStart: null, todayHours: 5.0,  contractHours: 35 },
  { id: 'e7', name: 'Lisa Klein',      role: 'Plongeuse',   avatar: 'LK', color: '#06b6d4', status: 'pointe',     clockIn: '10:00', clockOut: null, pauseStart: null, todayHours: 4.3,  contractHours: 25 },
  { id: 'e8', name: 'Paul Reuter',     role: 'Livreur',     avatar: 'PR', color: '#ef4444', status: 'non_pointe', clockIn: null,   clockOut: null, pauseStart: null, todayHours: 0,    contractHours: 20 },
]

const HISTORY: HistoryEntry[] = Array.from({ length: 14 }).map((_, i) => {
  const emp = EMPLOYEES[i % EMPLOYEES.length]
  const d = new Date(); d.setDate(d.getDate() - (i + 1))
  const worked = 7 + Math.random() * 2.5
  return {
    id: `h${i}`,
    date: d.toISOString().slice(0, 10),
    employeeId: emp.id,
    employeeName: emp.name,
    clockIn: '08:' + String(Math.floor(Math.random() * 45)).padStart(2, '0'),
    clockOut: '17:' + String(Math.floor(Math.random() * 45)).padStart(2, '0'),
    pauseMinutes: 30 + Math.floor(Math.random() * 30),
    workedHours: +worked.toFixed(2),
    overtimeHours: +(Math.max(0, worked - 8)).toFixed(2),
    validatedBy: 'Sophie Martin',
    location: 'Luxembourg Centre',
  }
})

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 18,
      border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `${color}15`, color, display: 'grid', placeItems: 'center',
        }}>
          <Icon size={19} />
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: '#fff', fontWeight: 700, fontSize: size * 0.35,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── En cours tab ─────────────────────────────────────────────────────────
function EnCoursTab({ employees, tick }: { employees: Employee[]; tick: number }) {
  function elapsedFrom(time: string | null): string {
    if (!time) return '—'
    const [h, m] = time.split(':').map(Number)
    const start = new Date(); start.setHours(h, m, 0, 0)
    const diff = Math.max(0, Date.now() - start.getTime())
    const hh = Math.floor(diff / 3600000)
    const mm = Math.floor((diff % 3600000) / 60000)
    const ss = Math.floor((diff % 60000) / 1000)
    void tick
    return `${hh}h${String(mm).padStart(2, '0')}'${String(ss).padStart(2, '0')}"`
  }

  function statusBadge(s: PointageStatus) {
    const cfg = {
      pointe:     { label: 'Pointé',     bg: '#dcfce7', fg: '#16a34a', dot: '#22c55e' },
      non_pointe: { label: 'Non pointé', bg: '#fee2e2', fg: '#dc2626', dot: '#ef4444' },
      pause:      { label: 'En pause',   bg: '#fef3c7', fg: '#d97706', dot: '#f59e0b' },
    }[s]
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.fg,
        fontSize: 11, fontWeight: 700,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
        {cfg.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
      {employees.map((e, i) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          style={{
            background: '#fff', borderRadius: 16, padding: 16,
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Avatar initials={e.avatar} color={e.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{e.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{e.role}</div>
            </div>
            {statusBadge(e.status)}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            padding: '10px 12px', background: '#f8fafc', borderRadius: 10, marginBottom: 12,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Arrivée</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{e.clockIn ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Écoulé</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', fontVariantNumeric: 'tabular-nums' }}>
                {elapsedFrom(e.clockIn)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Aujourd'hui</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {e.todayHours.toFixed(2)}h <span style={{ color: '#94a3b8', fontWeight: 500 }}>/ {(e.contractHours / 5).toFixed(1)}h</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {e.status === 'non_pointe' && (
              <button style={actionBtn('#16a34a', true)}><LogIn size={13} /> Entrée</button>
            )}
            {e.status === 'pointe' && (
              <>
                <button style={actionBtn('#f59e0b')}><Coffee size={13} /> Pause</button>
                <button style={actionBtn('#dc2626')}><LogOut size={13} /> Sortie</button>
              </>
            )}
            {e.status === 'pause' && (
              <button style={actionBtn('#16a34a', true)}><Play size={13} /> Reprendre</button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function actionBtn(color: string, wide = false): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
    border: `1px solid ${color}40`, background: `${color}12`, color,
    fontSize: 12, fontWeight: 700, gridColumn: wide ? '1 / -1' : undefined,
  }
}

// ── Historique tab ───────────────────────────────────────────────────────
function HistoriqueTab({ onSelect }: { onSelect: (h: HistoryEntry) => void }) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().slice(0, 10) })
  const [to, setTo]     = useState(() => new Date().toISOString().slice(0, 10))
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() =>
    HISTORY.filter(h =>
      h.date >= from && h.date <= to &&
      (!filter || h.employeeName.toLowerCase().includes(filter.toLowerCase()))
    ), [from, to, filter])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div style={labelStyle}>Du</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Au</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={labelStyle}>Recherche</div>
          <input placeholder="Nom d'employé" value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle} />
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
          border: '1px solid #991B1B40', background: '#991B1B12', color: '#991B1B',
          fontSize: 13, fontWeight: 700,
        }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Date', 'Employé', 'Entrée', 'Sortie', 'Pause', 'Heures', 'Sup.', 'Validé'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} onClick={() => onSelect(h)} style={{ cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={tdStyle}>{h.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{h.employeeName}</td>
                  <td style={tdStyle}>{h.clockIn}</td>
                  <td style={tdStyle}>{h.clockOut}</td>
                  <td style={tdStyle}>{h.pauseMinutes} min</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{h.workedHours.toFixed(2)}h</td>
                  <td style={{ ...tdStyle, color: h.overtimeHours > 0 ? '#f59e0b' : '#cbd5e1', fontWeight: 700 }}>
                    {h.overtimeHours > 0 ? `+${h.overtimeHours.toFixed(2)}h` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: '#16a34a', fontSize: 12 }}>
                    <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {h.validatedBy.split(' ')[0]}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Aucun résultat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Résumé hebdo tab ─────────────────────────────────────────────────────
function ResumeHebdoTab() {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const data = useMemo(() => EMPLOYEES.map(e => ({
    ...e,
    daily: days.map(() => +(Math.random() * 9).toFixed(1)),
  })), [weekOffset])

  const weekTotal = data.reduce((a, e) => a + e.daily.reduce((b, v) => b + v, 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={() => setWeekOffset(v => v - 1)} style={navBtn}><ChevronLeft size={16} /></button>
        <div style={{
          padding: '8px 18px', borderRadius: 10, background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 700, color: '#0f172a',
        }}>
          Semaine {weekOffset === 0 ? 'courante' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}
        </div>
        <button onClick={() => setWeekOffset(v => v + 1)} style={navBtn}><ChevronRight size={16} /></button>
        <div style={{ flex: 1 }} />
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
          border: '1px solid #991B1B40', background: '#991B1B12', color: '#991B1B',
          fontSize: 13, fontWeight: 700,
        }}>
          <FileDown size={14} /> Export FIDUCIAIRE
        </button>
      </div>

      {/* Chart */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Heures par jour</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, alignItems: 'end', height: 200 }}>
          {days.map((day, d) => {
            const total = data.reduce((a, e) => a + e.daily[d], 0)
            const maxDay = Math.max(...days.map((_, di) => data.reduce((a, e) => a + e.daily[di], 0)))
            const h = (total / maxDay) * 170
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{total.toFixed(1)}h</div>
                <div style={{ width: '100%', height: h, display: 'flex', flexDirection: 'column-reverse', borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                  {data.map(e => {
                    const seg = (e.daily[d] / total) * h
                    return <div key={e.id} style={{ height: seg, background: e.color }} title={`${e.name}: ${e.daily[d]}h`} />
                  })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{day}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary table */}
      <div style={{
        background: '#fff', borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Employé', 'Contrat', 'Réelles', 'Sup.', 'Écart'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(e => {
              const real = e.daily.reduce((a, v) => a + v, 0)
              const sup = Math.max(0, real - e.contractHours)
              const diff = real - e.contractHours
              return (
                <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={e.avatar} color={e.color} size={30} />
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{e.name}</span>
                  </td>
                  <td style={tdStyle}>{e.contractHours}h</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{real.toFixed(2)}h</td>
                  <td style={{ ...tdStyle, color: sup > 0 ? '#f59e0b' : '#cbd5e1', fontWeight: 700 }}>
                    {sup > 0 ? `+${sup.toFixed(2)}h` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: diff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}h
                  </td>
                </tr>
              )
            })}
            <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>Total semaine</td>
              <td style={{ ...tdStyle, fontWeight: 800 }}>{EMPLOYEES.reduce((a, e) => a + e.contractHours, 0)}h</td>
              <td style={{ ...tdStyle, fontWeight: 800, color: '#991B1B' }}>{weekTotal.toFixed(2)}h</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Detail modal ─────────────────────────────────────────────────────────
function DetailModal({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
      }}>
      <motion.div
        initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, padding: 26,
          maxWidth: 480, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{entry.employeeName}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{entry.date}</div>
          </div>
          <button onClick={onClose} style={{ ...navBtn, background: '#f1f5f9' }}><X size={16} /></button>
        </div>

        <div style={{
          height: 160, background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: 12, marginBottom: 16, display: 'grid', placeItems: 'center', color: '#64748b',
        }}>
          <div style={{ textAlign: 'center' }}>
            <Camera size={32} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12 }}>Photo de pointage</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>{entry.clockIn} · Webcam caisse</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <InfoBox icon={LogIn} label="Entrée" value={entry.clockIn} />
          <InfoBox icon={LogOut} label="Sortie" value={entry.clockOut} />
          <InfoBox icon={Coffee} label="Pause" value={`${entry.pauseMinutes} min`} />
          <InfoBox icon={Timer} label="Travaillées" value={`${entry.workedHours.toFixed(2)}h`} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: '#f8fafc', borderRadius: 10,
          fontSize: 12, color: '#475569',
        }}>
          <MapPin size={14} color="#991B1B" />
          <span><b>Géolocalisation:</b> {entry.location} (49.6116°N, 6.1319°E)</span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

function InfoBox({ icon: Icon, label, value }: any) {
  return (
    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={11} /> {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

// ── Shared styles ────────────────────────────────────────────────────────
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

// ── Main page ────────────────────────────────────────────────────────────
type Tab = 'en_cours' | 'historique' | 'resume'

export default function PointagesPage() {
  const [tab, setTab] = useState<Tab>('en_cours')
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<HistoryEntry | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const pointedCount = EMPLOYEES.filter(e => e.status !== 'non_pointe').length
  const todayHours = EMPLOYEES.reduce((a, e) => a + e.todayHours, 0)
  const retards = 2
  const heuresSupp = 3.75

  return (
    <div style={{ padding: 28, maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Pointages</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 3 }}>Suivi du temps de travail en temps réel</div>
        </div>
        <button
          onClick={() => setShowManual(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 11, cursor: 'pointer',
            border: '1px solid #991B1B', background: '#991B1B', color: '#fff',
            fontSize: 13, fontWeight: 700,
          }}
        >
          <Plus size={15} /> Correction manuelle
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={Users}         label="Employés pointés"    value={`${pointedCount}/${EMPLOYEES.length}`} sub="en service"      color="#16a34a" />
        <StatCard icon={Clock}         label="Heures aujourd'hui"  value={`${Math.floor(todayHours)}h${String(Math.round((todayHours % 1) * 60)).padStart(2, '0')}`} sub="cumul équipe" color="#6366f1" />
        <StatCard icon={AlertTriangle} label="Retards"             value={retards} sub="à vérifier"                  color="#f59e0b" />
        <StatCard icon={TrendingUp}    label="Heures supp."        value={`${heuresSupp.toFixed(2)}h`} sub="cette semaine"         color="#991B1B" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20, width: 'fit-content' }}>
        {([
          { id: 'en_cours',   label: 'En cours',      icon: Clock },
          { id: 'historique', label: 'Historique',    icon: Calendar },
          { id: 'resume',     label: 'Résumé hebdo',  icon: TrendingUp },
        ] as const).map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
                border: 'none',
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
          {tab === 'en_cours'   && <EnCoursTab employees={EMPLOYEES} tick={tick} />}
          {tab === 'historique' && <HistoriqueTab onSelect={setSelected} />}
          {tab === 'resume'     && <ResumeHebdoTab />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>{selected && <DetailModal entry={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
      <AnimatePresence>{showManual && <ManualCorrectionModal onClose={() => setShowManual(false)} />}</AnimatePresence>
    </div>
  )
}

// ── Manual correction modal ──────────────────────────────────────────────
function ManualCorrectionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ employeeId: '', date: new Date().toISOString().slice(0, 10), clockIn: '09:00', clockOut: '17:00', reason: '' })
  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, padding: 26, maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Correction manuelle</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Ajouter un pointage manquant (approbation manager requise)</div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><div style={labelStyle}>Date</div><input type="date" value={form.date} onChange={e => setForm(v => ({ ...v, date: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Entrée</div><input type="time" value={form.clockIn} onChange={e => setForm(v => ({ ...v, clockIn: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Sortie</div><input type="time" value={form.clockOut} onChange={e => setForm(v => ({ ...v, clockOut: e.target.value }))} style={inputStyle} /></div>
          </div>
          <div>
            <div style={labelStyle}>Justification</div>
            <textarea value={form.reason} onChange={e => setForm(v => ({ ...v, reason: e.target.value }))}
              placeholder="Raison de la correction (oubli de badge, problème technique…)"
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid #e2e8f0',
            background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 700,
          }}>Annuler</button>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
            background: '#991B1B', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>Envoyer pour approbation</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
