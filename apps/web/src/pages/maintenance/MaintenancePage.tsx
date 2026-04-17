import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Plus,
  Search,
  Package,
  TrendingUp,
  Clock,
  Euro,
  X,
  Phone,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── palette ── */
const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  cyan: '#0891b2',
  cyanSoft: '#cffafe',
  green: '#10b981',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#ef4444',
  redSoft: '#fee2e2',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
}

type EquipStatus = 'ok' | 'attention' | 'panne'

interface Equipment {
  id: string
  name: string
  category: string
  brand: string
  model: string
  purchaseDate: string
  lastService: string
  nextService: string
  status: EquipStatus
}

interface Contract {
  id: string
  equipmentId: string
  supplier: string
  type: 'annuel' | 'trimestriel' | 'mensuel'
  nextBilling: string
  amount: number
  number: string
}

interface Intervention {
  id: string
  date: string
  equipmentId: string
  problem: string
  technician: string
  cost: number
  duration: string
}

interface SparePart {
  id: string
  name: string
  equipment: string
  qty: number
  minQty: number
  price: number
}

interface Alert {
  id: string
  equipmentId: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

const EQUIPMENTS: Equipment[] = [
  { id: 'e1', name: 'Frigo cuisine 1', category: 'Froid', brand: 'Liebherr', model: 'GKv 5730', purchaseDate: '2022-03-10', lastService: '2026-01-15', nextService: '2026-07-15', status: 'ok' },
  { id: 'e2', name: 'Frigo cuisine 2', category: 'Froid', brand: 'Liebherr', model: 'GKv 5730', purchaseDate: '2022-03-10', lastService: '2025-11-20', nextService: '2026-05-20', status: 'attention' },
  { id: 'e3', name: 'Congélateur', category: 'Froid', brand: 'Electrolux', model: 'RH06P41', purchaseDate: '2021-06-05', lastService: '2026-02-10', nextService: '2026-08-10', status: 'ok' },
  { id: 'e4', name: 'Chambre froide', category: 'Froid', brand: 'Foster', model: 'G2 Eco Pro', purchaseDate: '2020-09-15', lastService: '2026-03-01', nextService: '2026-09-01', status: 'ok' },
  { id: 'e5', name: 'Machine à café', category: 'Cuisine', brand: 'La Marzocco', model: 'Linea PB', purchaseDate: '2023-01-20', lastService: '2026-03-15', nextService: '2026-06-15', status: 'ok' },
  { id: 'e6', name: 'Lave-vaisselle', category: 'Cuisine', brand: 'Winterhalter', model: 'UC-M', purchaseDate: '2022-08-12', lastService: '2026-02-28', nextService: '2026-08-28', status: 'ok' },
  { id: 'e7', name: 'Four professionnel', category: 'Cuisine', brand: 'Rational', model: 'iCombi Pro 6', purchaseDate: '2021-11-03', lastService: '2026-01-10', nextService: '2026-07-10', status: 'ok' },
  { id: 'e8', name: 'Plancha', category: 'Cuisine', brand: 'Krampouz', model: 'GECID4', purchaseDate: '2022-05-22', lastService: '2025-12-05', nextService: '2026-06-05', status: 'attention' },
  { id: 'e9', name: 'Friteuse double', category: 'Cuisine', brand: 'Valentine', model: 'V2200', purchaseDate: '2023-04-18', lastService: '2026-02-20', nextService: '2026-08-20', status: 'ok' },
  { id: 'e10', name: 'Hotte aspirante', category: 'Cuisine', brand: 'Halton', model: 'KVE', purchaseDate: '2020-09-15', lastService: '2025-10-10', nextService: '2026-04-10', status: 'panne' },
  { id: 'e11', name: 'Climatisation salle', category: 'Confort', brand: 'Daikin', model: 'FTXM35N', purchaseDate: '2021-07-08', lastService: '2026-03-20', nextService: '2026-09-20', status: 'ok' },
  { id: 'e12', name: 'Caisse enregistreuse', category: 'POS', brand: 'Oxhoo', model: 'TP-100', purchaseDate: '2023-02-14', lastService: '2026-02-14', nextService: '2027-02-14', status: 'ok' },
  { id: 'e13', name: 'TV salle (x2)', category: 'Audio/Vidéo', brand: 'Samsung', model: 'QE55Q60B', purchaseDate: '2022-11-30', lastService: '2026-01-05', nextService: '2027-01-05', status: 'ok' },
  { id: 'e14', name: 'Système musique', category: 'Audio/Vidéo', brand: 'Sonos', model: 'Arc + Sub', purchaseDate: '2022-06-10', lastService: '2026-02-18', nextService: '2027-02-18', status: 'ok' },
  { id: 'e15', name: 'POS tablettes (4) + Imprimantes tickets', category: 'POS', brand: 'iPad + Epson', model: 'iPad 10 / TM-m30', purchaseDate: '2023-03-01', lastService: '2026-03-01', nextService: '2027-03-01', status: 'ok' },
]

const CONTRACTS: Contract[] = [
  { id: 'c1', equipmentId: 'e1', supplier: 'FroidPro Luxembourg', type: 'annuel', nextBilling: '2026-07-15', amount: 480, number: 'FP-2024-0142' },
  { id: 'c2', equipmentId: 'e4', supplier: 'FroidPro Luxembourg', type: 'annuel', nextBilling: '2026-09-01', amount: 720, number: 'FP-2024-0143' },
  { id: 'c3', equipmentId: 'e5', supplier: 'Café Service SA', type: 'trimestriel', nextBilling: '2026-06-15', amount: 210, number: 'CS-2025-0088' },
  { id: 'c4', equipmentId: 'e7', supplier: 'Rational Service', type: 'annuel', nextBilling: '2026-07-10', amount: 890, number: 'RT-2024-4421' },
  { id: 'c5', equipmentId: 'e10', supplier: 'Halton Care', type: 'annuel', nextBilling: '2026-04-10', amount: 540, number: 'HT-2024-0211' },
  { id: 'c6', equipmentId: 'e11', supplier: 'Daikin Lux', type: 'annuel', nextBilling: '2026-09-20', amount: 390, number: 'DK-2024-7734' },
]

const INTERVENTIONS: Intervention[] = [
  { id: 'i1', date: '2026-04-12', equipmentId: 'e10', problem: 'Moteur hotte en panne — surchauffe', technician: 'Halton Care / M. Weber', cost: 820, duration: '3h30' },
  { id: 'i2', date: '2026-04-05', equipmentId: 'e2', problem: 'Température instable (+2°C)', technician: 'FroidPro / J. Schmit', cost: 145, duration: '1h15' },
  { id: 'i3', date: '2026-03-28', equipmentId: 'e8', problem: 'Thermostat défaillant remplacé', technician: 'Krampouz Service', cost: 210, duration: '2h00' },
  { id: 'i4', date: '2026-03-15', equipmentId: 'e5', problem: 'Détartrage complet groupe', technician: 'Café Service / P. Meyer', cost: 95, duration: '1h00' },
  { id: 'i5', date: '2026-03-01', equipmentId: 'e4', problem: 'Révision annuelle préventive', technician: 'FroidPro / J. Schmit', cost: 360, duration: '2h30' },
  { id: 'i6', date: '2026-02-20', equipmentId: 'e9', problem: 'Filtre huile remplacé', technician: 'Valentine Lux', cost: 78, duration: '0h45' },
  { id: 'i7', date: '2026-02-10', equipmentId: 'e3', problem: 'Joint porte remplacé', technician: 'Electrolux Pro', cost: 120, duration: '1h00' },
]

const SPARE_PARTS: SparePart[] = [
  { id: 'sp1', name: 'Joint porte frigo', equipment: 'Frigo', qty: 3, minQty: 2, price: 45 },
  { id: 'sp2', name: 'Filtre à eau machine café', equipment: 'Café', qty: 2, minQty: 3, price: 32 },
  { id: 'sp3', name: 'Courroie lave-vaisselle', equipment: 'Lave-vaisselle', qty: 1, minQty: 1, price: 68 },
  { id: 'sp4', name: 'Thermostat plancha', equipment: 'Plancha', qty: 0, minQty: 1, price: 110 },
  { id: 'sp5', name: 'Filtre graisse hotte', equipment: 'Hotte', qty: 6, minQty: 4, price: 18 },
  { id: 'sp6', name: 'Rouleaux papier tickets', equipment: 'Imprimante', qty: 24, minQty: 10, price: 2.5 },
]

const ALERTS: Alert[] = [
  { id: 'a1', equipmentId: 'e2', message: 'Le frigo 2 consomme 15% plus qu\'en mars — contrôle recommandé', severity: 'warning' },
  { id: 'a2', equipmentId: 'e10', message: 'Hotte hors service depuis 2 jours — intervention en cours', severity: 'critical' },
  { id: 'a3', equipmentId: 'e8', message: 'Plancha : température instable détectée cette semaine', severity: 'warning' },
]

const statusLabel = (s: EquipStatus) =>
  s === 'ok' ? 'OK' : s === 'attention' ? 'Attention' : 'Panne'

const statusColor = (s: EquipStatus) =>
  s === 'ok' ? { bg: C.greenSoft, fg: C.green } :
  s === 'attention' ? { bg: C.amberSoft, fg: C.amber } :
  { bg: C.redSoft, fg: C.red }

function MaintenancePage() {
  const [tab, setTab] = useState<'equip' | 'calendar' | 'contracts' | 'log' | 'parts'>('equip')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const stats = useMemo(() => ({
    total: EQUIPMENTS.length,
    interMonth: INTERVENTIONS.filter(i => i.date.startsWith('2026-04') || i.date.startsWith('2026-03')).length,
    panne: EQUIPMENTS.filter(e => e.status === 'panne').length,
    contracts: CONTRACTS.length,
  }), [])

  const filtered = EQUIPMENTS.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.brand.toLowerCase().includes(query.toLowerCase())
  )

  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1)
  const scheduledByDay: Record<number, Equipment[]> = {}
  EQUIPMENTS.forEach(e => {
    const d = parseInt(e.nextService.split('-')[2])
    if (e.nextService.startsWith('2026-04') || e.nextService.startsWith('2026-05') || e.nextService.startsWith('2026-06')) {
      scheduledByDay[d] = scheduledByDay[d] || []
      scheduledByDay[d].push(e)
    }
  })

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Wrench size={28} color={C.cyan} /> Maintenance équipement
          </h1>
          <p style={{ margin: '4px 0 0', color: C.muted }}>Suivi, interventions et contrats de maintenance</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.cyan, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nouvelle intervention
        </button>
      </motion.div>

      {/* Predictive alerts */}
      {ALERTS.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 20 }}>
          {ALERTS.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: a.severity === 'critical' ? C.redSoft : C.amberSoft,
              color: a.severity === 'critical' ? C.red : C.amber,
              padding: '10px 14px', borderRadius: 10, marginBottom: 8, fontSize: 14, fontWeight: 500,
            }}>
              {a.severity === 'critical' ? <AlertTriangle size={16} /> : <Zap size={16} />}
              {a.message}
            </div>
          ))}
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Équipements', value: stats.total, icon: Package, color: C.cyan, bg: C.cyanSoft },
          { label: 'Interventions ce mois', value: stats.interMonth, icon: Wrench, color: C.blue, bg: C.blueSoft },
          { label: 'En panne', value: stats.panne, icon: AlertTriangle, color: C.red, bg: C.redSoft },
          { label: 'Contrats actifs', value: stats.contracts, icon: FileText, color: C.green, bg: C.greenSoft },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: C.card, padding: 18, borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: 'equip', label: 'Équipements', icon: Package },
          { id: 'calendar', label: 'Calendrier', icon: Calendar },
          { id: 'contracts', label: 'Contrats', icon: FileText },
          { id: 'log', label: 'Interventions', icon: Wrench },
          { id: 'parts', label: 'Pièces détachées', icon: Package },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            background: 'transparent', border: 'none', padding: '10px 14px', cursor: 'pointer',
            color: tab === t.id ? C.cyan : C.muted, fontWeight: 600, fontSize: 14,
            borderBottom: tab === t.id ? `2px solid ${C.cyan}` : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'equip' && (
          <motion.div key="eq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
              <Search size={16} color={C.muted} style={{ position: 'absolute', left: 12, top: 12 }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un équipement…" style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.card, fontSize: 14 }} />
            </div>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['Équipement', 'Catégorie', 'Marque / Modèle', 'Achat', 'Dernière révision', 'Prochaine révision', 'Statut'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const sc = statusColor(e.status)
                    return (
                      <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{e.name}</td>
                        <td style={{ padding: 12, color: C.muted }}>{e.category}</td>
                        <td style={{ padding: 12 }}>{e.brand} — {e.model}</td>
                        <td style={{ padding: 12, color: C.muted }}>{e.purchaseDate}</td>
                        <td style={{ padding: 12, color: C.muted }}>{e.lastService}</td>
                        <td style={{ padding: 12 }}>{e.nextService}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ background: sc.bg, color: sc.fg, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{statusLabel(e.status)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'calendar' && (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px' }}>Calendrier des maintenances — Avril / Mai / Juin 2026</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} style={{ padding: 8, fontWeight: 600, color: C.muted, fontSize: 12, textAlign: 'center' }}>{d}</div>
                ))}
                {monthDays.map(d => (
                  <div key={d} style={{
                    minHeight: 70, padding: 6, border: `1px solid ${C.border}`, borderRadius: 8,
                    background: scheduledByDay[d] ? C.cyanSoft : C.card,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{d}</div>
                    {scheduledByDay[d]?.map(e => (
                      <div key={e.id} style={{ fontSize: 10, background: C.cyan, color: '#fff', padding: '2px 4px', borderRadius: 4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'contracts' && (
          <motion.div key="ct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['N° Contrat', 'Équipement', 'Fournisseur', 'Type', 'Prochaine facturation', 'Montant'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONTRACTS.map(c => {
                    const e = EQUIPMENTS.find(x => x.id === c.equipmentId)
                    return (
                      <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, fontWeight: 600, color: C.cyan }}>{c.number}</td>
                        <td style={{ padding: 12 }}>{e?.name}</td>
                        <td style={{ padding: 12 }}>{c.supplier}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ background: C.blueSoft, color: C.blue, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{c.type}</span>
                        </td>
                        <td style={{ padding: 12, color: C.muted }}>{c.nextBilling}</td>
                        <td style={{ padding: 12, fontWeight: 700 }}>{c.amount} €</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, padding: 14, background: C.cyanSoft, borderRadius: 10, color: C.cyan, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Euro size={16} /> Total annuel contrats : {CONTRACTS.reduce((s, c) => s + c.amount, 0)} €
            </div>
          </motion.div>
        )}

        {tab === 'log' && (
          <motion.div key="lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['Date', 'Équipement', 'Problème', 'Technicien', 'Durée', 'Coût'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INTERVENTIONS.map(i => {
                    const e = EQUIPMENTS.find(x => x.id === i.equipmentId)
                    return (
                      <tr key={i.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: 12, color: C.muted }}>{i.date}</td>
                        <td style={{ padding: 12, fontWeight: 600 }}>{e?.name}</td>
                        <td style={{ padding: 12 }}>{i.problem}</td>
                        <td style={{ padding: 12, color: C.muted }}>{i.technician}</td>
                        <td style={{ padding: 12 }}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{i.duration}</td>
                        <td style={{ padding: 12, fontWeight: 700 }}>{i.cost} €</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, padding: 14, background: C.amberSoft, borderRadius: 10, color: C.amber, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} /> Total interventions (3 mois) : {INTERVENTIONS.reduce((s, i) => s + i.cost, 0)} €
            </div>
          </motion.div>
        )}

        {tab === 'parts' && (
          <motion.div key="pt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {SPARE_PARTS.map(sp => {
                const low = sp.qty < sp.minQty
                return (
                  <div key={sp.id} style={{ background: C.card, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sp.name}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sp.equipment}</div>
                      </div>
                      {low && <AlertTriangle size={16} color={C.red} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.muted }}>Stock</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: low ? C.red : C.green }}>{sp.qty}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: C.muted }}>Prix unitaire</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{sp.price} €</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Min. requis : {sp.minQty}</div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal new intervention */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ background: C.card, padding: 24, borderRadius: 16, width: 480, maxWidth: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0 }}>Nouvelle intervention</h3>
                <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <select style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  {EQUIPMENTS.map(e => <option key={e.id}>{e.name}</option>)}
                </select>
                <input placeholder="Description du problème" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <input placeholder="Technicien / fournisseur" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="date" style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                  <input placeholder="Coût (€)" type="number" style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                </div>
                <button onClick={() => { toast.success('Intervention enregistrée'); setModalOpen(false) }} style={{ background: C.cyan, color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Enregistrer
                </button>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={12} /> Urgence 24/7 : +352 28 99 99 99
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MaintenancePage
