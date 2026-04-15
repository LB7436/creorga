import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Search, X, User, Star, Wallet,
  ShoppingBag, ChevronRight, ChevronDown, ChevronUp,
  Users, Mail, Phone, MapPin, Calendar, Tag,
  Download, MessageSquare, CreditCard, Award,
  ArrowUpDown, Filter, BarChart3, Clock, Heart
} from 'lucide-react'

/* ── helpers ───────────────────────────────────────────────── */
const fmt = (v: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(v)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-LU')
const fmtDateTime = (d: string) => new Date(d).toLocaleDateString('fr-LU', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

/* ── types ─────────────────────────────────────────────────── */
interface Order {
  id: string
  createdAt: string
  total: number
  itemsCount: number
  status: string
  paymentMethod: string
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city?: string
  postalCode?: string
  birthDate?: string
  notes?: string
  loyaltyPoints: number
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold'
  walletBalance: number
  totalSpent: number
  visitCount: number
  avgBasket: number
  lastVisit: string
  createdAt: string
  tags: string[]
  marketingConsent: boolean
  onTab: boolean
  orders: Order[]
}

/* ── mock data ─────────────────────────────────────────────── */
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1', firstName: 'Marc', lastName: 'Schmit', email: 'marc.schmit@pt.lu',
    phone: '+352 621 123 456', address: '12 rue de la Gare', city: 'Luxembourg-Ville',
    postalCode: '1616', birthDate: '1985-03-15', notes: 'Préfère la terrasse',
    loyaltyPoints: 720, loyaltyTier: 'Gold', walletBalance: 45.00,
    totalSpent: 2340.50, visitCount: 87, avgBasket: 26.90,
    lastVisit: '2026-04-14T19:30:00', createdAt: '2024-06-10T10:00:00',
    tags: ['Client fidèle', 'VIP'], marketingConsent: true, onTab: false,
    orders: [
      { id: 'o1', createdAt: '2026-04-14T19:30:00', total: 34.50, itemsCount: 3, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o2', createdAt: '2026-04-10T12:15:00', total: 22.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
      { id: 'o3', createdAt: '2026-04-05T20:00:00', total: 45.80, itemsCount: 4, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o4', createdAt: '2026-03-28T13:00:00', total: 18.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o5', createdAt: '2026-03-20T19:45:00', total: 29.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '2', firstName: 'Léa', lastName: 'Muller', email: 'lea.muller@education.lu',
    phone: '+352 691 234 567', address: '5 avenue Monterey', city: 'Luxembourg-Ville',
    postalCode: '2163', birthDate: '1992-07-22', notes: '',
    loyaltyPoints: 340, loyaltyTier: 'Silver', walletBalance: 20.00,
    totalSpent: 890.00, visitCount: 34, avgBasket: 26.18,
    lastVisit: '2026-04-12T12:00:00', createdAt: '2025-01-15T14:00:00',
    tags: ['Client fidèle'], marketingConsent: true, onTab: false,
    orders: [
      { id: 'o6', createdAt: '2026-04-12T12:00:00', total: 15.50, itemsCount: 1, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o7', createdAt: '2026-04-08T13:30:00', total: 28.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
      { id: 'o8', createdAt: '2026-03-30T19:00:00', total: 42.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '3', firstName: 'Tom', lastName: 'Reuter', email: 'tom.reuter@gmail.com',
    phone: '+352 661 345 678', address: '28 rue du Fossé', city: 'Esch-sur-Alzette',
    postalCode: '4123', birthDate: '1990-11-03', notes: 'Allergique aux noix',
    loyaltyPoints: 580, loyaltyTier: 'Gold', walletBalance: 75.00,
    totalSpent: 1560.00, visitCount: 62, avgBasket: 25.16,
    lastVisit: '2026-04-13T20:15:00', createdAt: '2024-09-20T09:00:00',
    tags: ['VIP', 'Client fidèle'], marketingConsent: false, onTab: true,
    orders: [
      { id: 'o9', createdAt: '2026-04-13T20:15:00', total: 52.00, itemsCount: 4, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o10', createdAt: '2026-04-09T12:45:00', total: 19.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '4', firstName: 'Sophie', lastName: 'Weber', email: 'sophie.w@outlook.com',
    phone: '+352 621 456 789', address: '3 place Guillaume II', city: 'Luxembourg-Ville',
    postalCode: '1648', birthDate: '1988-01-30', notes: 'Végétarienne',
    loyaltyPoints: 120, loyaltyTier: 'Bronze', walletBalance: 10.00,
    totalSpent: 320.00, visitCount: 12, avgBasket: 26.67,
    lastVisit: '2026-04-01T18:00:00', createdAt: '2025-11-05T11:00:00',
    tags: ['Nouveau'], marketingConsent: true, onTab: false,
    orders: [
      { id: 'o11', createdAt: '2026-04-01T18:00:00', total: 24.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o12', createdAt: '2026-03-15T12:30:00', total: 16.50, itemsCount: 1, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '5', firstName: 'Pierre', lastName: 'Hoffmann', email: 'p.hoffmann@post.lu',
    phone: '+352 691 567 890', address: '17 rue de Strasbourg', city: 'Luxembourg-Ville',
    postalCode: '2561', birthDate: '1975-05-18', notes: '',
    loyaltyPoints: 910, loyaltyTier: 'Gold', walletBalance: 120.00,
    totalSpent: 4200.00, visitCount: 156, avgBasket: 26.92,
    lastVisit: '2026-04-14T12:30:00', createdAt: '2023-03-01T08:00:00',
    tags: ['VIP', 'Client fidèle'], marketingConsent: true, onTab: false,
    orders: [
      { id: 'o13', createdAt: '2026-04-14T12:30:00', total: 38.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o14', createdAt: '2026-04-12T19:00:00', total: 55.00, itemsCount: 4, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o15', createdAt: '2026-04-10T12:00:00', total: 22.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
      { id: 'o16', createdAt: '2026-04-07T20:30:00', total: 31.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o17', createdAt: '2026-04-03T13:15:00', total: 19.00, itemsCount: 1, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '6', firstName: 'Julie', lastName: 'Kieffer', email: 'julie.kieffer@vo.lu',
    phone: '+352 661 678 901', address: '9 boulevard Royal', city: 'Luxembourg-Ville',
    postalCode: '2449', birthDate: '1995-09-12', notes: 'Anniversaire en septembre',
    loyaltyPoints: 45, loyaltyTier: 'Bronze', walletBalance: 0,
    totalSpent: 85.00, visitCount: 3, avgBasket: 28.33,
    lastVisit: '2026-02-20T19:00:00', createdAt: '2026-01-10T16:00:00',
    tags: ['Nouveau'], marketingConsent: false, onTab: false,
    orders: [
      { id: 'o18', createdAt: '2026-02-20T19:00:00', total: 32.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '7', firstName: 'Lucas', lastName: 'Theis', email: 'lucas.theis@pt.lu',
    phone: '+352 621 789 012', address: '42 rue de Hollerich', city: 'Luxembourg-Ville',
    postalCode: '1741', birthDate: '1982-12-05', notes: '',
    loyaltyPoints: 260, loyaltyTier: 'Silver', walletBalance: 35.00,
    totalSpent: 680.00, visitCount: 28, avgBasket: 24.29,
    lastVisit: '2026-04-11T20:00:00', createdAt: '2025-05-22T10:00:00',
    tags: ['Client fidèle'], marketingConsent: true, onTab: true,
    orders: [
      { id: 'o19', createdAt: '2026-04-11T20:00:00', total: 27.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o20', createdAt: '2026-04-06T12:30:00', total: 18.00, itemsCount: 1, status: 'PAID', paymentMethod: 'Cash' },
      { id: 'o21', createdAt: '2026-03-25T19:30:00', total: 41.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Wallet' },
    ]
  },
  {
    id: '8', firstName: 'Anna', lastName: 'Braun', email: 'anna.braun@gmail.com',
    phone: '+352 691 890 123', address: '6 rue de Bonnevoie', city: 'Luxembourg-Ville',
    postalCode: '1260', birthDate: '1998-04-25', notes: 'Étudiante, réductions possibles',
    loyaltyPoints: 0, loyaltyTier: 'Bronze', walletBalance: 0,
    totalSpent: 0, visitCount: 0, avgBasket: 0,
    lastVisit: '', createdAt: '2026-04-14T15:00:00',
    tags: ['Nouveau'], marketingConsent: true, onTab: false,
    orders: []
  },
]

/* ── tier config ───────────────────────────────────────────── */
const TIER_CONFIG = {
  Bronze: { color: '#CD7F32', bg: '#FDF2E6', border: '#E8C496', next: 'Silver', pointsNeeded: 200 },
  Silver: { color: '#94A3B8', bg: '#F0F4F8', border: '#CBD5E1', next: 'Gold', pointsNeeded: 500 },
  Gold:   { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', next: null, pointsNeeded: null },
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Client fidèle': { bg: '#DBEAFE', text: '#1E40AF' },
  'VIP':           { bg: '#FEF3C7', text: '#92400E' },
  'Nouveau':       { bg: '#D1FAE5', text: '#065F46' },
}

const AVATAR_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#0891B2', '#4F46E5'
]

type SortKey = 'name' | 'points' | 'lastVisit' | 'totalSpent'
type SortDir = 'asc' | 'desc'
type FilterChip = 'all' | 'active' | 'inactive' | 'vip' | 'new'

const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'inactive', label: 'Inactifs (30j+)' },
  { key: 'vip', label: 'VIP' },
  { key: 'new', label: 'Nouveaux' },
]

const PAGE_SIZE = 5

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all')
  const [page, setPage] = useState(0)

  /* new customer modal state */
  const [newForm, setNewForm] = useState({
    firstName: '', lastName: '', email: '', phone: '+352 ',
    address: '', postalCode: '', city: '', birthDate: '', notes: '',
    marketingConsent: false,
  })

  const customers = MOCK_CUSTOMERS

  /* filter */
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      const q = search.toLowerCase()
      return (
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      )
    })

    /* chip filter */
    if (activeFilter === 'active') {
      list = list.filter(c => c.lastVisit && new Date(c.lastVisit) >= thirtyDaysAgo)
    } else if (activeFilter === 'inactive') {
      list = list.filter(c => !c.lastVisit || new Date(c.lastVisit) < thirtyDaysAgo)
    } else if (activeFilter === 'vip') {
      list = list.filter(c => c.tags.includes('VIP'))
    } else if (activeFilter === 'new') {
      list = list.filter(c => c.tags.includes('Nouveau'))
    }

    /* sort */
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      else if (sortKey === 'points') cmp = a.loyaltyPoints - b.loyaltyPoints
      else if (sortKey === 'lastVisit') cmp = (a.lastVisit || '').localeCompare(b.lastVisit || '')
      else if (sortKey === 'totalSpent') cmp = a.totalSpent - b.totalSpent
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [customers, search, activeFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: 4 }} />
      : <ChevronDown size={12} style={{ marginLeft: 4 }} />
  }

  function handleExportCSV() {
    const header = 'Prénom,Nom,Email,Téléphone,Points,Tier,Solde,Total dépensé,Visites'
    const rows = filtered.map(c =>
      `${c.firstName},${c.lastName},${c.email},${c.phone},${c.loyaltyPoints},${c.loyaltyTier},${c.walletBalance},${c.totalSpent},${c.visitCount}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients_creorga_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé')
  }

  function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.firstName || !newForm.lastName || !newForm.email) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    toast.success('Client créé avec succès')
    setShowNew(false)
    setNewForm({
      firstName: '', lastName: '', email: '', phone: '+352 ',
      address: '', postalCode: '', city: '', birthDate: '', notes: '',
      marketingConsent: false,
    })
  }

  function getAvatarColor(index: number) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length]
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Clients</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Gérez votre base clients et leur fidélité &mdash; {customers.length} clients
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#fff', color: '#475569',
              borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: '1px solid #e2e8f0', cursor: 'pointer',
            }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', background: '#7C3AED', color: '#fff',
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Nouveau client
          </button>
        </div>
      </div>

      {/* ── Search + Filters ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher par nom, email ou téléphone..."
            style={{
              width: '100%', padding: '10px 16px 10px 38px',
              borderRadius: 12, border: '1px solid #e2e8f0',
              fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b',
            }}
          />
        </div>
      </div>

      {/* ── Filter Chips ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => { setActiveFilter(chip.key); setPage(0) }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: activeFilter === chip.key ? '1.5px solid #7C3AED' : '1px solid #e2e8f0',
              background: activeFilter === chip.key ? '#F3E8FF' : '#fff',
              color: activeFilter === chip.key ? '#7C3AED' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {chip.label}
            {chip.key !== 'all' && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {chip.key === 'active' ? customers.filter(c => c.lastVisit && new Date(c.lastVisit) >= thirtyDaysAgo).length
                  : chip.key === 'inactive' ? customers.filter(c => !c.lastVisit || new Date(c.lastVisit) < thirtyDaysAgo).length
                  : chip.key === 'vip' ? customers.filter(c => c.tags.includes('VIP')).length
                  : customers.filter(c => c.tags.includes('Nouveau')).length
                }
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 200, color: '#94a3b8',
          }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontWeight: 500, margin: 0 }}>Aucun client trouvé</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ajustez vos filtres ou créez un nouveau client</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      Client <SortIcon col="name" />
                    </span>
                  </th>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Contact
                  </th>
                  <th
                    onClick={() => handleSort('points')}
                    style={{
                      padding: '12px 16px', textAlign: 'right', fontSize: 11,
                      fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      Fidélité <SortIcon col="points" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('totalSpent')}
                    style={{
                      padding: '12px 16px', textAlign: 'right', fontSize: 11,
                      fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      Total <SortIcon col="totalSpent" />
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('lastVisit')}
                    style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      Dernière visite <SortIcon col="lastVisit" />
                    </span>
                  </th>
                  <th style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Tags
                  </th>
                  <th style={{ padding: '12px 16px', width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, idx) => {
                  const tierCfg = TIER_CONFIG[c.loyaltyTier]
                  const globalIdx = customers.indexOf(c)
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelected(c)}
                      style={{
                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: getAvatarColor(globalIdx),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 13,
                            flexShrink: 0,
                          }}>
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                              {c.firstName} {c.lastName}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                              Client depuis {fmtDate(c.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>{c.email}</p>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>{c.phone}</p>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 12,
                          background: tierCfg.bg, color: tierCfg.color,
                          fontSize: 11, fontWeight: 600, border: `1px solid ${tierCfg.border}`,
                        }}>
                          <Star size={10} /> {c.loyaltyPoints} pts &middot; {c.loyaltyTier}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                        {fmt(c.totalSpent)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                        {c.lastVisit ? fmtDate(c.lastVisit) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {c.tags.map(tag => {
                            const tc = TAG_COLORS[tag] || { bg: '#F1F5F9', text: '#475569' }
                            return (
                              <span key={tag} style={{
                                padding: '2px 8px', borderRadius: 10,
                                fontSize: 10, fontWeight: 600,
                                background: tc.bg, color: tc.text,
                              }}>
                                {tag}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <ChevronRight size={15} style={{ color: '#cbd5e1' }} />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>

            {/* ── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderTop: '1px solid #f1f5f9',
              }}>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  {filtered.length} client{filtered.length > 1 ? 's' : ''} &middot; Page {page + 1}/{totalPages}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                      cursor: page === 0 ? 'default' : 'pointer',
                      opacity: page === 0 ? 0.4 : 1,
                    }}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
                      cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                      opacity: page >= totalPages - 1 ? 0.4 : 1,
                    }}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SIDE PANEL — Enhanced Customer Detail
         ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
                zIndex: 40,
              }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed', right: 0, top: 0, height: '100%',
                width: 440, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                zIndex: 50, overflowY: 'auto',
              }}
            >
              {/* Panel header */}
              <div style={{
                padding: '24px 24px 20px', borderBottom: '1px solid #f1f5f9',
                position: 'sticky', top: 0, background: '#fff', zIndex: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: getAvatarColor(customers.indexOf(selected)),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 18,
                    }}>
                      {selected.firstName[0]}{selected.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 17, color: '#1e293b', margin: 0 }}>
                        {selected.firstName} {selected.lastName}
                      </p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                        Client depuis {fmtDate(selected.createdAt)}
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {selected.tags.map(tag => {
                          const tc = TAG_COLORS[tag] || { bg: '#F1F5F9', text: '#475569' }
                          return (
                            <span key={tag} style={{
                              padding: '2px 8px', borderRadius: 10,
                              fontSize: 10, fontWeight: 600,
                              background: tc.bg, color: tc.text,
                            }}>
                              {tag}
                            </span>
                          )
                        })}
                        {selected.onTab && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 10,
                            fontSize: 10, fontWeight: 600,
                            background: '#FEE2E2', color: '#991B1B',
                          }}>
                            Sur compte
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      padding: 6, borderRadius: 8, border: 'none',
                      background: '#f1f5f9', cursor: 'pointer',
                    }}
                  >
                    <X size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* ── Contact Info ────────────────────────── */}
                <div style={{
                  background: '#f8fafc', borderRadius: 14, padding: 16,
                  border: '1px solid #f1f5f9',
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 12px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <User size={11} /> Coordonnées
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: 13, color: '#1e293b' }}>{selected.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={13} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: 13, color: '#1e293b' }}>{selected.phone}</span>
                    </div>
                    {selected.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <MapPin size={13} style={{ color: '#94a3b8', marginTop: 2 }} />
                        <span style={{ fontSize: 13, color: '#1e293b' }}>
                          {selected.address}, {selected.postalCode} {selected.city}
                        </span>
                      </div>
                    )}
                    {selected.birthDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={13} style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: 13, color: '#1e293b' }}>
                          Né(e) le {fmtDate(selected.birthDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Loyalty Section ─────────────────────── */}
                {(() => {
                  const tierCfg = TIER_CONFIG[selected.loyaltyTier]
                  const progress = tierCfg.pointsNeeded
                    ? Math.min(100, (selected.loyaltyPoints / tierCfg.pointsNeeded) * 100)
                    : 100
                  return (
                    <div style={{
                      background: tierCfg.bg, borderRadius: 14, padding: 16,
                      border: `1px solid ${tierCfg.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <p style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: tierCfg.color, letterSpacing: '0.06em', margin: 0,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <Award size={12} /> Programme Fidélité
                        </p>
                        <span style={{
                          padding: '3px 10px', borderRadius: 10, fontSize: 11,
                          fontWeight: 700, background: tierCfg.color, color: '#fff',
                        }}>
                          {selected.loyaltyTier}
                        </span>
                      </div>
                      <p style={{ fontSize: 28, fontWeight: 800, color: tierCfg.color, margin: '0 0 4px' }}>
                        {selected.loyaltyPoints} <span style={{ fontSize: 13, fontWeight: 500 }}>points</span>
                      </p>
                      {tierCfg.next && tierCfg.pointsNeeded && (
                        <>
                          <div style={{
                            width: '100%', height: 6, background: 'rgba(255,255,255,0.6)',
                            borderRadius: 3, marginTop: 10, overflow: 'hidden',
                          }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              style={{
                                height: '100%', background: tierCfg.color,
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <p style={{ fontSize: 11, color: tierCfg.color, margin: '6px 0 0', opacity: 0.8 }}>
                            {tierCfg.pointsNeeded - selected.loyaltyPoints > 0
                              ? `${tierCfg.pointsNeeded - selected.loyaltyPoints} pts pour ${tierCfg.next}`
                              : `Niveau ${tierCfg.next} atteint !`
                            }
                          </p>
                        </>
                      )}
                      {!tierCfg.next && (
                        <p style={{ fontSize: 11, color: tierCfg.color, margin: '6px 0 0', opacity: 0.8 }}>
                          Niveau maximum atteint
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* ── Wallet ──────────────────────────────── */}
                <div style={{
                  background: '#ECFDF5', borderRadius: 14, padding: 16,
                  border: '1px solid #A7F3D0',
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: '#059669', letterSpacing: '0.06em', margin: '0 0 8px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Wallet size={12} /> Portefeuille
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: '#059669', margin: 0 }}>
                      {fmt(selected.walletBalance)}
                    </p>
                    <button
                      onClick={() => toast.success('Fonctionnalité de recharge à venir')}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#059669', color: '#fff', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Recharger
                    </button>
                  </div>
                </div>

                {/* ── Stats ───────────────────────────────── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                }}>
                  {[
                    { label: 'Total dépensé', value: fmt(selected.totalSpent), icon: CreditCard, color: '#7C3AED' },
                    { label: 'Visites', value: String(selected.visitCount), icon: BarChart3, color: '#2563EB' },
                    { label: 'Panier moyen', value: fmt(selected.avgBasket), icon: ShoppingBag, color: '#D97706' },
                    { label: 'Dernière visite', value: selected.lastVisit ? fmtDate(selected.lastVisit) : '—', icon: Clock, color: '#059669' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: '#f8fafc', borderRadius: 12, padding: 14,
                      border: '1px solid #f1f5f9',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <stat.icon size={12} style={{ color: stat.color }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {stat.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Purchase History ─────────────────────── */}
                <div>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 10px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <ShoppingBag size={11} /> Dernières commandes
                  </p>
                  {selected.orders.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                      Aucune commande
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selected.orders.slice(0, 5).map(o => (
                        <div key={o.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: '#f8fafc', borderRadius: 10,
                          border: '1px solid #f1f5f9',
                        }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                              {fmtDate(o.createdAt)}
                            </p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                              {o.itemsCount} article{o.itemsCount > 1 ? 's' : ''} &middot; {o.paymentMethod}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                              {fmt(o.total)}
                            </p>
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              padding: '1px 6px', borderRadius: 6,
                              background: o.status === 'PAID' ? '#D1FAE5' : '#FEE2E2',
                              color: o.status === 'PAID' ? '#065F46' : '#991B1B',
                            }}>
                              {o.status === 'PAID' ? 'Payé' : o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Mettre sur compte toggle ────────────── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#f8fafc', borderRadius: 12,
                  border: '1px solid #f1f5f9',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      Mettre sur compte
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                      Autoriser les achats à crédit
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelected(prev => prev ? { ...prev, onTab: !prev.onTab } : prev)
                      toast.success(selected.onTab ? 'Compte désactivé' : 'Compte activé')
                    }}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none',
                      background: selected.onTab ? '#7C3AED' : '#cbd5e1',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <motion.div
                      animate={{ x: selected.onTab ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: 2, left: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    />
                  </button>
                </div>

                {/* ── Action Buttons ──────────────────────── */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => toast.success('Email ouvert dans votre client de messagerie')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                      cursor: 'pointer',
                    }}
                  >
                    <Mail size={14} /> Envoyer un email
                  </button>
                  <button
                    onClick={() => toast.success('SMS envoyé')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
                      cursor: 'pointer',
                    }}
                  >
                    <MessageSquare size={14} /> Envoyer un SMS
                  </button>
                </div>

                {/* ── Notes ───────────────────────────────── */}
                {selected.notes && (
                  <div style={{
                    padding: '12px 14px', background: '#FFFBEB', borderRadius: 10,
                    border: '1px solid #FDE68A',
                  }}>
                    <p style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      color: '#92400E', letterSpacing: '0.06em', margin: '0 0 4px',
                    }}>
                      Notes
                    </p>
                    <p style={{ fontSize: 13, color: '#78350F', margin: 0 }}>
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          NEW CUSTOMER MODAL — with OAuth UI
         ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNew && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={() => setShowNew(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: '#fff', borderRadius: 20, width: 520,
                  maxHeight: '90vh', overflowY: 'auto',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
              >
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Nouveau client
                    </h2>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                      Inscription manuelle ou via un compte social
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNew(false)}
                    style={{
                      padding: 6, borderRadius: 8, border: 'none',
                      background: '#f1f5f9', cursor: 'pointer',
                    }}
                  >
                    <X size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>

                <div style={{ padding: 24 }}>
                  {/* ── OAuth Buttons ─────────────────────── */}
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>
                      Inscription rapide
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {/* Google Button */}
                      <button
                        onClick={() => toast('Fonctionnalité à venir', { icon: '🔜' })}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 0', borderRadius: 10,
                          background: '#fff', color: '#1e293b',
                          border: '1.5px solid #e2e8f0', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#DB4437'; e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}
                      >
                        {/* Google G icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        S&apos;inscrire avec Google
                      </button>

                      {/* Apple Button */}
                      <button
                        onClick={() => toast('Fonctionnalité à venir', { icon: '🔜' })}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 0', borderRadius: 10,
                          background: '#000', color: '#fff',
                          border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                      >
                        {/* Apple icon */}
                        <svg width="15" height="18" viewBox="0 0 15 18" fill="white">
                          <path d="M14.94 13.42c-.35.82-.52 1.18-.97 1.91-.63.99-1.52 2.24-2.62 2.25-1.23.01-1.54-.8-3.21-.79-1.67.01-2.01.8-3.24.79-1.1-.01-1.94-1.13-2.57-2.12C.76 13.02.2 10.21 1.04 8.31c.6-1.35 1.67-2.2 2.83-2.2 1.05 0 1.72.81 2.59.81.84 0 1.36-.81 2.58-.81.97 0 1.92.53 2.52 1.44-2.22 1.22-1.86 4.38.38 5.22zM10.11.63C9.4 1.48 8.3 2.13 7.22 2.05 7.06.93 7.56.01 8.23-.01c.97-.03 1.55.64 1.88.64z"/>
                        </svg>
                        S&apos;inscrire avec Apple
                      </button>
                    </div>
                  </div>

                  {/* ── Divider ───────────────────────────── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                  }}>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>ou inscription manuelle</span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  </div>

                  {/* ── Manual Form ───────────────────────── */}
                  <form onSubmit={handleNewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          Prénom *
                        </label>
                        <input
                          value={newForm.firstName}
                          onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))}
                          placeholder="Jean"
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 8,
                            border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                            color: '#1e293b', background: '#fff',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          Nom *
                        </label>
                        <input
                          value={newForm.lastName}
                          onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))}
                          placeholder="Dupont"
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 8,
                            border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                            color: '#1e293b', background: '#fff',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newForm.email}
                        onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="jean.dupont@email.com"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                          color: '#1e293b', background: '#fff',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Téléphone mobile
                      </label>
                      <input
                        value={newForm.phone}
                        onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+352 621 000 000"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                          color: '#1e293b', background: '#fff',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Adresse
                      </label>
                      <input
                        value={newForm.address}
                        onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="12 rue de la Gare"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                          color: '#1e293b', background: '#fff',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          Code postal
                        </label>
                        <input
                          value={newForm.postalCode}
                          onChange={e => setNewForm(f => ({ ...f, postalCode: e.target.value }))}
                          placeholder="1616"
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 8,
                            border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                            color: '#1e293b', background: '#fff',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          Ville
                        </label>
                        <input
                          value={newForm.city}
                          onChange={e => setNewForm(f => ({ ...f, city: e.target.value }))}
                          placeholder="Luxembourg-Ville"
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: 8,
                            border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                            color: '#1e293b', background: '#fff',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Date de naissance
                      </label>
                      <input
                        type="date"
                        value={newForm.birthDate}
                        onChange={e => setNewForm(f => ({ ...f, birthDate: e.target.value }))}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                          color: '#1e293b', background: '#fff',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Notes
                      </label>
                      <textarea
                        value={newForm.notes}
                        onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Préférences, allergies, remarques..."
                        rows={2}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: 8,
                          border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit',
                          color: '#1e293b', background: '#fff',
                        }}
                      />
                    </div>

                    {/* ── Marketing Consent ───────────────── */}
                    <label style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', background: '#f8fafc', borderRadius: 10,
                      border: '1px solid #f1f5f9', cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={newForm.marketingConsent}
                        onChange={e => setNewForm(f => ({ ...f, marketingConsent: e.target.checked }))}
                        style={{
                          width: 16, height: 16, marginTop: 1, accentColor: '#7C3AED',
                          cursor: 'pointer',
                        }}
                      />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0 }}>
                          Consentement marketing
                        </p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                          J&apos;accepte de recevoir des offres et promotions
                        </p>
                      </div>
                    </label>

                    {/* ── Form Actions ────────────────────── */}
                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setShowNew(false)}
                        style={{
                          flex: 1, padding: '11px 0', borderRadius: 10,
                          background: '#fff', color: '#475569',
                          border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        style={{
                          flex: 1, padding: '11px 0', borderRadius: 10,
                          background: '#7C3AED', color: '#fff',
                          border: 'none', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Créer le client
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
