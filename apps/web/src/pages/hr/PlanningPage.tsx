import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths, isSameDay,
  isSameMonth, getDay, getHours, getMinutes, setHours, setMinutes,
  eachDayOfInterval, isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Calendar, Mail, Download,
  Plus, X, Clock, Users, Filter, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { createPortal } from 'react-dom'

// ── Types ──────────────────────────────────────────────────────────────
type RoleType = 'Serveur' | 'Cuisinier' | 'Femme de ménage' | 'Manager'
type SectionType = 'Salle' | 'Bar' | 'Terrasse'
type ViewType = 'week' | 'month'

interface Shift {
  id: string
  employeeName: string
  role: RoleType
  section: SectionType
  date: Date
  startHour: number
  startMin: number
  endHour: number
  endMin: number
}

interface Reservation {
  id: string
  guestName: string
  partySize: number
  date: Date
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  section: SectionType
}

interface SickLeave {
  id: string
  employeeName: string
  startDate: Date
  endDate: Date
  reason: string
}

interface Vacation {
  id: string
  employeeName: string
  startDate: Date
  endDate: Date
  label: string
}

interface Holiday {
  date: Date
  name: string
}

// ── Constants ──────────────────────────────────────────────────────────
const ROLE_COLORS: Record<RoleType, string> = {
  Serveur: '#6366f1',
  Cuisinier: '#f97316',
  'Femme de ménage': '#ec4899',
  Manager: '#10b981',
}

const ROLE_BG: Record<RoleType, string> = {
  Serveur: 'rgba(99,102,241,0.18)',
  Cuisinier: 'rgba(249,115,22,0.18)',
  'Femme de ménage': 'rgba(236,72,153,0.18)',
  Manager: 'rgba(16,185,129,0.18)',
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

const HOLIDAYS_2026: Holiday[] = [
  { date: new Date(2026, 0, 1), name: 'Nouvel An' },
  { date: new Date(2026, 3, 17), name: 'Vendredi Saint' },
  { date: new Date(2026, 3, 20), name: 'Lundi de Pâques' },
  { date: new Date(2026, 4, 1), name: 'Fête du Travail' },
  { date: new Date(2026, 4, 28), name: 'Ascension' },
  { date: new Date(2026, 5, 8), name: 'Lundi de Pentecôte' },
  { date: new Date(2026, 5, 23), name: 'Fête Nationale' },
  { date: new Date(2026, 7, 15), name: 'Assomption' },
  { date: new Date(2026, 10, 1), name: 'Toussaint' },
  { date: new Date(2026, 11, 25), name: 'Noël' },
  { date: new Date(2026, 11, 26), name: 'Saint-Étienne' },
]

const SECTIONS: SectionType[] = ['Salle', 'Bar', 'Terrasse']

// ── Mock data generator ────────────────────────────────────────────────
function generateMockShifts(): Shift[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const names: { name: string; role: RoleType; section: SectionType }[] = [
    { name: 'Marie Dupont', role: 'Serveur', section: 'Salle' },
    { name: 'Jean Muller', role: 'Cuisinier', section: 'Salle' },
    { name: 'Sophie Klein', role: 'Serveur', section: 'Terrasse' },
    { name: 'Luc Weber', role: 'Manager', section: 'Salle' },
    { name: 'Anna Schmit', role: 'Femme de ménage', section: 'Salle' },
    { name: 'Pierre Martin', role: 'Cuisinier', section: 'Bar' },
    { name: 'Claire Reuter', role: 'Serveur', section: 'Bar' },
  ]
  const shifts: Shift[] = []
  let id = 1
  for (let d = 0; d < 7; d++) {
    const day = addDays(weekStart, d)
    if (d < 5) {
      shifts.push({ id: `s${id++}`, employeeName: names[0].name, role: names[0].role, section: names[0].section, date: day, startHour: 10, startMin: 0, endHour: 16, endMin: 0 })
      shifts.push({ id: `s${id++}`, employeeName: names[1].name, role: names[1].role, section: names[1].section, date: day, startHour: 8, startMin: 0, endHour: 15, endMin: 0 })
      shifts.push({ id: `s${id++}`, employeeName: names[3].name, role: names[3].role, section: names[3].section, date: day, startHour: 9, startMin: 0, endHour: 18, endMin: 0 })
    }
    if (d === 0 || d === 2 || d === 4) {
      shifts.push({ id: `s${id++}`, employeeName: names[4].name, role: names[4].role, section: names[4].section, date: day, startHour: 6, startMin: 0, endHour: 10, endMin: 0 })
    }
    if (d >= 3) {
      shifts.push({ id: `s${id++}`, employeeName: names[2].name, role: names[2].role, section: names[2].section, date: day, startHour: 17, startMin: 0, endHour: 23, endMin: 0 })
      shifts.push({ id: `s${id++}`, employeeName: names[5].name, role: names[5].role, section: names[5].section, date: day, startHour: 16, startMin: 0, endHour: 23, endMin: 0 })
    }
    if (d === 5 || d === 6) {
      shifts.push({ id: `s${id++}`, employeeName: names[6].name, role: names[6].role, section: names[6].section, date: day, startHour: 11, startMin: 0, endHour: 20, endMin: 0 })
    }
  }
  return shifts
}

function generateMockReservations(): Reservation[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'r1', guestName: 'Famille Braun', partySize: 6, date: addDays(weekStart, 0), startHour: 12, startMin: 0, endHour: 14, endMin: 0, section: 'Salle' },
    { id: 'r2', guestName: 'M. Hoffmann', partySize: 2, date: addDays(weekStart, 1), startHour: 19, startMin: 30, endHour: 21, endMin: 30, section: 'Terrasse' },
    { id: 'r3', guestName: 'Société ABC', partySize: 12, date: addDays(weekStart, 2), startHour: 12, startMin: 0, endHour: 14, endMin: 30, section: 'Salle' },
    { id: 'r4', guestName: 'Mme Kieffer', partySize: 4, date: addDays(weekStart, 4), startHour: 20, startMin: 0, endHour: 22, endMin: 0, section: 'Bar' },
    { id: 'r5', guestName: 'Groupe Lux', partySize: 8, date: addDays(weekStart, 5), startHour: 19, startMin: 0, endHour: 22, endMin: 0, section: 'Salle' },
  ]
}

