import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths, isSameDay,
  isSameMonth, eachDayOfInterval, isToday, differenceInMinutes,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Mail, Download, Plus, X, Clock, Users,
  Sparkles, RefreshCcw, Copy, AlertTriangle, Euro, Award, Coffee,
  Send, Zap, Heart, ClipboardList, TrendingUp, CheckCircle2, Layers,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import PlanningAssistant from '@/components/PlanningAssistant'

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
  rose: '#f43f5e',
  roseSoft: '#ffe4e6',
  cyan: '#06b6d4',
  cyanSoft: '#cffafe',
  orange: '#f97316',
  orangeSoft: '#ffedd5',
  purple: '#a855f7',
  purpleSoft: '#f3e8ff',
}

type RoleType = 'Serveur' | 'Cuisinier' | 'Femme de ménage' | 'Manager'
type SectionType = 'Salle' | 'Bar' | 'Terrasse'
type ViewType = 'week' | 'month'
type Skill = 'Barman' | 'Sommelier' | 'Chef pâtissier' | 'Hygiène HACCP' | 'Caisse' | 'Allergies'

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
  hourlyRate: number
  hasBreak?: boolean
  swapRequested?: boolean
  skills?: Skill[]
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
  approved: boolean
}

interface Holiday {
  date: Date
  name: string
}

interface ShiftTemplate {
  id: string
  name: string
  startHour: number
  endHour: number
  role: RoleType
  section: SectionType
}

interface Employee {
  name: string
  role: RoleType
  skills: Skill[]
  hourlyRate: number
  availability: string[]
  weeklyHours: number
}

const ROLE_COLORS: Record<RoleType, string> = {
  Serveur: C.indigo,
  Cuisinier: C.orange,
  'Femme de ménage': C.rose,
  Manager: C.green,
}

const ROLE_BG: Record<RoleType, string> = {
  Serveur: C.indigoSoft,
  Cuisinier: C.orangeSoft,
  'Femme de ménage': C.roseSoft,
  Manager: C.greenSoft,
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

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  { id: 'tpl1', name: 'Brunch 10-15', startHour: 10, endHour: 15, role: 'Serveur', section: 'Salle' },
  { id: 'tpl2', name: 'Déjeuner 11-16', startHour: 11, endHour: 16, role: 'Serveur', section: 'Salle' },
  { id: 'tpl3', name: 'Dîner 18-23', startHour: 18, endHour: 23, role: 'Serveur', section: 'Salle' },
  { id: 'tpl4', name: 'Journée complète 9-18', startHour: 9, endHour: 18, role: 'Manager', section: 'Salle' },
  { id: 'tpl5', name: 'Nuit bar 20-02', startHour: 20, endHour: 26, role: 'Serveur', section: 'Bar' },
  { id: 'tpl6', name: 'Ménage matin 6-10', startHour: 6, endHour: 10, role: 'Femme de ménage', section: 'Salle' },
]

