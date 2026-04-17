import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Cover, OrderItem, coverTotal, tableTotal, elapsed, MENU_CATEGORIES } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onPay: () => void
}

// ─── Category icons ─────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Boissons': '🥤', 'Bieres': '🍺', 'Bières': '🍺',
  'Vins': '🍷', 'Cocktails': '🍹', 'Cuisine': '🍽️', 'Desserts': '🍰',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Boissons': '#38bdf8', 'Bieres': '#fbbf24', 'Bières': '#fbbf24',
  'Vins': '#c084fc', 'Cocktails': '#fb7185', 'Cuisine': '#f97316', 'Desserts': '#a78bfa',
}

// ─── Courses ─────────────────────────────────────────────────────────────
const COURSES = [
  { id: 'aperitif', label: 'Apéritif', color: '#fbbf24', icon: '🥂' },
  { id: 'entree',   label: 'Entrée',   color: '#34d399', icon: '🥗' },
  { id: 'plat',     label: 'Plat',     color: '#f97316', icon: '🍽' },
  { id: 'dessert',  label: 'Dessert',  color: '#c084fc', icon: '🍰' },
  { id: 'boisson',  label: 'Boisson',  color: '#38bdf8', icon: '🍺' },
] as const

// ─── Modifiers ─────────────────────────────────────────────────────────
interface Modifier { label: string; extra: number }
interface ModifierGroup { id: string; label: string; modifiers: Modifier[]; single?: boolean }

const MODIFIER_GROUPS: ModifierGroup[] = [
  { id: 'cuisson', label: 'Cuisson', single: true, modifiers: [
    { label: 'Saignant', extra: 0 },
    { label: 'À point', extra: 0 },
    { label: 'Bien cuit', extra: 0 },
  ]},
  { id: 'sauces', label: 'Sauces extra', modifiers: [
    { label: 'Mayo', extra: 0.5 },
    { label: 'Ketchup', extra: 0.5 },
    { label: 'Poivre', extra: 1 },
    { label: 'Béarnaise', extra: 1.5 },
  ]},
  { id: 'sans', label: 'Sans', modifiers: [
    { label: 'Sans gluten', extra: 2 },
    { label: 'Sans lactose', extra: 1 },
    { label: 'Sans oignon', extra: 0 },
  ]},
]

const WEIGHTED_CATEGORIES = new Set(['Cuisine'])
const WEIGHTED_KEYWORDS = ['fromage', 'charcuterie', 'viande']

// ─── Mock clients / staff ───────────────────────────────────────────────
interface MockClient { id: string; name: string; phone: string; tier: 'Gold' | 'Silver' | 'Bronze' | 'Guest'; points: number; discount: number }

const MOCK_CLIENTS: MockClient[] = [
  { id: 'cl1', name: 'Jean Dupont',   phone: '+352 621 123 456', tier: 'Gold',   points: 2450, discount: 15 },
  { id: 'cl2', name: 'Marie Weber',   phone: '+352 691 234 567', tier: 'Silver', points: 1280, discount: 10 },
  { id: 'cl3', name: 'Pierre Muller', phone: '+352 661 345 678', tier: 'Bronze', points: 340,  discount: 5 },
  { id: 'cl4', name: 'Sophie Klein',  phone: '+352 621 456 789', tier: 'Silver', points: 980,  discount: 10 },
  { id: 'cl5', name: 'Luc Braun',     phone: '+352 691 567 890', tier: 'Guest',  points: 0,    discount: 0 },
]

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Gold':   { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
  'Silver': { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', text: '#94a3b8' },
  'Bronze': { bg: 'rgba(217,119,6,0.15)',   border: 'rgba(217,119,6,0.4)',   text: '#d97706' },
  'Guest':  { bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.3)', text: '#64748b' },
}

// ─── Mock order history ─────────────────────────────────────────────────────
interface HistoryOrder { id: string; time: string; total: number; itemCount: number; label: string }
const MOCK_HISTORY: HistoryOrder[] = [
  { id: 'h1', time: '12:45', total: 47.50, itemCount: 5, label: '2 Burger, 2 Coca, 1 café' },
  { id: 'h2', time: '14:20', total: 28.00, itemCount: 3, label: '1 Salade, 2 Limonade' },
  { id: 'h3', time: '15:10', total: 18.50, itemCount: 2, label: '2 Cafés, 1 Tiramisu' },
]

