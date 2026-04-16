import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ShoppingCart, Smartphone, Receipt, QrCode, Gift, CalendarDays,
  ScrollText, Users, BarChart3, Megaphone, BookOpen, Warehouse,
  ShieldCheck, PartyPopper, Star, Check, Crown, Sparkles, Zap,
  TrendingUp, Settings as SettingsIcon, CreditCard,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ModuleDef {
  id: string
  name: string
  description: string
  icon: any
  color: string
  colorBg: string
  active: boolean
  usage: string
}

const MODULES: ModuleDef[] = [
  { id: 'pos',          name: 'Point de vente',   description: 'Caisse tactile, tickets, paiements', icon: ShoppingCart,  color: '#3b82f6', colorBg: '#eff6ff', active: true,  usage: '2 340 tickets ce mois' },
  { id: 'clients',      name: 'Clients',          description: 'Base clients, fidélité, historique', icon: Smartphone,    color: '#8b5cf6', colorBg: '#f3e8ff', active: true,  usage: '847 clients actifs' },
  { id: 'invoices',     name: 'Facturation',      description: 'Devis, factures, relances auto',     icon: Receipt,       color: '#10b981', colorBg: '#ecfdf5', active: true,  usage: '124 factures émises' },
  { id: 'qrmenu',       name: 'QR Menu',          description: 'Menu digital et commande à table',   icon: QrCode,        color: '#f59e0b', colorBg: '#fffbeb', active: true,  usage: '4 812 scans ce mois' },
  { id: 'loyalty',      name: 'Fidélité',         description: 'Cartes, points, récompenses',        icon: Gift,          color: '#ec4899', colorBg: '#fdf2f8', active: true,  usage: '312 membres fidèles' },
  { id: 'planning',     name: 'Planning',         description: 'Horaires équipe, congés, shifts',    icon: CalendarDays,  color: '#06b6d4', colorBg: '#ecfeff', active: true,  usage: '18 employés planifiés' },
  { id: 'contracts',    name: 'Contrats',         description: 'Contrats signés électroniquement',   icon: ScrollText,    color: '#6366f1', colorBg: '#eef2ff', active: false, usage: 'Non activé' },
  { id: 'hr',           name: 'RH',               description: 'Salaires, congés, fiches de paie',   icon: Users,         color: '#14b8a6', colorBg: '#f0fdfa', active: true,  usage: '24 employés' },
  { id: 'accounting',   name: 'Comptabilité',     description: 'Bilan, déclarations TVA Luxembourg', icon: BarChart3,     color: '#ef4444', colorBg: '#fef2f2', active: true,  usage: '18 écritures/jour' },
  { id: 'marketing',    name: 'Marketing',        description: 'Campagnes SMS, email, push',         icon: Megaphone,     color: '#f97316', colorBg: '#fff7ed', active: false, usage: 'Non activé' },
  { id: 'reservations', name: 'Réservations',     description: 'Tables, salles, gestion en ligne',   icon: BookOpen,      color: '#84cc16', colorBg: '#f7fee7', active: true,  usage: '287 réservations' },
  { id: 'inventory',    name: 'Stock',            description: 'Inventaire, commandes, pertes',      icon: Warehouse,     color: '#a855f7', colorBg: '#faf5ff', active: true,  usage: '156 produits suivis' },
  { id: 'haccp',        name: 'HACCP',            description: 'Traçabilité, températures, hygiène', icon: ShieldCheck,   color: '#0ea5e9', colorBg: '#f0f9ff', active: true,  usage: '12 relevés/jour' },
  { id: 'events',       name: 'Événements',       description: 'Privatisations, banquets, devis',    icon: PartyPopper,   color: '#d946ef', colorBg: '#fdf4ff', active: false, usage: 'Non activé' },
  { id: 'reputation',   name: 'Réputation',       description: 'Avis Google, TripAdvisor, réponses', icon: Star,          color: '#eab308', colorBg: '#fefce8', active: true,  usage: '4,7 / 5 (218 avis)' },
]

const CHART_DATA = [
  { month: 'Nov', POS: 1850, QR: 3200, Réservations: 210 },
  { month: 'Déc', POS: 2420, QR: 4100, Réservations: 298 },
  { month: 'Jan', POS: 2100, QR: 3800, Réservations: 245 },
  { month: 'Fév', POS: 2190, QR: 4050, Réservations: 261 },
  { month: 'Mar', POS: 2280, QR: 4520, Réservations: 279 },
  { month: 'Avr', POS: 2340, QR: 4812, Réservations: 287 },
]