const EMPLOYEES: Employee[] = [
  { name: 'Marie Dupont', role: 'Serveur', skills: ['Allergies', 'Caisse'], hourlyRate: 14, availability: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'], weeklyHours: 38 },
  { name: 'Jean Muller', role: 'Cuisinier', skills: ['Hygiène HACCP'], hourlyRate: 17, availability: ['Lun-Ven'], weeklyHours: 35 },
  { name: 'Sophie Klein', role: 'Serveur', skills: ['Sommelier', 'Caisse'], hourlyRate: 15, availability: ['Jeu-Dim'], weeklyHours: 32 },
  { name: 'Luc Weber', role: 'Manager', skills: ['Hygiène HACCP', 'Caisse', 'Allergies'], hourlyRate: 22, availability: ['Tous'], weeklyHours: 44 },
  { name: 'Anna Schmit', role: 'Femme de ménage', skills: [], hourlyRate: 13, availability: ['Matin'], weeklyHours: 20 },
  { name: 'Pierre Martin', role: 'Cuisinier', skills: ['Chef pâtissier', 'Hygiène HACCP'], hourlyRate: 18, availability: ['Mer-Dim'], weeklyHours: 40 },
  { name: 'Claire Reuter', role: 'Serveur', skills: ['Barman', 'Caisse'], hourlyRate: 15, availability: ['Ven-Dim'], weeklyHours: 28 },
]

function generateMockShifts(): Shift[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const entries: { emp: Employee; section: SectionType; days: number[]; sh: number; eh: number }[] = [
    { emp: EMPLOYEES[0], section: 'Salle', days: [0, 1, 2, 3, 4], sh: 10, eh: 16 },
    { emp: EMPLOYEES[1], section: 'Salle', days: [0, 1, 2, 3, 4], sh: 8, eh: 15 },
    { emp: EMPLOYEES[3], section: 'Salle', days: [0, 1, 2, 3, 4], sh: 9, eh: 18 },
    { emp: EMPLOYEES[4], section: 'Salle', days: [0, 2, 4], sh: 6, eh: 10 },
    { emp: EMPLOYEES[2], section: 'Terrasse', days: [3, 4, 5, 6], sh: 17, eh: 23 },
    { emp: EMPLOYEES[5], section: 'Bar', days: [3, 4, 5, 6], sh: 16, eh: 23 },
    { emp: EMPLOYEES[6], section: 'Bar', days: [5, 6], sh: 11, eh: 20 },
  ]
  const shifts: Shift[] = []
  let id = 1
  entries.forEach(e => {
    e.days.forEach(d => {
      const duration = e.eh - e.sh
      shifts.push({
        id: `s${id++}`, employeeName: e.emp.name, role: e.emp.role, section: e.section,
        date: addDays(weekStart, d), startHour: e.sh, startMin: 0, endHour: e.eh, endMin: 0,
        hourlyRate: e.emp.hourlyRate, hasBreak: duration >= 6, skills: e.emp.skills,
        swapRequested: id === 4,
      })
    })
  })
  return shifts
}

function generateMockReservations(): Reservation[] {
  const today = new Date()
  const ws = startOfWeek(today, { weekStartsOn: 1 })
  return [
    { id: 'r1', guestName: 'Famille Braun', partySize: 6, date: addDays(ws, 0), startHour: 12, startMin: 0, endHour: 14, endMin: 0, section: 'Salle' },
    { id: 'r2', guestName: 'M. Hoffmann', partySize: 2, date: addDays(ws, 1), startHour: 19, startMin: 30, endHour: 21, endMin: 30, section: 'Terrasse' },
    { id: 'r3', guestName: 'Société ABC', partySize: 12, date: addDays(ws, 2), startHour: 12, startMin: 0, endHour: 14, endMin: 30, section: 'Salle' },
    { id: 'r4', guestName: 'Mme Kieffer', partySize: 4, date: addDays(ws, 4), startHour: 20, startMin: 0, endHour: 22, endMin: 0, section: 'Bar' },
    { id: 'r5', guestName: 'Groupe Lux', partySize: 8, date: addDays(ws, 5), startHour: 19, startMin: 0, endHour: 22, endMin: 0, section: 'Salle' },
  ]
}

function generateMockSickLeaves(): SickLeave[] {
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
  return [
    { id: 'sl1', employeeName: 'Jean Muller', startDate: addDays(ws, 1), endDate: addDays(ws, 3), reason: 'Grippe' },
    { id: 'sl2', employeeName: 'Anna Schmit', startDate: addDays(ws, 3), endDate: addDays(ws, 5), reason: 'Migraine' },
  ]
}

function generateMockVacations(): Vacation[] {
  const ws = startOfWeek(new Date(), { weekStartsOn: 1 })
  return [
    { id: 'v1', employeeName: 'Sophie Klein', startDate: addDays(ws, 0), endDate: addDays(ws, 4), label: 'Congé annuel', approved: true },
    { id: 'v2', employeeName: 'Claire Reuter', startDate: addDays(ws, 2), endDate: addDays(ws, 3), label: 'Congé personnel', approved: true },
  ]
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
}
const btnPrimary: React.CSSProperties = { ...btnBase, background: C.indigo, color: '#fff' }
const btnGhost: React.CSSProperties = { ...btnBase, background: C.card, color: C.text, border: `1px solid ${C.border}` }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  background: C.card, border: `1px solid ${C.border}`,
  color: C.text, fontSize: 13, outline: 'none',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }
