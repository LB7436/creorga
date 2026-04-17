import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Plus,
  Trash2,
  Edit3,
  Save,
  ExternalLink,
  Hash,
  Users as UsersIcon,
  Move,
  Palette,
  Eye,
  Link2,
  Accessibility,
  Armchair,
  Volume2,
  Wifi,
  Zap,
  QrCode,
  Wrench,
  Download,
  Clock,
  Sun,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#fff',
  bgSoft: '#f8fafc',
  indigo: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
}

const card: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 22,
  boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
}

type Shape = 'Ronde' | 'Carrée' | 'Rectangle' | 'Bar'
type Status = 'active' | 'reserved' | 'disabled'
type ViewLabel = 'Vue jardin' | 'Vue rue' | 'Côté bar' | 'Cheminée' | 'Vitrine' | 'Coin calme' | 'Sans vue'
type NoiseLevel = 'Silencieux' | 'Modéré' | 'Animé'

interface TableAccess {
  wheelchair: boolean
  window: boolean
  quiet: boolean
}

interface ReservationRules {
  minParty: number
  maxDuration: number // in minutes
  defaultDeposit: number // in euros
}

interface MaintenanceEntry {
  id: string
  date: string
  action: string
  tech: string
}

interface Table {
  id: string
  num: number
  shape: Shape
  seats: number
  x: number
  y: number
  status: Status
  salleId: string
  view: ViewLabel
  noise: NoiseLevel
  access: TableAccess
  rules: ReservationRules
  power: boolean
  wifi: boolean
  maintenance: MaintenanceEntry[]
}

interface Combination {
  id: string
  tableIds: string[]
  label: string
  maxSeats: number
}

type Salle = { id: string; name: string; color: string }

const INITIAL_SALLES: Salle[] = [
  { id: 's1', name: 'Salle principale', color: '#6366f1' },
  { id: 's2', name: 'Bar', color: '#f59e0b' },
  { id: 's3', name: 'Terrasse', color: '#10b981' },
]

const mkTable = (p: Partial<Table> & Pick<Table, 'id' | 'num' | 'shape' | 'seats' | 'x' | 'y' | 'status' | 'salleId'>): Table => ({
  view: 'Sans vue',
  noise: 'Modéré',
  access: { wheelchair: false, window: false, quiet: false },
  rules: { minParty: 1, maxDuration: 120, defaultDeposit: 0 },
  power: false,
  wifi: true,
  maintenance: [],
  ...p,
})

