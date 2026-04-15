import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Table, TableShape, makeTable, DEFAULT_TABLES } from '../store/posStore'

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void
}

// ─── Fixture interface ─────────────────────────────────────────────────────────
interface Fixture {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  label?: string
}

interface FixtureDef {
  type: string
  label: string
  category: string
  emoji: string
  width: number
  height: number
  color: string
  shape: 'rect' | 'circle' | 'line' | 'arc'
  borderRadius?: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const VW = 1100
const VH = 680
const GRID_SNAP = 20

const SECTIONS = [
  { id: 'Salle', label: 'Salle', color: '#6366f1', x: 20, y: 20, w: 600, h: 636 },
  { id: 'Bar', label: 'Bar', color: '#f59e0b', x: 632, y: 20, w: 450, h: 250 },
  { id: 'Terrasse', label: 'Terrasse', color: '#10b981', x: 632, y: 290, w: 450, h: 370 },
]

const SHAPE_DEFS: { shape: TableShape; label: string; icon: string }[] = [
  { shape: 'round', label: 'Ronde', icon: 'circle' },
  { shape: 'square', label: 'Carrée', icon: 'square' },
  { shape: 'rect', label: 'Rectangle', icon: 'rect' },
  { shape: 'bar', label: 'Comptoir', icon: 'bar' },
]

const FIXTURE_CATEGORIES = ['Mobilier', 'Équipements', 'Divertissement', 'Structure'] as const

const FIXTURE_DEFS: FixtureDef[] = [
  // Mobilier
  { type: 'comptoir', label: 'Comptoir/Bar', category: 'Mobilier', emoji: '🍺', width: 120, height: 36, color: '#8B6914', shape: 'rect', borderRadius: 6 },
  { type: 'chaise', label: 'Chaise', category: 'Mobilier', emoji: '🪑', width: 24, height: 24, color: '#7c6240', shape: 'circle' },
  { type: 'canape', label: 'Canapé', category: 'Mobilier', emoji: '🛋️', width: 90, height: 40, color: '#6b4c8a', shape: 'rect', borderRadius: 16 },
  { type: 'tabouret', label: 'Tabouret', category: 'Mobilier', emoji: '⚫', width: 18, height: 18, color: '#5a5a6e', shape: 'circle' },
  // Équipements
  { type: 'tv', label: 'TV/Écran', category: 'Équipements', emoji: '📺', width: 60, height: 38, color: '#1e40af', shape: 'rect', borderRadius: 4 },
  { type: 'cafe', label: 'Machine à café', category: 'Équipements', emoji: '☕', width: 36, height: 36, color: '#78350f', shape: 'rect', borderRadius: 6 },
  { type: 'frigo', label: 'Frigo', category: 'Équipements', emoji: '🧊', width: 44, height: 60, color: '#94a3b8', shape: 'rect', borderRadius: 4 },
  // Divertissement
  { type: 'flechettes', label: 'Fléchettes', category: 'Divertissement', emoji: '🎯', width: 40, height: 40, color: '#dc2626', shape: 'circle' },
  { type: 'billard', label: 'Billard', category: 'Divertissement', emoji: '🎱', width: 100, height: 56, color: '#166534', shape: 'rect', borderRadius: 6 },
  { type: 'flipper', label: 'Flipper', category: 'Divertissement', emoji: '🕹️', width: 50, height: 80, color: '#7c3aed', shape: 'rect', borderRadius: 4 },
  { type: 'machine_sous', label: 'Machine à sous', category: 'Divertissement', emoji: '🎰', width: 44, height: 56, color: '#b91c1c', shape: 'rect', borderRadius: 4 },
  { type: 'loterie', label: 'Loterie Nationale', category: 'Divertissement', emoji: '🍀', width: 44, height: 56, color: '#15803d', shape: 'rect', borderRadius: 4 },
  { type: 'babyfoot', label: 'Baby-foot', category: 'Divertissement', emoji: '⚽', width: 70, height: 40, color: '#854d0e', shape: 'rect', borderRadius: 4 },
  // Structure
  { type: 'fenetre', label: 'Fenêtre', category: 'Structure', emoji: '🪟', width: 80, height: 6, color: '#60a5fa', shape: 'line' },
  { type: 'porte', label: "Porte d'entrée", category: 'Structure', emoji: '🚪', width: 50, height: 50, color: '#a16207', shape: 'arc' },
  { type: 'mur', label: 'Mur', category: 'Structure', emoji: '🧱', width: 100, height: 10, color: '#57534e', shape: 'rect', borderRadius: 2 },
  { type: 'escalier', label: 'Escalier', category: 'Structure', emoji: '🪜', width: 50, height: 60, color: '#78716c', shape: 'rect', borderRadius: 2 },
  { type: 'plante', label: 'Plante', category: 'Structure', emoji: '🌿', width: 30, height: 30, color: '#22c55e', shape: 'circle' },
  { type: 'wc', label: 'WC', category: 'Structure', emoji: '🚻', width: 50, height: 40, color: '#475569', shape: 'rect', borderRadius: 6 },
]

const FIXTURE_STORAGE_KEY = 'creorga-floor-fixtures'

function loadFixtures(): Fixture[] {
  try {
    const raw = localStorage.getItem(FIXTURE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveFixtures(fixtures: Fixture[]) {
  localStorage.setItem(FIXTURE_STORAGE_KEY, JSON.stringify(fixtures))
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => 't_' + Math.random().toString(36).slice(2, 9)
const fuid = () => 'f_' + Math.random().toString(36).slice(2, 9)

function snap(v: number): number {
  return Math.round(v / GRID_SNAP) * GRID_SNAP
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function tableGeometry(t: { shape: TableShape; seats: number }) {
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

function seatPositions(shape: TableShape, seats: number) {
  const g = tableGeometry({ shape, seats })
  const dots: { cx: number; cy: number }[] = []
  const n = seats

  if (g.type === 'circle') {
    const R = g.r + 16
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      dots.push({ cx: Math.cos(angle) * R, cy: Math.sin(angle) * R })
    }
  } else {
    const { w, h } = g
    const perSide = Math.ceil(n / 2)
    for (let i = 0; i < Math.min(perSide, n); i++) {
      dots.push({ cx: (w / (perSide + 1)) * (i + 1) - w / 2, cy: -h / 2 - 14 })
    }
    for (let i = 0; i < Math.min(n - perSide, n); i++) {
      dots.push({ cx: (w / (Math.min(n - perSide, perSide) + 1)) * (i + 1) - w / 2, cy: h / 2 + 14 })
    }
  }
  return dots
}

function getSectionForPoint(x: number, y: number): string {
  for (const s of SECTIONS) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.id
  }
  return 'Salle'
}

// ─── SVG coordinate conversion ─────────────────────────────────────────────────
function screenToSVG(svgEl: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = svgEl.getBoundingClientRect()
  const scaleX = VW / rect.width
  const scaleY = VH / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

// ─── Shape Icon (mini SVG for toolbar) ─────────────────────────────────────────
function ShapeIcon({ shape, size = 28, color = '#8892a8' }: { shape: TableShape; size?: number; color?: string }) {
  const s = size
  const half = s / 2
  switch (shape) {
    case 'round':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={half} cy={half} r={half - 3} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      )
    case 'square':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={3} y={3} width={s - 6} height={s - 6} rx={4} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      )
    case 'rect':
      return (
        <svg width={s + 8} height={s} viewBox={`0 0 ${s + 8} ${s}`}>
          <rect x={3} y={5} width={s + 2} height={s - 10} rx={4} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      )
    case 'bar':
      return (
        <svg width={s + 14} height={s} viewBox={`0 0 ${s + 14} ${s}`}>
          <rect x={2} y={8} width={s + 10} height={s - 16} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      )
  }
}

// ─── Editable Table SVG in Canvas ──────────────────────────────────────────────
function EditorTableShape({
  table,
  isSelected,
  isDragging,
  onMouseDown,
  onClick,
  rotation,
}: {
  table: Table
  isSelected: boolean
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
  rotation: number
}) {
  const [hover, setHover] = useState(false)
  const g = tableGeometry(table)
  const seats = seatPositions(table.shape, table.seats)

  const accentColor = isSelected ? '#818cf8' : '#4b5072'
  const fillColor = isSelected ? '#818cf815' : (hover ? '#ffffff08' : '#0c0c1d')
  const strokeW = isSelected ? 2.2 : (hover ? 1.8 : 1.2)

  return (
    <g
      transform={`translate(${table.x},${table.y}) rotate(${rotation})`}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {/* Selection ring */}
      {isSelected && g.type === 'circle' && (
        <circle
          cx={0} cy={0} r={g.r + 6}
          fill="none" stroke="#818cf850" strokeWidth={2}
          strokeDasharray="6 3"
        />
      )}
      {isSelected && g.type === 'rect' && (
        <rect
          x={-g.w / 2 - 6} y={-g.h / 2 - 6}
          width={g.w + 12} height={g.h + 12}
          rx={table.shape === 'bar' ? 11 : 15}
          fill="none" stroke="#818cf850" strokeWidth={2}
          strokeDasharray="6 3"
        />
      )}

      {/* Seat dots */}
      {seats.map((d, i) => (
        <circle
          key={i}
          cx={d.cx} cy={d.cy} r={5}
          fill={hover || isSelected ? `${accentColor}30` : '#1a1a30'}
          stroke={hover || isSelected ? accentColor : '#2a2a44'}
          strokeWidth={1.2}
          style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
        />
      ))}

      {/* Main shape */}
      {g.type === 'circle' ? (
        <circle
          cx={0} cy={0} r={g.r}
          fill={fillColor}
          stroke={accentColor}
          strokeWidth={strokeW}
          style={{ transition: 'all 0.2s' }}
        />
      ) : (
        <rect
          x={-g.w / 2} y={-g.h / 2}
          width={g.w} height={g.h}
          rx={table.shape === 'bar' ? 8 : 12}
          fill={fillColor}
          stroke={accentColor}
          strokeWidth={strokeW}
          style={{ transition: 'all 0.2s' }}
        />
      )}

      {/* Table name */}
      <text
        textAnchor="middle" dy="-0.2em"
        fontSize={table.shape === 'bar' ? 11 : 10.5}
        fontWeight={700}
        fill={isSelected ? '#e2e8f0' : (hover ? '#c8cee0' : '#8892a8')}
        style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 0.2s' }}
      >
        {table.name}
      </text>
      {/* Seats count */}
      <text
        textAnchor="middle" dy="1.1em"
        fontSize={9}
        fill={isSelected ? '#a5b4fc' : '#5a6078'}
        fontWeight={500}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {table.seats} pl.
      </text>

      {/* Drag shadow */}
      {isDragging && g.type === 'circle' && (
        <circle cx={0} cy={0} r={g.r + 2} fill="none" stroke="#818cf830" strokeWidth={3} />
      )}
      {isDragging && g.type === 'rect' && (
        <rect
          x={-g.w / 2 - 2} y={-g.h / 2 - 2}
          width={g.w + 4} height={g.h + 4}
          rx={table.shape === 'bar' ? 10 : 14}
          fill="none" stroke="#818cf830" strokeWidth={3}
        />
      )}
    </g>
  )
}

// ─── Fixture SVG renderer ─────────────────────────────────────────────────────
function EditorFixtureShape({
  fixture,
  def,
  isSelected,
  isDragging,
  onMouseDown,
  onClick,
}: {
  fixture: Fixture
  def: FixtureDef
  isSelected: boolean
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
}) {
  const [hover, setHover] = useState(false)
  const strokeColor = isSelected ? '#f59e0b' : (hover ? '#ffffff50' : '#ffffff20')
  const strokeW = isSelected ? 2 : (hover ? 1.5 : 1)
  const w = def.width
  const h = def.height
  const displayLabel = fixture.label || def.label

  return (
    <g
      transform={`translate(${fixture.x},${fixture.y}) rotate(${fixture.rotation})`}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.8 : 1 }}
    >
      {/* Selection ring */}
      {isSelected && (
        <rect
          x={-w / 2 - 5} y={-h / 2 - 5}
          width={w + 10} height={h + 10}
          rx={8} fill="none" stroke="#f59e0b50" strokeWidth={2} strokeDasharray="5 3"
        />
      )}

      {/* Main shape */}
      {def.shape === 'circle' ? (
        <circle
          cx={0} cy={0} r={w / 2}
          fill={`${def.color}30`} stroke={strokeColor} strokeWidth={strokeW}
          style={{ transition: 'all 0.15s' }}
        />
      ) : def.shape === 'line' ? (
        <g>
          <line
            x1={-w / 2} y1={0} x2={w / 2} y2={0}
            stroke={def.color} strokeWidth={4} strokeDasharray="8 4"
            opacity={0.7}
          />
          {isSelected && (
            <rect x={-w / 2 - 3} y={-6} width={w + 6} height={12}
              fill="none" stroke="#f59e0b50" strokeWidth={1.5} strokeDasharray="4 3" rx={3} />
          )}
        </g>
      ) : def.shape === 'arc' ? (
        <g>
          <line x1={0} y1={-h / 2} x2={0} y2={h / 2}
            stroke={def.color} strokeWidth={3} opacity={0.8} />
          <path
            d={`M 0 ${-h / 2} A ${w / 2} ${h / 2} 0 0 1 0 ${h / 2}`}
            fill="none" stroke={def.color} strokeWidth={2} strokeDasharray="4 3" opacity={0.6}
          />
        </g>
      ) : (
        <rect
          x={-w / 2} y={-h / 2} width={w} height={h}
          rx={def.borderRadius ?? 4}
          fill={`${def.color}30`} stroke={strokeColor} strokeWidth={strokeW}
          style={{ transition: 'all 0.15s' }}
        />
      )}

      {/* Emoji */}
      <text
        textAnchor="middle" dy="0.35em"
        fontSize={Math.min(w, h) > 30 ? 14 : 10}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {def.emoji}
      </text>

      {/* Label below */}
      <text
        textAnchor="middle"
        y={h / 2 + 11}
        fontSize={7.5}
        fontWeight={600}
        fill={isSelected ? '#fbbf24' : (hover ? '#e2e8f0' : '#6b7280')}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {displayLabel.length > 14 ? displayLabel.slice(0, 12) + '...' : displayLabel}
      </text>
    </g>
  )
}

// ─── Ghost preview (placement mode) ────────────────────────────────────────────
function GhostTable({ shape, seats, x, y }: { shape: TableShape; seats: number; x: number; y: number }) {
  const g = tableGeometry({ shape, seats })
  const dots = seatPositions(shape, seats)

  return (
    <g transform={`translate(${x},${y})`} opacity={0.5} style={{ pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={5} fill="#818cf820" stroke="#818cf840" strokeWidth={1} />
      ))}
      {g.type === 'circle' ? (
        <circle cx={0} cy={0} r={g.r} fill="#818cf810" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="6 4" />
      ) : (
        <rect
          x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h}
          rx={shape === 'bar' ? 8 : 12}
          fill="#818cf810" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="6 4"
        />
      )}
    </g>
  )
}

