import { useRef, useState } from 'react'
import { usePOS, tableTotal, STATUS_COLORS } from '@/store/posStore'
import type { Table } from '@/store/posStore'

/**
 * Visual room manager — swipe/pager between sections (Salle, Bar, Terrasse...).
 * Tapping a table opens TableSummary with Pay / Transfer quick actions.
 */

interface RoomsPagerProps {
  onSelectTable: (tableId: string) => void
  onStartTransfer: (fromTableId: string) => void
  transferOrigin?: string | null
}

export default function RoomsPager({ onSelectTable, onStartTransfer, transferOrigin }: RoomsPagerProps) {
  const tables = usePOS((s) => s.tables)
  const rooms = Array.from(new Set(tables.map((t) => t.section)))
  const [idx, setIdx] = useState(0)
  const startX = useRef<number | null>(null)

  const current = rooms[idx] || rooms[0]
  const roomTables = tables.filter((t) => t.section === current)

  const handleStart = (e: React.TouchEvent | React.PointerEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    startX.current = x
  }
  const handleEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (startX.current == null) return
    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const delta = x - startX.current
    if (Math.abs(delta) > 60) {
      if (delta < 0 && idx < rooms.length - 1) setIdx(idx + 1)
      if (delta > 0 && idx > 0) setIdx(idx - 1)
    }
    startX.current = null
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#fff' }}>
      {/* Pager header */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#1e293b' }}>
        {rooms.map((r, i) => (
          <button key={r} onClick={() => setIdx(i)}
            style={{
              padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: idx === i ? '#6366f1' : '#334155',
              color: '#fff', fontWeight: 600, fontSize: 14, transition: 'all .2s',
            }}>
            {r}
          </button>
        ))}
      </div>

      {/* Transfer banner */}
      {transferOrigin && (
        <div style={{ background: '#8b5cf6', padding: '10px 16px', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
          🔀 Sélectionnez la table de destination pour le transfert
        </div>
      )}

      {/* Room canvas */}
      <div
        onTouchStart={handleStart} onTouchEnd={handleEnd}
        onPointerDown={handleStart} onPointerUp={handleEnd}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
      >
        {roomTables.map((t) => (
          <TableTile key={t.id} table={t}
            highlight={transferOrigin === t.id}
            onClick={() => (transferOrigin ? onStartTransfer(t.id) : onSelectTable(t.id))}
          />
        ))}
      </div>

      {/* Pager dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 14px' }}>
        {rooms.map((_, i) => (
          <span key={i} style={{
            width: idx === i ? 24 : 8, height: 8, borderRadius: 999,
            background: idx === i ? '#6366f1' : '#475569', transition: 'all .2s',
          }} />
        ))}
      </div>
    </div>
  )
}

function TableTile({ table, onClick, highlight }: { table: Table; onClick: () => void; highlight?: boolean }) {
  const total = tableTotal(table)
  const color = STATUS_COLORS[table.status]
  const size = table.shape === 'bar' ? { w: 160, h: 80 }
    : table.shape === 'rect' ? { w: 140, h: 90 }
    : table.shape === 'square' ? { w: 110, h: 110 }
    : { w: 110, h: 110 }
  return (
    <button onClick={onClick}
      style={{
        position: 'absolute', left: table.x, top: table.y,
        width: size.w, height: size.h,
        borderRadius: table.shape === 'round' ? '50%' : 14,
        border: highlight ? '3px solid #fbbf24' : `2px solid ${color}`,
        background: `${color}20`, color: '#fff', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 6, fontWeight: 600, transition: 'all .15s',
        boxShadow: highlight ? '0 0 24px rgba(251,191,36,0.6)' : '0 4px 12px rgba(0,0,0,0.3)',
      }}>
      <div style={{ fontSize: 14 }}>{table.name}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{table.seats} couverts</div>
      {total > 0 && <div style={{ fontSize: 13, color: '#fbbf24', marginTop: 2 }}>{total.toFixed(2)} €</div>}
    </button>
  )
}