const INITIAL_TABLES: Table[] = [
  mkTable({ id: 't1', num: 1, shape: 'Ronde', seats: 4, x: 60, y: 60, status: 'active', salleId: 's1', view: 'Vue jardin', noise: 'Silencieux', access: { wheelchair: true, window: true, quiet: true }, rules: { minParty: 2, maxDuration: 120, defaultDeposit: 0 }, power: true, wifi: true }),
  mkTable({ id: 't2', num: 2, shape: 'Ronde', seats: 4, x: 160, y: 60, status: 'active', salleId: 's1', view: 'Vue jardin', noise: 'Silencieux', access: { wheelchair: false, window: true, quiet: true } }),
  mkTable({ id: 't3', num: 3, shape: 'Carrée', seats: 2, x: 260, y: 60, status: 'active', salleId: 's1', view: 'Cheminée', noise: 'Modéré', rules: { minParty: 2, maxDuration: 90, defaultDeposit: 20 }, power: true }),
  mkTable({ id: 't4', num: 4, shape: 'Rectangle', seats: 6, x: 60, y: 160, status: 'reserved', salleId: 's1', view: 'Coin calme', noise: 'Silencieux', rules: { minParty: 4, maxDuration: 180, defaultDeposit: 50 }, access: { wheelchair: true, window: false, quiet: true }, power: true, wifi: true, maintenance: [{ id: 'm1', date: '2026-03-12', action: 'Pied de table resserré', tech: 'Lucas' }] }),
  mkTable({ id: 't5', num: 5, shape: 'Carrée', seats: 4, x: 200, y: 160, status: 'active', salleId: 's1', view: 'Sans vue', noise: 'Animé' }),
  mkTable({ id: 't6', num: 6, shape: 'Ronde', seats: 4, x: 320, y: 160, status: 'active', salleId: 's1', view: 'Vue jardin', noise: 'Modéré', access: { wheelchair: false, window: true, quiet: false } }),
  mkTable({ id: 't7', num: 7, shape: 'Rectangle', seats: 8, x: 60, y: 260, status: 'active', salleId: 's1', view: 'Coin calme', rules: { minParty: 6, maxDuration: 240, defaultDeposit: 100 }, access: { wheelchair: true, window: false, quiet: true }, power: true, wifi: true }),
  mkTable({ id: 't8', num: 8, shape: 'Carrée', seats: 2, x: 240, y: 260, status: 'disabled', salleId: 's1', noise: 'Modéré', maintenance: [{ id: 'm2', date: '2026-04-02', action: 'Plateau fendu - réparation', tech: 'Marie' }] }),
  mkTable({ id: 't9', num: 10, shape: 'Bar', seats: 1, x: 40, y: 40, status: 'active', salleId: 's2', view: 'Côté bar', noise: 'Animé', power: true, wifi: true }),
  mkTable({ id: 't10', num: 11, shape: 'Bar', seats: 1, x: 100, y: 40, status: 'active', salleId: 's2', view: 'Côté bar', noise: 'Animé', power: true, wifi: true }),
  mkTable({ id: 't11', num: 20, shape: 'Ronde', seats: 4, x: 80, y: 80, status: 'active', salleId: 's3', view: 'Vue rue', noise: 'Modéré', wifi: true }),
  mkTable({ id: 't12', num: 21, shape: 'Ronde', seats: 6, x: 220, y: 80, status: 'active', salleId: 's3', view: 'Vue rue', noise: 'Animé', access: { wheelchair: true, window: false, quiet: false } }),
]

const INITIAL_COMBINATIONS: Combination[] = [
  { id: 'c1', tableIds: ['t1', 't2'], label: 'Tables 1+2', maxSeats: 8 },
  { id: 'c2', tableIds: ['t4', 't5'], label: 'Tables 4+5', maxSeats: 10 },
  { id: 'c3', tableIds: ['t7'], label: 'Grande table (8)', maxSeats: 8 },
]

const VIEW_OPTIONS: ViewLabel[] = ['Vue jardin', 'Vue rue', 'Côté bar', 'Cheminée', 'Vitrine', 'Coin calme', 'Sans vue']
const NOISE_OPTIONS: NoiseLevel[] = ['Silencieux', 'Modéré', 'Animé']

type TabKey = 'tables' | 'combinations' | 'rules' | 'accessibility' | 'maintenance' | 'qrcodes'

