import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  getDaysInMonth,
  getDate,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Calendar,
  Clock,
  Euro,
  Phone,
  Mail,
  X,
  Plus,
  LayoutGrid,
  GanttChart,
  List,
  FileText,
  Send,
  CreditCard,
  Edit3,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventStatus = 'Confirme' | 'Depot paye' | 'Envoye' | 'Brouillon'

interface EventStage {
  label: string
  reached: boolean
}

interface CalendarEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  lieu: string
  headcount: number
  status: EventStatus
  client: {
    name: string
    email: string
    phone: string
  }
  montant: number
  depot: number
  depotPaid: boolean
  notes: string
  tableArrangement: string
  timeStart: string
  timeEnd: string
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  EventStatus,
  { color: string; bg: string; label: string }
> = {
  Confirme: { color: '#16a34a', bg: '#dcfce7', label: 'Confirm\u00e9' },
  'Depot paye': { color: '#2563eb', bg: '#dbeafe', label: 'D\u00e9p\u00f4t pay\u00e9' },
  Envoye: { color: '#ea580c', bg: '#ffedd5', label: 'Envoy\u00e9' },
  Brouillon: { color: '#64748b', bg: '#f1f5f9', label: 'Brouillon' },
}

const STATUS_BAR_COLOR: Record<EventStatus, string> = {
  Confirme: '#16a34a',
  'Depot paye': '#2563eb',
  Envoye: '#ea580c',
  Brouillon: '#94a3b8',
}

function getStages(status: EventStatus): EventStage[] {
  const order: EventStatus[] = ['Brouillon', 'Envoye', 'Depot paye', 'Confirme']
  const idx = order.indexOf(status)
  return [
    { label: 'Devis', reached: idx >= 0 },
    { label: 'Envoy\u00e9', reached: idx >= 1 },
    { label: 'D\u00e9p\u00f4t', reached: idx >= 2 },
    { label: 'Confirm\u00e9', reached: idx >= 3 },
    { label: 'Jour J', reached: false },
    { label: 'Termin\u00e9', reached: false },
  ]
}

