import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, X, Users, Phone,
  Mail, Clock, MapPin, Filter, Calendar,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
type ViewType = 'day' | 'week' | 'month'
type SectionType = 'Salle Principale' | 'Bar' | 'Terrasse'
type StatusType = 'Confirmée' | 'En attente' | 'Annulée'

interface Reservation {
  id: string
  guestName: string
  phone: string
  email: string
  date: Date
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  partySize: number
  section: SectionType
  table: string
  status: StatusType
  notes: string
}

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<StatusType, string> = {
  'Confirmée': '#10b981',
  'En attente': '#eab308',
  'Annulée': '#ef4444',
}

const STATUS_BG: Record<StatusType, string> = {
  'Confirmée': 'rgba(16,185,129,0.15)',
  'En attente': 'rgba(234,179,8,0.15)',
  'Annulée': 'rgba(239,68,68,0.15)',
}

const SECTION_COLORS: Record<SectionType, string> = {
  'Salle Principale': '#6366f1',
  'Bar': '#f97316',
  'Terrasse': '#06b6d4',
}

const SECTIONS: SectionType[] = ['Salle Principale', 'Bar', 'Terrasse']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

// ── Mock data ──────────────────────────────────────────────────────────
function generateMockReservations(): Reservation[] {
  const today = new Date()
  const ws = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'r1', guestName: 'Famille Braun', phone: '+352 621 111 222', email: 'braun@email.lu', date: addDays(ws, 0), startHour: 12, startMin: 0, endHour: 14, endMin: 0, partySize: 6, section: 'Salle Principale', table: 'T3-T4', status: 'Confirmée', notes: 'Anniversaire enfant' },
    { id: 'r2', guestName: 'M. Hoffmann', phone: '+352 621 222 333', email: 'hoffmann@email.lu', date: addDays(ws, 1), startHour: 19, startMin: 30, endHour: 21, endMin: 30, partySize: 2, section: 'Terrasse', table: 'T12', status: 'Confirmée', notes: 'Dîner romantique' },
    { id: 'r3', guestName: 'Société LuxCorp', phone: '+352 26 111 222', email: 'events@luxcorp.lu', date: addDays(ws, 2), startHour: 12, startMin: 0, endHour: 14, endMin: 30, partySize: 12, section: 'Salle Principale', table: 'Grande table', status: 'Confirmée', notes: 'Déjeuner affaires' },
    { id: 'r4', guestName: 'Mme Kieffer', phone: '+352 621 333 444', email: 'kieffer@email.lu', date: addDays(ws, 2), startHour: 20, startMin: 0, endHour: 22, endMin: 0, partySize: 4, section: 'Bar', table: 'B2', status: 'En attente', notes: '' },
    { id: 'r5', guestName: 'Groupe Lux Events', phone: '+352 621 444 555', email: 'info@luxevents.lu', date: addDays(ws, 4), startHour: 19, startMin: 0, endHour: 22, endMin: 30, partySize: 8, section: 'Salle Principale', table: 'T5-T6-T7', status: 'Confirmée', notes: 'Menu spécial commandé' },
    { id: 'r6', guestName: 'Pierre Reuter', phone: '+352 621 555 666', email: 'reuter@email.lu', date: addDays(ws, 5), startHour: 12, startMin: 30, endHour: 14, endMin: 0, partySize: 3, section: 'Terrasse', table: 'T14', status: 'En attente', notes: 'Allergie noix' },
    { id: 'r7', guestName: 'Mme Schneider', phone: '+352 621 666 777', email: 'schneider@email.lu', date: addDays(ws, 5), startHour: 19, startMin: 0, endHour: 21, endMin: 0, partySize: 5, section: 'Salle Principale', table: 'T8', status: 'Confirmée', notes: '' },
    { id: 'r8', guestName: 'M. Thill', phone: '+352 621 777 888', email: 'thill@email.lu', date: addDays(ws, 6), startHour: 12, startMin: 0, endHour: 13, endMin: 30, partySize: 2, section: 'Bar', table: 'B4', status: 'Annulée', notes: 'Annulé par le client' },
    { id: 'r9', guestName: 'Famille Weiss', phone: '+352 621 888 999', email: 'weiss@email.lu', date: addDays(ws, 6), startHour: 18, startMin: 30, endHour: 21, endMin: 0, partySize: 7, section: 'Salle Principale', table: 'T1-T2', status: 'Confirmée', notes: 'Chaise haute nécessaire' },
    { id: 'r10', guestName: 'Dr. Meyer', phone: '+352 621 999 000', email: 'meyer@email.lu', date: addDays(ws, 3), startHour: 12, startMin: 0, endHour: 13, endMin: 30, partySize: 1, section: 'Bar', table: 'B1', status: 'En attente', notes: '' },
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
export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('week')
  const [sectionFilter, setSectionFilter] = useState<string>('Toutes')
  const [reservations] = useState<Reservation[]>(generateMockReservations)
  const [showModal, setShowModal] = useState(false)
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)

  const goNext = () => setCurrentDate(v => view === 'month' ? addMonths(v, 1) : addWeeks(v, 1))
  const goPrev = () => setCurrentDate(v => view === 'month' ? subMonths(v, 1) : subWeeks(v, 1))
  const goToday = () => setCurrentDate(new Date())

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])
  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [monthStart, monthEnd])

  const filteredRes = useMemo(() =>
    sectionFilter === 'Toutes' ? reservations : reservations.filter(r => r.section === sectionFilter),
    [reservations, sectionFilter])

  const getResForDay = useCallback((day: Date) =>
    filteredRes.filter(r => isSameDay(r.date, day)),
    [filteredRes])

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: fr })
    : view === 'day'
    ? format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
    : `${format(weekDays[0], 'd MMM', { locale: fr })} — ${format(weekDays[6], 'd MMM yyyy', { locale: fr })}`

  // Stats
  const todayRes = reservations.filter(r => isSameDay(r.date, new Date()))
  const totalGuests = todayRes.reduce((sum, r) => sum + r.partySize, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#f1f5f9', padding: 24, gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Calendrier des réservations</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={btnPrimary}><Plus size={16} /> Nouvelle réservation</button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div style={{ ...glassCard, padding: '14px 18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Aujourd'hui</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{todayRes.length}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>réservations</div>
        </div>
        <div style={{ ...glassCard, padding: '14px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Couverts</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{totalGuests}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>personnes</div>
        </div>
        <div style={{ ...glassCard, padding: '14px 18px', background: 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(255,255,255,0.02))' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>En attente</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#eab308' }}>{reservations.filter(r => r.status === 'En attente').length}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>à confirmer</div>
        </div>
      </motion.div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={goPrev} style={{ ...btnGhost, padding: 8 }}><ChevronLeft size={18} /></button>
          <button onClick={goToday} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>Aujourd'hui</button>
          <button onClick={goNext} style={{ ...btnGhost, padding: 8 }}><ChevronRight size={18} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', textTransform: 'capitalize', marginLeft: 8 }}>{headerLabel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View switcher */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {(['day', 'week', 'month'] as ViewType[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                ...btnBase, borderRadius: 0, border: 'none', fontSize: 12, padding: '6px 14px',
                background: view === v ? 'rgba(99,102,241,0.3)' : 'transparent',
                color: view === v ? '#a5b4fc' : '#94a3b8',
              }}>
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
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
        </div>
      </div>

      {/* Section legend */}
      <div style={{ display: 'flex', gap: 14 }}>
        {SECTIONS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: SECTION_COLORS[s] }} /> {s}
          </div>
        ))}
        <div style={{ marginLeft: 16, display: 'flex', gap: 10 }}>
          {(Object.keys(STATUS_COLORS) as StatusType[]).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] }} /> {s}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'auto', ...glassCard, padding: 0 }}>
        {view === 'week' && (
          <WeekView days={weekDays} getRes={getResForDay} onSelect={setSelectedRes} />
        )}
        {view === 'day' && (
          <DayView day={currentDate} reservations={getResForDay(currentDate)} onSelect={setSelectedRes} />
        )}
        {view === 'month' && (
          <MonthView days={monthDays} currentDate={currentDate} getRes={getResForDay} onSelect={setSelectedRes} />
        )}
      </div>

      {/* New reservation modal */}
      <NewReservationModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* Reservation detail */}
      <ReservationDetail reservation={selectedRes} onClose={() => setSelectedRes(null)} />
    </div>
  )
}

