import { useState } from 'react'
import { usePOS, MenuItem, Table, TableShape, MENU_CATEGORIES, DEFAULT_TABLES, DEFAULT_MENU } from '../store/posStore'

interface Props { onBack: () => void }

type ConfigTab = 'menu' | 'tables' | 'settings'

const SHAPES: { id: TableShape; label: string; icon: string }[] = [
  { id: 'round',  label: 'Ronde',       icon: '⬤' },
  { id: 'square', label: 'Carrée',      icon: '■' },
  { id: 'rect',   label: 'Rectangle',   icon: '▬' },
  { id: 'bar',    label: 'Bar/Comptoir', icon: '▬' },
]

const SECTIONS = ['Salle', 'Bar', 'Terrasse']
const EMOJIS = ['☕','🍺','🍷','🥂','🍾','🍹','🍸','🫗','💧','🥤','🍊','🫖','🥩','🧀','🍔','🥪','🥗','🍝','🍟','🍮','🍫','🍨','🎂','🥐','🍕','🌮']

// ─── Shared styles ────────────────────────────────────────────────────────────
function tabBtn(active: boolean) {
  return {
    padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#a5b4fc' : '#64748b',
  }
}

function inputStyle(small = false) {
  return {
    width: '100%', padding: small ? '6px 10px' : '9px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0', fontSize: small ? 12 : 13, outline: 'none',
  }
}

function label(text: string) {
  return <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>{text.toUpperCase()}</div>
}

function dangerBtn() {
  return {
    padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
    border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.08)',
    color: '#fb7185', fontWeight: 600, flexShrink: 0,
  }
}

