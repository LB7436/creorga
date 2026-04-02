import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  Receipt,
  QrCode,
  Gift,
  CalendarDays,
  ScrollText,
  Users,
  BarChart3,
  LogOut,
  Settings,
  Lock,
  Smartphone,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useModuleStore, MODULES } from '@/stores/moduleStore'
import type { ModuleId } from '@/stores/moduleStore'
import api from '@/lib/api'

// Map module IDs to lucide icons
const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  pos: ShoppingCart,
  clients: Smartphone,
  invoices: Receipt,
  qrmenu: QrCode,
  loyalty: Gift,
  planning: CalendarDays,
  contracts: ScrollText,
  hr: Users,
  accounting: BarChart3,
}

// Framer variants
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

interface ModuleCardProps {
  mod: (typeof MODULES)[number]
  onClick: () => void
}

function ModuleCard({ mod, onClick }: ModuleCardProps) {
  const Icon = MODULE_ICONS[mod.id]
  const rgb = hexToRgb(mod.color)

  return (
    <motion.button
      variants={cardVariants}
      onClick={onClick}
      disabled={!mod.available}
      whileHover={mod.available ? { y: -5, transition: { duration: 0.2 } } : {}}
      whileTap={mod.available ? { scale: 0.97 } : {}}
      className="group relative text-left w-full outline-none"
      style={
        {
          '--mod-color': mod.color,
          '--mod-color-light': mod.colorLight,
          '--mod-rgb': rgb,
        } as React.CSSProperties
      }
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl p-5
          bg-white border border-gray-100
          transition-all duration-300
          ${mod.available
            ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)] group-hover:shadow-[0_12px_40px_rgba(var(--mod-rgb),0.20)] group-hover:border-transparent'
            : 'opacity-55 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
          }
        `}
      >
        {/* Subtle top accent line */}
        {mod.available && (
          <div
            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(90deg, ${mod.color}, ${mod.color}88)` }}
          />
        )}

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: mod.colorLight }}
        >
          <Icon size={22} style={{ color: mod.color }} strokeWidth={2} />
        </div>

        {/* Text */}
        <p className="font-semibold text-gray-900 text-[15px] leading-tight mb-1">
          {mod.name}
        </p>
        <p className="text-gray-400 text-xs leading-snug">
          {mod.tagline}
        </p>

        {/* Status */}
        {mod.available ? (
          <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: mod.color }}>
            Ouvrir
            <ChevronRight size={12} />
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-1.5">
            <Lock size={10} className="text-gray-300" />
            <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">
              Bientôt
            </span>
          </div>
        )}

        {/* New badge for clients module */}
        {mod.id === 'clients' && (
          <div
            className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ background: mod.color }}
          >
            <Sparkles size={8} />
            Nouveau
          </div>
        )}
      </div>
    </motion.button>
  )
}

export default function ModuleSelector() {
  const navigate = useNavigate()
  const { user, companies } = useAuthStore()
  const logout = useAuthStore((s) => s.logout)
  const setActiveModule = useModuleStore((s) => s.setActiveModule)
  const currentRole = companies[0]?.role ?? 'EMPLOYEE'
  const isAdmin = currentRole === 'OWNER' || currentRole === 'MANAGER'
  const company = useAuthStore((s) => s.company)

  const handleModule = (mod: (typeof MODULES)[number]) => {
    if (!mod.available) return
    setActiveModule(mod.id)
    navigate(mod.path)
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const activeModules = MODULES.filter((m) => m.available)
  const inactiveModules = MODULES.filter((m) => !m.available)

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 10% 0%, rgba(219, 234, 254, 0.5) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 90% 10%, rgba(237, 233, 254, 0.4) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 100%, rgba(209, 250, 229, 0.3) 0%, transparent 50%),
          #f9fafb
        `,
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-6 pb-0">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1E3A5F] flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base leading-none block">{company?.name ?? 'Creorga'}</span>
            <span className="text-[11px] text-gray-400">Espace de travail</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-gray-100 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-[#1E3A5F] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-gray-100 shadow-sm text-gray-500 text-sm font-medium hover:bg-white hover:text-gray-800 transition-all"
            >
              <Settings size={14} />
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="p-2 rounded-xl bg-white/80 border border-gray-100 shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
          >
            <LogOut size={14} />
          </button>
        </motion.div>
      </div>

      {/* Hero */}
      <motion.div
        className="text-center pt-10 pb-8 px-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-400 text-sm">
          Que voulez-vous gérer aujourd'hui ?
        </p>
      </motion.div>

      {/* Active modules */}
      <div className="max-w-4xl mx-auto px-6 pb-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1"
        >
          Modules actifs
        </motion.p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {activeModules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} onClick={() => handleModule(mod)} />
          ))}
        </motion.div>
      </div>

      {/* Inactive modules */}
      <div className="max-w-4xl mx-auto px-6 pb-12 mt-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest mb-3 ml-1"
        >
          Disponibles sur abonnement
        </motion.p>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {inactiveModules.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} onClick={() => {}} />
          ))}
        </motion.div>
      </div>
    </div>
  )
}
