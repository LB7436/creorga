import { useState, useMemo } from 'react'
import { usePOS, Cover, MenuItem, coverTotal, tableTotal, MENU_CATEGORIES } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onPay: () => void
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const C = {
  page: {
    display: 'flex' as const,
    height: '100%',
    overflow: 'hidden',
    background: '#07070d',
  },
  // Left panel — order
  left: {
    width: 400,
    flexShrink: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    background: '#0a0a14',
  },
  // Right panel — menu
  right: {
    flex: 1,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
}

function pill(active: boolean, color = '#6366f1') {
  return {
    padding: '5px 14px',
    borderRadius: 20,
    border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.08)'}`,
    background: active ? color + '20' : 'transparent',
    color: active ? color : '#64748b',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
    whiteSpace: 'nowrap' as const,
  }
}

// ─── Cover tab bar ────────────────────────────────────────────────────────────
function CoverTabs({
  tableId, covers, activeCoverId, onChange,
}: {
  tableId: string; covers: Cover[]; activeCoverId: string | null; onChange: (id: string) => void
}) {
  const addCover = usePOS(s => s.addCover)
  const removeCover = usePOS(s => s.removeCover)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 14px', overflowX: 'auto',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      {covers.map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            onClick={() => onChange(c.id)}
            style={pill(activeCoverId === c.id)}
          >
            {c.label}
            {c.items.length > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>·{coverTotal(c).toFixed(0)}€</span>
            )}
          </button>
          {covers.length > 1 && (
            <button
              onClick={() => { removeCover(tableId, c.id); if (activeCoverId === c.id) onChange(covers[0].id) }}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: '0 2px', marginLeft: 1 }}
            >×</button>
          )}
        </div>
      ))}
      <button
        onClick={() => { addCover(tableId); }}
        style={{ ...pill(false), minWidth: 28, padding: '5px 8px' }}
      >+ Couvert</button>
    </div>
  )
}

