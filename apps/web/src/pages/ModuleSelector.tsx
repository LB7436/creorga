import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useModuleStore, MODULES } from '@/stores/moduleStore'
import type { ModuleId, ModuleDef } from '@/stores/moduleStore'

/* ── emoji map (replaces lucide) ── */
const MODULE_ICONS: Record<ModuleId, string> = {
  pos: '🛒',
  clients: '📱',
  invoices: '🧾',
  qrmenu: '📲',
  loyalty: '🎁',
  planning: '📅',
  contracts: '📜',
  hr: '👥',
  accounting: '📊',
  marketing: '📣',
  reservations: '🗓️',
  inventory: '📦',
  haccp: '✅',
  events: '⭐',
  reputation: '💬',
}

type CategoryFilter = 'all' | 'core' | 'business' | 'digital' | 'admin'

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'core', label: 'Core' },
  { key: 'business', label: 'Business' },
  { key: 'digital', label: 'Digital' },
  { key: 'admin', label: 'Admin' },
]

/* ── helpers ── */
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/* ── animation variants ── */
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.25 } },
}

/* ── floating orb component ── */
function FloatingOrbs() {
  const orbs = [
    { top: '8%', left: '12%', size: 340, color: 'rgba(99,102,241,0.12)', delay: 0 },
    { top: '60%', right: '8%', size: 280, color: 'rgba(168,85,247,0.10)', delay: 2 },
    { bottom: '10%', left: '30%', size: 220, color: 'rgba(59,130,246,0.08)', delay: 4 },
    { top: '30%', right: '25%', size: 180, color: 'rgba(236,72,153,0.07)', delay: 1 },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -30, 0, 25, 0],
            x: [0, 15, -10, 20, 0],
            scale: [1, 1.08, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 18 + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
          style={{
            position: 'absolute',
            top: orb.top,
            left: (orb as any).left,
            right: (orb as any).right,
            bottom: (orb as any).bottom,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      ))}
    </div>
  )
}

/* ── module card ── */
interface ModuleCardProps {
  mod: ModuleDef
  onClick: () => void
}

function ModuleCard({ mod, onClick }: ModuleCardProps) {
  const icon = MODULE_ICONS[mod.id]

  return (
    <motion.button
      variants={cardVariants}
      layout
      whileHover={{ scale: 1.03, boxShadow: `0 20px 50px ${hexToRgba(mod.color, 0.25)}` }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 20,
        padding: 24,
        color: '#fff',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.08)',
        transition: 'border-color 0.3s, background 0.3s',
        perspective: '800px',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = hexToRgba(mod.color, 0.4)
        el.style.background = 'rgba(255,255,255,0.09)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.08)'
        el.style.background = 'rgba(255,255,255,0.06)'
        el.style.transform = ''
      }}
      onMouseMove={(e) => {
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const midX = rect.width / 2
        const midY = rect.height / 2
        const rotateY = ((x - midX) / midX) * 6
        const rotateX = ((midY - y) / midY) * 6
        el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`
      }}
    >
      {/* gradient glow behind icon */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hexToRgba(mod.color, 0.25)} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          background: `linear-gradient(135deg, ${hexToRgba(mod.color, 0.35)}, ${hexToRgba(mod.color, 0.15)})`,
          fontSize: 26,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {icon}
      </div>

      {/* name */}
      <p
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.3,
          marginBottom: 4,
          color: '#f1f5f9',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {mod.name}
      </p>

      {/* tagline */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.4,
          color: 'rgba(148,163,184,0.8)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {mod.tagline}
      </p>

      {/* bottom accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          width: '80%',
          height: 2,
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${hexToRgba(mod.color, 0.5)}, transparent)`,
          opacity: 0.5,
        }}
      />
    </motion.button>
  )
}

/* ── main page ── */
export default function ModuleSelector() {
  const navigate = useNavigate()
  const { user, company } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)
  const setActiveModule = useModuleStore((s) => s.setActiveModule)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      const matchCategory = category === 'all' || m.category === category
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.tagline.toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [category, search])

  const handleModule = (mod: ModuleDef) => {
    setActiveModule(mod.id)
    navigate(mod.path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0a0a1a 0%, #0f0f2e 30%, #0d0b24 60%, #080818 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <FloatingOrbs />

      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* left: company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>C</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 16, lineHeight: 1.2 }}>
              {company?.name ?? 'Creorga'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>
              Espace de travail
            </div>
          </div>
        </div>

        {/* right: user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>
              {user?.firstName} {user?.lastName}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Deconnexion"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(239,68,68,0.15)'
              el.style.borderColor = 'rgba(239,68,68,0.3)'
              el.style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(255,255,255,0.06)'
              el.style.borderColor = 'rgba(255,255,255,0.08)'
              el.style.color = 'rgba(148,163,184,0.7)'
            }}
          >
            {'↗'}
          </button>
        </div>
      </motion.div>

      {/* ── hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          textAlign: 'center',
          paddingTop: 32,
          paddingBottom: 8,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 800,
            color: '#f1f5f9',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Bonjour, {user?.firstName}
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(148,163,184,0.7)' }}>
          Que voulez-vous gerer aujourd'hui ?
        </p>
      </motion.div>

      {/* ── search bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 24px 8px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16,
              color: 'rgba(148,163,184,0.5)',
              pointerEvents: 'none',
            }}
          >
            {'🔍'}
          </span>
          <input
            type="text"
            placeholder="Rechercher un module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 44px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(99,102,241,0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </motion.div>

      {/* ── category tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          padding: '16px 24px 24px',
          position: 'relative',
          zIndex: 10,
          flexWrap: 'wrap',
        }}
      >
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              style={{
                padding: '8px 20px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: isActive ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))'
                  : 'rgba(255,255,255,0.03)',
                color: isActive ? '#a5b4fc' : 'rgba(148,163,184,0.6)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.25s',
                backdropFilter: 'blur(8px)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </motion.div>

      {/* ── module grid ── */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px 80px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={category + search}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
          >
            {filteredModules.map((mod) => (
              <ModuleCard key={mod.id} mod={mod} onClick={() => handleModule(mod)} />
            ))}

            {filteredModules.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'rgba(148,163,184,0.5)',
                  fontSize: 14,
                }}
              >
                Aucun module trouve.
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── responsive styles via inline <style> ── */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