// ─── Ghost fixture (placement mode) ────────────────────────────────────────────
function GhostFixture({ def, x, y }: { def: FixtureDef; x: number; y: number }) {
  const w = def.width
  const h = def.height
  return (
    <g transform={`translate(${x},${y})`} opacity={0.5} style={{ pointerEvents: 'none' }}>
      {def.shape === 'circle' ? (
        <circle cx={0} cy={0} r={w / 2} fill="#f59e0b10" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" />
      ) : def.shape === 'line' ? (
        <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 4" />
      ) : def.shape === 'arc' ? (
        <g>
          <line x1={0} y1={-h / 2} x2={0} y2={h / 2} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" />
          <path d={`M 0 ${-h / 2} A ${w / 2} ${h / 2} 0 0 1 0 ${h / 2}`}
            fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      ) : (
        <rect x={-w / 2} y={-h / 2} width={w} height={h}
          rx={def.borderRadius ?? 4}
          fill="#f59e0b10" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" />
      )}
      <text textAnchor="middle" dy="0.35em" fontSize={12} style={{ pointerEvents: 'none' }}>
        {def.emoji}
      </text>
    </g>
  )
}

// ─── Alignment guides ──────────────────────────────────────────────────────────
function AlignmentGuides({ dragId, dragX, dragY, tables }: {
  dragId: string; dragX: number; dragY: number; tables: Table[]
}) {
  const lines: React.ReactElement[] = []
  const threshold = 8

  for (const t of tables) {
    if (t.id === dragId) continue
    if (Math.abs(t.x - dragX) < threshold) {
      lines.push(
        <line key={`vx-${t.id}`} x1={t.x} y1={0} x2={t.x} y2={VH}
          stroke="#818cf840" strokeWidth={0.8} strokeDasharray="4 4" />
      )
    }
    if (Math.abs(t.y - dragY) < threshold) {
      lines.push(
        <line key={`hy-${t.id}`} x1={0} y1={t.y} x2={VW} y2={t.y}
          stroke="#818cf840" strokeWidth={0.8} strokeDasharray="4 4" />
      )
    }
  }
  return <g style={{ pointerEvents: 'none' }}>{lines}</g>
}

