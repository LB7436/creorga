import { motion } from 'framer-motion'
import { Lock, CheckCircle2, ShoppingCart, Smartphone, Receipt, QrCode, Gift, CalendarDays, ScrollText, Users, BarChart3, Megaphone, BookOpen, Warehouse, ShieldCheck, PartyPopper, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MODULES } from '@/stores/moduleStore'
import type { ModuleId } from '@/stores/moduleStore'

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
  marketing: Megaphone,
  reservations: BookOpen,
  inventory: Warehouse,
  haccp: ShieldCheck,
  events: PartyPopper,
  reputation: Star,
}

export default function AdminModules() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Modules & Abonnement</h2>
      <p className="text-sm text-gray-400 mb-6">Gérez les modules actifs de votre abonnement Creorga</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((mod, i) => {
          const Icon = MODULE_ICONS[mod.id]
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`
                flex items-center gap-4 p-4 rounded-2xl border transition-all
                ${mod.available ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}
              `}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: mod.colorLight }}
              >
                <Icon size={20} style={{ color: mod.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{mod.name}</p>
                <p className="text-xs text-gray-400 truncate">{mod.tagline}</p>
              </div>
              <div className="shrink-0">
                {mod.available ? (
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={12} />
                    Actif
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-gray-100 text-gray-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Lock size={12} />
                    Inactif
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-xs text-amber-700 font-medium mb-1">Débloquer plus de modules</p>
        <p className="text-xs text-amber-600">
          Contactez votre représentant Creorga pour activer des modules supplémentaires sur votre abonnement.
        </p>
      </div>
    </div>
  )
}
