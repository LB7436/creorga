import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Smartphone,
  QrCode,
  ShoppingBag,
  Star,
  Eye,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  Share2,
  Palette,
  Globe,
  Clock,
  Bell,
  Copy,
  Check,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface FeatureToggle {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

const defaultFeatures: FeatureToggle[] = [
  {
    id: 'menu',
    label: 'Menu en ligne',
    description: 'Les clients peuvent consulter la carte depuis leur téléphone',
    icon: <Eye size={18} />,
    enabled: true,
  },
  {
    id: 'order',
    label: 'Commande à table',
    description: 'Commande directe depuis le QR code de la table',
    icon: <ShoppingBag size={18} />,
    enabled: true,
  },
  {
    id: 'reviews',
    label: 'Avis & notation',
    description: "Collecte d'avis clients après le repas",
    icon: <Star size={18} />,
    enabled: false,
  },
  {
    id: 'notifications',
    label: 'Notifications commande',
    description: 'Le client reçoit une notification quand sa commande est prête',
    icon: <Bell size={18} />,
    enabled: false,
  },
  {
    id: 'languages',
    label: 'Multilingue',
    description: 'Interface en FR / EN / DE / PT',
    icon: <Globe size={18} />,
    enabled: true,
  },
  {
    id: 'waittime',
    label: "Temps d'attente estimé",
    description: "Affiche le délai de préparation estimé",
    icon: <Clock size={18} />,
    enabled: false,
  },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="shrink-0 focus:outline-none">
      {enabled ? (
        <ToggleRight size={28} className="text-[#6D28D9] transition-colors" />
      ) : (
        <ToggleLeft size={28} className="text-gray-300 transition-colors" />
      )}
    </button>
  )
}

export default function ClientsConfig() {
  const navigate = useNavigate()
  const company = useAuthStore((s) => s.company)
  const [features, setFeatures] = useState<FeatureToggle[]>(defaultFeatures)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'qr'>('config')

  const demoUrl = `https://order.creorga.lu/${company?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'mon-resto'}`

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    )
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(demoUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'config', label: 'Configuration', icon: <Palette size={14} /> },
    { id: 'preview', label: 'Aperçu', icon: <Eye size={14} /> },
    { id: 'qr', label: 'QR Code & Partage', icon: <QrCode size={14} /> },
  ] as const

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 10% 0%, rgba(237,233,254,0.5) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 90% 10%, rgba(221,214,254,0.3) 0%, transparent 55%),
          #f9fafb
        `,
      }}
    >
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/modules')}
              className="p-2 rounded-xl hover:bg-white/80 text-gray-400 hover:text-gray-700 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#ede9fe' }}
            >
              <Smartphone size={20} style={{ color: '#6D28D9' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Accès Clients</h1>
              <p className="text-xs text-gray-400">Interface & commande en ligne</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background: '#6D28D9' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            Actif
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/70 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-white/80 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pb-12">
        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-gray-400 mb-4">
              Activez ou désactivez les fonctionnalités visibles par vos clients.
            </p>
            {features.map((feature, i) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl bg-white border transition-all
                  ${feature.enabled ? 'border-purple-100 shadow-sm' : 'border-gray-100'}
                `}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    feature.enabled ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-300'
                  }`}
                >
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${feature.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {feature.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{feature.description}</p>
                </div>
                <Toggle enabled={feature.enabled} onToggle={() => toggleFeature(feature.id)} />
              </motion.div>
            ))}

            <div className="mt-6 p-4 rounded-2xl bg-purple-50 border border-purple-100">
              <p className="text-xs font-semibold text-purple-800 mb-1">Interface Viberesto intégrée</p>
              <p className="text-xs text-purple-600 leading-relaxed">
                L'interface client est basée sur Viberesto — une expérience immersive avec menu visuel,
                commande interactive, et suivi en temps réel. Elle s'adapte automatiquement à votre catalogue.
              </p>
            </div>
          </motion.div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <p className="text-xs text-gray-400 mb-6 text-center">
              Aperçu de l'interface vue par vos clients
            </p>

            {/* Phone mockup */}
            <div
              className="relative rounded-[2.5rem] p-2 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                width: 280,
                boxShadow: '0 40px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

              <div className="rounded-[2rem] overflow-hidden bg-white" style={{ minHeight: 520 }}>
                {/* App header */}
                <div
                  className="p-5 pt-10 text-white"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                >
                  <p className="text-xs opacity-70 mb-1">Bienvenue chez</p>
                  <h3 className="font-bold text-lg leading-tight">{company?.name ?? 'Mon Restaurant'}</h3>
                  <p className="text-xs opacity-60 mt-1">Scannez et commandez</p>
                </div>

                {/* Feature chips */}
                <div className="p-4 space-y-2.5">
                  {features.filter((f) => f.enabled).slice(0, 4).map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                        {f.icon}
                      </div>
                      <p className="text-xs font-medium text-gray-700">{f.label}</p>
                    </div>
                  ))}

                  <button
                    className="w-full py-3 rounded-xl text-sm font-bold text-white mt-3"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}
                  >
                    Voir la carte →
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-300 mt-4">
              Aperçu non interactif — l'interface complète via QR code
            </p>
          </motion.div>
        )}

        {/* QR TAB */}
        {activeTab === 'qr' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-xs text-gray-400 mb-4">
              Partagez l'accès client via QR code ou lien direct.
            </p>

            {/* URL card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Lien public de commande</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <Share2 size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-600 flex-1 truncate font-mono">{demoUrl}</span>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors shrink-0"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
            </div>

            {/* QR placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
              <div
                className="w-44 h-44 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}
              >
                <QrCode size={80} className="text-purple-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">QR Code par table</p>
                <p className="text-xs text-gray-400 mt-1">
                  Chaque table peut avoir son propre QR code.<br />
                  Génération disponible dans la configuration des tables.
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/tables')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#6D28D9' }}
              >
                Configurer les tables
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">Impression & affichage</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Imprimez les QR codes en haute résolution (PDF) et placez-les sur chaque table.
                Les clients n'ont pas besoin de télécharger d'application.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
