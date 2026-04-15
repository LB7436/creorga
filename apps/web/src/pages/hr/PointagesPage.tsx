import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, differenceInMinutes, startOfWeek, addDays, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Clock, LogIn, LogOut, Download, CheckCircle2, XCircle,
  ChevronDown, Users, Timer,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
interface ClockEntry {
  id: string
  employeeName: string
  role: string
  date: Date
  clockIn: Date | null
  clockOut: Date | null
  verifiedBy: string | null
}

// ── Mock data ──────────────────────────────────────────────────────────
const today = new Date()
const wsStart = startOfWeek(today, { weekStartsOn: 1 })

function makeTime(day: Date, h: number, m: number) {
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

const MOCK_ENTRIES: ClockEntry[] = [
  { id: 'c1', employeeName: 'Marie Dupont', role: 'Serveur', date: today, clockIn: makeTime(today, 9, 2), clockOut: null, verifiedBy: null },
  { id: 'c2', employeeName: 'Jean Muller', role: 'Cuisinier', date: today, clockIn: makeTime(today, 7, 55), clockOut: null, verifiedBy: null },
  { id: 'c3', employeeName: 'Luc Weber', role: 'Manager', date: today, clockIn: makeTime(today, 8, 30), clockOut: null, verifiedBy: null },
  { id: 'c4', employeeName: 'Sophie Klein', role: 'Serveur', date: today, clockIn: null, clockOut: null, verifiedBy: null },
  { id: 'c5', employeeName: 'Anna Schmit', role: 'Ménage', date: today, clockIn: makeTime(today, 6, 0), clockOut: makeTime(today, 10, 5), verifiedBy: 'Luc Weber' },
  { id: 'c6', employeeName: 'Pierre Martin', role: 'Cuisinier', date: today, clockIn: null, clockOut: null, verifiedBy: null },
  // History entries
  ...Array.from({ length: 5 }, (_, d) => {
    const day = addDays(wsStart, d)
    return [
      { id: `h${d}a`, employeeName: 'Marie Dupont', role: 'Serveur', date: day, clockIn: makeTime(day, 9, 0), clockOut: makeTime(day, 17, 15), verifiedBy: 'Luc Weber' },
      { id: `h${d}b`, employeeName: 'Jean Muller', role: 'Cuisinier', date: day, clockIn: makeTime(day, 7, 45), clockOut: makeTime(day, 15, 30), verifiedBy: 'Luc Weber' },
      { id: `h${d}c`, employeeName: 'Luc Weber', role: 'Manager', date: day, clockIn: makeTime(day, 8, 30), clockOut: makeTime(day, 18, 0), verifiedBy: null },
      { id: `h${d}d`, employeeName: 'Anna Schmit', role: 'Ménage', date: day, clockIn: makeTime(day, 6, 0), clockOut: makeTime(day, 10, 0), verifiedBy: 'Luc Weber' },
    ]
  }).flat(),
]

const ROLE_COLORS: Record<string, string> = {
  Serveur: '#6366f1',
  Cuisinier: '#f97316',
  Ménage: '#ec4899',
  Manager: '#10b981',
}

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

const btnGhost: React.CSSProperties = {
  ...btnBase, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
  border: '1px solid rgba(255,255,255,0.1)',
}

// ── Helpers ─────────────────────────────────────────────────────────────
function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────────────────
export default function PointagesPage() {
  const [entries, setEntries] = useState<ClockEntry[]>(MOCK_ENTRIES)
  const [tab, setTab] = useState<'today' | 'history' | 'summary'>('today')

  const todayEntries = useMemo(() =>
    entries.filter(e => isSameDay(e.date, today)),
    [entries])

  const historyEntries = useMemo(() =>
    entries.filter(e => !isSameDay(e.date, today) && e.clockOut !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [entries])

  const clockedIn = todayEntries.filter(e => e.clockIn && !e.clockOut)
  const notClockedIn = todayEntries.filter(e => !e.clockIn)

  const handleClockIn = (id: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, clockIn: new Date() } : e
    ))
  }

  const handleClockOut = (id: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, clockOut: new Date() } : e
    ))
  }

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const completed = entries.filter(e => e.clockIn && e.clockOut)
    const byName: Record<string, { total: number; role: string; days: number }> = {}
    completed.forEach(e => {
      const mins = differenceInMinutes(e.clockOut!, e.clockIn!)
      if (!byName[e.employeeName]) byName[e.employeeName] = { total: 0, role: e.role, days: 0 }
      byName[e.employeeName].total += mins
      byName[e.employeeName].days += 1
    })
    return Object.entries(byName).map(([name, data]) => ({
      name, ...data,
    })).sort((a, b) => b.total - a.total)
  }, [entries])

  // CSV export
  const handleExport = () => {
    const header = 'Employé,Date,Pointage entrée,Pointage sortie,Durée,Vérifié par\n'
    const rows = entries.filter(e => e.clockIn && e.clockOut).map(e => {
      const dur = differenceInMinutes(e.clockOut!, e.clockIn!)
      return `${e.employeeName},${format(e.date, 'dd/MM/yyyy')},${format(e.clockIn!, 'HH:mm')},${format(e.clockOut!, 'HH:mm')},${formatDuration(dur)},${e.verifiedBy || '-'}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pointages_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { key: 'today' as const, label: "Aujourd'hui", icon: Clock },
    { key: 'history' as const, label: 'Historique', icon: Timer },
    { key: 'summary' as const, label: 'Résumé hebdo', icon: Users },
  ]

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100%', color: '#f1f5f9' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Pointages</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <button onClick={handleExport} style={btnGhost}><Download size={15} /> Export CSV</button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ ...glassCard, padding: '18px 22px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogIn size={18} color="#10b981" />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Pointés</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', marginTop: 6 }}>{clockedIn.length}</div>
        </div>
        <div style={{ ...glassCard, padding: '18px 22px', background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={18} color="#ef4444" />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Absents</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginTop: 6 }}>{notClockedIn.length}</div>
        </div>
        <div style={{ ...glassCard, padding: '18px 22px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#6366f1" />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Terminés</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>
            {todayEntries.filter(e => e.clockIn && e.clockOut).length}
          </div>
        </div>
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

      {/* Today tab */}
      {tab === 'today' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {todayEntries.map((entry, i) => {
            const isClockedIn = entry.clockIn && !entry.clockOut
            const isDone = entry.clockIn && entry.clockOut
            const isAbsent = !entry.clockIn
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  ...glassCard, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 12,
                  borderLeft: `3px solid ${ROLE_COLORS[entry.role] || '#6366f1'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: `linear-gradient(135deg, ${ROLE_COLORS[entry.role] || '#6366f1'}, ${ROLE_COLORS[entry.role] || '#6366f1'}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>
                    {entry.employeeName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{entry.employeeName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{entry.role}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
                  {entry.clockIn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                      <LogIn size={14} /> {format(entry.clockIn, 'HH:mm')}
                    </div>
                  )}
                  {entry.clockOut && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}>
                      <LogOut size={14} /> {format(entry.clockOut, 'HH:mm')}
                    </div>
                  )}
                  {isDone && (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                      {formatDuration(differenceInMinutes(entry.clockOut!, entry.clockIn!))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {isAbsent && (
                    <button onClick={() => handleClockIn(entry.id)} style={{
                      ...btnBase, padding: '7px 14px', fontSize: 12,
                      background: 'rgba(16,185,129,0.15)', color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}>
                      <LogIn size={14} /> Pointer entrée
                    </button>
                  )}
                  {isClockedIn && (
                    <button onClick={() => handleClockOut(entry.id)} style={{
                      ...btnBase, padding: '7px 14px', fontSize: 12,
                      background: 'rgba(239,68,68,0.15)', color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                      <LogOut size={14} /> Pointer sortie
                    </button>
                  )}
                  {isDone && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    }}>
                      <CheckCircle2 size={13} /> Terminé
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Date', 'Employé', 'Rôle', 'Entrée', 'Sortie', 'Durée', 'Vérifié par'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((e, i) => (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{format(e.date, 'dd/MM/yyyy')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{e.employeeName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: `${ROLE_COLORS[e.role]}22`, color: ROLE_COLORS[e.role],
                        }}>
                          {e.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#10b981' }}>{e.clockIn ? format(e.clockIn, 'HH:mm') : '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#ef4444' }}>{e.clockOut ? format(e.clockOut, 'HH:mm') : '-'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#a5b4fc' }}>
                        {e.clockIn && e.clockOut ? formatDuration(differenceInMinutes(e.clockOut, e.clockIn)) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: e.verifiedBy ? '#10b981' : '#475569', fontSize: 12 }}>
                        {e.verifiedBy || 'Non vérifié'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {weeklySummary.map((emp, i) => {
            const h = Math.floor(emp.total / 60)
            const overtime = Math.max(0, emp.total - 40 * 60)
            return (
              <motion.div
                key={emp.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ ...glassCard, padding: 22 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: `${ROLE_COLORS[emp.role]}22`, color: ROLE_COLORS[emp.role],
                    }}>
                      {emp.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{emp.days} jours</div>
                </div>

                {/* Hours bar */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    <span>Total</span>
                    <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{formatDuration(emp.total)}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(100, (emp.total / (40 * 60)) * 100)}%`,
                      background: `linear-gradient(90deg, ${ROLE_COLORS[emp.role]}, ${ROLE_COLORS[emp.role]}88)`,
                    }} />
                  </div>
                </div>

                {overtime > 0 && (
                  <div style={{ fontSize: 11, color: '#eab308', fontWeight: 600 }}>
                    {formatDuration(overtime)} heures supplémentaires
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