// ─── Menu editor ──────────────────────────────────────────────────────────────
function MenuEditor() {
  const menu = usePOS(s => s.menu)
  const addMenuItem = usePOS(s => s.addMenuItem)
  const updateMenuItem = usePOS(s => s.updateMenuItem)
  const removeMenuItem = usePOS(s => s.removeMenuItem)
  const toggleMenuItem = usePOS(s => s.toggleMenuItem)

  const [activeCategory, setActiveCategory] = useState<string>(MENU_CATEGORIES[0])
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '', category: MENU_CATEGORIES[0], emoji: '🍺' })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const filtered = menu.filter(m => m.category === activeCategory)

  function handleAdd() {
    const price = parseFloat(newItem.price)
    if (!newItem.name.trim() || isNaN(price)) return
    addMenuItem({ name: newItem.name.trim(), price, category: newItem.category, emoji: newItem.emoji, active: true })
    setNewItem({ name: '', price: '', category: newItem.category, emoji: '🍺' })
    setShowAdd(false)
  }

  function handleUpdate() {
    if (!editing) return
    updateMenuItem(editing.id, { name: editing.name, price: editing.price, emoji: editing.emoji, category: editing.category })
    setEditing(null)
  }

  return (
    <div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' as const }}>
        {MENU_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={tabBtn(activeCategory === cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => setShowAdd(v => !v)}
          style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
          }}
        >
          + Ajouter un article
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          marginBottom: 16, padding: 16, borderRadius: 14,
          border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              {label('Nom')}
              <input style={inputStyle()} placeholder="Nom de l'article" value={newItem.name}
                onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div>
              {label('Prix (€)')}
              <input style={inputStyle()} type="number" placeholder="0.00" value={newItem.price}
                onChange={e => setNewItem(v => ({ ...v, price: e.target.value }))} />
            </div>
            <div>
              {label('Catégorie')}
              <select value={newItem.category} onChange={e => setNewItem(v => ({ ...v, category: e.target.value }))}
                style={{ ...inputStyle(), cursor: 'pointer' }}>
                {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {label('Emoji')}
              <button onClick={() => setShowEmojiPicker(v => !v)} style={{
                ...inputStyle(), cursor: 'pointer', textAlign: 'left' as const, fontSize: 18,
              }}>{newItem.emoji}</button>
              {showEmojiPicker && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: 10, marginTop: 6,
                  background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => { setNewItem(v => ({ ...v, emoji: e })); setShowEmojiPicker(false) }}
                      style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ ...dangerBtn(), color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
              Annuler
            </button>
            <button onClick={handleAdd} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
            }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
        {filtered.map(item => (
          <div key={item.id}>
            {editing?.id === item.id ? (
              <div style={{
                padding: 14, borderRadius: 12,
                border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    {label('Nom')}
                    <input style={inputStyle()} value={editing.name}
                      onChange={e => setEditing(v => v ? { ...v, name: e.target.value } : v)} />
                  </div>
                  <div>
                    {label('Prix (€)')}
                    <input style={inputStyle()} type="number" value={editing.price}
                      onChange={e => setEditing(v => v ? { ...v, price: parseFloat(e.target.value) || 0 } : v)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditing(null)} style={{ ...dangerBtn(), color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Annuler
                  </button>
                  <button onClick={handleUpdate} style={{
                    padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  }}>
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.05)', background: item.active ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.2)',
                opacity: item.active ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>{item.price.toFixed(2)} €</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleMenuItem(item.id)} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    border: `1px solid ${item.active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    background: item.active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                    color: item.active ? '#10b981' : '#475569', fontWeight: 600,
                  }}>
                    {item.active ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => setEditing(item)} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8', fontWeight: 600,
                  }}>✏️</button>
                  <button onClick={() => removeMenuItem(item.id)} style={dangerBtn()}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#374151', fontSize: 13 }}>
            Aucun article dans cette catégorie
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Table layout editor ──────────────────────────────────────────────────────
function TableEditor() {
  const tables = usePOS(s => s.tables)
  const addTable = usePOS(s => s.addTable)
  const updateTable = usePOS(s => s.updateTable)
  const removeTable = usePOS(s => s.removeTable)

  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTable, setNewTable] = useState({
    name: '', seats: '4', shape: 'round' as TableShape, section: 'Salle',
    x: '200', y: '200',
  })

  const editTable = tables.find(t => t.id === editing)

  function handleAdd() {
    const seats = parseInt(newTable.seats)
    const x = parseInt(newTable.x)
    const y = parseInt(newTable.y)
    if (!newTable.name.trim() || isNaN(seats)) return
    addTable({
      id: `t_${Date.now()}`,
      name: newTable.name.trim(),
      seats,
      shape: newTable.shape,
      section: newTable.section,
      x: isNaN(x) ? 200 : x,
      y: isNaN(y) ? 200 : y,
    })
    setNewTable({ name: '', seats: '4', shape: 'round', section: 'Salle', x: '200', y: '200' })
    setShowAdd(false)
  }

  function handleSave(id: string, updates: Partial<Table>) {
    updateTable(id, updates)
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowAdd(v => !v)} style={{
          padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
        }}>
          + Ajouter une table
        </button>
      </div>

      {showAdd && (
        <div style={{
          marginBottom: 16, padding: 16, borderRadius: 14,
          border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              {label('Nom')}
              <input style={inputStyle()} placeholder="Table 1" value={newTable.name}
                onChange={e => setNewTable(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div>
              {label('Places')}
              <input style={inputStyle()} type="number" value={newTable.seats}
                onChange={e => setNewTable(v => ({ ...v, seats: e.target.value }))} />
            </div>
            <div>
              {label('Forme')}
              <select value={newTable.shape} onChange={e => setNewTable(v => ({ ...v, shape: e.target.value as TableShape }))}
                style={{ ...inputStyle(), cursor: 'pointer' }}>
                {SHAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              {label('Zone')}
              <select value={newTable.section} onChange={e => setNewTable(v => ({ ...v, section: e.target.value }))}
                style={{ ...inputStyle(), cursor: 'pointer' }}>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ ...dangerBtn(), color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
              Annuler
            </button>
            <button onClick={handleAdd} style={{
              padding: '5px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
            }}>Ajouter</button>
          </div>
        </div>
      )}

      {/* Tables grouped by section */}
      {SECTIONS.map(section => {
        const sectionTables = tables.filter(t => t.section === section)
        if (!sectionTables.length) return null
        return (
          <div key={section} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>
              {section.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {sectionTables.map(t => (
                <div key={t.id}>
                  {editing === t.id && editTable ? (
                    <TableEditRow table={editTable} onSave={u => handleSave(t.id, u)} onCancel={() => setEditing(null)} />
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                          {t.seats} places · {SHAPES.find(s => s.id === t.shape)?.label} · pos ({t.x},{t.y})
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditing(t.id)} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                          color: '#94a3b8', fontWeight: 600,
                        }}>✏️</button>
                        <button
                          onClick={() => { if (confirm(`Supprimer ${t.name} ?`)) removeTable(t.id) }}
                          disabled={t.status === 'occupied'}
                          style={{ ...dangerBtn(), opacity: t.status === 'occupied' ? 0.4 : 1 }}
                        >✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TableEditRow({ table, onSave, onCancel }: { table: Table; onSave: (u: Partial<Table>) => void; onCancel: () => void }) {
  const [name, setName] = useState(table.name)
  const [seats, setSeats] = useState(String(table.seats))
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [section, setSection] = useState(table.section)
  const [x, setX] = useState(String(table.x))
  const [y, setY] = useState(String(table.y))

  return (
    <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>{label('Nom')}<input style={inputStyle()} value={name} onChange={e => setName(e.target.value)} /></div>
        <div>{label('Places')}<input style={inputStyle()} type="number" value={seats} onChange={e => setSeats(e.target.value)} /></div>
        <div>
          {label('Forme')}
          <select value={shape} onChange={e => setShape(e.target.value as TableShape)} style={{ ...inputStyle(), cursor: 'pointer' }}>
            {SHAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          {label('Zone')}
          <select value={section} onChange={e => setSection(e.target.value)} style={{ ...inputStyle(), cursor: 'pointer' }}>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>{label('Position X')}<input style={inputStyle()} type="number" value={x} onChange={e => setX(e.target.value)} /></div>
        <div>{label('Position Y')}<input style={inputStyle()} type="number" value={y} onChange={e => setY(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ ...dangerBtn(), color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>Annuler</button>
        <button onClick={() => onSave({ name, seats: parseInt(seats) || table.seats, shape, section, x: parseInt(x) || table.x, y: parseInt(y) || table.y })}
          style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
          Sauvegarder
        </button>
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsEditor() {
  const settings = usePOS(s => s.settings)
  const updateSettings = usePOS(s => s.updateSettings)
  const resetData = usePOS(s => s.resetData)
  const [saved, setSaved] = useState(false)
  const [local, setLocal] = useState({ ...settings })

  function handleSave() {
    updateSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, marginBottom: 28 }}>
        <div>
          {label('Nom du restaurant')}
          <input style={inputStyle()} value={local.restaurantName}
            onChange={e => setLocal(v => ({ ...v, restaurantName: e.target.value }))} />
        </div>
        <div>
          {label('Devise')}
          <input style={inputStyle()} value={local.currency}
            onChange={e => setLocal(v => ({ ...v, currency: e.target.value }))} />
        </div>
        <div>
          {label('TVA (%)')}
          <input style={inputStyle()} type="number" value={local.taxRate}
            onChange={e => setLocal(v => ({ ...v, taxRate: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          {label('Pourboire par défaut (%)')}
          <input style={inputStyle()} type="number" value={local.defaultTip}
            onChange={e => setLocal(v => ({ ...v, defaultTip: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          {label('Préréglages pourboire (séparés par virgule)')}
          <input
            style={inputStyle()}
            value={local.tipPresets.join(', ')}
            onChange={e => {
              const vals = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
              setLocal(v => ({ ...v, tipPresets: vals }))
            }}
          />
        </div>
      </div>

      <button onClick={handleSave} style={{
        display: 'block', width: '100%', padding: '12px 0', borderRadius: 12,
        border: saved ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(99,102,241,0.4)',
        background: saved ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.15)',
        color: saved ? '#10b981' : '#a5b4fc', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        marginBottom: 32, transition: 'all .3s',
      }}>
        {saved ? '✓ Paramètres sauvegardés' : 'Sauvegarder les paramètres'}
      </button>

      {/* Danger zone */}
      <div style={{
        padding: 20, borderRadius: 14,
        border: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.04)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fb7185', marginBottom: 4 }}>Zone de danger</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
          Réinitialise toutes les tables et le menu aux valeurs par défaut. Les données de commande en cours seront perdues.
        </div>
        <button
          onClick={() => { if (confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) resetData() }}
          style={{
            padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: '1px solid rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.15)', color: '#fb7185',
          }}
        >
          Réinitialiser les données
        </button>
      </div>
    </div>
  )
}

// ─── Main config page ─────────────────────────────────────────────────────────
export default function ConfigPage({ onBack }: Props) {
  const [tab, setTab] = useState<ConfigTab>('menu')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#07070d' }}>
      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0, background: '#0a0a14',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column' as const, padding: '20px 12px', gap: 4,
      }}>
        {([
          { id: 'menu',     label: 'Menu',    icon: '🍽️' },
          { id: 'tables',   label: 'Tables',  icon: '🪑' },
          { id: 'settings', label: 'Réglages', icon: '⚙️' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: tab === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: tab === t.id ? '#a5b4fc' : '#64748b',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 500, textAlign: 'left' as const,
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 24, letterSpacing: '-0.02em' }}>
          {tab === 'menu' ? '🍽️ Gestion du menu' : tab === 'tables' ? '🪑 Plan des tables' : '⚙️ Paramètres'}
        </div>

        {tab === 'menu'     && <MenuEditor />}
        {tab === 'tables'   && <TableEditor />}
        {tab === 'settings' && <SettingsEditor />}
      </div>
    </div>
  )
}
