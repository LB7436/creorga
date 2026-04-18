import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  TrendingUp,
  Euro,
  Target,
  ShoppingBag,
  Users,
  MapPin,
  Calendar,
  Truck,
  Package,
  Coffee,
  Utensils,
  Plus,
  Minus,
  Trash2,
  Search,
  Download,
  Send,
  Clock,
  CheckCircle2,
  FileText,
  Boxes,
  UserCheck,
  Repeat,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  purple: '#9333ea',
  purpleSoft: '#f3e8ff',
  purpleMid: '#a855f7',
  purpleDark: '#6b21a8',
  green: '#16a34a',
  greenSoft: '#dcfce7',
  blue: '#2563eb',
  blueSoft: '#dbeafe',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#dc2626',
  redSoft: '#fee2e2',
  indigo: '#4f46e5',
  indigoSoft: '#e0e7ff',
}

type OrderStatus = 'Devis' | 'Confirmée' | 'En préparation' | 'Livrée' | 'Facturée'

interface CateringOrder {
  id: string
  client: string
  date: string
  lieu: string
  guests: number
  menu: string
  amount: number
  status: OrderStatus
}

const ORDERS: CateringOrder[] = [
  { id: 'CAT-2026-018', client: 'Banque BGL', date: '22/04/2026', lieu: 'Kirchberg', guests: 45, menu: 'Cocktail dînatoire', amount: 1485, status: 'Confirmée' },
  { id: 'CAT-2026-017', client: 'Étude Arendt', date: '20/04/2026', lieu: 'Luxembourg-Ville', guests: 28, menu: 'Buffet froid', amount: 910, status: 'En préparation' },
  { id: 'CAT-2026-016', client: 'Mariage Lefèvre', date: '18/04/2026', lieu: 'Château Munsbach', guests: 80, menu: 'Repas assis complet', amount: 5280, status: 'Livrée' },
  { id: 'CAT-2026-015', client: 'KPMG', date: '17/04/2026', lieu: 'Cloche d\'Or', guests: 35, menu: 'Pause café + Buffet froid', amount: 1295, status: 'Facturée' },
  { id: 'CAT-2026-014', client: 'Commune Differdange', date: '15/04/2026', lieu: 'Mairie', guests: 120, menu: 'Finger food premium', amount: 6120, status: 'Facturée' },
  { id: 'CAT-2026-013', client: 'Post Luxembourg', date: '12/04/2026', lieu: 'Gasperich', guests: 22, menu: 'Brunch', amount: 712, status: 'Facturée' },
  { id: 'CAT-2026-012', client: 'Famille Schmit', date: '10/04/2026', lieu: 'Domicile Bertrange', guests: 16, menu: 'Buffet chaud', amount: 640, status: 'Facturée' },
  { id: 'CAT-2026-011', client: 'Cargolux', date: '08/04/2026', lieu: 'Findel', guests: 60, menu: 'Cocktail dînatoire', amount: 1980, status: 'Livrée' },
  { id: 'CAT-2026-010', client: 'Lycée Aline Mayrisch', date: '05/04/2026', lieu: 'Luxembourg', guests: 150, menu: 'Buffet froid', amount: 4350, status: 'Facturée' },
  { id: 'CAT-2026-009', client: 'Vernissage Galerie Nosbaum', date: '02/04/2026', lieu: 'Grund', guests: 40, menu: 'Finger food premium', amount: 2040, status: 'Devis' },
]

interface MenuPackage {
  id: string
  name: string
  price: number
  description: string
  icon: typeof Coffee
  color: string
}

