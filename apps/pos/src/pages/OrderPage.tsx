import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Cover, MenuItem, OrderItem, coverTotal, tableTotal, elapsed, MENU_CATEGORIES } from '../store/posStore'

interface Props {
  tableId: string
  onBack: () => void
  onPay: () => void
}

// ─── Category icons ─────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Boissons': '🥤',
  'Bieres': '🍺',
  'Bières': '🍺',
  'Vins': '🍷',
  'Cocktails': '🍹',
  'Cuisine': '🍽️',
  'Desserts': '🍰',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Boissons': '#38bdf8',
  'Bieres': '#fbbf24',
  'Bières': '#fbbf24',
  'Vins': '#c084fc',
  'Cocktails': '#fb7185',
  'Cuisine': '#f97316',
  'Desserts': '#a78bfa',
}

// ─── Product descriptions (mock) ────────────────────────────────────────────
const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'm1': 'Source naturelle 50cl',
  'm2': 'Limonade artisanale maison',
  'm3': 'Fraîchement pressé',
  'm4': 'Café arabica corsé',
  'm5': 'Avec lait mousseux',
  'm6': 'Thé en feuilles',
  'm7': 'Bière blonde pression 33cl',
  'm8': 'Bière blonde bouteille 33cl',
  'm9': 'Bière 0.0% 33cl',
  'm10': 'Riesling luxembourgeois',
  'm11': 'Pinot noir sélection',
  'm12': 'Extra dry italien',
  'm13': 'Brut millésimé',
  'm14': 'Rhum, menthe, citron vert',
  'm15': 'Apérol, prosecco, soda',
  'm16': 'Tequila, triple sec, citron',
  'm17': 'Gin premium, tonic artisanal',
  'm18': 'Sans alcool, menthe fraîche',
  'm19': 'Jambon sec, saucisson, coppa',
  'm20': 'Sélection affinée du jour',
  'm21': 'Bœuf Angus, cheddar, bacon',
  'm22': 'Poulet grillé, œuf, salade',
  'm23': 'Poulet croustillant, parmesan',
  'm24': 'Guanciale, pecorino, œuf',
  'm25': 'Frites maison croustillantes',
  'm26': 'Mascarpone, café, cacao',
  'm27': 'Chocolat noir 70% cacao',
  'm28': '3 boules au choix',
}

// ─── Mock clients ────────────────────────────────────────────────────────────
interface MockClient {
  id: string
  name: string
  phone: string
  tier: 'Gold' | 'Silver' | 'Bronze' | 'Guest'
  points: number
  discount: number
}

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

// ─── Course/Gang System ─────────────────────────────────────────────────────
const COURSES = [
  { id: 'aperitif', label: 'Apéritif', color: '#fbbf24', icon: '🥂' },
  { id: 'entree',   label: 'Entrée',   color: '#34d399', icon: '🥗' },
  { id: 'plat',     label: 'Plat',     color: '#f97316', icon: '🍽' },
  { id: 'dessert',  label: 'Dessert',  color: '#c084fc', icon: '🍰' },
  { id: 'boisson',  label: 'Boisson',  color: '#38bdf8', icon: '🍺' },
] as const

type CourseId = typeof COURSES[number]['id']