// ─── Helper ─────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toFixed(2).replace('.', ',')
const isWeighted = (item: { name: string; category?: string }) =>
  WEIGHTED_CATEGORIES.has(item.category ?? '') && WEIGHTED_KEYWORDS.some(k => item.name.toLowerCase().includes(k))

// ─── Page ─────────────────────────────────────────────────────────────────
export default function OrderPage({ tableId, onBack, onPay }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const tables = usePOS(s => s.tables)
  const addItem = usePOS(s => s.addItem)
  const setItemQty = usePOS(s => s.setItemQty)
  const setItemNote = usePOS(s => s.setItemNote)
  const removeItem = usePOS(s => s.removeItem)
  const moveItemToCover = usePOS(s => s.moveItemToCover)
  const addCover = usePOS(s => s.addCover)

  const [activeCover, setActiveCover] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(MENU_CATEGORIES[0])
  const [course, setCourse] = useState<string>('plat')
  const [search, setSearch] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Feature modals
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [showRemise, setShowRemise] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showCuisine, setShowCuisine] = useState(false)
  const [showModifiers, setShowModifiers] = useState<string | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showSplitItem, setShowSplitItem] = useState(false)
  const [showWeight, setShowWeight] = useState<string | null>(null)

  // Data state
  const [selectedClient, setSelectedClient] = useState<MockClient | null>(null)
  const [discount, setDiscount] = useState<{ type: 'percent' | 'amount'; value: number } | null>(null)
  const [offeredItems, setOfferedItems] = useState<Set<string>>(new Set())
  const [itemModifiers, setItemModifiers] = useState<Record<string, Modifier[]>>({})
  const [itemWeights, setItemWeights] = useState<Record<string, number>>({})
  const [onHold, setOnHold] = useState(false)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [favoriteIds] = useState<string[]>(['m7', 'm21', 'm14', 'm4', 'm11', 'm26'])

  const currentCover = useMemo(
    () => table?.covers.find(c => c.id === activeCover) ?? table?.covers[0],
    [table, activeCover]
  )

  // Set initial cover
  useEffect(() => {
    if (table && !activeCover && table.covers.length > 0) {
      setActiveCover(table.covers[0].id)
    }
  }, [table, activeCover])

  // ── Filter menu (search by name/category/price)
  const filteredMenu = useMemo(() => {
    const base = menu.filter(m => m.active && m.category === category)
    if (!search.trim()) return base
    const q = search.trim().toLowerCase()
    // Price filter: "<10", "<10€", ">5"
    const priceMatch = q.match(/^([<>])\s*(\d+(?:[.,]\d+)?)/)
    const all = menu.filter(m => m.active)
    if (priceMatch) {
      const op = priceMatch[1]
      const val = parseFloat(priceMatch[2].replace(',', '.'))
      return all.filter(m => op === '<' ? m.price < val : m.price > val)
    }
    return all.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.price.toString().includes(q)
    )
  }, [menu, category, search])

  // ── Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === 'F1') { e.preventDefault(); setShowRemise(true) }
      else if (e.key === 'F2') { e.preventDefault(); setShowNote(true) }
      else if (e.key === 'F3') { e.preventDefault(); setShowCuisine(true) }
      else if (e.key === 'F4') { e.preventDefault(); onPay() }
      else if (e.key === 'Escape') { e.preventDefault(); onBack() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onBack, onPay])

  if (!table || !currentCover) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070d', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onBack} style={btnDark}>Retour</button>
      </div>
    )
  }

  // ── Add item
  const handleAddItem = (menuItem: typeof menu[number]) => {
    if (onHold) return
    addItem(tableId, currentCover.id, menuItem)
    setRecentIds(prev => [menuItem.id, ...prev.filter(id => id !== menuItem.id)].slice(0, 6))
    // Weighted prompt
    if (isWeighted(menuItem)) {
      // find the newly added item id - approximation: wait next tick
      setTimeout(() => {
        const t = usePOS.getState().tables.find(x => x.id === tableId)
        const c = t?.covers.find(x => x.id === currentCover.id)
        const latest = c?.items.filter(it => it.menuItemId === menuItem.id).slice(-1)[0]
        if (latest) setShowWeight(latest.id)
      }, 50)
    }
  }

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null
    for (const c of table.covers) {
      const it = c.items.find(i => i.id === selectedItemId)
      if (it) return it
    }
    return null
  }, [table, selectedItemId])

  // ── Totals
  const rawTotal = tableTotal(table)
  const discountAmount = discount
    ? discount.type === 'percent' ? rawTotal * discount.value / 100 : Math.min(discount.value, rawTotal)
    : 0
  const offeredAmount = Array.from(offeredItems).reduce((s, id) => {
    for (const c of table.covers) {
      const it = c.items.find(i => i.id === id)
      if (it) return s + it.price * it.qty
    }
    return s
  }, 0)
  const finalTotal = Math.max(0, rawTotal - discountAmount - offeredAmount)

  // ── Favorites / Recents
  const favoriteItems = favoriteIds.map(id => menu.find(m => m.id === id)).filter(Boolean) as typeof menu
  const recentItems = recentIds.map(id => menu.find(m => m.id === id)).filter(Boolean) as typeof menu

  const availableTables = tables.filter(t => t.id !== tableId && t.status === 'available')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07070d',
      color: '#e2e8f0',
      fontFamily: 'Inter, -apple-system, sans-serif',
      display: 'grid',
      gridTemplateColumns: '30% 70%',
    }}>
      {/* ═══ LEFT : TICKET ═══ */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={onBack} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '6px 10px', color: '#cbd5e1', fontSize: 12, cursor: 'pointer',
            }}>← Retour</button>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {table.section} · {elapsed(table.openedAt)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{table.name}</div>
            {onHold && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.3)',
              }}>EN ATTENTE</span>
            )}
          </div>

          {/* Client row */}
          <div style={{ marginTop: 10 }}>
            {selectedClient ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: TIER_COLORS[selectedClient.tier].bg,
                border: `1px solid ${TIER_COLORS[selectedClient.tier].border}`,
              }}>
                <div style={{ fontSize: 12, color: TIER_COLORS[selectedClient.tier].text, fontWeight: 700 }}>
                  {selectedClient.name} · {selectedClient.tier}
                </div>
                <button onClick={() => setSelectedClient(null)} style={{
                  marginLeft: 'auto', background: 'transparent', border: 'none',
                  color: '#64748b', cursor: 'pointer', fontSize: 14,
                }}>×</button>
              </div>
            ) : (
              <button onClick={() => setShowClientSearch(true)} style={{
                width: '100%', padding: '6px 10px', borderRadius: 8,
                background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                + Associer un client
              </button>
            )}
          </div>
        </div>

        {/* Covers */}
        <div style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {table.covers.map((cov, idx) => (
            <button
              key={cov.id}
              onClick={() => setActiveCover(cov.id)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: cov.id === currentCover.id ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${cov.id === currentCover.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: cov.id === currentCover.id ? '#818cf8' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {idx + 1} · {cov.label} · {fmt(coverTotal(cov))}€
            </button>
          ))}
          <button onClick={() => addCover(tableId)} style={{
            padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)',
            color: '#64748b', cursor: 'pointer',
          }}>+</button>
        </div>

        {/* Ticket items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {table.covers.map(cov => (
            <div key={cov.id}>
              {cov.items.length > 0 && (
                <div style={{
                  padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  color: '#64748b', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.02)',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {cov.label} · {fmt(coverTotal(cov))}€
                </div>
              )}
              <AnimatePresence>
                {cov.items.map((it, idx) => {
                  const mods = itemModifiers[it.id] ?? []
                  const modExtra = mods.reduce((s, m) => s + m.extra, 0)
                  const weight = itemWeights[it.id]
                  const isOffered = offeredItems.has(it.id)
                  const isSelected = it.id === selectedItemId
                  const lineTotal = isOffered ? 0 : (it.price + modExtra) * it.qty
                  return (
                    <motion.div
                      key={it.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onClick={() => setSelectedItemId(it.id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(99,102,241,0.1)' : isOffered ? 'rgba(16,185,129,0.06)' : idx % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          minWidth: 28, height: 28, borderRadius: 8,
                          background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800,
                          color: isSelected ? '#818cf8' : '#94a3b8',
                        }}>{it.qty}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: isOffered ? '#10b981' : '#e2e8f0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {it.name}
                            {weight && <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700 }}>· {weight}kg</span>}
                            {isOffered && <span style={{ fontSize: 9, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: 6, fontWeight: 800, textTransform: 'uppercase' }}>Offert</span>}
                          </div>
                          {mods.length > 0 && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {mods.map(m => `+ ${m.label}${m.extra ? ` (+${fmt(m.extra)}€)` : ''}`).join(' · ')}
                            </div>
                          )}
                          {it.note && (
                            <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2, fontStyle: 'italic' }}>
                              📝 {it.note}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: isOffered ? '#10b981' : '#fff', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(lineTotal)}€
                        </div>
                      </div>

                      {/* Action bar when selected */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}
                        >
                          <MiniBtn onClick={e => { e.stopPropagation(); setItemQty(tableId, it.id, it.qty - 1) }}>−</MiniBtn>
                          <MiniBtn onClick={e => { e.stopPropagation(); setItemQty(tableId, it.id, it.qty + 1) }}>+</MiniBtn>
                          <MiniBtn onClick={e => { e.stopPropagation(); setShowModifiers(it.id) }}>🎛 Modif.</MiniBtn>
                          <MiniBtn onClick={e => {
                            e.stopPropagation()
                            const n = prompt('Note :', it.note)
                            if (n !== null) setItemNote(tableId, it.id, n)
                          }}>📝 Note</MiniBtn>
                          {isWeighted(it as any) && (
                            <MiniBtn onClick={e => { e.stopPropagation(); setShowWeight(it.id) }}>⚖ Poids</MiniBtn>
                          )}
                          <MiniBtn onClick={e => { e.stopPropagation(); setShowSplitItem(true) }}>✂ Split</MiniBtn>
                          <MiniBtn danger onClick={e => { e.stopPropagation(); removeItem(tableId, it.id); setSelectedItemId(null) }}>🗑</MiniBtn>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          ))}
          {table.covers.every(c => c.items.length === 0) && (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Aucun article. Sélectionnez depuis le menu →
            </div>
          )}
        </div>

        {/* Totals */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            <span>Sous-total</span><span>{fmt(rawTotal)} €</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#a78bfa', marginBottom: 4 }}>
              <span>Remise{discount?.type === 'percent' ? ` (${discount.value}%)` : ''}</span>
              <span>− {fmt(discountAmount)} €</span>
            </div>
          )}
          {offeredAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#10b981', marginBottom: 4 }}>
              <span>Offerts</span><span>− {fmt(offeredAmount)} €</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span>Total</span>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmt(finalTotal)} €</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12 }}>
            <ActionBtn label="Remise" sub="F1" onClick={() => setShowRemise(true)} />
            <ActionBtn label="Note" sub="F2" onClick={() => setShowNote(true)} />
            <ActionBtn label="Cuisine" sub="F3" onClick={() => setShowCuisine(true)} />
            <ActionBtn label={onHold ? 'Reprise' : 'En attente'} onClick={() => setOnHold(!onHold)} color={onHold ? '#fbbf24' : undefined} />
            <ActionBtn label="Transfert" onClick={() => setShowTransfer(true)} />
            <ActionBtn label="Offrir" onClick={() => {
              if (!selectedItemId) { alert('Sélectionnez un article'); return }
              setOfferedItems(prev => {
                const s = new Set(prev)
                if (s.has(selectedItemId)) s.delete(selectedItemId); else s.add(selectedItemId)
                return s
              })
            }} />
            <ActionBtn label="Split item" onClick={() => setShowSplitItem(true)} />
            <ActionBtn label="Historique" onClick={() => alert(MOCK_HISTORY.map(h => `${h.time} · ${h.label} · ${fmt(h.total)}€`).join('\n'))} />
          </div>

          <button
            onClick={onPay}
            disabled={rawTotal === 0}
            style={{
              marginTop: 10, width: '100%',
              padding: '14px', borderRadius: 12,
              background: rawTotal === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: rawTotal === 0 ? '#64748b' : '#fff',
              border: 'none', fontSize: 15, fontWeight: 800,
              cursor: rawTotal === 0 ? 'not-allowed' : 'pointer',
              boxShadow: rawTotal === 0 ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            Encaisser · F4 · {fmt(finalTotal)} €
          </button>
        </div>
      </div>

      {/* ═══ RIGHT : MENU ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top bar: search + course + history + shortcuts */}
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Rechercher (nom, catégorie, &lt;10€, &gt;5€...)'
              style={{
                width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: 12, top: 10, fontSize: 14, color: '#64748b' }}>🔍</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {COURSES.map(c => (
              <button
                key={c.id}
                onClick={() => setCourse(c.id)}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: course === c.id ? `${c.color}25` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${course === c.id ? c.color + '60' : 'rgba(255,255,255,0.06)'}`,
                  color: course === c.id ? c.color : '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: 0.4 }}>
            F1 Remise · F2 Note · F3 Cuisine · F4 Payer · Esc Retour
          </div>
        </div>

        {/* Favorites + Recents */}
        {(favoriteItems.length > 0 || recentItems.length > 0) && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
            {recentItems.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Récents</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {recentItems.map(m => (
                    <QuickBtn key={m.id} onClick={() => handleAddItem(m)} emoji={m.emoji} label={m.name} price={m.price} color="#38bdf8" />
                  ))}
                </div>
              </div>
            )}
            {favoriteItems.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>⭐ Favoris</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {favoriteItems.map(m => (
                    <QuickBtn key={m.id} onClick={() => handleAddItem(m)} emoji={m.emoji} label={m.name} price={m.price} color="#fbbf24" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {MENU_CATEGORIES.map(cat => {
            const active = cat === category
            const color = CATEGORY_COLORS[cat] ?? '#6366f1'
            return (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setSearch('') }}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.06)'}`,
                  color: active ? color : '#94a3b8',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {CATEGORY_ICONS[cat] ?? '•'} {cat}
              </button>
            )
          })}
        </div>

        {/* Products grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {filteredMenu.map(m => {
              const color = CATEGORY_COLORS[m.category] ?? '#6366f1'
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAddItem(m)}
                  disabled={onHold}
                  style={{
                    aspectRatio: '1 / 1',
                    padding: 12, borderRadius: 12,
                    background: onHold ? 'rgba(255,255,255,0.02)' : `linear-gradient(135deg, ${color}15 0%, rgba(255,255,255,0.02) 100%)`,
                    border: `1px solid ${color}30`,
                    color: '#e2e8f0',
                    cursor: onHold ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    textAlign: 'left',
                    opacity: onHold ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: 28 }}>{m.emoji}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'ui-monospace, monospace' }}>
                      {fmt(m.price)} €
                    </div>
                  </div>
                </motion.button>
              )
            })}
            {filteredMenu.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                Aucun produit trouvé.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {showClientSearch && (
          <ClientSearchModal
            clients={MOCK_CLIENTS}
            onClose={() => setShowClientSearch(false)}
            onSelect={c => { setSelectedClient(c); if (c.discount > 0) setDiscount({ type: 'percent', value: c.discount }); setShowClientSearch(false) }}
          />
        )}
        {showRemise && (
          <RemiseModal
            onClose={() => setShowRemise(false)}
            onConfirm={(d) => { setDiscount(d); setShowRemise(false) }}
            rawTotal={rawTotal}
          />
        )}
        {showNote && (
          <TextModal
            title="Note sur le ticket"
            placeholder="Ex : Client pressé, allergie aux fruits à coque..."
            onClose={() => setShowNote(false)}
            onConfirm={() => setShowNote(false)}
          />
        )}
        {showCuisine && (
          <TextModal
            title="Message cuisine"
            placeholder="Ex : Servir en même temps, sans coriandre..."
            onClose={() => setShowCuisine(false)}
            onConfirm={() => setShowCuisine(false)}
            color="#f97316"
          />
        )}
        {showModifiers && (
          <ModifiersModal
            current={itemModifiers[showModifiers] ?? []}
            onClose={() => setShowModifiers(null)}
            onConfirm={mods => {
              setItemModifiers(prev => ({ ...prev, [showModifiers]: mods }))
              setShowModifiers(null)
            }}
          />
        )}
        {showTransfer && (
          <TransferModal
            tables={availableTables}
            onClose={() => setShowTransfer(false)}
            onConfirm={(toId) => {
              alert(`Commande transférée vers ${tables.find(t => t.id === toId)?.name}`)
              setShowTransfer(false)
            }}
          />
        )}
        {showSplitItem && selectedItem && (
          <SplitItemModal
            item={selectedItem}
            covers={table.covers}
            onClose={() => setShowSplitItem(false)}
            onConfirm={(toCoverId) => {
              moveItemToCover(tableId, selectedItem.id, toCoverId)
              setShowSplitItem(false)
            }}
          />
        )}
        {showWeight && (
          <WeightModal
            onClose={() => setShowWeight(null)}
            onConfirm={(kg) => {
              setItemWeights(prev => ({ ...prev, [showWeight]: kg }))
              setShowWeight(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── UI bits ────────────────────────────────────────────────────────────────
function MiniBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: danger ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${danger ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
      color: danger ? '#f43f5e' : '#cbd5e1',
      cursor: 'pointer',
    }}>{children}</button>
  )
}

function ActionBtn({ label, sub, onClick, color }: { label: string; sub?: string; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: color ? `${color}20` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${color ? color + '40' : 'rgba(255,255,255,0.08)'}`,
      color: color ?? '#cbd5e1',
      cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <span>{label}</span>
      {sub && <span style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>{sub}</span>}
    </button>
  )
}

function QuickBtn({ onClick, emoji, label, price, color }: { onClick: () => void; emoji: string; label: string; price: number; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`,
      color: '#e2e8f0', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span>{emoji}</span>
      <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color, fontWeight: 800 }}>{fmt(price)}€</span>
    </button>
  )
}

const btnDark: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10,
  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
  color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

// ─── Modals ────────────────────────────────────────────────────────────────
function ModalShell({ onClose, title, icon, color, children, width = 460 }: {
  onClose: () => void; title: string; icon?: string; color?: string;
  children: React.ReactNode; width?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20, backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f0f17', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 20, width: `min(${width}px, 100%)`,
          maxHeight: '85vh', overflow: 'auto', color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `${color ?? '#6366f1'}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{icon}</div>
          )}
          <div style={{ fontSize: 15, fontWeight: 800, flex: 1, color: '#fff' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#64748b',
            fontSize: 20, cursor: 'pointer', width: 28, height: 28, borderRadius: 6,
          }}>×</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function ClientSearchModal({ clients, onClose, onSelect }: { clients: MockClient[]; onClose: () => void; onSelect: (c: MockClient) => void }) {
  const [q, setQ] = useState('')
  const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q))
  return (
    <ModalShell onClose={onClose} title="Rechercher un client" icon="👤" color="#6366f1">
      <input
        autoFocus value={q} onChange={e => setQ(e.target.value)}
        placeholder="Nom ou téléphone..."
        style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(c => {
          const tc = TIER_COLORS[c.tier]
          return (
            <button key={c.id} onClick={() => onSelect(c)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 10,
              borderRadius: 8, background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{c.phone} · {c.points} pts</div>
              </div>
              <div style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
              }}>{c.tier}</div>
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}

function RemiseModal({ onClose, onConfirm, rawTotal }: { onClose: () => void; onConfirm: (d: { type: 'percent' | 'amount'; value: number }) => void; rawTotal: number }) {
  const [type, setType] = useState<'percent' | 'amount'>('percent')
  const [val, setVal] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const v = parseFloat(val.replace(',', '.'))
    if (!v || v <= 0) { setError('Valeur invalide'); return }
    // Manager PIN required for > 20%
    if (type === 'percent' && v > 20 && pin !== '9999') {
      setError('PIN manager requis pour remise > 20% (indice : 9999)'); return
    }
    onConfirm({ type, value: v })
  }

  const percentThreshold = type === 'percent' && parseFloat(val.replace(',', '.')) > 20

  return (
    <ModalShell onClose={onClose} title="Appliquer une remise" icon="💸" color="#a78bfa">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['percent', 'amount'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: type === t ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${type === t ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: type === t ? '#a78bfa' : '#94a3b8', cursor: 'pointer',
          }}>{t === 'percent' ? 'En %' : 'En €'}</button>
        ))}
      </div>
      <input
        autoFocus value={val} onChange={e => { setVal(e.target.value); setError('') }}
        placeholder={type === 'percent' ? '10' : '5,00'}
        style={{ width: '100%', padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, fontWeight: 800, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
      />
      <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 6 }}>
        Sous-total : {fmt(rawTotal)} €
      </div>

      {percentThreshold && (
        <>
          <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 10, fontWeight: 600 }}>
            ⚠ Remise supérieure à 20% — PIN manager requis
          </div>
          <input
            type="password" value={pin} onChange={e => { setPin(e.target.value); setError('') }}
            placeholder="PIN manager" maxLength={4}
            style={{ width: '100%', padding: 10, borderRadius: 8, marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.3)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 4 }}
          />
        </>
      )}

      {error && <div style={{ color: '#f43f5e', fontSize: 11, marginTop: 8, fontWeight: 600 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
        <button onClick={submit} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#a78bfa', border: 'none', color: '#0f0f17', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Appliquer</button>
      </div>
    </ModalShell>
  )
}

function TextModal({ title, placeholder, onClose, onConfirm, color }: { title: string; placeholder: string; onClose: () => void; onConfirm: (text: string) => void; color?: string }) {
  const [text, setText] = useState('')
  return (
    <ModalShell onClose={onClose} title={title} icon="📝" color={color ?? '#6366f1'}>
      <textarea
        autoFocus value={text} onChange={e => setText(e.target.value)}
        placeholder={placeholder} rows={4}
        style={{ width: '100%', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
        <button onClick={() => onConfirm(text)} style={{ flex: 1, padding: 10, borderRadius: 8, background: color ?? '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Enregistrer</button>
      </div>
    </ModalShell>
  )
}

function ModifiersModal({ current, onClose, onConfirm }: { current: Modifier[]; onClose: () => void; onConfirm: (mods: Modifier[]) => void }) {
  const [sel, setSel] = useState<Modifier[]>(current)
  const has = (m: Modifier) => sel.some(x => x.label === m.label)

  const toggle = (group: ModifierGroup, m: Modifier) => {
    setSel(prev => {
      if (has(m)) return prev.filter(x => x.label !== m.label)
      if (group.single) {
        return [...prev.filter(x => !group.modifiers.some(gm => gm.label === x.label)), m]
      }
      return [...prev, m]
    })
  }

  const totalExtra = sel.reduce((s, m) => s + m.extra, 0)

  return (
    <ModalShell onClose={onClose} title="Modificateurs" icon="🎛" color="#f97316" width={520}>
      {MODIFIER_GROUPS.map(g => (
        <div key={g.id} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
            {g.label} {g.single && <span style={{ color: '#64748b' }}>· choix unique</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {g.modifiers.map(m => {
              const active = has(m)
              return (
                <button key={m.label} onClick={() => toggle(g, m)} style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: active ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? '#f97316' : '#cbd5e1', cursor: 'pointer',
                }}>
                  {m.label}{m.extra > 0 && <span style={{ marginLeft: 6, color: '#10b981' }}>+{fmt(m.extra)}€</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{
        padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, fontWeight: 700,
        color: '#10b981', textAlign: 'center',
      }}>
        Supplément total : +{fmt(totalExtra)} €
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
        <button onClick={() => onConfirm(sel)} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f97316', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Appliquer</button>
      </div>
    </ModalShell>
  )
}

function TransferModal({ tables, onClose, onConfirm }: { tables: Array<{ id: string; name: string; section: string }>; onClose: () => void; onConfirm: (toId: string) => void }) {
  return (
    <ModalShell onClose={onClose} title="Transférer la commande" icon="⇄" color="#38bdf8">
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
        Sélectionnez la table de destination :
      </div>
      {tables.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Aucune table disponible.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {tables.map(t => (
            <button key={t.id} onClick={() => onConfirm(t.id)} style={{
              padding: 12, borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
              color: '#e2e8f0', cursor: 'pointer', textAlign: 'left',
            }}>
              <div>{t.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.section}</div>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

function SplitItemModal({ item, covers, onClose, onConfirm }: { item: OrderItem; covers: Cover[]; onClose: () => void; onConfirm: (toCoverId: string) => void }) {
  const others = covers.filter(c => c.id !== item.coverId)
  return (
    <ModalShell onClose={onClose} title="Envoyer l'article à un couvert" icon="✂" color="#818cf8">
      <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>{item.name}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Qté : {item.qty}</div>
      {others.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Aucun autre couvert.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {others.map(c => (
            <button key={c.id} onClick={() => onConfirm(c.id)} style={{
              padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
              color: '#cbd5e1', cursor: 'pointer', textAlign: 'left',
            }}>
              → {c.label}
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

function WeightModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (kg: number) => void }) {
  const [kg, setKg] = useState('0.250')
  return (
    <ModalShell onClose={onClose} title="Poids de l'article" icon="⚖" color="#10b981">
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        Saisissez le poids en kg (ex : 0.250 = 250g).
      </div>
      <input
        autoFocus type="number" step="0.001" value={kg} onChange={e => setKg(e.target.value)}
        style={{ width: '100%', padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.3)', color: '#fff', fontSize: 22, fontWeight: 800, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
        <button onClick={() => onConfirm(parseFloat(kg) || 0)} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Valider</button>
      </div>
    </ModalShell>
  )
}