const PACKAGES: MenuPackage[] = [
  { id: 'cocktail', name: 'Cocktail dînatoire', price: 15, description: 'Amuse-bouches variés, tapenades, verrines', icon: Sparkles, color: C.purple },
  { id: 'buffet-froid', name: 'Buffet froid', price: 25, description: 'Entrées, salades composées, plateau fromages', icon: Utensils, color: C.blue },
  { id: 'buffet-chaud', name: 'Buffet chaud', price: 35, description: 'Plats chauds au choix, accompagnements', icon: ChefHat, color: C.amber },
  { id: 'assis', name: 'Repas assis complet', price: 55, description: 'Entrée + plat + dessert, service à table', icon: Utensils, color: C.indigo },
  { id: 'brunch', name: 'Brunch', price: 28, description: 'Sucré + salé + boissons chaudes et froides', icon: Coffee, color: C.green },
  { id: 'pause', name: 'Pause café', price: 12, description: 'Viennoiseries, café, thé, jus de fruits', icon: Coffee, color: C.red },
  { id: 'finger', name: 'Finger food premium', price: 45, description: 'Bouchées gastronomiques, chef sur place', icon: Sparkles, color: C.purpleDark },
]

interface CatalogItem {
  id: string
  name: string
  cat: string
  price: number
}

const CATALOG: CatalogItem[] = [
  { id: 'c1', name: 'Mini-burgers boeuf truffé', cat: 'Chaud', price: 3.5 },
  { id: 'c2', name: 'Verrine saumon gravlax', cat: 'Froid', price: 2.8 },
  { id: 'c3', name: 'Brochettes poulet yakitori', cat: 'Chaud', price: 2.5 },
  { id: 'c4', name: 'Tapenade olive noire', cat: 'Apéritif', price: 1.2 },
  { id: 'c5', name: 'Bouchée foie gras pain d\'épices', cat: 'Froid', price: 4.2 },
  { id: 'c6', name: 'Wrap végétarien', cat: 'Froid', price: 2.2 },
  { id: 'c7', name: 'Assortiment de macarons', cat: 'Sucré', price: 1.8 },
  { id: 'c8', name: 'Tartelette fruits frais', cat: 'Sucré', price: 2.5 },
  { id: 'c9', name: 'Plateau de fromages affinés', cat: 'Fromage', price: 6.5 },
  { id: 'c10', name: 'Soupe froide concombre-menthe', cat: 'Froid', price: 3.2 },
]

interface Equipment {
  id: string
  name: string
  quantity: number
  reserved: number
  dailyRate: number
}

const EQUIPMENT: Equipment[] = [
  { id: 'e1', name: 'Chauffe-plats gastro', quantity: 12, reserved: 4, dailyRate: 25 },
  { id: 'e2', name: 'Plateaux argentés', quantity: 40, reserved: 18, dailyRate: 5 },
  { id: 'e3', name: 'Glacières pro 60L', quantity: 8, reserved: 2, dailyRate: 15 },
  { id: 'e4', name: 'Assiettes porcelaine', quantity: 300, reserved: 120, dailyRate: 0.8 },
  { id: 'e5', name: 'Verres à vin', quantity: 200, reserved: 80, dailyRate: 0.5 },
  { id: 'e6', name: 'Nappes blanches', quantity: 30, reserved: 12, dailyRate: 8 },
]

interface StaffMember {
  id: string
  name: string
  role: string
  available: boolean
  events: number
}

const STAFF: StaffMember[] = [
  { id: 's1', name: 'Laurent Becker', role: 'Chef de cuisine', available: true, events: 3 },
  { id: 's2', name: 'Sophie Marx', role: 'Serveuse', available: true, events: 5 },
  { id: 's3', name: 'Tom Weber', role: 'Serveur', available: false, events: 6 },
  { id: 's4', name: 'Claire Dupont', role: 'Maître d\'hôtel', available: true, events: 4 },
  { id: 's5', name: 'Marco Rossi', role: 'Commis', available: true, events: 2 },
]

interface RepeatClient {
  id: string
  name: string
  frequency: string
  lastOrder: string
  monthly: number
}

