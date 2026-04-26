import { usePOS, tableTotal } from '@/store/posStore'

/**
 * Table summary sheet — shows orders, items, covers + Pay / Transfer quick actions.
 */

interface TableSummaryProps {
  tableId: string | null
  onClose: () => void
  onPay: (tableId: string) => void
  onTransfer: (tableId: string) => void
}

export default function TableSummary({ tableId, onClose, onPay, onTransfer }: TableSummaryProps) {
  const table = usePOS((s) => s.tables.find((t) => t.id === tableId))
  if (!table) return null

  const total = tableTotal(table)
  const allItems = table.covers.flatMap((c) => c.items.map((i) => ({ ...i, coverLabel: c.label })))
  const itemCount = allItems.reduce((n, i) => n + i.qty, 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '80vh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: 20, overflowY: 'auto', animation: 'slideUp .25s ease-out',
        }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#cbd5e1', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{table.name}</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              {table.section} · {table.seats} couverts · {table.status}
            </p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: '#f1f5f9', width: 36, height: 36, borderRadius: 999,
            fontSize: 18, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Covers & items */}
        {table.covers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            Aucune commande ouverte sur cette table
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {table.covers.map((cover) => {
              const coverTotal = cover.items.reduce((s, i) => s + i.price * i.qty, 0)
              return (
                <div key={cover.id} style={{
                  background: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: 6 }}>
                    <span>{cover.label}</span>
                    <span style={{ color: '#6366f1' }}>{coverTotal.toFixed(2)} €</span>
                  </div>
                  {cover.items.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>— rien —</div>
                  ) : (
                    cover.items.map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0',
                      }}>
                        <span>
                          <span style={{ color: '#6366f1', fontWeight: 600, marginRight: 6 }}>{item.qty}×</span>
                          {item.name}
                          {item.note && <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 12 }}>({item.note})</span>}
                        </span>
                        <span style={{ color: '#475569' }}>{(item.price * item.qty).toFixed(2)} €</span>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Totals */}
        <div style={{
          background: '#eef2ff', borderRadius: 12, padding: 14, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{itemCount} article{itemCount > 1 ? 's' : ''}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{total.toFixed(2)} €</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onTransfer(table.id)}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#8b5cf6', color: '#fff', fontSize: 16, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            🔀 Transférer
          </button>
          <button
            onClick={() => onPay(table.id)}
            disabled={total === 0}
            style={{
              flex: 2, padding: '14px', borderRadius: 12, border: 'none',
              cursor: total === 0 ? 'not-allowed' : 'pointer',
              background: total === 0 ? '#cbd5e1' : '#10b981',
              color: '#fff', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            💳 Payer {total > 0 && `${total.toFixed(2)} €`}
          </button>
        </div>
      </div>
    </div>
  )
}
