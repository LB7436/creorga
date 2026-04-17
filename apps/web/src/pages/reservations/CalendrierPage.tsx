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
  Mail, Clock, MapPin, Calendar, Sparkles, CreditCard,
  AlertTriangle, TrendingUp, Cake, Briefcase, Heart,
  Utensils, Send, Timer, Target, History, UserPlus,
  CheckCircle2, Bell, Zap, Euro, Layers, MessageSquare,
} from 'lucide-react'

// Theme
const C = {
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',
  indigo: '#6366f1',
  indigoSoft: '#eef2ff',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  green: '#10b981',
  greenSoft: '#d1fae5',
  red: '#ef4444',
  redSoft: '#fee2e2',
  cyan: '#06b6d4',
  cyanSoft: '#cffafe',
  rose: '#f43f5e',
  roseSoft: '#ffe4e6',
  orange: '#f97316',
  orangeSoft: '#ffedd5',
}

type ViewType = 'day' | 'week' | 'month'
type SectionType = 'Salle Principale' | 'Bar' | 'Terrasse'
type StatusType = 'Confirmée' | 'En attente' | 'Annulée' | 'Liste d\'attente'
type Occasion = 'Standard' | 'Anniversaire' | 'Affaires' | 'Romantique' | 'Famille' | 'Groupe'

interface GuestHistory {
  visits: number
  preferredTable?: string
  dietary?: string
  lastVisit?: Date
  avgSpend?: number
}

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
  occasion: Occasion
  depositAmount?: number
  depositPaid?: boolean
  cardOnFile?: boolean
  minSpend?: number
  history?: GuestHistory
  seatedAt?: Date
  linkedEvent?: string
  linkedCatering?: string
}

interface WaitlistEntry {
  id: string
  guestName: string
  phone: string
  partySize: number
  requestedTime: string
  addedAt: Date
  notified: boolean
}

const STATUS_COLORS: Record<StatusType, string> = {
  'Confirmée': C.green,
  'En attente': C.amber,
  'Annulée': C.red,
  'Liste d\'attente': C.cyan,
}

const STATUS_BG: Record<StatusType, string> = {
  'Confirmée': C.greenSoft,
  'En attente': C.amberSoft,
  'Annulée': C.redSoft,
  'Liste d\'attente': C.cyanSoft,
}

const SECTION_COLORS: Record<SectionType, string> = {
  'Salle Principale': C.indigo,
  'Bar': C.orange,
  'Terrasse': C.cyan,
}

const OCCASION_ICONS: Record<Occasion, typeof Cake> = {
  'Standard': Utensils,
  'Anniversaire': Cake,
  'Affaires': Briefcase,
  'Romantique': Heart,
  'Famille': Users,
  'Groupe': Layers,
}

const SECTIONS: SectionType[] = ['Salle Principale', 'Bar', 'Terrasse']
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const PEAK_HOURS = [12, 13, 19, 20]

// Available tables pool for smart assignment
const AVAILABLE_TABLES = [
  { id: 'T1', section: 'Salle Principale' as SectionType, capacity: 2, preferences: ['Vue terrasse', 'Calme'] },
  { id: 'T2', section: 'Salle Principale' as SectionType, capacity: 2, preferences: ['Vue terrasse'] },
  { id: 'T3', section: 'Salle Principale' as SectionType, capacity: 4, preferences: ['Central'] },
  { id: 'T4', section: 'Salle Principale' as SectionType, capacity: 4, preferences: ['Central'] },
  { id: 'T5', section: 'Salle Principale' as SectionType, capacity: 6, preferences: ['Grande table', 'Famille'] },
  { id: 'T6', section: 'Salle Principale' as SectionType, capacity: 6, preferences: ['Grande table'] },
  { id: 'T7', section: 'Salle Principale' as SectionType, capacity: 8, preferences: ['Groupe'] },
  { id: 'T8', section: 'Salle Principale' as SectionType, capacity: 4, preferences: ['Romantique', 'Intime'] },
  { id: 'B1', section: 'Bar' as SectionType, capacity: 2, preferences: ['Rapide'] },
  { id: 'B2', section: 'Bar' as SectionType, capacity: 4, preferences: ['Bar'] },
  { id: 'B4', section: 'Bar' as SectionType, capacity: 2, preferences: ['Bar'] },
  { id: 'T12', section: 'Terrasse' as SectionType, capacity: 2, preferences: ['Vue', 'Romantique'] },
  { id: 'T14', section: 'Terrasse' as SectionType, capacity: 4, preferences: ['Vue'] },
]

