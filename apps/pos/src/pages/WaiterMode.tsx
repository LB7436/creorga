import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePOS,
  MENU_CATEGORIES,
  STATUS_COLORS,
  STATUS_LABELS,
  tableTotal,
  elapsed,
  type MenuItem,
  type OrderItem,
} from '../store/posStore'

const CAT_EMOJIS: Record<string, string> = {
  Boissons: '☕', Bières: '🍺', Vins: '🍷', Cocktails: '🍹', Cuisine: '🍔', Desserts: '🍮',
}

type Station = 'bar' | 'chaud' | 'froid' | 'desserts'
const STATION_MAP: Record<string, Station> = {
  Boissons: 'bar', Bières: 'bar', Vins: 'bar', Cocktails: 'bar',
  Cuisine: 'chaud', Desserts: 'desserts',
}
const STATION_COLORS: Record<Station, string> = {
  bar: '#8b5cf6', chaud: '#ef4444', froid: '#06b6d4', desserts: '#ec4899',
}
const STATION_LABELS: Record<Station, string> = {
  bar: 'Bar', chaud: 'Cuisine chaude', froid: 'Cuisine froide', desserts: 'Desserts',
}

// Customer notes (per recurring customer, mock stored)
const CUSTOMER_NOTES: Record<string, string[]> = {
  't5': ['Préfère sans épices', 'Allergie aux arachides', 'Toujours vin rouge léger'],
  't3': ['Client VIP — service attentif', 'Anniversaire en octobre'],
  't7': ['Régime sans gluten strict'],
}

// Performance stats (mocked)
const INITIAL_STATS = {
  tables: 14, avgTime: 42, tips: 58.5, orders: 47,
}