/* ------------------------------------------------------------------ */
/*  Mock data (10 events April-May 2026)                               */
/* ------------------------------------------------------------------ */

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    name: 'Anniversaire 50 ans M. Braun',
    startDate: new Date(2026, 3, 18),
    endDate: new Date(2026, 3, 18),
    lieu: 'Salle',
    headcount: 45,
    status: 'Confirme',
    client: { name: 'Thomas Braun', email: 'thomas.braun@mail.lu', phone: '+352 621 234 567' },
    montant: 2800,
    depot: 840,
    depotPaid: true,
    notes: 'Buffet froid souhait\u00e9, d\u00e9co argent\u00e9e. G\u00e2teau command\u00e9 chez P\u00e2tisserie Weber.',
    tableArrangement: '6 tables rondes de 8',
    timeStart: '19:00',
    timeEnd: '01:00',
  },
  {
    id: '2',
    name: 'Team Building TechCorp',
    startDate: new Date(2026, 3, 20),
    endDate: new Date(2026, 3, 20),
    lieu: 'Terrasse',
    headcount: 25,
    status: 'Depot paye',
    client: { name: 'Julie Meyers', email: 'j.meyers@techcorp.lu', phone: '+352 691 456 789' },
    montant: 1500,
    depot: 500,
    depotPaid: true,
    notes: 'Pr\u00e9voir vid\u00e9oprojecteur et sono portable.',
    tableArrangement: '3 grandes tables rectangulaires',
    timeStart: '14:00',
    timeEnd: '20:00',
  },
  {
    id: '3',
    name: 'Mariage Weber-Klein',
    startDate: new Date(2026, 3, 26),
    endDate: new Date(2026, 3, 27),
    lieu: 'Salle+Terrasse',
    headcount: 80,
    status: 'Envoye',
    client: { name: 'Marc Weber', email: 'marc.weber@gmail.com', phone: '+352 661 789 012' },
    montant: 8500,
    depot: 2550,
    depotPaid: false,
    notes: 'Vin d\'honneur terrasse, d\u00eener salle. DJ confirm\u00e9. Menu 3 services + dessert buffet.',
    tableArrangement: '10 tables rondes de 8 + table d\'honneur',
    timeStart: '16:00',
    timeEnd: '04:00',
  },
  {
    id: '4',
    name: 'R\u00e9union Cabinet Muller',
    startDate: new Date(2026, 3, 22),
    endDate: new Date(2026, 3, 22),
    lieu: 'Bar',
    headcount: 12,
    status: 'Confirme',
    client: { name: 'Pierre Muller', email: 'p.muller@cabinet-muller.lu', phone: '+352 26 123 456' },
    montant: 450,
    depot: 150,
    depotPaid: true,
    notes: 'Caf\u00e9 et viennoiseries \u00e0 l\'arriv\u00e9e. Lunch l\u00e9ger \u00e0 12h30.',
    tableArrangement: '1 table conf\u00e9rence 14 places',
    timeStart: '09:00',
    timeEnd: '14:00',
  },
  {
    id: '5',
    name: 'Communion Sophie R.',
    startDate: new Date(2026, 4, 3),
    endDate: new Date(2026, 4, 3),
    lieu: 'Salle',
    headcount: 35,
    status: 'Brouillon',
    client: { name: 'C\u00e9line Reuter', email: 'celine.reuter@pt.lu', phone: '+352 621 567 890' },
    montant: 2200,
    depot: 660,
    depotPaid: false,
    notes: 'Menu enfant pour 8 enfants. D\u00e9co pastel rose et blanc.',
    tableArrangement: '4 tables rondes de 8 + 1 table enfants',
    timeStart: '12:00',
    timeEnd: '18:00',
  },
  {
    id: '6',
    name: 'Afterwork EuroConsult',
    startDate: new Date(2026, 4, 8),
    endDate: new Date(2026, 4, 8),
    lieu: 'Bar',
    headcount: 20,
    status: 'Brouillon',
    client: { name: 'S\u00e9bastien Faber', email: 's.faber@euroconsult.eu', phone: '+352 691 234 567' },
    montant: 600,
    depot: 200,
    depotPaid: false,
    notes: 'Cocktails + finger food. Ambiance lounge.',
    tableArrangement: 'Mange-debout + coin canap\u00e9s',
    timeStart: '18:00',
    timeEnd: '22:00',
  },
  {
    id: '7',
    name: 'F\u00eate nationale',
    startDate: new Date(2026, 5, 23),
    endDate: new Date(2026, 5, 23),
    lieu: 'Salle+Terrasse',
    headcount: 100,
    status: 'Envoye',
    client: { name: 'Commune de Hesperange', email: 'events@hesperange.lu', phone: '+352 26 360 100' },
    montant: 5000,
    depot: 1500,
    depotPaid: false,
    notes: 'BBQ terrasse + bar int\u00e9rieur. Feu d\'artifice \u00e0 23h.',
    tableArrangement: 'Libre \u2014 mange-debout + bancs ext\u00e9rieurs',
    timeStart: '18:00',
    timeEnd: '02:00',
  },
  {
    id: '8',
    name: 'D\u00e9part retraite M. Schmit',
    startDate: new Date(2026, 4, 15),
    endDate: new Date(2026, 4, 15),
    lieu: 'Salle',
    headcount: 30,
    status: 'Depot paye',
    client: { name: 'Anne Schmit', email: 'anne.schmit@post.lu', phone: '+352 621 678 901' },
    montant: 1800,
    depot: 540,
    depotPaid: true,
    notes: 'Discours \u00e0 20h. Livre d\'or + diaporama photos. Menu luxembourgeois.',
    tableArrangement: '4 tables rondes de 8',
    timeStart: '19:00',
    timeEnd: '00:00',
  },
  {
    id: '9',
    name: 'Bapt\u00eame Lucas D.',
    startDate: new Date(2026, 4, 10),
    endDate: new Date(2026, 4, 10),
    lieu: 'Salle',
    headcount: 40,
    status: 'Confirme',
    client: { name: 'Sophie Dupont', email: 'sophie.dupont@gmail.com', phone: '+352 661 345 678' },
    montant: 2500,
    depot: 750,
    depotPaid: true,
    notes: 'Brunch format. D\u00e9co bleu ciel. 5 enfants en bas \u00e2ge \u2014 pr\u00e9voir espace jeux.',
    tableArrangement: '5 tables rondes de 8',
    timeStart: '11:00',
    timeEnd: '17:00',
  },
  {
    id: '10',
    name: 'Soir\u00e9e karaok\u00e9',
    startDate: new Date(2026, 3, 25),
    endDate: new Date(2026, 3, 25),
    lieu: 'Bar',
    headcount: 50,
    status: 'Confirme',
    client: { name: 'Luc Thill', email: 'luc.thill@yahoo.com', phone: '+352 691 890 123' },
    montant: 800,
    depot: 250,
    depotPaid: true,
    notes: 'Mat\u00e9riel karaok\u00e9 lou\u00e9 chez SoundLux. Happy hour 19h-20h.',
    tableArrangement: 'Libre \u2014 mange-debout + bar',
    timeStart: '19:00',
    timeEnd: '02:00',
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

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  borderRadius: 10,
  transition: 'all .15s',
}

