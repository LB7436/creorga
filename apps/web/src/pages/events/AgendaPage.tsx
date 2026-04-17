import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  format, isSameMonth, isSameDay, isWeekend, getDaysInMonth, getDate,
  differenceInCalendarDays, isBefore, isAfter,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, MapPin, Users, Calendar, Clock, Euro, Phone, Mail,
  X, Plus, LayoutGrid, GanttChart, List, FileText, Send, CreditCard, Edit3,
  Download, Share2, Upload, CheckSquare, Square, Cloud, CloudRain, Sun,
  ChefHat, Music, Camera, Flower2, Sparkles, Copy, Briefcase, Image, Star,
  DollarSign, TrendingUp, UserPlus, ClipboardList, Heart,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventStatus = 'Confirme' | 'Depot paye' | 'Envoye' | 'Brouillon'

interface Task { id: string; label: string; done: boolean; assignee?: string }
interface Vendor { name: string; type: 'Traiteur' | 'DJ' | 'Décoration' | 'Photo' | 'Fleurs'; contact: string; confirmed: boolean }
interface Staff { name: string; role: string; hours: string }
interface Guest { name: string; rsvp: 'Oui' | 'Non' | 'En attente' }

interface CalendarEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  lieu: string
  headcount: number
  status: EventStatus
  client: { name: string; email: string; phone: string }
  montant: number
  depot: number
  depotPaid: boolean
  notes: string
  tableArrangement: string
  timeStart: string
  timeEnd: string
  // Extended
  isOutdoor: boolean
  checklist: Task[]
  vendors: Vendor[]
  staff: Staff[]
  guests: Guest[]
  budgetPlanned: number
  budgetActual: number
  menuSpecial?: string
  feedbackScore?: number
  photos: number
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<EventStatus, { color: string; bg: string; label: string }> = {
  Confirme: { color: '#16a34a', bg: '#dcfce7', label: 'Confirmé' },
  'Depot paye': { color: '#2563eb', bg: '#dbeafe', label: 'Dépôt payé' },
  Envoye: { color: '#ea580c', bg: '#ffedd5', label: 'Envoyé' },
  Brouillon: { color: '#64748b', bg: '#f1f5f9', label: 'Brouillon' },
}