// ─── Order item row ──────────────────────────────────────────────────────────
function OrderItemRow({ tableId, item, otherCovers }: {
  tableId: string
  item: { id: string; name: string; price: number; qty: number; note: string; coverId: string }
  otherCovers: Cover[]
}) {
  const [showNote, setShowNote] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const setItemQty = usePOS(s => s.setItemQty)
  const setItemNote = usePOS(s => s.setItemNote)
  const moveItemToCover = usePOS(s => s.moveItemToCover)

  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Qty controls */}
        <button onClick={() => setItemQty(tableId, item.id, item.qty - 1)}
          style={qtyBtn()}>−</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
        <button onClick={() => setItemQty(tableId, item.id, item.qty + 1)}
          style={qtyBtn()}>+</button>

        {/* Name + note */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </div>
          {item.note && (
            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 1 }}>📝 {item.note}</div>
          )}
        </div>

        {/* Price */}
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
          {(item.price * item.qty).toFixed(2)}€
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowNote(v => !v)} title="Note"
            style={{ ...iconBtn(), color: item.note ? '#6366f1' : '#475569' }}>✏️</button>
          {otherCovers.length > 0 && (
            <button onClick={() => setShowMove(v => !v)} title="Déplacer"
              style={iconBtn()}>⇄</button>
          )}
        </div>
      </div>

      {/* Note input */}
      {showNote && (
        <div style={{ marginTop: 8, paddingLeft: 60 }}>
          <input
            autoFocus
            placeholder="Note de cuisine…"
            value={item.note}
            onChange={e => setItemNote(tableId, item.id, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setShowNote(false)}
            style={noteInput()}
          />
        </div>
      )}

      {/* Move to cover */}
      {showMove && (
        <div style={{ marginTop: 8, paddingLeft: 60, display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {otherCovers.map(c => (
            <button key={c.id} onClick={() => { moveItemToCover(tableId, item.id, c.id); setShowMove(false) }}
              style={{ ...pill(false), fontSize: 11 }}>
              → {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function qtyBtn() {
  return {
    width: 26, height: 26, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#94a3b8', fontSize: 16, cursor: 'pointer',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    flexShrink: 0,
  }
}

function iconBtn() {
  return {
    width: 28, height: 28, borderRadius: 8,
    border: 'none', background: 'rgba(255,255,255,0.04)',
    color: '#475569', fontSize: 13, cursor: 'pointer',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  }
}

function noteInput() {
  return {
    width: '100%', padding: '6px 10px', borderRadius: 8,
    border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)',
    color: '#e2e8f0', fontSize: 12, outline: 'none',
  }
}

// ─── Menu item card ──────────────────────────────────────────────────────────
function MenuCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const [flash, setFlash] = useState(false)
  function handle() {
    onAdd()
    setFlash(true)
    setTimeout(() => setFlash(false), 200)
  }
  return (
    <button
      onClick={handle}
      style={{
        display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start',
        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        border: flash ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.06)',
        background: flash ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
        transition: 'all .15s', textAlign: 'left' as const,
        transform: flash ? 'scale(0.97)' : 'scale(1)',
      }}
    >
      <span style={{ fontSize: 20, marginBottom: 4 }}>{item.emoji}</span>
      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>
        {item.name}
      </span>
      <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 700 }}>
        {item.price.toFixed(2)}€
      </span>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrderPage({ tableId, onBack, onPay }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const addItem = usePOS(s => s.addItem)
  const addCover = usePOS(s => s.addCover)
  const renameCover = usePOS(s => s.renameCover)
  const mergeTables = usePOS(s => s.mergeTables)
  const tables = usePOS(s => s.tables)

  const [activeCoverId, setActiveCoverId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(MENU_CATEGORIES[0])
  const [search, setSearch] = useState('')
  const [editingCoverLabel, setEditingCoverLabel] = useState<string | null>(null)
  const [coverLabelInput, setCoverLabelInput] = useState('')
  const [showMerge, setShowMerge] = useState(false)

  if (!table) return null

  const resolvedCoverId = activeCoverId && table.covers.find(c => c.id === activeCoverId)
    ? activeCoverId
    : table.covers[0]?.id ?? null

  const activeCover = table.covers.find(c => c.id === resolvedCoverId)
  const otherCovers = table.covers.filter(c => c.id !== resolvedCoverId)

  const filteredMenu = useMemo(() => {
    const base = menu.filter(m => m.active && m.category === activeCategory)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return menu.filter(m => m.active && m.name.toLowerCase().includes(q))
  }, [menu, activeCategory, search])

  const total = tableTotal(table)
  const mergeableTable = tables.find(t => t.id !== tableId && t.status === 'occupied' && !t.isMergedInto)

  function handleAddItem(item: MenuItem) {
    if (!resolvedCoverId) return
    addItem(tableId, resolvedCoverId, item)
  }

  function startRenaming(cover: Cover) {
    setEditingCoverLabel(cover.id)
    setCoverLabelInput(cover.label)
  }

  function commitRename() {
    if (editingCoverLabel && coverLabelInput.trim()) {
      renameCover(tableId, editingCoverLabel, coverLabelInput.trim())
    }
    setEditingCoverLabel(null)
  }

  return (
    <div style={C.page}>
      {/* ── Left: Order panel ── */}
      <div style={C.left}>
        {/* Cover tabs */}
        <CoverTabs
          tableId={tableId}
          covers={table.covers}
          activeCoverId={resolvedCoverId}
          onChange={setActiveCoverId}
        />

        {/* Cover header with rename */}
        {activeCover && (
          <div style={{
            padding: '8px 14px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}>
            {editingCoverLabel === activeCover.id ? (
              <input
                autoFocus
                value={coverLabelInput}
                onChange={e => setCoverLabelInput(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename() }}
                style={{ ...noteInput(), fontSize: 13, fontWeight: 600 }}
              />
            ) : (
              <button
                onClick={() => startRenaming(activeCover)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
              >
                {activeCover.label} ✏️
              </button>
            )}
            <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>
              {coverTotal(activeCover).toFixed(2)} €
            </span>
          </div>
        )}

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeCover && activeCover.items.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#374151' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
              <div style={{ fontSize: 13 }}>Aucun article</div>
            </div>
          )}
          {activeCover?.items.map(item => (
            <OrderItemRow
              key={item.id}
              tableId={tableId}
              item={item}
              otherCovers={otherCovers}
            />
          ))}
          {/* Other covers summary */}
          {otherCovers.length > 0 && otherCovers.some(c => c.items.length > 0) && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {otherCovers.filter(c => c.items.length > 0).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: '#475569' }}>{coverTotal(c).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 14px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          {/* Merged tables notice */}
          {table.mergedWith.length > 0 && (
            <div style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 10 }}>
              🔗 Jumelée avec: {table.mergedWith.map(id => tables.find(t => t.id === id)?.name ?? id).join(', ')}
            </div>
          )}

          {/* Merge button */}
          {showMerge && mergeableTable && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Jumeler avec:</div>
              {tables.filter(t => t.status === 'occupied' && t.id !== tableId && !t.isMergedInto).map(t => (
                <button
                  key={t.id}
                  onClick={() => { mergeTables(t.id, tableId); setShowMerge(false) }}
                  style={{ ...pill(false, '#8b5cf6'), display: 'block', marginBottom: 4, width: '100%', textAlign: 'center' as const }}
                >
                  ← {t.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#475569' }}>Total table</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>{total.toFixed(2)} €</div>
            </div>
            {mergeableTable && (
              <button onClick={() => setShowMerge(v => !v)} style={pill(showMerge, '#8b5cf6')}>
                🔗 Jumeler
              </button>
            )}
          </div>

          <button
            onClick={onPay}
            disabled={total === 0}
            style={{
              display: 'block', width: '100%', padding: '13px 0',
              borderRadius: 14, border: 'none',
              background: total > 0 ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)',
              color: total > 0 ? '#fff' : '#374151',
              fontSize: 15, fontWeight: 700, cursor: total > 0 ? 'pointer' : 'default',
              boxShadow: total > 0 ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
              transition: 'all .2s',
            }}
          >
            Passer au paiement →
          </button>
        </div>
      </div>

      {/* ── Right: Menu panel ── */}
      <div style={C.right}>
        {/* Search + categories */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0, display: 'flex', gap: 8, flexDirection: 'column' as const,
        }}>
          <input
            placeholder="Rechercher un article…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
              color: '#e2e8f0', fontSize: 13, outline: 'none',
            }}
          />
          {!search && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' as const, paddingBottom: 2 }}>
              {MENU_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={pill(activeCategory === cat)}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* No cover selected warning */}
        {!resolvedCoverId && (
          <div style={{ padding: 24, textAlign: 'center', color: '#374151' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 13 }}>Sélectionnez un couvert pour ajouter des articles</div>
          </div>
        )}

        {/* Menu grid */}
        {resolvedCoverId && (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 10, alignContent: 'start',
          }}>
            {filteredMenu.map(item => (
              <MenuCard key={item.id} item={item} onAdd={() => handleAddItem(item)} />
            ))}
            {filteredMenu.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#374151' }}>
                Aucun article trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