// ── Reservation block component ────────────────────────────────────────
function ResBlock({ res, onClick }: { res: Reservation; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      style={{
        padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
        background: STATUS_BG[res.status],
        borderLeft: `3px solid ${STATUS_COLORS[res.status]}`,
        marginBottom: 3, transition: 'transform .15s',
        opacity: res.status === 'Annulée' ? 0.45 : 1,
      }}
      whileHover={{ scale: 1.02 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
        <span>{res.guestName}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>({res.partySize}p)</span>
      </div>
      <div style={{ fontSize: 9, color: '#64748b', display: 'flex', gap: 6 }}>
        <span>{`${String(res.startHour).padStart(2, '0')}:${String(res.startMin).padStart(2, '0')} - ${String(res.endHour).padStart(2, '0')}:${String(res.endMin).padStart(2, '0')}`}</span>
        <span style={{ color: SECTION_COLORS[res.section], fontWeight: 600 }}>{res.table}</span>
      </div>
    </motion.div>
  )
}

// ── Week View ──────────────────────────────────────────────────────────
function WeekView({ days, getRes, onSelect }: {
  days: Date[]
  getRes: (day: Date) => Reservation[]
  onSelect: (res: Reservation) => void
}) {
  const CELL_H = 44
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
      {days.map((day, i) => (
        <div key={i} style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(15,23,42,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          borderLeft: '1px solid rgba(255,255,255,0.04)',
          padding: '8px 6px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{dayNames[i]}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isToday(day) ? '#6366f1' : '#e2e8f0' }}>
            {format(day, 'd')}
          </div>
        </div>
      ))}

      {/* Time grid */}
      {HOURS.map(hour => (
        <>
          <div key={`t-${hour}`} style={{
            padding: '4px 6px', fontSize: 10, color: '#475569',
            textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.04)',
            height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          }}>
            {`${String(hour).padStart(2, '0')}:00`}
          </div>
          {days.map((day, di) => {
            const dayRes = getRes(day).filter(r => r.startHour === hour)
            return (
              <div key={`c-${hour}-${di}`} style={{
                position: 'relative', height: CELL_H,
                borderTop: '1px solid rgba(255,255,255,0.04)',
                borderLeft: '1px solid rgba(255,255,255,0.04)',
              }}>
                {dayRes.map(r => (
                  <ResBlock key={r.id} res={r} onClick={() => onSelect(r)} />
                ))}
              </div>
            )
          })}
        </>
      ))}
    </div>
  )
}

// ── Day View ───────────────────────────────────────────────────────────
function DayView({ day, reservations, onSelect }: {
  day: Date
  reservations: Reservation[]
  onSelect: (res: Reservation) => void
}) {
  const CELL_H = 56

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', minHeight: '100%' }}>
      {HOURS.map(hour => {
        const hourRes = reservations.filter(r => r.startHour === hour)
        return (
          <>
            <div key={`t-${hour}`} style={{
              padding: '6px 8px', fontSize: 11, color: '#475569',
              textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.04)',
              height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            }}>
              {`${String(hour).padStart(2, '0')}:00`}
            </div>
            <div key={`c-${hour}`} style={{
              height: CELL_H, padding: 4,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {hourRes.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => onSelect(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
                    borderRadius: 10, cursor: 'pointer',
                    background: STATUS_BG[r.status],
                    borderLeft: `3px solid ${STATUS_COLORS[r.status]}`,
                    opacity: r.status === 'Annulée' ? 0.45 : 1,
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.guestName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {r.partySize} pers. | {r.table} | <span style={{ color: SECTION_COLORS[r.section] }}>{r.section}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc' }}>
                    {`${String(r.startHour).padStart(2, '0')}:${String(r.startMin).padStart(2, '0')}`}
                  </div>
                  <div style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: STATUS_BG[r.status], color: STATUS_COLORS[r.status],
                    border: `1px solid ${STATUS_COLORS[r.status]}33`,
                  }}>
                    {r.status}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )
      })}
    </div>
  )
}

// ── Month View ─────────────────────────────────────────────────────────
function MonthView({ days, currentDate, getRes, onSelect }: {
  days: Date[]
  currentDate: Date
  getRes: (day: Date) => Reservation[]
  onSelect: (res: Reservation) => void
}) {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, padding: '8px 0' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dayRes = getRes(day)
          const inMonth = isSameMonth(day, currentDate)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.005 }}
              style={{
                minHeight: 80, padding: 6, borderRadius: 10,
                background: isToday(day) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                border: isToday(day) ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.04)',
                opacity: inMonth ? 1 : 0.25,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isToday(day) ? '#6366f1' : '#e2e8f0' }}>
                  {format(day, 'd')}
                </span>
                {dayRes.length > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                    background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  }}>
                    {dayRes.length}
                  </span>
                )}
              </div>
              {dayRes.slice(0, 2).map(r => (
                <ResBlock key={r.id} res={r} onClick={() => onSelect(r)} />
              ))}
              {dayRes.length > 2 && (
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textAlign: 'center', marginTop: 2 }}>
                  +{dayRes.length - 2} autres
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Reservation Detail Drawer ──────────────────────────────────────────
function ReservationDetail({ reservation, onClose }: {
  reservation: Reservation | null
  onClose: () => void
}) {
  if (!reservation) return null
  const r = reservation

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
            width: 400, background: '#1e293b', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Détail réservation</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{r.guestName}</span>
              <span style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: STATUS_BG[r.status], color: STATUS_COLORS[r.status],
              }}>
                {r.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <Calendar size={15} />
                {format(r.date, 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <Clock size={15} />
                {`${String(r.startHour).padStart(2, '0')}:${String(r.startMin).padStart(2, '0')} — ${String(r.endHour).padStart(2, '0')}:${String(r.endMin).padStart(2, '0')}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <Users size={15} /> {r.partySize} personnes
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <MapPin size={15} />
                <span style={{ color: SECTION_COLORS[r.section], fontWeight: 600 }}>{r.section}</span> — Table {r.table}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <Phone size={15} /> {r.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <Mail size={15} /> {r.email}
              </div>
            </div>

            {r.notes && (
              <div style={{
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 13, color: '#94a3b8', fontStyle: 'italic',
              }}>
                {r.notes}
              </div>
            )}

            <button onClick={onClose} style={{ ...btnGhost, justifyContent: 'center', marginTop: 4 }}>Fermer</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

// ── New Reservation Modal ──────────────────────────────────────────────
function NewReservationModal({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState(2)
  const [section, setSection] = useState<SectionType>('Salle Principale')
  const [notes, setNotes] = useState('')

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
            width: 460, maxHeight: '90vh', overflow: 'auto',
            background: '#1e293b', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#1e293b', zIndex: 2 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nouvelle réservation</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nom du client</label>
              <input style={inputStyle} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nom complet" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+352 ..." />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." type="email" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Heure</label>
                <input type="time" style={inputStyle} value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre de personnes</label>
                <input type="number" min={1} max={50} style={inputStyle} value={partySize} onChange={e => setPartySize(+e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={selectStyle} value={section} onChange={e => setSection(e.target.value as SectionType)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Allergies, demandes spéciales..."
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={onClose} style={btnPrimary}><Plus size={15} /> Réserver</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
