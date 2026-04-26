import type { FloorChair } from '@/hooks/useFloorState'

interface ChairVisualProps {
  chair: FloorChair | null
  x: number
  y: number
  placeholder?: boolean  // no chair assigned yet
  placeNumber?: number
  onClick?: () => void
  selected?: boolean
  theme: any
}

/**
 * Visual chair — clickable dot. Three states:
 *  - placeholder (no chair object yet)
 *  - assigned, empty (no items)
 *  - assigned with items (hot / orange)
 */
export default function ChairVisual({
  chair, x, y, placeholder, placeNumber, onClick, selected, theme,
}: ChairVisualProps) {
  const hasOrder = chair && chair.items.length > 0
  const total = chair?.items.reduce((s, i) => s + i.price * i.qty, 0) || 0

  const color = placeholder ? 'rgba(148,163,184,0.25)'
    : hasOrder ? '#f59e0b'
    : theme.primary

  const borderColor = placeholder ? 'rgba(148,163,184,0.4)'
    : hasOrder ? '#fcd34d'
    : theme.primaryLight

  const title = chair
    ? `${chair.label}${chair.customerName ? ' · ' + chair.customerName : ''}${hasOrder ? ' · ' + total.toFixed(2) + ' €' : ''}`
    : `Place ${placeNumber ?? ''} — cliquez pour assigner une chaise`

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      title={title}
      style={{
        position: 'absolute',
        left: x, top: y,
        width: selected ? 22 : 18,
        height: selected ? 22 : 18,
        borderRadius: '50%',
        background: color,
        border: `2px solid ${selected ? '#fff' : borderColor}`,
        boxShadow: selected
          ? `0 0 0 3px ${theme.primary}, 0 0 12px ${theme.primary}`
          : hasOrder ? '0 0 10px #f59e0b' : `0 0 4px ${color}60`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer', padding: 0, zIndex: 5,
        transition: 'all .15s',
      }}
    >
      {hasOrder && (
        <span style={{
          position: 'absolute',
          top: -8, right: -8,
          background: '#ef4444', color: '#fff',
          fontSize: 9, fontWeight: 800,
          padding: '1px 5px', borderRadius: 999,
          lineHeight: 1.2,
        }}>
          {chair!.items.length}
        </span>
      )}
    </button>
  )
}