function generateMockReservations(): Reservation[] {
  const today = new Date()
  const ws = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'r1', guestName: 'Famille Braun', phone: '+352 621 111 222', email: 'braun@email.lu', date: addDays(ws, 0), startHour: 12, startMin: 0, endHour: 14, endMin: 0, partySize: 6, section: 'Salle Principale', table: 'T3-T4', status: 'Confirmée', notes: 'Anniversaire enfant - 8 ans', occasion: 'Anniversaire', depositAmount: 60, depositPaid: true, minSpend: 180, history: { visits: 7, preferredTable: 'T3', dietary: 'Allergie arachide (Tom)', lastVisit: addDays(today, -14), avgSpend: 145 } },
    { id: 'r2', guestName: 'M. Hoffmann', phone: '+352 621 222 333', email: 'hoffmann@email.lu', date: addDays(ws, 1), startHour: 19, startMin: 30, endHour: 21, endMin: 30, partySize: 2, section: 'Terrasse', table: 'T12', status: 'Confirmée', notes: 'Dîner romantique - demande fleurs', occasion: 'Romantique', cardOnFile: true, minSpend: 90, history: { visits: 3, preferredTable: 'T12', dietary: 'Végétarien', lastVisit: addDays(today, -45), avgSpend: 95 } },
    { id: 'r3', guestName: 'Société LuxCorp', phone: '+352 26 111 222', email: 'events@luxcorp.lu', date: addDays(ws, 2), startHour: 12, startMin: 0, endHour: 14, endMin: 30, partySize: 12, section: 'Salle Principale', table: 'Grande table', status: 'Confirmée', notes: 'Déjeuner affaires - facture entreprise', occasion: 'Affaires', depositAmount: 240, depositPaid: true, minSpend: 600, linkedCatering: 'CAT-2892', history: { visits: 12, preferredTable: 'Grande table', lastVisit: addDays(today, -7), avgSpend: 680 } },
    { id: 'r4', guestName: 'Mme Kieffer', phone: '+352 621 333 444', email: 'kieffer@email.lu', date: addDays(ws, 2), startHour: 20, startMin: 0, endHour: 22, endMin: 0, partySize: 4, section: 'Bar', table: 'B2', status: 'En attente', notes: 'En attente de confirmation CB', occasion: 'Standard', cardOnFile: false, history: { visits: 1, lastVisit: addDays(today, -90), avgSpend: 62 } },
    { id: 'r5', guestName: 'Groupe Lux Events', phone: '+352 621 444 555', email: 'info@luxevents.lu', date: addDays(ws, 4), startHour: 19, startMin: 0, endHour: 22, endMin: 30, partySize: 8, section: 'Salle Principale', table: 'T5-T6-T7', status: 'Confirmée', notes: 'Menu spécial commandé - 6 plats', occasion: 'Groupe', depositAmount: 200, depositPaid: true, minSpend: 480, linkedEvent: 'EVT-1142', history: { visits: 4, lastVisit: addDays(today, -60), avgSpend: 520 } },
    { id: 'r6', guestName: 'Pierre Reuter', phone: '+352 621 555 666', email: 'reuter@email.lu', date: addDays(ws, 5), startHour: 12, startMin: 30, endHour: 14, endMin: 0, partySize: 3, section: 'Terrasse', table: 'T14', status: 'En attente', notes: 'Allergie noix sévère', occasion: 'Famille', history: { visits: 5, preferredTable: 'T14', dietary: 'Allergie noix', lastVisit: addDays(today, -21), avgSpend: 85 } },
    { id: 'r7', guestName: 'Mme Schneider', phone: '+352 621 666 777', email: 'schneider@email.lu', date: addDays(ws, 5), startHour: 19, startMin: 0, endHour: 21, endMin: 0, partySize: 5, section: 'Salle Principale', table: 'T8', status: 'Confirmée', notes: 'Anniversaire mariage', occasion: 'Anniversaire', depositAmount: 75, depositPaid: true, cardOnFile: true, minSpend: 150, history: { visits: 9, preferredTable: 'T8', lastVisit: addDays(today, -30), avgSpend: 175 } },
    { id: 'r8', guestName: 'M. Thill', phone: '+352 621 777 888', email: 'thill@email.lu', date: addDays(ws, 6), startHour: 12, startMin: 0, endHour: 13, endMin: 30, partySize: 2, section: 'Bar', table: 'B4', status: 'Annulée', notes: 'Annulé par le client', occasion: 'Standard', history: { visits: 2, lastVisit: addDays(today, -120) } },
    { id: 'r9', guestName: 'Famille Weiss', phone: '+352 621 888 999', email: 'weiss@email.lu', date: addDays(ws, 6), startHour: 18, startMin: 30, endHour: 21, endMin: 0, partySize: 7, section: 'Salle Principale', table: 'T1-T2', status: 'Confirmée', notes: 'Chaise haute + menu enfant', occasion: 'Famille', depositAmount: 100, depositPaid: false, cardOnFile: true, minSpend: 210, history: { visits: 6, lastVisit: addDays(today, -15), avgSpend: 195 } },
    { id: 'r10', guestName: 'Dr. Meyer', phone: '+352 621 999 000', email: 'meyer@email.lu', date: addDays(ws, 3), startHour: 12, startMin: 0, endHour: 13, endMin: 30, partySize: 1, section: 'Bar', table: 'B1', status: 'En attente', notes: 'Déjeuner rapide entre consultations', occasion: 'Affaires', history: { visits: 15, preferredTable: 'B1', lastVisit: addDays(today, -3), avgSpend: 38 } },
  ]
}

