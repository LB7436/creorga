import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSeats, seatTotal, type Seat } from '../store/seatStore'
import { usePOS } from '../store/posStore'

/**
 * Slide-out panel for a single chair (seat).
 * Shows order, lets you take orders, transfer the chair to another table,
 * detach as standalone, or pay just this seat.
 */
interface Props {
  seatId: string
  onClose: () => void
}

const QUICK_MENU = [
  { name: 'Café',     price: 2.80 },
  { name: 'Espresso', price: 2.50 },
  { name: 'Bière',    price: 3.20 },
  { name: 'Vin',      price: 4.40 },
  { name: 'Crémant',  price: 6.70 },
  { name: 'Burger',   price: 4.50 },
  { name: 'Frites',   price: 4.50 },
  { name: 'Plancha',  price: 25.50 },
]

export default function SeatPanel({ seatId, onClose }: Props) {
  const seat = useSeats((s) => s.seats.find((x) => x.id === seatId))
  const tables = usePOS((s) => s.tables)
  const {
    addItem, removeItem, setItemQty, setCustomer, clearItems,
    detach, attach, moveToTable, removeSeat,
  } = useSeats()

  const [showTransfer, setShowTransfer] = useState(false)

  if (!seat) return null

  const parentTable = seat.tableId ? tables.find((t) => t.id === seat.tableId) : null
  const total = seatTotal(seat)

  return (
    <motion.div
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 460, background: '#0f0f1f', borderLeft: '1px solid rgba(167,139,250,0.2)',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
        zIndex: 200, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
      }}
    >
      {/* Header */}
      <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg,rgba(167,139,250,0.15),rgba(236,72,153,0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: total > 0 ? 'linear-gradient(135deg,#f59e0b,#fcd34d)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🪑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
              {parentTable ? `${parentTable.name} · place ${(seat.position ?? 0) + 1}` : 'Chaise libre'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {seat.customerName || `Place ${(seat.position ?? 0) + 1}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        <input
          placeholder="Nom du client (optionnel)…"
          value={seat.customerName || ''}
          onChange={(e) => setCustomer(seat.id, e.target.value)}
          style={{
            width: '100%', marginTop: 12, padding: '8px 10px',
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#e2e8f0', outline: 'none', fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Total */}
      <div style={{
        padding: 14, background: total > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1 }}>TOTAL CHAISE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{total.toFixed(2)} €</div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
            {seat.items.reduce((n, i) => n + i.qty, 0)} article(s)<br />
            <span style={{ fontSize: 10 }}>statut : {seat.status}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <ActionBtn emoji="🔀" label="Transférer" onClick={() => setShowTransfer(true)} color="#8b5cf6" />
        <ActionBtn
          emoji="🚪"
          label={seat.tableId ? 'Détacher (libre)' : 'Standalone ✓'}
          onClick={() => {
            if (!seat.tableId) return
            detach(seat.id, 200 + Math.random() * 600, 600 + Math.random() * 80)
          }}
          color={seat.tableId ? '#06b6d4' : '#10b981'}
          disabled={!seat.tableId}
        />
        <ActionBtn emoji="💳" label={`Payer ${total > 0 ? total.toFixed(2) + '€' : ''}`}
                   onClick={() => alert(`Paiement chaise ${total.toFixed(2)} €`)}
                   color="#10b981" disabled={total === 0} />
        <ActionBtn emoji="🗑" label="Supprimer"
                   onClick={() => { if (confirm('Supprimer cette chaise ?')) { removeSeat(seat.id); onClose() } }}
                   color="#ef4444" />
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, marginBottom: 10 }}>
          📋 COMMANDE
        </div>

        {seat.items.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
            Aucun article — sélectionnez ci-dessous
          </div>
        ) : (
          <>
            {seat.items.map((i) => (
              <div key={i.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 10, marginBottom: 4,
                background: 'rgba(255,255,255,0.03)', borderRadius: 8,
              }}>
                <button onClick={() => setItemQty(seat.id, i.id, i.qty - 1)} style={qtyBtn}>−</button>
                <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                <button onClick={() => setItemQty(seat.id, i.id, i.qty + 1)} style={qtyBtn}>+</button>
                <span style={{ flex: 1, fontSize: 13 }}>{i.name}</span>
                <span style={{ fontSize: 13, color: '#fcd34d', fontWeight: 700 }}>{(i.price * i.qty).toFixed(2)} €</span>
                <button onClick={() => removeItem(seat.id, i.id)}
                  style={{ ...qtyBtn, background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>×</button>
              </div>
            ))}
            <button onClick={() => clearItems(seat.id)} style={{
              marginTop: 8, padding: '6px 12px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
              color: '#fca5a5', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            }}>Vider la commande</button>
          </>
        )}
      </div>

      {/* Quick menu */}
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, marginBottom: 8 }}>
          + AJOUTER
        </div>
        <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {QUICK_MENU.map((m) => (
            <button key={m.name}
              onClick={() => addItem(seat.id, { menuItemId: m.name, name: m.name, price: m.price, qty: 1, note: '' })}
              style={{
                padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer',
                fontSize: 11, textAlign: 'center', fontWeight: 600,
              }}>
              <div>{m.name}</div>
              <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.price.toFixed(2)}€</div>
            </button>
          ))}
        </div>
      </div>

      {/* Transfer modal */}
      {showTransfer && (
        <div onClick={() => setShowTransfer(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#1a1a2e', borderRadius: 14, padding: 20, width: '100%', maxWidth: 480,
            border: '1px solid rgba(167,139,250,0.3)',
          }}>
            <h3 style={{ margin: 0, fontSize: 18, marginBottom: 4 }}>🔀 Transférer la chaise</h3>
            <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: 12 }}>
              Choisissez une table de destination ou détachez en standalone.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {tables.filter((t) => t.id !== seat.tableId).map((t) => (
                <button key={t.id} onClick={() => {
                  // Find next free position on the target table
                  const used = useSeats.getState().byTable(t.id).map((s) => s.position).filter((p) => p != null) as number[]
                  let nextPos = 0
                  while (used.includes(nextPos) && nextPos < t.seats) nextPos++
                  if (nextPos >= t.seats) {
                    alert(`Table ${t.name} pleine`)
                    return
                  }
                  if (seat.tableId) moveToTable(seat.id, t.id, nextPos)
                  else attach(seat.id, t.id, nextPos)
                  setShowTransfer(false)
                }}
                style={{
                  padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(167,139,250,0.08)', color: '#e2e8f0', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                }}>
                  <div>🍽 {t.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{t.section}</div>
                </button>
              ))}
            </div>

            <button onClick={() => {
              detach(seat.id, 200 + Math.random() * 600, 600 + Math.random() * 80)
              setShowTransfer(false)
            }} style={{
              width: '100%', marginTop: 14, padding: 10, borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#06b6d4,#0891b2)',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}>
              🚪 Détacher en standalone (chaise libre)
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function ActionBtn({ emoji, label, onClick, color, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 8px', borderRadius: 10, border: `1px solid ${color}40`,
      background: disabled ? 'rgba(148,163,184,0.05)' : `${color}20`,
      color: disabled ? '#64748b' : color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      {label}
    </button>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: 'rgba(167,139,250,0.2)', color: '#c4b5fd', fontWeight: 800, fontSize: 14,
}
