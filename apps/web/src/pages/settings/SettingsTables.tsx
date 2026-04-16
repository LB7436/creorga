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
type Table = { id: string; num: number; shape: Shape; seats: number; x: number; y: number; status: Status; salleId: string }
type Salle = { id: string; name: string; color: string }

const INITIAL_SALLES: Salle[] = [
  { id: 's1', name: 'Salle principale', color: '#6366f1' },
  { id: 's2', name: 'Bar', color: '#f59e0b' },
  { id: 's3', name: 'Terrasse', color: '#10b981' },
]

const INITIAL_TABLES: Table[] = [
  { id: 't1', num: 1, shape: 'Ronde', seats: 4, x: 60, y: 60, status: 'active', salleId: 's1' },
  { id: 't2', num: 2, shape: 'Ronde', seats: 4, x: 160, y: 60, status: 'active', salleId: 's1' },
  { id: 't3', num: 3, shape: 'Carrée', seats: 2, x: 260, y: 60, status: 'active', salleId: 's1' },
  { id: 't4', num: 4, shape: 'Rectangle', seats: 6, x: 60, y: 160, status: 'reserved', salleId: 's1' },
  { id: 't5', num: 5, shape: 'Carrée', seats: 4, x: 200, y: 160, status: 'active', salleId: 's1' },
  { id: 't6', num: 6, shape: 'Ronde', seats: 4, x: 320, y: 160, status: 'active', salleId: 's1' },
  { id: 't7', num: 7, shape: 'Rectangle', seats: 8, x: 60, y: 260, status: 'active', salleId: 's1' },
  { id: 't8', num: 8, shape: 'Carrée', seats: 2, x: 240, y: 260, status: 'disabled', salleId: 's1' },
  { id: 't9', num: 10, shape: 'Bar', seats: 1, x: 40, y: 40, status: 'active', salleId: 's2' },
  { id: 't10', num: 11, shape: 'Bar', seats: 1, x: 100, y: 40, status: 'active', salleId: 's2' },
  { id: 't11', num: 20, shape: 'Ronde', seats: 4, x: 80, y: 80, status: 'active', salleId: 's3' },
  { id: 't12', num: 21, shape: 'Ronde', seats: 6, x: 220, y: 80, status: 'active', salleId: 's3' },
]

export default function SettingsTables() {
  const [salles, setSalles] = useState(INITIAL_SALLES)
  const [tables, setTables] = useState(INITIAL_TABLES)
  const [selectedSalle, setSelectedSalle] = useState('s1')
  const [editingSalle, setEditingSalle] = useState<string | null>(null)
  const [showTableModal, setShowTableModal] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [draftTable, setDraftTable] = useState<Partial<Table>>({})
  const [dragId, setDragId] = useState<string | null>(null)

  const salleTables = useMemo(() => tables.filter((t) => t.salleId === selectedSalle), [tables, selectedSalle])
  const currentSalle = salles.find((s) => s.id === selectedSalle)!

  const totalTables = tables.length
  const totalSalles = salles.length
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)

  const openEditTable = (t?: Table) => {
    if (t) {
      setEditingTable(t)
      setDraftTable({ ...t })
    } else {
      setEditingTable(null)
      setDraftTable({ num: (Math.max(0, ...salleTables.map((x) => x.num)) || 0) + 1, shape: 'Ronde', seats: 4, x: 100, y: 100, status: 'active', salleId: selectedSalle })
    }
    setShowTableModal(true)
  }

  const saveTableModal = () => {
    if (!draftTable.num) {
      toast.error('Numéro requis')
      return
    }
    if (editingTable) {
      setTables((all) => all.map((t) => (t.id === editingTable.id ? { ...(t as Table), ...draftTable } as Table : t)))
      toast.success('Table modifiée')
    } else {
      const id = `t${Date.now()}`
      setTables((all) => [...all, { id, ...(draftTable as Table) }])
      toast.success('Table ajoutée')
    }
    setShowTableModal(false)
  }

  const deleteTable = (id: string) => {
    setTables((all) => all.filter((t) => t.id !== id))
    toast.success('Table supprimée')
  }

  const updateTableField = (id: string, patch: Partial<Table>) => {
    setTables((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const renumberTables = () => {
    let i = 1
    setTables((all) => all.map((t) => (t.salleId === selectedSalle ? { ...t, num: i++ } : t)))
    toast.success('Tables renumérotées')
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
              {totalTables} tables · {totalSalles} salles · {totalSeats} places
            </p>
          </div>
          <button
            onClick={() => toast('Éditeur visuel disponible dans le POS standalone', { icon: '🎨' })}
            style={btnPrimary}
          >
            <ExternalLink size={15} /> Ouvrir l'éditeur visuel
          </button>
        </motion.div>

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
                <svg viewBox="0 0 400 350" style={{ width: '100%', height: 160 }}>
                  <rect x="0" y="0" width="400" height="350" fill={`${currentSalle.color}08`} rx="8" />
                  {salleTables.map((t) => {
                    const base = { fill: t.status === 'reserved' ? C.amber : t.status === 'disabled' ? '#cbd5e1' : currentSalle.color, stroke: '#fff', strokeWidth: 2 }
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
                    <th style={th}>N° table</th>
                    <th style={th}>Forme</th>
                    <th style={th}>Places</th>
                    <th style={th}>Position X</th>
                    <th style={th}>Position Y</th>
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
                        </div>
                      </td>
                      <td style={td}>
                        <select
                          value={t.shape}
                          onChange={(e) => updateTableField(t.id, { shape: e.target.value as Shape })}
                          style={{ ...inputStyle, padding: '4px 8px', width: 120 }}
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
                          style={{ ...inputStyle, padding: '4px 8px', width: 60 }}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          value={t.x}
                          onChange={(e) => updateTableField(t.id, { x: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, padding: '4px 8px', width: 70 }}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          value={t.y}
                          onChange={(e) => updateTableField(t.id, { y: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, padding: '4px 8px', width: 70 }}
                        />
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

        {/* MODAL */}
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
                style={{ ...card, width: 440 }}
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
      </div>
    </SettingsLayout>
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