function generateMockWaitlist(): WaitlistEntry[] {
  return [
    { id: 'w1', guestName: 'M. Diederich', phone: '+352 661 111 222', partySize: 2, requestedTime: 'Ven. 20:00', addedAt: new Date(), notified: false },
    { id: 'w2', guestName: 'Famille Lux', phone: '+352 661 333 444', partySize: 5, requestedTime: 'Sam. 19:30', addedAt: new Date(), notified: true },
    { id: 'w3', guestName: 'Mme Frank', phone: '+352 661 555 666', partySize: 3, requestedTime: 'Dim. 12:30', addedAt: new Date(), notified: false },
  ]
}

// Smart table assignment algorithm
function suggestBestTable(partySize: number, section: SectionType, occasion: Occasion, history?: GuestHistory) {
  const candidates = AVAILABLE_TABLES.filter(t =>
    t.section === section && t.capacity >= partySize && t.capacity <= partySize + 2
  )
  if (history?.preferredTable) {
    const preferred = candidates.find(t => t.id === history.preferredTable)
    if (preferred) return { table: preferred, reason: 'Table préférée du client' }
  }
  if (occasion === 'Romantique') {
    const intime = candidates.find(t => t.preferences.includes('Romantique') || t.preferences.includes('Intime'))
    if (intime) return { table: intime, reason: 'Ambiance intime pour occasion romantique' }
  }
  if (occasion === 'Groupe' || partySize >= 6) {
    const grande = candidates.find(t => t.preferences.includes('Grande table') || t.preferences.includes('Groupe'))
    if (grande) return { table: grande, reason: 'Table adaptée aux groupes' }
  }
  const best = candidates.sort((a, b) => a.capacity - b.capacity)[0]
  return best ? { table: best, reason: 'Meilleure correspondance par capacité' } : null
}

function getPeakPricing(hour: number): number | null {
  if (PEAK_HOURS.includes(hour)) return 45
  return null
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase, background: C.indigo, color: '#fff',
}

const btnGhost: React.CSSProperties = {
  ...btnBase, background: C.card, color: C.text, border: `1px solid ${C.border}`,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  background: C.card, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13, outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6,
}

