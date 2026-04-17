import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Table, TableStatus, STATUS_COLORS, STATUS_LABELS, elapsed, tableTotal } from '../store/posStore'

interface Props {
  onOpenOrder: (tableId: string) => void
}

// ─── SVG dimensions ──────────────────────────────────────────────────────────
const VW = 1100
const VH = 680

// ─── Demo waiters & reservations ─────────────────────────────────────────────
type Waiter = { id: string; name: string; color: string; initial: string }

const WAITERS: Waiter[] = [
  { id: 'w1', name: 'Marie',   color: '#f472b6', initial: 'M' },
  { id: 'w2', name: 'Thomas',  color: '#60a5fa', initial: 'T' },
  { id: 'w3', name: 'Sophie',  color: '#fbbf24', initial: 'S' },
  { id: 'w4', name: 'Paul',    color: '#a78bfa', initial: 'P' },
]

function assignWaiter(tableId: string): Waiter {
  let h = 0
  for (let i = 0; i < tableId.length; i++) h = (h * 31 + tableId.charCodeAt(i)) >>> 0
  return WAITERS[h % WAITERS.length]
}

function isVIP(tableId: string): boolean {
  let h = 0
  for (let i = 0; i < tableId.length; i++) h = (h * 17 + tableId.charCodeAt(i)) >>> 0
  return h % 7 === 0
}

type Ghost = { id: string; x: number; y: number; seats: number; shape: Table['shape']; name: string; inMinutes: number }
const GHOSTS: Ghost[] = []

// ─── Time color helpers ──────────────────────────────────────────────────────
function timeColorBand(openedAt: number | null): { color: string; label: string; pulse: 'none' | 'slow' | 'fast' } {
  if (!openedAt) return { color: '#6366f1', label: '', pulse: 'none' }
  const mins = Math.floor((Date.now() - openedAt) / 60000)
  if (mins < 30) return { color: '#10b981', label: '', pulse: 'none' }
  if (mins < 60) return { color: '#eab308', label: '', pulse: 'slow' }
  if (mins < 90) return { color: '#f97316', label: '', pulse: 'slow' }
  return { color: '#ef4444', label: 'Table longue - action?', pulse: 'fast' }
}

// ─── Table geometry ──────────────────────────────────────────────────────────
function tableGeometry(t: Pick<Table, 'shape' | 'seats'>) {
  switch (t.shape) {
    case 'round':
      return { type: 'circle' as const, r: t.seats <= 2 ? 30 : 42 }
    case 'square':
      return { type: 'rect' as const, w: 68, h: 68 }
    case 'rect':
      return { type: 'rect' as const, w: t.seats >= 8 ? 120 : 96, h: 60 }
    case 'bar':
      return { type: 'rect' as const, w: 160, h: 42 }
  }
}

// ─── Seat dots ──────────────────────────────────────────────────────────────
function SeatDots({ table, hover }: { table: Table; hover: boolean }) {
  const g = tableGeometry(table)
  const dots: { cx: number; cy: number }[] = []
  const n = table.seats
  const R = g.type === 'circle' ? g.r + 16 : 0

  if (g.type === 'circle') {
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      dots.push({ cx: Math.cos(angle) * R, cy: Math.sin(angle) * R })
    }
  } else {
    const w = g.w, h = g.h
    const perSide = Math.ceil(n / 2)
    for (let i = 0; i < Math.min(perSide, n); i++) {
      dots.push({ cx: (w / (perSide + 1)) * (i + 1) - w / 2, cy: -h / 2 - 14 })
    }
    for (let i = 0; i < Math.min(n - perSide, n); i++) {
      dots.push({ cx: (w / (Math.min(n - perSide, perSide) + 1)) * (i + 1) - w / 2, cy: h / 2 + 14 })
    }
  }

  const color = STATUS_COLORS[table.status]

  return (
    <g>
      {dots.map((d, i) => (
        <circle
          key={i} cx={d.cx} cy={d.cy} r={5.5}
          fill={hover ? `${color}40` : '#1e1e36'}
          stroke={hover ? color : '#2a2a48'}
          strokeWidth={1.5}
          style={{ transition: 'all 0.25s ease' }}
        />
      ))}
    </g>
  )
}

