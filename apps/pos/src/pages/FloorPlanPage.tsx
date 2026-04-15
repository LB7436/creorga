import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Table, TableStatus, STATUS_COLORS, STATUS_LABELS, elapsed, tableTotal } from '../store/posStore'

interface Props {
  onOpenOrder: (tableId: string) => void
}

// ─── SVG dimensions ──────────────────────────────────────────────────────────
const VW = 1100
const VH = 680

// ─── Table geometry ──────────────────────────────────────────────────────────
function tableGeometry(t: Table) {
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
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={5.5}
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
function TableShape({ table, hover, filterId }: { table: Table; hover: boolean; filterId: string }) {
  const g = tableGeometry(table)
  const color = STATUS_COLORS[table.status]
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
      x={-g.w / 2}
      y={-g.h / 2}
      width={g.w}
      height={g.h}
      rx={table.shape === 'bar' ? 8 : 12}
      {...(common as React.SVGProps<SVGRectElement>)}
    />
  )
}

// ─── Single table card ──────────────────────────────────────────────────────
function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const g = tableGeometry(table)
  const total = tableTotal(table)
  const time = elapsed(table.openedAt)
  const color = STATUS_COLORS[table.status]
  const coverCount = table.covers.length
  const filterId = `glow-${table.id}`

  const badgeOffsetX = g.type === 'circle' ? g.r - 4 : (g as { w: number }).w / 2 - 4
  const badgeOffsetY = g.type === 'circle' ? -g.r + 2 : -(g as { h: number }).h / 2 + 2
  const hoverLabelY = g.type === 'circle' ? g.r + 26 : (g as { h: number }).h / 2 + 26

  return (
    <g
      transform={`translate(${table.x},${table.y})`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Per-table glow filter */}
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation={hover ? 10 : 6} result="blur" />
          <feFlood floodColor={color} floodOpacity={hover ? 0.5 : 0.3} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Scale wrapper for hover */}
      <g style={{
        transform: hover ? 'scale(1.06)' : 'scale(1)',
        transformOrigin: '0 0',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <SeatDots table={table} hover={hover} />
        <TableShape table={table} hover={hover} filterId={filterId} />

        {/* Merged indicator */}
        {table.mergedWith.length > 0 && (
          <text
            textAnchor="middle"
            dy="-1.2em"
            fontSize={9}
            fill="#c4b5fd"
            fontWeight={700}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            +{table.mergedWith.length} fusionnees
          </text>
        )}

        {/* Table name */}
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

        {/* Cover count + total badge */}
        {coverCount > 0 && (
          <text
            textAnchor="middle"
            dy="0.9em"
            fontSize={10}
            fill={color}
            fontWeight={600}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {coverCount} cvt  {total.toFixed(0)}
          </text>
        )}

        {/* Elapsed time badge */}
        {time && (
          <g transform={`translate(${badgeOffsetX},${badgeOffsetY})`}>
            <rect x={-18} y={-9} width={36} height={18} rx={9} fill="#0a0a18" stroke={color} strokeWidth={1} opacity={0.95} />
            <text textAnchor="middle" dy="0.35em" fontSize={8} fill={color} fontWeight={700} style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {time}
            </text>
          </g>
        )}

        {/* Hover: show status label below */}
        {hover && (
          <g transform={`translate(0, ${hoverLabelY})`}>
            <rect x={-34} y={-8} width={68} height={16} rx={8} fill="#0a0a18" opacity={0.85} />
            <text
              textAnchor="middle"
              dy="0.35em"
              fontSize={9}
              fill={color}
              fontWeight={600}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {STATUS_LABELS[table.status]}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

// ─── Section backgrounds ────────────────────────────────────────────────────
function SectionBg({ x, y, w, h, label, color, gradId }: { x: number; y: number; w: number; h: number; label: string; color: string; gradId: string }) {
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
      <text x={x + 18} y={y + 24} fontSize={10} fontWeight={700} fill={`${color}60`} letterSpacing="0.12em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {label.toUpperCase()}
      </text>
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
    <g transform="translate(20, 650)">
      {items.map((item, i) => (
        <g key={item.status} transform={`translate(${i * 140}, 0)`}>
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

// ─── Decorative elements ────────────────────────────────────────────────────
function Decorations() {
  return (
    <g>
      {/* Plant markers at section corners */}
      {[
        [38, 50], [590, 50], [38, 640], [590, 640],
      ].map(([x, y], i) => (
        <g key={`p${i}`} transform={`translate(${x},${y})`} opacity={0.12}>
          <circle r={10} fill="#10b981" />
          <circle cy={-5} r={6} fill="#059669" />
          <circle cx={4} cy={-2} r={4} fill="#34d399" opacity={0.6} />
        </g>
      ))}
      {/* Terrasse corner plants */}
      {[
        [648, 306], [1066, 306], [648, 644], [1066, 644],
      ].map(([x, y], i) => (
        <g key={`tp${i}`} transform={`translate(${x},${y})`} opacity={0.1}>
          <circle r={9} fill="#10b981" />
          <circle cy={-4} r={5} fill="#059669" />
        </g>
      ))}
      {/* Bar shelf lines */}
      <rect x={644} y={58} width={424} height={2.5} rx={1.25} fill="#6366f1" opacity={0.12} />
      <rect x={644} y={86} width={424} height={1.5} rx={0.75} fill="#6366f1" opacity={0.06} />
      {/* Subtle accent dots along divider */}
      {[100, 200, 300, 400, 500].map((yy, i) => (
        <circle key={`dd${i}`} cx={628} cy={yy} r={1.5} fill="#6366f1" opacity={0.1} />
      ))}
    </g>
  )
}

// ─── Pulsing glow animation (CSS keyframes injected once) ───────────────────
function PulseStyles() {
  return (
    <style>{`
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      .occupied-pulse {
        animation: pulseGlow 2.5s ease-in-out infinite;
      }
    `}</style>
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

  function handleOpen() {
    openTable(table.id, covers)
    onOpenOrder(table.id)
    onClose()
  }

  function handleGoToOrder() {
    onOpenOrder(table.id)
    onClose()
  }

  function handleMarkDirty() {
    setTableStatus(table.id, 'dirty')
    onClose()
  }

  function handleMarkAvailable() {
    setTableStatus(table.id, 'available')
    onClose()
  }

  function handleMarkReserved() {
    setTableStatus(table.id, 'reserved')
    onClose()
  }

  const gradientBtn = (c: string, bgBase: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '13px 18px',
    borderRadius: 14,
    border: `1px solid ${c}35`,
    background: `linear-gradient(135deg, ${bgBase}18 0%, ${bgBase}08 100%)`,
    color: c,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em',
  })

  const counterBtnStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  }

  const CoverSelector = () => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
        Nombre de couverts
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
        <button
          onClick={() => setCovers(c => Math.max(1, c - 1))}
          style={counterBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = `${color}50` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        >
          -
        </button>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0', minWidth: 40, textAlign: 'center' }}>{covers}</span>
        <button
          onClick={() => setCovers(c => Math.min(table.seats, c + 1))}
          style={counterBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = `${color}50` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        >
          +
        </button>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          border: `1px solid ${color}25`,
          borderRadius: 20,
          padding: 30,
          minWidth: 340,
          maxWidth: 420,
          boxShadow: `0 0 60px ${color}15, 0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{table.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: `${color}18`, color: color, fontWeight: 600,
              }}>
                {STATUS_LABELS[table.status]}
              </span>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.05)', color: '#8892a8', fontWeight: 500,
              }}>
                {table.seats} places
              </span>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.05)', color: '#8892a8', fontWeight: 500,
              }}>
                {table.section}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', fontSize: 16, cursor: 'pointer', padding: 0,
              width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b' }}
          >
            x
          </button>
        </div>

        {/* Occupied info summary */}
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

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isOccupied ? (
            <>
              <button
                onClick={handleGoToOrder}
                style={gradientBtn('#818cf8', '#6366f1')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f140 0%, #6366f120 100%)`; e.currentTarget.style.borderColor = '#6366f160' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f118 0%, #6366f108 100%)`; e.currentTarget.style.borderColor = '#6366f135' }}
              >
                Voir la commande
              </button>
              <button
                onClick={handleMarkDirty}
                style={gradientBtn('#f87171', '#f43f5e')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #f43f5e40 0%, #f43f5e20 100%)`; e.currentTarget.style.borderColor = '#f43f5e60' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #f43f5e18 0%, #f43f5e08 100%)`; e.currentTarget.style.borderColor = '#f43f5e35' }}
              >
                Fermer la table
              </button>
            </>
          ) : table.status === 'dirty' ? (
            <button
              onClick={handleMarkAvailable}
              style={gradientBtn('#34d399', '#10b981')}
              onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #10b98140 0%, #10b98120 100%)`; e.currentTarget.style.borderColor = '#10b98160' }}
              onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #10b98118 0%, #10b98108 100%)`; e.currentTarget.style.borderColor = '#10b98135' }}
            >
              Table nettoyee
            </button>
          ) : table.status === 'reserved' ? (
            <>
              <CoverSelector />
              <button
                onClick={handleOpen}
                style={gradientBtn('#818cf8', '#6366f1')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f140 0%, #6366f120 100%)`; e.currentTarget.style.borderColor = '#6366f160' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f118 0%, #6366f108 100%)`; e.currentTarget.style.borderColor = '#6366f135' }}
              >
                Ouvrir la table
              </button>
              <button
                onClick={handleMarkAvailable}
                style={gradientBtn('#94a3b8', '#475569')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #47556940 0%, #47556920 100%)`; e.currentTarget.style.borderColor = '#47556960' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #47556918 0%, #47556908 100%)`; e.currentTarget.style.borderColor = '#47556935' }}
              >
                Annuler reservation
              </button>
            </>
          ) : (
            <>
              <CoverSelector />
              <button
                onClick={handleOpen}
                style={gradientBtn('#818cf8', '#6366f1')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f140 0%, #6366f120 100%)`; e.currentTarget.style.borderColor = '#6366f160' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #6366f118 0%, #6366f108 100%)`; e.currentTarget.style.borderColor = '#6366f135' }}
              >
                Ouvrir la table
              </button>
              <button
                onClick={handleMarkReserved}
                style={gradientBtn('#a78bfa', '#8b5cf6')}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #8b5cf640 0%, #8b5cf620 100%)`; e.currentTarget.style.borderColor = '#8b5cf660' }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, #8b5cf618 0%, #8b5cf608 100%)`; e.currentTarget.style.borderColor = '#8b5cf635' }}
              >
                Reserver
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Stats overlay ──────────────────────────────────────────────────────────
function StatsOverlay({ tables }: { tables: Table[] }) {
  const visible = tables.filter(t => !t.isMergedInto)
  const stats = (['available', 'occupied', 'reserved', 'dirty'] as const).map(status => ({
    status,
    count: visible.filter(t => t.status === status).length,
  })).filter(s => s.count > 0)

  return (
    <div style={{
      position: 'absolute', top: 14, right: 18,
      display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end',
    }}>
      {stats.map(({ status, count }) => (
        <div
          key={status}
          style={{
            fontSize: 11,
            padding: '5px 14px',
            borderRadius: 20,
            background: `rgba(10,10,26,0.7)`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${STATUS_COLORS[status]}25`,
            color: STATUS_COLORS[status],
            fontWeight: 600,
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: STATUS_COLORS[status],
            boxShadow: `0 0 6px ${STATUS_COLORS[status]}60`,
            display: 'inline-block',
          }} />
          {count} {STATUS_LABELS[status].toLowerCase()}
        </div>
      ))}
    </div>
  )
}

// ─── Time ticker ────────────────────────────────────────────────────────────
function useTimeTick(interval = 30000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), interval)
    return () => clearInterval(id)
  }, [interval])
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function FloorPlanPage({ onOpenOrder }: Props) {
  const tables = usePOS(s => s.tables)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  useTimeTick()

  const handleTableClick = useCallback((table: Table) => {
    if (table.isMergedInto) return
    setSelectedTable(table)
  }, [])

  const visibleTables = tables.filter(t => !t.isMergedInto)

  // Keep selectedTable in sync with store updates
  const syncedSelected = selectedTable
    ? tables.find(t => t.id === selectedTable.id) ?? null
    : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#07070d' }}>
      <PulseStyles />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* ── Global defs ── */}
        <defs>
          {/* Grid pattern */}
          <pattern id="floorGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          </pattern>
          {/* Fine dot pattern overlay */}
          <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.4" fill="rgba(255,255,255,0.03)" />
          </pattern>
          {/* Radial background gradient */}
          <radialGradient id="bgGradient" cx="45%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#0e0e22" />
            <stop offset="60%" stopColor="#09091a" />
            <stop offset="100%" stopColor="#050510" />
          </radialGradient>
          {/* Occupied pulse ring filter */}
          <filter id="occupiedPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur" />
            <feFlood floodColor="#6366f1" floodOpacity="0.15" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background layers */}
        <rect width={VW} height={VH} fill="url(#bgGradient)" />
        <rect width={VW} height={VH} fill="url(#floorGrid)" />
        <rect width={VW} height={VH} fill="url(#dotGrid)" />

        {/* Section backgrounds */}
        <SectionBg x={20} y={20} w={600} h={636} label="Salle principale" color="#6366f1" gradId="gradSalle" />
        <SectionBg x={632} y={20} w={450} h={250} label="Bar" color="#f59e0b" gradId="gradBar" />
        <SectionBg x={632} y={290} w={450} h={370} label="Terrasse" color="#10b981" gradId="gradTerr" />

        {/* Decorative elements */}
        <Decorations />

        {/* Divider lines */}
        <line x1={628} y1={20} x2={628} y2={658} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />
        <line x1={632} y1={276} x2={1078} y2={276} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />

        {/* Tables */}
        {visibleTables.map(table => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => handleTableClick(table)}
          />
        ))}

        {/* Legend at bottom */}
        <Legend />
      </svg>

      {/* Stats overlay (glassmorphism) */}
      <StatsOverlay tables={tables} />

      {/* Modal with AnimatePresence */}
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