const card: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
}

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('week')
  const [sectionFilter, setSectionFilter] = useState<string>('Toutes')
  const [reservations, setReservations] = useState<Reservation[]>(generateMockReservations)
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(generateMockWaitlist)
  const [showModal, setShowModal] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

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

  const todayRes = reservations.filter(r => isSameDay(r.date, new Date()))
  const totalGuests = todayRes.reduce((sum, r) => sum + r.partySize, 0)
  const pendingDeposits = reservations.filter(r => r.depositAmount && !r.depositPaid).length
  const atRisk = reservations.filter(r => PEAK_HOURS.includes(r.startHour) && !r.cardOnFile && r.status !== 'Annulée').length

  const notifyWaitlist = (id: string) => {
    setWaitlist(wl => wl.map(w => w.id === id ? { ...w, notified: true } : w))
    showToast('SMS envoyé au client en liste d\'attente')
  }

  const confirmReservation = (id: string) => {
    setReservations(rs => rs.map(r => r.id === id ? { ...r, status: 'Confirmée' as StatusType } : r))
    showToast('Réservation confirmée - Email envoyé')
    setSelectedRes(null)
  }

  const sendReminder = (id: string) => {
    showToast('Rappel SMS + Email programmé (24h avant)')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.text, padding: 24, gap: 16, overflow: 'hidden' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={24} color={C.indigo} /> Calendrier des réservations
          </h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Gestion intelligente avec assignation auto, liste d'attente et protection no-show
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowWaitlist(true)} style={btnGhost}>
            <Bell size={15} /> Liste d'attente ({waitlist.length})
          </button>
          <button onClick={() => setShowWalkIn(true)} style={{ ...btnGhost, background: C.orangeSoft, color: C.orange, border: `1px solid ${C.orange}44` }}>
            <UserPlus size={15} /> Walk-in
          </button>
          <button onClick={() => setShowModal(true)} style={btnPrimary}>
            <Plus size={15} /> Nouvelle réservation
          </button>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={<CheckCircle2 size={16} />} label="Aujourd'hui" value={todayRes.length} sub="réservations" color={C.green} bg={C.greenSoft} />
        <StatCard icon={<Users size={16} />} label="Couverts" value={totalGuests} sub="personnes" color={C.indigo} bg={C.indigoSoft} />
        <StatCard icon={<Clock size={16} />} label="En attente" value={reservations.filter(r => r.status === 'En attente').length} sub="à confirmer" color={C.amber} bg={C.amberSoft} />
        <StatCard icon={<Euro size={16} />} label="Acomptes" value={pendingDeposits} sub="non réglés" color={C.rose} bg={C.roseSoft} />
        <StatCard icon={<AlertTriangle size={16} />} label="Risque no-show" value={atRisk} sub="heures de pointe" color={C.red} bg={C.redSoft} />
      </motion.div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={goPrev} style={{ ...btnGhost, padding: 8 }}><ChevronLeft size={18} /></button>
          <button onClick={goToday} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>Aujourd'hui</button>
          <button onClick={goNext} style={{ ...btnGhost, padding: 8 }}><ChevronRight size={18} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, textTransform: 'capitalize', marginLeft: 8 }}>{headerLabel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card }}>
            {(['day', 'week', 'month'] as ViewType[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                ...btnBase, borderRadius: 0, border: 'none', fontSize: 12, padding: '6px 14px',
                background: view === v ? C.indigoSoft : 'transparent',
                color: view === v ? C.indigo : C.muted,
              }}>
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {['Toutes', ...SECTIONS].map(s => (
              <button key={s} onClick={() => setSectionFilter(s)} style={{
                ...btnBase, fontSize: 11, padding: '5px 10px', borderRadius: 8,
                background: sectionFilter === s ? C.indigoSoft : C.card,
                color: sectionFilter === s ? C.indigo : C.muted,
                border: sectionFilter === s ? `1px solid ${C.indigo}55` : `1px solid ${C.border}`,
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + turn time goal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: SECTION_COLORS[s] }} /> {s}
            </div>
          ))}
          <div style={{ marginLeft: 12, display: 'flex', gap: 10 }}>
            {(Object.keys(STATUS_COLORS) as StatusType[]).map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] }} /> {s}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: C.indigoSoft, borderRadius: 20, color: C.indigo, fontSize: 11, fontWeight: 600 }}>
          <Target size={13} /> Objectif turn-time : 90 min midi · 120 min soir
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: 'auto', ...card, padding: 0 }}>
        {view === 'week' && <WeekView days={weekDays} getRes={getResForDay} onSelect={setSelectedRes} />}
        {view === 'day' && <DayView day={currentDate} reservations={getResForDay(currentDate)} onSelect={setSelectedRes} />}
        {view === 'month' && <MonthView days={monthDays} currentDate={currentDate} getRes={getResForDay} onSelect={setSelectedRes} />}
      </div>

      <NewReservationModal isOpen={showModal} onClose={() => setShowModal(false)} onToast={showToast} />
      <WalkInModal isOpen={showWalkIn} onClose={() => setShowWalkIn(false)} onToast={showToast} />
      <WaitlistModal isOpen={showWaitlist} onClose={() => setShowWaitlist(false)} waitlist={waitlist} onNotify={notifyWaitlist} />
      <ReservationDetail reservation={selectedRes} onClose={() => setSelectedRes(null)} onConfirm={confirmReservation} onSendReminder={sendReminder} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              background: C.text, color: '#fff', padding: '12px 22px',
              borderRadius: 12, fontSize: 13, fontWeight: 600,
              boxShadow: '0 10px 30px rgba(15,23,42,0.25)', zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <CheckCircle2 size={16} color={C.green} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode; label: string; value: number; sub: string; color: string; bg: string
}) {
  return (
    <div style={{ ...card, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <div style={{ background: bg, padding: 5, borderRadius: 8, display: 'inline-flex' }}>{icon}</div>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
    </div>
  )
}

function ResBlock({ res, onClick }: { res: Reservation; onClick: () => void }) {
  const Icon = OCCASION_ICONS[res.occasion]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      style={{
        padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
        background: STATUS_BG[res.status],
        borderLeft: `3px solid ${STATUS_COLORS[res.status]}`,
        marginBottom: 3,
        opacity: res.status === 'Annulée' ? 0.5 : 1,
      }}
      whileHover={{ scale: 1.02 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: C.text }}>
        <Icon size={10} color={SECTION_COLORS[res.section]} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.guestName}</span>
        <span style={{ fontSize: 10, color: C.muted }}>({res.partySize}p)</span>
      </div>
      <div style={{ fontSize: 9, color: C.muted, display: 'flex', gap: 6 }}>
        <span>{`${String(res.startHour).padStart(2, '0')}:${String(res.startMin).padStart(2, '0')}`}</span>
        <span style={{ color: SECTION_COLORS[res.section], fontWeight: 600 }}>{res.table}</span>
      </div>
    </motion.div>
  )
}

