import { useState, useCallback, useRef } from 'react'
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

function SeatDots({ table }: { table: Table }) {
  const g = tableGeometry(table)
  const dots: { cx: number; cy: number }[] = []
  const n = table.seats
  const R = g.type === 'circle' ? g.r + 14 : 0

  if (g.type === 'circle') {
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      dots.push({ cx: Math.cos(angle) * R, cy: Math.sin(angle) * R })
    }
  } else {
    // distribute seats around rect: top + bottom sides, capped
    const w = g.w, h = g.h
    const perSide = Math.ceil(n / 2)
    for (let i = 0; i < Math.min(perSide, n); i++) {
      dots.push({ cx: (w / (perSide + 1)) * (i + 1) - w / 2, cy: -h / 2 - 12 })
    }
    for (let i = 0; i < Math.min(n - perSide, n); i++) {
      dots.push({ cx: (w / (Math.min(n - perSide, perSide) + 1)) * (i + 1) - w / 2, cy: h / 2 + 12 })
    }
  }

  return (
    <g opacity={0.5}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={5} fill="#334155" stroke="#475569" strokeWidth={1} />
      ))}
    </g>
  )
}

function TableShape({ table, hover }: { table: Table; hover: boolean }) {
  const g = tableGeometry(table)
  const color = STATUS_COLORS[table.status]
  const glow = hover ? `0 0 0 2px ${color}` : ''

  const common = {
    fill: table.status === 'available' ? '#0f172a' : `${color}18`,
    stroke: color,
    strokeWidth: hover ? 2 : 1.5,
    filter: table.status === 'occupied' || hover ? `drop-shadow(0 0 8px ${color}60)` : undefined,
    transition: 'all .15s',
    cursor: 'pointer',
  }

  if (g.type === 'circle') {
    return <circle cx={0} cy={0} r={g.r} {...common} />
  }
  return <rect x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h} rx={table.shape === 'bar' ? 6 : 10} {...common} />
}

