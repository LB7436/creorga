import { useState } from 'react'
import { useChairs, type Chair } from '@/stores/chairStore'

/**
 * Chair manager — shows chairs around tables, supports:
 *  - Adding chairs
 *  - Assigning a customer name
 *  - Placing orders per chair
 *  - Transferring a chair (with its order) to another table
 *  - Transferring items between chairs
 *
 * Expected to be mounted inside the Room Designer / Floor Plan.
 */
interface ChairsOverlayProps {
  tableId: string
  tableName: string
  menu?: { id: string; name: string; price: number }[]
  otherTables?: { id: string; name: string }[]
}

export default function ChairsOverlay({ tableId, tableName, menu = [], otherTables = [] }: ChairsOverlayProps) {
  const chairs = useChairs((s) => s.chairs.filter((c) => c.tableId === tableId))
  const {
    addChair, removeChair, renameChair, setCustomer,
    addItem, removeItem, setItemQty, transferChair, clearItems,
  } = useChairs()

  const [activeChair, setActiveChair] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState<string | null>(null)

  const current = chairs.find((c) => c.id === activeChair)

  return (
    <section style={{
      background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🪑 Chaises de {tableName}</h3>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            {chairs.length} chaise{chairs.length > 1 ? 's' : ''} ·
            {' '}
            {chairs.reduce((n, c) => n + c.items.reduce((s, i) => s + i.qty, 0), 0)} article(s) au total
          </div>
        </div>
        <button onClick={() => addChair(tableId)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600,
          }}>+ Ajouter une chaise</button>
      </header>

      {chairs.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          Aucune chaise sur cette table — cliquez « + Ajouter une chaise »
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {chairs.map((ch) => (
            <ChairCard
              key={ch.id}
              chair={ch}
              selected={ch.id === activeChair}
              onClick={() => setActiveChair(ch.id)}
              onRename={(label) => renameChair(ch.id, label)}
              onSetCustomer={(name) => setCustomer(ch.id, name)}
              onRemove={() => { removeChair(ch.id); setActiveChair(null) }}
              onTransfer={() => setTransferOpen(ch.id)}
            />
          ))}
        </div>
      )}

      {/* Menu panel for the selected chair */}
      {current && (
        <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            Commander pour {current.label} {current.customerName && `— ${current.customerName}`}
          </div>

          {menu.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Passez un tableau <code>menu</code> au composant pour permettre la commande.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
              {menu.slice(0, 24).map((m) => (
                <button key={m.id}
                  onClick={() => addItem(current.id, { name: m.name, price: m.price, qty: 1 })}
                  style={{
                    padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
                    fontSize: 12, cursor: 'pointer', textAlign: 'left',
                  }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ color: '#6366f1', fontSize: 11, marginTop: 2 }}>{m.price.toFixed(2)} €</div>
                </button>
              ))}
            </div>
          )}

          {/* Current order */}
          {current.items.length > 0 && (
            <div style={{ marginTop: 14, background: '#fff', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Panier de {current.label}</div>
              {current.items.map((i) => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <button onClick={() => setItemQty(current.id, i.id, i.qty - 1)} style={qtyBtn}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{i.qty}</span>
                  <button onClick={() => setItemQty(current.id, i.id, i.qty + 1)} style={qtyBtn}>+</button>
                  <span style={{ flex: 1, fontSize: 13 }}>{i.name}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>{(i.price * i.qty).toFixed(2)} €</span>
                  <button onClick={() => removeItem(current.id, i.id)}
                    style={{ ...qtyBtn, background: '#fee2e2', color: '#991b1b' }}>×</button>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8,
                display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: '#6366f1' }}>
                  {current.items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)} €
                </span>
              </div>
              <button onClick={() => clearItems(current.id)}
                style={{ ...qtyBtn, marginTop: 8, padding: '6px 10px', fontSize: 11 }}>
                Vider
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transfer modal */}
      {transferOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setTransferOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, padding: 20, minWidth: 320, maxWidth: 420,
          }}>
            <h3 style={{ margin: '0 0 10px' }}>🔀 Transférer cette chaise</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
              Choisissez la table de destination. La commande suit la chaise.
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {otherTables.filter((t) => t.id !== tableId).map((t) => (
                <button key={t.id}
                  onClick={() => { transferChair(transferOpen, t.id); setTransferOpen(null); setActiveChair(null) }}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600,
                  }}>
                  → {t.name}
                </button>
              ))}
              {otherTables.length <= 1 && (
                <div style={{ padding: 12, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                  Aucune autre table disponible.
                </div>
              )}
            </div>
            <button onClick={() => setTransferOpen(null)} style={{
              marginTop: 12, width: '100%', padding: 10, border: 'none', borderRadius: 8,
              background: '#f1f5f9', cursor: 'pointer',
            }}>Annuler</button>
          </div>
        </div>
      )}
    </section>
  )
}

function ChairCard({
  chair, selected, onClick, onRename, onSetCustomer, onRemove, onTransfer,
}: {
  chair: Chair
  selected: boolean
  onClick: () => void
  onRename: (v: string) => void
  onSetCustomer: (v: string) => void
  onRemove: () => void
  onTransfer: () => void
}) {
  const total = chair.items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = chair.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div onClick={onClick} style={{
      background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
      color: selected ? '#fff' : '#1e293b',
      border: selected ? '2px solid #6366f1' : '2px solid #e2e8f0',
      borderRadius: 12, padding: 12, cursor: 'pointer', transition: 'all .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>🪑</span>
        <input
          value={chair.label}
          onChange={(e) => onRename(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: 'inherit',
            fontWeight: 700, fontSize: 14, outline: 'none',
          }}
        />
      </div>
      <input
        value={chair.customerName || ''}
        onChange={(e) => onSetCustomer(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Nom client (optionnel)"
        style={{
          width: '100%', background: selected ? 'rgba(255,255,255,0.15)' : '#f8fafc',
          border: 'none', borderRadius: 6, padding: '5px 8px', fontSize: 11,
          color: 'inherit', outline: 'none', marginBottom: 8,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
        <span style={{ opacity: 0.8 }}>{count} article{count > 1 ? 's' : ''}</span>
        <span style={{ fontWeight: 700 }}>{total.toFixed(2)} €</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={(e) => { e.stopPropagation(); onTransfer() }} style={{
          flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: selected ? 'rgba(255,255,255,0.2)' : '#e0e7ff', color: 'inherit',
          fontSize: 11, fontWeight: 600,
        }}>🔀 Transférer</button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ?')) onRemove() }} style={{
          padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: selected ? 'rgba(239,68,68,0.25)' : '#fee2e2', color: selected ? '#fecaca' : '#991b1b',
          fontSize: 11, fontWeight: 600,
        }}>🗑</button>
      </div>
    </div>
  )
}

const qtyBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 14,
}