// ─── Table shape with glow ──────────────────────────────────────────────────
function TableShape({ table, hover, filterId, timeColor }: {
  table: Table; hover: boolean; filterId: string; timeColor: string | null
}) {
  const g = tableGeometry(table)
  const statusColor = STATUS_COLORS[table.status]
  const color = table.status === 'occupied' && timeColor ? timeColor : statusColor
  const isOccupied = table.status === 'occupied'
  const isAvailable = table.status === 'available'

  const fillColor = isAvailable
    ? (hover ? `${color}10` : '#0c0c1d')
    : `${color}14`

  const common: React.SVGProps<SVGCircleElement | SVGRectElement> = {
    fill: fillColor,
    stroke: color,
    strokeWidth: hover ? 2.5 : isAvailable ? 1 : 1.8,
    filter: (isOccupied || hover) ? `url(#${filterId})` : undefined,
    style: { transition: 'all 0.25s ease', cursor: 'pointer' },
  }

  if (g.type === 'circle') {
    return <circle cx={0} cy={0} r={g.r} {...(common as React.SVGProps<SVGCircleElement>)} />
  }
  return (
    <rect
      x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h}
      rx={table.shape === 'bar' ? 8 : 12}
      {...(common as React.SVGProps<SVGRectElement>)}
    />
  )
}

// ─── Waiter badge ────────────────────────────────────────────────────────────
function WaiterBadge({ waiter, x, y }: { waiter: Waiter; x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <circle r={10} fill="#0a0a18" stroke={waiter.color} strokeWidth={1.5} />
      <circle r={10} fill={waiter.color} opacity={0.2} />
      <text
        textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={800}
        fill={waiter.color} style={{ userSelect: 'none' }}
      >
        {waiter.initial}
      </text>
    </g>
  )
}

// ─── VIP marker ──────────────────────────────────────────────────────────────
function VIPStar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <circle r={9} fill="#0a0a18" stroke="#f59e0b" strokeWidth={1.2} />
      <text textAnchor="middle" dy="0.35em" fontSize={11} fill="#f59e0b" style={{ userSelect: 'none' }}>
        ★
      </text>
    </g>
  )
}