function TableCard({ table, onClick }: { table: Table; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const g = tableGeometry(table)
  const total = tableTotal(table)
  const time = elapsed(table.openedAt)
  const color = STATUS_COLORS[table.status]
  const coverCount = table.covers.length

  return (
    <g
      transform={`translate(${table.x},${table.y})`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
      <SeatDots table={table} />
      <TableShape table={table} hover={hover} />

      {/* Merged indicator */}
      {table.mergedWith.length > 0 && (
        <g transform="translate(0,-2)">
          <text textAnchor="middle" dy="0.35em" fontSize={10} fill="#c4b5fd" fontWeight={600}>
            +{table.mergedWith.length}
          </text>
        </g>
      )}

      {/* Table name */}
      <text
        textAnchor="middle"
        dy={coverCount > 0 ? (g.type === 'circle' ? '-0.5em' : '-0.6em') : '0.35em'}
        fontSize={table.shape === 'bar' ? 12 : 11}
        fontWeight={700}
        fill={hover ? '#fff' : '#e2e8f0'}
        style={{ transition: 'fill .15s', userSelect: 'none', pointerEvents: 'none' }}
      >
        {table.name}
      </text>

      {/* Cover count */}
      {coverCount > 0 && (
        <text
          textAnchor="middle"
          dy={g.type === 'circle' ? '0.8em' : '0.7em'}
          fontSize={10}
          fill={color}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {coverCount}cvt · {total.toFixed(0)}€
        </text>
      )}

      {/* Time badge */}
      {time && (
        <g transform={`translate(${g.type === 'circle' ? (tableGeometry(table) as any).r : (tableGeometry(table) as any).w / 2},${g.type === 'circle' ? -(tableGeometry(table) as any).r : -(tableGeometry(table) as any).h / 2})`}>
          <rect x={-16} y={-8} width={32} height={16} rx={8} fill="#0a0a16" stroke={color} strokeWidth={1} />
          <text textAnchor="middle" dy="0.35em" fontSize={8} fill={color} fontWeight={600}>{time}</text>
        </g>
      )}

      {/* Hover status */}
      {hover && (
        <text
          textAnchor="middle"
          dy={g.type === 'circle' ? `${(tableGeometry(table) as any).r + 22}` : `${(tableGeometry(table) as any).h / 2 + 22}`}
          fontSize={10}
          fill={color}
          fontWeight={600}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {STATUS_LABELS[table.status]}
        </text>
      )}
    </g>
  )
}

// ─── Section backgrounds ─────────────────────────────────────────────────────
function SectionBg({ x, y, w, h, label, color }: { x: number; y: number; w: number; h: number; label: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16}
        fill={`${color}06`} stroke={`${color}18`} strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={x + 16} y={y + 22} fontSize={11} fontWeight={700} fill={`${color}80`} letterSpacing="0.08em">
        {label.toUpperCase()}
      </text>
    </g>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  const items: { status: TableStatus; label: string }[] = [
    { status: 'available', label: 'Libre' },
    { status: 'occupied',  label: 'Occupée' },
    { status: 'reserved',  label: 'Réservée' },
    { status: 'dirty',     label: 'À nettoyer' },
  ]
  return (
    <g transform="translate(20, 648)">
      {items.map((item, i) => (
        <g key={item.status} transform={`translate(${i * 130}, 0)`}>
          <circle cx={6} cy={0} r={6} fill={STATUS_COLORS[item.status]} opacity={0.8} />
          <text x={16} dy="0.35em" fontSize={11} fill="#64748b">{item.label}</text>
        </g>
      ))}
    </g>
  )
}

// ─── Open Table Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  table: Table
  onClose: () => void
  onOpenOrder: (id: string) => void
}

function TableModal({ table, onClose, onOpenOrder }: ModalProps) {
  const [covers, setCovers] = useState(2)
  const openTable = usePOS(s => s.openTable)
  const closeTable = usePOS(s => s.closeTable)
  const setTableStatus = usePOS(s => s.setTableStatus)

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

  const color = STATUS_COLORS[table.status]
  const isOccupied = table.status === 'occupied'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#0d0d1a', border: `1px solid ${color}30`, borderRadius: 20,
        padding: 28, minWidth: 320, maxWidth: 400,
        boxShadow: `0 0 40px ${color}20, 0 20px 60px rgba(0,0,0,0.6)`,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{table.name}</div>
            <div style={{ fontSize: 12, color: color, marginTop: 2 }}>
              {STATUS_LABELS[table.status]} · {table.seats} places · {table.section}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Actions depending on status */}
        {isOccupied ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleGoToOrder} style={modalBtn('#6366f1', '#6366f130')}>
              📋 Voir la commande
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleMarkDirty} style={{ ...modalBtn('#f43f5e', '#f43f5e20'), flex: 1 }}>
                🧹 Fermer table
              </button>
            </div>
          </div>
        ) : table.status === 'dirty' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleMarkAvailable} style={modalBtn('#10b981', '#10b98120')}>
              ✓ Table nettoyée
            </button>
          </div>
        ) : table.status === 'reserved' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Nombre de couverts</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setCovers(c => Math.max(1, c - 1))} style={counterBtn()}>−</button>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', minWidth: 32, textAlign: 'center' }}>{covers}</span>
                <button onClick={() => setCovers(c => Math.min(table.seats, c + 1))} style={counterBtn()}>+</button>
              </div>
            </div>
            <button onClick={handleOpen} style={modalBtn('#6366f1', '#6366f130')}>
              Ouvrir la table
            </button>
            <button onClick={handleMarkAvailable} style={modalBtn('#475569', '#47556920')}>
              Annuler réservation
            </button>
          </div>
        ) : (
          // Available
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>Nombre de couverts</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setCovers(c => Math.max(1, c - 1))} style={counterBtn()}>−</button>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', minWidth: 32, textAlign: 'center' }}>{covers}</span>
                <button onClick={() => setCovers(c => Math.min(table.seats, c + 1))} style={counterBtn()}>+</button>
              </div>
            </div>
            <button onClick={handleOpen} style={modalBtn('#6366f1', '#6366f130')}>
              🍽️ Ouvrir la table
            </button>
            <button onClick={handleMarkReserved} style={modalBtn('#8b5cf6', '#8b5cf620')}>
              📅 Réserver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const modalBtn = (color: string, bg: string) => ({
  display: 'block' as const,
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: `1px solid ${color}40`,
  background: bg,
  color: color,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center' as const,
  transition: 'all .15s',
})

