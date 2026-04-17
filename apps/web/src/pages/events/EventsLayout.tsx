import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarCheck,
  Calendar,
  Building2,
  CalendarClock,
  Euro,
  Target,
} from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const COLOR = '#6D28D9'

const items = [
  { label: 'Devis', path: '/events/devis', icon: CalendarCheck },
  { label: 'Agenda', path: '/events/agenda', icon: Calendar },
  { label: 'Clients B2B', path: '/events/clients', icon: Building2 },
]

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
  delay?: number
}

function StatCard({ icon: Icon, label, value, accent = COLOR, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      style={{
        flex: 1,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minWidth: 180,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${accent}14`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
          {value}
        </div>
      </div>
    </motion.div>
  )
}

export default function EventsLayout() {
  const stats = useMemo(
    () => ({
      upcoming: 7,
      revenue: '18 420 €',
      conversion: '62 %',
    }),
    [],
  )

  const banner = (
    <div
      style={{
        padding: '16px 24px 0',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        background: '#faf7ff',
      }}
    >
      <StatCard
        icon={CalendarClock}
        label="Événements à venir"
        value={String(stats.upcoming)}
        accent={COLOR}
        delay={0}
      />
      <StatCard
        icon={Euro}
        label="CA événements (mois)"
        value={stats.revenue}
        accent="#059669"
        delay={0.05}
      />
      <StatCard
        icon={Target}
        label="Taux de conversion"
        value={stats.conversion}
        accent="#d97706"
        delay={0.1}
      />
    </div>
  )

  return (
    <ModuleLayout
      title="Événements"
      color={COLOR}
      items={items}
      backPath="/modules"
      banner={banner}
    />
  )
}