export default function SettingsTables() {
  const [salles, setSalles] = useState(INITIAL_SALLES)
  const [tables, setTables] = useState(INITIAL_TABLES)
  const [combinations, setCombinations] = useState(INITIAL_COMBINATIONS)
  const [selectedSalle, setSelectedSalle] = useState('s1')
  const [editingSalle, setEditingSalle] = useState<string | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [draftTable, setDraftTable] = useState<Partial<Table>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('tables')
  const [maintenanceTarget, setMaintenanceTarget] = useState<Table | null>(null)

  const salleTables = useMemo(() => tables.filter((t) => t.salleId === selectedSalle), [tables, selectedSalle])
  const currentSalle = salles.find((s) => s.id === selectedSalle)!

  const totalTables = tables.length
  const totalSalles = salles.length
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)
  const accessibleCount = tables.filter((t) => t.access.wheelchair).length
  const quietCount = tables.filter((t) => t.access.quiet).length
  const windowCount = tables.filter((t) => t.access.window).length

  const openEditTable = (t?: Table) => {
    if (t) {
      setEditingTable(t)
      setDraftTable({ ...t })
    } else {
      setEditingTable(null)
      setDraftTable(
        mkTable({
          id: '',
          num: (Math.max(0, ...salleTables.map((x) => x.num)) || 0) + 1,
          shape: 'Ronde',
          seats: 4,
          x: 100,
          y: 100,
          status: 'active',
          salleId: selectedSalle,
        }),
      )
    }
    setShowTableModal(true)
  }

  const saveTableModal = () => {
    if (!draftTable.num) {
      toast.error('Numéro requis')
      return
    }
    if (editingTable) {
      setTables((all) => all.map((t) => (t.id === editingTable.id ? ({ ...t, ...draftTable } as Table) : t)))
      toast.success('Table modifiée')
    } else {
      const id = `t${Date.now()}`
      setTables((all) => [...all, { ...(draftTable as Table), id }])
      toast.success('Table ajoutée')
    }
    setShowTableModal(false)
  }

  const deleteTable = (id: string) => {
    setTables((all) => all.filter((t) => t.id !== id))
    setCombinations((c) => c.filter((x) => !x.tableIds.includes(id)))
    toast.success('Table supprimée')
  }

  const updateTableField = (id: string, patch: Partial<Table>) => {
    setTables((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const toggleAccess = (id: string, key: keyof TableAccess) => {
    setTables((all) => all.map((t) => (t.id === id ? { ...t, access: { ...t.access, [key]: !t.access[key] } } : t)))
  }

  const renumberTables = () => {
    let i = 1
    setTables((all) => all.map((t) => (t.salleId === selectedSalle ? { ...t, num: i++ } : t)))
    toast.success('Tables renumérotées')
  }

  const addCombination = () => {
    const id = `c${Date.now()}`
    setCombinations((c) => [...c, { id, tableIds: [], label: 'Nouvelle combinaison', maxSeats: 0 }])
  }

  const updateCombination = (id: string, patch: Partial<Combination>) => {
    setCombinations((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const deleteCombination = (id: string) => {
    setCombinations((all) => all.filter((c) => c.id !== id))
    toast.success('Combinaison supprimée')
  }

  const toggleTableInCombination = (combId: string, tableId: string) => {
    setCombinations((all) =>
      all.map((c) => {
        if (c.id !== combId) return c
        const has = c.tableIds.includes(tableId)
        const nextIds = has ? c.tableIds.filter((x) => x !== tableId) : [...c.tableIds, tableId]
        const nextSeats = nextIds.reduce((s, tid) => s + (tables.find((t) => t.id === tid)?.seats || 0), 0)
        return { ...c, tableIds: nextIds, maxSeats: nextSeats }
      }),
    )
  }

  const downloadQR = (t: Table) => {
    toast.success(`QR code Table #${t.num} téléchargé (mock)`, { icon: '\u{1F4E5}' })
  }

  const downloadAllQR = () => {
    toast.success(`${tables.length} QR codes exportés en PDF (mock)`, { icon: '\u{1F4C4}' })
  }

  const addMaintenance = (tableId: string, action: string, tech: string) => {
    if (!action.trim() || !tech.trim()) return
    const entry: MaintenanceEntry = {
      id: `m${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      action,
      tech,
    }
    setTables((all) => all.map((t) => (t.id === tableId ? { ...t, maintenance: [entry, ...t.maintenance] } : t)))
    toast.success('Entrée ajoutée au journal')
  }

  const deleteMaintenance = (tableId: string, entryId: string) => {
    setTables((all) => all.map((t) => (t.id === tableId ? { ...t, maintenance: t.maintenance.filter((m) => m.id !== entryId) } : t)))
  }

  const handleDragStart = (id: string) => setDragId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (!dragId || dragId === id) return
    const a = tables.findIndex((t) => t.id === dragId)
    const b = tables.findIndex((t) => t.id === id)
    const next = [...tables]
    next.splice(b, 0, next.splice(a, 1)[0])
    setTables(next)
  }

  const TABS: { id: TabKey; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'tables', label: 'Tables', icon: LayoutGrid },
    { id: 'combinations', label: 'Combinaisons', icon: Link2 },
    { id: 'rules', label: 'Règles de réservation', icon: Clock },
    { id: 'accessibility', label: 'Accessibilité & confort', icon: Accessibility },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'qrcodes', label: 'QR codes', icon: QrCode },
  ]

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto', color: C.text }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <LayoutGrid size={26} color={C.indigo} /> Configuration des tables et salles
            </h1>
            <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 14 }}>
              {totalTables} tables · {totalSalles} salles · {totalSeats} places · {accessibleCount} accessibles PMR
            </p>
          </div>
          <button
            onClick={() => toast('Éditeur visuel disponible dans le POS standalone', { icon: '🎨' })}
            style={btnPrimary}
          >
            <ExternalLink size={15} /> Ouvrir l'éditeur visuel
          </button>
        </motion.div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
          <KPI label="Tables actives" value={String(tables.filter((t) => t.status === 'active').length)} color={C.green} icon={<LayoutGrid size={16} />} />
          <KPI label="Accessibles PMR" value={String(accessibleCount)} color={C.violet} icon={<Accessibility size={16} />} />
          <KPI label="Vue fenêtre" value={String(windowCount)} color={C.cyan} icon={<Sun size={16} />} />
          <KPI label="Coin calme" value={String(quietCount)} color={C.amber} icon={<Volume2 size={16} />} />
          <KPI label="Combinaisons" value={String(combinations.length)} color={C.indigo} icon={<Link2 size={16} />} />
        </div>

        {/* tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            background: '#fff',
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            marginBottom: 18,
            overflowX: 'auto',
          }}
        >
          {TABS.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: active ? C.indigo : 'transparent',
                  color: active ? '#fff' : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'tables' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 7fr', gap: 16 }}>
            {/* SALLES */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Salles</h3>
                <button
                  onClick={() => {
                    const id = `s${Date.now()}`
                    setSalles((ss) => [...ss, { id, name: 'Nouvelle salle', color: '#8b5cf6' }])
                    setSelectedSalle(id)
                    setEditingSalle(id)
                  }}
                  style={{ ...btnTiny, background: C.indigo, color: '#fff', border: 'none' }}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {salles.map((salle) => {
                  const active = salle.id === selectedSalle
                  const count = tables.filter((t) => t.salleId === salle.id).length
                  const seats = tables.filter((t) => t.salleId === salle.id).reduce((s, t) => s + t.seats, 0)
                  const isEditing = editingSalle === salle.id
                  return (
                    <motion.div
                      key={salle.id}
                      onClick={() => setSelectedSalle(salle.id)}
                      whileHover={{ x: 2 }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: `1px solid ${active ? salle.color : C.border}`,
                        background: active ? `${salle.color}10` : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: salle.color }} />
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={salle.name}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => {
                              setSalles((ss) => ss.map((s) => (s.id === salle.id ? { ...s, name: e.target.value } : s)))
                              setEditingSalle(null)
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            style={{ ...inputStyle, padding: '4px 8px', flex: 1 }}
                          />
                        ) : (
                          <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{salle.name}</div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingSalle(salle.id)
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: C.muted }}>
                        <span>
                          <Hash size={10} /> {count} tables
                        </span>
                        <span>
                          <UsersIcon size={10} /> {seats} places
                        </span>
                      </div>
                      {active && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <Palette size={11} color={C.muted} />
                          <input
                            type="color"
                            value={salle.color}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setSalles((ss) => ss.map((s) => (s.id === salle.id ? { ...s, color: e.target.value } : s)))
                            }
                            style={{ width: 28, height: 20, padding: 0, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Preview */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.muted }}>
                  <Eye size={12} /> Aperçu plan
                </div>
                <div style={{ background: C.bgSoft, borderRadius: 10, border: `1px solid ${C.border}`, padding: 10 }}>
                  <svg viewBox="0 0 400 350" style={{ width: '100%', height: 180 }}>
                    <rect x="0" y="0" width="400" height="350" fill={`${currentSalle.color}08`} rx="8" />
                    {salleTables.map((t) => {
                      const base = {
                        fill: t.status === 'reserved' ? C.amber : t.status === 'disabled' ? '#cbd5e1' : currentSalle.color,
                        stroke: t.access.wheelchair ? C.violet : '#fff',
                        strokeWidth: t.access.wheelchair ? 3 : 2,
                      }
                      if (t.shape === 'Ronde') return <circle key={t.id} cx={t.x} cy={t.y} r="26" {...base} />
                      if (t.shape === 'Bar') return <rect key={t.id} x={t.x - 18} y={t.y - 10} width="36" height="20" rx="4" {...base} />
                      if (t.shape === 'Rectangle') return <rect key={t.id} x={t.x - 32} y={t.y - 18} width="64" height="36" rx="4" {...base} />
                      return <rect key={t.id} x={t.x - 24} y={t.y - 24} width="48" height="48" rx="4" {...base} />
                    })}
                    {salleTables.map((t) => (
                      <text key={`l-${t.id}`} x={t.x} y={t.y + 3} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
                        {t.num}
                      </text>
                    ))}
                  </svg>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: 'center' }}>
                    Contour violet = accessible PMR
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TABLES */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Tables · <span style={{ color: currentSalle.color }}>{currentSalle.name}</span>
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={renumberTables} style={btnGhost}>
                    <Hash size={14} /> Renuméroter
                  </button>
                  <button onClick={() => openEditTable()} style={btnPrimary}>
                    <Plus size={14} /> Ajouter une table
                  </button>
                </div>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: C.bgSoft }}>
                    <tr>
                      <th style={th}>N°</th>
                      <th style={th}>Forme</th>
                      <th style={th}>Places</th>
                      <th style={th}>Vue</th>
                      <th style={th}>Bruit</th>
                      <th style={th}>Statut</th>
                      <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salleTables.map((t) => (
                      <tr
                        key={t.id}
                        draggable
                        onDragStart={() => handleDragStart(t.id)}
                        onDragOver={(e) => handleDragOver(e, t.id)}
                        style={{ borderTop: `1px solid ${C.border}`, cursor: 'grab' }}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Move size={12} color={C.muted} />
                            <strong>#{t.num}</strong>
                            {t.power && <Zap size={11} color={C.amber} />}
                            {t.wifi && <Wifi size={11} color={C.cyan} />}
                          </div>
                        </td>
                        <td style={td}>
                          <select
                            value={t.shape}
                            onChange={(e) => updateTableField(t.id, { shape: e.target.value as Shape })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 110 }}
                          >
                            <option>Ronde</option>
                            <option>Carrée</option>
                            <option>Rectangle</option>
                            <option>Bar</option>
                          </select>
                        </td>
                        <td style={td}>
                          <input
                            type="number"
                            value={t.seats}
                            onChange={(e) => updateTableField(t.id, { seats: parseInt(e.target.value) || 0 })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 55 }}
                          />
                        </td>
                        <td style={td}>
                          <select
                            value={t.view}
                            onChange={(e) => updateTableField(t.id, { view: e.target.value as ViewLabel })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 120 }}
                          >
                            {VIEW_OPTIONS.map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: t.noise === 'Silencieux' ? '#d1fae5' : t.noise === 'Modéré' ? '#fef3c7' : '#fee2e2',
                              color: t.noise === 'Silencieux' ? '#065f46' : t.noise === 'Modéré' ? '#92400e' : '#991b1b',
                            }}
                          >
                            {t.noise}
                          </span>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background:
                                t.status === 'active' ? '#d1fae5' : t.status === 'reserved' ? '#fef3c7' : '#fee2e2',
                              color: t.status === 'active' ? '#065f46' : t.status === 'reserved' ? '#92400e' : '#991b1b',
                            }}
                          >
                            {t.status === 'active' ? 'Active' : t.status === 'reserved' ? 'Réservée' : 'Désactivée'}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <button onClick={() => openEditTable(t)} style={{ ...btnTiny, marginRight: 4 }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => downloadQR(t)} style={{ ...btnTiny, marginRight: 4 }}>
                            <QrCode size={13} />
                          </button>
                          <button onClick={() => deleteTable(t.id)} style={{ ...btnTiny, color: C.red }}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {salleTables.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...td, textAlign: 'center', color: C.muted, padding: 28 }}>
                          Aucune table dans cette salle
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {/* COMBINATIONS */}
        {activeTab === 'combinations' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Combinaisons de tables</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
                  Définissez quelles tables peuvent être fusionnées pour accueillir de grands groupes
                </p>
              </div>
              <button onClick={addCombination} style={btnPrimary}>
                <Plus size={14} /> Nouvelle combinaison
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {combinations.map((comb) => (
                <div
                  key={comb.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bgSoft,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Nom</label>
                      <input
                        value={comb.label}
                        onChange={(e) => updateCombination(comb.id, { label: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ width: 120 }}>
                      <label style={labelStyle}>Places max</label>
                      <input
                        type="number"
                        value={comb.maxSeats}
                        readOnly
                        style={{ ...inputStyle, background: C.bg, fontWeight: 700, color: C.indigo }}
                      />
                    </div>
                    <button onClick={() => deleteCombination(comb.id)} style={{ ...btnTiny, color: C.red }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <label style={labelStyle}>Tables incluses</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tables.map((t) => {
                      const sel = comb.tableIds.includes(t.id)
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTableInCombination(comb.id, t.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            border: `1px solid ${sel ? C.indigo : C.border}`,
                            background: sel ? C.indigo : '#fff',
                            color: sel ? '#fff' : C.text,
                            cursor: 'pointer',
                          }}
                        >
                          #{t.num} ({t.seats}p)
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {combinations.length === 0 && (
                <div style={{ textAlign: 'center', color: C.muted, padding: 30 }}>Aucune combinaison définie</div>
              )}
            </div>
          </motion.div>
        )}

        {/* RULES */}
        {activeTab === 'rules' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Règles de réservation par table</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted }}>
              Minimum de couverts, durée maximale et acompte par défaut
            </p>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: C.bgSoft }}>
                  <tr>
                    <th style={th}>Table</th>
                    <th style={th}>Salle</th>
                    <th style={th}>Min. couverts</th>
                    <th style={th}>Durée max (min)</th>
                    <th style={th}>Acompte par défaut (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => {
                    const salle = salles.find((s) => s.id === t.salleId)
                    return (
                      <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={td}>
                          <strong>#{t.num}</strong> · {t.seats}p
                        </td>
                        <td style={{ ...td, color: salle?.color, fontWeight: 600 }}>{salle?.name}</td>
                        <td style={td}>
                          <input
                            type="number"
                            value={t.rules.minParty}
                            onChange={(e) => updateTableField(t.id, { rules: { ...t.rules, minParty: parseInt(e.target.value) || 1 } })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 70 }}
                          />
                        </td>
                        <td style={td}>
                          <input
                            type="number"
                            value={t.rules.maxDuration}
                            onChange={(e) => updateTableField(t.id, { rules: { ...t.rules, maxDuration: parseInt(e.target.value) || 0 } })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 80 }}
                          />
                        </td>
                        <td style={td}>
                          <input
                            type="number"
                            value={t.rules.defaultDeposit}
                            onChange={(e) => updateTableField(t.id, { rules: { ...t.rules, defaultDeposit: parseInt(e.target.value) || 0 } })}
                            style={{ ...inputStyle, padding: '4px 8px', width: 80 }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ACCESSIBILITY & COMFORT */}
        {activeTab === 'accessibility' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Accessibilité & confort</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted }}>
              Équipements et caractéristiques pour clients spéciaux (PMR, diners d'affaires, coin calme)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {tables.map((t) => {
                const salle = salles.find((s) => s.id === t.salleId)
                return (
                  <div
                    key={t.id}
                    style={{
                      padding: 14,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Table #{t.num}</div>
                      <div style={{ fontSize: 11, color: salle?.color, fontWeight: 600 }}>{salle?.name}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <AccessToggle
                        active={t.access.wheelchair}
                        label="Accès PMR"
                        icon={<Accessibility size={14} />}
                        color={C.violet}
                        onToggle={() => toggleAccess(t.id, 'wheelchair')}
                      />
                      <AccessToggle
                        active={t.access.window}
                        label="Fenêtre"
                        icon={<Sun size={14} />}
                        color={C.cyan}
                        onToggle={() => toggleAccess(t.id, 'window')}
                      />
                      <AccessToggle
                        active={t.access.quiet}
                        label="Coin calme"
                        icon={<Volume2 size={14} />}
                        color={C.amber}
                        onToggle={() => toggleAccess(t.id, 'quiet')}
                      />
                      <AccessToggle
                        active={t.power}
                        label="Prise"
                        icon={<Zap size={14} />}
                        color={C.amber}
                        onToggle={() => updateTableField(t.id, { power: !t.power })}
                      />
                      <AccessToggle
                        active={t.wifi}
                        label="Wi-Fi"
                        icon={<Wifi size={14} />}
                        color={C.cyan}
                        onToggle={() => updateTableField(t.id, { wifi: !t.wifi })}
                      />
                      <div style={{ gridColumn: '1/3', marginTop: 4 }}>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Niveau sonore</label>
                        <select
                          value={t.noise}
                          onChange={(e) => updateTableField(t.id, { noise: e.target.value as NoiseLevel })}
                          style={{ ...inputStyle, padding: '5px 8px' }}
                        >
                          {NOISE_OPTIONS.map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* MAINTENANCE */}
        {activeTab === 'maintenance' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Journal de maintenance</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted }}>Historique des interventions par table</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {tables.map((t) => (
                <div key={t.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>Table #{t.num}</div>
                    <button onClick={() => setMaintenanceTarget(t)} style={{ ...btnTiny, padding: '4px 10px', fontSize: 12 }}>
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>
                  {t.maintenance.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', padding: 12 }}>Aucune intervention</div>
                  ) : (
                    t.maintenance.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: 8,
                          background: C.bgSoft,
                          borderRadius: 8,
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ fontSize: 12, flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{m.action}</div>
                          <div style={{ color: C.muted, marginTop: 2 }}>
                            {m.date} · {m.tech}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMaintenance(t.id, m.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* QR CODES */}
        {activeTab === 'qrcodes' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>QR codes des tables</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
                  Générez et téléchargez les QR codes pour commande en ligne depuis chaque table
                </p>
              </div>
              <button onClick={downloadAllQR} style={btnPrimary}>
                <Download size={14} /> Exporter tout (PDF)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {tables.map((t) => {
                const salle = salles.find((s) => s.id === t.salleId)
                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -2 }}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      background: '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        background: `repeating-conic-gradient(${C.text} 0% 25%, #fff 0% 50%) 0/10px 10px`,
                        borderRadius: 8,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <QrCode size={48} color="#fff" style={{ background: C.text, padding: 8, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Table #{t.num}</div>
                    <div style={{ fontSize: 11, color: salle?.color, fontWeight: 600, marginBottom: 10 }}>{salle?.name}</div>
                    <button
                      onClick={() => downloadQR(t)}
                      style={{ ...btnGhost, width: '100%', justifyContent: 'center', padding: '6px 10px', fontSize: 12 }}
                    >
                      <Download size={12} /> Télécharger
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* TABLE MODAL */}
        <AnimatePresence>
          {showTableModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTableModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...card, width: 520, maxHeight: '85vh', overflow: 'auto' }}
              >
                <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
                  {editingTable ? 'Modifier la table' : 'Nouvelle table'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Numéro</label>
                    <input
                      type="number"
                      value={draftTable.num || ''}
                      onChange={(e) => setDraftTable({ ...draftTable, num: parseInt(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Forme</label>
                    <select
                      value={draftTable.shape}
                      onChange={(e) => setDraftTable({ ...draftTable, shape: e.target.value as Shape })}
                      style={inputStyle}
                    >
                      <option>Ronde</option>
                      <option>Carrée</option>
                      <option>Rectangle</option>
                      <option>Bar</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Places</label>
                    <input
                      type="number"
                      value={draftTable.seats || ''}
                      onChange={(e) => setDraftTable({ ...draftTable, seats: parseInt(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Statut</label>
                    <select
                      value={draftTable.status}
                      onChange={(e) => setDraftTable({ ...draftTable, status: e.target.value as Status })}
                      style={inputStyle}
                    >
                      <option value="active">Active</option>
                      <option value="reserved">Réservée</option>
                      <option value="disabled">Désactivée</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Vue</label>
                    <select
                      value={draftTable.view}
                      onChange={(e) => setDraftTable({ ...draftTable, view: e.target.value as ViewLabel })}
                      style={inputStyle}
                    >
                      {VIEW_OPTIONS.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Niveau sonore</label>
                    <select
                      value={draftTable.noise}
                      onChange={(e) => setDraftTable({ ...draftTable, noise: e.target.value as NoiseLevel })}
                      style={inputStyle}
                    >
                      {NOISE_OPTIONS.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Position X</label>
                    <input
                      type="number"
                      value={draftTable.x || ''}
                      onChange={(e) => setDraftTable({ ...draftTable, x: parseInt(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Position Y</label>
                    <input
                      type="number"
                      value={draftTable.y || ''}
                      onChange={(e) => setDraftTable({ ...draftTable, y: parseInt(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={labelStyle}>Salle</label>
                    <select
                      value={draftTable.salleId}
                      onChange={(e) => setDraftTable({ ...draftTable, salleId: e.target.value })}
                      style={inputStyle}
                    >
                      {salles.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setShowTableModal(false)} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>
                    Annuler
                  </button>
                  <button onClick={saveTableModal} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                    <Save size={14} /> Enregistrer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAINTENANCE MODAL */}
        <AnimatePresence>
          {maintenanceTarget && (
            <MaintenanceModal
              table={maintenanceTarget}
              onClose={() => setMaintenanceTarget(null)}
              onSubmit={(action, tech) => {
                addMaintenance(maintenanceTarget.id, action, tech)
                setMaintenanceTarget(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </SettingsLayout>
  )
}

/* ── small helpers ── */
function KPI({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${color}15`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color }}>{value}</div>
    </div>
  )
}

function AccessToggle({
  active,
  label,
  icon,
  color,
  onToggle,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  color: string
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${active ? color : C.border}`,
        background: active ? `${color}15` : '#fff',
        color: active ? color : C.muted,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon} {label}
    </button>
  )
}

function MaintenanceModal({
  table,
  onClose,
  onSubmit,
}: {
  table: Table
  onClose: () => void
  onSubmit: (action: string, tech: string) => void
}) {
  const [action, setAction] = useState('')
  const [tech, setTech] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ ...card, width: 400 }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>
          Intervention — Table #{table.num}
        </h3>
        <label style={labelStyle}>Description de l'action</label>
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Ex. Pied resserré, plateau nettoyé..."
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <label style={labelStyle}>Technicien / Employé</label>
        <input
          value={tech}
          onChange={(e) => setTech(e.target.value)}
          placeholder="Ex. Lucas, Marie..."
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>
            Annuler
          </button>
          <button
            onClick={() => onSubmit(action, tech)}
            disabled={!action.trim() || !tech.trim()}
            style={{ ...btnPrimary, flex: 1, justifyContent: 'center', opacity: action.trim() && tech.trim() ? 1 : 0.5 }}
          >
            <Save size={14} /> Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: C.muted,
  padding: '10px 12px',
  letterSpacing: 0.3,
}
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: C.indigo,
  border: 'none',
  cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  background: '#fff',
  border: `1px solid ${C.border}`,
  cursor: 'pointer',
}
const btnTiny: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: '#fff',
  cursor: 'pointer',
}