// ─── Section backgrounds (editor version) ──────────────────────────────────────
function EditorSectionBg({ section, isActive, onClick }: {
  section: typeof SECTIONS[number]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <linearGradient id={`egrad-${section.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={section.color} stopOpacity={isActive ? 0.06 : 0.03} />
          <stop offset="100%" stopColor={section.color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <rect
        x={section.x} y={section.y} width={section.w} height={section.h} rx={18}
        fill={`url(#egrad-${section.id})`}
        stroke={isActive ? `${section.color}50` : `${section.color}20`}
        strokeWidth={isActive ? 2 : 1.5}
        strokeDasharray="8 5"
      />
      <text
        x={section.x + 18} y={section.y + 24}
        fontSize={10} fontWeight={700}
        fill={isActive ? `${section.color}90` : `${section.color}50`}
        letterSpacing="0.12em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {section.label.toUpperCase()}
      </text>
    </g>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FloorPlanEditor({ onBack }: Props) {
  const tables = usePOS(s => s.tables)
  const moveTable = usePOS(s => s.moveTable)
  const addTable = usePOS(s => s.addTable)
  const updateTable = usePOS(s => s.updateTable)
  const removeTable = usePOS(s => s.removeTable)
  const resetData = usePOS(s => s.resetData)

  const svgRef = useRef<SVGSVGElement>(null)

  // ── UI State
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('Salle')
  const [placementShape, setPlacementShape] = useState<TableShape | null>(null)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // ── Fixture state
  const [fixtures, setFixtures] = useState<Fixture[]>(loadFixtures)
  const [placementFixture, setPlacementFixture] = useState<string | null>(null)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null)
  const [fixtureDeleteConfirm, setFixtureDeleteConfirm] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // ── Drag state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [dragType, setDragType] = useState<'table' | 'fixture'>('table')

  // ── Table counter for naming
  const tableCounter = useRef(
    Math.max(0, ...tables.map(t => {
      const m = t.name.match(/Table (\d+)/)
      return m ? parseInt(m[1]) : 0
    })) + 1
  )

  const selectedTable = useMemo(() => {
    if (selectedFixtureId) return null
    return tables.find(t => t.id === selectedId) ?? null
  }, [tables, selectedId, selectedFixtureId])

  const selectedFixture = useMemo(() => fixtures.find(f => f.id === selectedFixtureId) ?? null, [fixtures, selectedFixtureId])
  const selectedFixtureDef = useMemo(() => {
    if (!selectedFixture) return null
    return FIXTURE_DEFS.find(d => d.type === selectedFixture.type) ?? null
  }, [selectedFixture])

  const placementFixtureDef = useMemo(() => {
    if (!placementFixture) return null
    return FIXTURE_DEFS.find(d => d.type === placementFixture) ?? null
  }, [placementFixture])

  // ── Save fixtures to localStorage
  useEffect(() => { saveFixtures(fixtures) }, [fixtures])

  // ── Keyboard handler
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPlacementShape(null)
        setPlacementFixture(null)
        setGhostPos(null)
        setSelectedId(null)
        setSelectedFixtureId(null)
        setDeleteConfirm(false)
        setFixtureDeleteConfirm(false)
      }
      if (e.key === 'Delete') {
        if (selectedFixtureId) {
          if (fixtureDeleteConfirm) {
            setFixtures(prev => prev.filter(f => f.id !== selectedFixtureId))
            setSelectedFixtureId(null)
            setFixtureDeleteConfirm(false)
          } else {
            setFixtureDeleteConfirm(true)
          }
        } else if (selectedId) {
          if (deleteConfirm) {
            removeTable(selectedId)
            setSelectedId(null)
            setDeleteConfirm(false)
          } else {
            setDeleteConfirm(true)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, selectedFixtureId, deleteConfirm, fixtureDeleteConfirm, removeTable])

  // ── Clear delete confirm when selection changes
  useEffect(() => { setDeleteConfirm(false) }, [selectedId])
  useEffect(() => { setFixtureDeleteConfirm(false) }, [selectedFixtureId])

  // ── Mouse move handler (drag + ghost)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)

    // Drag
    if (dragId) {
      const newX = snap(clamp(svgPt.x - dragOffset.dx, 40, VW - 40))
      const newY = snap(clamp(svgPt.y - dragOffset.dy, 40, VH - 40))
      setDragPos({ x: newX, y: newY })
    }

    // Ghost placement
    if (placementShape || placementFixture) {
      const gx = snap(clamp(svgPt.x, 40, VW - 40))
      const gy = snap(clamp(svgPt.y, 40, VH - 40))
      setGhostPos({ x: gx, y: gy })
    }
  }, [dragId, dragOffset, placementShape, placementFixture])

  // ── Mouse up (end drag)
  const handleMouseUp = useCallback(() => {
    if (dragId && dragPos) {
      if (dragType === 'table') {
        moveTable(dragId, dragPos.x, dragPos.y)
        const newSection = getSectionForPoint(dragPos.x, dragPos.y)
        updateTable(dragId, { section: newSection })
      } else {
        setFixtures(prev => prev.map(f => f.id === dragId ? { ...f, x: dragPos.x, y: dragPos.y } : f))
      }
    }
    setDragId(null)
    setDragPos(null)
  }, [dragId, dragPos, dragType, moveTable, updateTable])

  // ── Start drag on table
  const handleTableMouseDown = useCallback((tableId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!svgRef.current) return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    setDragId(tableId)
    setDragType('table')
    setDragOffset({ dx: svgPt.x - table.x, dy: svgPt.y - table.y })
    setDragPos({ x: table.x, y: table.y })
    setSelectedId(tableId)
    setSelectedFixtureId(null)
  }, [tables])

  // ── Start drag on fixture
  const handleFixtureMouseDown = useCallback((fixtureId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!svgRef.current) return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)
    const fix = fixtures.find(f => f.id === fixtureId)
    if (!fix) return
    setDragId(fixtureId)
    setDragType('fixture')
    setDragOffset({ dx: svgPt.x - fix.x, dy: svgPt.y - fix.y })
    setDragPos({ x: fix.x, y: fix.y })
    setSelectedFixtureId(fixtureId)
    setSelectedId(null)
  }, [fixtures])

  // ── Click on table
  const handleTableClick = useCallback((tableId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragId) return
    setSelectedId(tableId)
    setSelectedFixtureId(null)
    setPlacementShape(null)
    setPlacementFixture(null)
    setGhostPos(null)
  }, [dragId])

  // ── Click on fixture
  const handleFixtureClick = useCallback((fixtureId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragId) return
    setSelectedFixtureId(fixtureId)
    setSelectedId(null)
    setPlacementShape(null)
    setPlacementFixture(null)
    setGhostPos(null)
  }, [dragId])

  // ── Click on canvas (place or deselect)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return
    if (placementShape && ghostPos) {
      const id = uid()
      const name = `Table ${tableCounter.current}`
      tableCounter.current++
      const section = getSectionForPoint(ghostPos.x, ghostPos.y)
      const newTable = makeTable(id, name, placementShape, 4, ghostPos.x, ghostPos.y, section)
      addTable(newTable)
      setSelectedId(id)
      setSelectedFixtureId(null)
      setPlacementShape(null)
      setGhostPos(null)
    } else if (placementFixture && ghostPos) {
      const id = fuid()
      const newFixture: Fixture = {
        id,
        type: placementFixture,
        x: ghostPos.x,
        y: ghostPos.y,
        rotation: 0,
      }
      setFixtures(prev => [...prev, newFixture])
      setSelectedFixtureId(id)
      setSelectedId(null)
      setPlacementFixture(null)
      setGhostPos(null)
    } else {
      setSelectedId(null)
      setSelectedFixtureId(null)
    }
  }, [placementShape, placementFixture, ghostPos, addTable])

  // ── Start placement
  const startPlacement = (shape: TableShape) => {
    setPlacementShape(shape)
    setPlacementFixture(null)
    setSelectedId(null)
    setSelectedFixtureId(null)
  }

  const startFixturePlacement = (type: string) => {
    setPlacementFixture(type)
    setPlacementShape(null)
    setSelectedId(null)
    setSelectedFixtureId(null)
  }

  // ── Properties update helpers
  const setProp = (updates: Partial<Table>) => {
    if (!selectedId) return
    updateTable(selectedId, updates)
  }

  const setFixtureProp = (updates: Partial<Fixture>) => {
    if (!selectedFixtureId) return
    setFixtures(prev => prev.map(f => f.id === selectedFixtureId ? { ...f, ...updates } : f))
  }

  // ── Delete handlers
  const handleDelete = () => {
    if (!selectedId) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    removeTable(selectedId)
    setSelectedId(null)
    setDeleteConfirm(false)
  }

  const handleFixtureDelete = () => {
    if (!selectedFixtureId) return
    if (!fixtureDeleteConfirm) {
      setFixtureDeleteConfirm(true)
      return
    }
    setFixtures(prev => prev.filter(f => f.id !== selectedFixtureId))
    setSelectedFixtureId(null)
    setFixtureDeleteConfirm(false)
  }

  // ── Reset handler
  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }
    resetData()
    setFixtures([])
    setSelectedId(null)
    setSelectedFixtureId(null)
    setShowResetConfirm(false)
  }

  // ── Get displayed position (use drag position if dragging)
  const getTablePos = (t: Table) => {
    if (t.id === dragId && dragPos) return dragPos
    return { x: t.x, y: t.y }
  }

  const getFixturePos = (f: Fixture) => {
    if (f.id === dragId && dragPos) return dragPos
    return { x: f.x, y: f.y }
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const visibleTables = tables.filter(t => !t.isMergedInto)
  const isPlacing = !!placementShape || !!placementFixture

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const panelBg = '#0a0a14'
  const surfaceBg = '#0e0e1a'
  const borderColor = '#1e1e32'
  const textPrimary = '#e2e8f0'
  const textSecondary = '#8892a8'
  const textMuted = '#505570'
  const accent = '#818cf8'
  const accentFixture = '#f59e0b'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    background: surfaceBg,
    color: textPrimary,
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const smallBtnStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: surfaceBg,
    color: textSecondary,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#07070d',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      color: textPrimary,
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{
        height: 56,
        minHeight: 56,
        background: panelBg,
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: 16,
      }}>
        {/* Left: title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: '4px 10px',
            borderRadius: 8,
            background: `${accent}15`,
            border: `1px solid ${accent}30`,
            color: accent,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Mode Édition
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Éditeur de plan
          </span>
        </div>

        {/* Center: table + fixture count */}
        <div style={{
          fontSize: 12,
          color: textMuted,
          fontWeight: 500,
          display: 'flex',
          gap: 12,
        }}>
          <span>{visibleTables.length} table{visibleTables.length > 1 ? 's' : ''}</span>
          <span style={{ color: '#333' }}>|</span>
          <span>{fixtures.length} objet{fixtures.length > 1 ? 's' : ''}</span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{
              ...smallBtnStyle,
              borderColor: showResetConfirm ? '#f43f5e40' : borderColor,
              color: showResetConfirm ? '#f43f5e' : textSecondary,
              background: showResetConfirm ? '#f43f5e10' : surfaceBg,
            }}
            onMouseEnter={e => { if (!showResetConfirm) e.currentTarget.style.borderColor = '#ffffff20' }}
            onMouseLeave={e => {
              if (!showResetConfirm) {
                e.currentTarget.style.borderColor = borderColor
                setShowResetConfirm(false)
              }
            }}
          >
            {showResetConfirm ? 'Confirmer ?' : 'Réinitialiser'}
          </button>
          <button
            onClick={onBack}
            style={{
              ...smallBtnStyle,
              background: `${accent}15`,
              borderColor: `${accent}30`,
              color: accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${accent}25` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${accent}15` }}
          >
            Retour
          </button>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ LEFT TOOLBAR ═══ */}
        <div style={{
          width: 252,
          minWidth: 252,
          background: panelBg,
          borderRight: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Scrollable content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>

            {/* ── Section selector ── */}
            <div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: textMuted,
                marginBottom: 8,
              }}>
                Sections
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {SECTIONS.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: `1px solid ${activeSection === sec.id ? `${sec.color}40` : borderColor}`,
                      background: activeSection === sec.id ? `${sec.color}12` : 'transparent',
                      color: activeSection === sec.id ? sec.color : textSecondary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: sec.color,
                      opacity: activeSection === sec.id ? 1 : 0.4,
                    }} />
                    {sec.label}
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      color: textMuted,
                      fontWeight: 500,
                    }}>
                      {visibleTables.filter(t => t.section === sec.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Add Table ── */}
            <div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: textMuted,
                marginBottom: 8,
              }}>
                Ajouter une table
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
              }}>
                {SHAPE_DEFS.map(def => {
                  const isActive = placementShape === def.shape
                  return (
                    <button
                      key={def.shape}
                      onClick={() => isActive ? setPlacementShape(null) : startPlacement(def.shape)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 12,
                        border: `1px solid ${isActive ? `${accent}50` : borderColor}`,
                        background: isActive ? `${accent}15` : surfaceBg,
                        color: isActive ? accent : textSecondary,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = '#ffffff20'
                          e.currentTarget.style.background = '#ffffff08'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.borderColor = borderColor
                          e.currentTarget.style.background = surfaceBg
                        }
                      }}
                    >
                      <ShapeIcon shape={def.shape} size={24} color={isActive ? accent : textSecondary} />
                      {def.label}
                    </button>
                  )
                })}
              </div>
              {placementShape && (
                <div style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: `${accent}10`,
                  border: `1px solid ${accent}20`,
                  color: accent,
                  fontSize: 10,
                  fontWeight: 500,
                  textAlign: 'center',
                }}>
                  Cliquez sur le plan pour placer
                </div>
              )}
            </div>

            {/* ── MOBILIER & ÉQUIPEMENTS ── */}
            <div>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: accentFixture,
                marginBottom: 10,
              }}>
                Mobilier & Équipements
              </div>

              {FIXTURE_CATEGORIES.map(cat => {
                const items = FIXTURE_DEFS.filter(d => d.category === cat)
                const isCollapsed = collapsedCategories[cat]
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: textSecondary,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ffffff06' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{
                        display: 'inline-block',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                        fontSize: 8,
                      }}>▼</span>
                      {cat}
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: textMuted }}>
                        {items.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 4,
                        marginTop: 4,
                      }}>
                        {items.map(def => {
                          const isActive = placementFixture === def.type
                          return (
                            <button
                              key={def.type}
                              onClick={() => isActive ? setPlacementFixture(null) : startFixturePlacement(def.type)}
                              style={{
                                padding: '8px 4px',
                                borderRadius: 8,
                                border: `1px solid ${isActive ? `${accentFixture}50` : borderColor}`,
                                background: isActive ? `${accentFixture}15` : surfaceBg,
                                color: isActive ? accentFixture : textSecondary,
                                fontSize: 8,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.15s',
                                overflow: 'hidden',
                              }}
                              onMouseEnter={e => {
                                if (!isActive) {
                                  e.currentTarget.style.borderColor = `${accentFixture}30`
                                  e.currentTarget.style.background = '#ffffff06'
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isActive) {
                                  e.currentTarget.style.borderColor = borderColor
                                  e.currentTarget.style.background = surfaceBg
                                }
                              }}
                              title={def.label}
                            >
                              <span style={{ fontSize: 16, lineHeight: 1 }}>{def.emoji}</span>
                              <span style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%',
                                textAlign: 'center',
                              }}>
                                {def.label.length > 10 ? def.label.slice(0, 9) + '…' : def.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {placementFixture && (
                <div style={{
                  marginTop: 4,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: `${accentFixture}10`,
                  border: `1px solid ${accentFixture}20`,
                  color: accentFixture,
                  fontSize: 10,
                  fontWeight: 500,
                  textAlign: 'center',
                }}>
                  Cliquez sur le plan pour placer
                </div>
              )}
            </div>

            {/* ── Table Properties panel (when selected) ── */}
            <AnimatePresence>
              {selectedTable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: textMuted,
                    marginBottom: 10,
                  }}>
                    Propriétés
                  </div>

                  <div style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `1px solid ${accent}25`,
                    background: `${accent}06`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}>
                    {/* Name */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Nom
                      </label>
                      <input
                        value={selectedTable.name}
                        onChange={e => setProp({ name: e.target.value })}
                        style={inputStyle}
                      />
                    </div>

                    {/* Shape selector */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 6, fontWeight: 600 }}>
                        Forme
                      </label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {SHAPE_DEFS.map(def => {
                          const isActive = selectedTable.shape === def.shape
                          return (
                            <button
                              key={def.shape}
                              onClick={() => setProp({ shape: def.shape })}
                              title={def.label}
                              style={{
                                flex: 1,
                                padding: '6px 4px',
                                borderRadius: 8,
                                border: `1px solid ${isActive ? `${accent}50` : borderColor}`,
                                background: isActive ? `${accent}20` : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                            >
                              <ShapeIcon shape={def.shape} size={18} color={isActive ? accent : textMuted} />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Seats */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 6, fontWeight: 600 }}>
                        Places ({selectedTable.seats})
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => setProp({ seats: Math.max(1, selectedTable.seats - 1) })}
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: `1px solid ${borderColor}`, background: surfaceBg,
                            color: textPrimary, fontSize: 16, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          -
                        </button>
                        <div style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: '#1e1e32',
                          position: 'relative',
                        }}>
                          <div style={{
                            width: `${((selectedTable.seats - 1) / 19) * 100}%`,
                            height: '100%',
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${accent}, #a78bfa)`,
                            transition: 'width 0.15s',
                          }} />
                        </div>
                        <button
                          onClick={() => setProp({ seats: Math.min(20, selectedTable.seats + 1) })}
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: `1px solid ${borderColor}`, background: surfaceBg,
                            color: textPrimary, fontSize: 16, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Section */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Section
                      </label>
                      <select
                        value={selectedTable.section}
                        onChange={e => setProp({ section: e.target.value })}
                        style={{
                          ...inputStyle,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236366f1' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 10px center',
                          backgroundSize: '12px',
                          paddingRight: 32,
                          cursor: 'pointer',
                        }}
                      >
                        {SECTIONS.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Rotation */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Rotation ({selectedTable.rotation ?? 0}°)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={selectedTable.rotation ?? 0}
                        onChange={e => setProp({ rotation: parseInt(e.target.value) })}
                        style={{
                          width: '100%',
                          accentColor: accent,
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    {/* Position readout */}
                    <div style={{
                      display: 'flex',
                      gap: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: textMuted, display: 'block', marginBottom: 3, fontWeight: 600 }}>
                          X
                        </label>
                        <input
                          type="number"
                          value={selectedTable.x}
                          onChange={e => setProp({ x: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, fontSize: 11, padding: '5px 8px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: textMuted, display: 'block', marginBottom: 3, fontWeight: 600 }}>
                          Y
                        </label>
                        <input
                          type="number"
                          value={selectedTable.y}
                          onChange={e => setProp({ y: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, fontSize: 11, padding: '5px 8px' }}
                        />
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={handleDelete}
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        borderRadius: 10,
                        border: `1px solid ${deleteConfirm ? '#f43f5e60' : '#f43f5e30'}`,
                        background: deleteConfirm ? '#f43f5e20' : '#f43f5e08',
                        color: '#f43f5e',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f43f5e25'; e.currentTarget.style.borderColor = '#f43f5e60' }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = deleteConfirm ? '#f43f5e20' : '#f43f5e08'
                        e.currentTarget.style.borderColor = deleteConfirm ? '#f43f5e60' : '#f43f5e30'
                      }}
                    >
                      {deleteConfirm ? 'Confirmer la suppression' : 'Supprimer la table'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Fixture Properties panel (when fixture selected) ── */}
            <AnimatePresence>
              {selectedFixture && selectedFixtureDef && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accentFixture,
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span style={{ fontSize: 14 }}>{selectedFixtureDef.emoji}</span>
                    Propriétés objet
                  </div>

                  <div style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `1px solid ${accentFixture}25`,
                    background: `${accentFixture}06`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}>
                    {/* Type display */}
                    <div style={{
                      fontSize: 11,
                      color: textSecondary,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: `${selectedFixtureDef.color}20`,
                        border: `1px solid ${selectedFixtureDef.color}30`,
                        color: selectedFixtureDef.color,
                        fontSize: 9,
                        fontWeight: 700,
                      }}>
                        {selectedFixtureDef.category}
                      </span>
                      {selectedFixtureDef.label}
                    </div>

                    {/* Label */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Libellé
                      </label>
                      <input
                        value={selectedFixture.label ?? ''}
                        onChange={e => setFixtureProp({ label: e.target.value })}
                        placeholder={selectedFixtureDef.label}
                        style={inputStyle}
                      />
                    </div>

                    {/* Rotation */}
                    <div>
                      <label style={{ fontSize: 10, color: textMuted, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Rotation ({selectedFixture.rotation}°)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={selectedFixture.rotation}
                        onChange={e => setFixtureProp({ rotation: parseInt(e.target.value) })}
                        style={{
                          width: '100%',
                          accentColor: accentFixture,
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    {/* Position */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: textMuted, display: 'block', marginBottom: 3, fontWeight: 600 }}>X</label>
                        <input
                          type="number"
                          value={selectedFixture.x}
                          onChange={e => setFixtureProp({ x: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, fontSize: 11, padding: '5px 8px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 9, color: textMuted, display: 'block', marginBottom: 3, fontWeight: 600 }}>Y</label>
                        <input
                          type="number"
                          value={selectedFixture.y}
                          onChange={e => setFixtureProp({ y: parseInt(e.target.value) || 0 })}
                          style={{ ...inputStyle, fontSize: 11, padding: '5px 8px' }}
                        />
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={handleFixtureDelete}
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        borderRadius: 10,
                        border: `1px solid ${fixtureDeleteConfirm ? '#f43f5e60' : '#f43f5e30'}`,
                        background: fixtureDeleteConfirm ? '#f43f5e20' : '#f43f5e08',
                        color: '#f43f5e',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f43f5e25'; e.currentTarget.style.borderColor = '#f43f5e60' }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = fixtureDeleteConfirm ? '#f43f5e20' : '#f43f5e08'
                        e.currentTarget.style.borderColor = fixtureDeleteConfirm ? '#f43f5e60' : '#f43f5e30'
                      }}
                    >
                      {fixtureDeleteConfirm ? 'Confirmer la suppression' : "Supprimer l'objet"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Help text ── */}
            {!selectedTable && !selectedFixture && !isPlacing && (
              <div style={{
                padding: '14px 12px',
                borderRadius: 12,
                background: surfaceBg,
                border: `1px solid ${borderColor}`,
              }}>
                <div style={{ fontSize: 10, color: textMuted, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Raccourcis
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Cliquer', 'Sélectionner un élément'],
                    ['Glisser', 'Déplacer un élément'],
                    ['Suppr', 'Supprimer la sélection'],
                    ['Échap', 'Annuler / Désélectionner'],
                  ].map(([key, desc]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#ffffff08',
                        border: `1px solid ${borderColor}`,
                        fontSize: 9,
                        fontWeight: 600,
                        color: textSecondary,
                        minWidth: 42,
                        textAlign: 'center',
                      }}>
                        {key}
                      </span>
                      <span style={{ fontSize: 10, color: textMuted }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CENTER CANVAS ═══ */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#07070d',
            cursor: isPlacing ? 'crosshair' : (dragId ? 'grabbing' : 'default'),
          }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {/* ── Defs ── */}
            <defs>
              <pattern id="editorDotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="0.6" fill="rgba(255,255,255,0.04)" />
              </pattern>
              <radialGradient id="editorBgGrad" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#0f0f24" />
                <stop offset="60%" stopColor="#0a0a1a" />
                <stop offset="100%" stopColor="#060612" />
              </radialGradient>
            </defs>

            {/* ── Background ── */}
            <rect width={VW} height={VH} fill="url(#editorBgGrad)" />
            <rect width={VW} height={VH} fill="url(#editorDotGrid)" />

            {/* ── Snap grid (subtle lines) ── */}
            {Array.from({ length: Math.floor(VW / GRID_SNAP) + 1 }, (_, i) => (
              <line
                key={`gv${i}`}
                x1={i * GRID_SNAP} y1={0} x2={i * GRID_SNAP} y2={VH}
                stroke="rgba(255,255,255,0.012)"
                strokeWidth={0.5}
              />
            ))}
            {Array.from({ length: Math.floor(VH / GRID_SNAP) + 1 }, (_, i) => (
              <line
                key={`gh${i}`}
                x1={0} y1={i * GRID_SNAP} x2={VW} y2={i * GRID_SNAP}
                stroke="rgba(255,255,255,0.012)"
                strokeWidth={0.5}
              />
            ))}

            {/* ── Sections ── */}
            {SECTIONS.map(sec => (
              <EditorSectionBg
                key={sec.id}
                section={sec}
                isActive={activeSection === sec.id}
                onClick={() => setActiveSection(sec.id)}
              />
            ))}

            {/* ── Divider lines ── */}
            <line x1={628} y1={20} x2={628} y2={658} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />
            <line x1={632} y1={276} x2={1078} y2={276} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} />

            {/* ── Alignment guides (when dragging) ── */}
            {dragId && dragPos && dragType === 'table' && (
              <AlignmentGuides
                dragId={dragId}
                dragX={dragPos.x}
                dragY={dragPos.y}
                tables={visibleTables}
              />
            )}

            {/* ── Fixtures (rendered below tables) ── */}
            {fixtures.map(fix => {
              const def = FIXTURE_DEFS.find(d => d.type === fix.type)
              if (!def) return null
              const pos = getFixturePos(fix)
              const displayFixture = { ...fix, x: pos.x, y: pos.y }
              return (
                <EditorFixtureShape
                  key={fix.id}
                  fixture={displayFixture}
                  def={def}
                  isSelected={selectedFixtureId === fix.id}
                  isDragging={dragId === fix.id}
                  onMouseDown={e => handleFixtureMouseDown(fix.id, e)}
                  onClick={e => handleFixtureClick(fix.id, e)}
                />
              )
            })}

            {/* ── Tables ── */}
            {visibleTables.map(table => {
              const pos = getTablePos(table)
              const displayTable = { ...table, x: pos.x, y: pos.y }
              return (
                <EditorTableShape
                  key={table.id}
                  table={displayTable}
                  isSelected={selectedId === table.id}
                  isDragging={dragId === table.id}
                  rotation={table.rotation ?? 0}
                  onMouseDown={e => handleTableMouseDown(table.id, e)}
                  onClick={e => handleTableClick(table.id, e)}
                />
              )
            })}

            {/* ── Ghost preview (table placement mode) ── */}
            {placementShape && ghostPos && (
              <GhostTable
                shape={placementShape}
                seats={4}
                x={ghostPos.x}
                y={ghostPos.y}
              />
            )}

            {/* ── Ghost preview (fixture placement mode) ── */}
            {placementFixtureDef && ghostPos && (
              <GhostFixture
                def={placementFixtureDef}
                x={ghostPos.x}
                y={ghostPos.y}
              />
            )}

            {/* ── Crosshair cursor guide in placement mode ── */}
            {isPlacing && ghostPos && (
              <g style={{ pointerEvents: 'none' }}>
                <line x1={ghostPos.x} y1={0} x2={ghostPos.x} y2={VH}
                  stroke={placementFixture ? '#f59e0b20' : '#818cf820'} strokeWidth={0.5} />
                <line x1={0} y1={ghostPos.y} x2={VW} y2={ghostPos.y}
                  stroke={placementFixture ? '#f59e0b20' : '#818cf820'} strokeWidth={0.5} />
              </g>
            )}
          </svg>

          {/* ── Placement mode banner (overlay) ── */}
          <AnimatePresence>
            {isPlacing && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '8px 20px',
                  borderRadius: 12,
                  background: 'rgba(10,10,26,0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${placementFixture ? accentFixture : accent}30`,
                  color: placementFixture ? accentFixture : accent,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {placementShape && <ShapeIcon shape={placementShape} size={18} color={accent} />}
                {placementFixtureDef && <span style={{ fontSize: 16 }}>{placementFixtureDef.emoji}</span>}
                <span>Mode placement — Cliquez pour déposer</span>
                <button
                  onClick={() => { setPlacementShape(null); setPlacementFixture(null); setGhostPos(null) }}
                  style={{
                    marginLeft: 8,
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: `1px solid ${placementFixture ? accentFixture : accent}30`,
                    background: 'transparent',
                    color: placementFixture ? accentFixture : accent,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Coordinates tooltip (when dragging) ── */}
          <AnimatePresence>
            {dragId && dragPos && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  bottom: 14,
                  right: 18,
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: 'rgba(10,10,26,0.85)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: `1px solid ${borderColor}`,
                  color: textSecondary,
                  fontSize: 11,
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                x: {dragPos.x}  y: {dragPos.y}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Section indicator (bottom-left) ── */}
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: 18,
            display: 'flex',
            gap: 6,
          }}>
            {SECTIONS.map(sec => {
              const count = visibleTables.filter(t => t.section === sec.id).length
              return (
                <div
                  key={sec.id}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: 'rgba(10,10,26,0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${sec.color}25`,
                    color: sec.color,
                    fontSize: 10,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    opacity: activeSection === sec.id ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: sec.color,
                    display: 'inline-block',
                  }} />
                  {sec.label} ({count})
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