const REPEAT_CLIENTS: RepeatClient[] = [
  { id: 'r1', name: 'Banque BGL — déjeuner du vendredi', frequency: 'Hebdomadaire', lastOrder: '12/04/2026', monthly: 1240 },
  { id: 'r2', name: 'KPMG — pause café bureau', frequency: 'Bi-hebdomadaire', lastOrder: '15/04/2026', monthly: 860 },
  { id: 'r3', name: 'Post Luxembourg — brunch mensuel', frequency: 'Mensuel', lastOrder: '12/04/2026', monthly: 720 },
  { id: 'r4', name: 'Étude Arendt — dîner client', frequency: 'Bi-mensuel', lastOrder: '20/04/2026', monthly: 1820 },
]

interface QuoteTemplate {
  id: string
  name: string
  description: string
  baseGuests: number
  estimated: number
}

const TEMPLATES: QuoteTemplate[] = [
  { id: 'q1', name: 'Mariage 80 personnes', description: 'Cocktail + repas assis + service complet', baseGuests: 80, estimated: 5600 },
  { id: 'q2', name: 'Séminaire entreprise', description: 'Pause café + buffet déjeuner', baseGuests: 40, estimated: 1600 },
  { id: 'q3', name: 'Vernissage / inauguration', description: 'Finger food + boissons + serveurs', baseGuests: 60, estimated: 3200 },
  { id: 'q4', name: 'Anniversaire privé', description: 'Buffet chaud + dessert', baseGuests: 25, estimated: 950 },
]

const statusStyle = (s: OrderStatus): { bg: string; fg: string } => {
  if (s === 'Devis') return { bg: C.amberSoft, fg: C.amber }
  if (s === 'Confirmée') return { bg: C.blueSoft, fg: C.blue }
  if (s === 'En préparation') return { bg: C.purpleSoft, fg: C.purple }
  if (s === 'Livrée') return { bg: C.indigoSoft, fg: C.indigo }
  return { bg: C.greenSoft, fg: C.green }
}