const card: React.CSSProperties = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
}

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('week')
  const [sectionFilter, setSectionFilter] = useState<string>('Toutes')
  const [shifts, setShifts] = useState<Shift[]>(generateMockShifts)
  const [reservations] = useState<Reservation[]>(generateMockReservations)
  const [sickLeaves] = useState<SickLeave[]>(generateMockSickLeaves)
  const [vacations] = useState<Vacation[]>(generateMockVacations)

  const [showShifts, setShowShifts] = useState(true)
  const [showConges, setShowConges] = useState(true)
  const [showMaladies, setShowMaladies] = useState(true)
  const [showReservations, setShowReservations] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showSwapsModal, setShowSwapsModal] = useState(false)
  const [addDate, setAddDate] = useState<Date | null>(null)
  const [addHour, setAddHour] = useState(9)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const goNext = () => setCurrentDate(v => view === 'week' ? addWeeks(v, 1) : addMonths(v, 1))
  const goPrev = () => setCurrentDate(v => view === 'week' ? subWeeks(v, 1) : subMonths(v, 1))
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

  const getHoliday = useCallback((day: Date) => HOLIDAYS_2026.find(h => isSameDay(h.date, day)), [])

  const filteredShifts = useMemo(() => {
    if (!showShifts) return []
    return sectionFilter === 'Toutes' ? shifts : shifts.filter(s => s.section === sectionFilter)
  }, [shifts, sectionFilter, showShifts])

  const getShiftsForDay = useCallback((day: Date) => filteredShifts.filter(s => isSameDay(s.date, day)), [filteredShifts])
  const getReservationsForDay = useCallback((day: Date) => showReservations ? reservations.filter(r => isSameDay(r.date, day)) : [], [reservations, showReservations])
  const getSickLeavesForDay = useCallback((day: Date) => showMaladies ? sickLeaves.filter(sl => day >= sl.startDate && day <= sl.endDate) : [], [sickLeaves, showMaladies])
  const getVacationsForDay = useCallback((day: Date) => showConges ? vacations.filter(v => day >= v.startDate && day <= v.endDate) : [], [vacations, showConges])

  // Overtime calculation (Luxembourg 48h/week limit)
  const weeklyHoursByEmp = useMemo(() => {
    const map: Record<string, number> = {}
    shifts.filter(s => weekDays.some(d => isSameDay(d, s.date))).forEach(s => {
      const hrs = s.endHour - s.startHour + (s.endMin - s.startMin) / 60 - (s.hasBreak ? 0.5 : 0)
      map[s.employeeName] = (map[s.employeeName] || 0) + hrs
    })
    return map
  }, [shifts, weekDays])

  const overtimeAlerts = Object.entries(weeklyHoursByEmp).filter(([, h]) => h >= 45).length
  const swapRequests = shifts.filter(s => s.swapRequested).length

  // Cost forecast for the week
  const weeklyCost = useMemo(() => {
    return shifts.filter(s => weekDays.some(d => isSameDay(d, s.date)))
      .reduce((acc, s) => {
        const hrs = s.endHour - s.startHour + (s.endMin - s.startMin) / 60 - (s.hasBreak ? 0.5 : 0)
        return acc + hrs * s.hourlyRate
      }, 0)
  }, [shifts, weekDays])

  const handleExportCSV = () => {
    const header = 'Employé,Date,Début,Fin,Pause (min),Heures travaillées,Taux horaire,Coût\n'
    const rows = shifts.map(s => {
      const hrs = s.endHour - s.startHour - (s.endMin - s.startMin) / 60 - (s.hasBreak ? 0.5 : 0)
      const cost = hrs * s.hourlyRate
      return `${s.employeeName},${format(s.date, 'dd/MM/yyyy')},${String(s.startHour).padStart(2, '0')}:${String(s.startMin).padStart(2, '0')},${String(s.endHour).padStart(2, '0')}:${String(s.endMin).padStart(2, '0')},${s.hasBreak ? 30 : 0},${hrs.toFixed(1)},${s.hourlyRate.toFixed(2)},${cost.toFixed(2)}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Export payroll généré')
  }

  const handlePublish = () => showToast('Planning publié - SMS + Email envoyés à toute l\'équipe')
  const handleShareEmail = () => showToast('Planning envoyé par email')
  const handleAutoSchedule = () => showToast('Planning généré par IA basé sur historique et disponibilités')

  const handleCellClick = (day: Date, hour: number) => {
    setAddDate(day)
    setAddHour(hour)
    setShowAddModal(true)
  }

  const headerLabel = view === 'week'
    ? `${format(weekDays[0], 'd MMM', { locale: fr })} — ${format(weekDays[6], 'd MMM yyyy', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.text, padding: 24, gap: 16, overflow: 'hidden' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={24} color={C.indigo} /> Planning équipe
          </h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Planification intelligente · Conformité droit luxembourgeois · Prévision coûts
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={goPrev} style={{ ...btnGhost, padding: 8 }}><ChevronLeft size={18} /></button>
          <button onClick={goToday} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>Aujourd'hui</button>
          <button onClick={goNext} style={{ ...btnGhost, padding: 8 }}><ChevronRight size={18} /></button>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, textTransform: 'capitalize', padding: '0 8px' }}>{headerLabel}</span>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={<Users size={16} />} label="Shifts semaine" value={shifts.filter(s => weekDays.some(d => isSameDay(d, s.date))).length} sub="planifiés" color={C.indigo} bg={C.indigoSoft} />
        <StatCard icon={<Euro size={16} />} label="Coût prévu" value={`${weeklyCost.toFixed(0)}€`} sub="masse salariale" color={C.green} bg={C.greenSoft} />
        <StatCard icon={<AlertTriangle size={16} />} label="Alertes 48h" value={overtimeAlerts} sub="employés proches" color={C.red} bg={C.redSoft} />
        <StatCard icon={<RefreshCcw size={16} />} label="Échanges" value={swapRequests} sub="demandes ouvertes" color={C.amber} bg={C.amberSoft} />
        <StatCard icon={<Heart size={16} />} label="Disponibilités" value={EMPLOYEES.length} sub="employés actifs" color={C.purple} bg={C.purpleSoft} />
      </motion.div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleAutoSchedule} style={{ ...btnPrimary, background: `linear-gradient(135deg, ${C.indigo}, ${C.purple})` }}>
            <Sparkles size={14} /> Auto-planifier (IA)
          </button>
          <button onClick={() => setShowTemplatesModal(true)} style={btnGhost}>
            <Copy size={14} /> Modèles de shifts
          </button>
          <button onClick={() => setShowSwapsModal(true)} style={{ ...btnGhost, background: swapRequests > 0 ? C.amberSoft : C.card, color: swapRequests > 0 ? C.amber : C.text, border: `1px solid ${swapRequests > 0 ? C.amber + '55' : C.border}` }}>
            <RefreshCcw size={14} /> Échanges ({swapRequests})
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.card }}>
            {(['week', 'month'] as ViewType[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                ...btnBase, borderRadius: 0, border: 'none', fontSize: 12, padding: '6px 14px',
                background: view === v ? C.indigoSoft : 'transparent',
                color: view === v ? C.indigo : C.muted,
              }}>
                {v === 'week' ? 'Semaine' : 'Mois'}
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
          <button onClick={handleShareEmail} style={btnGhost}><Mail size={14} /> Partager</button>
          <button onClick={handleExportCSV} style={btnGhost}><Download size={14} /> Payroll</button>
          <button onClick={handlePublish} style={{ ...btnPrimary, background: C.green }}>
            <Send size={14} /> Publier planning
          </button>
        </div>
      </div>

      {/* Legend + filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(Object.keys(ROLE_COLORS) as RoleType[]).map(role => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: ROLE_COLORS[role] }} />
              {role}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterCheckbox label="Shifts" checked={showShifts} onChange={setShowShifts} color={C.indigo} />
          <FilterCheckbox label="Congés" checked={showConges} onChange={setShowConges} color={C.cyan} />
          <FilterCheckbox label="Maladies" checked={showMaladies} onChange={setShowMaladies} color={C.red} />
          <FilterCheckbox label="Réservations" checked={showReservations} onChange={setShowReservations} color={C.purple} />
        </div>
      </div>

      {/* Overtime warnings */}
      {overtimeAlerts > 0 && (
        <div style={{ padding: 12, background: C.redSoft, border: `1px solid ${C.red}44`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color={C.red} />
          <div style={{ fontSize: 12, color: C.text }}>
            <strong>Conformité droit luxembourgeois :</strong>{' '}
            {Object.entries(weeklyHoursByEmp).filter(([, h]) => h >= 45).map(([name, h]) => `${name} (${h.toFixed(1)}h)`).join(', ')}{' '}
            approche/dépasse la limite de 48h/semaine.
          </div>
        </div>
      )}

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'auto', ...card, padding: 0 }}>
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
          <MonthView days={monthDays} currentDate={currentDate} shifts={getShiftsForDay} getHoliday={getHoliday} />
        )}
      </div>

      <AddShiftModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        date={addDate}
        hour={addHour}
        onToast={showToast}
      />

      <TemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onApply={(tpl) => { showToast(`Modèle "${tpl.name}" appliqué`); setShowTemplatesModal(false) }}
      />

      <SwapsModal
        isOpen={showSwapsModal}
        onClose={() => setShowSwapsModal(false)}
        shifts={shifts.filter(s => s.swapRequested)}
        onApprove={() => { showToast('Échange approuvé - Équipe notifiée'); setShowSwapsModal(false) }}
      />

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
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; color: string; bg: string
}) {
  return (
    <div style={{ ...card, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <div style={{ background: bg, padding: 5, borderRadius: 8, display: 'inline-flex' }}>{icon}</div>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
    </div>
  )
}

function WeekView({ days, shifts, reservations, sickLeaves, vacations, getHoliday, onCellClick }: {
  days: Date[]
  shifts: (day: Date) => Shift[]
  reservations: (day: Date) => Reservation[]
  sickLeaves: (day: Date) => SickLeave[]
  vacations: (day: Date) => Vacation[]
  getHoliday: (day: Date) => Holiday | undefined
  onCellClick: (day: Date, hour: number) => void
}) {
  const CELL_H = 50
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: C.card, borderBottom: `1px solid ${C.border}`, padding: '10px 0' }} />
      {days.map((day, i) => {
        const holiday = getHoliday(day)
        return (
          <div key={i} style={{
            position: 'sticky', top: 0, zIndex: 5,
            background: holiday ? C.amberSoft : C.card,
            borderBottom: `1px solid ${C.border}`,
            borderLeft: `1px solid ${C.borderSoft}`,
            padding: '8px 6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{dayNames[i]}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: isToday(day) ? C.indigo : C.text }}>
              {format(day, 'd')}
            </div>
            {holiday && <div style={{ fontSize: 9, color: C.amber, marginTop: 2, fontWeight: 700 }}>{holiday.name}</div>}
          </div>
        )
      })}

      {HOURS.map(hour => (
        <div key={`row-${hour}`} style={{ display: 'contents' }}>
          <div style={{
            padding: '4px 8px', fontSize: 11, color: C.muted,
            textAlign: 'right', borderTop: `1px solid ${C.borderSoft}`,
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
                  borderTop: `1px solid ${C.borderSoft}`,
                  borderLeft: `1px solid ${C.borderSoft}`,
                  background: holiday ? 'rgba(245,158,11,0.04)' : 'transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = holiday ? 'rgba(245,158,11,0.08)' : C.borderSoft)}
                onMouseLeave={e => (e.currentTarget.style.background = holiday ? 'rgba(245,158,11,0.04)' : 'transparent')}
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
                        fontSize: 10, color: C.text, zIndex: 2,
                        cursor: 'default',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.employeeName}
                        {s.swapRequested && <RefreshCcw size={9} color={C.amber} />}
                        {s.hasBreak && <Coffee size={9} color={C.muted} />}
                      </div>
                      <div style={{ color: C.muted, fontSize: 9 }}>
                        {`${String(s.startHour).padStart(2, '0')}:${String(s.startMin).padStart(2, '0')} - ${String(s.endHour).padStart(2, '0')}:${String(s.endMin).padStart(2, '0')}`}
                      </div>
                      {s.skills && s.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 1, flexWrap: 'wrap' }}>
                          {s.skills.slice(0, 2).map(sk => (
                            <span key={sk} style={{ fontSize: 8, padding: '0 4px', borderRadius: 3, background: 'rgba(0,0,0,0.06)', color: C.muted, fontWeight: 600 }}>
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                ))}
                {dayRes.map(r => (
                  r.startHour === hour && (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        position: 'absolute', bottom: 2, left: 2, right: 2,
                        height: (r.endHour - r.startHour) * CELL_H - 8,
                        background: C.purpleSoft,
                        border: `1px dashed ${C.purple}88`,
                        borderRadius: 6, padding: '2px 6px',
                        fontSize: 9, color: C.purple, zIndex: 1,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 600 }}>{r.guestName} ({r.partySize}p)</div>
                    </motion.div>
                  )
                ))}
                {daySick.map((sl, si) => (
                  <motion.div
                    key={sl.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      position: 'absolute', top: 2 + si * 22, left: 2, right: 2,
                      height: 18, borderRadius: 4, zIndex: 3,
                      background: 'repeating-linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.2) 3px, rgba(239,68,68,0.06) 3px, rgba(239,68,68,0.06) 6px)',
                      borderLeft: `3px solid ${C.red}`,
                      padding: '1px 6px', overflow: 'hidden',
                      fontSize: 9, color: C.red, fontWeight: 700,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {sl.employeeName} — {sl.reason}
                  </motion.div>
                ))}
                {dayVac.map((v, vi) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      position: 'absolute', top: 2 + vi * 22, left: 2, right: 2,
                      height: 18, borderRadius: 4, zIndex: 3,
                      background: C.cyanSoft,
                      borderLeft: `3px solid ${C.cyan}`,
                      padding: '1px 6px', overflow: 'hidden',
                      fontSize: 9, color: C.cyan, fontWeight: 700,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {v.employeeName} — {v.label}
                  </motion.div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MonthView({ days, currentDate, shifts, getHoliday }: {
  days: Date[]; currentDate: Date; shifts: (day: Date) => Shift[]; getHoliday: (day: Date) => Holiday | undefined
}) {
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const countByRole = (day: Date) => {
    const dayShifts = shifts(day)
    const counts: Partial<Record<RoleType, number>> = {}
    dayShifts.forEach(s => { counts[s.role] = (counts[s.role] || 0) + 1 })
    return counts
  }

  const costForDay = (day: Date) =>
    shifts(day).reduce((acc, s) => acc + (s.endHour - s.startHour - (s.hasBreak ? 0.5 : 0)) * s.hourlyRate, 0)

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: C.muted, fontWeight: 600, padding: '8px 0' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const holiday = getHoliday(day)
          const inMonth = isSameMonth(day, currentDate)
          const counts = countByRole(day)
          const cost = costForDay(day)
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.005 }}
              style={{
                minHeight: 95, padding: 8, borderRadius: 10,
                background: holiday ? C.amberSoft : isToday(day) ? C.indigoSoft : C.card,
                border: isToday(day) ? `1px solid ${C.indigo}66` : `1px solid ${C.border}`,
                opacity: inMonth ? 1 : 0.35,
                cursor: 'pointer',
              }}
              whileHover={{ borderColor: C.indigo + '55' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isToday(day) ? C.indigo : C.text }}>
                  {format(day, 'd')}
                </span>
                {cost > 0 && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 5, background: C.greenSoft, color: C.green, fontWeight: 700 }}>
                    {cost.toFixed(0)}€
                  </span>
                )}
              </div>
              {holiday && <div style={{ fontSize: 9, color: C.amber, fontWeight: 700, marginBottom: 4 }}>{holiday.name}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {(Object.entries(counts) as [RoleType, number][]).map(([role, count]) => (
                  <div key={role} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700,
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

      {/* Planning assistant — multi-select / OCR / IA / events */}
      <PlanningAssistant />
    </div>
  )
}

function AddShiftModal({ isOpen, onClose, date, hour, onToast }: {
  isOpen: boolean; onClose: () => void; date: Date | null; hour: number; onToast: (m: string) => void
}) {
  const [employee, setEmployee] = useState('')
  const [role, setRole] = useState<RoleType>('Serveur')
  const [section, setSection] = useState<SectionType>('Salle')
  const [startH, setStartH] = useState(hour)
  const [endH, setEndH] = useState(hour + 4)
  const [multiRole, setMultiRole] = useState(false)
  const [secondaryRole, setSecondaryRole] = useState<RoleType>('Manager')
  const [requiredSkill, setRequiredSkill] = useState<Skill | ''>('')

  if (!isOpen || !date) return null

  const duration = endH - startH
  const breakMinutes = duration >= 6 ? 30 : 0
  const employeeRec = EMPLOYEES.find(e => e.role === role && (!requiredSkill || e.skills.includes(requiredSkill)))

  const handleSave = () => {
    if (!employee) {
      onToast('Veuillez sélectionner un employé')
      return
    }
    onToast(`Shift ajouté${breakMinutes ? ' - Pause légale insérée' : ''}`)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 480, maxHeight: '90vh', overflow: 'auto', background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: '0 25px 50px rgba(15,23,42,0.18)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>Ajouter un shift</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </div>

            <div>
              <label style={labelStyle}>Compétence requise (optionnel)</label>
              <select style={inputStyle} value={requiredSkill} onChange={e => setRequiredSkill(e.target.value as Skill | '')}>
                <option value="">Aucune</option>
                {(['Barman', 'Sommelier', 'Chef pâtissier', 'Hygiène HACCP', 'Caisse', 'Allergies'] as Skill[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {employeeRec && (
              <div style={{ padding: 10, background: C.indigoSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} color={C.indigo} />
                <div style={{ fontSize: 12, color: C.text }}>
                  Suggestion : <strong>{employeeRec.name}</strong> ({employeeRec.hourlyRate}€/h)
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Employé</label>
              <select style={inputStyle} value={employee} onChange={e => setEmployee(e.target.value)}>
                <option value="">Sélectionner...</option>
                {EMPLOYEES.map(e => (
                  <option key={e.name} value={e.name}>{e.name} · {e.role} · {e.hourlyRate}€/h</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Rôle principal</label>
                <select style={inputStyle} value={role} onChange={e => setRole(e.target.value as RoleType)}>
                  {(Object.keys(ROLE_COLORS) as RoleType[]).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Section</label>
                <select style={inputStyle} value={section} onChange={e => setSection(e.target.value as SectionType)}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: C.text, fontWeight: 500 }}>
              <input type="checkbox" checked={multiRole} onChange={e => setMultiRole(e.target.checked)} style={{ cursor: 'pointer' }} />
              <Layers size={13} color={C.purple} /> Rôle multiple sur la même journée
            </label>

            {multiRole && (
              <div>
                <label style={labelStyle}>Rôle secondaire</label>
                <select style={inputStyle} value={secondaryRole} onChange={e => setSecondaryRole(e.target.value as RoleType)}>
                  {(Object.keys(ROLE_COLORS) as RoleType[]).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Début</label>
                <select style={inputStyle} value={startH} onChange={e => setStartH(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fin</label>
                <select style={inputStyle} value={endH} onChange={e => setEndH(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
                </select>
              </div>
            </div>

            {breakMinutes > 0 && (
              <div style={{ padding: 10, background: C.amberSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text }}>
                <Coffee size={13} color={C.amber} />
                <span>Pause légale de <strong>30 min</strong> automatiquement insérée (shift ≥ 6h au Luxembourg)</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={onClose} style={btnGhost}>Annuler</button>
              <button onClick={handleSave} style={btnPrimary}><Plus size={15} /> Ajouter</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function TemplatesModal({ isOpen, onClose, onApply }: {
  isOpen: boolean; onClose: () => void; onApply: (tpl: ShiftTemplate) => void
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
              <Copy size={18} color={C.indigo} /> Modèles de shifts
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 20, display: 'grid', gap: 8 }}>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Appliquez un modèle pré-configuré en un clic.</p>
            {SHIFT_TEMPLATES.map(tpl => (
              <div key={tpl.id} style={{ padding: 14, background: C.borderSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: ROLE_BG[tpl.role], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} color={ROLE_COLORS[tpl.role]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {tpl.startHour}h - {tpl.endHour > 24 ? (tpl.endHour - 24) + 'h (lendemain)' : tpl.endHour + 'h'} · {tpl.role} · {tpl.section}
                  </div>
                </div>
                <button onClick={() => onApply(tpl)} style={{ ...btnBase, fontSize: 11, padding: '6px 12px', background: C.indigo, color: '#fff' }}>
                  Appliquer
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function SwapsModal({ isOpen, onClose, shifts, onApprove }: {
  isOpen: boolean; onClose: () => void; shifts: Shift[]; onApprove: () => void
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
              <RefreshCcw size={18} color={C.amber} /> Demandes d'échange
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shifts.length === 0 && (
              <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: 20 }}>Aucune demande en cours</p>
            )}
            {shifts.map(s => (
              <div key={s.id} style={{ padding: 14, background: C.amberSoft, borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.employeeName}</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  {format(s.date, 'EEEE d MMMM', { locale: fr })} · {s.startHour}h-{s.endHour}h · {s.role}
                </div>
                <div style={{ fontSize: 11, color: C.text, marginBottom: 10, fontStyle: 'italic' }}>
                  "Je voudrais échanger ce shift avec un(e) collègue. Rendez-vous médical."
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onApprove} style={{ ...btnBase, fontSize: 11, padding: '6px 12px', background: C.green, color: '#fff' }}>
                    <CheckCircle2 size={11} /> Approuver
                  </button>
                  <button style={{ ...btnBase, fontSize: 11, padding: '6px 12px', background: C.card, color: C.red, border: `1px solid ${C.red}44` }}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

function FilterCheckbox({ label, checked, onChange, color }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; color: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        background: checked ? `${color}14` : C.card,
        color: checked ? color : C.muted,
        border: checked ? `1px solid ${color}55` : `1px solid ${C.border}`,
        cursor: 'pointer', transition: 'all .2s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        border: checked ? `2px solid ${color}` : `2px solid ${C.border}`,
        background: checked ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