// ─── Ticket Item Row ────────────────────────────────────────────────────────
function TicketItemRow({
  tableId,
  item,
  otherCovers,
  isSelected,
  onSelect,
  index,
  isOffered,
  discountPercent,
}: {
  tableId: string
  item: { id: string; name: string; price: number; qty: number; note: string; coverId: string }
  otherCovers: Cover[]
  isSelected: boolean
  onSelect: () => void
  index: number
  isOffered?: boolean
  discountPercent?: number
}) {
  const [showNote, setShowNote] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const setItemNote = usePOS(s => s.setItemNote)
  const moveItemToCover = usePOS(s => s.moveItemToCover)

  const hasNote = !!item.note
  const rawLineTotal = item.price * item.qty
  const lineTotal = isOffered ? 0 : discountPercent ? rawLineTotal * (1 - discountPercent / 100) : rawLineTotal

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        background: isSelected
          ? 'rgba(99,102,241,0.1)'
          : isOffered
            ? 'rgba(16,185,129,0.06)'
            : hasNote
              ? 'rgba(251,191,36,0.04)'
              : index % 2 === 1
                ? 'rgba(255,255,255,0.015)'
                : 'transparent',
        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Qty badge */}
        <div style={{
          minWidth: 28, height: 28, borderRadius: 8,
          background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
          border: isSelected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          color: isSelected ? '#818cf8' : '#94a3b8',
        }}>
          {item.qty}
        </div>

        {/* Name + note + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, color: isOffered ? '#10b981' : '#e2e8f0', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {item.name}
            {isOffered && (
              <span style={{
                fontSize: 9, fontWeight: 800,
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                padding: '1px 6px', borderRadius: 6,
                border: '1px solid rgba(16,185,129,0.3)',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Offert
              </span>
            )}
            {!!discountPercent && !isOffered && (
              <span style={{
                fontSize: 9, fontWeight: 800,
                background: 'rgba(129,140,248,0.15)',
                color: '#818cf8',
                padding: '1px 6px', borderRadius: 6,
                border: '1px solid rgba(129,140,248,0.3)',
              }}>
                -{discountPercent}%
              </span>
            )}
          </div>
          {item.note && (
            <div style={{
              fontSize: 11, marginTop: 3,
              color: '#fbbf24',
              background: 'rgba(251,191,36,0.08)',
              padding: '2px 8px',
              borderRadius: 6,
              display: 'inline-block',
              fontWeight: 500,
              border: '1px solid rgba(251,191,36,0.15)',
            }}>
              📝 {item.note}
            </div>
          )}
        </div>

        {/* Price: unit + line total */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{
            fontSize: 13,
            color: isOffered ? '#10b981' : discountPercent ? '#818cf8' : '#e2e8f0',
            fontWeight: 600,
            textDecoration: isOffered ? 'line-through' : 'none',
          }}>
            {isOffered ? rawLineTotal.toFixed(2) : lineTotal.toFixed(2)} €
          </div>
          {isOffered && (
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>0.00 €</div>
          )}
          {item.qty > 1 && !isOffered && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
              {item.price.toFixed(2)} /u
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setShowNote(v => !v) }}
            title="Note"
            style={{
              width: 26, height: 26, borderRadius: 8,
              border: 'none',
              background: item.note ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
              color: item.note ? '#fbbf24' : '#475569',
              fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✏️
          </motion.button>
          {otherCovers.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setShowMove(v => !v) }}
              title="Deplacer"
              style={{
                width: 26, height: 26, borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.04)',
                color: '#475569', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ⇄
            </motion.button>
          )}
        </div>
      </div>

      {/* Note input */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', marginTop: 8, paddingLeft: 38 }}
          >
            <input
              autoFocus
              placeholder="Note de cuisine..."
              value={item.note}
              onChange={e => setItemNote(tableId, item.id, e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setShowNote(false)}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '7px 12px', borderRadius: 10,
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.08)',
                color: '#e2e8f0', fontSize: 12, outline: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move to cover */}
      <AnimatePresence>
        {showMove && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', marginTop: 8, paddingLeft: 38, display: 'flex', flexWrap: 'wrap', gap: 6 }}
          >
            {otherCovers.map(c => (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  moveItemToCover(tableId, item.id, c.id)
                  setShowMove(false)
                }}
                style={{
                  padding: '4px 12px', borderRadius: 12,
                  border: '1px solid rgba(99,102,241,0.2)',
                  background: 'rgba(99,102,241,0.08)',
                  color: '#818cf8', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                → {c.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Numpad ──────────────────────────────────────────────────────────────────
function Numpad({
  selectedItemId,
  tableId,
  onRemise,
  onCuisine,
  onOffrir,
}: {
  selectedItemId: string | null
  tableId: string
  onRemise: () => void
  onCuisine: () => void
  onOffrir: () => void
}) {
  const setItemQty = usePOS(s => s.setItemQty)
  const removeItem = usePOS(s => s.removeItem)
  const addItem = usePOS(s => s.addItem)
  const setItemNote = usePOS(s => s.setItemNote)
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const [buffer, setBuffer] = useState('')

  const selectedItem = useMemo(() => {
    if (!table || !selectedItemId) return null
    for (const c of table.covers) {
      const item = c.items.find(i => i.id === selectedItemId)
      if (item) return item
    }
    return null
  }, [table, selectedItemId])

  useEffect(() => {
    setBuffer('')
  }, [selectedItemId])

  function handleDigit(d: string) {
    if (!selectedItemId) return
    const next = buffer + d
    setBuffer(next)
    const val = parseInt(next, 10)
    if (val > 0 && val <= 99) {
      setItemQty(tableId, selectedItemId, val)
    }
  }

  function handleClear() {
    setBuffer('')
    if (selectedItemId) {
      setItemQty(tableId, selectedItemId, 1)
    }
  }

  function handleDelete() {
    if (selectedItemId) {
      removeItem(tableId, selectedItemId)
      setBuffer('')
    }
  }

  function handleRepeat() {
    if (!selectedItem || !table) return
    const menuItem = menu.find(m => m.id === selectedItem.menuItemId)
    if (!menuItem) return
    addItem(tableId, selectedItem.coverId, menuItem, selectedItem.note)
  }

  function handleVoid() {
    if (selectedItemId) {
      removeItem(tableId, selectedItemId)
      setBuffer('')
    }
  }

  function handleSupplement() {
    if (!selectedItemId || !selectedItem) return
    const currentNote = selectedItem.note
    const supp = prompt('Supplément :')
    if (supp && supp.trim()) {
      const newNote = currentNote ? `${currentNote}, +${supp.trim()}` : `+${supp.trim()}`
      setItemNote(tableId, selectedItemId, newNote)
    }
  }

  function handleNote() {
    if (!selectedItemId || !selectedItem) return
    const note = prompt('Note cuisine :', selectedItem.note)
    if (note !== null) {
      setItemNote(tableId, selectedItemId, note)
    }
  }

  const numKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', 'DEL']

  const isActive = !!selectedItemId

  return (
    <div style={{ padding: '12px 14px', flexShrink: 0 }}>
      {/* Selected item indicator */}
      <div style={{
        height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, borderRadius: 10,
        background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
        border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.04)',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: isActive ? '#818cf8' : '#374151',
        }}>
          {selectedItem
            ? `${selectedItem.name} × ${selectedItem.qty}`
            : 'Sélectionnez un article'}
        </span>
      </div>

      {/* Numpad grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}>
        {numKeys.map(k => {
          const isDel = k === 'DEL'
          const isClear = k === 'C'
          const isSpecial = isDel || isClear
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (isClear) handleClear()
                else if (isDel) handleDelete()
                else handleDigit(k)
              }}
              disabled={!isActive && !isSpecial}
              style={{
                height: 44, borderRadius: 12,
                border: isDel
                  ? '1px solid rgba(244,63,94,0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isDel
                  ? 'rgba(244,63,94,0.12)'
                  : isClear
                    ? 'rgba(251,191,36,0.1)'
                    : 'rgba(255,255,255,0.04)',
                color: isDel
                  ? '#fb7185'
                  : isClear
                    ? '#fbbf24'
                    : isActive ? '#e2e8f0' : '#374151',
                fontSize: isDel ? 11 : 16,
                fontWeight: 700,
                cursor: isActive || isSpecial ? 'pointer' : 'default',
                transition: 'all .15s',
                opacity: !isActive && !isSpecial ? 0.4 : 1,
              }}
            >
              {k === 'DEL' ? 'SUPPR' : k}
            </motion.button>
          )
        })}
      </div>

      {/* Quick actions — row 1 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6, marginTop: 10,
      }}>
        {[
          { label: 'Remise',    icon: '%',    color: '#818cf8', action: onRemise },
          { label: 'Cuisine',   icon: '🔥',   color: '#10b981', action: onCuisine },
          { label: 'Diviser',   icon: '✂️',    color: '#fbbf24', action: () => {} },
          { label: 'Offrir',    icon: '🎁',   color: '#f472b6', action: onOffrir },
        ].map(a => (
          <motion.button
            key={a.label}
            whileTap={{ scale: 0.95 }}
            onClick={a.action}
            disabled={!isActive}
            style={{
              padding: '8px 4px', borderRadius: 10,
              border: `1px solid ${a.color}30`,
              background: `${a.color}10`,
              color: isActive ? a.color : '#374151',
              fontSize: 9, fontWeight: 700,
              cursor: isActive ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
              letterSpacing: 0.3,
              opacity: isActive ? 1 : 0.4,
              transition: 'all .15s',
            }}
          >
            <span style={{ fontSize: 13 }}>{a.icon}</span>
            {a.label}
          </motion.button>
        ))}
      </div>

      {/* Extra professional actions — row 2 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6, marginTop: 6,
      }}>
        {[
          { label: 'Supplément', icon: '➕', color: '#34d399', action: handleSupplement },
          { label: 'Note',       icon: '📋', color: '#fbbf24', action: handleNote },
          { label: 'Répéter',    icon: '🔁', color: '#60a5fa', action: handleRepeat },
          { label: 'Annuler',    icon: '⛔', color: '#f43f5e', action: handleVoid },
        ].map(a => (
          <motion.button
            key={a.label}
            whileTap={{ scale: 0.95 }}
            onClick={a.action}
            disabled={!isActive}
            style={{
              padding: '7px 2px', borderRadius: 10,
              border: `1px solid ${a.color}30`,
              background: `${a.color}10`,
              color: isActive ? a.color : '#374151',
              fontSize: 9, fontWeight: 700,
              cursor: isActive ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 1,
              letterSpacing: 0.2,
              opacity: isActive ? 1 : 0.4,
              transition: 'all .15s',
            }}
          >
            <span style={{ fontSize: 12 }}>{a.icon}</span>
            {a.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Menu Card ───────────────────────────────────────────────────────────────
function MenuCard({
  item,
  onAdd,
  qtyInOrder,
  categoryColor,
  isPopular,
}: {
  item: MenuItem
  onAdd: () => void
  qtyInOrder: number
  categoryColor: string
  isPopular: boolean
}) {
  const isDisabled = !item.active
  const description = PRODUCT_DESCRIPTIONS[item.id] || ''

  return (
    <motion.button
      whileTap={isDisabled ? {} : { scale: 0.95 }}
      whileHover={isDisabled ? {} : {
        boxShadow: '0 0 20px rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.3)',
      }}
      onClick={() => { if (!isDisabled) onAdd() }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '16px 18px', borderRadius: 16, cursor: isDisabled ? 'not-allowed' : 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${categoryColor}`,
        background: isDisabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
        textAlign: 'left',
        transition: 'border-color .2s',
        position: 'relative',
        overflow: 'hidden',
        opacity: isDisabled ? 0.45 : 1,
        minHeight: 120,
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Out of stock overlay */}
      {isDisabled && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2,
        }}>
          <span style={{
            color: '#f43f5e', fontSize: 11, fontWeight: 800,
            background: 'rgba(244,63,94,0.15)',
            padding: '4px 12px', borderRadius: 8,
            border: '1px solid rgba(244,63,94,0.3)',
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            Épuisé
          </span>
        </div>
      )}

      {/* Qty in order badge */}
      {qtyInOrder > 0 && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          minWidth: 22, height: 22, borderRadius: 11,
          background: '#6366f1',
          color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3,
          padding: '0 5px',
          boxShadow: '0 2px 8px rgba(99,102,241,0.5)',
        }}>
          {qtyInOrder}
        </div>
      )}

      {/* Popular badge */}
      {isPopular && !isDisabled && (
        <div style={{
          position: 'absolute', top: 8, left: 12,
          fontSize: 8, fontWeight: 800,
          background: 'rgba(251,191,36,0.15)',
          color: '#fbbf24',
          padding: '2px 7px', borderRadius: 6,
          border: '1px solid rgba(251,191,36,0.3)',
          textTransform: 'uppercase', letterSpacing: 0.5,
          zIndex: 3,
        }}>
          ⭐ Populaire
        </div>
      )}

      <span style={{ fontSize: 34, marginBottom: 8, position: 'relative', marginTop: isPopular ? 16 : 0 }}>{item.emoji}</span>
      <span style={{
        fontSize: 12, color: '#e2e8f0', fontWeight: 500,
        lineHeight: 1.3, marginBottom: 2, position: 'relative',
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      } as React.CSSProperties}>
        {item.name}
      </span>
      {description && (
        <span style={{
          fontSize: 10, color: '#475569', fontWeight: 400,
          lineHeight: 1.3, marginBottom: 6, position: 'relative',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}>
          {description}
        </span>
      )}
      <span style={{
        fontSize: 16, color: '#818cf8', fontWeight: 800, position: 'relative',
        letterSpacing: -0.3, marginTop: 'auto',
      }}>
        {item.price.toFixed(2)} €
      </span>
    </motion.button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OrderPage({ tableId, onBack, onPay }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const currentStaff = usePOS(s => s.currentStaff)
  const addItem = usePOS(s => s.addItem)
  const addCover = usePOS(s => s.addCover)
  const removeCover = usePOS(s => s.removeCover)
  const renameCover = usePOS(s => s.renameCover)
  const mergeTables = usePOS(s => s.mergeTables)
  const tables = usePOS(s => s.tables)

  const [activeCoverId, setActiveCoverId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(MENU_CATEGORIES[0])
  const [search, setSearch] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [editingCoverLabel, setEditingCoverLabel] = useState<string | null>(null)
  const [coverLabelInput, setCoverLabelInput] = useState('')
  const [showMerge, setShowMerge] = useState(false)
  const [activeCourse, setActiveCourse] = useState<CourseId>('plat')
  const [courseMap, setCourseMap] = useState<Record<string, CourseId>>({})

  // --- Client search state ---
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [clientQuery, setClientQuery] = useState('')
  const [linkedClient, setLinkedClient] = useState<MockClient | null>(null)

  // --- Remise panel state ---
  const [showRemise, setShowRemise] = useState(false)
  const [itemDiscounts, setItemDiscounts] = useState<Record<string, number>>({})

  // --- Offrir (gift) state ---
  const [offeredItems, setOfferedItems] = useState<Set<string>>(new Set())

  // --- Cuisine toast ---
  const [showCuisineToast, setShowCuisineToast] = useState(false)

  const catScrollRef = useRef<HTMLDivElement>(null)

  // Elapsed time ticker
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  if (!table) return null

  const resolvedCoverId = activeCoverId && table.covers.find(c => c.id === activeCoverId)
    ? activeCoverId
    : table.covers[0]?.id ?? null

  const activeCover = table.covers.find(c => c.id === resolvedCoverId)
  const otherCovers = table.covers.filter(c => c.id !== resolvedCoverId)

  const filteredMenu = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return menu.filter(m => m.name.toLowerCase().includes(q))
    }
    return menu.filter(m => m.category === activeCategory)
  }, [menu, activeCategory, search])

  // Track which items are "first 3" in their category for popular badge
  const popularItemIds = useMemo(() => {
    const ids = new Set<string>()
    const catMap: Record<string, number> = {}
    for (const m of menu) {
      const count = catMap[m.category] || 0
      if (count < 3) {
        ids.add(m.id)
        catMap[m.category] = count + 1
      }
    }
    return ids
  }, [menu])

  // Build qty-in-order map for the whole table
  const qtyInOrderMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!table) return map
    for (const c of table.covers) {
      for (const it of c.items) {
        map[it.menuItemId] = (map[it.menuItemId] || 0) + it.qty
      }
    }
    return map
  }, [table])

  // Category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of MENU_CATEGORIES) {
      counts[cat] = menu.filter(m => m.category === cat).length
    }
    return counts
  }, [menu])

  // Group items by course for display
  const itemsByCourse = useMemo(() => {
    if (!activeCover) return []
    const groups: { course: typeof COURSES[number]; items: (OrderItem & { _idx: number })[] }[] = []
    const courseGroups = new Map<CourseId, (OrderItem & { _idx: number })[]>()
    const uncategorized: (OrderItem & { _idx: number })[] = []

    activeCover.items.forEach((item, idx) => {
      const cId = courseMap[item.id]
      if (cId) {
        if (!courseGroups.has(cId)) courseGroups.set(cId, [])
        courseGroups.get(cId)!.push({ ...item, _idx: idx })
      } else {
        uncategorized.push({ ...item, _idx: idx })
      }
    })

    for (const course of COURSES) {
      const items = courseGroups.get(course.id)
      if (items && items.length > 0) {
        groups.push({ course, items })
      }
    }
    if (uncategorized.length > 0) {
      groups.push({
        course: { id: 'autre' as CourseId, label: 'Autre', color: '#64748b', icon: '📋' },
        items: uncategorized,
      })
    }
    return groups
  }, [activeCover, courseMap])

  // Flat item list (for index counting)
  const flatItems = useMemo(() => {
    return itemsByCourse.flatMap(g => g.items)
  }, [itemsByCourse])

  // Calculate total with discounts and offers
  const total = useMemo(() => {
    let sum = 0
    if (!table) return 0
    for (const c of table.covers) {
      for (const it of c.items) {
        if (offeredItems.has(it.id)) continue
        const disc = itemDiscounts[it.id] || 0
        sum += it.price * it.qty * (1 - disc / 100)
      }
    }
    // Apply linked client discount
    if (linkedClient && linkedClient.discount > 0) {
      sum = sum * (1 - linkedClient.discount / 100)
    }
    return sum
  }, [table, offeredItems, itemDiscounts, linkedClient])

  const mergeableTable = tables.find(t => t.id !== tableId && t.status === 'occupied' && !t.isMergedInto)

  // Client search filter
  const filteredClients = useMemo(() => {
    if (!clientQuery.trim()) return MOCK_CLIENTS
    const q = clientQuery.toLowerCase()
    return MOCK_CLIENTS.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    )
  }, [clientQuery])

  function handleAddItem(item: MenuItem) {
    if (!resolvedCoverId) return
    addItem(tableId, resolvedCoverId, item)
    // Tag item with current course (find the newly added / incremented item)
    setTimeout(() => {
      const freshTable = usePOS.getState().tables.find(t => t.id === tableId)
      if (!freshTable) return
      const cover = freshTable.covers.find(c => c.id === resolvedCoverId)
      if (!cover) return
      const lastItem = cover.items[cover.items.length - 1]
      if (lastItem && !courseMap[lastItem.id]) {
        setCourseMap(prev => ({ ...prev, [lastItem.id]: activeCourse }))
      }
    }, 10)
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

  // --- Remise handler ---
  function handleRemise() {
    if (!selectedItemId) return
    setShowRemise(prev => !prev)
  }

  function applyDiscount(percent: number) {
    if (!selectedItemId) return
    if (percent === 100) {
      // "Gratuit" = offer it
      setOfferedItems(prev => { const s = new Set(prev); s.add(selectedItemId); return s })
    } else {
      setItemDiscounts(prev => ({ ...prev, [selectedItemId]: percent }))
    }
    setShowRemise(false)
  }

  // --- Cuisine handler ---
  function handleCuisine() {
    setShowCuisineToast(true)
    setTimeout(() => setShowCuisineToast(false), 2000)
  }

  // --- Offrir handler ---
  function handleOffrir() {
    if (!selectedItemId) return
    setOfferedItems(prev => {
      const s = new Set(prev)
      if (s.has(selectedItemId)) {
        s.delete(selectedItemId)
      } else {
        s.add(selectedItemId)
      }
      return s
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: '#07070d',
      position: 'relative',
    }}>

      {/* ═══ Cuisine Toast ═══ */}
      <AnimatePresence>
        {showCuisineToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute', top: 20, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              padding: '14px 32px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))',
              color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              display: 'flex', alignItems: 'center', gap: 10,
              backdropFilter: 'blur(20px)',
            }}
          >
            🔥 Envoyé en cuisine ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area: left + right */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
      }}>

        {/* ═══════════ LEFT PANEL — Ticket ═══════════ */}
        <div style={{
          width: '30%', minWidth: 340, maxWidth: 420,
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#0a0a14',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '0 20px 0 0',
        }}>
          {/* Ticket Header */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onBack}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ←
                </motion.button>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {table.name}
                    {linkedClient && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: TIER_COLORS[linkedClient.tier].text,
                        background: TIER_COLORS[linkedClient.tier].bg,
                        border: `1px solid ${TIER_COLORS[linkedClient.tier].border}`,
                        padding: '2px 8px', borderRadius: 8,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        👤 {linkedClient.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    {table.covers.length} couvert{table.covers.length > 1 ? 's' : ''}
                    {table.mergedWith.length > 0 && (
                      <span style={{ color: '#8b5cf6', marginLeft: 6 }}>
                        🔗 Jumelée
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Client button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClientSearch(v => !v)}
                  style={{
                    padding: '5px 12px', borderRadius: 10,
                    border: linkedClient
                      ? `1px solid ${TIER_COLORS[linkedClient.tier].border}`
                      : '1px solid rgba(255,255,255,0.1)',
                    background: linkedClient
                      ? TIER_COLORS[linkedClient.tier].bg
                      : 'rgba(255,255,255,0.04)',
                    color: linkedClient
                      ? TIER_COLORS[linkedClient.tier].text
                      : '#64748b',
                    fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  👤 Client
                </motion.button>

                {/* Cover name (editable) */}
                {activeCover && (
                  <div>
                    {editingCoverLabel === activeCover.id ? (
                      <input
                        autoFocus
                        value={coverLabelInput}
                        onChange={e => setCoverLabelInput(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename() }}
                        style={{
                          width: 120, padding: '5px 10px', borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.3)',
                          background: 'rgba(99,102,241,0.08)',
                          color: '#e2e8f0', fontSize: 12, fontWeight: 600, outline: 'none',
                          textAlign: 'right',
                        }}
                      />
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startRenaming(activeCover)}
                        style={{
                          padding: '5px 12px', borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.2)',
                          background: 'rgba(99,102,241,0.08)',
                          color: '#818cf8', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {activeCover.label}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ Client Search Panel ═══ */}
            <AnimatePresence>
              {showClientSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', marginTop: 10 }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {/* Linked client info */}
                    {linkedClient && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 10, marginBottom: 8,
                        background: TIER_COLORS[linkedClient.tier].bg,
                        border: `1px solid ${TIER_COLORS[linkedClient.tier].border}`,
                      }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                            👤 {linkedClient.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            {linkedClient.points} pts fidélité
                            {linkedClient.discount > 0 && (
                              <span style={{ color: '#10b981', marginLeft: 8, fontWeight: 700 }}>
                                -{linkedClient.discount}% remise fidélité
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { setLinkedClient(null); setClientQuery('') }}
                          style={{
                            padding: '4px 10px', borderRadius: 8,
                            border: '1px solid rgba(244,63,94,0.3)',
                            background: 'rgba(244,63,94,0.1)',
                            color: '#fb7185', fontSize: 10, fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Désélectionner
                        </motion.button>
                      </div>
                    )}

                    {/* Search input */}
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <div style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 13, color: '#475569', pointerEvents: 'none',
                      }}>
                        🔍
                      </div>
                      <input
                        autoFocus
                        placeholder="Rechercher un client par nom ou téléphone..."
                        value={clientQuery}
                        onChange={e => setClientQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.2)',
                          background: 'rgba(99,102,241,0.06)',
                          color: '#e2e8f0', fontSize: 12, outline: 'none',
                        }}
                      />
                    </div>

                    {/* Results */}
                    <div style={{ maxHeight: 180, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                      {filteredClients.map(client => {
                        const tierStyle = TIER_COLORS[client.tier]
                        const isLinked = linkedClient?.id === client.id
                        return (
                          <motion.button
                            key={client.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setLinkedClient(client)
                              setShowClientSearch(false)
                              setClientQuery('')
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '8px 10px', borderRadius: 10,
                              border: isLinked
                                ? `1px solid ${tierStyle.border}`
                                : '1px solid transparent',
                              background: isLinked
                                ? tierStyle.bg
                                : 'rgba(255,255,255,0.02)',
                              cursor: 'pointer', marginBottom: 4,
                              textAlign: 'left',
                              transition: 'all .15s',
                            }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 10,
                              background: tierStyle.bg,
                              border: `1px solid ${tierStyle.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14,
                            }}>
                              👤
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                                {client.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>
                                {client.phone}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 800,
                              background: tierStyle.bg,
                              color: tierStyle.text,
                              padding: '2px 8px', borderRadius: 8,
                              border: `1px solid ${tierStyle.border}`,
                              textTransform: 'uppercase', letterSpacing: 0.5,
                            }}>
                              {client.tier}
                            </span>
                          </motion.button>
                        )
                      })}
                      {filteredClients.length === 0 && (
                        <div style={{ padding: 16, textAlign: 'center', color: '#334155', fontSize: 12 }}>
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Table Info Panel ─────────────────────────────────────── */}
          <div style={{
            padding: '8px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 16px',
            }}>
              {[
                { label: 'Table', value: table.name },
                { label: 'Ouvert', value: elapsed(table.openedAt) || '--' },
                { label: 'Serveur', value: currentStaff?.name || '--' },
                { label: 'Couvert', value: activeCover?.label || '--' },
              ].map(info => (
                <div key={info.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, minWidth: 48 }}>
                    {info.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                    {info.value}
                  </span>
                </div>
              ))}
            </div>
            {/* Loyalty info bar */}
            {linkedClient && linkedClient.discount > 0 && (
              <div style={{
                marginTop: 6, padding: '4px 10px', borderRadius: 8,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 10, color: '#10b981', fontWeight: 600,
              }}>
                ⭐ Fidélité {linkedClient.tier} : -{linkedClient.discount}% sur la commande
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                  {linkedClient.points} pts
                </span>
              </div>
            )}
          </div>

          {/* ─── Course/Gang Selector ─────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 4,
            padding: '8px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {COURSES.map(course => {
              const isActive = activeCourse === course.id
              return (
                <motion.button
                  key={course.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCourse(course.id)}
                  style={{
                    padding: '5px 10px', borderRadius: 8,
                    border: `1px solid ${isActive ? course.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    background: isActive ? `${course.color}18` : 'transparent',
                    color: isActive ? course.color : '#475569',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{course.icon}</span>
                  {course.label}
                </motion.button>
              )
            })}
          </div>

          {/* Ticket Items (scrollable) — grouped by course */}
          <div style={{
            flex: 1, overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          }}>
            {activeCover && activeCover.items.length === 0 && (
              <div style={{
                padding: 48, textAlign: 'center', color: '#1e293b',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🗒️</div>
                <div style={{ fontSize: 13, color: '#334155' }}>Aucun article</div>
                <div style={{ fontSize: 11, color: '#1e293b', marginTop: 4 }}>
                  Sélectionnez des produits à droite
                </div>
              </div>
            )}

            {itemsByCourse.map(group => (
              <div key={group.course.id}>
                {/* Course header */}
                <div style={{
                  padding: '6px 16px',
                  background: `${group.course.color}0A`,
                  borderLeft: `3px solid ${group.course.color}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 11 }}>{group.course.icon}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: group.course.color,
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {group.course.label}
                  </span>
                  <span style={{
                    fontSize: 9, color: '#475569', marginLeft: 'auto',
                  }}>
                    {group.items.length} art.
                  </span>
                </div>
                <AnimatePresence>
                  {group.items.map((item, idx) => (
                    <TicketItemRow
                      key={item.id}
                      tableId={tableId}
                      item={item}
                      otherCovers={otherCovers}
                      isSelected={selectedItemId === item.id}
                      onSelect={() => setSelectedItemId(
                        selectedItemId === item.id ? null : item.id
                      )}
                      index={idx}
                      isOffered={offeredItems.has(item.id)}
                      discountPercent={itemDiscounts[item.id]}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}

            {/* Other covers summary */}
            {otherCovers.length > 0 && otherCovers.some(c => c.items.length > 0) && (
              <div style={{
                padding: '10px 16px', margin: '8px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Autres couverts
                </div>
                {otherCovers.filter(c => c.items.length > 0).map(c => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 3,
                  }}>
                    <span style={{ fontSize: 11, color: '#475569' }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                      {coverTotal(c).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ Remise Panel (inline, above numpad) ═══ */}
          <AnimatePresence>
            {showRemise && selectedItemId && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  overflow: 'hidden',
                  borderTop: '1px solid rgba(129,140,248,0.2)',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(99,102,241,0.06)',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, color: '#818cf8',
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                  }}>
                    Appliquer une remise
                  </div>
                  <div style={{
                    display: 'flex', gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    {[
                      { label: '-5%', value: 5 },
                      { label: '-10%', value: 10 },
                      { label: '-15%', value: 15 },
                      { label: '-20%', value: 20 },
                      { label: 'Gratuit', value: 100 },
                    ].map(d => (
                      <motion.button
                        key={d.value}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => applyDiscount(d.value)}
                        style={{
                          padding: '8px 16px', borderRadius: 10,
                          border: d.value === 100
                            ? '1px solid rgba(16,185,129,0.4)'
                            : '1px solid rgba(129,140,248,0.3)',
                          background: d.value === 100
                            ? 'rgba(16,185,129,0.12)'
                            : 'rgba(129,140,248,0.1)',
                          color: d.value === 100 ? '#10b981' : '#818cf8',
                          fontSize: 12, fontWeight: 700,
                          cursor: 'pointer',
                          flex: d.value === 100 ? '1 1 100%' : '1 1 auto',
                          textAlign: 'center',
                        }}
                      >
                        {d.label}
                      </motion.button>
                    ))}
                  </div>
                  {/* Remove discount if existing */}
                  {(itemDiscounts[selectedItemId] || offeredItems.has(selectedItemId)) && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setItemDiscounts(prev => { const n = { ...prev }; delete n[selectedItemId]; return n })
                        setOfferedItems(prev => { const s = new Set(prev); s.delete(selectedItemId); return s })
                        setShowRemise(false)
                      }}
                      style={{
                        marginTop: 6, width: '100%', padding: '7px 0', borderRadius: 10,
                        border: '1px solid rgba(244,63,94,0.3)',
                        background: 'rgba(244,63,94,0.08)',
                        color: '#fb7185', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      Retirer la remise
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Numpad */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <Numpad
              selectedItemId={selectedItemId}
              tableId={tableId}
              onRemise={handleRemise}
              onCuisine={handleCuisine}
              onOffrir={handleOffrir}
            />
          </div>

          {/* Ticket Footer — Total + Pay */}
          <div style={{
            padding: '14px 14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            background: 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(99,102,241,0.08) 100%)',
          }}>
            {/* Merged tables notice */}
            {table.mergedWith.length > 0 && (
              <div style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 8 }}>
                🔗 Jumelée avec : {table.mergedWith.map(id => tables.find(t => t.id === id)?.name ?? id).join(', ')}
              </div>
            )}

            {/* Merge button */}
            {showMerge && mergeableTable && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Jumeler avec :</div>
                {tables.filter(t => t.status === 'occupied' && t.id !== tableId && !t.isMergedInto).map(t => (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { mergeTables(t.id, tableId); setShowMerge(false) }}
                    style={{
                      display: 'block', width: '100%', marginBottom: 4,
                      padding: '7px 12px', borderRadius: 10, textAlign: 'center',
                      border: '1px solid rgba(139,92,246,0.2)',
                      background: 'rgba(139,92,246,0.08)',
                      color: '#a78bfa', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ← {t.name}
                  </motion.button>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
                  TOTAL TABLE
                  {linkedClient && linkedClient.discount > 0 && (
                    <span style={{ color: '#10b981', marginLeft: 6, fontSize: 10 }}>
                      (fidélité -{linkedClient.discount}%)
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: '#e2e8f0',
                  letterSpacing: -0.5,
                }}>
                  {total.toFixed(2)} €
                </div>
              </div>
              {mergeableTable && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMerge(v => !v)}
                  style={{
                    padding: '6px 14px', borderRadius: 10,
                    border: `1px solid ${showMerge ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                    background: showMerge ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
                    color: '#a78bfa', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔗 Jumeler
                </motion.button>
              )}
            </div>

            {/* Encaisser button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={total > 0 ? { boxShadow: '0 6px 30px rgba(99,102,241,0.5)' } : {}}
              onClick={onPay}
              disabled={total === 0}
              style={{
                display: 'block', width: '100%', padding: '14px 0',
                borderRadius: 16, border: 'none',
                background: total > 0
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)'
                  : 'rgba(255,255,255,0.06)',
                color: total > 0 ? '#fff' : '#374151',
                fontSize: 16, fontWeight: 700, cursor: total > 0 ? 'pointer' : 'default',
                boxShadow: total > 0
                  ? '0 4px 24px rgba(99,102,241,0.4)'
                  : 'none',
                transition: 'all .25s',
                letterSpacing: 0.5,
              }}
            >
              💳 Encaisser
            </motion.button>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL — Menu ═══════════ */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search Bar — Glassmorphism */}
          <div style={{
            padding: '14px 20px 0',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 15, color: '#475569', pointerEvents: 'none',
              }}>
                🔍
              </div>
              <input
                placeholder="Rechercher un article..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px 12px 42px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  color: '#e2e8f0', fontSize: 14, outline: 'none',
                  transition: 'all .2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(99,102,241,0.4)'
                  e.target.style.background = 'rgba(99,102,241,0.06)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.background = 'rgba(255,255,255,0.04)'
                }}
              />
            </div>
          </div>

          {/* Category Bar — Touch-friendly tabs */}
          {!search && (
            <div
              ref={catScrollRef}
              style={{
                display: 'flex', gap: 6,
                padding: '14px 20px 10px',
                overflowX: 'auto',
                flexShrink: 0,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {MENU_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat
                const catColor = CATEGORY_COLORS[cat] || '#6366f1'
                const catIcon = CATEGORY_ICONS[cat] || ''
                const count = categoryCounts[cat] || 0
                return (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 14,
                      border: `1px solid ${isActive ? catColor + '50' : 'rgba(255,255,255,0.06)'}`,
                      background: isActive
                        ? `${catColor}18`
                        : 'rgba(255,255,255,0.03)',
                      backdropFilter: 'blur(10px)',
                      color: isActive ? catColor : '#64748b',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all .2s',
                      display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: isActive
                        ? `0 0 12px ${catColor}20`
                        : 'none',
                      minHeight: 44,
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{catIcon}</span>
                    {cat}
                    {/* Item count badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      background: isActive ? `${catColor}30` : 'rgba(255,255,255,0.06)',
                      color: isActive ? catColor : '#475569',
                      padding: '2px 7px', borderRadius: 8,
                      minWidth: 20, textAlign: 'center',
                    }}>
                      {count}
                    </span>
                    {/* Active accent bar */}
                    {isActive && (
                      <motion.div
                        layoutId="catActiveBar"
                        style={{
                          position: 'absolute',
                          bottom: -1, left: '20%', right: '20%',
                          height: 3, borderRadius: 3,
                          background: catColor,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* No cover selected warning */}
          {!resolvedCoverId && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 36, opacity: 0.4 }}>👆</div>
              <div style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>
                Sélectionnez un couvert pour ajouter des articles
              </div>
            </div>
          )}

          {/* Product Grid */}
          {resolvedCoverId && (
            <div style={{
              flex: 1, overflowY: 'auto', padding: '10px 20px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: 10,
              alignContent: 'start',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.06) transparent',
            }}>
              {filteredMenu.map(item => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onAdd={() => handleAddItem(item)}
                  qtyInOrder={qtyInOrderMap[item.id] || 0}
                  categoryColor={CATEGORY_COLORS[item.category] || '#6366f1'}
                  isPopular={popularItemIds.has(item.id)}
                />
              ))}
              {filteredMenu.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: 60, textAlign: 'center',
                  color: '#334155', fontSize: 14,
                }}>
                  Aucun article trouvé
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ BOTTOM BAR — Cover Tabs ═══════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14',
        flexShrink: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {table.covers.map(c => {
          const isActive = resolvedCoverId === c.id
          const sub = coverTotal(c)
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveCoverId(c.id)
                  setSelectedItemId(null)
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'
                    : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#818cf8' : '#64748b',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all .2s',
                  boxShadow: isActive
                    ? '0 0 16px rgba(99,102,241,0.2)'
                    : 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {c.label}
                {sub > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 10,
                    background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    fontSize: 10, fontWeight: 800,
                    color: isActive ? '#a5b4fc' : '#475569',
                  }}>
                    {sub.toFixed(0)} €
                  </span>
                )}
              </motion.button>
              {table.covers.length > 1 && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    removeCover(tableId, c.id)
                    if (resolvedCoverId === c.id) {
                      setActiveCoverId(table.covers[0].id)
                    }
                  }}
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    border: 'none',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#334155', fontSize: 11,
                    cursor: 'pointer', marginLeft: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ×
                </motion.button>
              )}
            </div>
          )
        })}

        {/* Add cover button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => addCover(tableId)}
          style={{
            padding: '8px 16px',
            borderRadius: 20,
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#475569',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          + Couvert
        </motion.button>
      </div>
    </div>
  )
}