export default function WaiterMode({ onExit }: { onExit: () => void }) {
  const tables = usePOS(s => s.tables)
  const menu = usePOS(s => s.menu).filter(m => m.active)
  const settings = usePOS(s => s.settings)
  const currentStaff = usePOS(s => s.currentStaff)
  const addItem = usePOS(s => s.addItem)
  const removeItem = usePOS(s => s.removeItem)
  const setItemQty = usePOS(s => s.setItemQty)
  const processPayment = usePOS(s => s.processPayment)
  const openTable = usePOS(s => s.openTable)

  const [selectedTableId, setSelectedTableId] = useState<string>('t3')
  const [secondaryTableId, setSecondaryTableId] = useState<string | null>(null)
  const [tertiaryTableId, setTertiaryTableId] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState(MENU_CATEGORIES[0])
  const [clock, setClock] = useState(new Date())
  const [toast, setToast] = useState<{ text: string; color?: string } | null>(null)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)
  const [notePopup, setNotePopup] = useState<{ menuItem: MenuItem } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [selectedStation, setSelectedStation] = useState<Station | 'auto'>('auto')

  // Voice note
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  // Photo note
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoTaken, setPhotoTaken] = useState(false)

  // Multi-table view
  const [multiTableView, setMultiTableView] = useState(false)

  // Drag/swap
  const [draggingItem, setDraggingItem] = useState<{ item: OrderItem; fromTable: string } | null>(null)

  // Shortcuts drawer
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Stats panel
  const [statsOpen, setStatsOpen] = useState(false)
  const stats = INITIAL_STATS

  // Help
  const [helpSent, setHelpSent] = useState(false)

  // Customer notes panel
  const [showCustomerNotes, setShowCustomerNotes] = useState(false)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordInterval.current = setInterval(() => setRecordDuration(d => d + 1), 1000)
    } else {
      if (recordInterval.current) clearInterval(recordInterval.current)
      setRecordDuration(0)
    }
    return () => {
      if (recordInterval.current) clearInterval(recordInterval.current)
    }
  }, [isRecording])

  const selectedTable = tables.find(t => t.id === selectedTableId)
  const secondaryTable = tables.find(t => t.id === secondaryTableId)
  const tertiaryTable = tables.find(t => t.id === tertiaryTableId)
  const allItems: OrderItem[] = selectedTable?.covers.flatMap(c => c.items) ?? []
  const total = selectedTable ? tableTotal(selectedTable) : 0
  const taxRate = settings.taxRate || 0
  const tva = total * taxRate
  const totalTTC = total + tva
  const coverCount = selectedTable?.covers.length ?? 0

  const customerNotes = CUSTOMER_NOTES[selectedTableId] || []

  // Auto-open table
  useEffect(() => {
    if (selectedTable && selectedTable.status === 'available') {
      openTable(selectedTableId, 2)
    }
  }, [selectedTableId])

  const filteredProducts = menu.filter(m => m.category === activeCat)

  const getItemQty = useCallback((menuItemId: string) => {
    return allItems.filter(i => i.menuItemId === menuItemId).reduce((s, i) => s + i.qty, 0)
  }, [allItems])

  function handleAddItem(menuItem: MenuItem) {
    if (!selectedTable || selectedTable.covers.length === 0) return
    const coverId = selectedTable.covers[0].id
    addItem(selectedTableId, coverId, menuItem)
    setFlashItemId(menuItem.id)
    setTimeout(() => setFlashItemId(null), 300)
  }

  function handlePointerDown(menuItem: MenuItem) {
    longPressTimer.current = setTimeout(() => {
      setNotePopup({ menuItem })
      setNoteText('')
    }, 500)
  }
  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function sendToStation(station: Station | 'auto') {
    const label = station === 'auto' ? 'stations auto' : STATION_LABELS[station]
    setToast({ text: `Envoyé vers ${label} ✓`, color: station === 'auto' ? '#10b981' : STATION_COLORS[station] })
  }

  function handlePayment() {
    processPayment(selectedTableId, 'card', 0)
    setToast({ text: 'Paiement effectué ✓' })
    const nextOccupied = tables.find(t => t.id !== selectedTableId && t.status === 'occupied')
    if (nextOccupied) setSelectedTableId(nextOccupied.id)
  }

  function submitNote() {
    if (notePopup && selectedTable && selectedTable.covers.length > 0) {
      const coverId = selectedTable.covers[0].id
      addItem(selectedTableId, coverId, notePopup.menuItem, noteText)
    }
    setNotePopup(null)
    setNoteText('')
  }

  function swapItemToTable(item: OrderItem, toTableId: string) {
    const toTable = tables.find(t => t.id === toTableId)
    if (!toTable || toTable.covers.length === 0) return
    const menuItem = menu.find(m => m.id === item.menuItemId)
    if (!menuItem) return
    removeItem(selectedTableId, item.id)
    addItem(toTableId, toTable.covers[0].id, menuItem, item.note)
    setToast({ text: `Transféré vers ${toTable.name} ✓` })
  }

  function callHelp() {
    setHelpSent(true)
    setToast({ text: '🆘 Manager alerté !', color: '#f43f5e' })
    setTimeout(() => setHelpSent(false), 5000)
  }

  const formatTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const formatPrice = (n: number) => `${n.toFixed(2)} ${settings.currency}`

  // Mini ticket renderer for multi-table view
  function renderMiniTicket(tbl: typeof selectedTable, onClick: () => void) {
    if (!tbl) return null
    const items = tbl.covers.flatMap(c => c.items)
    const tbltotal = tableTotal(tbl)
    return (
      <div
        onClick={onClick}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,22,0.5)',
          border: `1px solid ${STATUS_COLORS[tbl.status]}40`,
          borderRadius: 12, padding: 12, cursor: 'pointer',
          height: '100%', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: STATUS_COLORS[tbl.status],
            boxShadow: `0 0 8px ${STATUS_COLORS[tbl.status]}`,
          }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>{tbl.name}</span>
          <span style={{ fontSize: 11, color: '#818cf8', marginLeft: 'auto', fontWeight: 700 }}>
            {formatPrice(tbltotal)}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', fontSize: 11, color: '#94a3b8' }}>
          {items.length === 0 ? (
            <div style={{ fontStyle: 'italic', opacity: 0.5 }}>Aucun article</div>
          ) : (
            items.slice(0, 6).map(it => (
              <div key={it.id} style={{ padding: '2px 0' }}>
                {it.qty}× {it.name}
              </div>
            ))
          )}
          {items.length > 6 && (
            <div style={{ opacity: 0.5, marginTop: 2 }}>+{items.length - 6} autres…</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#07070d', color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', touchAction: 'manipulation',
      userSelect: 'none',
    }}>

      {/* ══════════ TOP BAR ══════════ */}
      <header style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10,10,22,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981', fontSize: 12, fontWeight: 700,
          }}>
            Mode Serveur
          </div>
          {currentStaff && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: currentStaff.color,
                boxShadow: `0 0 8px ${currentStaff.color}`,
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                {currentStaff.name}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Help button */}
          <motion.button
            animate={helpSent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: helpSent ? Infinity : 0, duration: 0.6 }}
            onClick={callHelp}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: helpSent ? 'rgba(244,63,94,0.3)' : 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.4)',
              color: '#fb7185', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🆘 Aide
          </motion.button>

          {/* Stats toggle */}
          <button
            onClick={() => setStatsOpen(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: statsOpen ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#fcd34d', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📊 {stats.tips.toFixed(0)}€
          </button>

          {/* Multi-table toggle */}
          <button
            onClick={() => setMultiTableView(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: multiTableView ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (multiTableView ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'),
              color: multiTableView ? '#a5b4fc' : '#94a3b8',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {multiTableView ? '⊞ Multi' : '▢ Simple'}
          </button>

          {/* Shortcuts drawer */}
          <button
            onClick={() => setShortcutsOpen(v => !v)}
            style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', fontSize: 14, cursor: 'pointer',
            }}
          >
            ☰
          </button>

          <span style={{
            fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: 'rgba(255,255,255,0.5)',
          }}>
            {formatTime(clock)}
          </span>

          <button
            onClick={onExit}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: '#fb7185', fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quitter
          </button>
        </div>
      </header>

      {/* ══════════ TABLE STATUS MAP ══════════ */}
      <div style={{
        padding: '8px 16px', flexShrink: 0,
        background: 'rgba(10,10,22,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 6,
        overflowX: 'auto',
      }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0, marginRight: 4 }}>
          Tables
        </span>
        {tables.filter(t => !t.isMergedInto).map(tbl => {
          const isPrimary = tbl.id === selectedTableId
          const isSecondary = tbl.id === secondaryTableId
          const isTertiary = tbl.id === tertiaryTableId
          const itemCount = tbl.covers.flatMap(c => c.items).length
          return (
            <motion.button
              key={tbl.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (multiTableView) {
                  if (isPrimary) return
                  if (isSecondary) { setSecondaryTableId(null); return }
                  if (isTertiary) { setTertiaryTableId(null); return }
                  if (!secondaryTableId) setSecondaryTableId(tbl.id)
                  else if (!tertiaryTableId) setTertiaryTableId(tbl.id)
                  else setSelectedTableId(tbl.id)
                } else {
                  setSelectedTableId(tbl.id)
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 8,
                background: isPrimary ? 'rgba(99,102,241,0.2)'
                  : isSecondary ? 'rgba(16,185,129,0.15)'
                  : isTertiary ? 'rgba(245,158,11,0.15)'
                  : 'rgba(255,255,255,0.03)',
                border: isPrimary ? '1px solid rgba(99,102,241,0.5)'
                  : isSecondary ? '1px solid rgba(16,185,129,0.4)'
                  : isTertiary ? '1px solid rgba(245,158,11,0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                color: '#e2e8f0', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                position: 'relative',
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: STATUS_COLORS[tbl.status],
                boxShadow: `0 0 4px ${STATUS_COLORS[tbl.status]}`,
              }} />
              {tbl.name.replace('Table ', 'T')}
              {itemCount > 0 && (
                <span style={{
                  padding: '1px 5px', borderRadius: 8,
                  background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                  fontSize: 9, fontWeight: 800,
                }}>
                  {itemCount}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ══════════ MAIN AREA ══════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL - Products */}
        <div style={{
          width: multiTableView ? '40%' : '55%',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {selectedTable && (
            <div style={{
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(10,10,22,0.6)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: STATUS_COLORS[selectedTable.status],
                boxShadow: `0 0 8px ${STATUS_COLORS[selectedTable.status]}`,
              }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedTable.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                · {coverCount} couvert{coverCount > 1 ? 's' : ''}
              </span>
              {selectedTable.openedAt && (
                <span style={{ color: '#818cf8', fontSize: 12, fontWeight: 600 }}>
                  · {elapsed(selectedTable.openedAt)}
                </span>
              )}
              {customerNotes.length > 0 && (
                <button
                  onClick={() => setShowCustomerNotes(true)}
                  style={{
                    marginLeft: 'auto', padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fcd34d', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⭐ {customerNotes.length} note{customerNotes.length > 1 ? 's' : ''} client
                </button>
              )}
            </div>
          )}

          {/* Category pills */}
          <div style={{
            display: 'flex', gap: 6, padding: '10px 14px',
            overflowX: 'auto', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {MENU_CATEGORIES.map(cat => {
              const isActive = cat === activeCat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 42, padding: '0 16px', borderRadius: 10,
                    background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? '#a5b4fc' : '#94a3b8',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{CAT_EMOJIS[cat] ?? '🍽️'}</span>
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Product grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            alignContent: 'start',
          }}>
            {filteredProducts.map(item => {
              const qty = getItemQty(item.id)
              const isFlashing = flashItemId === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  onPointerDown={() => handlePointerDown(item)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  animate={isFlashing ? {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(99,102,241,0)',
                      '0 0 20px 4px rgba(99,102,241,0.4)',
                      '0 0 0 0 rgba(99,102,241,0)',
                    ],
                  } : {}}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'relative',
                    minHeight: 72, padding: '10px 12px',
                    borderRadius: 10,
                    background: qty > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                    border: qty > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontFamily: 'inherit',
                    color: '#e2e8f0', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#818cf8' }}>
                      {formatPrice(item.price)}
                    </div>
                  </div>
                  {qty > 0 && (
                    <div style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#6366f1', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(99,102,241,0.5)',
                    }}>
                      {qty}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Station selector + Send */}
          {allItems.length > 0 && (
            <div style={{ padding: '8px 14px 14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button
                  onClick={() => setSelectedStation('auto')}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8,
                    background: selectedStation === 'auto' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (selectedStation === 'auto' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'),
                    color: selectedStation === 'auto' ? '#6ee7b7' : '#94a3b8',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Auto
                </button>
                {(['bar', 'chaud', 'froid', 'desserts'] as Station[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedStation(s)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      background: selectedStation === s ? `${STATION_COLORS[s]}30` : 'rgba(255,255,255,0.04)',
                      border: '1px solid ' + (selectedStation === s ? `${STATION_COLORS[s]}80` : 'rgba(255,255,255,0.06)'),
                      color: selectedStation === s ? STATION_COLORS[s] : '#94a3b8',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <motion.button
                  onClick={() => sendToStation(selectedStation)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 3, height: 50, borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', color: '#fff',
                    fontSize: 15, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                  }}
                >
                  🔥 Envoyer
                </motion.button>
                <motion.button
                  onClick={() => setShowVoiceModal(true)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: 50, height: 50, borderRadius: 12,
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#c4b5fd', fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  🎤
                </motion.button>
                <motion.button
                  onClick={() => setShowPhotoModal(true)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: 50, height: 50, borderRadius: 12,
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    color: '#67e8f9', fontSize: 20,
                    cursor: 'pointer',
                  }}
                >
                  📷
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - Ticket(s) */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,22,0.4)',
          overflow: 'hidden',
        }}>
          {multiTableView ? (
            <div style={{
              flex: 1, display: 'flex', gap: 8,
              padding: 12, overflow: 'hidden',
            }}>
              {renderMiniTicket(selectedTable, () => { /* primary */ })}
              {secondaryTable && renderMiniTicket(secondaryTable, () => setSelectedTableId(secondaryTableId!))}
              {tertiaryTable && renderMiniTicket(tertiaryTable, () => setSelectedTableId(tertiaryTableId!))}
              {!secondaryTable && (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12,
                  color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 16,
                }}>
                  Cliquez sur une table<br />pour l'ajouter ici
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>Commande</span>
                  {selectedTable && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 6, fontSize: 13 }}>
                      — {selectedTable.name}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>
                  {formatPrice(totalTTC)}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {allItems.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
                    Aucun article
                  </div>
                )}
                <AnimatePresence>
                  {allItems.map(item => {
                    const menuItem = menu.find(m => m.id === item.menuItemId)
                    const station = menuItem ? STATION_MAP[menuItem.category] : 'chaud'
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100, height: 0 }}
                        draggable={multiTableView}
                        onDragStart={() => setDraggingItem({ item, fromTable: selectedTableId })}
                        onDragEnd={() => setDraggingItem(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 14px',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          cursor: multiTableView ? 'grab' : 'default',
                          borderLeft: `3px solid ${STATION_COLORS[station]}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <button
                            onClick={() => setItemQty(selectedTableId, item.id, item.qty - 1)}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              background: 'rgba(244,63,94,0.1)',
                              border: '1px solid rgba(244,63,94,0.2)',
                              color: '#fb7185', fontSize: 14, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            −
                          </button>
                          <span style={{
                            width: 24, textAlign: 'center',
                            fontSize: 14, fontWeight: 800, color: '#a5b4fc',
                          }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => setItemQty(selectedTableId, item.id, item.qty + 1)}
                            style={{
                              width: 28, height: 28, borderRadius: 7,
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              color: '#10b981', fontSize: 14, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            +
                          </button>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                            {item.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 4,
                              background: `${STATION_COLORS[station]}20`,
                              color: STATION_COLORS[station], fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: 0.5,
                            }}>
                              {station}
                            </span>
                            {item.note && (
                              <span style={{ fontSize: 10, color: '#f59e0b', fontStyle: 'italic' }}>
                                📝 {item.note}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                          {formatPrice(item.price * item.qty)}
                        </span>
                        <button
                          onClick={() => removeItem(selectedTableId, item.id)}
                          style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: 'rgba(244,63,94,0.08)',
                            border: '1px solid rgba(244,63,94,0.15)',
                            color: '#fb7185', fontSize: 12,
                            cursor: 'pointer', opacity: 0.7,
                          }}
                        >
                          ✕
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {/* Drop zones when dragging */}
                {draggingItem && (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tables.filter(t => t.id !== selectedTableId && !t.isMergedInto).slice(0, 4).map(tbl => (
                      <div
                        key={tbl.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          swapItemToTable(draggingItem.item, tbl.id)
                          setDraggingItem(null)
                        }}
                        style={{
                          padding: '12px 14px', borderRadius: 10,
                          border: '2px dashed rgba(99,102,241,0.4)',
                          background: 'rgba(99,102,241,0.08)',
                          color: '#a5b4fc', fontSize: 12, fontWeight: 600,
                          textAlign: 'center',
                        }}
                      >
                        ↪ Déposer ici pour {tbl.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                padding: '10px 14px', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Sous-total</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{formatPrice(total)}</span>
                </div>
                {taxRate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>TVA ({(taxRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{formatPrice(tva)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#818cf8' }}>
                    {formatPrice(totalTTC)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, padding: '0 14px 14px' }}>
                <motion.button
                  onClick={handlePayment}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flex: 5, height: 46, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none', color: '#fff',
                    fontSize: 14, fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  Encaisser
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flex: 2, height: 46, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Diviser
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flex: 2, height: 46, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🖨️
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════ STATS PANEL (sliding) ══════════ */}
      <AnimatePresence>
        {statsOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200,
              background: '#0a0a14',
              borderTop: '1px solid rgba(245,158,11,0.3)',
              padding: 20,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>📊 Vos stats aujourd'hui</div>
              <button
                onClick={() => setStatsOpen(false)}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Tables servies', value: stats.tables, unit: '', color: '#6366f1' },
                { label: 'Temps moyen', value: stats.avgTime, unit: 'min', color: '#10b981' },
                { label: 'Pourboires', value: stats.tips.toFixed(2), unit: '€', color: '#f59e0b' },
                { label: 'Commandes', value: stats.orders, unit: '', color: '#ec4899' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: `${s.color}10`,
                  border: `1px solid ${s.color}30`,
                }}>
                  <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>
                    {s.value}<span style={{ fontSize: 12, marginLeft: 3, opacity: 0.7 }}>{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ SHORTCUTS DRAWER ══════════ */}
      <AnimatePresence>
        {shortcutsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShortcutsOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, zIndex: 201,
                background: '#0a0a14',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                padding: 20, overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>⚡ Raccourcis</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🍽️', label: 'Réclamer une table' },
                  { icon: '⏱️', label: 'Demander de patienter' },
                  { icon: '🎂', label: 'Annoncer un anniversaire' },
                  { icon: '🔔', label: 'Appeler un collègue' },
                  { icon: '🧹', label: 'Demander nettoyage' },
                  { icon: '💳', label: 'Terminal de paiement' },
                  { icon: '📋', label: 'Rapport de shift' },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => { setToast({ text: `${s.icon} ${s.label}` }); setShortcutsOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#cbd5e1', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ VOICE MODAL ══════════ */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowVoiceModal(false); setIsRecording(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 20, padding: 32,
                width: 340, border: '1px solid rgba(139,92,246,0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#c4b5fd' }}>
                🎤 Note vocale pour cuisine
              </div>
              <motion.button
                onClick={() => setIsRecording(v => !v)}
                animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: isRecording ? Infinity : 0, duration: 1.2 }}
                style={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: 'none', color: '#fff', fontSize: 40,
                  cursor: 'pointer', margin: '0 auto',
                  boxShadow: isRecording ? '0 0 40px rgba(239,68,68,0.6)' : '0 0 30px rgba(139,92,246,0.4)',
                }}
              >
                {isRecording ? '⏹' : '🎤'}
              </motion.button>
              <div style={{ marginTop: 20, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {isRecording ? `Enregistrement... ${recordDuration}s` : 'Appuyez pour parler'}
              </div>
              {isRecording && (
                <div style={{
                  marginTop: 12, display: 'flex', justifyContent: 'center', gap: 3,
                }}>
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [6, Math.random() * 20 + 6, 6] }}
                      transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.05 }}
                      style={{
                        width: 3, background: '#c4b5fd', borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setShowVoiceModal(false)
                  setIsRecording(false)
                  if (recordDuration > 0) setToast({ text: `🎤 Note envoyée (${recordDuration}s)`, color: '#8b5cf6' })
                }}
                style={{
                  marginTop: 20, padding: '10px 24px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {recordDuration > 0 ? 'Envoyer' : 'Fermer'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ PHOTO MODAL ══════════ */}
      <AnimatePresence>
        {showPhotoModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowPhotoModal(false); setPhotoTaken(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 20, padding: 20,
                width: 400, border: '1px solid rgba(6,182,212,0.3)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#67e8f9' }}>
                📷 Photo note diététique
              </div>
              <div style={{
                height: 240, borderRadius: 12,
                background: photoTaken
                  ? 'linear-gradient(135deg, #064e3b, #065f46)'
                  : 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '2px dashed rgba(6,182,212,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}>
                {photoTaken ? (
                  <>
                    <span style={{ fontSize: 64 }}>✓</span>
                    <div style={{ color: '#6ee7b7', fontWeight: 700 }}>Photo capturée</div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 64, opacity: 0.3 }}>📸</span>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                      Viseur caméra (mock)
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (photoTaken) {
                      setShowPhotoModal(false)
                      setPhotoTaken(false)
                      setToast({ text: '📷 Photo jointe à la commande', color: '#06b6d4' })
                    } else {
                      setPhotoTaken(true)
                    }
                  }}
                  style={{
                    flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                    background: photoTaken
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {photoTaken ? 'Joindre' : '📸 Capturer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ CUSTOMER NOTES POPUP ══════════ */}
      <AnimatePresence>
        {showCustomerNotes && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCustomerNotes(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 20, padding: 24,
                width: 380, border: '1px solid rgba(245,158,11,0.3)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: '#fcd34d' }}>
                ⭐ Notes client — {selectedTable?.name}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
                Client récurrent · préférences enregistrées
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customerNotes.map((note, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: 13, color: '#fef3c7',
                  }}>
                    {note}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowCustomerNotes(false)}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 16,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ NOTE POPUP ══════════ */}
      <AnimatePresence>
        {notePopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setNotePopup(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 16, padding: 24,
                width: 360, border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                {notePopup.menuItem.emoji} {notePopup.menuItem.name}
              </div>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Ex: sans gluten, bien cuit, sans oignon..."
                style={{
                  width: '100%', height: 80, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', fontSize: 14, padding: 12,
                  fontFamily: 'inherit', resize: 'none', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setNotePopup(null)}
                  style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={submitNote}
                  style={{
                    flex: 1, height: 44, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none', color: '#fff',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Ajouter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ TOAST ══════════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              padding: '12px 28px', borderRadius: 12,
              background: toast.color || 'rgba(16,185,129,0.95)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              boxShadow: `0 8px 32px ${toast.color || 'rgba(16,185,129,0.4)'}60`,
              zIndex: 10001, pointerEvents: 'none',
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