const STATUS_BAR_COLOR: Record<EventStatus, string> = {
  Confirme: '#16a34a',
  'Depot paye': '#2563eb',
  Envoye: '#ea580c',
  Brouillon: '#94a3b8',
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

const EVENT_TEMPLATES = [
  { id: 't1', name: 'Mariage 80 pers.', icon: Heart, color: '#e11d48', desc: 'Template complet : vin d\'honneur + dîner + soirée' },
  { id: 't2', name: 'Séminaire entreprise', icon: Briefcase, color: '#3b82f6', desc: 'Café d\'accueil, lunch, pause, cocktail de clôture' },
  { id: 't3', name: 'Anniversaire 50 ans', icon: Sparkles, color: '#f59e0b', desc: 'Apéritif + menu 3 services + gâteau' },
  { id: 't4', name: 'Cocktail dînatoire', icon: Music, color: '#8b5cf6', desc: '15 pièces + bar + DJ' },
]

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const baseChecklist = (): Task[] => [
  { id: 'c1', label: 'Confirmer menu avec traiteur', done: true, assignee: 'Sarah' },
  { id: 'c2', label: 'Valider disposition des tables', done: true, assignee: 'Thomas' },
  { id: 'c3', label: 'Commander décoration florale', done: false, assignee: 'Sarah' },
  { id: 'c4', label: 'Brief équipe de service', done: false, assignee: 'Marc' },
  { id: 'c5', label: 'Vérifier matériel son/lumière', done: false, assignee: 'Thomas' },
  { id: 'c6', label: 'Préparer plan de table final', done: false, assignee: 'Sarah' },
]

const mockEvents: CalendarEvent[] = [
  {
    id: '1', name: 'Anniversaire 50 ans M. Braun',
    startDate: new Date(2026, 3, 18), endDate: new Date(2026, 3, 18),
    lieu: 'Salle', headcount: 45, status: 'Confirme',
    client: { name: 'Thomas Braun', email: 'thomas.braun@mail.lu', phone: '+352 621 234 567' },
    montant: 2800, depot: 840, depotPaid: true,
    notes: 'Buffet froid souhaité, décoration argentée. Gâteau commandé chez Pâtisserie Weber.',
    tableArrangement: '6 tables rondes de 8', timeStart: '19:00', timeEnd: '01:00',
    isOutdoor: false,
    checklist: baseChecklist(),
    vendors: [
      { name: 'Fleurs du Grund', type: 'Fleurs', contact: '+352 22 33 44', confirmed: true },
      { name: 'DJ Mike Lux', type: 'DJ', contact: '+352 621 99 88', confirmed: true },
    ],
    staff: [
      { name: 'Marie Dubois', role: 'Chef de rang', hours: '18:30 - 01:30' },
      { name: 'Luc Martens', role: 'Serveur', hours: '18:30 - 01:30' },
      { name: 'Anne Weber', role: 'Serveuse', hours: '18:30 - 01:30' },
    ],
    guests: [
      { name: 'Famille Braun', rsvp: 'Oui' }, { name: 'Amis Mayence', rsvp: 'Oui' }, { name: 'Collègues travail', rsvp: 'En attente' },
    ],
    budgetPlanned: 2800, budgetActual: 2650,
    menuSpecial: 'Menu dégustation régional', feedbackScore: 0, photos: 0,
  },
  {
    id: '2', name: 'Team Building TechCorp',
    startDate: new Date(2026, 3, 20), endDate: new Date(2026, 3, 20),
    lieu: 'Terrasse', headcount: 25, status: 'Depot paye',
    client: { name: 'Julie Meyers', email: 'j.meyers@techcorp.lu', phone: '+352 691 456 789' },
    montant: 1500, depot: 500, depotPaid: true,
    notes: 'Prévoir vidéoprojecteur et sono portable.',
    tableArrangement: '3 grandes tables rectangulaires', timeStart: '14:00', timeEnd: '20:00',
    isOutdoor: true,
    checklist: baseChecklist(),
    vendors: [{ name: 'AV Services Lux', type: 'DJ', contact: '+352 29 88 77', confirmed: true }],
    staff: [{ name: 'Pierre Klein', role: 'Technicien AV', hours: '13:00 - 21:00' }],
    guests: [{ name: 'Équipe TechCorp', rsvp: 'Oui' }],
    budgetPlanned: 1500, budgetActual: 1480, photos: 0,
  },
  {
    id: '3', name: 'Mariage Weber-Klein',
    startDate: new Date(2026, 3, 26), endDate: new Date(2026, 3, 27),
    lieu: 'Salle+Terrasse', headcount: 80, status: 'Envoye',
    client: { name: 'Marc Weber', email: 'marc.weber@gmail.com', phone: '+352 661 789 012' },
    montant: 8500, depot: 2550, depotPaid: false,
    notes: "Vin d'honneur terrasse, dîner salle. DJ confirmé. Menu 3 services + dessert buffet.",
    tableArrangement: "10 tables rondes de 8 + table d'honneur",
    timeStart: '16:00', timeEnd: '04:00',
    isOutdoor: true,
    checklist: baseChecklist(),
    vendors: [
      { name: 'Fleurs du Grund', type: 'Fleurs', contact: '+352 22 33 44', confirmed: true },
      { name: 'DJ Kevin Party', type: 'DJ', contact: '+352 621 55 66', confirmed: true },
      { name: 'Photo Luxe', type: 'Photo', contact: '+352 691 44 55', confirmed: false },
    ],
    staff: [
      { name: 'Marie Dubois', role: 'Chef de salle', hours: '15:00 - 04:30' },
      { name: 'Luc Martens', role: 'Serveur', hours: '15:00 - 04:30' },
      { name: 'Anne Weber', role: 'Serveuse', hours: '15:00 - 04:30' },
      { name: 'Sophie Noël', role: 'Serveuse', hours: '15:00 - 04:30' },
    ],
    guests: Array.from({ length: 80 }, (_, i) => ({ name: `Invité ${i + 1}`, rsvp: (i % 4 === 0 ? 'En attente' : 'Oui') as 'Oui' | 'Non' | 'En attente' })),
    budgetPlanned: 8500, budgetActual: 0, photos: 0,
  },
  {
    id: '4', name: 'Réunion Cabinet Muller',
    startDate: new Date(2026, 3, 22), endDate: new Date(2026, 3, 22),
    lieu: 'Bar', headcount: 12, status: 'Confirme',
    client: { name: 'Pierre Muller', email: 'p.muller@cabinet-muller.lu', phone: '+352 26 123 456' },
    montant: 450, depot: 150, depotPaid: true,
    notes: "Café et viennoiseries à l'arrivée. Lunch léger à 12h30.",
    tableArrangement: '1 table conférence 14 places', timeStart: '09:00', timeEnd: '14:00',
    isOutdoor: false,
    checklist: baseChecklist().slice(0, 3),
    vendors: [],
    staff: [{ name: 'Marie Dubois', role: 'Serveuse', hours: '08:30 - 14:30' }],
    guests: [{ name: 'Cabinet Muller', rsvp: 'Oui' }],
    budgetPlanned: 450, budgetActual: 450, photos: 0,
  },
  {
    id: '5', name: 'Communion Sophie R.',
    startDate: new Date(2026, 4, 3), endDate: new Date(2026, 4, 3),
    lieu: 'Salle', headcount: 35, status: 'Brouillon',
    client: { name: 'Céline Reuter', email: 'celine.reuter@pt.lu', phone: '+352 621 567 890' },
    montant: 2200, depot: 660, depotPaid: false,
    notes: 'Menu enfant pour 8 enfants. Décoration pastel rose et blanc.',
    tableArrangement: '4 tables rondes de 8 + 1 table enfants',
    timeStart: '12:00', timeEnd: '18:00',
    isOutdoor: false,
    checklist: baseChecklist().slice(0, 2),
    vendors: [{ name: 'Fleurs du Grund', type: 'Fleurs', contact: '+352 22 33 44', confirmed: false }],
    staff: [],
    guests: [],
    budgetPlanned: 2200, budgetActual: 0, photos: 0,
  },
  {
    id: '6', name: 'Afterwork EuroConsult',
    startDate: new Date(2026, 4, 8), endDate: new Date(2026, 4, 8),
    lieu: 'Bar', headcount: 20, status: 'Brouillon',
    client: { name: 'Sébastien Faber', email: 's.faber@euroconsult.eu', phone: '+352 691 234 567' },
    montant: 600, depot: 200, depotPaid: false,
    notes: 'Cocktails + finger food. Ambiance lounge.',
    tableArrangement: 'Mange-debout + coin canapés', timeStart: '18:00', timeEnd: '22:00',
    isOutdoor: false,
    checklist: baseChecklist().slice(0, 2),
    vendors: [], staff: [], guests: [],
    budgetPlanned: 600, budgetActual: 0, photos: 0,
  },
  {
    id: '7', name: 'Fête nationale',
    startDate: new Date(2026, 5, 23), endDate: new Date(2026, 5, 23),
    lieu: 'Salle+Terrasse', headcount: 100, status: 'Envoye',
    client: { name: 'Commune de Hesperange', email: 'events@hesperange.lu', phone: '+352 26 360 100' },
    montant: 5000, depot: 1500, depotPaid: false,
    notes: "BBQ terrasse + bar intérieur. Feu d'artifice à 23h.",
    tableArrangement: 'Libre — mange-debout + bancs extérieurs',
    timeStart: '18:00', timeEnd: '02:00',
    isOutdoor: true,
    checklist: baseChecklist(),
    vendors: [{ name: 'DJ Kevin Party', type: 'DJ', contact: '+352 621 55 66', confirmed: true }],
    staff: [],
    guests: [],
    budgetPlanned: 5000, budgetActual: 0, photos: 0,
  },
  {
    id: '8', name: 'Départ retraite M. Schmit',
    startDate: new Date(2026, 4, 15), endDate: new Date(2026, 4, 15),
    lieu: 'Salle', headcount: 30, status: 'Depot paye',
    client: { name: 'Anne Schmit', email: 'anne.schmit@post.lu', phone: '+352 621 678 901' },
    montant: 1800, depot: 540, depotPaid: true,
    notes: "Discours à 20h. Livre d'or + diaporama photos. Menu luxembourgeois.",
    tableArrangement: '4 tables rondes de 8', timeStart: '19:00', timeEnd: '00:00',
    isOutdoor: false,
    checklist: baseChecklist(),
    vendors: [],
    staff: [{ name: 'Marie Dubois', role: 'Chef de rang', hours: '18:30 - 00:30' }],
    guests: [],
    budgetPlanned: 1800, budgetActual: 0, photos: 0,
  },
  {
    id: '9', name: 'Baptême Lucas D.',
    startDate: new Date(2026, 4, 10), endDate: new Date(2026, 4, 10),
    lieu: 'Salle', headcount: 40, status: 'Confirme',
    client: { name: 'Sophie Dupont', email: 'sophie.dupont@gmail.com', phone: '+352 661 345 678' },
    montant: 2500, depot: 750, depotPaid: true,
    notes: "Brunch format. Décoration bleu ciel. 5 enfants en bas âge — prévoir espace jeux.",
    tableArrangement: '5 tables rondes de 8', timeStart: '11:00', timeEnd: '17:00',
    isOutdoor: false,
    checklist: baseChecklist(),
    vendors: [
      { name: 'Fleurs du Grund', type: 'Fleurs', contact: '+352 22 33 44', confirmed: true },
      { name: 'Photo Luxe', type: 'Photo', contact: '+352 691 44 55', confirmed: true },
    ],
    staff: [{ name: 'Anne Weber', role: 'Serveuse', hours: '10:30 - 17:30' }],
    guests: [],
    budgetPlanned: 2500, budgetActual: 0, photos: 0,
  },
  {
    id: '10', name: 'Soirée karaoké',
    startDate: new Date(2026, 3, 25), endDate: new Date(2026, 3, 25),
    lieu: 'Bar', headcount: 50, status: 'Confirme',
    client: { name: 'Luc Thill', email: 'luc.thill@yahoo.com', phone: '+352 691 890 123' },
    montant: 800, depot: 250, depotPaid: true,
    notes: 'Matériel karaoké loué chez SoundLux. Happy hour 19h-20h.',
    tableArrangement: 'Libre — mange-debout + bar', timeStart: '19:00', timeEnd: '02:00',
    isOutdoor: false,
    checklist: baseChecklist(),
    vendors: [{ name: 'SoundLux', type: 'DJ', contact: '+352 26 77 88', confirmed: true }],
    staff: [],
    guests: [],
    budgetPlanned: 800, budgetActual: 780, photos: 12, feedbackScore: 4.8,
  },
]

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  padding: 24,
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, borderRadius: 10,
  transition: 'all .15s',
}

