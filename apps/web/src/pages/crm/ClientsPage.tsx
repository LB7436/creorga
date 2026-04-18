import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useRechargeWallet,
} from '@/hooks/api/useCustomers'
import {
  Plus, Search, X, User, Star, Wallet,
  ShoppingBag, ChevronRight, ChevronDown, ChevronUp,
  Users, Mail, Phone, MapPin, Calendar, Tag,
  Download, MessageSquare, CreditCard, Award,
  ArrowUpDown, BarChart3, Clock, Heart,
  Shield, AlertTriangle, Cake, Link2, TrendingDown,
  Instagram, Facebook, Utensils, MessageCircle, Trash2,
  Smile, FileText, Repeat
} from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

/* ── helpers ───────────────────────────────────────────────── */
const fmt = (v: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(v)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-LU') : '\—'

/* ── types ─────────────────────────────────────────────────── */
interface Order {
  id: string
  createdAt: string
  total: number
  itemsCount: number
  status: string
  paymentMethod: string
}
interface TimelineEntry {
  id: string
  date: string
  type: 'VISIT' | 'EMAIL' | 'EVENT' | 'COMPLAINT' | 'SMS' | 'RESERVATION'
  label: string
  detail?: string
}
interface Complaint {
  id: string
  date: string
  subject: string
  status: 'OPEN' | 'RESOLVED' | 'PENDING'
  resolution?: string
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
  anniversaryDate?: string
  firstVisit?: string
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
  emailOptIn: boolean
  smsOptIn: boolean
  onTab: boolean
  preferredTable?: string
  dietary: string[]
  allergens: string[]
  nps?: number
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  clv: number
  instagram?: string
  facebook?: string
  linkedMembers: string[]
  complaints: Complaint[]
  timeline: TimelineEntry[]
  orders: Order[]
}

/* ── mock data ─────────────────────────────────────────────── */
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1', firstName: 'Marc', lastName: 'Schmit', email: 'marc.schmit@pt.lu',
    phone: '+352 621 123 456', address: '12 rue de la Gare', city: 'Luxembourg-Ville', postalCode: '1616',
    birthDate: '1985-03-15', anniversaryDate: '2015-06-20', firstVisit: '2024-06-10', notes: 'Pr\éf\ère la terrasse',
    loyaltyPoints: 720, loyaltyTier: 'Gold', walletBalance: 45.00,
    totalSpent: 2340.50, visitCount: 87, avgBasket: 26.90,
    lastVisit: '2026-04-14T19:30:00', createdAt: '2024-06-10T10:00:00',
    tags: ['Client fid\èle', 'VIP'], marketingConsent: true, emailOptIn: true, smsOptIn: true, onTab: false,
    preferredTable: 'Table 12 - Terrasse', dietary: ['V\ég\étarien'], allergens: ['Gluten'],
    nps: 9, churnRisk: 'LOW', clv: 4680, instagram: '@marcschmit',
    linkedMembers: ['2'],
    complaints: [], timeline: [
      { id: 't1', date: '2026-04-14T19:30:00', type: 'VISIT', label: 'Visite', detail: 'Table 12, 3 personnes, 34.50 \€' },
      { id: 't2', date: '2026-04-10T10:00:00', type: 'EMAIL', label: 'Email ouvert', detail: 'Newsletter Avril' },
      { id: 't3', date: '2026-04-05T20:00:00', type: 'EVENT', label: '\Év\énement', detail: 'Soir\ée d\égustation vin' },
      { id: 't4', date: '2026-03-28T13:00:00', type: 'VISIT', label: 'Visite', detail: 'D\éjeuner, 2 personnes' },
      { id: 't5', date: '2026-03-20T19:45:00', type: 'RESERVATION', label: 'R\éservation', detail: 'Confirm\ée via SMS' },
    ],
    orders: [
      { id: 'o1', createdAt: '2026-04-14T19:30:00', total: 34.50, itemsCount: 3, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o2', createdAt: '2026-04-10T12:15:00', total: 22.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
      { id: 'o3', createdAt: '2026-04-05T20:00:00', total: 45.80, itemsCount: 4, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o4', createdAt: '2026-03-28T13:00:00', total: 18.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o5', createdAt: '2026-03-20T19:45:00', total: 29.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '2', firstName: 'L\éa', lastName: 'Muller', email: 'lea.muller@education.lu',
    phone: '+352 691 234 567', address: '5 avenue Monterey', city: 'Luxembourg-Ville', postalCode: '2163',
    birthDate: '1992-07-22', firstVisit: '2025-01-15',
    loyaltyPoints: 340, loyaltyTier: 'Silver', walletBalance: 20.00,
    totalSpent: 890.00, visitCount: 34, avgBasket: 26.18,
    lastVisit: '2026-04-12T12:00:00', createdAt: '2025-01-15T14:00:00',
    tags: ['Client fid\èle'], marketingConsent: true, emailOptIn: true, smsOptIn: false, onTab: false,
    dietary: [], allergens: [], nps: 8, churnRisk: 'LOW', clv: 1780,
    linkedMembers: ['1'],
    complaints: [], timeline: [
      { id: 't6', date: '2026-04-12T12:00:00', type: 'VISIT', label: 'Visite' },
      { id: 't7', date: '2026-04-08T13:30:00', type: 'VISIT', label: 'Visite' },
    ],
    orders: [
      { id: 'o6', createdAt: '2026-04-12T12:00:00', total: 15.50, itemsCount: 1, status: 'PAID', paymentMethod: 'Carte' },
      { id: 'o7', createdAt: '2026-04-08T13:30:00', total: 28.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '3', firstName: 'Tom', lastName: 'Reuter', email: 'tom.reuter@gmail.com',
    phone: '+352 661 345 678', address: '28 rue du Foss\é', city: 'Esch-sur-Alzette', postalCode: '4123',
    birthDate: '1990-11-03', firstVisit: '2024-09-20', notes: 'Allergique aux noix',
    loyaltyPoints: 580, loyaltyTier: 'Gold', walletBalance: 75.00,
    totalSpent: 1560.00, visitCount: 62, avgBasket: 25.16,
    lastVisit: '2026-04-13T20:15:00', createdAt: '2024-09-20T09:00:00',
    tags: ['VIP', 'Allergique'], marketingConsent: false, emailOptIn: false, smsOptIn: true, onTab: true,
    preferredTable: 'Table 8 - Coin fen\être', dietary: [], allergens: ['Noix', 'Arachides'],
    nps: 10, churnRisk: 'LOW', clv: 3120, instagram: '@tomreuter',
    linkedMembers: [],
    complaints: [],
    timeline: [{ id: 't8', date: '2026-04-13T20:15:00', type: 'VISIT', label: 'Visite VIP' }],
    orders: [
      { id: 'o9', createdAt: '2026-04-13T20:15:00', total: 52.00, itemsCount: 4, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o10', createdAt: '2026-04-09T12:45:00', total: 19.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Cash' },
    ]
  },
  {
    id: '4', firstName: 'Sophie', lastName: 'Weber', email: 'sophie.w@outlook.com',
    phone: '+352 621 456 789', address: '3 place Guillaume II', city: 'Luxembourg-Ville', postalCode: '1648',
    birthDate: '1988-01-30', firstVisit: '2025-11-05',
    loyaltyPoints: 120, loyaltyTier: 'Bronze', walletBalance: 10.00,
    totalSpent: 320.00, visitCount: 12, avgBasket: 26.67,
    lastVisit: '2026-04-01T18:00:00', createdAt: '2025-11-05T11:00:00',
    tags: ['Nouveau', 'V\ég\étarien'], marketingConsent: true, emailOptIn: true, smsOptIn: true, onTab: false,
    dietary: ['V\ég\étarien', 'Kosher'], allergens: [], nps: 7, churnRisk: 'MEDIUM', clv: 640,
    linkedMembers: [],
    complaints: [{ id: 'c1', date: '2026-03-10', subject: 'Attente trop longue', status: 'RESOLVED', resolution: 'Excuses + caf\é offert' }],
    timeline: [{ id: 't9', date: '2026-04-01T18:00:00', type: 'VISIT', label: 'Visite' }],
    orders: [
      { id: 'o11', createdAt: '2026-04-01T18:00:00', total: 24.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '5', firstName: 'Pierre', lastName: 'Hoffmann', email: 'p.hoffmann@post.lu',
    phone: '+352 691 567 890', address: '17 rue de Strasbourg', city: 'Luxembourg-Ville', postalCode: '2561',
    birthDate: '1975-05-18', anniversaryDate: '2000-09-14', firstVisit: '2023-03-01',
    loyaltyPoints: 910, loyaltyTier: 'Gold', walletBalance: 120.00,
    totalSpent: 4200.00, visitCount: 156, avgBasket: 26.92,
    lastVisit: '2026-04-14T12:30:00', createdAt: '2023-03-01T08:00:00',
    tags: ['VIP', 'Grand \év\énement'], marketingConsent: true, emailOptIn: true, smsOptIn: true, onTab: false,
    preferredTable: 'Table 1 - Priv\ée', dietary: [], allergens: [],
    nps: 10, churnRisk: 'LOW', clv: 8400, facebook: 'pierre.hoffmann',
    linkedMembers: [],
    complaints: [],
    timeline: [{ id: 't10', date: '2026-04-14T12:30:00', type: 'VISIT', label: 'Visite r\éguli\ère' }],
    orders: [
      { id: 'o13', createdAt: '2026-04-14T12:30:00', total: 38.00, itemsCount: 3, status: 'PAID', paymentMethod: 'Wallet' },
      { id: 'o14', createdAt: '2026-04-12T19:00:00', total: 55.00, itemsCount: 4, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '6', firstName: 'Julie', lastName: 'Kieffer', email: 'julie.kieffer@vo.lu',
    phone: '+352 661 678 901', address: '9 boulevard Royal', city: 'Luxembourg-Ville', postalCode: '2449',
    birthDate: '1995-09-12', firstVisit: '2026-01-10', notes: 'Anniversaire en septembre',
    loyaltyPoints: 45, loyaltyTier: 'Bronze', walletBalance: 0,
    totalSpent: 85.00, visitCount: 3, avgBasket: 28.33,
    lastVisit: '2026-02-20T19:00:00', createdAt: '2026-01-10T16:00:00',
    tags: ['Nouveau'], marketingConsent: false, emailOptIn: false, smsOptIn: false, onTab: false,
    dietary: ['V\égan'], allergens: [], nps: 6, churnRisk: 'HIGH', clv: 170,
    linkedMembers: [],
    complaints: [{ id: 'c2', date: '2026-02-22', subject: 'Plat v\égan indisponible', status: 'OPEN' }],
    timeline: [{ id: 't11', date: '2026-02-20T19:00:00', type: 'VISIT', label: 'Visite' }],
    orders: [
      { id: 'o18', createdAt: '2026-02-20T19:00:00', total: 32.00, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '7', firstName: 'Lucas', lastName: 'Theis', email: 'lucas.theis@pt.lu',
    phone: '+352 621 789 012', address: '42 rue de Hollerich', city: 'Luxembourg-Ville', postalCode: '1741',
    birthDate: '1982-12-05', firstVisit: '2025-05-22',
    loyaltyPoints: 260, loyaltyTier: 'Silver', walletBalance: 35.00,
    totalSpent: 680.00, visitCount: 28, avgBasket: 24.29,
    lastVisit: '2026-04-11T20:00:00', createdAt: '2025-05-22T10:00:00',
    tags: ['Client fid\èle'], marketingConsent: true, emailOptIn: true, smsOptIn: false, onTab: true,
    dietary: [], allergens: ['Lactose'], nps: 8, churnRisk: 'LOW', clv: 1360,
    linkedMembers: [],
    complaints: [], timeline: [{ id: 't12', date: '2026-04-11T20:00:00', type: 'VISIT', label: 'Visite' }],
    orders: [
      { id: 'o19', createdAt: '2026-04-11T20:00:00', total: 27.50, itemsCount: 2, status: 'PAID', paymentMethod: 'Carte' },
    ]
  },
  {
    id: '8', firstName: 'Anna', lastName: 'Braun', email: 'anna.braun@gmail.com',
    phone: '+352 691 890 123', address: '6 rue de Bonnevoie', city: 'Luxembourg-Ville', postalCode: '1260',
    birthDate: '1998-04-25', firstVisit: '2026-04-14', notes: '\Étudiante, r\éductions possibles',
    loyaltyPoints: 0, loyaltyTier: 'Bronze', walletBalance: 0,
    totalSpent: 0, visitCount: 0, avgBasket: 0,
    lastVisit: '', createdAt: '2026-04-14T15:00:00',
    tags: ['Nouveau'], marketingConsent: true, emailOptIn: true, smsOptIn: true, onTab: false,
    dietary: ['Halal'], allergens: [], churnRisk: 'HIGH', clv: 0,
    linkedMembers: [],
    complaints: [], timeline: [], orders: []
  },
]

/* ── configs ───────────────────────────────────────────────── */
const TIER_CONFIG = {
  Bronze: { color: '#CD7F32', bg: '#FDF2E6', border: '#E8C496', next: 'Silver', pointsNeeded: 200 },
  Silver: { color: '#94A3B8', bg: '#F0F4F8', border: '#CBD5E1', next: 'Gold', pointsNeeded: 500 },
  Gold:   { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', next: null, pointsNeeded: null },
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'Client fid\èle':       { bg: '#DBEAFE', text: '#1E40AF' },
  'VIP':                    { bg: '#FEF3C7', text: '#92400E' },
  'Nouveau':                { bg: '#D1FAE5', text: '#065F46' },
  'Allergique':             { bg: '#FEE2E2', text: '#991B1B' },
  'V\ég\étarien':    { bg: '#DCFCE7', text: '#166534' },
  'Grand \év\énement': { bg: '#EDE9FE', text: '#6B21A8' },
  'Difficile':              { bg: '#FFE4E6', text: '#9F1239' },
}
const DIETARY_COLORS: Record<string, string> = {
  'V\ég\étarien': '#16a34a',
  'V\égan': '#15803d',
  'Kosher': '#2563eb',
  'Halal': '#0891b2',
  'Sans gluten': '#d97706',
}
const CHURN_CONFIG = {
  LOW:    { label: 'Faible', color: '#10b981', bg: '#ecfdf5' },
  MEDIUM: { label: 'Moyen',  color: '#f59e0b', bg: '#fffbeb' },
  HIGH:   { label: '\Élev\é', color: '#ef4444', bg: '#fef2f2' },
}

const ALL_TAGS = ['Client fid\èle', 'VIP', 'Nouveau', 'Allergique', 'V\ég\étarien', 'Grand \év\énement', 'Difficile']
const DIETARY_OPTIONS = ['V\ég\étarien', 'V\égan', 'Kosher', 'Halal', 'Sans gluten']
const ALLERGEN_OPTIONS = ['Gluten', 'Lactose', 'Noix', 'Arachides', 'Crustac\és', 'Oeufs', 'Soja', 'Poisson']

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#4F46E5']

type SortKey = 'name' | 'points' | 'lastVisit' | 'totalSpent' | 'clv' | 'nps'
type SortDir = 'asc' | 'desc'
type FilterChip = 'all' | 'active' | 'inactive' | 'vip' | 'new' | 'churn'
type PanelTab = 'overview' | 'timeline' | 'prefs' | 'complaints' | 'gdpr'

const FILTER_CHIPS: { key: FilterChip; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'inactive', label: 'Inactifs (30j+)' },
  { key: 'vip', label: 'VIP' },
  { key: 'new', label: 'Nouveaux' },
  { key: 'churn', label: 'Risque \élev\é' },
]

const PAGE_SIZE = 5

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('overview')
  const [showNew, setShowNew] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all')
  const [page, setPage] = useState(0)
  const [gdprConfirm, setGdprConfirm] = useState(false)

  const [newForm, setNewForm] = useState({
    firstName: '', lastName: '', email: '', phone: '+352 ',
    address: '', postalCode: '', city: '', birthDate: '', notes: '',
    marketingConsent: false,
  })

  // Real API with mock fallback (keeps the rich UI alive if backend returns nothing yet)
  const { data: apiCustomers } = useCustomers()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const rechargeWallet = useRechargeWallet()

  const customers: Customer[] = useMemo(() => {
    if (apiCustomers && apiCustomers.length > 0) {
      // Merge API data with mock shape to avoid UI crashes on missing fields.
      return apiCustomers.map((c, i) => {
        const mock = MOCK_CUSTOMERS[i % MOCK_CUSTOMERS.length]
        return {
          ...mock,
          ...(c as Partial<Customer>),
          id: c.id,
          firstName: c.firstName ?? mock.firstName,
          lastName: c.lastName ?? mock.lastName,
          email: c.email ?? mock.email,
          phone: c.phone ?? mock.phone,
          loyaltyPoints: c.loyaltyPoints ?? mock.loyaltyPoints,
          walletBalance: c.walletBalance ?? mock.walletBalance,
          totalSpent: c.totalSpent ?? mock.totalSpent,
          visitCount: c.visits ?? mock.visitCount,
          lastVisit: c.lastVisit ?? mock.lastVisit,
          tags: c.tags ?? mock.tags,
        } as Customer
      })
    }
    return MOCK_CUSTOMERS
  }, [apiCustomers])

  function handleRechargeWallet(id: string, amount: number) {
    if (!amount || amount <= 0) {
      toast.error('Montant invalide')
      return
    }
    rechargeWallet.mutate({ id, amount })
  }

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

    if (activeFilter === 'active') {
      list = list.filter(c => c.lastVisit && new Date(c.lastVisit) >= thirtyDaysAgo)
    } else if (activeFilter === 'inactive') {
      list = list.filter(c => !c.lastVisit || new Date(c.lastVisit) < thirtyDaysAgo)
    } else if (activeFilter === 'vip') {
      list = list.filter(c => c.tags.includes('VIP'))
    } else if (activeFilter === 'new') {
      list = list.filter(c => c.tags.includes('Nouveau'))
    } else if (activeFilter === 'churn') {
      list = list.filter(c => c.churnRisk === 'HIGH')
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      else if (sortKey === 'points') cmp = a.loyaltyPoints - b.loyaltyPoints
      else if (sortKey === 'lastVisit') cmp = (a.lastVisit || '').localeCompare(b.lastVisit || '')
      else if (sortKey === 'totalSpent') cmp = a.totalSpent - b.totalSpent
      else if (sortKey === 'clv') cmp = a.clv - b.clv
      else if (sortKey === 'nps') cmp = (a.nps || 0) - (b.nps || 0)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [customers, search, activeFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: 4 }} />
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: 4 }} />
      : <ChevronDown size={12} style={{ marginLeft: 4 }} />
  }

  function handleExportCSV() {
    const header = 'Pr\énom,Nom,Email,T\él\éphone,Points,Tier,Solde,Total,Visites,CLV,NPS,Churn'
    const rows = filtered.map(c =>
      `${c.firstName},${c.lastName},${c.email},${c.phone},${c.loyaltyPoints},${c.loyaltyTier},${c.walletBalance},${c.totalSpent},${c.visitCount},${c.clv},${c.nps || ''},${c.churnRisk}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients_creorga_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV t\él\écharg\é')
  }

  function handleGdprExport(c: Customer) {
    const data = JSON.stringify(c, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rgpd_${c.firstName}_${c.lastName}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Donn\ées client export\ées (RGPD)')
  }

  function handleGdprDelete() {
    toast.success(`Donn\ées de ${selected?.firstName} ${selected?.lastName} anonymis\ées`)
    setGdprConfirm(false)
    setSelected(null)
  }

  function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.firstName || !newForm.lastName || !newForm.email) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    if (selected) {
      // Edit mode — if `selected` is bound to the form elsewhere.
      updateCustomer.mutate({ id: selected.id, data: newForm })
    } else {
      createCustomer.mutate(newForm)
    }
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

  function openPanel(c: Customer) {
    setSelected(c); setPanelTab('overview')
  }

  // CLV trend mock (use selected spending to generate a sensible curve)
  const clvTrend = useMemo(() => {
    if (!selected) return []
    const base = selected.totalSpent / 8
    return [
      { mois: 'S-5', clv: base * 4 },
      { mois: 'S-4', clv: base * 4.8 },
      { mois: 'S-3', clv: base * 5.4 },
      { mois: 'S-2', clv: base * 6.2 },
      { mois: 'S-1', clv: base * 7 },
      { mois: 'Now', clv: selected.clv },
    ]
  }, [selected])

  const totalClients = customers.length
  const totalCLV = customers.reduce((s, c) => s + c.clv, 0)
  const avgNPS = customers.filter(c => c.nps).reduce((s, c) => s + (c.nps || 0), 0) / customers.filter(c => c.nps).length
  const churnHigh = customers.filter(c => c.churnRisk === 'HIGH').length

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>Clients</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Base clients, fid\élit\é, CLV & conformit\é RGPD &mdash; {customers.length} clients
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#fff', color: '#475569',
              borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: '1px solid #e2e8f0', cursor: 'pointer',
            }}>
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowNew(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', background: '#7C3AED', color: '#fff',
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>
            <Plus size={15} /> Nouveau client
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Clients actifs', value: String(totalClients), icon: Users, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'CLV totale', value: fmt(totalCLV), icon: CreditCard, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'NPS moyen', value: avgNPS.toFixed(1), icon: Smile, color: '#059669', bg: '#D1FAE5' },
          { label: 'Risque de perte', value: `${churnHigh}`, icon: TrendingDown, color: '#DC2626', bg: '#FEE2E2' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Rechercher par nom, email ou t\él\éphone..."
            style={{
              width: '100%', padding: '10px 16px 10px 38px',
              borderRadius: 12, border: '1px solid #e2e8f0',
              fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b',
              boxSizing: 'border-box',
            }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTER_CHIPS.map(chip => (
          <button key={chip.key}
            onClick={() => { setActiveFilter(chip.key); setPage(0) }}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: activeFilter === chip.key ? '1.5px solid #7C3AED' : '1px solid #e2e8f0',
              background: activeFilter === chip.key ? '#F3E8FF' : '#fff',
              color: activeFilter === chip.key ? '#7C3AED' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {chip.label}
            {chip.key !== 'all' && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {chip.key === 'active' ? customers.filter(c => c.lastVisit && new Date(c.lastVisit) >= thirtyDaysAgo).length
                  : chip.key === 'inactive' ? customers.filter(c => !c.lastVisit || new Date(c.lastVisit) < thirtyDaysAgo).length
                  : chip.key === 'vip' ? customers.filter(c => c.tags.includes('VIP')).length
                  : chip.key === 'new' ? customers.filter(c => c.tags.includes('Nouveau')).length
                  : customers.filter(c => c.churnRisk === 'HIGH').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8' }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontWeight: 500, margin: 0 }}>Aucun client trouv\é</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th onClick={() => handleSort('name')} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>Client <SortIcon col="name" /></span>
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Contact
                  </th>
                  <th onClick={() => handleSort('points')} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Fid\élit\é <SortIcon col="points" /></span>
                  </th>
                  <th onClick={() => handleSort('clv')} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>CLV <SortIcon col="clv" /></span>
                  </th>
                  <th onClick={() => handleSort('nps')} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>NPS <SortIcon col="nps" /></span>
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Risque
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tags
                  </th>
                  <th style={{ padding: '12px 16px', width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, idx) => {
                  const tierCfg = TIER_CONFIG[c.loyaltyTier]
                  const churnCfg = CHURN_CONFIG[c.churnRisk]
                  const globalIdx = customers.indexOf(c)
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => openPanel(c)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(globalIdx), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{c.firstName} {c.lastName}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                              {c.linkedMembers.length > 0 && <Link2 size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />}
                              {c.visitCount} visite{c.visitCount > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>{c.email}</p>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>{c.phone}</p>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: tierCfg.bg, color: tierCfg.color, fontSize: 11, fontWeight: 600, border: `1px solid ${tierCfg.border}` }}>
                          <Star size={10} /> {c.loyaltyPoints} \· {c.loyaltyTier}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                        {fmt(c.clv)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {c.nps != null ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: c.nps >= 9 ? '#D1FAE5' : c.nps >= 7 ? '#FEF3C7' : '#FEE2E2',
                            color: c.nps >= 9 ? '#065F46' : c.nps >= 7 ? '#92400E' : '#991B1B',
                          }}>{c.nps}/10</span>
                        ) : <span style={{ color: '#cbd5e1' }}>\—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: churnCfg.bg, color: churnCfg.color }}>
                          {churnCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {c.tags.slice(0, 2).map(tag => {
                            const tc = TAG_COLORS[tag] || { bg: '#F1F5F9', text: '#475569' }
                            return (
                              <span key={tag} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: tc.bg, color: tc.text }}>{tag}</span>
                            )
                          })}
                          {c.tags.length > 2 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{c.tags.length - 2}</span>}
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

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                  {filtered.length} client{filtered.length > 1 ? 's' : ''} \· Page {page + 1}/{totalPages}
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                    Pr\éc\édent
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================== SIDE PANEL ================== */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 40 }}
              onClick={() => setSelected(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 520, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 50, overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: getAvatarColor(customers.indexOf(selected)), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                      {selected.firstName[0]}{selected.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 17, color: '#1e293b', margin: 0 }}>
                        {selected.firstName} {selected.lastName}
                      </p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
                        Client depuis {fmtDate(selected.createdAt)}
                      </p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {selected.tags.map(tag => {
                          const tc = TAG_COLORS[tag] || { bg: '#F1F5F9', text: '#475569' }
                          return <span key={tag} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: tc.bg, color: tc.text }}>{tag}</span>
                        })}
                        {selected.onTab && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#FEE2E2', color: '#991B1B' }}>Sur compte</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer' }}>
                    <X size={16} style={{ color: '#64748b' }} />
                  </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f1f5f9', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
                  {([
                    ['overview', 'Vue d\'ensemble'],
                    ['timeline', 'Timeline'],
                    ['prefs', 'Pr\éf\érences'],
                    ['complaints', 'R\éclamations'],
                    ['gdpr', 'RGPD'],
                  ] as [PanelTab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setPanelTab(key)}
                      style={{
                        padding: '10px 12px', fontSize: 12, fontWeight: 600,
                        background: 'transparent', border: 'none',
                        color: panelTab === key ? '#7C3AED' : '#64748b',
                        borderBottom: panelTab === key ? '2px solid #7C3AED' : '2px solid transparent',
                        cursor: 'pointer', marginBottom: -1,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {panelTab === 'overview' && (
                  <>
                    {/* Contact */}
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={11} /> Coordonn\ées
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Mail size={13} style={{ color: '#94a3b8' }} /><span style={{ fontSize: 13, color: '#1e293b' }}>{selected.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Phone size={13} style={{ color: '#94a3b8' }} /><span style={{ fontSize: 13, color: '#1e293b' }}>{selected.phone}</span>
                        </div>
                        {selected.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <MapPin size={13} style={{ color: '#94a3b8', marginTop: 2 }} />
                            <span style={{ fontSize: 13, color: '#1e293b' }}>{selected.address}, {selected.postalCode} {selected.city}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Important dates */}
                    <div style={{ background: '#fff7ed', borderRadius: 14, padding: 16, border: '1px solid #fed7aa' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9a3412', letterSpacing: '0.06em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Cake size={11} /> Dates importantes
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {selected.birthDate && (
                          <div>
                            <div style={{ fontSize: 10, color: '#9a3412' }}>Anniversaire</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12' }}>{fmtDate(selected.birthDate)}</div>
                          </div>
                        )}
                        {selected.anniversaryDate && (
                          <div>
                            <div style={{ fontSize: 10, color: '#9a3412' }}>Anniv. mariage</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12' }}>{fmtDate(selected.anniversaryDate)}</div>
                          </div>
                        )}
                        {selected.firstVisit && (
                          <div>
                            <div style={{ fontSize: 10, color: '#9a3412' }}>Premi\ère visite</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7c2d12' }}>{fmtDate(selected.firstVisit)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CLV + Churn */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
                      <div style={{ background: '#eef2ff', borderRadius: 14, padding: 16, border: '1px solid #c7d2fe' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#4338ca', letterSpacing: '0.06em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CreditCard size={11} /> CLV
                        </p>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#3730a3' }}>{fmt(selected.clv)}</div>
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={clvTrend}>
                            <Line type="monotone" dataKey="clv" stroke="#4338ca" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ background: CHURN_CONFIG[selected.churnRisk].bg, borderRadius: 14, padding: 16, border: `1px solid ${CHURN_CONFIG[selected.churnRisk].color}40` }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: CHURN_CONFIG[selected.churnRisk].color, letterSpacing: '0.06em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TrendingDown size={11} /> Risque perte
                        </p>
                        <div style={{ fontSize: 22, fontWeight: 800, color: CHURN_CONFIG[selected.churnRisk].color }}>
                          {CHURN_CONFIG[selected.churnRisk].label}
                        </div>
                        <div style={{ fontSize: 10, color: CHURN_CONFIG[selected.churnRisk].color, opacity: 0.7, marginTop: 2 }}>
                          Score ML mock
                        </div>
                      </div>
                    </div>

                    {/* NPS */}
                    {selected.nps != null && (
                      <div style={{ background: '#f0fdf4', borderRadius: 14, padding: 16, border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#15803d', letterSpacing: '0.06em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Smile size={11} /> Net Promoter Score
                            </p>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 4 }}>{selected.nps}/10</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                            {selected.nps >= 9 ? 'Promoteur' : selected.nps >= 7 ? 'Passif' : 'D\étracteur'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Total d\épens\é', value: fmt(selected.totalSpent), icon: CreditCard, color: '#7C3AED' },
                        { label: 'Visites', value: String(selected.visitCount), icon: BarChart3, color: '#2563EB' },
                        { label: 'Panier moyen', value: fmt(selected.avgBasket), icon: ShoppingBag, color: '#D97706' },
                        { label: 'Derni\ère visite', value: selected.lastVisit ? fmtDate(selected.lastVisit) : '\—', icon: Clock, color: '#059669' },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <stat.icon size={11} style={{ color: stat.color }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</span>
                          </div>
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Linked family */}
                    {selected.linkedMembers.length > 0 && (
                      <div style={{ background: '#faf5ff', borderRadius: 14, padding: 16, border: '1px solid #e9d5ff' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#7c3aed', letterSpacing: '0.06em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link2 size={11} /> Membres li\és
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {selected.linkedMembers.map(id => {
                            const m = customers.find(c => c.id === id)
                            if (!m) return null
                            return (
                              <span key={id} style={{ padding: '4px 10px', borderRadius: 10, background: '#fff', border: '1px solid #e9d5ff', fontSize: 12, color: '#6b21a8', fontWeight: 600 }}>
                                {m.firstName} {m.lastName}
                              </span>
                            )
                          })}
                          <button onClick={() => toast.success('Ouverture de la liaison famille')}
                            style={{ padding: '4px 10px', borderRadius: 10, background: '#f3e8ff', border: '1px dashed #c084fc', fontSize: 11, color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>
                            + Lier
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Social */}
                    {(selected.instagram || selected.facebook) && (
                      <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 8px' }}>R\éseaux sociaux</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {selected.instagram && (
                            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#e1306c', textDecoration: 'none', fontWeight: 600 }}>
                              <Instagram size={12} /> {selected.instagram}
                            </a>
                          )}
                          {selected.facebook && (
                            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1877f2', textDecoration: 'none', fontWeight: 600 }}>
                              <Facebook size={12} /> {selected.facebook}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => toast.success('Email envoy\é')}
                        disabled={!selected.emailOptIn}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, background: selected.emailOptIn ? '#EFF6FF' : '#f1f5f9', color: selected.emailOptIn ? '#2563EB' : '#94a3b8', border: `1px solid ${selected.emailOptIn ? '#BFDBFE' : '#e2e8f0'}`, cursor: selected.emailOptIn ? 'pointer' : 'not-allowed' }}>
                        <Mail size={14} /> Email
                      </button>
                      <button onClick={() => toast.success('SMS envoy\é')}
                        disabled={!selected.smsOptIn}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, background: selected.smsOptIn ? '#F0FDF4' : '#f1f5f9', color: selected.smsOptIn ? '#16A34A' : '#94a3b8', border: `1px solid ${selected.smsOptIn ? '#BBF7D0' : '#e2e8f0'}`, cursor: selected.smsOptIn ? 'pointer' : 'not-allowed' }}>
                        <MessageSquare size={14} /> SMS
                      </button>
                    </div>
                  </>
                )}

                {panelTab === 'timeline' && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 14px' }}>
                      Interactions chronologiques
                    </p>
                    {selected.timeline.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucune interaction</div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: 20 }}>
                        <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 2, background: '#e2e8f0' }} />
                        {selected.timeline.map(e => {
                          const typeConfig = {
                            VISIT: { color: '#7C3AED', icon: Users },
                            EMAIL: { color: '#2563EB', icon: Mail },
                            SMS: { color: '#16A34A', icon: MessageSquare },
                            EVENT: { color: '#D97706', icon: Calendar },
                            RESERVATION: { color: '#0891B2', icon: Calendar },
                            COMPLAINT: { color: '#DC2626', icon: AlertTriangle },
                          }[e.type]
                          return (
                            <div key={e.id} style={{ position: 'relative', paddingBottom: 16 }}>
                              <div style={{ position: 'absolute', left: -20, top: 2, width: 14, height: 14, borderRadius: '50%', background: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <typeConfig.icon size={8} style={{ color: '#fff' }} />
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{e.label}</div>
                              {e.detail && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{e.detail}</div>}
                              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtDate(e.date)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '16px 0 10px' }}>
                      Derni\ères commandes
                    </p>
                    {selected.orders.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Aucune commande</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selected.orders.slice(0, 5).map(o => (
                          <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{fmtDate(o.createdAt)}</p>
                              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{o.itemsCount} article{o.itemsCount > 1 ? 's' : ''} \· {o.paymentMethod}</p>
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{fmt(o.total)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {panelTab === 'prefs' && (
                  <>
                    {/* Preferred table */}
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Heart size={11} /> Table pr\éf\ér\ée
                      </p>
                      <input type="text" defaultValue={selected.preferredTable || ''} placeholder="Ex: Table 12 - Terrasse"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                    </div>

                    {/* Dietary */}
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Utensils size={11} /> R\égime alimentaire
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {DIETARY_OPTIONS.map(d => {
                          const active = selected.dietary.includes(d)
                          const color = DIETARY_COLORS[d] || '#64748b'
                          return (
                            <button key={d}
                              style={{
                                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                border: active ? `1.5px solid ${color}` : '1px solid #e2e8f0',
                                background: active ? `${color}18` : '#fff',
                                color: active ? color : '#64748b', cursor: 'pointer',
                              }}>
                              {d}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Allergens */}
                    <div style={{ background: '#fef2f2', borderRadius: 14, padding: 16, border: '1px solid #fecaca' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.06em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} /> Allerg\ènes \— importants pour la cuisine
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ALLERGEN_OPTIONS.map(a => {
                          const active = selected.allergens.includes(a)
                          return (
                            <button key={a}
                              style={{
                                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                border: active ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                                background: active ? '#fee2e2' : '#fff',
                                color: active ? '#991b1b' : '#64748b', cursor: 'pointer',
                              }}>
                              {a}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Communication prefs */}
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageCircle size={11} /> Pr\éf\érences de communication
                      </p>
                      {[
                        { key: 'emailOptIn', label: 'Email transactionnel', value: selected.emailOptIn, icon: Mail },
                        { key: 'smsOptIn', label: 'SMS', value: selected.smsOptIn, icon: MessageSquare },
                        { key: 'marketingConsent', label: 'Marketing & promotions', value: selected.marketingConsent, icon: Tag },
                      ].map(p => (
                        <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p.icon size={13} style={{ color: '#64748b' }} />
                            <span style={{ fontSize: 13, color: '#1e293b' }}>{p.label}</span>
                          </div>
                          <div style={{
                            width: 40, height: 22, borderRadius: 11,
                            background: p.value ? '#7C3AED' : '#cbd5e1', position: 'relative', cursor: 'pointer',
                          }}>
                            <motion.div animate={{ x: p.value ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Custom tags */}
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag size={11} /> Tags personnalis\és
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ALL_TAGS.map(t => {
                          const active = selected.tags.includes(t)
                          const tc = TAG_COLORS[t] || { bg: '#F1F5F9', text: '#475569' }
                          return (
                            <button key={t}
                              style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                border: active ? `1.5px solid ${tc.text}` : '1px solid #e2e8f0',
                                background: active ? tc.bg : '#fff',
                                color: active ? tc.text : '#64748b', cursor: 'pointer',
                              }}>
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {panelTab === 'complaints' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} /> Historique des r\éclamations
                      </p>
                      <button onClick={() => toast.success('Formulaire r\éclamation ouvert')}
                        style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        + Nouvelle
                      </button>
                    </div>
                    {selected.complaints.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#10b981', fontSize: 13, fontWeight: 600, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                        Aucune r\éclamation \à ce jour
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selected.complaints.map(cm => (
                          <div key={cm.id} style={{ padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{cm.subject}</div>
                              <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                                background: cm.status === 'RESOLVED' ? '#D1FAE5' : cm.status === 'OPEN' ? '#FEE2E2' : '#FEF3C7',
                                color: cm.status === 'RESOLVED' ? '#065F46' : cm.status === 'OPEN' ? '#991B1B' : '#92400E',
                              }}>{cm.status === 'RESOLVED' ? 'R\ésolu' : cm.status === 'OPEN' ? 'Ouvert' : 'En cours'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(cm.date)}</div>
                            {cm.resolution && (
                              <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                                <strong>R\ésolution :</strong> {cm.resolution}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {panelTab === 'gdpr' && (
                  <>
                    <div style={{ background: '#eff6ff', borderRadius: 14, padding: 16, border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Shield size={14} style={{ color: '#2563eb' }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Conformit\é RGPD</div>
                      </div>
                      <p style={{ fontSize: 12, color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
                        Conform\ément au R\èglement G\én\éral sur la Protection des Donn\ées (UE 2016/679), ce client peut exercer ses droits :
                      </p>
                    </div>

                    <button onClick={() => handleGdprExport(selected)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Download size={16} style={{ color: '#2563eb' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Droit \à la portabilit\é</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Exporter toutes les donn\ées au format JSON</div>
                      </div>
                    </button>

                    <button onClick={() => toast.success('Droit de rectification notifi\é')}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={16} style={{ color: '#16a34a' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Droit \à la rectification</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Corriger les informations inexactes</div>
                      </div>
                    </button>

                    <button onClick={() => setGdprConfirm(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={16} style={{ color: '#dc2626' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Droit \à l'oubli</div>
                        <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>Anonymiser les donn\ées personnelles</div>
                      </div>
                    </button>

                    <div style={{ marginTop: 8, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                      <strong>Note :</strong> L'anonymisation conserve les donn\ées comptables (factures, commandes) anonymis\ées, conform\ément \à l'obligation l\égale de conservation de 10 ans au Luxembourg.
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GDPR delete confirm */}
      <AnimatePresence>
        {gdprConfirm && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setGdprConfirm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: 28, width: 420, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={26} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Confirmer l'anonymisation</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '10px 0 20px', lineHeight: 1.5 }}>
                Les donn\ées personnelles de <strong>{selected.firstName} {selected.lastName}</strong> seront d\éfinitivement anonymis\ées. Cette action est irr\éversible.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setGdprConfirm(false)}
                  style={{ flex: 1, padding: '10px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={handleGdprDelete}
                  style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Anonymiser
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New customer modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowNew(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Nouveau client</h2>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Inscription manuelle ou via un compte social</p>
                </div>
                <button onClick={() => setShowNew(false)}
                  style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer' }}>
                  <X size={16} style={{ color: '#64748b' }} />
                </button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Inscription rapide</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => toast('Fonctionnalit\é \à venir')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 10, background: '#fff', color: '#1e293b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button onClick={() => toast('Fonctionnalit\é \à venir')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 10, background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <svg width="15" height="18" viewBox="0 0 15 18" fill="white">
                        <path d="M14.94 13.42c-.35.82-.52 1.18-.97 1.91-.63.99-1.52 2.24-2.62 2.25-1.23.01-1.54-.8-3.21-.79-1.67.01-2.01.8-3.24.79-1.1-.01-1.94-1.13-2.57-2.12C.76 13.02.2 10.21 1.04 8.31c.6-1.35 1.67-2.2 2.83-2.2 1.05 0 1.72.81 2.59.81.84 0 1.36-.81 2.58-.81.97 0 1.92.53 2.52 1.44-2.22 1.22-1.86 4.38.38 5.22zM10.11.63C9.4 1.48 8.3 2.13 7.22 2.05 7.06.93 7.56.01 8.23-.01c.97-.03 1.55.64 1.88.64z"/>
                      </svg>
                      Apple
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>ou inscription manuelle</span>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
                <form onSubmit={handleNewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Pr\énom *</label>
                      <input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nom *</label>
                      <input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email *</label>
                    <input type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="jean.dupont@email.com"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>T\él\éphone mobile</label>
                    <input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="+352 621 000 000"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Date de naissance</label>
                    <input type="date" value={newForm.birthDate} onChange={e => setNewForm(f => ({ ...f, birthDate: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Notes (allergies, pr\éf\érences...)</label>
                    <textarea value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newForm.marketingConsent} onChange={e => setNewForm(f => ({ ...f, marketingConsent: e.target.checked }))}
                      style={{ width: 16, height: 16, marginTop: 1, accentColor: '#7C3AED', cursor: 'pointer' }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0 }}>Consentement marketing (RGPD)</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>J'accepte de recevoir des offres et promotions</p>
                    </div>
                  </label>
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button type="button" onClick={() => setShowNew(false)}
                      style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#fff', color: '#475569', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button type="submit"
                      style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: '#7C3AED', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Cr\éer le client
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