const counterBtn = () => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#e2e8f0',
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
})

// ─── Decorative elements ─────────────────────────────────────────────────────
function Decorations() {
  return (
    <g opacity={0.15}>
      {/* Plants */}
      {[[32, 32], [580, 32], [32, 600], [580, 600]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r={14} fill="#10b981" />
          <circle cy={-8} r={8} fill="#059669" />
        </g>
      ))}
      {/* Terrasse plants */}
      {[[700, 340], [1070, 340], [700, 640], [1070, 640]].map(([x, y], i) => (
        <g key={`tp${i}`} transform={`translate(${x},${y})`}>
          <circle r={12} fill="#10b981" />
          <circle cy={-7} r={7} fill="#059669" />
        </g>
      ))}
      {/* Bar shelf line */}
      <rect x={640} y={60} width={420} height={3} rx={1.5} fill="#6366f1" />
      <rect x={640} y={90} width={420} height={2} rx={1} fill="#6366f1" opacity={0.5} />
    </g>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FloorPlanPage({ onOpenOrder }: Props) {
  const tables = usePOS(s => s.tables)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  const handleTableClick = useCallback((table: Table) => {
    if (table.isMergedInto) return // ghost table, ignore
    setSelectedTable(table)
  }, [])

  const visibleTables = tables.filter(t => !t.isMergedInto)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0e0e20" />
            <stop offset="100%" stopColor="#07070d" />
          </radialGradient>
        </defs>

        <rect width={VW} height={VH} fill="url(#bgGrad)" />
        <rect width={VW} height={VH} fill="url(#grid)" />

        {/* Section backgrounds */}
        <SectionBg x={20} y={20} w={600} h={636} label="Salle principale" color="#6366f1" />
        <SectionBg x={632} y={20} w={450} h={250} label="Bar" color="#f59e0b" />
        <SectionBg x={632} y={290} w={450} h={370} label="Terrasse" color="#10b981" />

        <Decorations />

        {/* Divider lines */}
        <line x1={628} y1={20} x2={628} y2={658} stroke="rgba(255,255,255,0.04)" strokeWidth={2} />
        <line x1={632} y1={276} x2={1078} y2={276} stroke="rgba(255,255,255,0.04)" strokeWidth={2} />

        {/* Tables */}
        {visibleTables.map(table => (
          <TableCard
            key={table.id}
            table={table}
            onClick={() => handleTableClick(table)}
          />
        ))}

        {/* Legend */}
        <Legend />
      </svg>

      {/* Stats bar */}
      <div style={{
        position: 'absolute', top: 12, right: 16,
        display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end',
      }}>
        {(['available', 'occupied', 'reserved', 'dirty'] as const).map(status => {
          const count = tables.filter(t => t.status === status && !t.isMergedInto).length
          if (!count) return null
          return (
            <div key={status} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: `${STATUS_COLORS[status]}15`,
              border: `1px solid ${STATUS_COLORS[status]}30`,
              color: STATUS_COLORS[status],
              fontWeight: 600,
            }}>
              {count} {STATUS_LABELS[status].toLowerCase()}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {selectedTable && (
        <TableModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onOpenOrder={(id) => { setSelectedTable(null); onOpenOrder(id) }}
        />
      )}
    </div>
  )
}