function WeekView({ days, getRes, onSelect }: {
  days: Date[]; getRes: (day: Date) => Reservation[]; onSelect: (res: Reservation) => void
}) {
  const CELL_H = 46
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: C.card, borderBottom: `1px solid ${C.border}` }} />
      {days.map((day, i) => (
        <div key={i} style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: C.card, borderBottom: `1px solid ${C.border}`,
          borderLeft: `1px solid ${C.borderSoft}`,
          padding: '8px 6px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{dayNames[i]}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isToday(day) ? C.indigo : C.text }}>
            {format(day, 'd')}
          </div>
        </div>
      ))}

      {HOURS.map(hour => (
        <div key={`row-${hour}`} style={{ display: 'contents' }}>
          <div style={{
            padding: '4px 6px', fontSize: 10, color: C.muted,
            textAlign: 'right', borderTop: `1px solid ${C.borderSoft}`,
            height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            gap: 4,
          }}>
            <span>{`${String(hour).padStart(2, '0')}:00`}</span>
            {PEAK_HOURS.includes(hour) && <TrendingUp size={9} color={C.amber} />}
          </div>
          {days.map((day, di) => {
            const dayRes = getRes(day).filter(r => r.startHour === hour)
            const isPeak = PEAK_HOURS.includes(hour)
            return (
              <div key={`c-${hour}-${di}`} style={{
                position: 'relative', height: CELL_H,
                borderTop: `1px solid ${C.borderSoft}`,
                borderLeft: `1px solid ${C.borderSoft}`,
                background: isPeak ? 'rgba(245,158,11,0.03)' : 'transparent',
              }}>
                {dayRes.map(r => <ResBlock key={r.id} res={r} onClick={() => onSelect(r)} />)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function DayView({ day, reservations, onSelect }: {
  day: Date; reservations: Reservation[]; onSelect: (res: Reservation) => void
}) {
  const CELL_H = 60

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', minHeight: '100%' }}>
      {HOURS.map(hour => {
        const hourRes = reservations.filter(r => r.startHour === hour)
        const peak = PEAK_HOURS.includes(hour)
        const minSpend = getPeakPricing(hour)
        return (
          <div key={`row-${hour}`} style={{ display: 'contents' }}>
            <div style={{
              padding: '6px 10px', fontSize: 11, color: C.muted,
              textAlign: 'right', borderTop: `1px solid ${C.borderSoft}`,
              height: CELL_H, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start',
              gap: 2,
            }}>
              <span style={{ fontWeight: 600 }}>{`${String(hour).padStart(2, '0')}:00`}</span>
              {peak && minSpend && (
                <span style={{ fontSize: 9, color: C.amber, fontWeight: 700, background: C.amberSoft, padding: '1px 5px', borderRadius: 4 }}>
                  Min {minSpend}€
                </span>
              )}
            </div>
            <div style={{
              height: CELL_H, padding: 4,
              borderTop: `1px solid ${C.borderSoft}`,
              borderLeft: `1px solid ${C.borderSoft}`,
              display: 'flex', flexDirection: 'column', gap: 2,
              background: peak ? 'rgba(245,158,11,0.03)' : 'transparent',
            }}>
              {hourRes.map(r => {
                const Icon = OCCASION_ICONS[r.occasion]
                return (
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
                      opacity: r.status === 'Annulée' ? 0.5 : 1,
                    }}
                    whileHover={{ scale: 1.005 }}
                  >
                    <Icon size={16} color={SECTION_COLORS[r.section]} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.guestName}
                        {r.history && r.history.visits > 3 && (
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: C.indigoSoft, color: C.indigo, fontWeight: 700 }}>
                            VIP · {r.history.visits} visites
                          </span>
                        )}
                        {r.depositPaid && <Euro size={11} color={C.green} />}
                        {r.cardOnFile && <CreditCard size={11} color={C.indigo} />}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {r.partySize} pers. · {r.table} · <span style={{ color: SECTION_COLORS[r.section], fontWeight: 600 }}>{r.section}</span>
                        {r.linkedEvent && <span style={{ marginLeft: 6, color: C.rose }}>· Événement lié</span>}
                        {r.linkedCatering && <span style={{ marginLeft: 6, color: C.orange }}>· Catering lié</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.indigo }}>
                      {`${String(r.startHour).padStart(2, '0')}:${String(r.startMin).padStart(2, '0')}`}
                    </div>
                    <div style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: STATUS_BG[r.status], color: STATUS_COLORS[r.status],
                      border: `1px solid ${STATUS_COLORS[r.status]}44`,
                    }}>
                      {r.status}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({ days, currentDate, getRes, onSelect }: {
  days: Date[]; currentDate: Date; getRes: (day: Date) => Reservation[]; onSelect: (res: Reservation) => void
}) {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 600, padding: '8px 0' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dayRes = getRes(day)
          const inMonth = isSameMonth(day, currentDate)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.003 }}
              style={{
                minHeight: 90, padding: 6, borderRadius: 10,
                background: isToday(day) ? C.indigoSoft : C.card,
                border: isToday(day) ? `1px solid ${C.indigo}66` : `1px solid ${C.border}`,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isToday(day) ? C.indigo : C.text }}>
                  {format(day, 'd')}
                </span>
                {dayRes.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: C.indigoSoft, color: C.indigo }}>
                    {dayRes.length}
                  </span>
                )}
              </div>
              {dayRes.slice(0, 2).map(r => <ResBlock key={r.id} res={r} onClick={() => onSelect(r)} />)}
              {dayRes.length > 2 && (
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>
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

function ReservationDetail({ reservation, onClose, onConfirm, onSendReminder }: {
  reservation: Reservation | null
  onClose: () => void
  onConfirm: (id: string) => void
  onSendReminder: (id: string) => void
}) {
  if (!reservation) return null
  const r = reservation
  const Icon = OCCASION_ICONS[r.occasion]
  const timeSince = r.seatedAt ? Math.floor((Date.now() - r.seatedAt.getTime()) / 60000) : null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.45)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 480, maxHeight: '90vh', overflow: 'auto',
            background: C.card, borderRadius: 18,
            border: `1px solid ${C.border}`,
            boxShadow: '0 25px 50px rgba(15,23,42,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={20} color={SECTION_COLORS[r.section]} />
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>Détail réservation</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{r.guestName}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Occasion : {r.occasion}</div>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: STATUS_BG[r.status], color: STATUS_COLORS[r.status],
                border: `1px solid ${STATUS_COLORS[r.status]}44`,
              }}>
                {r.status}
              </span>
            </div>

            {/* Guest History */}
            {r.history && (
              <div style={{ padding: 12, background: C.indigoSoft, borderRadius: 12, border: `1px solid ${C.indigo}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.indigo, marginBottom: 6 }}>
                  <History size={13} /> Historique client
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: C.text }}>
                  <div><strong>{r.history.visits}</strong> visites</div>
                  {r.history.avgSpend && <div>Panier moyen : <strong>{r.history.avgSpend}€</strong></div>}
                  {r.history.preferredTable && <div>Table préférée : <strong>{r.history.preferredTable}</strong></div>}
                  {r.history.lastVisit && <div>Dernière visite : <strong>{format(r.history.lastVisit, 'dd/MM')}</strong></div>}
                  {r.history.dietary && (
                    <div style={{ gridColumn: '1 / 3', color: C.red, fontWeight: 600 }}>
                      <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {r.history.dietary}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: C.text, fontSize: 13 }}>
              <Row icon={<Calendar size={15} color={C.muted} />} text={format(r.date, 'EEEE d MMMM yyyy', { locale: fr })} />
              <Row icon={<Clock size={15} color={C.muted} />} text={`${String(r.startHour).padStart(2, '0')}:${String(r.startMin).padStart(2, '0')} — ${String(r.endHour).padStart(2, '0')}:${String(r.endMin).padStart(2, '0')}`} />
              <Row icon={<Users size={15} color={C.muted} />} text={`${r.partySize} personnes`} />
              <Row icon={<MapPin size={15} color={C.muted} />} text={<><span style={{ color: SECTION_COLORS[r.section], fontWeight: 700 }}>{r.section}</span> — Table {r.table}</>} />
              <Row icon={<Phone size={15} color={C.muted} />} text={r.phone} />
              <Row icon={<Mail size={15} color={C.muted} />} text={r.email} />

              {r.minSpend && (
                <div style={{ padding: '8px 12px', background: C.amberSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <TrendingUp size={13} color={C.amber} />
                  <span style={{ color: C.text, fontWeight: 600 }}>Minimum de commande : {r.minSpend}€</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>(créneau de pointe)</span>
                </div>
              )}

              {r.depositAmount && (
                <div style={{ padding: '8px 12px', background: r.depositPaid ? C.greenSoft : C.redSoft, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={13} color={r.depositPaid ? C.green : C.red} />
                    <span style={{ color: C.text, fontWeight: 600 }}>Acompte : {r.depositAmount}€</span>
                  </div>
                  {!r.depositPaid && (
                    <button style={{ ...btnBase, padding: '4px 10px', fontSize: 11, background: C.red, color: '#fff' }}>
                      Encaisser
                    </button>
                  )}
                  {r.depositPaid && <span style={{ color: C.green, fontWeight: 700, fontSize: 11 }}>✓ Payé</span>}
                </div>
              )}

              {r.cardOnFile && (
                <div style={{ padding: '8px 12px', background: C.indigoSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <CreditCard size={13} color={C.indigo} />
                  <span style={{ color: C.text, fontWeight: 600 }}>Carte en garantie (protection no-show)</span>
                </div>
              )}

              {timeSince !== null && (
                <div style={{ padding: '8px 12px', background: C.cyanSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Timer size={13} color={C.cyan} />
                  <span style={{ color: C.text, fontWeight: 600 }}>Table occupée depuis {timeSince} min</span>
                </div>
              )}

              {(r.linkedEvent || r.linkedCatering) && (
                <div style={{ padding: '8px 12px', background: C.roseSoft, borderRadius: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.rose, fontWeight: 700, marginBottom: 4 }}>
                    <Layers size={13} /> Services liés
                  </div>
                  {r.linkedEvent && <div style={{ color: C.text }}>Événement : {r.linkedEvent}</div>}
                  {r.linkedCatering && <div style={{ color: C.text }}>Catering : {r.linkedCatering}</div>}
                </div>
              )}
            </div>

            {r.notes && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: C.borderSoft, border: `1px solid ${C.border}`,
                fontSize: 13, color: C.text, fontStyle: 'italic',
              }}>
                <MessageSquare size={12} style={{ display: 'inline', marginRight: 6, color: C.muted }} />
                {r.notes}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => onSendReminder(r.id)} style={{ ...btnGhost, justifyContent: 'center' }}>
                <Send size={14} /> Rappel SMS/Email
              </button>
              {r.status === 'En attente' && (
                <button onClick={() => onConfirm(r.id)} style={{ ...btnPrimary, justifyContent: 'center', background: C.green }}>
                  <CheckCircle2 size={14} /> Confirmer
                </button>
              )}
              {r.status !== 'En attente' && (
                <button onClick={onClose} style={{ ...btnPrimary, justifyContent: 'center' }}>Fermer</button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function Row({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon}<span>{text}</span>
    </div>
  )
}

function NewReservationModal({ isOpen, onClose, onToast }: {
  isOpen: boolean; onClose: () => void; onToast: (msg: string) => void
}) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState(2)
  const [section, setSection] = useState<SectionType>('Salle Principale')
  const [occasion, setOccasion] = useState<Occasion>('Standard')
  const [notes, setNotes] = useState('')
  const [requireCard, setRequireCard] = useState(false)
  const [collectDeposit, setCollectDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState(50)
  const [linkEvent, setLinkEvent] = useState(false)
  const [linkCatering, setLinkCatering] = useState(false)

  const hour = parseInt(time.split(':')[0] || '19')
  const isPeak = PEAK_HOURS.includes(hour)
  const suggestion = useMemo(() => suggestBestTable(partySize, section, occasion), [partySize, section, occasion])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!guestName || !phone) {
      onToast('Nom et téléphone requis')
      return
    }
    onToast('Réservation créée - Confirmation envoyée')
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.45)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 540, maxHeight: '92vh', overflow: 'auto',
            background: C.card, borderRadius: 18,
            border: `1px solid ${C.border}`,
            boxShadow: '0 25px 50px rgba(15,23,42,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.card, zIndex: 2 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>Nouvelle réservation</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
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
                <label style={labelStyle}>Couverts</label>
                <input type="number" min={1} max={50} style={inputStyle} value={partySize} onChange={e => setPartySize(+e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={inputStyle} value={section} onChange={e => setSection(e.target.value as SectionType)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Occasion</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['Standard', 'Anniversaire', 'Affaires', 'Romantique', 'Famille', 'Groupe'] as Occasion[]).map(o => {
                  const Icon = OCCASION_ICONS[o]
                  return (
                    <button key={o} onClick={() => setOccasion(o)} style={{
                      ...btnBase, padding: '8px 10px', justifyContent: 'center', fontSize: 11,
                      background: occasion === o ? C.indigoSoft : C.card,
                      color: occasion === o ? C.indigo : C.muted,
                      border: `1px solid ${occasion === o ? C.indigo + '55' : C.border}`,
                    }}>
                      <Icon size={12} /> {o}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Smart assignment suggestion */}
            {suggestion && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ padding: 12, background: C.indigoSoft, borderRadius: 10, border: `1px solid ${C.indigo}44` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: C.indigo }}>
                  <Sparkles size={14} /> Suggestion table intelligente
                </div>
                <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>
                  <strong>Table {suggestion.table.id}</strong> ({suggestion.table.capacity} places) — {suggestion.reason}
                </div>
              </motion.div>
            )}

            {/* Peak pricing warning */}
            {isPeak && (
              <div style={{ padding: 12, background: C.amberSoft, borderRadius: 10, border: `1px solid ${C.amber}44` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: C.amber }}>
                  <TrendingUp size={14} /> Créneau de pointe
                </div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
                  Minimum de commande recommandé : <strong>{getPeakPricing(hour)}€/personne</strong>
                </div>
              </div>
            )}

            {/* No-show protection */}
            <div style={{ padding: 12, background: C.borderSoft, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CheckboxRow label="Exiger carte de crédit en garantie" checked={requireCard} onChange={setRequireCard} icon={<CreditCard size={13} />} />
              <CheckboxRow label="Collecter un acompte" checked={collectDeposit} onChange={setCollectDeposit} icon={<Euro size={13} />} />
              {collectDeposit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
                  <input type="number" style={{ ...inputStyle, width: 100 }} value={depositAmount} onChange={e => setDepositAmount(+e.target.value)} />
                  <span style={{ fontSize: 12, color: C.muted }}>EUR — paiement inline</span>
                </div>
              )}
              <CheckboxRow label="Lier à un événement" checked={linkEvent} onChange={setLinkEvent} icon={<Zap size={13} />} />
              <CheckboxRow label="Lier à une commande catering" checked={linkCatering} onChange={setLinkCatering} icon={<Utensils size={13} />} />
            </div>

            <div>
              <label style={labelStyle}>Notes (allergies, demandes spéciales)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Allergies, demandes spéciales, préférences..."
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimary}>
                <Plus size={15} /> Réserver + Envoyer confirmation
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function CheckboxRow({ label, checked, onChange, icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: C.text, fontWeight: 500 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 16, height: 16, borderRadius: 4,
          border: checked ? `2px solid ${C.indigo}` : `2px solid ${C.border}`,
          background: checked ? C.indigo : C.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {icon}
      {label}
    </label>
  )
}

function WaitlistModal({ isOpen, onClose, waitlist, onNotify }: {
  isOpen: boolean; onClose: () => void; waitlist: WaitlistEntry[]; onNotify: (id: string) => void
}) {
  if (!isOpen) return null
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 500, background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden' }}
        >
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color={C.cyan} /> Liste d'attente
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Les clients seront automatiquement notifiés par SMS dès qu'un créneau se libère.</p>
            {waitlist.map(w => (
              <div key={w.id} style={{ padding: 12, background: C.borderSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.cyanSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} color={C.cyan} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{w.guestName}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{w.partySize} pers. · {w.requestedTime} · {w.phone}</div>
                </div>
                {w.notified ? (
                  <span style={{ fontSize: 10, padding: '4px 8px', background: C.greenSoft, color: C.green, borderRadius: 6, fontWeight: 700 }}>
                    ✓ Notifié
                  </span>
                ) : (
                  <button onClick={() => onNotify(w.id)} style={{ ...btnBase, fontSize: 11, padding: '6px 10px', background: C.cyan, color: '#fff' }}>
                    <Send size={11} /> Notifier
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function WalkInModal({ isOpen, onClose, onToast }: {
  isOpen: boolean; onClose: () => void; onToast: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [section, setSection] = useState<SectionType>('Salle Principale')

  if (!isOpen) return null
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 420, background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden' }}
        >
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} color={C.orange} /> Walk-in rapide
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nom (optionnel)</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Walk-in sans nom" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Couverts</label>
                <input type="number" min={1} style={inputStyle} value={partySize} onChange={e => setPartySize(+e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={inputStyle} value={section} onChange={e => setSection(e.target.value as SectionType)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => { onToast('Walk-in installé - Table assignée automatiquement'); onClose() }} style={{ ...btnPrimary, justifyContent: 'center', background: C.orange }}>
              <Sparkles size={14} /> Installer maintenant
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