function CateringPage() {
  const [tab, setTab] = useState<'overview' | 'orders' | 'menu' | 'builder' | 'delivery' | 'equipment' | 'staff' | 'repeat'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Tous' | OrderStatus>('Tous')

  // Pricing calculator state
  const [selPkg, setSelPkg] = useState<string>('buffet-froid')
  const [guests, setGuests] = useState(30)
  const [distance, setDistance] = useState(15)
  const [hasEquipment, setHasEquipment] = useState(true)
  const [serviceHours, setServiceHours] = useState(3)
  const [serviceStaff, setServiceStaff] = useState(2)

  // Custom menu builder
  const [selectedItems, setSelectedItems] = useState<{ id: string; qty: number }[]>([])

  const pkg = PACKAGES.find((p) => p.id === selPkg)!

  const pricing = useMemo(() => {
    const base = pkg.price * guests
    let transport = 0
    if (distance > 30) transport = 50
    else if (distance > 10) transport = 25
    const equipment = hasEquipment ? 75 : 0
    const service = serviceHours * serviceStaff * 35
    const subtotal = base + transport + equipment + service
    const total = Math.max(subtotal, 50)
    return { base, transport, equipment, service, total }
  }, [pkg, guests, distance, hasEquipment, serviceHours, serviceStaff])

  const filteredOrders = useMemo(() => {
    return ORDERS.filter((o) => {
      if (statusFilter !== 'Tous' && o.status !== statusFilter) return false
      if (search && !o.client.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, statusFilter])

  const builderTotal = useMemo(() => {
    return selectedItems.reduce((sum, s) => {
      const item = CATALOG.find((c) => c.id === s.id)
      return sum + (item ? item.price * s.qty : 0)
    }, 0)
  }, [selectedItems])

  const addItem = (id: string) => {
    setSelectedItems((prev) => {
      const ex = prev.find((p) => p.id === id)
      if (ex) return prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p))
      return [...prev, { id, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    )
  }

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div style={{ padding: '28px 32px', background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${C.purple}40` }}>
            <ChefHat size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Traiteur</h1>
            <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>Événements livrés, buffets et prestations sur-mesure</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnSecondary}>
            <Download size={16} /> Exporter
          </button>
          <button style={btnPrimary}>
            <Plus size={16} /> Nouvelle commande
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={ShoppingBag} label="Commandes ce mois" value="18" delta="+22%" color={C.purple} soft={C.purpleSoft} />
        <StatCard icon={Euro} label="CA traiteur" value="4 320 €" delta="+18%" color={C.green} soft={C.greenSoft} />
        <StatCard icon={TrendingUp} label="Panier moyen" value="240 €" delta="+8%" color={C.blue} soft={C.blueSoft} />
        <StatCard icon={Target} label="Taux de conversion" value="72 %" delta="+5 pts" color={C.indigo} soft={C.indigoSoft} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 20, overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3Fallback },
          { id: 'orders', label: 'Commandes', icon: ShoppingBag },
          { id: 'menu', label: 'Formules', icon: Utensils },
          { id: 'builder', label: 'Menu sur-mesure', icon: Plus },
          { id: 'delivery', label: 'Livraison', icon: Truck },
          { id: 'equipment', label: 'Équipement', icon: Boxes },
          { id: 'staff', label: 'Personnel', icon: UserCheck },
          { id: 'repeat', label: 'Clients récurrents', icon: Repeat },
        ].map((t) => {
          const Icon = t.icon as typeof ShoppingBag
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: '10px 14px',
                background: active ? C.purple : 'transparent',
                color: active ? '#fff' : C.muted,
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all .15s',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" {...fade} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            <Card title="Prochains événements" icon={Calendar}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ORDERS.slice(0, 5).map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{o.client}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', gap: 8 }}>
                        <span><Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />{o.date}</span>
                        <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{o.lieu}</span>
                        <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{o.guests} pers.</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: C.purple }}>{o.amount.toLocaleString('fr-FR')} €</div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Calculateur rapide" icon={Euro}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Formule</label>
                  <select value={selPkg} onChange={(e) => setSelPkg(e.target.value)} style={inputStyle}>
                    {PACKAGES.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.price} €/pers</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Invités</label>
                    <input type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Distance (km)</label>
                    <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Heures service</label>
                    <input type="number" value={serviceHours} onChange={(e) => setServiceHours(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Serveurs</label>
                    <input type="number" value={serviceStaff} onChange={(e) => setServiceStaff(Number(e.target.value))} style={inputStyle} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={hasEquipment} onChange={(e) => setHasEquipment(e.target.checked)} />
                  Équipement (chauffe-plats, vaisselle) — 75 €
                </label>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <Row label="Base formule" value={`${pricing.base.toFixed(0)} €`} />
                  <Row label="Transport" value={`${pricing.transport} €`} />
                  <Row label="Équipement" value={`${pricing.equipment} €`} />
                  <Row label="Service" value={`${pricing.service} €`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: C.purple, marginTop: 6 }}>
                    <span>Total</span>
                    <span>{pricing.total.toFixed(0)} €</span>
                  </div>
                  {pricing.total === 50 && (
                    <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>
                      Minimum de commande appliqué (50 €)
                    </div>
                  )}
                </div>
                <button style={{ ...btnPrimary, justifyContent: 'center' }}>
                  <Send size={16} /> Envoyer le devis
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'orders' && (
          <motion.div key="orders" {...fade}>
            <Card title="Toutes les commandes traiteur" icon={ShoppingBag}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                  <Search size={15} color={C.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher client ou ID..."
                    style={{ ...inputStyle, paddingLeft: 36 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={14} color={C.muted} />
                  {(['Tous', 'Devis', 'Confirmée', 'En préparation', 'Livrée', 'Facturée'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: `1px solid ${statusFilter === s ? C.purple : C.border}`,
                        background: statusFilter === s ? C.purpleSoft : '#fff',
                        color: statusFilter === s ? C.purple : C.muted,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted, fontSize: 12 }}>
                      <th style={th}>ID</th>
                      <th style={th}>Client</th>
                      <th style={th}>Date</th>
                      <th style={th}>Lieu</th>
                      <th style={th}>Pers.</th>
                      <th style={th}>Menu</th>
                      <th style={{ ...th, textAlign: 'right' }}>Montant</th>
                      <th style={th}>Statut</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted }}>{o.id}</span></td>
                        <td style={{ ...td, fontWeight: 600 }}>{o.client}</td>
                        <td style={td}>{o.date}</td>
                        <td style={td}>{o.lieu}</td>
                        <td style={td}>{o.guests}</td>
                        <td style={td}>{o.menu}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: C.purple }}>{o.amount.toLocaleString('fr-FR')} €</td>
                        <td style={td}><StatusBadge status={o.status} /></td>
                        <td style={td}><button style={iconBtn}><ArrowRight size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'menu' && (
          <motion.div key="menu" {...fade}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {PACKAGES.map((p) => {
                const Icon = p.icon
                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -3 }}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={22} color={p.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>{p.price} € / personne</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                    <button
                      onClick={() => { setSelPkg(p.id); setTab('overview') }}
                      style={{
                        marginTop: 14,
                        width: '100%',
                        padding: '8px 12px',
                        background: C.purpleSoft,
                        color: C.purple,
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Sélectionner
                    </button>
                  </motion.div>
                )
              })}
            </div>

            <div style={{ marginTop: 20 }}>
              <Card title="Modèles de devis pré-remplis" icon={FileText}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {TEMPLATES.map((t) => (
                    <div key={t.id} style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                        <span style={{ color: C.muted }}>{t.baseGuests} personnes · base</span>
                        <span style={{ fontWeight: 700, color: C.purple }}>~{t.estimated} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'builder' && (
          <motion.div key="builder" {...fade} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
            <Card title="Catalogue" icon={Utensils}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CATALOG.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      background: C.bg,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        <span style={{ background: C.purpleSoft, color: C.purple, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{c.cat}</span>
                        <span style={{ marginLeft: 8 }}>{c.price.toFixed(2)} € / pièce</span>
                      </div>
                    </div>
                    <button onClick={() => addItem(c.id)} style={btnPrimary}>
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Menu composé" icon={ShoppingBag}>
              {selectedItems.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                  <Plus size={26} color={C.border} style={{ marginBottom: 10 }} />
                  <div>Ajoutez des items depuis le catalogue</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.map((s) => {
                    const item = CATALOG.find((c) => c.id === s.id)!
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.bg, borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{item.price.toFixed(2)} € × {s.qty} = {(item.price * s.qty).toFixed(2)} €</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => updateQty(s.id, -1)} style={qtyBtn}><Minus size={12} /></button>
                          <span style={{ width: 28, textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{s.qty}</span>
                          <button onClick={() => updateQty(s.id, 1)} style={qtyBtn}><Plus size={12} /></button>
                          <button onClick={() => removeItem(s.id)} style={{ ...qtyBtn, color: C.red }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: C.purple }}>
                    <span>Total par personne</span>
                    <span>{builderTotal.toFixed(2)} €</span>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {tab === 'delivery' && (
          <motion.div key="delivery" {...fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Gestion des livraisons" icon={Truck}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InfoRow icon={Truck} title="Véhicule isotherme" desc="Flotte 2 utilitaires frigo -18 °C / +4 °C, maintien HACCP" />
                <InfoRow icon={Clock} title="Horaires de livraison" desc="Entre 30 min et 2h avant le début de l'événement selon formule" />
                <InfoRow icon={CheckCircle2} title="Mise en place sur site" desc="Installation buffet, dressage, contrôle qualité avant départ" />
                <InfoRow icon={MapPin} title="Zone de couverture" desc="Grand-Duché complet · frais transport selon distance" />
              </div>

              <div style={{ marginTop: 16, padding: 14, background: C.purpleSoft, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.purpleDark, marginBottom: 8 }}>Grille tarifaire transport</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: C.text }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>0 – 10 km</span><strong>Gratuit</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>10 – 30 km</span><strong>25 €</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>30 km +</span><strong>50 €</strong></div>
                </div>
              </div>
            </Card>

            <Card title="Livraisons du jour" icon={Calendar}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ORDERS.filter((o) => o.status === 'Confirmée' || o.status === 'En préparation').slice(0, 5).map((o) => (
                  <div key={o.id} style={{ padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{o.client}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{o.date}</span>
                      <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{o.lieu}</span>
                      <span><Users size={11} style={{ display: 'inline', marginRight: 3 }} />{o.guests} pers.</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'equipment' && (
          <motion.div key="equipment" {...fade}>
            <Card title="Inventaire équipement" icon={Boxes}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted, fontSize: 12 }}>
                      <th style={th}>Équipement</th>
                      <th style={th}>Quantité totale</th>
                      <th style={th}>Réservé</th>
                      <th style={th}>Disponible</th>
                      <th style={th}>Tarif journalier</th>
                      <th style={th}>Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EQUIPMENT.map((e) => {
                      const pct = Math.round((e.reserved / e.quantity) * 100)
                      const available = e.quantity - e.reserved
                      return (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ ...td, fontWeight: 600 }}>{e.name}</td>
                          <td style={td}>{e.quantity}</td>
                          <td style={td}>{e.reserved}</td>
                          <td style={{ ...td, color: available > 0 ? C.green : C.red, fontWeight: 600 }}>{available}</td>
                          <td style={td}>{e.dailyRate.toFixed(2)} €</td>
                          <td style={td}>
                            <div style={{ width: 140, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? C.red : pct > 50 ? C.amber : C.green }} />
                            </div>
                            <span style={{ fontSize: 11, color: C.muted }}>{pct}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'staff' && (
          <motion.div key="staff" {...fade}>
            <Card title="Planning personnel traiteur" icon={UserCheck}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {STAFF.map((s) => (
                  <div key={s.id} style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 12, background: C.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.purpleSoft, color: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                        {s.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{s.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 8 }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: s.available ? C.greenSoft : C.redSoft, color: s.available ? C.green : C.red }}>
                        {s.available ? 'Disponible' : 'Indisponible'}
                      </span>
                      <span style={{ color: C.muted }}>{s.events} événements ce mois</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'repeat' && (
          <motion.div key="repeat" {...fade}>
            <Card title="Clients B2B récurrents" icon={Repeat}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {REPEAT_CLIENTS.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'flex', gap: 14 }}>
                        <span><Repeat size={11} style={{ display: 'inline', marginRight: 3 }} />{r.frequency}</span>
                        <span><Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />Dernière commande : {r.lastOrder}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Revenu mensuel</div>
                      <div style={{ fontWeight: 700, color: C.purple, fontSize: 16 }}>{r.monthly.toLocaleString('fr-FR')} €</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- helpers & local components ---

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
}

function BarChart3Fallback({ size = 16, color }: { size?: number; color?: string }) {
  return <Package size={size} color={color} />
}

function StatCard({ icon: Icon, label, value, delta, color, soft }: { icon: typeof Euro; label: string; value: string; delta: string; color: string; soft: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.green, background: C.greenSoft, padding: '3px 8px', borderRadius: 6 }}>{delta}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
    </motion.div>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Euro; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon size={18} color={C.purple} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = statusStyle(status)
  return (
    <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg, display: 'inline-block', marginTop: 4 }}>
      {status}
    </span>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted }}>
      <span>{label}</span>
      <span style={{ color: C.text, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function InfoRow({ icon: Icon, title, desc }: { icon: typeof Truck; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: C.purpleSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={C.purple} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

// --- styles ---

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: C.purple,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: C.card,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  background: C.bg,
  borderRadius: 8,
  cursor: 'pointer',
  color: C.muted,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const qtyBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  border: `1px solid ${C.border}`,
  background: '#fff',
  borderRadius: 6,
  cursor: 'pointer',
  color: C.muted,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  background: '#fff',
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 5,
}

const th: React.CSSProperties = {
  padding: '10px 12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
}

const td: React.CSSProperties = {
  padding: '12px',
  color: C.text,
}

export default CateringPage