function generateMockSickLeaves(): SickLeave[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'sl1', employeeName: 'Jean Muller', startDate: addDays(weekStart, 1), endDate: addDays(weekStart, 3), reason: 'Grippe' },
    { id: 'sl2', employeeName: 'Anna Schmit', startDate: addDays(weekStart, 3), endDate: addDays(weekStart, 5), reason: 'Migraine' },
    { id: 'sl3', employeeName: 'Pierre Martin', startDate: addDays(weekStart, 0), endDate: addDays(weekStart, 1), reason: 'Gastro' },
  ]
}

function generateMockVacations(): Vacation[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'v1', employeeName: 'Sophie Klein', startDate: addDays(weekStart, 0), endDate: addDays(weekStart, 4), label: 'Congé annuel' },
    { id: 'v2', employeeName: 'Claire Reuter', startDate: addDays(weekStart, 2), endDate: addDays(weekStart, 3), label: 'Congé personnel' },
  ]
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
export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('week')
  const [sectionFilter, setSectionFilter] = useState<string>('Toutes')
  const [shifts] = useState<Shift[]>(generateMockShifts)
  const [reservations] = useState<Reservation[]>(generateMockReservations)
  const [sickLeaves] = useState<SickLeave[]>(generateMockSickLeaves)
  const [vacations] = useState<Vacation[]>(generateMockVacations)

  // Filters
  const [showShifts, setShowShifts] = useState(true)
  const [showConges, setShowConges] = useState(true)
  const [showMaladies, setShowMaladies] = useState(true)
  const [showReservations, setShowReservations] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState<Date | null>(null)
  const [addHour, setAddHour] = useState(9)
  const [toast, setToast] = useState<string | null>(null)

  // Navigation
  const goNext = () => setCurrentDate(v => view === 'week' ? addWeeks(v, 1) : addMonths(v, 1))
  const goPrev = () => setCurrentDate(v => view === 'week' ? subWeeks(v, 1) : subMonths(v, 1))
  const goToday = () => setCurrentDate(new Date())

  // Week days
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  // Month days
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])
  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [monthStart, monthEnd])

  const getHoliday = useCallback((day: Date) =>
    HOLIDAYS_2026.find(h => isSameDay(h.date, day)), [])

  const filteredShifts = useMemo(() => {
    if (!showShifts) return []
    return sectionFilter === 'Toutes' ? shifts : shifts.filter(s => s.section === sectionFilter)
  }, [shifts, sectionFilter, showShifts])

  const getShiftsForDay = useCallback((day: Date) =>
    filteredShifts.filter(s => isSameDay(s.date, day)), [filteredShifts])

  const getReservationsForDay = useCallback((day: Date) =>
    showReservations ? reservations.filter(r => isSameDay(r.date, day)) : [],
    [reservations, showReservations])

  const getSickLeavesForDay = useCallback((day: Date) =>
    showMaladies ? sickLeaves.filter(sl => day >= sl.startDate && day <= sl.endDate) : [],
    [sickLeaves, showMaladies])

  const getVacationsForDay = useCallback((day: Date) =>
    showConges ? vacations.filter(v => day >= v.startDate && day <= v.endDate) : [],
    [vacations, showConges])

  // CSV Export
  const handleExportCSV = () => {
    const header = 'Employé,Date,Début,Fin,Pause (min),Heures travaillées,Heures sup,Congé\n'
    const rows = shifts.map(s => {
      const hrs = s.endHour - s.startHour - (s.endMin - s.startMin) / 60
      const sup = Math.max(0, hrs - 8)
      return `${s.employeeName},${format(s.date, 'dd/MM/yyyy')},${String(s.startHour).padStart(2, '0')}:${String(s.startMin).padStart(2, '0')},${String(s.endHour).padStart(2, '0')}:${String(s.endMin).padStart(2, '0')},30,${hrs.toFixed(1)},${sup.toFixed(1)},Non`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `planning_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleShareEmail = () => {
    setToast('Planning envoyé par email')
    setTimeout(() => setToast(null), 3000)
  }

  const handleCellClick = (day: Date, hour: number) => {
    setAddDate(day)
    setAddHour(hour)
    setShowAddModal(true)
  }

  const headerLabel = view === 'week'
    ? `${format(weekDays[0], 'd MMM', { locale: fr })} — ${format(weekDays[6], 'd MMM yyyy', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#f1f5f9', padding: 24, gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Planning</h1>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={goPrev} style={{ ...btnGhost, padding: 8 }}><ChevronLeft size={18} /></button>
            <button onClick={goToday} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>Aujourd'hui</button>
            <button onClick={goNext} style={{ ...btnGhost, padding: 8 }}><ChevronRight size={18} /></button>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', textTransform: 'capitalize' }}>{headerLabel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* View switcher */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['week', 'month'] as ViewType[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                ...btnBase, borderRadius: 0, border: 'none', fontSize: 12, padding: '6px 14px',
                background: view === v ? 'rgba(99,102,241,0.3)' : 'transparent',
                color: view === v ? '#a5b4fc' : '#94a3b8',
              }}>
                {v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          {/* Section filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['Toutes', ...SECTIONS].map(s => (
              <button key={s} onClick={() => setSectionFilter(s)} style={{
                ...btnBase, fontSize: 11, padding: '5px 10px', borderRadius: 8,
                background: sectionFilter === s ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                color: sectionFilter === s ? '#a5b4fc' : '#64748b',
                border: sectionFilter === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
              }}>
                {s}
              </button>
            ))}
          </div>

          <button onClick={handleShareEmail} style={btnGhost}><Mail size={15} /> Partager</button>
          <button onClick={handleExportCSV} style={btnGhost}><Download size={15} /> Export CSV</button>
        </div>
      </motion.div>

      {/* Role legend + Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(Object.keys(ROLE_COLORS) as RoleType[]).map(role => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: ROLE_COLORS[role] }} />
              {role}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterCheckbox label="Shifts" checked={showShifts} onChange={setShowShifts} color="#6366f1" />
          <FilterCheckbox label="Congés" checked={showConges} onChange={setShowConges} color="#3b82f6" />
          <FilterCheckbox label="Maladies" checked={showMaladies} onChange={setShowMaladies} color="#ef4444" />
          <FilterCheckbox label="Réservations" checked={showReservations} onChange={setShowReservations} color="#a855f7" />
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'auto', ...glassCard, padding: 0 }}>
        {view === 'week' ? (
          <WeekView
            days={weekDays}
            shifts={getShiftsForDay}
            reservations={getReservationsForDay}
            sickLeaves={getSickLeavesForDay}
            vacations={getVacationsForDay}
            getHoliday={getHoliday}
            onCellClick={handleCellClick}
          />
        ) : (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            shifts={getShiftsForDay}
            getHoliday={getHoliday}
          />
        )}
      </div>

      {/* Add shift modal */}
      <AddShiftModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        date={addDate}
        hour={addHour}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
              padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 600,
              boxShadow: '0 8px 32px rgba(16,185,129,0.3)', zIndex: 9999,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Week View ──────────────────────────────────────────────────────────
function WeekView({ days, shifts, reservations, sickLeaves, vacations, getHoliday, onCellClick }: {
  days: Date[]
  shifts: (day: Date) => Shift[]
  reservations: (day: Date) => Reservation[]
  sickLeaves: (day: Date) => SickLeave[]
  vacations: (day: Date) => Vacation[]
  getHoliday: (day: Date) => Holiday | undefined
  onCellClick: (day: Date, hour: number) => void
}) {
  const CELL_H = 48
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: '100%' }}>
      {/* Header row */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0', textAlign: 'center', fontSize: 11, color: '#64748b' }} />
      {days.map((day, i) => {
        const holiday = getHoliday(day)
        return (
          <div key={i} style={{
            position: 'sticky', top: 0, zIndex: 5,
            background: holiday ? 'rgba(234,179,8,0.08)' : 'rgba(15,23,42,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
            padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{dayNames[i]}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: isToday(day) ? '#6366f1' : '#e2e8f0' }}>
              {format(day, 'd')}
            </div>
            {holiday && (
              <div style={{ fontSize: 9, color: '#eab308', marginTop: 2, fontWeight: 600 }}>{holiday.name}</div>
            )}
          </div>
        )
      })}

      {/* Time rows */}
      {HOURS.map(hour => (
        <>
          <div key={`t-${hour}`} style={{
            padding: '4px 8px', fontSize: 11, color: '#475569',
            textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.04)',
            height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          }}>
            {`${String(hour).padStart(2, '0')}:00`}
          </div>
          {days.map((day, di) => {
            const holiday = getHoliday(day)
            const dayShifts = shifts(day).filter(s => s.startHour <= hour && s.endHour > hour)
            const dayRes = reservations(day).filter(r => r.startHour <= hour && r.endHour > hour)
            const daySick = hour === 8 ? sickLeaves(day) : []
            const dayVac = hour === 6 ? vacations(day) : []
            return (
              <div
                key={`c-${hour}-${di}`}
                onClick={() => onCellClick(day, hour)}
                style={{
                  position: 'relative', height: CELL_H, cursor: 'pointer',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  borderLeft: '1px solid rgba(255,255,255,0.04)',
                  background: holiday ? 'rgba(234,179,8,0.03)' : 'transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = holiday ? 'rgba(234,179,8,0.06)' : 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = holiday ? 'rgba(234,179,8,0.03)' : 'transparent')}
              >
                {dayShifts.map((s, si) => (
                  s.startHour === hour && (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        position: 'absolute',
                        top: 2, left: 2 + si * 4,
                        right: 2 + (dayShifts.length - 1 - si) * 4,
                        height: (s.endHour - s.startHour) * CELL_H - 4,
                        background: ROLE_BG[s.role],
                        borderLeft: `3px solid ${ROLE_COLORS[s.role]}`,
                        borderRadius: 6, padding: '3px 6px', overflow: 'hidden',
                        fontSize: 10, color: '#e2e8f0', zIndex: 2,
                        cursor: 'default',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.employeeName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 9 }}>{`${String(s.startHour).padStart(2, '0')}:${String(s.startMin).padStart(2, '0')} - ${String(s.endHour).padStart(2, '0')}:${String(s.endMin).padStart(2, '0')}`}</div>
                    </motion.div>
                  )
                ))}
                {dayRes.map(r => (
                  r.startHour === hour && (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      style={{
                        position: 'absolute', bottom: 2, left: 2, right: 2,
                        height: (r.endHour - r.startHour) * CELL_H - 8,
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px dashed rgba(99,102,241,0.3)',
                        borderRadius: 6, padding: '2px 6px',
                        fontSize: 9, color: '#a5b4fc', zIndex: 1,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 600 }}>{r.guestName} ({r.partySize}p)</div>
                    </motion.div>
                  )
                ))}
                {/* Sick leave bars - red striped */}
                {daySick.map((sl, si) => (
                  <motion.div
                    key={sl.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      position: 'absolute',
                      top: 2 + si * 22, left: 2, right: 2,
                      height: 18, borderRadius: 4, zIndex: 3,
                      background: 'repeating-linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.25) 3px, rgba(239,68,68,0.08) 3px, rgba(239,68,68,0.08) 6px)',
                      borderLeft: '3px solid #ef4444',
                      padding: '1px 6px', overflow: 'hidden',
                      fontSize: 9, color: '#fca5a5', fontWeight: 600,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {sl.employeeName} — {sl.reason}
                  </motion.div>
                ))}
                {/* Vacation bars - blue */}
                {dayVac.map((v, vi) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      position: 'absolute',
                      top: 2 + vi * 22, left: 2, right: 2,
                      height: 18, borderRadius: 4, zIndex: 3,
                      background: 'rgba(59,130,246,0.2)',
                      borderLeft: '3px solid #3b82f6',
                      padding: '1px 6px', overflow: 'hidden',
                      fontSize: 9, color: '#93c5fd', fontWeight: 600,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {v.employeeName} — {v.label}
                  </motion.div>
                ))}
              </div>
            )
          })}
        </>
      ))}
    </div>
  )
}

// ── Month View ─────────────────────────────────────────────────────────
function MonthView({ days, currentDate, shifts, getHoliday }: {
  days: Date[]
  currentDate: Date
  shifts: (day: Date) => Shift[]
  getHoliday: (day: Date) => Holiday | undefined
}) {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const countByRole = (day: Date) => {
    const dayShifts = shifts(day)
    const counts: Partial<Record<RoleType, number>> = {}
    dayShifts.forEach(s => { counts[s.role] = (counts[s.role] || 0) + 1 })
    return counts
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, padding: '8px 0' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const holiday = getHoliday(day)
          const inMonth = isSameMonth(day, currentDate)
          const counts = countByRole(day)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008 }}
              style={{
                minHeight: 80, padding: 8, borderRadius: 10,
                background: holiday ? 'rgba(234,179,8,0.06)' : isToday(day) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                border: isToday(day) ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.04)',
                opacity: inMonth ? 1 : 0.3,
                cursor: 'pointer', transition: 'background .15s',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: isToday(day) ? '#6366f1' : '#e2e8f0', marginBottom: 4 }}>
                {format(day, 'd')}
              </div>
              {holiday && (
                <div style={{ fontSize: 9, color: '#eab308', fontWeight: 600, marginBottom: 4 }}>{holiday.name}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {(Object.entries(counts) as [RoleType, number][]).map(([role, count]) => (
                  <div key={role} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: ROLE_BG[role], color: ROLE_COLORS[role],
                  }}>
                    {count}
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Add Shift Modal ────────────────────────────────────────────────────
function AddShiftModal({ isOpen, onClose, date, hour }: {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  hour: number
}) {
  const [employee, setEmployee] = useState('')
  const [role, setRole] = useState<RoleType>('Serveur')
  const [section, setSection] = useState<SectionType>('Salle')
  const [startH, setStartH] = useState(hour)
  const [endH, setEndH] = useState(hour + 4)

  if (!isOpen || !date) return null

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
            width: 420, background: '#1e293b', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Ajouter un shift</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </div>
            <div>
              <label style={labelStyle}>Employé</label>
              <input style={inputStyle} placeholder="Nom de l'employé" value={employee} onChange={e => setEmployee(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Rôle</label>
                <select style={selectStyle} value={role} onChange={e => setRole(e.target.value as RoleType)}>
                  {(Object.keys(ROLE_COLORS) as RoleType[]).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={selectStyle} value={section} onChange={e => setSection(e.target.value as SectionType)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Début</label>
                <select style={selectStyle} value={startH} onChange={e => setStartH(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fin</label>
                <select style={selectStyle} value={endH} onChange={e => setEndH(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={onClose} style={btnPrimary}><Plus size={15} /> Ajouter</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

// ── Filter Checkbox ───────────────────────────────────────────────────
function FilterCheckbox({ label, checked, onChange, color }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  color: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        background: checked ? `${color}22` : 'rgba(255,255,255,0.04)',
        color: checked ? color : '#64748b',
        border: checked ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer', transition: 'all .2s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        border: checked ? `2px solid ${color}` : '2px solid #475569',
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .2s',
      }}>
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4L3 6L7 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {label}
    </button>
  )
}
