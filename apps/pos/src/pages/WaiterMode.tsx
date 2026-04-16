import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePOS,
  MENU_CATEGORIES,
  STATUS_COLORS,
  STATUS_LABELS,
  tableTotal,
  elapsed,
  type MenuItem,
  type Table,
  type OrderItem,
} from '../store/posStore'

const uid = () => Math.random().toString(36).slice(2, 9)

const CAT_EMOJIS: Record<string, string> = {
  Boissons: '☕', Bières: '🍺', Vins: '🍷', Cocktails: '🍹', Cuisine: '🍔', Desserts: '🍮',
}

export default function WaiterMode({ onExit }: { onExit: () => void }) {
  const tables = usePOS(s => s.tables)
  const menu = usePOS(s => s.menu).filter(m => m.active)
  const settings = usePOS(s => s.settings)
  const currentStaff = usePOS(s => s.currentStaff)
  const addItem = usePOS(s => s.addItem)
  const removeItem = usePOS(s => s.removeItem)
  const setItemQty = usePOS(s => s.setItemQty)
  const setItemNote = usePOS(s => s.setItemNote)
  const processPayment = usePOS(s => s.processPayment)
  const openTable = usePOS(s => s.openTable)

  const [selectedTableId, setSelectedTableId] = useState<string>('t3')
  const [activeCat, setActiveCat] = useState(MENU_CATEGORIES[0])
  const [clock, setClock] = useState(new Date())
  const [toast, setToast] = useState<string | null>(null)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)
  const [notePopup, setNotePopup] = useState<{ menuItem: MenuItem } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false)
  const [splitPopup, setSplitPopup] = useState(false)
  const [receiptPopup, setReceiptPopup] = useState(false)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = useRef<{ itemId: string; time: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTableDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const selectedTable = tables.find(t => t.id === selectedTableId)
  const allItems: OrderItem[] = selectedTable?.covers.flatMap(c => c.items) ?? []
  const total = selectedTable ? tableTotal(selectedTable) : 0
  const taxRate = settings.taxRate || 0
  const subtotal = total
  const tva = subtotal * taxRate
  const totalTTC = subtotal + tva
  const coverCount = selectedTable?.covers.length ?? 0

  // Ensure selected table is occupied (auto-open with 2 covers if needed for demo)
  useEffect(() => {
    if (selectedTable && selectedTable.status === 'available') {
      openTable(selectedTableId, 2)
    }
  }, [selectedTableId])

  const filteredProducts = menu.filter(m => m.category === activeCat)

  // Get qty of a menu item in current order
  const getItemQty = useCallback((menuItemId: string) => {
    return allItems.filter(i => i.menuItemId === menuItemId).reduce((s, i) => s + i.qty, 0)
  }, [allItems])

  // Add item (single tap)
  function handleAddItem(menuItem: MenuItem) {
    if (!selectedTable || selectedTable.covers.length === 0) return
    const coverId = selectedTable.covers[0].id
    addItem(selectedTableId, coverId, menuItem)
    setFlashItemId(menuItem.id)
    setTimeout(() => setFlashItemId(null), 300)
  }

  // Long press handlers
  function handlePointerDown(menuItem: MenuItem) {
    longPressTimer.current = setTimeout(() => {
      setNotePopup({ menuItem })
      setNoteText('')
      longPressTimer.current = null
    }, 500)
  }
  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Double-tap to remove item
  function handleItemTap(item: OrderItem) {
    const now = Date.now()
    if (lastTapRef.current && lastTapRef.current.itemId === item.id && now - lastTapRef.current.time < 400) {
      removeItem(selectedTableId, item.id)
      lastTapRef.current = null
    } else {
      lastTapRef.current = { itemId: item.id, time: now }
    }
  }

  // Send to kitchen
  function sendToKitchen() {
    setToast('Envoy\u00e9 \u2713')
  }

  // Quick payment
  function handlePayment() {
    processPayment(selectedTableId, 'card', 0)
    setToast('Paiement effectu\u00e9 \u2713')
    // Select next occupied table or stay
    const nextOccupied = tables.find(t => t.id !== selectedTableId && t.status === 'occupied')
    if (nextOccupied) setSelectedTableId(nextOccupied.id)
  }

  // Note submit
  function submitNote() {
    if (notePopup && selectedTable && selectedTable.covers.length > 0) {
      const coverId = selectedTable.covers[0].id
      addItem(selectedTableId, coverId, notePopup.menuItem, noteText)
      setFlashItemId(notePopup.menuItem.id)
      setTimeout(() => setFlashItemId(null), 300)
    }
    setNotePopup(null)
    setNoteText('')
  }

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const formatPrice = (n: number) => `${n.toFixed(2)} ${settings.currency}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#07070d', color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', touchAction: 'manipulation',
      userSelect: 'none',
    }}>

      {/* ══════════ TOP BAR ══════════ */}
      <header style={{
        height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10,10,22,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Left: badge + server */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mode badge */}
          <div style={{
            padding: '5px 14px', borderRadius: 20,
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10b981', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.02em',
          }}>
            Mode Serveur
          </div>

          {/* Server name + dot */}
          {currentStaff && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                background: currentStaff.color,
                boxShadow: `0 0 8px ${currentStaff.color}`,
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>
                {currentStaff.name}
              </span>
            </div>
          )}

          {/* Table selector dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setTableDropdownOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {selectedTable?.name ?? 'Table...'}
              <span style={{ fontSize: 10, opacity: 0.7 }}>{tableDropdownOpen ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence>
              {tableDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: '#12121f', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: 6, zIndex: 100,
                    minWidth: 220, maxHeight: 320, overflowY: 'auto',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  }}
                >
                  {tables.filter(t => !t.isMergedInto).map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTableId(t.id); setTableDropdownOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 12px', borderRadius: 7,
                        background: t.id === selectedTableId ? 'rgba(99,102,241,0.15)' : 'transparent',
                        border: 'none', color: '#e2e8f0', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: STATUS_COLORS[t.status],
                        boxShadow: `0 0 6px ${STATUS_COLORS[t.status]}`,
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1 }}>{t.name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: clock + exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em',
          }}>
            {formatTime(clock)}
          </span>
          <button
            onClick={onExit}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.25)',
              color: '#fb7185', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Quitter
          </button>
        </div>
      </header>

      {/* ══════════ MAIN AREA ══════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL (55%) — Quick Order ── */}
        <div style={{
          width: '55%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>

          {/* Table info bar */}
          {selectedTable && (
            <div style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(10,10,22,0.6)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: STATUS_COLORS[selectedTable.status],
                boxShadow: `0 0 8px ${STATUS_COLORS[selectedTable.status]}`,
              }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedTable.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>—</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {coverCount} couvert{coverCount > 1 ? 's' : ''}
              </span>
              {selectedTable.openedAt && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>—</span>
                  <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 600 }}>
                    {elapsed(selectedTable.openedAt)}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Category pills */}
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px',
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
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 48, padding: '0 20px', borderRadius: 12,
                    background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive ? '#a5b4fc' : '#94a3b8',
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{CAT_EMOJIS[cat] ?? '🍽️'}</span>
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Product grid */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
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
                    minHeight: 80, padding: '12px 14px',
                    borderRadius: 12,
                    background: qty > 0 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                    border: qty > 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                    color: '#e2e8f0', textAlign: 'left',
                    transition: 'background .15s, border .15s',
                    touchAction: 'manipulation',
                  }}
                >
                  <span style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>
                      {formatPrice(item.price)}
                    </div>
                  </div>

                  {/* Qty badge */}
                  {qty > 0 && (
                    <div style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 26, height: 26, borderRadius: '50%',
                      background: '#6366f1', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
                    }}>
                      {qty}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Send to kitchen button */}
          {allItems.length > 0 && (
            <div style={{ padding: '0 16px 16px 16px', flexShrink: 0 }}>
              <motion.button
                onClick={sendToKitchen}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', color: '#fff',
                  fontSize: 17, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ fontSize: 22 }}>🔥</span>
                Envoyer en cuisine
              </motion.button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (45%) — Live Ticket ── */}
        <div style={{
          width: '45%', display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,22,0.4)',
          overflow: 'hidden',
        }}>

          {/* Ticket header */}
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800 }}>Commande</span>
              {selectedTable && (
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: 14 }}>
                  — {selectedTable.name}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 18, fontWeight: 800, color: '#818cf8',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatPrice(totalTTC)}
            </span>
          </div>

          {/* Items list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {allItems.length === 0 && (
              <div style={{
                padding: 40, textAlign: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: 14,
              }}>
                Aucun article
              </div>
            )}

            <AnimatePresence>
              {allItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleItemTap(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setItemQty(selectedTableId, item.id, item.qty - 1) }}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(244,63,94,0.1)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        color: '#fb7185', fontSize: 16, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      width: 28, textAlign: 'center',
                      fontSize: 15, fontWeight: 800, color: '#a5b4fc',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setItemQty(selectedTableId, item.id, item.qty + 1) }}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.2)',
                        color: '#10b981', fontSize: 16, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Name + note */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    {item.note && (
                      <div style={{
                        fontSize: 11, color: '#f59e0b', marginTop: 2,
                        fontStyle: 'italic',
                      }}>
                        📝 {item.note}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  }}>
                    {formatPrice(item.price * item.qty)}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(selectedTableId, item.id) }}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(244,63,94,0.08)',
                      border: '1px solid rgba(244,63,94,0.15)',
                      color: '#fb7185', fontSize: 14,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, opacity: 0.6,
                    }}
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Separator + totals */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Sous-total</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                {formatPrice(subtotal)}
              </span>
            </div>
            {taxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  TVA ({(taxRate * 100).toFixed(0)}%)
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatPrice(tva)}
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 20, fontWeight: 900 }}>Total</span>
              <span style={{
                fontSize: 22, fontWeight: 900, color: '#818cf8',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPrice(totalTTC)}
              </span>
            </div>
          </div>

          {/* Bottom action buttons */}
          <div style={{
            display: 'flex', gap: 8, padding: '0 16px 16px 16px',
            flexShrink: 0,
          }}>
            {/* Encaisser */}
            <motion.button
              onClick={handlePayment}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: 5, height: 50, borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', color: '#fff',
                fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              Encaisser
            </motion.button>

            {/* Diviser */}
            <motion.button
              onClick={() => setSplitPopup(true)}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: 3, height: 50, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Diviser
            </motion.button>

            {/* Imprimer */}
            <motion.button
              onClick={() => setReceiptPopup(true)}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: 2, height: 50, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Imprimer
            </motion.button>
          </div>
        </div>
      </div>

      {/* ══════════ TOAST ══════════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
              padding: '14px 32px', borderRadius: 14,
              background: 'rgba(16,185,129,0.95)',
              color: '#fff', fontSize: 16, fontWeight: 800,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              zIndex: 10001, pointerEvents: 'none',
              letterSpacing: '0.02em',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ NOTE POPUP ══════════ */}
      <AnimatePresence>
        {notePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setNotePopup(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 16, padding: 24,
                width: 360, maxWidth: '90vw',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {notePopup.menuItem.emoji} {notePopup.menuItem.name}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                Note cuisine...
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
                  fontFamily: 'inherit', resize: 'none',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setNotePopup(null)}
                  style={{
                    flex: 1, height: 46, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={submitNote}
                  style={{
                    flex: 1, height: 46, borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none', color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Ajouter avec note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ SPLIT POPUP ══════════ */}
      <AnimatePresence>
        {splitPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setSplitPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#12121f', borderRadius: 16, padding: 24,
                width: 340, maxWidth: '90vw',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                Diviser l'addition
              </div>
              {coverCount > 0 ? (
                <>
                  <div style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12,
                  }}>
                    Division \u00e9gale entre {coverCount} couvert{coverCount > 1 ? 's' : ''} :
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: '#818cf8',
                    textAlign: 'center', padding: '16px 0',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatPrice(totalTTC / Math.max(coverCount, 1))}
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>
                      / personne
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
                  Aucun couvert ouvert
                </div>
              )}
              <button
                onClick={() => setSplitPopup(false)}
                style={{
                  width: '100%', height: 46, borderRadius: 10, marginTop: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ RECEIPT / IMPRIMER POPUP ══════════ */}
      <AnimatePresence>
        {receiptPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10002,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setReceiptPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 12, padding: 24,
                width: 320, maxWidth: '90vw', color: '#111',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.05em' }}>
                  {settings.restaurantName}
                </div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  {selectedTable?.name} — {new Date().toLocaleDateString('fr-LU')}
                </div>
              </div>
              <div style={{
                borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc',
                padding: '8px 0', margin: '8px 0',
              }}>
                {allItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, padding: '3px 0',
                  }}>
                    <span>{item.qty}x {item.name}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 16, fontWeight: 900, padding: '6px 0',
              }}>
                <span>TOTAL</span>
                <span>{formatPrice(totalTTC)}</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#999' }}>
                Merci de votre visite !
              </div>
              <button
                onClick={() => { setReceiptPopup(false); setToast('Ticket imprim\u00e9 \u2713') }}
                style={{
                  width: '100%', height: 44, borderRadius: 10, marginTop: 16,
                  background: '#111', border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Imprimer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
