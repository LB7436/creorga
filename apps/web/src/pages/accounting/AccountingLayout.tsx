import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote,
  Receipt,
  Percent,
  BarChart3,
  Lock,
  TrendingUp,
  Hash,
  DoorOpen,
  DoorClosed,
} from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const COLOR = '#1F2937'

const items = [
  { label: 'Caisse', path: '/accounting/caisse', icon: Banknote },
  { label: 'Clôture', path: '/accounting/cloture', icon: Lock },
  { label: 'Dépenses', path: '/accounting/depenses', icon: Receipt },
  { label: 'TVA', path: '/accounting/tva', icon: Percent },
  { label: 'Rapports', path: '/accounting/rapports', icon: BarChart3 },
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

export default function AccountingLayout() {
  // Placeholder stats — to be wired to real caisse state later
  const stats = useMemo(
    () => ({
      ca: '2 847,50 €',
      transactions: 42,
      cloture: 'Ouverte' as 'Ouverte' | 'Fermée',
    }),
    [],
  )

  const isOpen = stats.cloture === 'Ouverte'

  const banner = (
    <div
      style={{
        padding: '16px 24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard
          icon={TrendingUp}
          label="CA aujourd'hui"
          value={stats.ca}
          accent="#059669"
          delay={0}
        />
        <StatCard
          icon={Hash}
          label="Transactions"
          value={String(stats.transactions)}
          accent={COLOR}
          delay={0.05}
        />
        <StatCard
          icon={isOpen ? DoorOpen : DoorClosed}
          label="Clôture"
          value={stats.cloture}
          accent={isOpen ? '#d97706' : '#64748b'}
          delay={0.1}
        />
        {isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.location.href = '/accounting/cloture'
            }}
            style={{
              background: COLOR,
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 68,
            }}
          >
            <Lock size={16} />
            Fermer la caisse
          </motion.button>
        )}
      </div>
    </div>
  )

  return (
    <ModuleLayout
      title="Comptabilité"
      color={COLOR}
      items={items}
      backPath="/modules"
      banner={banner}
    />
  )
}
