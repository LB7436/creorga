import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
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
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, MapPin, Users, Calendar } from 'lucide-react'

interface CalendarEvent {
  id: string
  name: string
  date: Date
  lieu: string
  headcount: number
  status: string
  color: string
}

const mockEvents: CalendarEvent[] = [
  { id: '1', name: 'Anniversaire 50 ans Dupont', date: new Date(2026, 4, 25), lieu: 'Salle principale', headcount: 45, status: 'Confirmé', color: '#16a34a' },
  { id: '2', name: 'Mariage Schmit-Kieffer', date: new Date(2026, 5, 14), lieu: 'Terrasse + salle', headcount: 120, status: 'Acompte reçu', color: '#d97706' },
  { id: '3', name: 'Team Building TechCorp', date: new Date(2026, 4, 20), lieu: 'Espace lounge', headcount: 35, status: 'En attente', color: '#6D28D9' },
  { id: '4', name: 'Cocktail inauguration', date: new Date(2026, 4, 8), lieu: 'Bar & terrasse', headcount: 60, status: 'Brouillon', color: '#475569' },
]

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  padding: 24,
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

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
    mockEvents.filter((e) => isSameDay(e.date, day))

  const upcomingEvents = mockEvents
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
            Agenda Événements
          </h1>
          <p style={{ fontSize: 14, color: '#475569' }}>
            Vue calendrier et événements à venir
          </p>
        </motion.div>

        {/* Calendar */}
        <motion.div variants={fadeUp} style={card}>
          {/* Month navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={18} style={{ color: '#475569' }} />
            </button>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1e293b',
                textTransform: 'capitalize',
              }}
            >
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={18} style={{ color: '#475569' }} />
            </button>
          </div>

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
                  color: '#475569',
                  padding: '6px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
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
              const today = isToday(day)

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 64,
                    padding: 6,
                    borderRadius: 10,
                    background: today
                      ? 'rgba(109,40,217,0.06)'
                      : inMonth
                        ? '#fafafa'
                        : 'transparent',
                    border: today
                      ? '2px solid #6D28D9'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: today ? 700 : 400,
                      color: inMonth
                        ? today
                          ? '#6D28D9'
                          : '#1e293b'
                        : '#cbd5e1',
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      marginTop: 4,
                    }}
                  >
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 3,
                          background: ev.color,
                        }}
                        title={ev.name}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Upcoming events */}
        <motion.div variants={fadeUp} style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Calendar size={18} style={{ color: '#6D28D9' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Événements à venir
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: '#f8fafc',
                  borderLeft: `4px solid ${event.color}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1e293b',
                        lineHeight: 1,
                      }}
                    >
                      {format(event.date, 'd')}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#475569',
                        textTransform: 'uppercase',
                      }}
                    >
                      {format(event.date, 'MMM', { locale: fr })}
                    </span>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: 4,
                      }}
                    >
                      {event.name}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: '#475569',
                        }}
                      >
                        <MapPin size={12} />
                        {event.lieu}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: '#475569',
                        }}
                      >
                        <Users size={12} />
                        {event.headcount} pers.
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      event.status === 'Confirmé'
                        ? '#dcfce7'
                        : event.status === 'Acompte reçu'
                          ? '#fef3c7'
                          : '#f1f5f9',
                    color:
                      event.status === 'Confirmé'
                        ? '#16a34a'
                        : event.status === 'Acompte reçu'
                          ? '#92400e'
                          : '#475569',
                  }}
                >
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