// ─── Single table card ──────────────────────────────────────────────────────
function TableCard({
  table, onClick, onContextMenu, selected, transferTarget,
}: {
  table: Table
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  selected: boolean
  transferTarget: boolean
}) {
  const [hover, setHover] = useState(false)
  const g = tableGeometry(table)
  const total = tableTotal(table)
  const time = elapsed(table.openedAt)
  const statusColor = STATUS_COLORS[table.status]
  const coverCount = table.covers.length
  const filterId = `glow-${table.id}`
  const tc = timeColorBand(table.status === 'occupied' ? table.openedAt : null)
  const effectiveColor = table.status === 'occupied' ? tc.color : statusColor
  const waiter = table.status === 'occupied' ? assignWaiter(table.id) : null
  const vip = isVIP(table.id) && table.status === 'occupied'

  const badgeOffsetX = g.type === 'circle' ? g.r - 4 : (g as { w: number }).w / 2 - 4
  const badgeOffsetY = g.type === 'circle' ? -g.r + 2 : -(g as { h: number }).h / 2 + 2
  const hoverLabelY = g.type === 'circle' ? g.r + 26 : (g as { h: number }).h / 2 + 26
  const waiterX = g.type === 'circle' ? -g.r + 2 : -(g as { w: number }).w / 2 + 10
  const waiterY = g.type === 'circle' ? -g.r + 2 : -(g as { h: number }).h / 2 + 10
  const vipX = g.type === 'circle' ? g.r - 4 : (g as { w: number }).w / 2 - 10
  const vipY = g.type === 'circle' ? g.r - 4 : (g as { h: number }).h / 2 + 4

  const pulseClass = tc.pulse === 'fast' ? 'pulse-fast' : tc.pulse === 'slow' ? 'pulse-slow' : ''

  return (
    <g
      transform={`translate(${table.x},${table.y})`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
      className={pulseClass}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation={hover ? 10 : 6} result="blur" />
          <feFlood floodColor={effectiveColor} floodOpacity={hover ? 0.55 : 0.32} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Selection ring */}
      {(selected || transferTarget) && (
        <rect
          x={-((g as { w?: number }).w ?? (g as { r: number }).r * 2) / 2 - 10}
          y={-((g as { h?: number }).h ?? (g as { r: number }).r * 2) / 2 - 10}
          width={((g as { w?: number }).w ?? (g as { r: number }).r * 2) + 20}
          height={((g as { h?: number }).h ?? (g as { r: number }).r * 2) + 20}
          rx={14} fill="none"
          stroke={transferTarget ? '#10b981' : '#6366f1'}
          strokeWidth={2} strokeDasharray="5 4" opacity={0.9}
        />
      )}

      <g style={{
        transform: hover ? 'scale(1.06)' : 'scale(1)',
        transformOrigin: '0 0',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <SeatDots table={table} hover={hover} />
        <TableShape table={table} hover={hover} filterId={filterId} timeColor={tc.color} />

        {table.mergedWith.length > 0 && (
          <text textAnchor="middle" dy="-1.2em" fontSize={9} fill="#c4b5fd" fontWeight={700}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            +{table.mergedWith.length} fusionnees
          </text>
        )}

        <text
          textAnchor="middle"
          dy={coverCount > 0 ? '-0.5em' : '0.35em'}
          fontSize={table.shape === 'bar' ? 12 : 11}
          fontWeight={700}
          fill={hover ? '#fff' : '#c8cee0'}
          letterSpacing="0.02em"
          style={{ transition: 'fill 0.2s', userSelect: 'none', pointerEvents: 'none' }}
        >
          {table.name}
        </text>

        {coverCount > 0 && (
          <text textAnchor="middle" dy="0.9em" fontSize={10} fill={effectiveColor} fontWeight={600}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {coverCount} cvt · {total.toFixed(0)} €
          </text>
        )}

        {time && (
          <g transform={`translate(${badgeOffsetX},${badgeOffsetY})`}>
            <rect x={-18} y={-9} width={36} height={18} rx={9} fill="#0a0a18" stroke={effectiveColor} strokeWidth={1} opacity={0.95} />
            <text textAnchor="middle" dy="0.35em" fontSize={8} fill={effectiveColor} fontWeight={700} style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {time}
            </text>
          </g>
        )}

        {waiter && <WaiterBadge waiter={waiter} x={waiterX} y={waiterY} />}
        {vip && <VIPStar x={vipX} y={vipY} />}

        {hover && (
          <g transform={`translate(0, ${hoverLabelY})`}>
            <rect x={-46} y={-9} width={92} height={18} rx={9} fill="#0a0a18" opacity={0.9} />
            <text textAnchor="middle" dy="0.35em" fontSize={9} fill={effectiveColor} fontWeight={600}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {tc.label || STATUS_LABELS[table.status]}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

// ─── Ghost reservation ──────────────────────────────────────────────────────
function GhostTable({ g }: { g: Ghost }) {
  const geom = tableGeometry({ shape: g.shape, seats: g.seats })
  return (
    <g transform={`translate(${g.x},${g.y})`} style={{ pointerEvents: 'none' }}>
      {geom.type === 'circle' ? (
        <circle r={geom.r} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      ) : (
        <rect x={-geom.w / 2} y={-geom.h / 2} width={geom.w} height={geom.h} rx={12}
          fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      )}
      <text textAnchor="middle" dy="-0.2em" fontSize={10} fill="#c4b5fd" fontWeight={600} opacity={0.85}>
        {g.name}
      </text>
      <text textAnchor="middle" dy="1em" fontSize={9} fill="#a78bfa" opacity={0.75}>
        dans {g.inMinutes} min
      </text>
    </g>
  )
}

// ─── Section backgrounds (with heatmap) ─────────────────────────────────────
function SectionBg({
  x, y, w, h, label, color, gradId, heatmap, occupancy,
}: {
  x: number; y: number; w: number; h: number
  label: string; color: string; gradId: string
  heatmap: boolean; occupancy: number
}) {
  const heatColor = occupancy > 0.75 ? '#ef4444' : occupancy > 0.5 ? '#f97316' : occupancy > 0.25 ? '#eab308' : '#10b981'
  const heatOpacity = heatmap ? 0.12 + occupancy * 0.2 : 0
  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.04} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={18}
        fill={`url(#${gradId})`} stroke={`${color}20`} strokeWidth={1.5} strokeDasharray="8 5" />
      {heatmap && (
        <rect x={x} y={y} width={w} height={h} rx={18}
          fill={heatColor} opacity={heatOpacity} style={{ pointerEvents: 'none' }} />
      )}
      <text x={x + 18} y={y + 24} fontSize={10} fontWeight={700} fill={`${color}60`} letterSpacing="0.12em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {label.toUpperCase()}
      </text>
      {heatmap && (
        <text x={x + w - 18} y={y + 24} fontSize={10} fontWeight={700} fill={heatColor} letterSpacing="0.04em" textAnchor="end"
          style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {Math.round(occupancy * 100)}%
        </text>
      )}
    </g>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  const items: { status: TableStatus; label: string }[] = [
    { status: 'available', label: 'Libre' },
    { status: 'occupied', label: 'Occupee' },
    { status: 'reserved', label: 'Reservee' },
    { status: 'dirty', label: 'A nettoyer' },
  ]
  return (
    <g transform="translate(20, 612)">
      {items.map((item, i) => (
        <g key={item.status} transform={`translate(${i * 120}, 0)`}>
          <circle cx={7} cy={0} r={5} fill={STATUS_COLORS[item.status]} opacity={0.9} />
          <circle cx={7} cy={0} r={8} fill="none" stroke={STATUS_COLORS[item.status]} strokeWidth={0.5} opacity={0.4} />
          <text x={20} dy="0.35em" fontSize={10} fill="#64748b" fontWeight={500}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {item.label}
          </text>
        </g>
      ))}
    </g>
  )
}

// ─── Decorations ─────────────────────────────────────────────────────────────
function Decorations() {
  return (
    <g>
      {[[38, 50], [590, 50], [38, 640], [590, 640]].map(([x, y], i) => (
        <g key={`p${i}`} transform={`translate(${x},${y})`} opacity={0.12}>
          <circle r={10} fill="#10b981" />
          <circle cy={-5} r={6} fill="#059669" />
          <circle cx={4} cy={-2} r={4} fill="#34d399" opacity={0.6} />
        </g>
      ))}
      {[[648, 306], [1066, 306], [648, 644], [1066, 644]].map(([x, y], i) => (
        <g key={`tp${i}`} transform={`translate(${x},${y})`} opacity={0.1}>
          <circle r={9} fill="#10b981" />
          <circle cy={-4} r={5} fill="#059669" />
        </g>
      ))}
      <rect x={644} y={58} width={424} height={2.5} rx={1.25} fill="#6366f1" opacity={0.12} />
      <rect x={644} y={86} width={424} height={1.5} rx={0.75} fill="#6366f1" opacity={0.06} />
      {[100, 200, 300, 400, 500].map((yy, i) => (
        <circle key={`dd${i}`} cx={628} cy={yy} r={1.5} fill="#6366f1" opacity={0.1} />
      ))}
    </g>
  )
}

// ─── Animation styles ───────────────────────────────────────────────────────
function PulseStyles() {
  return (
    <style>{`
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      @keyframes pulseFast {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.35); }
      }
      @keyframes pulseSlow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.18); }
      }
      .pulse-fast { animation: pulseFast 1.1s ease-in-out infinite; }
      .pulse-slow { animation: pulseSlow 3.2s ease-in-out infinite; }
      .occupied-pulse { animation: pulseGlow 2.5s ease-in-out infinite; }
    `}</style>
  )
}

// ─── Context menu ────────────────────────────────────────────────────────────
interface ContextMenuProps {
  x: number; y: number; table: Table
  onClose: () => void
  onViewOrder: () => void
  onReassign: () => void
  onMarkVIP: () => void
  onTransfer: () => void
  onClean: () => void
}

function ContextMenu({ x, y, table, onClose, onViewOrder, onReassign, onMarkVIP, onTransfer, onClean }: ContextMenuProps) {
  const isOccupied = table.status === 'occupied'
  const items = [
    { label: 'Voir commande', icon: '📋', onClick: onViewOrder, show: isOccupied },
    { label: 'Réassigner serveur', icon: '👤', onClick: onReassign, show: isOccupied },
    { label: 'Marquer VIP', icon: '⭐', onClick: onMarkVIP, show: isOccupied },
    { label: 'Transférer', icon: '↔', onClick: onTransfer, show: isOccupied },
    { label: 'Nettoyer', icon: '🧹', onClick: onClean, show: true },
  ].filter(i => i.show)

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200 }}
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose() }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'fixed', left: x, top: y, zIndex: 201,
          minWidth: 200, padding: 6, borderRadius: 12,
          background: 'linear-gradient(170deg, #111128 0%, #0a0a1a 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.12)',
        }}
      >
        <div style={{
          padding: '6px 10px', fontSize: 10, color: '#64748b',
          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        }}>
          {table.name}
        </div>
        {items.map(it => (
          <button
            key={it.label}
            onClick={() => { it.onClick(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 10px', borderRadius: 8,
              background: 'transparent', border: 'none',
              color: '#e2e8f0', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              textAlign: 'left' as const, fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: 14 }}>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </motion.div>
    </>
  )
}

// ─── Table modal ────────────────────────────────────────────────────────────
interface ModalProps {
  table: Table
  onClose: () => void
  onOpenOrder: (id: string) => void
}

function TableModal({ table, onClose, onOpenOrder }: ModalProps) {
  const [covers, setCovers] = useState(2)
  const openTable = usePOS(s => s.openTable)
  const setTableStatus = usePOS(s => s.setTableStatus)

  const color = STATUS_COLORS[table.status]
  const isOccupied = table.status === 'occupied'
  const total = tableTotal(table)
  const time = elapsed(table.openedAt)
  const waiter = isOccupied ? assignWaiter(table.id) : null

  function handleOpen() { openTable(table.id, covers); onOpenOrder(table.id); onClose() }
  function handleGoToOrder() { onOpenOrder(table.id); onClose() }
  function handleMarkDirty() { setTableStatus(table.id, 'dirty'); onClose() }
  function handleMarkAvailable() { setTableStatus(table.id, 'available'); onClose() }
  function handleMarkReserved() { setTableStatus(table.id, 'reserved'); onClose() }

  const gradientBtn = (c: string, bgBase: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px 18px', borderRadius: 14,
    border: `1px solid ${c}35`,
    background: `linear-gradient(135deg, ${bgBase}18 0%, ${bgBase}08 100%)`,
    color: c, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s ease', letterSpacing: '0.01em',
  })

  const counterBtnStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0', fontSize: 20, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
  }

  const CoverSelector = () => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
        Nombre de couverts
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
        <button onClick={() => setCovers(c => Math.max(1, c - 1))} style={counterBtnStyle}>-</button>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0', minWidth: 40, textAlign: 'center' }}>{covers}</span>
        <button onClick={() => setCovers(c => Math.min(table.seats, c + 1))} style={counterBtnStyle}>+</button>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          background: 'linear-gradient(170deg, #111128 0%, #0a0a1a 100%)',
          border: `1px solid ${color}25`, borderRadius: 20,
          padding: 30, minWidth: 340, maxWidth: 420,
          boxShadow: `0 0 60px ${color}15, 0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{table.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600 }}>
                {STATUS_LABELS[table.status]}
              </span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#8892a8', fontWeight: 500 }}>
                {table.seats} places
              </span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#8892a8', fontWeight: 500 }}>
                {table.section}
              </span>
              {waiter && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${waiter.color}18`, color: waiter.color, fontWeight: 600 }}>
                  Serveur {waiter.name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', fontSize: 16, cursor: 'pointer', padding: 0,
              width: 32, height: 32, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {isOccupied && (
          <div style={{
            display: 'flex', gap: 12, marginBottom: 18, padding: '12px 14px', borderRadius: 12,
            background: `${color}08`, border: `1px solid ${color}15`,
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{table.covers.length}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Couverts</div>
            </div>
            <div style={{ width: 1, background: `${color}20` }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{total.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total</div>
            </div>
            {time && (
              <>
                <div style={{ width: 1, background: `${color}20` }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{time}</div>
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Duree</div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isOccupied ? (
            <>
              <button onClick={handleGoToOrder} style={gradientBtn('#818cf8', '#6366f1')}>Voir la commande</button>
              <button onClick={handleMarkDirty} style={gradientBtn('#f87171', '#f43f5e')}>Fermer la table</button>
            </>
          ) : table.status === 'dirty' ? (
            <button onClick={handleMarkAvailable} style={gradientBtn('#34d399', '#10b981')}>Table nettoyee</button>
          ) : table.status === 'reserved' ? (
            <>
              <CoverSelector />
              <button onClick={handleOpen} style={gradientBtn('#818cf8', '#6366f1')}>Ouvrir la table</button>
              <button onClick={handleMarkAvailable} style={gradientBtn('#94a3b8', '#475569')}>Annuler reservation</button>
            </>
          ) : (
            <>
              <CoverSelector />
              <button onClick={handleOpen} style={gradientBtn('#818cf8', '#6366f1')}>Ouvrir la table</button>
              <button onClick={handleMarkReserved} style={gradientBtn('#a78bfa', '#8b5cf6')}>Reserver</button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Reassign popup ─────────────────────────────────────────────────────────
function ReassignPopup({ current, onSelect, onClose }: {
  current: Waiter; onSelect: (w: Waiter) => void; onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.92 }} animate={{ scale: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          padding: 24, borderRadius: 18, minWidth: 320,
          background: 'linear-gradient(170deg, #111128 0%, #0a0a1a 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
          Réassigner le serveur
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {WAITERS.map(w => (
            <button
              key={w.id}
              onClick={() => { onSelect(w); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: w.id === current.id ? `${w.color}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${w.id === current.id ? w.color + '40' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${w.color}20`, border: `1.5px solid ${w.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800, color: w.color,
              }}>
                {w.initial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{w.name}</div>
                {w.id === current.id && <div style={{ fontSize: 10, color: w.color }}>actuel</div>}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Floor statistics bar ───────────────────────────────────────────────────
function FloorStatsBar({ tables }: { tables: Table[] }) {
  const visible = tables.filter(t => !t.isMergedInto)
  const occupied = visible.filter(t => t.status === 'occupied')
  const occupiedCount = occupied.length
  const totalCount = visible.length
  const ca = occupied.reduce((s, t) => s + tableTotal(t), 0)
  const covers = occupied.reduce((s, t) => s + t.covers.length, 0)
  const avgMins = occupied.length > 0
    ? Math.round(occupied.reduce((s, t) => s + (t.openedAt ? (Date.now() - t.openedAt) / 60000 : 0), 0) / occupied.length)
    : 0
  const rate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0

  const stat = (label: string, value: string, accent: string) => (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 100 }}>
      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        {label}
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: accent, letterSpacing: '-0.01em' }}>
        {value}
      </span>
    </div>
  )

  return (
    <div style={{
      position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 26, alignItems: 'center',
      padding: '12px 22px', borderRadius: 16,
      background: 'rgba(10,10,26,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(99,102,241,0.18)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    }}>
      {stat('Tables occupées', `${occupiedCount}/${totalCount}`, '#e2e8f0')}
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.06)' }} />
      {stat('CA en cours', `${ca.toFixed(0)} €`, '#10b981')}
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.06)' }} />
      {stat('Couverts actifs', String(covers), '#a5b4fc')}
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.06)' }} />
      {stat('Temps moyen', `${avgMins} min`, '#fbbf24')}
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.06)' }} />
      {stat('Occupation', `${rate}%`, rate > 75 ? '#ef4444' : rate > 50 ? '#f97316' : '#10b981')}
    </div>
  )
}

// ─── Top toolbar ─────────────────────────────────────────────────────────────
function Toolbar({
  heatmap, onToggleHeatmap, showGhosts, onToggleGhosts, selectedCount, onClearSelection,
}: {
  heatmap: boolean; onToggleHeatmap: () => void
  showGhosts: boolean; onToggleGhosts: () => void
  selectedCount: number; onClearSelection: () => void
}) {
  const btn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(99,102,241,0.15)' : 'rgba(10,10,26,0.7)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    color: active ? '#a5b4fc' : '#94a3b8',
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div style={{
      position: 'absolute', top: 14, left: 18,
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onToggleHeatmap} style={btn(heatmap)}>
        🔥 Heatmap
      </motion.button>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onToggleGhosts} style={btn(showGhosts)}>
        👻 Réservations
      </motion.button>
      {selectedCount > 0 && (
        <motion.button
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.95 }} onClick={onClearSelection}
          style={{
            ...btn(true), background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)', color: '#34d399',
          }}
        >
          ✓ {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''} · Effacer
        </motion.button>
      )}
    </div>
  )
}

// ─── Status badges (top-right) ──────────────────────────────────────────────
function StatsOverlay({ tables }: { tables: Table[] }) {
  const visible = tables.filter(t => !t.isMergedInto)
  const stats = (['available', 'occupied', 'reserved', 'dirty'] as const).map(status => ({
    status,
    count: visible.filter(t => t.status === status).length,
  })).filter(s => s.count > 0)

  return (
    <div style={{
      position: 'absolute', top: 14, right: 18,
      display: 'flex', gap: 8, flexDirection: 'column' as const, alignItems: 'flex-end',
    }}>
      {stats.map(({ status, count }) => (
        <div key={status} style={{
          fontSize: 11, padding: '5px 14px', borderRadius: 20,
          background: 'rgba(10,10,26,0.7)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${STATUS_COLORS[status]}25`,
          color: STATUS_COLORS[status], fontWeight: 600, letterSpacing: '0.02em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: STATUS_COLORS[status],
            boxShadow: `0 0 6px ${STATUS_COLORS[status]}60`,
          }} />
          {count} {STATUS_LABELS[status].toLowerCase()}
        </div>
      ))}
    </div>
  )
}

// ─── Time ticker ────────────────────────────────────────────────────────────
function useTimeTick(interval = 15000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), interval)
    return () => clearInterval(id)
  }, [interval])
}

// ─── Demo ghosts generator ──────────────────────────────────────────────────
function useGhosts(show: boolean, tables: Table[]): Ghost[] {
  return useMemo(() => {
    if (!show) return GHOSTS
    const available = tables.filter(t => t.status === 'available' && !t.isMergedInto).slice(0, 3)
    return available.map((t, i) => ({
      id: `ghost-${t.id}`,
      x: t.x, y: t.y, seats: t.seats, shape: t.shape,
      name: ['Mr. Dupont', 'Table Weber', 'Famille Klein'][i] || 'Réservation',
      inMinutes: [12, 20, 28][i] || 25,
    }))
  }, [show, tables])
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function FloorPlanPage({ onOpenOrder }: Props) {
  const tables = usePOS(s => s.tables)
  const setTableStatus = usePOS(s => s.setTableStatus)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; table: Table } | null>(null)
  const [reassignFor, setReassignFor] = useState<Table | null>(null)
  const [vipNotice, setVipNotice] = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragRect, setDragRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Transfer drag state
  const [transferFrom, setTransferFrom] = useState<string | null>(null)
  const [transferTo, setTransferTo] = useState<string | null>(null)
  const [transferNotice, setTransferNotice] = useState<string | null>(null)

  // Overlays
  const [heatmap, setHeatmap] = useState(false)
  const [showGhosts, setShowGhosts] = useState(false)

  useTimeTick()

  const visibleTables = tables.filter(t => !t.isMergedInto)
  const ghosts = useGhosts(showGhosts, tables)

  const sectionOccupancy = useMemo(() => {
    const groups = { 'Salle principale': { o: 0, t: 0 }, 'Bar': { o: 0, t: 0 }, 'Terrasse': { o: 0, t: 0 } } as Record<string, { o: number; t: number }>
    for (const tb of visibleTables) {
      const sec = (tb.section in groups) ? tb.section : 'Salle principale'
      groups[sec].t++
      if (tb.status === 'occupied') groups[sec].o++
    }
    return {
      salle: groups['Salle principale'].t > 0 ? groups['Salle principale'].o / groups['Salle principale'].t : 0,
      bar:   groups['Bar'].t > 0            ? groups['Bar'].o / groups['Bar'].t : 0,
      terr:  groups['Terrasse'].t > 0       ? groups['Terrasse'].o / groups['Terrasse'].t : 0,
    }
  }, [visibleTables])

  const handleTableClick = useCallback((table: Table, e: React.MouseEvent) => {
    if (table.isMergedInto) return
    if (e.shiftKey) {
      setSelectedIds(prev => {
        const n = new Set(prev)
        if (n.has(table.id)) n.delete(table.id); else n.add(table.id)
        return n
      })
      return
    }
    setSelectedTable(table)
  }, [])

  const handleContextMenu = useCallback((table: Table, e: React.MouseEvent) => {
    e.preventDefault()
    if (table.isMergedInto) return
    setContextMenu({ x: e.clientX, y: e.clientY, table })
  }, [])

  // Rectangle selection handlers
  function svgCoordsFromEvent(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const inv = ctm.inverse()
    const p = pt.matrixTransform(inv)
    return { x: p.x, y: p.y }
  }

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const target = e.target as SVGElement
    if (target.tagName.toLowerCase() !== 'svg' && target.getAttribute('data-bg') !== '1') return
    const p = svgCoordsFromEvent(e)
    if (!p) return
    dragStart.current = p
    setDragRect({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    if (!e.shiftKey) setSelectedIds(new Set())
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragStart.current) return
    const p = svgCoordsFromEvent(e)
    if (!p) return
    setDragRect({ x0: dragStart.current.x, y0: dragStart.current.y, x1: p.x, y1: p.y })
  }

  function onMouseUp() {
    if (dragRect) {
      const x0 = Math.min(dragRect.x0, dragRect.x1)
      const x1 = Math.max(dragRect.x0, dragRect.x1)
      const y0 = Math.min(dragRect.y0, dragRect.y1)
      const y1 = Math.max(dragRect.y0, dragRect.y1)
      if (x1 - x0 > 8 && y1 - y0 > 8) {
        const ids = visibleTables
          .filter(t => t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1)
          .map(t => t.id)
        setSelectedIds(new Set(ids))
      }
    }
    dragStart.current = null
    setDragRect(null)
  }

  // Transfer via drag
  function onTableMouseDown(id: string, e: React.MouseEvent) {
    if (e.button === 0 && e.altKey) {
      setTransferFrom(id)
    }
  }

  function onTableMouseEnterTransfer(id: string) {
    if (transferFrom && transferFrom !== id) setTransferTo(id)
  }

  function onGlobalMouseUpTransfer() {
    if (transferFrom && transferTo) {
      const src = tables.find(t => t.id === transferFrom)
      const dst = tables.find(t => t.id === transferTo)
      if (src && dst) {
        setTransferNotice(`Commande transférée : ${src.name} → ${dst.name}`)
        setTimeout(() => setTransferNotice(null), 2500)
      }
    }
    setTransferFrom(null)
    setTransferTo(null)
  }

  useEffect(() => {
    if (!transferFrom) return
    const handler = () => onGlobalMouseUpTransfer()
    window.addEventListener('mouseup', handler)
    return () => window.removeEventListener('mouseup', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferFrom, transferTo])

  // Context menu actions
  function ctxViewOrder(t: Table) { onOpenOrder(t.id) }
  function ctxMarkVIP(t: Table) {
    setVipNotice(`${t.name} marquée VIP ⭐`)
    setTimeout(() => setVipNotice(null), 2000)
  }
  function ctxTransfer(t: Table) {
    setTransferFrom(t.id)
    setTransferNotice(`Cliquez sur une table destination pour transférer depuis ${t.name}`)
  }
  function ctxClean(t: Table) { setTableStatus(t.id, 'available') }

  const syncedSelected = selectedTable
    ? tables.find(t => t.id === selectedTable.id) ?? null
    : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#07070d' }}>
      <PulseStyles />

      <svg
        ref={svgRef}
        width="100%" height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', userSelect: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <defs>
          <pattern id="floorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          </pattern>
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.4" fill="rgba(255,255,255,0.03)" />
          </pattern>
          <radialGradient id="bgGradient" cx="45%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#0e0e22" />
            <stop offset="60%" stopColor="#09091a" />
            <stop offset="100%" stopColor="#050510" />
          </radialGradient>
        </defs>

        <rect data-bg="1" width={VW} height={VH} fill="url(#bgGradient)" />
        <rect data-bg="1" width={VW} height={VH} fill="url(#floorGrid)" />
        <rect data-bg="1" width={VW} height={VH} fill="url(#dotGrid)" />

        <SectionBg x={20} y={20} w={600} h={576} label="Salle principale" color="#6366f1" gradId="gradSalle" heatmap={heatmap} occupancy={sectionOccupancy.salle} />
        <SectionBg x={632} y={20} w={450} h={250} label="Bar" color="#f59e0b" gradId="gradBar" heatmap={heatmap} occupancy={sectionOccupancy.bar} />
        <SectionBg x={632} y={290} w={450} h={306} label="Terrasse" color="#10b981" gradId="gradTerr" heatmap={heatmap} occupancy={sectionOccupancy.terr} />

        <Decorations />

        <line x1={628} y1={20} x2={628} y2={598} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />
        <line x1={632} y1={276} x2={1078} y2={276} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />

        {/* Ghost reservations */}
        {ghosts.map(g => <GhostTable key={g.id} g={g} />)}

        {/* Tables */}
        {visibleTables.map(table => (
          <g
            key={table.id}
            onMouseDown={e => onTableMouseDown(table.id, e)}
            onMouseEnter={() => onTableMouseEnterTransfer(table.id)}
          >
            <TableCard
              table={table}
              onClick={e => handleTableClick(table, e)}
              onContextMenu={e => handleContextMenu(table, e)}
              selected={selectedIds.has(table.id)}
              transferTarget={transferFrom === table.id || transferTo === table.id}
            />
          </g>
        ))}

        {/* Selection rectangle */}
        {dragRect && (
          <rect
            x={Math.min(dragRect.x0, dragRect.x1)}
            y={Math.min(dragRect.y0, dragRect.y1)}
            width={Math.abs(dragRect.x1 - dragRect.x0)}
            height={Math.abs(dragRect.y1 - dragRect.y0)}
            fill="rgba(99,102,241,0.08)"
            stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
        )}

        <Legend />
      </svg>

      <Toolbar
        heatmap={heatmap} onToggleHeatmap={() => setHeatmap(h => !h)}
        showGhosts={showGhosts} onToggleGhosts={() => setShowGhosts(s => !s)}
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <StatsOverlay tables={tables} />
      <FloorStatsBar tables={tables} />

      {/* Transient notices */}
      <AnimatePresence>
        {vipNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 18px', borderRadius: 12,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#fbbf24', fontSize: 13, fontWeight: 600,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {vipNotice}
          </motion.div>
        )}
        {transferNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 18px', borderRadius: 12,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', fontSize: 13, fontWeight: 600,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {transferNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y} table={contextMenu.table}
            onClose={() => setContextMenu(null)}
            onViewOrder={() => ctxViewOrder(contextMenu.table)}
            onReassign={() => setReassignFor(contextMenu.table)}
            onMarkVIP={() => ctxMarkVIP(contextMenu.table)}
            onTransfer={() => ctxTransfer(contextMenu.table)}
            onClean={() => ctxClean(contextMenu.table)}
          />
        )}
      </AnimatePresence>

      {/* Reassign popup */}
      <AnimatePresence>
        {reassignFor && (
          <ReassignPopup
            current={assignWaiter(reassignFor.id)}
            onClose={() => setReassignFor(null)}
            onSelect={w => {
              setVipNotice(`${reassignFor.name} assignée à ${w.name}`)
              setTimeout(() => setVipNotice(null), 2000)
            }}
          />
        )}
      </AnimatePresence>

      {/* Table modal */}
      <AnimatePresence>
        {syncedSelected && (
          <TableModal
            key={syncedSelected.id}
            table={syncedSelected}
            onClose={() => setSelectedTable(null)}
            onOpenOrder={(id) => { setSelectedTable(null); onOpenOrder(id) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