type ViewMode = 'calendar' | 'timeline' | 'list'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 15))
  const [view, setView] = useState<ViewMode>('timeline')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [tooltipEvent, setTooltipEvent] = useState<CalendarEvent | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const timelineRef = useRef<HTMLDivElement>(null)

  /* ---- helpers ---- */
  const eventsInMonth = useMemo(
    () =>
      mockEvents.filter((e) => {
        const ms = startOfMonth(currentMonth)
        const me = endOfMonth(currentMonth)
        return (
          (isSameMonth(e.startDate, currentMonth) ||
            isSameMonth(e.endDate, currentMonth)) ||
          (isBefore(e.startDate, ms) && isAfter(e.endDate, me))
        )
      }),
    [currentMonth],
  )

  const goToday = () => setCurrentMonth(new Date(2026, 3, 15))
  const goPrev = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goNext = () => setCurrentMonth(addMonths(currentMonth, 1))

  const formatEuro = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })

  /* ---- calendar grid ---- */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { locale: fr })
    const calEnd = endOfWeek(monthEnd, { locale: fr })
    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  const getEventsForDay = (day: Date) =>
    mockEvents.filter(
      (e) =>
        isSameDay(e.startDate, day) ||
        isSameDay(e.endDate, day) ||
        (isBefore(e.startDate, day) && isAfter(e.endDate, day)),
    )

  /* scroll timeline to today on mount / month change */
  useEffect(() => {
    if (view === 'timeline' && timelineRef.current) {
      const todayCol = getDate(new Date(2026, 3, 15)) - 1
      const colW = 46
      timelineRef.current.scrollLeft = Math.max(0, todayCol * colW - 200)
    }
  }, [view, currentMonth])

  /* ---------------------------------------------------------------- */
  /*  Timeline helpers                                                 */
  /* ---------------------------------------------------------------- */

  const daysInMonth = getDaysInMonth(currentMonth)
  const monthStart = startOfMonth(currentMonth)

  const COL_W = 46

  function eventBarStyle(ev: CalendarEvent): React.CSSProperties {
    const clampedStart = isBefore(ev.startDate, monthStart)
      ? monthStart
      : ev.startDate
    const clampedEnd = isAfter(ev.endDate, endOfMonth(currentMonth))
      ? endOfMonth(currentMonth)
      : ev.endDate
    const startCol = differenceInCalendarDays(clampedStart, monthStart)
    const span = differenceInCalendarDays(clampedEnd, clampedStart) + 1

    return {
      position: 'absolute' as const,
      left: startCol * COL_W + 2,
      width: span * COL_W - 4,
      height: 36,
      borderRadius: 8,
      background: STATUS_BAR_COLOR[ev.status],
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 10px',
      cursor: 'pointer',
      overflow: 'hidden',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      transition: 'filter .15s',
    }
  }

  /* ---- row assignment (stack events that overlap) ---- */
  const sortedEvents = useMemo(
    () => [...eventsInMonth].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [eventsInMonth],
  )

  const rowAssignments = useMemo(() => {
    const rows: { end: number }[] = []
    const map = new Map<string, number>()
    sortedEvents.forEach((ev) => {
      const s = differenceInCalendarDays(
        isBefore(ev.startDate, monthStart) ? monthStart : ev.startDate,
        monthStart,
      )
      const e = differenceInCalendarDays(
        isAfter(ev.endDate, endOfMonth(currentMonth)) ? endOfMonth(currentMonth) : ev.endDate,
        monthStart,
      )
      let placed = false
      for (let r = 0; r < rows.length; r++) {
        if (s > rows[r].end) {
          rows[r].end = e
          map.set(ev.id, r)
          placed = true
          break
        }
      }
      if (!placed) {
        map.set(ev.id, rows.length)
        rows.push({ end: e })
      }
    })
    return { map, totalRows: rows.length }
  }, [sortedEvents, monthStart, currentMonth])

  /* ---- upcoming sorted ---- */
  const now = new Date(2026, 3, 15)
  const upcomingEvents = useMemo(
    () =>
      [...mockEvents]
        .filter((e) => e.startDate >= now || e.endDate >= now)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [],
  )

  /* ================================================================ */
  /*  SUB-COMPONENTS                                                   */
  /* ================================================================ */

  /* ---------- Status badge ---------- */
  const StatusBadge = ({ status }: { status: EventStatus }) => {
    const cfg = STATUS_CONFIG[status]
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          background: cfg.bg,
          color: cfg.color,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: cfg.color,
          }}
        />
        {cfg.label}
      </span>
    )
  }

  /* ---------- View tab button ---------- */
  const TabBtn = ({
    mode,
    icon,
    label,
  }: {
    mode: ViewMode
    icon: React.ReactNode
    label: string
  }) => (
    <button
      onClick={() => setView(mode)}
      style={{
        ...btnBase,
        padding: '8px 16px',
        background: view === mode ? '#1e293b' : '#f8fafc',
        color: view === mode ? '#fff' : '#64748b',
        border: view === mode ? 'none' : '1px solid #e2e8f0',
      }}
    >
      {icon}
      {label}
    </button>
  )

  /* ---------- Tooltip ---------- */
  const Tooltip = ({ ev }: { ev: CalendarEvent }) => {
    const cfg = STATUS_CONFIG[ev.status]
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          zIndex: 9999,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          minWidth: 260,
          maxWidth: 320,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
          {ev.name}
        </div>
        <StatusBadge status={ev.status} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '18px 1fr',
            gap: '6px 8px',
            marginTop: 10,
            fontSize: 13,
            color: '#475569',
          }}
        >
          <Calendar size={14} style={{ marginTop: 1, color: '#94a3b8' }} />
          <span>
            {format(ev.startDate, 'd MMM yyyy', { locale: fr })}
            {!isSameDay(ev.startDate, ev.endDate) &&
              ` \u2014 ${format(ev.endDate, 'd MMM yyyy', { locale: fr })}`}
          </span>
          <Clock size={14} style={{ marginTop: 1, color: '#94a3b8' }} />
          <span>{ev.timeStart} \u2013 {ev.timeEnd}</span>
          <MapPin size={14} style={{ marginTop: 1, color: '#94a3b8' }} />
          <span>{ev.lieu}</span>
          <Users size={14} style={{ marginTop: 1, color: '#94a3b8' }} />
          <span>{ev.headcount} personnes</span>
          <Euro size={14} style={{ marginTop: 1, color: '#94a3b8' }} />
          <span>{formatEuro(ev.montant)}</span>
        </div>
      </motion.div>
    )
  }

  /* ---------- Detail Modal ---------- */
  const DetailModal = ({ ev }: { ev: CalendarEvent }) => {
    const cfg = STATUS_CONFIG[ev.status]
    const stages = getStages(ev.status)
    const resteAPayer = ev.montant - (ev.depotPaid ? ev.depot : 0)

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={() => setSelectedEvent(null)}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 20,
            width: '94%',
            maxWidth: 640,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            position: 'relative',
          }}
        >
          {/* top bar */}
          <div
            style={{
              height: 6,
              borderRadius: '20px 20px 0 0',
              background: cfg.color,
            }}
          />

          {/* close button */}
          <button
            onClick={() => setSelectedEvent(null)}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#64748b" />
          </button>

          <div style={{ padding: '28px 32px 32px' }}>
            {/* header */}
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              {ev.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <StatusBadge status={ev.status} />
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {format(ev.startDate, 'EEEE d MMMM yyyy', { locale: fr })}
                {!isSameDay(ev.startDate, ev.endDate) &&
                  ` \u2014 ${format(ev.endDate, 'd MMMM yyyy', { locale: fr })}`}
              </span>
            </div>

            {/* 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Client */}
              <div style={{ ...card, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Client
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                  {ev.client.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} color="#94a3b8" /> {ev.client.email}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} color="#94a3b8" /> {ev.client.phone}
                  </span>
                </div>
              </div>

              {/* Lieu */}
              <div style={{ ...card, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Lieu & Disposition
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                  <MapPin size={15} color="#94a3b8" /> {ev.lieu}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', marginBottom: 4 }}>
                  <Users size={13} color="#94a3b8" /> {ev.headcount} personnes
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  {ev.tableArrangement}
                </div>
              </div>
            </div>

            {/* Financial */}
            <div style={{ ...card, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Financier
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Montant total</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                    {formatEuro(ev.montant)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                    D\u00e9p\u00f4t ({ev.depotPaid ? 'pay\u00e9' : 'en attente'})
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: ev.depotPaid ? '#16a34a' : '#ea580c',
                    }}
                  >
                    {formatEuro(ev.depot)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Reste \u00e0 payer</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                    {formatEuro(resteAPayer)}
                  </div>
                </div>
              </div>
              {/* progress bar */}
              <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: '#f1f5f9' }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                    width: `${((ev.depotPaid ? ev.depot : 0) / ev.montant) * 100}%`,
                    transition: 'width .4s',
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            {ev.notes && (
              <div style={{ ...card, padding: 18, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Notes
                </div>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  {ev.notes}
                </p>
              </div>
            )}

            {/* Stages timeline */}
            <div style={{ ...card, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
                Progression
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {stages.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: s.reached ? cfg.color : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background .3s',
                        }}
                      >
                        {s.reached && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: s.reached ? cfg.color : '#94a3b8', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < stages.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: s.reached && stages[i + 1].reached ? cfg.color : '#e2e8f0',
                          margin: '0 4px',
                          marginBottom: 18,
                          borderRadius: 1,
                          transition: 'background .3s',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button style={{ ...btnBase, padding: '10px 18px', background: '#1e293b', color: '#fff' }}>
                <Edit3 size={14} /> Modifier
              </button>
              <button style={{ ...btnBase, padding: '10px 18px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <Send size={14} /> Envoyer le devis
              </button>
              <button style={{ ...btnBase, padding: '10px 18px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0' }}>
                <CreditCard size={14} /> Marquer d\u00e9p\u00f4t pay\u00e9
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ---- Header ---- */}
        <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Agenda \u00c9v\u00e9nements
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
              Planification et suivi de vos \u00e9v\u00e9nements
            </p>
          </div>
          <button
            style={{
              ...btnBase,
              padding: '10px 20px',
              background: '#1e293b',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(30,41,59,0.18)',
            }}
          >
            <Plus size={16} /> Nouvel \u00e9v\u00e9nement
          </button>
        </motion.div>

        {/* ---- Top bar: View switch + period nav ---- */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* view tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            <TabBtn mode="calendar" icon={<LayoutGrid size={15} />} label="Calendrier" />
            <TabBtn mode="timeline" icon={<GanttChart size={15} />} label="Timeline" />
            <TabBtn mode="list" icon={<List size={15} />} label="Liste" />
          </div>

          {/* period nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={goPrev}
              style={{
                ...btnBase,
                width: 36,
                height: 36,
                padding: 0,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
              }}
            >
              <ChevronLeft size={16} color="#475569" />
            </button>
            <button
              onClick={goToday}
              style={{
                ...btnBase,
                padding: '8px 16px',
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
              }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={goNext}
              style={{
                ...btnBase,
                width: 36,
                height: 36,
                padding: 0,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
              }}
            >
              <ChevronRight size={16} color="#475569" />
            </button>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#1e293b',
                textTransform: 'capitalize',
                marginLeft: 8,
              }}
            >
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </span>
          </div>
        </motion.div>

        {/* ---- Stat pills ---- */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(Object.keys(STATUS_CONFIG) as EventStatus[]).map((s) => {
            const count = eventsInMonth.filter((e) => e.status === s).length
            const cfg = STATUS_CONFIG[s]
            return (
              <div
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: cfg.bg,
                  fontSize: 13,
                  fontWeight: 600,
                  color: cfg.color,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cfg.color,
                  }}
                />
                {cfg.label}: {count}
              </div>
            )
          })}
        </motion.div>

        {/* ============================================================ */}
        {/*  CALENDAR VIEW                                                */}
        {/* ============================================================ */}
        <AnimatePresence mode="wait">
          {view === 'calendar' && (
            <motion.div
              key="cal"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit="hidden"
              style={card}
            >
              {/* Day names */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 2,
                  marginBottom: 6,
                }}
              >
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#64748b',
                      padding: '6px 0',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 2,
                }}
              >
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day)
                  const inMonth = isSameMonth(day, currentMonth)
                  const today = isSameDay(day, now)
                  const weekend = isWeekend(day)

                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 80,
                        padding: 6,
                        borderRadius: 10,
                        background: today
                          ? 'rgba(30,41,59,0.04)'
                          : weekend && inMonth
                            ? '#fafbfc'
                            : inMonth
                              ? '#fff'
                              : 'transparent',
                        border: today ? '2px solid #1e293b' : '1px solid #f1f5f9',
                        cursor: dayEvents.length ? 'pointer' : 'default',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: today ? 700 : 400,
                          color: inMonth ? (today ? '#1e293b' : '#334155') : '#cbd5e1',
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#fff',
                              background: STATUS_BAR_COLOR[ev.status],
                              borderRadius: 4,
                              padding: '2px 5px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                          >
                            {ev.name}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                            +{dayEvents.length - 3} de plus
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  TIMELINE VIEW                                                */}
          {/* ============================================================ */}
          {view === 'timeline' && (
            <motion.div
              key="timeline"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit="hidden"
              style={{ ...card, padding: 0, overflow: 'hidden' }}
            >
              <div
                ref={timelineRef}
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  position: 'relative',
                }}
              >
                {/* The timeline canvas */}
                <div style={{ minWidth: daysInMonth * COL_W + 180, position: 'relative' }}>
                  {/* ---- Day headers ---- */}
                  <div
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #e2e8f0',
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                      zIndex: 20,
                    }}
                  >
                    {/* label col */}
                    <div
                      style={{
                        width: 180,
                        minWidth: 180,
                        borderRight: '1px solid #e2e8f0',
                        padding: '10px 14px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        position: 'sticky',
                        left: 0,
                        background: '#fff',
                        zIndex: 25,
                      }}
                    >
                      \u00c9v\u00e9nement
                    </div>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = addDays(monthStart, i)
                      const tod = isSameDay(d, now)
                      const wknd = isWeekend(d)
                      return (
                        <div
                          key={i}
                          style={{
                            width: COL_W,
                            minWidth: COL_W,
                            textAlign: 'center',
                            padding: '8px 0',
                            fontSize: 11,
                            fontWeight: tod ? 800 : 500,
                            color: tod ? '#fff' : wknd ? '#94a3b8' : '#475569',
                            background: tod ? '#1e293b' : 'transparent',
                            borderRadius: tod ? '8px 8px 0 0' : 0,
                            position: 'relative',
                          }}
                        >
                          <div style={{ fontSize: 9, textTransform: 'uppercase' }}>
                            {format(d, 'EEE', { locale: fr })}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{i + 1}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ---- Rows area ---- */}
                  <div style={{ position: 'relative', display: 'flex' }}>
                    {/* Event labels column */}
                    <div
                      style={{
                        width: 180,
                        minWidth: 180,
                        borderRight: '1px solid #e2e8f0',
                        position: 'sticky',
                        left: 0,
                        background: '#fff',
                        zIndex: 15,
                      }}
                    >
                      {sortedEvents.map((ev) => {
                        const row = rowAssignments.map.get(ev.id) ?? 0
                        return (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            style={{
                              position: 'absolute',
                              top: row * 48 + 8,
                              left: 0,
                              width: 180,
                              height: 36,
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 14px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#1e293b',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 150,
                                }}
                              >
                                {ev.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                {ev.client.name}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* grid + bars area */}
                    <div
                      style={{
                        position: 'relative',
                        width: daysInMonth * COL_W,
                        height: rowAssignments.totalRows * 48 + 16,
                        minHeight: 120,
                      }}
                    >
                      {/* weekend shading + grid lines */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = addDays(monthStart, i)
                        const wknd = isWeekend(d)
                        return (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              left: i * COL_W,
                              top: 0,
                              width: COL_W,
                              height: '100%',
                              background: wknd ? 'rgba(241,245,249,0.6)' : 'transparent',
                              borderRight: '1px solid #f1f5f9',
                            }}
                          />
                        )
                      })}

                      {/* Today marker */}
                      {isSameMonth(now, currentMonth) && (
                        <div
                          style={{
                            position: 'absolute',
                            left: (getDate(now) - 1) * COL_W + COL_W / 2,
                            top: 0,
                            width: 2,
                            height: '100%',
                            background: '#ef4444',
                            zIndex: 10,
                            borderRadius: 1,
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: -3,
                              left: -4,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: '#ef4444',
                            }}
                          />
                        </div>
                      )}

                      {/* Event bars */}
                      {sortedEvents.map((ev) => {
                        const row = rowAssignments.map.get(ev.id) ?? 0
                        const barSt = eventBarStyle(ev)
                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, scaleX: 0.6 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                            style={{
                              ...barSt,
                              top: row * 48 + 8,
                              transformOrigin: 'left center',
                            }}
                            onClick={() => setSelectedEvent(ev)}
                            onMouseEnter={(e) => {
                              setTooltipEvent(ev)
                              setTooltipPos({ x: Math.min(e.clientX + 12, window.innerWidth - 340), y: e.clientY - 160 })
                            }}
                            onMouseLeave={() => setTooltipEvent(null)}
                          >
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.name}
                            </span>
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

              {/* Legend */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#fafbfc',
                  fontSize: 12,
                  color: '#64748b',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600, color: '#94a3b8' }}>L\u00e9gende :</span>
                {(Object.keys(STATUS_CONFIG) as EventStatus[]).map((s) => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_BAR_COLOR[s] }} />
                    {STATUS_CONFIG[s].label}
                  </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 8 }}>
                  <span style={{ width: 10, height: 2, background: '#ef4444', borderRadius: 1 }} />
                  Aujourd'hui
                </span>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/*  LIST VIEW                                                    */}
          {/* ============================================================ */}
          {view === 'list' && (
            <motion.div
              key="list"
              variants={stagger}
              initial="hidden"
              animate="show"
              exit="hidden"
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {upcomingEvents.map((ev) => {
                const daysUntil = differenceInCalendarDays(ev.startDate, now)
                const cfg = STATUS_CONFIG[ev.status]
                const stages = getStages(ev.status)
                const reachedCount = stages.filter((s) => s.reached).length

                return (
                  <motion.div
                    key={ev.id}
                    variants={fadeUp}
                    whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    onClick={() => setSelectedEvent(ev)}
                    style={{
                      ...card,
                      padding: 0,
                      display: 'flex',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'box-shadow .2s',
                    }}
                  >
                    {/* Date tile */}
                    <div
                      style={{
                        width: 80,
                        minWidth: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        borderRight: '1px solid #e2e8f0',
                        padding: '16px 0',
                      }}
                    >
                      <span style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                        {format(ev.startDate, 'd')}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
                        {format(ev.startDate, 'MMM', { locale: fr })}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {format(ev.startDate, 'yyyy')}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                            {ev.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={13} color="#94a3b8" /> {ev.client.name}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={13} color="#94a3b8" /> {ev.lieu}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Users size={13} color="#94a3b8" /> {ev.headcount} pers.
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Euro size={13} color="#94a3b8" /> {formatEuro(ev.montant)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <StatusBadge status={ev.status} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: daysUntil <= 3 ? '#ef4444' : daysUntil <= 7 ? '#ea580c' : '#64748b',
                              background: daysUntil <= 3 ? '#fef2f2' : daysUntil <= 7 ? '#fff7ed' : '#f8fafc',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {daysUntil === 0
                              ? "Aujourd'hui"
                              : daysUntil === 1
                                ? 'Demain'
                                : `Dans ${daysUntil} jours`}
                          </span>
                        </div>
                      </div>

                      {/* mini progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {stages.map((s, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              background: s.reached ? cfg.color : '#e2e8f0',
                              transition: 'background .3s',
                            }}
                          />
                        ))}
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6, flexShrink: 0 }}>
                          {reachedCount}/{stages.length}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---- Tooltip overlay ---- */}
      <AnimatePresence>
        {tooltipEvent && <Tooltip ev={tooltipEvent} />}
      </AnimatePresence>

      {/* ---- Detail modal ---- */}
      <AnimatePresence>
        {selectedEvent && <DetailModal ev={selectedEvent} />}
      </AnimatePresence>
    </div>
  )
}
