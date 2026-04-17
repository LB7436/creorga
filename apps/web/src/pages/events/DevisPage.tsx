import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import {
  FileText, Plus, Search, Send, Save, X, Calendar, Users, MapPin, Euro,
  CreditCard, CheckCircle2, AlertCircle, Eye, Download, Mail, Building2,
  User, Trash2, ChefHat, Music, Camera, Flower2, Sparkles, Heart, Coffee,
  Wine, Package, Layers, AlertTriangle, Clock, TrendingUp, Copy, Edit3,
  GitCompare, GlassWater, Utensils, Wheat, Egg, Fish, Star, Lock,
  Link as LinkIcon, Globe, ArrowRight, Minus, Info,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type QuoteStatus = 'Brouillon' | 'Envoyé' | 'Dépôt payé' | 'Confirmé' | 'Réalisé' | 'Annulé'
type ClientType = 'B2B' | 'Particulier'
type DietaryType = 'Végétarien' | 'Végan' | 'Sans gluten' | 'Sans lactose' | 'Halal' | 'Kasher' | 'Allergies'

interface EventQuote {
  id: string
  number: string
  eventName: string
  eventDate: string
  client: string
  clientType: ClientType
  guests: number
  amount: number
  status: QuoteStatus
  depositPercent: number
  depositPaid: boolean
  venue: string
  eventType: string
  clientPortalEnabled: boolean
  hasDietary: boolean
  version: number
}

const MOCK_QUOTES: EventQuote[] = [
  { id: 'q1', number: 'DEV-2026-042', eventName: 'Mariage Weber-Schmit', eventDate: '2026-05-18', client: 'Famille Weber', clientType: 'Particulier', guests: 85, amount: 6820, status: 'Confirmé', depositPercent: 30, depositPaid: true, venue: 'Salle principale', eventType: 'Mariage', clientPortalEnabled: true, hasDietary: true, version: 2 },
  { id: 'q2', number: 'DEV-2026-041', eventName: 'Séminaire BGL', eventDate: '2026-04-28', client: 'BGL BNP Paribas', clientType: 'B2B', guests: 45, amount: 2880, status: 'Dépôt payé', depositPercent: 40, depositPaid: true, venue: 'Salle principale', eventType: 'Séminaire', clientPortalEnabled: true, hasDietary: false, version: 1 },
  { id: 'q3', number: 'DEV-2026-040', eventName: 'Anniversaire 50 ans Marc', eventDate: '2026-05-04', client: 'Marc Thillen', clientType: 'Particulier', guests: 32, amount: 2240, status: 'Envoyé', depositPercent: 30, depositPaid: false, venue: 'Terrasse', eventType: 'Anniversaire', clientPortalEnabled: true, hasDietary: true, version: 1 },
  { id: 'q4', number: 'DEV-2026-039', eventName: 'Cocktail KPMG', eventDate: '2026-04-22', client: 'KPMG Luxembourg', clientType: 'B2B', guests: 60, amount: 1800, status: 'Confirmé', depositPercent: 30, depositPaid: true, venue: 'Bar', eventType: 'Cocktail', clientPortalEnabled: false, hasDietary: false, version: 1 },
  { id: 'q5', number: 'DEV-2026-038', eventName: 'Baptême Louise', eventDate: '2026-05-11', client: 'Famille Reding', clientType: 'Particulier', guests: 28, amount: 1540, status: 'Brouillon', depositPercent: 30, depositPaid: false, venue: 'Salle principale', eventType: 'Autre', clientPortalEnabled: false, hasDietary: true, version: 1 },
  { id: 'q6', number: 'DEV-2026-037', eventName: 'Team Building Deloitte', eventDate: '2026-06-03', client: 'Deloitte', clientType: 'B2B', guests: 75, amount: 4125, status: 'Envoyé', depositPercent: 40, depositPaid: false, venue: 'Salle principale', eventType: 'Séminaire', clientPortalEnabled: true, hasDietary: true, version: 3 },
  { id: 'q7', number: 'DEV-2026-036', eventName: 'Mariage Antoine & Sophie', eventDate: '2026-03-14', client: 'A. & S. Muller', clientType: 'Particulier', guests: 110, amount: 8690, status: 'Réalisé', depositPercent: 30, depositPaid: true, venue: 'Salle principale', eventType: 'Mariage', clientPortalEnabled: true, hasDietary: true, version: 2 },
  { id: 'q8', number: 'DEV-2026-035', eventName: 'Inauguration ArcelorMittal', eventDate: '2026-03-02', client: 'ArcelorMittal', clientType: 'B2B', guests: 120, amount: 7200, status: 'Annulé', depositPercent: 30, depositPaid: false, venue: 'Location externe', eventType: 'Cocktail', clientPortalEnabled: false, hasDietary: false, version: 1 },
]

const STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; border: string }> = {
  'Brouillon':    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'Envoyé':       { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Dépôt payé':   { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  'Confirmé':     { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Réalisé':      { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  'Annulé':       { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
}

const CATALOG_ITEMS = [
  { id: 'c1', name: 'Apéritif maison', price: 8, category: 'Apéritif' },
  { id: 'c2', name: 'Plateau fromages luxembourgeois', price: 18, category: 'Entrée' },
  { id: 'c3', name: 'Filet de bœuf sauce Moselle', price: 32, category: 'Plat' },
  { id: 'c4', name: 'Saumon fumé maison', price: 22, category: 'Entrée' },
  { id: 'c5', name: 'Dessert gourmand', price: 12, category: 'Dessert' },
  { id: 'c6', name: 'Café & mignardises', price: 6, category: 'Dessert' },
  { id: 'c7', name: 'Velouté de saison', price: 9, category: 'Entrée' },
  { id: 'c8', name: 'Volaille fermière rôtie', price: 26, category: 'Plat' },
]

const FORMULAS = [
  { id: 'f0', name: 'Formule Apéritif', price: 25, desc: '4 pièces salées + boissons', icon: GlassWater, color: '#f59e0b' },
  { id: 'f1', name: 'Formule Cocktail', price: 45, desc: '10 pièces + boissons premium', icon: Wine, color: '#8b5cf6' },
  { id: 'f2', name: 'Formule Dîner', price: 65, desc: 'Entrée + Plat + Dessert', icon: Utensils, color: '#3b82f6' },
]

const EXTRAS = [
  { id: 'e1', name: 'Décoration florale', price: 250, icon: Flower2 },
  { id: 'e2', name: 'DJ professionnel', price: 650, icon: Music },
  { id: 'e3', name: 'Photographe', price: 480, icon: Camera },
  { id: 'e4', name: 'Pack lumières & effets', price: 320, icon: Sparkles },
]

const DRINK_PACKAGES = [
  { id: 'd1', name: 'Open bar 2h', price: 22, icon: Wine, desc: 'Vins, bières, soft drinks', type: 'forfait' },
  { id: 'd2', name: 'Open bar 4h', price: 38, icon: Wine, desc: 'Vins, bières, cocktails, soft', type: 'forfait' },
  { id: 'd3', name: 'Premium illimité', price: 65, icon: Star, desc: 'Champagne, spiritueux premium', type: 'forfait' },
  { id: 'd4', name: 'À la carte', price: 0, icon: Wine, desc: 'Facturation consommation réelle', type: 'carte' },
]

const RENTALS = [
  { id: 'r1', name: 'Tables rondes (unité)', price: 12 },
  { id: 'r2', name: 'Chaises style Chiavari (unité)', price: 4 },
  { id: 'r3', name: 'Nappes premium (unité)', price: 8 },
  { id: 'r4', name: 'Vaisselle porcelaine fine', price: 3 },
]

// Tiered pricing brackets
const TIER_PRICING = [
  { min: 0, max: 19, label: '< 20 pax', mult: 1.15, note: 'Tarif petit groupe +15%' },
  { min: 20, max: 50, label: '20-50 pax', mult: 1.0, note: 'Tarif standard' },
  { min: 51, max: 100, label: '50-100 pax', mult: 0.95, note: 'Remise volume -5%' },
  { min: 101, max: 9999, label: '100+ pax', mult: 0.90, note: 'Remise volume -10%' },
]

const getTier = (guests: number) => TIER_PRICING.find((t) => guests >= t.min && guests <= t.max) ?? TIER_PRICING[1]

const DIETARY_ICONS: Record<DietaryType, any> = {
  'Végétarien': Wheat, 'Végan': Wheat, 'Sans gluten': Wheat, 'Sans lactose': Egg,
  'Halal': Fish, 'Kasher': Fish, 'Allergies': AlertTriangle,
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n)

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14,
  padding: 20, boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#ffffff',
  border: '1px solid #e2e8f0', borderRadius: 10, color: '#1e293b',
  fontSize: 14, outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3,
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function DevisPage() {
  const [filter, setFilter] = useState<QuoteStatus | 'Tous'>('Tous')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [detail, setDetail] = useState<EventQuote | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_QUOTES.filter((q) => {
      if (filter !== 'Tous' && q.status !== filter) return false
      if (search && !(`${q.eventName} ${q.client} ${q.number}`.toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
  }, [filter, search])

  const stats = [
    { label: 'En cours', value: '5', color: '#3b82f6', icon: FileText, sub: 'Devis actifs' },
    { label: 'Confirmés', value: '3', color: '#10b981', icon: CheckCircle2, sub: 'Ce mois-ci' },
    { label: 'CA événements', value: fmtEUR(12500), color: '#8b5cf6', icon: Euro, sub: 'Prévisionnel Q2' },
    { label: 'Taux conversion', value: '65%', color: '#f59e0b', icon: TrendingUp, sub: 'Moyenne 6 mois' },
  ]

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Devis événements</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Menu builder, formules, packages et portail client intégrés
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCompare(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', background: '#fff', color: '#1e293b',
            border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            <GitCompare size={15} /> Comparer
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: '#1e293b', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Nouveau devis
          </motion.button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.sub}</div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tiered pricing info card */}
      <div style={{ ...card, marginBottom: 20, padding: 16, background: 'linear-gradient(135deg, #f0fdf4, #ecfeff)', border: '1px solid #86efac' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Layers size={18} style={{ color: '#15803d' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>Tarification par paliers</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {TIER_PRICING.map((t) => (
            <div key={t.label} style={{ padding: 10, background: '#fff', borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{t.label}</div>
              <div style={{ fontSize: 11, color: t.mult < 1 ? '#15803d' : t.mult > 1 ? '#b45309' : '#64748b', marginTop: 4 }}>{t.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher un devis, événement, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Tous', 'Brouillon', 'Envoyé', 'Dépôt payé', 'Confirmé', 'Réalisé', 'Annulé'] as const).map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  border: `1px solid ${active ? '#1e293b' : '#e2e8f0'}`,
                  background: active ? '#1e293b' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['N° devis', 'Événement', 'Client', 'Couverts', 'Montant', 'Statut', 'Portail', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const c = STATUS_COLORS[q.status]
              return (
                <tr
                  key={q.id}
                  onClick={() => setDetail(q)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>{q.number}</div>
                    {q.version > 1 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '1px 6px', borderRadius: 5, marginTop: 4, display: 'inline-block' }}>
                        v{q.version}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{q.eventName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {new Date(q.eventDate).toLocaleDateString('fr-LU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#1e293b' }}>{q.client}</span>
                      <span style={{
                        padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                        background: q.clientType === 'B2B' ? '#e0e7ff' : '#fef3c7',
                        color: q.clientType === 'B2B' ? '#4338ca' : '#b45309',
                      }}>
                        {q.clientType}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{q.guests}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{getTier(q.guests).label}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{fmtEUR(q.amount)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {q.clientPortalEnabled ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                        <Globe size={12} /> Actif
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                        <Lock size={12} /> Inactif
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <IconBtn icon={Eye} label="Voir" onClick={() => setDetail(q)} />
                      <IconBtn icon={Copy} label="Dupliquer" onClick={() => {}} />
                      <IconBtn icon={Download} label="PDF" onClick={() => {}} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={32} style={{ marginBottom: 8 }} />
            <div>Aucun devis ne correspond aux critères</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <NewQuoteModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {detail && <DetailModal quote={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCompare && <CompareModal onClose={() => setShowCompare(false)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function IconBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
        color: '#475569', cursor: 'pointer',
      }}
    >
      <Icon size={14} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  New Quote Modal (Interactive Menu Builder)                         */
/* ------------------------------------------------------------------ */

function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const [guests, setGuests] = useState(40)
  const [selectedFormula, setSelectedFormula] = useState<string | null>('f2')
  const [selectedDrink, setSelectedDrink] = useState<string | null>('d1')
  const [items, setItems] = useState<{ id: string; name: string; price: number; qty: number }[]>([])
  const [extras, setExtras] = useState<Record<string, boolean>>({})
  const [rentalQty, setRentalQty] = useState<Record<string, number>>({})
  const [minSpend, setMinSpend] = useState(0)
  const [dietary, setDietary] = useState<Record<DietaryType, number>>({
    'Végétarien': 2, 'Végan': 0, 'Sans gluten': 1, 'Sans lactose': 0, 'Halal': 0, 'Kasher': 0, 'Allergies': 3,
  })

  const tier = getTier(guests)
  const formulaTotal = useMemo(() => {
    const f = FORMULAS.find((x) => x.id === selectedFormula)
    return f ? f.price * guests * tier.mult : 0
  }, [selectedFormula, guests, tier])

  const drinkTotal = useMemo(() => {
    const d = DRINK_PACKAGES.find((x) => x.id === selectedDrink)
    return d && d.type === 'forfait' ? d.price * guests : 0
  }, [selectedDrink, guests])

  const itemsTotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const extrasTotal = EXTRAS.filter((e) => extras[e.id]).reduce((s, e) => s + e.price, 0)
  const rentalsTotal = RENTALS.reduce((s, r) => s + r.price * (rentalQty[r.id] || 0), 0)

  const ht = formulaTotal + drinkTotal + itemsTotal + extrasTotal + rentalsTotal
  const tva = ht * 0.17
  const ttc = Math.max(ht, minSpend) + tva

  const deposit1 = ttc * 0.3
  const deposit2 = ttc * 0.3
  const deposit3 = ttc * 0.4

  const addCatalog = (c: typeof CATALOG_ITEMS[number]) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.id === c.id)
      if (ex) return prev.map((p) => (p.id === c.id ? { ...p, qty: p.qty + 1 } : p))
      return [...prev, { ...c, qty: 1 }]
    })
  }

  const totalDietary = Object.values(dietary).reduce((s, v) => s + v, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1080, maxHeight: '92vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Nouveau devis événement</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>Menu builder interactif · Packages · Extras · Tarification par palier</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#475569' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
          <div>
            {/* Guests & tier display */}
            <Section icon={Users} title="Nombre d'invités & palier tarifaire">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input type="number" style={input} value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 0)} />
                </div>
                <div style={{
                  flex: 2, padding: '10px 14px',
                  background: tier.mult < 1 ? 'linear-gradient(135deg, #f0fdf4, #ecfeff)' : tier.mult > 1 ? 'linear-gradient(135deg, #fef3c7, #fed7aa)' : '#f8fafc',
                  border: `1px solid ${tier.mult < 1 ? '#86efac' : tier.mult > 1 ? '#fcd34d' : '#e2e8f0'}`,
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Layers size={16} style={{ color: tier.mult < 1 ? '#15803d' : tier.mult > 1 ? '#b45309' : '#64748b' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tier.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{tier.note}</div>
                  </div>
                </div>
              </div>
            </Section>

            {/* Interactive menu builder — formulas */}
            <Section icon={ChefHat} title="Menu builder — Formules">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {FORMULAS.map((f) => {
                  const Icon = f.icon
                  const active = selectedFormula === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormula(active ? null : f.id)}
                      style={{
                        padding: 14, borderRadius: 12, textAlign: 'left',
                        border: `2px solid ${active ? f.color : '#e2e8f0'}`,
                        background: active ? `${f.color}08` : '#fff', cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${f.color}15`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{f.name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8px' }}>{f.desc}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                        {fmtEUR(f.price)}<span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>/pers</span>
                      </div>
                      {active && (
                        <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle2 size={12} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Drinks packages */}
            <Section icon={Wine} title="Packages boissons">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {DRINK_PACKAGES.map((d) => {
                  const Icon = d.icon
                  const active = selectedDrink === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDrink(active ? null : d.id)}
                      style={{
                        padding: 14, borderRadius: 12, textAlign: 'left',
                        border: `2px solid ${active ? '#8b5cf6' : '#e2e8f0'}`,
                        background: active ? '#faf5ff' : '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <Icon size={20} style={{ color: active ? '#8b5cf6' : '#64748b', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{d.desc}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {d.type === 'forfait' ? `${fmtEUR(d.price)}/pers` : 'À la carte'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Catalog items — drag-drop feel */}
            <Section icon={Package} title="Ajouter depuis le catalogue">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
                {CATALOG_ITEMS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => addCatalog(c)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#1e293b',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                  >
                    <div>
                      <div>{c.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{c.category}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>{fmtEUR(c.price)}</span>
                      <Plus size={14} style={{ color: '#3b82f6' }} />
                    </div>
                  </button>
                ))}
              </div>

              {items.length > 0 && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Panier ({items.length})
                  </div>
                  {items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <div style={{ fontSize: 13, color: '#1e293b' }}>{it.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="number" value={it.qty} onChange={(e) => {
                          const v = parseInt(e.target.value) || 1
                          setItems((prev) => prev.map((p) => p.id === it.id ? { ...p, qty: v } : p))
                        }} style={{ ...input, width: 60, padding: '4px 8px' }} />
                        <div style={{ width: 80, textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{fmtEUR(it.price * it.qty)}</div>
                        <button onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Add-ons & services */}
            <Section icon={Sparkles} title="Extras & prestations">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {EXTRAS.map((e) => {
                  const Icon = e.icon
                  const on = !!extras[e.id]
                  return (
                    <label
                      key={e.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                        border: `2px solid ${on ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: 10, cursor: 'pointer',
                        background: on ? '#f8fafc' : '#fff',
                      }}
                    >
                      <input type="checkbox" checked={on} onChange={() => setExtras((prev) => ({ ...prev, [e.id]: !prev[e.id] }))} />
                      <Icon size={18} style={{ color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{fmtEUR(e.price)}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </Section>

            {/* Rentals */}
            <Section icon={Package} title="Location (tables, chaises, linge)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RENTALS.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{fmtEUR(r.price)} l'unité</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setRentalQty((p) => ({ ...p, [r.id]: Math.max(0, (p[r.id] || 0) - 1) }))} style={{ width: 28, height: 28, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={12} />
                      </button>
                      <div style={{ width: 30, textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{rentalQty[r.id] || 0}</div>
                      <button onClick={() => setRentalQty((p) => ({ ...p, [r.id]: (p[r.id] || 0) + 1 }))} style={{ width: 28, height: 28, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                    <div style={{ width: 80, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {fmtEUR(r.price * (rentalQty[r.id] || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Dietary requirements */}
            <Section icon={AlertTriangle} title="Régimes alimentaires & allergies">
              <div style={{ padding: 12, background: totalDietary > 0 ? '#fef3c7' : '#f8fafc', borderRadius: 10, marginBottom: 12, border: `1px solid ${totalDietary > 0 ? '#fcd34d' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 12, color: totalDietary > 0 ? '#92400e' : '#64748b' }}>
                  <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {totalDietary > 0 ? `${totalDietary} invités ont des besoins spécifiques — menus alternatifs à prévoir` : 'Aucun régime spécifique déclaré'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(Object.keys(dietary) as DietaryType[]).map((d) => {
                  const Icon = DIETARY_ICONS[d]
                  return (
                    <div key={d} style={{ padding: 10, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                      <Icon size={16} style={{ color: '#64748b', margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>{d}</div>
                      <input type="number" value={dietary[d]} onChange={(e) => setDietary((p) => ({ ...p, [d]: parseInt(e.target.value) || 0 }))}
                        style={{ ...input, padding: '4px 6px', fontSize: 12, textAlign: 'center', marginTop: 4 }} />
                    </div>
                  )
                })}
              </div>
            </Section>

            {/* Minimum spend */}
            <Section icon={Lock} title="Minimum garanti (événements exclusifs)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="number" style={{ ...input, flex: 1 }} value={minSpend || ''} onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)} placeholder="0 (pas de minimum)" />
                <div style={{ fontSize: 13, color: '#64748b' }}>€ HT garantis</div>
              </div>
            </Section>

            {/* Cancellation policy */}
            <Section icon={AlertCircle} title="Politique d'annulation">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '+ 60 jours avant', fee: '0%', color: '#10b981' },
                  { label: '30 à 60 jours avant', fee: '30%', color: '#f59e0b' },
                  { label: '15 à 30 jours avant', fee: '50%', color: '#ea580c' },
                  { label: '- 15 jours avant', fee: '100%', color: '#ef4444' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={13} style={{ color: p.color }} />
                      <span style={{ fontSize: 13, color: '#0f172a' }}>{p.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.fee}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Sidebar recap */}
          <div>
            <div style={{ ...card, position: 'sticky', top: 80, background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Récapitulatif</div>

              <SumLine label="Formule" value={formulaTotal} />
              <SumLine label="Boissons" value={drinkTotal} />
              <SumLine label="Articles" value={itemsTotal} />
              <SumLine label="Extras" value={extrasTotal} />
              <SumLine label="Location" value={rentalsTotal} />

              <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />
              <SumLine label="Total HT" value={ht} bold />
              <SumLine label="TVA 17%" value={tva} />
              <SumLine label="Total TTC" value={ttc} bold big />

              <div style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Échéancier acomptes</div>
                <DepositLine label="Signature (30%)" value={deposit1} />
                <DepositLine label="J-14 (30%)" value={deposit2} />
                <DepositLine label="J-1 (40%)" value={deposit3} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                <button style={{ padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Send size={15} /> Envoyer PDF au client
                </button>
                <button style={{ padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <LinkIcon size={15} /> Activer portail client
                </button>
                <button style={{ padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Save size={15} /> Enregistrer brouillon
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon size={16} style={{ color: '#1e293b' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function SumLine({ label, value, bold, big }: { label: string; value: number; bold?: boolean; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: big ? 16 : 13, color: bold ? '#0f172a' : '#64748b', fontWeight: bold ? 700 : 500 }}>
      <span>{label}</span>
      <span>{fmtEUR(value)}</span>
    </div>
  )
}

function DepositLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#475569' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmtEUR(value)}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                       */
/* ------------------------------------------------------------------ */

function DetailModal({ quote, onClose }: { quote: EventQuote; onClose: () => void }) {
  const c = STATUS_COLORS[quote.status]
  const deposit = quote.amount * (quote.depositPercent / 100)
  const balance = quote.amount - deposit

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '92vh', overflow: 'auto' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{quote.number}</div>
              {quote.version > 1 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 7px', borderRadius: 5 }}>
                  Version {quote.version}
                </span>
              )}
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{quote.eventName}</h2>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
              {quote.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
            <InfoRow icon={Calendar} label="Date" value={new Date(quote.eventDate).toLocaleDateString('fr-LU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoRow icon={MapPin} label="Lieu" value={quote.venue} />
            <InfoRow icon={Users} label="Couverts" value={`${quote.guests} personnes — ${getTier(quote.guests).label}`} />
            <InfoRow icon={Building2} label="Type" value={quote.eventType} />
            <InfoRow icon={User} label="Client" value={`${quote.client} (${quote.clientType})`} />
            <InfoRow icon={Euro} label="Montant total" value={fmtEUR(quote.amount)} />
          </div>

          {/* Dietary alert if applicable */}
          {quote.hasDietary && (
            <div style={{ padding: 12, background: '#fef3c7', borderRadius: 10, border: '1px solid #fcd34d', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} style={{ color: '#b45309' }} />
              <div style={{ fontSize: 13, color: '#78350f' }}>
                <strong>Régimes spécifiques :</strong> 5 invités ont déclaré des besoins particuliers
              </div>
            </div>
          )}

          {/* Deposit schedule */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Échéancier paiements</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DepositRow label="Signature (30%)" value={quote.amount * 0.3} status={quote.depositPaid ? 'paid' : 'pending'} />
              <DepositRow label="J-14 (30%)" value={quote.amount * 0.3} status="pending" />
              <DepositRow label="J-1 (40%)" value={quote.amount * 0.4} status="pending" />
            </div>
          </div>

          {/* Client portal */}
          {quote.clientPortalEnabled && (
            <div style={{ padding: 14, background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: 10, border: '1px solid #86efac', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Globe size={16} style={{ color: '#15803d' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>Portail client actif</div>
              </div>
              <div style={{ fontSize: 12, color: '#166534', marginBottom: 10 }}>
                Le client peut consulter, modifier et payer en ligne
              </div>
              <button style={{ padding: '6px 12px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <LinkIcon size={12} /> Copier le lien
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={{ flex: 1, minWidth: 160, padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Download size={15} /> PDF proposition
            </button>
            <button style={{ flex: 1, minWidth: 140, padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Copy size={15} /> Dupliquer
            </button>
            <button style={{ flex: 1, minWidth: 140, padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={15} /> Relancer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={16} style={{ color: '#64748b', marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function DepositRow({ label, value, status }: { label: string; value: number; status: 'paid' | 'pending' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: status === 'paid' ? '#dcfce7' : '#fff', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'paid'
          ? <CheckCircle2 size={14} style={{ color: '#15803d' }} />
          : <Clock size={14} style={{ color: '#94a3b8' }} />}
        <span style={{ fontSize: 13, color: '#1e293b' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmtEUR(value)}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Compare Modal — side by side quotes                                */
/* ------------------------------------------------------------------ */

function CompareModal({ onClose }: { onClose: () => void }) {
  const versions = [
    {
      name: 'Version Essentiel',
      color: '#3b82f6',
      total: 5800,
      formula: 'Formule Dîner',
      drinks: 'Open bar 2h',
      extras: ['Décoration florale'],
      rentals: '6 tables rondes',
    },
    {
      name: 'Version Premium',
      color: '#8b5cf6',
      total: 8200,
      formula: 'Formule Dîner + amuse-bouches',
      drinks: 'Open bar 4h',
      extras: ['Décoration florale', 'DJ professionnel'],
      rentals: '8 tables rondes + chaises Chiavari',
    },
    {
      name: 'Version Luxe',
      color: '#f59e0b',
      total: 12400,
      formula: 'Menu gastronomique 5 services',
      drinks: 'Premium illimité',
      extras: ['Décoration florale', 'DJ professionnel', 'Photographe', 'Pack lumières'],
      rentals: 'Setup complet premium',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 960, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Comparaison de propositions</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>Vue côte à côte pour faciliter la décision client</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {versions.map((v, i) => (
            <div key={i} style={{ border: `2px solid ${v.color}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: 16, background: `linear-gradient(135deg, ${v.color}, ${v.color}dd)`, color: '#fff' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{fmtEUR(v.total)}</div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>HT · 50 personnes</div>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <CompareRow label="Menu" value={v.formula} />
                <CompareRow label="Boissons" value={v.drinks} />
                <CompareRow label="Extras" value={v.extras.join(', ')} />
                <CompareRow label="Location" value={v.rentals} />
              </div>
              <div style={{ padding: 14, borderTop: '1px solid #e2e8f0' }}>
                <button style={{ width: '100%', padding: '9px 12px', background: v.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Choisir <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#0f172a', marginTop: 2 }}>{value}</div>
    </div>
  )
}