const PLANS = [
  { id: 'starter', name: 'Starter',  price: 29,  color: '#64748b', icon: Zap,       features: ['POS + 1 caisse', 'Menu QR basique', '2 utilisateurs', 'Support email'] },
  { id: 'pro',     name: 'Pro',      price: 59,  color: '#3b82f6', icon: Sparkles,  features: ['Tout du Starter', 'Jusqu\'à 8 modules', '10 utilisateurs', 'Support prioritaire', 'Intégrations'] },
  { id: 'premium', name: 'Premium',  price: 89,  color: '#8b5cf6', icon: Crown,     features: ['Tous les modules', 'Utilisateurs illimités', 'Support 24/7', 'Multi-établissement', 'API complète'] },
]

export default function AdminModules() {
  const [modules, setModules] = useState(MODULES)
  const [showPlans, setShowPlans] = useState(false)
  const currentPlan = 'premium'

  const toggle = (id: string) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, active: !m.active } : m))
    const mod = modules.find((m) => m.id === id)
    if (mod) toast.success(`${mod.name} ${mod.active ? 'désactivé' : 'activé'}`)
  }

  const activeCount = modules.filter((m) => m.active).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Modules actifs</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{activeCount} / {modules.length} modules actifs sur votre abonnement</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'linear-gradient(135deg, #a855f7, #8b5cf6)', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
          <Crown size={15} /> Plan Premium
        </div>
      </div>

      {/* Modules grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
        {modules.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(15,23,42,0.08)' }}
              style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18,
                opacity: m.active ? 1 : 0.6, transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: m.colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={m.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{m.description}</div>
                </div>
                <button onClick={() => toggle(m.id)}
                  style={{
                    width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: m.active ? m.color : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}>
                  <div style={{ position: 'absolute', top: 2, left: m.active ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                  <TrendingUp size={11} /> {m.usage}
                </div>
                {m.active && (
                  <button style={{ fontSize: 11, color: m.color, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <SettingsIcon size={11} /> Configurer
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Subscription */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <CreditCard size={18} color="#8b5cf6" />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Abonnement</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <InfoBlock label="Plan actuel" value="Premium" accent="#8b5cf6" />
          <InfoBlock label="Tarif mensuel" value="89 €" accent="#3b82f6" />
          <InfoBlock label="Prochaine facture" value="1er mai 2026" accent="#10b981" />
          <InfoBlock label="Modules inclus" value={`${activeCount} / ${modules.length}`} accent="#f59e0b" />
        </div>
        <button onClick={() => setShowPlans(!showPlans)}
          style={{ padding: '10px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {showPlans ? 'Masquer' : 'Changer de plan'}
        </button>

        <AnimatePresence>
          {showPlans && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
                {PLANS.map((plan) => {
                  const Icon = plan.icon
                  const isCurrent = plan.id === currentPlan
                  return (
                    <motion.div key={plan.id}
                      whileHover={{ y: -4 }}
                      style={{
                        border: `2px solid ${isCurrent ? plan.color : '#e2e8f0'}`,
                        borderRadius: 14, padding: 22, background: isCurrent ? `${plan.color}08` : '#fff',
                        position: 'relative', transition: 'all 0.2s',
                      }}
                    >
                      {isCurrent && (
                        <div style={{ position: 'absolute', top: -11, left: 22, background: plan.color, color: '#fff', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                          Actuel
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${plan.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} color={plan.color} />
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}</div>
                      </div>
                      <div style={{ fontSize: 30, fontWeight: 700, color: plan.color, marginBottom: 4 }}>
                        {plan.price}<span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>€/mois</span>
                      </div>
                      <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 14, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {plan.features.map((f) => (
                          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                            <Check size={14} color={plan.color} /> {f}
                          </div>
                        ))}
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={() => toast.success(`Changement vers ${plan.name} initié`)}
                          style={{ marginTop: 16, width: '100%', padding: '10px', background: plan.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Passer au {plan.name}
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Usage chart */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <BarChart3 size={18} color="#3b82f6" />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Utilisation des modules (6 derniers mois)</h2>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>Volume de transactions par module</p>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }} />
              <Bar dataKey="POS" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="QR" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Réservations" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{value}</div>
    </div>
  )
}