type ViewMode = 'calendar' | 'timeline' | 'list'

/* ------------------------------------------------------------------ */
/*  Weather (7-day mock forecast)                                      */
/* ------------------------------------------------------------------ */

const WEATHER_FORECAST = [
  { day: 'Aujourd\'hui', icon: Sun, temp: '18°', cond: 'Ensoleillé' },
  { day: 'Demain', icon: Sun, temp: '20°', cond: 'Ensoleillé' },
  { day: 'Sam', icon: Cloud, temp: '17°', cond: 'Nuageux' },
  { day: 'Dim', icon: CloudRain, temp: '14°', cond: 'Pluie' },
  { day: 'Lun', icon: Cloud, temp: '16°', cond: 'Nuageux' },
  { day: 'Mar', icon: Sun, temp: '19°', cond: 'Ensoleillé' },
  { day: 'Mer', icon: Sun, temp: '22°', cond: 'Ensoleillé' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 15))
  const [view, setView] = useState<ViewMode>('timeline')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const formatEuro = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })

  const eventsInMonth = useMemo(
    () => mockEvents.filter((e) => isSameMonth(e.startDate, currentMonth) || isSameMonth(e.endDate, currentMonth)),
    [currentMonth],
  )

  const goToday = () => setCurrentMonth(new Date(2026, 3, 15))
  const goPrev = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goNext = () => setCurrentMonth(addMonths(currentMonth, 1))

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { locale: fr })
    const calEnd = endOfWeek(endOfMonth(monthStart), { locale: fr })
    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) { days.push(day); day = addDays(day, 1) }
    return days
  }, [currentMonth])

  const getEventsForDay = (day: Date) =>
    mockEvents.filter(
      (e) => isSameDay(e.startDate, day) || isSameDay(e.endDate, day) ||
        (isBefore(e.startDate, day) && isAfter(e.endDate, day))
    )

  useEffect(() => {
    if (view === 'timeline' && timelineRef.current) {
      const todayCol = getDate(new Date(2026, 3, 15)) - 1
      const colW = 46
      timelineRef.current.scrollLeft = Math.max(0, todayCol * colW - 200)
    }
  }, [view, currentMonth])

  const daysInMonth = getDaysInMonth(currentMonth)
  const monthStart = startOfMonth(currentMonth)
  const COL_W = 46

  const sortedEvents = useMemo(
    () => [...eventsInMonth].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [eventsInMonth],
  )

  const rowAssignments = useMemo(() => {
    const rows: { end: number }[] = []
    const map = new Map<string, number>()
    sortedEvents.forEach((ev) => {
      const s = differenceInCalendarDays(
        isBefore(ev.startDate, monthStart) ? monthStart : ev.startDate, monthStart,
      )
      const e = differenceInCalendarDays(
        isAfter(ev.endDate, endOfMonth(currentMonth)) ? endOfMonth(currentMonth) : ev.endDate, monthStart,
      )
      let placed = false
      for (let r = 0; r < rows.length; r++) {
        if (s > rows[r].end) { rows[r].end = e; map.set(ev.id, r); placed = true; break }
      }
      if (!placed) { map.set(ev.id, rows.length); rows.push({ end: e }) }
    })
    return { map, totalRows: rows.length }
  }, [sortedEvents, monthStart, currentMonth])

  const now = new Date(2026, 3, 15)
  const upcomingEvents = useMemo(
    () => [...mockEvents].filter((e) => e.startDate >= now || e.endDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()), [],
  )

  const totalCA = mockEvents.reduce((s, e) => s + e.montant, 0)
  const confirmedCount = mockEvents.filter((e) => e.status === 'Confirme' || e.status === 'Depot paye').length

  const StatusBadge = ({ status }: { status: EventStatus }) => {
    const cfg = STATUS_CONFIG[status]
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: cfg.bg, color: cfg.color,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
        {cfg.label}
      </span>
    )
  }

  const TabBtn = ({ mode, icon, label }: { mode: ViewMode; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setView(mode)}
      style={{
        ...btnBase, padding: '8px 16px',
        background: view === mode ? '#1e293b' : '#f8fafc',
        color: view === mode ? '#fff' : '#64748b',
        border: view === mode ? 'none' : '1px solid #e2e8f0',
      }}
    >
      {icon}{label}
    </button>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Agenda Événements</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            Planification, équipes, vendors, checklists et suivi post-événement
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowSyncPanel(true)} style={{ ...btnBase, padding: '10px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }}>
            <Share2 size={15} /> Synchroniser
          </button>
          <button onClick={() => setShowTemplates(true)} style={{ ...btnBase, padding: '10px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }}>
            <Copy size={15} /> Templates
          </button>
          <button style={{ ...btnBase, padding: '10px 20px', background: '#1e293b', color: '#fff', boxShadow: '0 2px 8px rgba(30,41,59,0.18)' }}>
            <Plus size={16} /> Nouvel événement
          </button>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Événements ce mois" value={String(eventsInMonth.length)} icon={Calendar} color="#3b82f6" />
        <StatCard label="Confirmés" value={String(confirmedCount)} icon={CheckSquare} color="#10b981" />
        <StatCard label="CA prévisionnel" value={formatEuro(totalCA)} icon={Euro} color="#8b5cf6" />
        <StatCard label="Couverts totaux" value={String(mockEvents.reduce((s, e) => s + e.headcount, 0))} icon={Users} color="#f59e0b" />
      </div>

      {/* Weather strip (for outdoor events) */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ ...card, marginBottom: 20, padding: 16, background: 'linear-gradient(135deg, #f0f9ff, #ecfeff)', border: '1px solid #bae6fd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Cloud size={18} style={{ color: '#0369a1' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#075985' }}>Prévisions 7 jours — Événements extérieurs</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {WEATHER_FORECAST.map((w, i) => {
            const Icon = w.icon
            return (
              <div key={i} style={{ textAlign: 'center', padding: 10, background: '#fff', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{w.day}</div>
                <Icon size={22} style={{ color: w.cond === 'Pluie' ? '#0284c7' : w.cond === 'Nuageux' ? '#64748b' : '#f59e0b', margin: '0 auto' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{w.temp}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{w.cond}</div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Top bar: View switch + period nav */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <TabBtn mode="calendar" icon={<LayoutGrid size={15} />} label="Calendrier" />
          <TabBtn mode="timeline" icon={<GanttChart size={15} />} label="Timeline" />
          <TabBtn mode="list" icon={<List size={15} />} label="Liste" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={goPrev} style={{ ...btnBase, width: 36, height: 36, padding: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <ChevronLeft size={16} color="#475569" />
          </button>
          <button onClick={goToday} style={{ ...btnBase, padding: '8px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }}>
            Aujourd'hui
          </button>
          <button onClick={goNext} style={{ ...btnBase, width: 36, height: 36, padding: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <ChevronRight size={16} color="#475569" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize', marginLeft: 8 }}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
        </div>
      </motion.div>

      {/* Stat pills */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {(Object.keys(STATUS_CONFIG) as EventStatus[]).map((s) => {
          const count = eventsInMonth.filter((e) => e.status === s).length
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 10, background: cfg.bg, fontSize: 13, fontWeight: 600, color: cfg.color }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
              {cfg.label}: {count}
            </div>
          )
        })}
      </motion.div>

      {/* ====== VIEWS ====== */}
      <AnimatePresence mode="wait">
        {/* CALENDAR */}
        {view === 'calendar' && (
          <motion.div key="cal" variants={fadeUp} initial="hidden" animate="show" exit="hidden" style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', padding: '6px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const today = isSameDay(day, now)
                const weekend = isWeekend(day)
                return (
                  <div key={idx} style={{
                    minHeight: 90, padding: 6, borderRadius: 10,
                    background: today ? 'rgba(30,41,59,0.04)' : weekend && inMonth ? '#fafbfc' : inMonth ? '#fff' : 'transparent',
                    border: today ? '2px solid #1e293b' : '1px solid #f1f5f9',
                    cursor: dayEvents.length ? 'pointer' : 'default',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: today ? 700 : 400, color: inMonth ? (today ? '#1e293b' : '#334155') : '#cbd5e1' }}>
                      {format(day, 'd')}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                          fontSize: 10, fontWeight: 600, color: '#fff',
                          background: STATUS_BAR_COLOR[ev.status],
                          borderRadius: 4, padding: '2px 5px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                        }}>
                          {ev.name}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>+{dayEvents.length - 3} de plus</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* TIMELINE */}
        {view === 'timeline' && (
          <motion.div key="timeline" variants={fadeUp} initial="hidden" animate="show" exit="hidden" style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div ref={timelineRef} style={{ overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
              <div style={{ minWidth: daysInMonth * COL_W + 180, position: 'relative' }}>
                {/* Day headers */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ width: 180, minWidth: 180, borderRight: '1px solid #e2e8f0', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Événement
                  </div>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = addDays(monthStart, i)
                    const tod = isSameDay(d, now)
                    const wknd = isWeekend(d)
                    return (
                      <div key={i} style={{
                        width: COL_W, minWidth: COL_W, textAlign: 'center', padding: '8px 0',
                        fontSize: 11, fontWeight: tod ? 800 : 500,
                        color: tod ? '#fff' : wknd ? '#94a3b8' : '#475569',
                        background: tod ? '#1e293b' : 'transparent',
                        borderRadius: tod ? '8px 8px 0 0' : 0,
                      }}>
                        <div style={{ fontSize: 9, textTransform: 'uppercase' }}>{format(d, 'EEE', { locale: fr })}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{i + 1}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Rows */}
                <div style={{ position: 'relative', display: 'flex' }}>
                  <div style={{ width: 180, minWidth: 180, borderRight: '1px solid #e2e8f0', position: 'relative', minHeight: Math.max(rowAssignments.totalRows * 48 + 16, 120) }}>
                    {sortedEvents.map((ev) => {
                      const row = rowAssignments.map.get(ev.id) ?? 0
                      return (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                          position: 'absolute', top: row * 48 + 8, left: 0,
                          width: 180, height: 36, display: 'flex', alignItems: 'center',
                          padding: '0 14px', cursor: 'pointer',
                        }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{ev.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{ev.client.name}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ position: 'relative', width: daysInMonth * COL_W, height: rowAssignments.totalRows * 48 + 16, minHeight: 120 }}>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = addDays(monthStart, i)
                      const wknd = isWeekend(d)
                      return (
                        <div key={i} style={{
                          position: 'absolute', left: i * COL_W, top: 0,
                          width: COL_W, height: '100%',
                          background: wknd ? 'rgba(241,245,249,0.6)' : 'transparent',
                          borderRight: '1px solid #f1f5f9',
                        }} />
                      )
                    })}
                    {isSameMonth(now, currentMonth) && (
                      <div style={{
                        position: 'absolute', left: (getDate(now) - 1) * COL_W + COL_W / 2,
                        top: 0, width: 2, height: '100%', background: '#ef4444', zIndex: 10,
                      }} />
                    )}
                    {sortedEvents.map((ev) => {
                      const row = rowAssignments.map.get(ev.id) ?? 0
                      const clampedStart = isBefore(ev.startDate, monthStart) ? monthStart : ev.startDate
                      const clampedEnd = isAfter(ev.endDate, endOfMonth(currentMonth)) ? endOfMonth(currentMonth) : ev.endDate
                      const startCol = differenceInCalendarDays(clampedStart, monthStart)
                      const span = differenceInCalendarDays(clampedEnd, clampedStart) + 1
                      return (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, scaleX: 0.6 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            position: 'absolute', top: row * 48 + 8,
                            left: startCol * COL_W + 2, width: span * COL_W - 4,
                            height: 36, borderRadius: 8, background: STATUS_BAR_COLOR[ev.status],
                            display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
                            cursor: 'pointer', overflow: 'hidden', whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)', transformOrigin: 'left center',
                          }}
                          onClick={() => setSelectedEvent(ev)}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}>
                            <Users size={10} /> {ev.headcount}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* LIST */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingEvents.map((ev) => {
              const daysUntil = differenceInCalendarDays(ev.startDate, now)
              const doneTasks = ev.checklist.filter((t) => t.done).length
              return (
                <motion.div
                  key={ev.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  onClick={() => setSelectedEvent(ev)}
                  style={{ ...card, padding: 0, display: 'flex', cursor: 'pointer', overflow: 'hidden' }}
                >
                  <div style={{ width: 80, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px 0' }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{format(ev.startDate, 'd')}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{format(ev.startDate, 'MMM', { locale: fr })}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{format(ev.startDate, 'yyyy')}</span>
                  </div>
                  <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{ev.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} color="#94a3b8" /> {ev.client.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} color="#94a3b8" /> {ev.lieu}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} color="#94a3b8" /> {ev.headcount} pers.</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Euro size={13} color="#94a3b8" /> {formatEuro(ev.montant)}</span>
                          {ev.isOutdoor && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0284c7' }}><Cloud size={13} /> Extérieur</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <StatusBadge status={ev.status} />
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: daysUntil <= 3 ? '#ef4444' : daysUntil <= 7 ? '#ea580c' : '#64748b',
                          background: daysUntil <= 3 ? '#fef2f2' : daysUntil <= 7 ? '#fff7ed' : '#f8fafc',
                          padding: '2px 8px', borderRadius: 6,
                        }}>
                          {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : daysUntil < 0 ? 'Passé' : `Dans ${daysUntil} jours`}
                        </span>
                      </div>
                    </div>
                    {/* progress indicators */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 11 }}>
                        <div style={{ color: '#64748b', fontWeight: 600 }}>Checklist</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 2 }}>{doneTasks}/{ev.checklist.length}</div>
                      </div>
                      <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 11 }}>
                        <div style={{ color: '#64748b', fontWeight: 600 }}>Vendors</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 2 }}>{ev.vendors.length}</div>
                      </div>
                      <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 11 }}>
                        <div style={{ color: '#64748b', fontWeight: 600 }}>Staff</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 2 }}>{ev.staff.length}</div>
                      </div>
                      <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, fontSize: 11 }}>
                        <div style={{ color: '#64748b', fontWeight: 600 }}>Budget</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, marginTop: 2 }}>
                          {ev.budgetActual > 0 ? `${Math.round((ev.budgetActual / ev.budgetPlanned) * 100)}%` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && <DetailModal ev={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSyncPanel && <SyncPanel onClose={() => setShowSyncPanel(false)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{value}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Templates Modal                                                    */
/* ------------------------------------------------------------------ */

function TemplatesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Templates d'événements</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>Réutilisez des configurations éprouvées</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {EVENT_TEMPLATES.map((t) => {
            const Icon = t.icon
            return (
              <div key={t.id} style={{
                padding: 16, borderRadius: 12, border: '1px solid #e2e8f0',
                cursor: 'pointer', background: '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: `${t.color}15`,
                    color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>{t.desc}</div>
                <button style={{ width: '100%', padding: '8px 12px', background: t.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Utiliser ce template
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sync Panel                                                         */
/* ------------------------------------------------------------------ */

function SyncPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520 }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Synchronisation calendrier</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: 'Google Calendar', color: '#4285f4' },
            { name: 'Outlook / Office 365', color: '#0078d4' },
            { name: 'Apple iCal (.ics)', color: '#64748b' },
          ].map((p) => (
            <div key={p.name} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}15`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Exporter tous les événements</div>
                </div>
              </div>
              <button style={{ padding: '8px 14px', background: p.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Download size={13} /> Exporter
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                       */
/* ------------------------------------------------------------------ */

function DetailModal({ ev, onClose }: { ev: CalendarEvent; onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'checklist' | 'staff' | 'vendors' | 'guests' | 'menu' | 'seating' | 'budget' | 'weather' | 'gallery' | 'feedback'>('info')
  const cfg = STATUS_CONFIG[ev.status]
  const formatEuro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })

  const tabs = [
    { id: 'info', label: 'Détails', icon: FileText },
    { id: 'checklist', label: 'Checklist', icon: ClipboardList },
    { id: 'staff', label: 'Équipe', icon: UserPlus },
    { id: 'vendors', label: 'Vendors', icon: Briefcase },
    { id: 'guests', label: 'Invités', icon: Users },
    { id: 'menu', label: 'Menu', icon: ChefHat },
    { id: 'seating', label: 'Plan de table', icon: LayoutGrid },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    ...(ev.isOutdoor ? [{ id: 'weather' as const, label: 'Météo', icon: Cloud }] : []),
    { id: 'gallery', label: 'Photos', icon: Image },
    { id: 'feedback', label: 'Feedback', icon: Star },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '94%', maxWidth: 820, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
      >
        <div style={{ height: 6, background: cfg.color }} />
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>{ev.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {format(ev.startDate, 'EEEE d MMMM yyyy', { locale: fr })} · {ev.timeStart} — {ev.timeEnd}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto', padding: '0 16px' }}>
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 13px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? '#1e293b' : 'transparent'}`,
                color: active ? '#0f172a' : '#64748b',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          {tab === 'info' && <InfoTab ev={ev} formatEuro={formatEuro} />}
          {tab === 'checklist' && <ChecklistTab ev={ev} />}
          {tab === 'staff' && <StaffTab ev={ev} />}
          {tab === 'vendors' && <VendorsTab ev={ev} />}
          {tab === 'guests' && <GuestsTab ev={ev} />}
          {tab === 'menu' && <MenuTab ev={ev} />}
          {tab === 'seating' && <SeatingTab ev={ev} />}
          {tab === 'budget' && <BudgetTab ev={ev} formatEuro={formatEuro} />}
          {tab === 'weather' && <WeatherTab ev={ev} />}
          {tab === 'gallery' && <GalleryTab ev={ev} />}
          {tab === 'feedback' && <FeedbackTab ev={ev} />}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ---- Tab: Info ---- */
function InfoTab({ ev, formatEuro }: { ev: CalendarEvent; formatEuro: (n: number) => string }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Client</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{ev.client.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475569', marginTop: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} color="#94a3b8" /> {ev.client.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} color="#94a3b8" /> {ev.client.phone}</span>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Lieu & disposition</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
            <MapPin size={15} color="#94a3b8" /> {ev.lieu}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', marginTop: 6 }}>
            <Users size={13} color="#94a3b8" /> {ev.headcount} personnes — {ev.tableArrangement}
          </div>
        </div>
      </div>

      {ev.notes && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Notes</div>
          <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{ev.notes}</p>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Financier</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Montant total</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{formatEuro(ev.montant)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Dépôt ({ev.depotPaid ? 'payé' : 'en attente'})</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: ev.depotPaid ? '#16a34a' : '#ea580c', marginTop: 2 }}>{formatEuro(ev.depot)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Solde</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{formatEuro(ev.montant - (ev.depotPaid ? ev.depot : 0))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- Tab: Checklist ---- */
function ChecklistTab({ ev }: { ev: CalendarEvent }) {
  const [tasks, setTasks] = useState(ev.checklist)
  const done = tasks.filter((t) => t.done).length
  return (
    <div>
      <div style={{ ...card, marginBottom: 14, padding: 16, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>Progression checklist</div>
            <div style={{ fontSize: 12, color: '#1e40af', marginTop: 2 }}>{done} / {tasks.length} tâches terminées</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e40af' }}>{Math.round((done / tasks.length) * 100)}%</div>
        </div>
        <div style={{ height: 6, background: '#fff', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(done / tasks.length) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width .3s' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t) => {
          const Icon = t.done ? CheckSquare : Square
          return (
            <div key={t.id} onClick={() => setTasks((p) => p.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))} style={{
              ...card, padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              background: t.done ? '#f0fdf4' : '#fff',
            }}>
              <Icon size={18} style={{ color: t.done ? '#10b981' : '#94a3b8', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.done ? '#166534' : '#0f172a', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.label}
                </div>
                {t.assignee && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Assigné à <strong>{t.assignee}</strong>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- Tab: Staff ---- */
function StaffTab({ ev }: { ev: CalendarEvent }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Équipe assignée ({ev.staff.length})
        </div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <UserPlus size={12} /> Assigner
        </button>
      </div>
      {ev.staff.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <UserPlus size={28} style={{ marginBottom: 8 }} />
          <div>Aucun staff assigné — cliquez pour assigner automatiquement</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ev.staff.map((s, i) => (
            <div key={i} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {s.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.role} · {s.hours}</div>
              </div>
              <Clock size={14} style={{ color: '#64748b' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Tab: Vendors ---- */
function VendorsTab({ ev }: { ev: CalendarEvent }) {
  const VENDOR_ICONS: Record<Vendor['type'], any> = {
    'Traiteur': ChefHat, 'DJ': Music, 'Décoration': Sparkles, 'Photo': Camera, 'Fleurs': Flower2,
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Prestataires externes ({ev.vendors.length})
      </div>
      {ev.vendors.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Briefcase size={28} style={{ marginBottom: 8 }} />
          <div>Aucun vendor — ajouter un traiteur, DJ ou décorateur</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ev.vendors.map((v, i) => {
            const Icon = VENDOR_ICONS[v.type]
            return (
              <div key={i} style={{ ...card, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                      <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, background: '#ede9fe', color: '#6d28d9' }}>
                        {v.type}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{v.contact}</div>
                  </div>
                  <span style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                    background: v.confirmed ? '#dcfce7' : '#fef3c7',
                    color: v.confirmed ? '#15803d' : '#b45309',
                  }}>
                    {v.confirmed ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---- Tab: Guests ---- */
function GuestsTab({ ev }: { ev: CalendarEvent }) {
  const yes = ev.guests.filter((g) => g.rsvp === 'Oui').length
  const no = ev.guests.filter((g) => g.rsvp === 'Non').length
  const pending = ev.guests.filter((g) => g.rsvp === 'En attente').length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Liste d'invités ({ev.guests.length})
        </div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Upload size={12} /> Importer Excel
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <RsvpStat label="Confirmés" value={yes} color="#10b981" />
        <RsvpStat label="Refusés" value={no} color="#ef4444" />
        <RsvpStat label="En attente" value={pending} color="#f59e0b" />
      </div>
      {ev.guests.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Users size={28} style={{ marginBottom: 8 }} />
          <div>Aucun invité enregistré</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
          {ev.guests.slice(0, 20).map((g, i) => (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{g.name}</div>
              <span style={{
                padding: '2px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                background: g.rsvp === 'Oui' ? '#dcfce7' : g.rsvp === 'Non' ? '#fee2e2' : '#fef3c7',
                color: g.rsvp === 'Oui' ? '#15803d' : g.rsvp === 'Non' ? '#b91c1c' : '#b45309',
              }}>{g.rsvp}</span>
            </div>
          ))}
          {ev.guests.length > 20 && (
            <div style={{ padding: 10, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
              ... et {ev.guests.length - 20} invités supplémentaires
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RsvpStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...card, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}

/* ---- Tab: Menu ---- */
function MenuTab({ ev }: { ev: CalendarEvent }) {
  return (
    <div>
      <div style={{ ...card, padding: 16, background: 'linear-gradient(135deg, #fef3c7, #fed7aa)', border: '1px solid #fcd34d', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ChefHat size={20} style={{ color: '#b45309' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#78350f' }}>Menu personnalisé</div>
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>{ev.menuSpecial || 'Menu standard'}</div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Composition</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { section: 'Apéritif', items: ['Coupe de champagne', 'Mignardises salées', 'Verrines de saison'] },
            { section: 'Entrée', items: ['Foie gras mi-cuit, chutney de figues'] },
            { section: 'Plat', items: ['Filet de bœuf sauce Moselle, légumes glacés'] },
            { section: 'Dessert', items: ['Assiette gourmande 3 douceurs'] },
            { section: 'Boissons', items: ['Vins blanc & rouge', 'Eaux minérales', 'Café & digestifs'] },
          ].map((s, i) => (
            <div key={i} style={{ paddingLeft: 14, borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#78350f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.section}</div>
              {s.items.map((it, j) => (
                <div key={j} style={{ fontSize: 13, color: '#475569', padding: '2px 0' }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---- Tab: Seating ---- */
function SeatingTab({ ev }: { ev: CalendarEvent }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Plan de table visuel
        </div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Éditer
        </button>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>{ev.tableArrangement}</div>
        <div style={{
          padding: 30, background: '#f8fafc', borderRadius: 12,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        }}>
          {Array.from({ length: Math.min(Math.ceil(ev.headcount / 8), 9) }, (_, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: '50%',
              background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'grab',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>Table</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{i + 1}</div>
              <div style={{ fontSize: 10, opacity: 0.9 }}>8 places</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, textAlign: 'center' }}>
          Glisser-déposer pour réorganiser · Cliquer sur une table pour assigner des invités
        </div>
      </div>
    </div>
  )
}

/* ---- Tab: Budget ---- */
function BudgetTab({ ev, formatEuro }: { ev: CalendarEvent; formatEuro: (n: number) => string }) {
  const diff = ev.budgetActual - ev.budgetPlanned
  const pct = ev.budgetPlanned > 0 ? (ev.budgetActual / ev.budgetPlanned) * 100 : 0
  const categoriesData = [
    { cat: 'Nourriture', prevu: ev.budgetPlanned * 0.5, reel: ev.budgetActual * 0.5 },
    { cat: 'Boissons', prevu: ev.budgetPlanned * 0.2, reel: ev.budgetActual * 0.22 },
    { cat: 'Staff', prevu: ev.budgetPlanned * 0.15, reel: ev.budgetActual * 0.14 },
    { cat: 'Vendors', prevu: ev.budgetPlanned * 0.1, reel: ev.budgetActual * 0.09 },
    { cat: 'Divers', prevu: ev.budgetPlanned * 0.05, reel: ev.budgetActual * 0.05 },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Prévu</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{formatEuro(ev.budgetPlanned)}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Dépensé</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{formatEuro(ev.budgetActual)}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Écart</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: diff > 0 ? '#ef4444' : '#10b981', marginTop: 4 }}>
            {diff > 0 ? '+' : ''}{formatEuro(diff)}
          </div>
        </div>
      </div>

      {ev.budgetActual > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Répartition par catégorie</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="cat" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <RTooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} formatter={(v: any) => formatEuro(v)} />
              <Bar dataKey="prevu" name="Prévu" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reel" name="Réel" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ---- Tab: Weather ---- */
function WeatherTab({ ev }: { ev: CalendarEvent }) {
  return (
    <div>
      <div style={{ ...card, padding: 20, background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', border: '1px solid #93c5fd', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sun size={32} style={{ color: '#f59e0b' }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a8a' }}>Prévisions pour le jour J</div>
            <div style={{ fontSize: 13, color: '#1e40af', marginTop: 2 }}>
              {format(ev.startDate, 'EEEE d MMMM', { locale: fr })} · Ensoleillé · 20°C · Vent léger
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prévisions 7 jours</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {WEATHER_FORECAST.map((w, i) => {
            const Icon = w.icon
            return (
              <div key={i} style={{ padding: 10, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{w.day}</div>
                <Icon size={24} style={{ color: w.cond === 'Pluie' ? '#0284c7' : w.cond === 'Nuageux' ? '#64748b' : '#f59e0b', margin: '6px auto' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{w.temp}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---- Tab: Gallery ---- */
function GalleryTab({ ev }: { ev: CalendarEvent }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Galerie photos ({ev.photos})
        </div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Upload size={12} /> Ajouter photos
        </button>
      </div>
      {ev.photos === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Image size={28} style={{ marginBottom: 8 }} />
          <div>Pas encore de photos — disponible après l'événement</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Array.from({ length: ev.photos }, (_, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 10,
                background: `linear-gradient(135deg, hsl(${i * 30}, 60%, 70%), hsl(${i * 30}, 60%, 50%))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)',
              }}>
                <Image size={28} />
              </div>
            ))}
          </div>
          <button style={{ marginTop: 12, width: '100%', padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Share2 size={15} /> Partager la galerie avec le client
          </button>
        </>
      )}
    </div>
  )
}

/* ---- Tab: Feedback ---- */
function FeedbackTab({ ev }: { ev: CalendarEvent }) {
  const hasScore = typeof ev.feedbackScore === 'number' && ev.feedbackScore > 0
  return (
    <div>
      {hasScore ? (
        <>
          <div style={{ ...card, padding: 24, textAlign: 'center', marginBottom: 14, background: 'linear-gradient(135deg, #fef3c7, #fed7aa)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Satisfaction client</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#b45309' }}>{ev.feedbackScore} / 5</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={20} style={{ fill: i < (ev.feedbackScore ?? 0) ? '#f59e0b' : 'transparent', color: '#f59e0b' }} />
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Commentaire du client</div>
            <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>
              "Soirée réussie ! Le service était impeccable, le matériel karaoké parfait. L'équipe s'est montrée très disponible tout au long de la soirée. Nous reviendrons avec plaisir !"
            </p>
          </div>
        </>
      ) : (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Star size={32} style={{ marginBottom: 8 }} />
          <div style={{ marginBottom: 14 }}>Aucun feedback pour le moment</div>
          <button style={{ padding: '10px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} /> Envoyer un questionnaire
          </button>
        </div>
      )}
    </div>
  )
}
