import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, Table, TableShape, makeTable, DEFAULT_TABLES } from '../store/posStore'

/* ══════════════════════════════════════════════════════════════════════════════
   FLOOR PLAN EDITOR — Creorga POS
   Dark theme, multi-room, templates, import/export, undo/redo, copy/paste,
   align tools, measure tool, grid settings, view modes (2D/3D/walk),
   capacity calculator, print-ready, accessibility, background image,
   extended objects library, preset scenes.
   ══════════════════════════════════════════════════════════════════════════════ */

interface Props {
  onBack: () => void
}

/* ── Types ────────────────────────────────────────────────────────────────── */

interface Fixture {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  label?: string
  room?: string
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

interface Room {
  id: string
  label: string
  color: string
  x: number
  y: number
  w: number
  h: number
}

interface Scene {
  id: string
  label: string
  tables: Table[]
  fixtures: Fixture[]
  rooms: Room[]
  createdAt: number
}

interface HistoryEntry {
  tables: Table[]
  fixtures: Fixture[]
  rooms: Room[]
}

type ViewMode = '2d' | '3d' | 'walk'
type GridSize = 10 | 20 | 50

/* ── Constants ────────────────────────────────────────────────────────────── */

const VW = 1100
const VH = 680
const MAX_HISTORY = 20
// 20 SVG units = ~20cm at typical restaurant scale (5 units per 5cm)

const DEFAULT_ROOMS: Room[] = [
  { id: 'Salle',    label: 'Salle',    color: '#6366f1', x: 20,  y: 20,  w: 600, h: 636 },
  { id: 'Bar',      label: 'Bar',      color: '#f59e0b', x: 632, y: 20,  w: 450, h: 250 },
  { id: 'Terrasse', label: 'Terrasse', color: '#10b981', x: 632, y: 290, w: 450, h: 370 },
]

const ROOM_COLOR_POOL = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f43f5e', '#8b5cf6', '#84cc16']

const SHAPE_DEFS: { shape: TableShape; label: string; icon: string }[] = [
  { shape: 'round', label: 'Ronde', icon: 'circle' },
  { shape: 'square', label: 'Carrée', icon: 'square' },
  { shape: 'rect', label: 'Rectangle', icon: 'rect' },
  { shape: 'bar', label: 'Comptoir', icon: 'bar' },
]

const FIXTURE_CATEGORIES = ['Mobilier', 'Équipements', 'Divertissement', 'Structure', 'Décoration'] as const

const FIXTURE_DEFS: FixtureDef[] = [
  // Mobilier
  { type: 'comptoir', label: 'Comptoir/Bar', category: 'Mobilier', emoji: '🍺', width: 120, height: 36, color: '#8B6914', shape: 'rect', borderRadius: 6 },
  { type: 'comptoir_l', label: 'Bar en L', category: 'Mobilier', emoji: '🍻', width: 160, height: 48, color: '#78350f', shape: 'rect', borderRadius: 8 },
  { type: 'comptoir_rond', label: 'Bar circulaire', category: 'Mobilier', emoji: '🍸', width: 120, height: 120, color: '#8B6914', shape: 'circle' },
  { type: 'chaise', label: 'Chaise', category: 'Mobilier', emoji: '🪑', width: 24, height: 24, color: '#7c6240', shape: 'circle' },
  { type: 'canape', label: 'Canapé', category: 'Mobilier', emoji: '🛋️', width: 90, height: 40, color: '#6b4c8a', shape: 'rect', borderRadius: 16 },
  { type: 'banquette', label: 'Banquette', category: 'Mobilier', emoji: '🛋️', width: 140, height: 34, color: '#5b3f7a', shape: 'rect', borderRadius: 10 },
  { type: 'tabouret', label: 'Tabouret', category: 'Mobilier', emoji: '⚫', width: 18, height: 18, color: '#5a5a6e', shape: 'circle' },
  // Équipements
  { type: 'tv', label: 'TV/Écran', category: 'Équipements', emoji: '📺', width: 60, height: 38, color: '#1e40af', shape: 'rect', borderRadius: 4 },
  { type: 'cafe', label: 'Machine à café', category: 'Équipements', emoji: '☕', width: 36, height: 36, color: '#78350f', shape: 'rect', borderRadius: 6 },
  { type: 'frigo', label: 'Frigo', category: 'Équipements', emoji: '🧊', width: 44, height: 60, color: '#94a3b8', shape: 'rect', borderRadius: 4 },
  { type: 'four', label: 'Four', category: 'Équipements', emoji: '🔥', width: 50, height: 50, color: '#6b7280', shape: 'rect', borderRadius: 4 },
  { type: 'evier', label: 'Évier', category: 'Équipements', emoji: '🚰', width: 60, height: 40, color: '#64748b', shape: 'rect', borderRadius: 4 },
  // Divertissement
  { type: 'flechettes', label: 'Fléchettes', category: 'Divertissement', emoji: '🎯', width: 40, height: 40, color: '#dc2626', shape: 'circle' },
  { type: 'billard', label: 'Billard', category: 'Divertissement', emoji: '🎱', width: 100, height: 56, color: '#166534', shape: 'rect', borderRadius: 6 },
  { type: 'flipper', label: 'Flipper', category: 'Divertissement', emoji: '🕹️', width: 50, height: 80, color: '#7c3aed', shape: 'rect', borderRadius: 4 },
  { type: 'machine_sous', label: 'Machine à sous', category: 'Divertissement', emoji: '🎰', width: 44, height: 56, color: '#b91c1c', shape: 'rect', borderRadius: 4 },
  { type: 'loterie', label: 'Loterie Nationale', category: 'Divertissement', emoji: '🍀', width: 44, height: 56, color: '#15803d', shape: 'rect', borderRadius: 4 },
  { type: 'babyfoot', label: 'Baby-foot', category: 'Divertissement', emoji: '⚽', width: 70, height: 40, color: '#854d0e', shape: 'rect', borderRadius: 4 },
  { type: 'dj', label: 'DJ Booth', category: 'Divertissement', emoji: '🎧', width: 80, height: 45, color: '#a855f7', shape: 'rect', borderRadius: 8 },
  { type: 'dancefloor', label: 'Piste de danse', category: 'Divertissement', emoji: '💃', width: 160, height: 140, color: '#ec4899', shape: 'rect', borderRadius: 20 },
  // Structure
  { type: 'fenetre', label: 'Fenêtre', category: 'Structure', emoji: '🪟', width: 80, height: 6, color: '#60a5fa', shape: 'line' },
  { type: 'porte', label: "Porte d'entrée", category: 'Structure', emoji: '🚪', width: 50, height: 50, color: '#a16207', shape: 'arc' },
  { type: 'porte_urgence', label: 'Sortie de secours', category: 'Structure', emoji: '🆘', width: 50, height: 50, color: '#22c55e', shape: 'arc' },
  { type: 'mur', label: 'Mur', category: 'Structure', emoji: '🧱', width: 100, height: 10, color: '#57534e', shape: 'rect', borderRadius: 2 },
  { type: 'escalier', label: 'Escalier', category: 'Structure', emoji: '🪜', width: 50, height: 60, color: '#78716c', shape: 'rect', borderRadius: 2 },
  { type: 'wc', label: 'WC', category: 'Structure', emoji: '🚻', width: 50, height: 40, color: '#475569', shape: 'rect', borderRadius: 6 },
  { type: 'pmr', label: 'Accès PMR', category: 'Structure', emoji: '♿', width: 40, height: 40, color: '#0ea5e9', shape: 'circle' },
  // Décoration
  { type: 'plante', label: 'Plante', category: 'Décoration', emoji: '🌿', width: 30, height: 30, color: '#22c55e', shape: 'circle' },
  { type: 'grande_plante', label: 'Grande plante', category: 'Décoration', emoji: '🌳', width: 50, height: 50, color: '#16a34a', shape: 'circle' },
  { type: 'sculpture', label: 'Sculpture', category: 'Décoration', emoji: '🗿', width: 36, height: 36, color: '#94a3b8', shape: 'circle' },
  { type: 'cheminee', label: 'Cheminée', category: 'Décoration', emoji: '🔥', width: 70, height: 30, color: '#dc2626', shape: 'rect', borderRadius: 4 },
  { type: 'tableau', label: 'Tableau', category: 'Décoration', emoji: '🖼️', width: 40, height: 8, color: '#d97706', shape: 'rect', borderRadius: 2 },
  { type: 'luminaire', label: 'Luminaire', category: 'Décoration', emoji: '💡', width: 24, height: 24, color: '#fbbf24', shape: 'circle' },
]

/* ── Room templates ───────────────────────────────────────────────────────── */

interface Template {
  id: string
  label: string
  emoji: string
  description: string
  tables: Array<{ name: string; shape: TableShape; seats: number; x: number; y: number }>
}

const TEMPLATES: Template[] = [
  {
    id: 'restaurant',
    label: 'Restaurant standard',
    emoji: '🍽️',
    description: '12 tables mix rond/carré',
    tables: [
      { name: 'T1', shape: 'round', seats: 2, x: 120, y: 120 },
      { name: 'T2', shape: 'round', seats: 4, x: 260, y: 120 },
      { name: 'T3', shape: 'round', seats: 4, x: 400, y: 120 },
      { name: 'T4', shape: 'square', seats: 4, x: 120, y: 280 },
      { name: 'T5', shape: 'square', seats: 4, x: 260, y: 280 },
      { name: 'T6', shape: 'square', seats: 4, x: 400, y: 280 },
      { name: 'T7', shape: 'rect', seats: 6, x: 180, y: 440 },
      { name: 'T8', shape: 'rect', seats: 8, x: 400, y: 440 },
      { name: 'T9', shape: 'round', seats: 2, x: 540, y: 120 },
      { name: 'T10', shape: 'round', seats: 2, x: 540, y: 240 },
      { name: 'T11', shape: 'round', seats: 4, x: 540, y: 380 },
      { name: 'T12', shape: 'round', seats: 4, x: 540, y: 520 },
    ],
  },
  {
    id: 'brasserie',
    label: 'Brasserie',
    emoji: '🍺',
    description: 'Long bar + tables serrées',
    tables: [
      { name: 'Bar 1', shape: 'bar', seats: 8, x: 300, y: 80 },
      { name: 'B1', shape: 'square', seats: 2, x: 120, y: 220 },
      { name: 'B2', shape: 'square', seats: 2, x: 240, y: 220 },
      { name: 'B3', shape: 'square', seats: 2, x: 360, y: 220 },
      { name: 'B4', shape: 'square', seats: 2, x: 480, y: 220 },
      { name: 'B5', shape: 'square', seats: 4, x: 120, y: 360 },
      { name: 'B6', shape: 'square', seats: 4, x: 260, y: 360 },
      { name: 'B7', shape: 'square', seats: 4, x: 400, y: 360 },
      { name: 'B8', shape: 'rect', seats: 6, x: 200, y: 520 },
      { name: 'B9', shape: 'rect', seats: 6, x: 420, y: 520 },
    ],
  },
  {
    id: 'cafe',
    label: 'Café',
    emoji: '☕',
    description: 'Petites tables intimistes',
    tables: [
      { name: 'C1', shape: 'round', seats: 2, x: 120, y: 140 },
      { name: 'C2', shape: 'round', seats: 2, x: 240, y: 140 },
      { name: 'C3', shape: 'round', seats: 2, x: 360, y: 140 },
      { name: 'C4', shape: 'round', seats: 2, x: 480, y: 140 },
      { name: 'C5', shape: 'round', seats: 2, x: 120, y: 300 },
      { name: 'C6', shape: 'round', seats: 2, x: 240, y: 300 },
      { name: 'C7', shape: 'round', seats: 2, x: 360, y: 300 },
      { name: 'C8', shape: 'round', seats: 2, x: 480, y: 300 },
      { name: 'C9', shape: 'round', seats: 4, x: 180, y: 460 },
      { name: 'C10', shape: 'round', seats: 4, x: 400, y: 460 },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    emoji: '🎶',
    description: 'Bar central + zones VIP',
    tables: [
      { name: 'VIP 1', shape: 'round', seats: 8, x: 140, y: 140 },
      { name: 'VIP 2', shape: 'round', seats: 8, x: 460, y: 140 },
      { name: 'Bar A', shape: 'bar', seats: 6, x: 300, y: 300 },
      { name: 'L1', shape: 'rect', seats: 6, x: 140, y: 440 },
      { name: 'L2', shape: 'rect', seats: 6, x: 300, y: 440 },
      { name: 'L3', shape: 'rect', seats: 6, x: 460, y: 440 },
      { name: 'VIP 3', shape: 'round', seats: 6, x: 800, y: 150 },
      { name: 'VIP 4', shape: 'round', seats: 6, x: 950, y: 150 },
    ],
  },
]

/* ── Storage keys ─────────────────────────────────────────────────────────── */

const FIXTURE_STORAGE_KEY = 'creorga-floor-fixtures'
const ROOMS_STORAGE_KEY = 'creorga-floor-rooms'
const SCENES_STORAGE_KEY = 'creorga-floor-scenes'
const BG_STORAGE_KEY = 'creorga-floor-background'

function loadFixtures(): Fixture[] {
  try {
    const raw = localStorage.getItem(FIXTURE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveFixtures(fixtures: Fixture[]) {
  localStorage.setItem(FIXTURE_STORAGE_KEY, JSON.stringify(fixtures))
}
function loadRooms(): Room[] {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_ROOMS
  } catch { return DEFAULT_ROOMS }
}
function saveRooms(rooms: Room[]) {
  localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
}
function loadScenes(): Scene[] {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveScenes(scenes: Scene[]) {
  localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes))
}
function loadBackground(): string | null {
  try { return localStorage.getItem(BG_STORAGE_KEY) } catch { return null }
}
function saveBackground(data: string | null) {
  if (data === null) localStorage.removeItem(BG_STORAGE_KEY)
  else localStorage.setItem(BG_STORAGE_KEY, data)
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const uid = () => 't_' + Math.random().toString(36).slice(2, 9)
const fuid = () => 'f_' + Math.random().toString(36).slice(2, 9)
const rid = () => 'r_' + Math.random().toString(36).slice(2, 9)
const sid = () => 's_' + Math.random().toString(36).slice(2, 9)

function snap(v: number, step: number): number {
  return Math.round(v / step) * step
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Convert SVG units → meters (1 unit ≈ 1 cm). */
function unitsToMeters(units: number): number {
  return units / 100
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

function getSectionForPoint(rooms: Room[], x: number, y: number): string {
  for (const r of rooms) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id
  }
  return rooms[0]?.id || 'Salle'
}

function screenToSVG(svgEl: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = svgEl.getBoundingClientRect()
  const scaleX = VW / rect.width
  const scaleY = VH / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

/* ── Shape icon ───────────────────────────────────────────────────────────── */

function ShapeIcon({ shape, size = 28, color = '#8892a8' }: { shape: TableShape; size?: number; color?: string }) {
  const s = size
  const half = s / 2
  switch (shape) {
    case 'round':
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half - 3} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    case 'square':
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={3} y={3} width={s - 6} height={s - 6} rx={4} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    case 'rect':
      return <svg width={s + 8} height={s} viewBox={`0 0 ${s + 8} ${s}`}>
        <rect x={3} y={5} width={s + 2} height={s - 10} rx={4} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    case 'bar':
      return <svg width={s + 14} height={s} viewBox={`0 0 ${s + 14} ${s}`}>
        <rect x={2} y={8} width={s + 10} height={s - 16} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
  }
}

/* ── Table SVG ────────────────────────────────────────────────────────────── */

function EditorTableShape({
  table, isSelected, isDragging, onMouseDown, onClick, rotation, isoMode,
}: {
  table: Table
  isSelected: boolean
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
  rotation: number
  isoMode: boolean
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
      style={{ cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.8 : 1 }}
    >
      {/* Iso shadow */}
      {isoMode && (
        g.type === 'circle' ? (
          <ellipse cx={6} cy={8} rx={g.r} ry={g.r * 0.5} fill="rgba(0,0,0,0.5)" />
        ) : (
          <rect x={-g.w / 2 + 6} y={-g.h / 2 + 8} width={g.w} height={g.h * 0.5}
            rx={table.shape === 'bar' ? 8 : 12} fill="rgba(0,0,0,0.5)" />
        )
      )}

      {isSelected && g.type === 'circle' && (
        <circle cx={0} cy={0} r={g.r + 6} fill="none" stroke="#818cf850" strokeWidth={2} strokeDasharray="6 3" />
      )}
      {isSelected && g.type === 'rect' && (
        <rect
          x={-g.w / 2 - 6} y={-g.h / 2 - 6}
          width={g.w + 12} height={g.h + 12}
          rx={table.shape === 'bar' ? 11 : 15}
          fill="none" stroke="#818cf850" strokeWidth={2} strokeDasharray="6 3"
        />
      )}

      {seats.map((d, i) => (
        <circle
          key={i}
          cx={d.cx} cy={d.cy} r={5}
          fill={hover || isSelected ? `${accentColor}30` : '#1a1a30'}
          stroke={hover || isSelected ? accentColor : '#2a2a44'}
          strokeWidth={1.2}
        />
      ))}

      {g.type === 'circle' ? (
        <circle cx={0} cy={0} r={g.r} fill={fillColor} stroke={accentColor} strokeWidth={strokeW} />
      ) : (
        <rect
          x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h}
          rx={table.shape === 'bar' ? 8 : 12}
          fill={fillColor} stroke={accentColor} strokeWidth={strokeW}
        />
      )}

      <text textAnchor="middle" dy="-0.2em"
        fontSize={table.shape === 'bar' ? 11 : 10.5}
        fontWeight={700}
        fill={isSelected ? '#e2e8f0' : (hover ? '#c8cee0' : '#8892a8')}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {table.name}
      </text>
      <text textAnchor="middle" dy="1.1em"
        fontSize={9} fontWeight={500}
        fill={isSelected ? '#a5b4fc' : '#5a6078'}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {table.seats} pl.
      </text>
    </g>
  )
}

/* ── Fixture SVG ──────────────────────────────────────────────────────────── */

function EditorFixtureShape({
  fixture, def, isSelected, isDragging, onMouseDown, onClick,
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
      {isSelected && (
        <rect
          x={-w / 2 - 5} y={-h / 2 - 5}
          width={w + 10} height={h + 10}
          rx={8} fill="none" stroke="#f59e0b50" strokeWidth={2} strokeDasharray="5 3"
        />
      )}

      {def.shape === 'circle' ? (
        <circle cx={0} cy={0} r={w / 2}
          fill={`${def.color}30`} stroke={strokeColor} strokeWidth={strokeW} />
      ) : def.shape === 'line' ? (
        <g>
          <line x1={-w / 2} y1={0} x2={w / 2} y2={0}
            stroke={def.color} strokeWidth={4} strokeDasharray="8 4" opacity={0.7} />
          {isSelected && (
            <rect x={-w / 2 - 3} y={-6} width={w + 6} height={12}
              fill="none" stroke="#f59e0b50" strokeWidth={1.5} strokeDasharray="4 3" rx={3} />
          )}
        </g>
      ) : def.shape === 'arc' ? (
        <g>
          <line x1={0} y1={-h / 2} x2={0} y2={h / 2}
            stroke={def.color} strokeWidth={3} opacity={0.8} />
          <path d={`M 0 ${-h / 2} A ${w / 2} ${h / 2} 0 0 1 0 ${h / 2}`}
            fill="none" stroke={def.color} strokeWidth={2} strokeDasharray="4 3" opacity={0.6} />
        </g>
      ) : (
        <rect x={-w / 2} y={-h / 2} width={w} height={h}
          rx={def.borderRadius ?? 4}
          fill={`${def.color}30`} stroke={strokeColor} strokeWidth={strokeW} />
      )}

      <text textAnchor="middle" dy="0.35em"
        fontSize={Math.min(w, h) > 30 ? 14 : 10}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {def.emoji}
      </text>
      <text textAnchor="middle" y={h / 2 + 11}
        fontSize={7.5} fontWeight={600}
        fill={isSelected ? '#fbbf24' : (hover ? '#e2e8f0' : '#6b7280')}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {displayLabel.length > 14 ? displayLabel.slice(0, 12) + '…' : displayLabel}
      </text>
    </g>
  )
}

/* ── Ghost preview ────────────────────────────────────────────────────────── */

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
        <rect x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h}
          rx={shape === 'bar' ? 8 : 12}
          fill="#818cf810" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="6 4" />
      )}
    </g>
  )
}

function GhostFixture({ def, x, y }: { def: FixtureDef; x: number; y: number }) {
  const w = def.width, h = def.height
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

function AlignmentGuides({ dragId, dragX, dragY, tables }: {
  dragId: string; dragX: number; dragY: number; tables: Table[]
}) {
  const lines: React.ReactElement[] = []
  const threshold = 8
  for (const t of tables) {
    if (t.id === dragId) continue
    if (Math.abs(t.x - dragX) < threshold) {
      lines.push(<line key={`vx-${t.id}`} x1={t.x} y1={0} x2={t.x} y2={VH}
        stroke="#818cf840" strokeWidth={0.8} strokeDasharray="4 4" />)
    }
    if (Math.abs(t.y - dragY) < threshold) {
      lines.push(<line key={`hy-${t.id}`} x1={0} y1={t.y} x2={VW} y2={t.y}
        stroke="#818cf840" strokeWidth={0.8} strokeDasharray="4 4" />)
    }
  }
  return <g style={{ pointerEvents: 'none' }}>{lines}</g>
}

function EditorRoomBg({ room, isActive, onClick }: {
  room: Room; isActive: boolean; onClick: () => void
}) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <linearGradient id={`egrad-${room.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={room.color} stopOpacity={isActive ? 0.08 : 0.03} />
          <stop offset="100%" stopColor={room.color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <rect
        x={room.x} y={room.y} width={room.w} height={room.h} rx={18}
        fill={`url(#egrad-${room.id})`}
        stroke={isActive ? `${room.color}60` : `${room.color}25`}
        strokeWidth={isActive ? 2 : 1.5} strokeDasharray="8 5"
      />
      <text x={room.x + 18} y={room.y + 24}
        fontSize={10} fontWeight={700}
        fill={isActive ? `${room.color}` : `${room.color}60`}
        letterSpacing="0.12em"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {room.label.toUpperCase()}
      </text>
    </g>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

export default function FloorPlanEditor({ onBack }: Props) {
  const tables = usePOS(s => s.tables)
  const moveTable = usePOS(s => s.moveTable)
  const addTable = usePOS(s => s.addTable)
  const updateTable = usePOS(s => s.updateTable)
  const removeTable = usePOS(s => s.removeTable)
  const resetData = usePOS(s => s.resetData)

  const svgRef = useRef<SVGSVGElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  /* ── UI state */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placementShape, setPlacementShape] = useState<TableShape | null>(null)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  /* ── Fixtures */
  const [fixtures, setFixtures] = useState<Fixture[]>(loadFixtures)
  const [placementFixture, setPlacementFixture] = useState<string | null>(null)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null)
  const [fixtureDeleteConfirm, setFixtureDeleteConfirm] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  /* ── Rooms (multi-room support) */
  const [rooms, setRooms] = useState<Room[]>(loadRooms)
  const [activeRoom, setActiveRoom] = useState<string>(rooms[0]?.id || 'Salle')
  const [showRoomEditor, setShowRoomEditor] = useState(false)

  /* ── Scenes (presets) */
  const [scenes, setScenes] = useState<Scene[]>(loadScenes)
  const [showScenesPanel, setShowScenesPanel] = useState(false)

  /* ── Drag state */
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [dragType, setDragType] = useState<'table' | 'fixture'>('table')

  /* ── View mode */
  const [viewMode, setViewMode] = useState<ViewMode>('2d')

  /* ── Grid settings */
  const [gridSize, setGridSize] = useState<GridSize>(20)
  const [showGrid, setShowGrid] = useState(true)

  /* ── Measure tool */
  const [measureMode, setMeasureMode] = useState(false)
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null)

  /* ── Undo/Redo */
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const suppressHistory = useRef(false)

  /* ── Clipboard */
  const [clipboard, setClipboard] = useState<Table[] | null>(null)

  /* ── Modals/panels */
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCapacity, setShowCapacity] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [exportText, setExportText] = useState('')
  const [importText, setImportText] = useState('')

  /* ── Background image */
  const [bgImage, setBgImage] = useState<string | null>(loadBackground)
  const [bgOpacity, setBgOpacity] = useState(0.35)

  /* ── Walk mode */
  const [walkPos, setWalkPos] = useState({ x: 400, y: 400 })
  const [walkAngle, setWalkAngle] = useState(0)

  /* ── Table counter */
  const tableCounter = useRef(
    Math.max(0, ...tables.map(t => {
      const m = t.name.match(/Table (\d+)/)
      return m ? parseInt(m[1]) : 0
    })) + 1
  )

  /* ── Derived selections */
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

  /* ── Persist */
  useEffect(() => { saveFixtures(fixtures) }, [fixtures])
  useEffect(() => { saveRooms(rooms) }, [rooms])
  useEffect(() => { saveScenes(scenes) }, [scenes])
  useEffect(() => { saveBackground(bgImage) }, [bgImage])

  /* ── History push ─ */
  const pushHistory = useCallback(() => {
    if (suppressHistory.current) return
    setHistory(h => {
      const newEntry: HistoryEntry = {
        tables: JSON.parse(JSON.stringify(tables)),
        fixtures: JSON.parse(JSON.stringify(fixtures)),
        rooms: JSON.parse(JSON.stringify(rooms)),
      }
      const trimmed = h.slice(0, historyIndex + 1)
      trimmed.push(newEntry)
      const limited = trimmed.slice(-MAX_HISTORY)
      return limited
    })
    setHistoryIndex(i => Math.min(i + 1, MAX_HISTORY - 1))
  }, [tables, fixtures, rooms, historyIndex])

  // Initial history snapshot on mount
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ tables: [...tables], fixtures: [...fixtures], rooms: [...rooms] }])
      setHistoryIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const entry = history[newIndex]
    if (!entry) return
    suppressHistory.current = true
    // Apply
    const currentIds = new Set(tables.map(t => t.id))
    entry.tables.forEach(t => {
      if (currentIds.has(t.id)) updateTable(t.id, t)
      else addTable(t)
    })
    tables.forEach(t => {
      if (!entry.tables.find(et => et.id === t.id)) removeTable(t.id)
    })
    setFixtures(entry.fixtures)
    setRooms(entry.rooms)
    setHistoryIndex(newIndex)
    setTimeout(() => { suppressHistory.current = false }, 50)
  }, [historyIndex, history, tables, updateTable, addTable, removeTable])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const entry = history[newIndex]
    if (!entry) return
    suppressHistory.current = true
    const currentIds = new Set(tables.map(t => t.id))
    entry.tables.forEach(t => {
      if (currentIds.has(t.id)) updateTable(t.id, t)
      else addTable(t)
    })
    tables.forEach(t => {
      if (!entry.tables.find(et => et.id === t.id)) removeTable(t.id)
    })
    setFixtures(entry.fixtures)
    setRooms(entry.rooms)
    setHistoryIndex(newIndex)
    setTimeout(() => { suppressHistory.current = false }, 50)
  }, [historyIndex, history, tables, updateTable, addTable, removeTable])

  /* ── Keyboard ─ */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'Escape') {
        setPlacementShape(null); setPlacementFixture(null); setGhostPos(null)
        setSelectedId(null); setSelectedFixtureId(null)
        setDeleteConfirm(false); setFixtureDeleteConfirm(false)
        setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null)
      }
      if (e.key === 'Delete') {
        if (selectedFixtureId) {
          if (fixtureDeleteConfirm) {
            setFixtures(prev => prev.filter(f => f.id !== selectedFixtureId))
            setSelectedFixtureId(null)
            setFixtureDeleteConfirm(false)
            pushHistory()
          } else setFixtureDeleteConfirm(true)
        } else if (selectedId) {
          if (deleteConfirm) {
            removeTable(selectedId)
            setSelectedId(null)
            setDeleteConfirm(false)
            pushHistory()
          } else setDeleteConfirm(true)
        }
      }
      // Ctrl+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); redo()
      }
      // Ctrl+C / Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedTable) {
          setClipboard([selectedTable])
          e.preventDefault()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard && clipboard.length > 0) {
          clipboard.forEach(t => {
            const id = uid()
            const newTable = makeTable(
              id,
              `${t.name} (copie)`,
              t.shape,
              t.seats,
              t.x + 30,
              t.y + 30,
              t.section
            )
            addTable(newTable)
          })
          pushHistory()
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId, selectedFixtureId, deleteConfirm, fixtureDeleteConfirm, removeTable,
      undo, redo, selectedTable, clipboard, addTable, pushHistory])

  useEffect(() => { setDeleteConfirm(false) }, [selectedId])
  useEffect(() => { setFixtureDeleteConfirm(false) }, [selectedFixtureId])

  /* ── Walk mode keyboard */
  useEffect(() => {
    if (viewMode !== 'walk') return
    function onKey(e: KeyboardEvent) {
      const speed = 15
      const rot = 0.15
      if (e.key === 'ArrowUp') setWalkPos(p => ({
        x: clamp(p.x + Math.cos(walkAngle) * speed, 40, VW - 40),
        y: clamp(p.y + Math.sin(walkAngle) * speed, 40, VH - 40),
      }))
      if (e.key === 'ArrowDown') setWalkPos(p => ({
        x: clamp(p.x - Math.cos(walkAngle) * speed, 40, VW - 40),
        y: clamp(p.y - Math.sin(walkAngle) * speed, 40, VH - 40),
      }))
      if (e.key === 'ArrowLeft') setWalkAngle(a => a - rot)
      if (e.key === 'ArrowRight') setWalkAngle(a => a + rot)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewMode, walkAngle])

  /* ── Mouse handlers */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)

    if (measureMode && measureStart) {
      setMeasureEnd({ x: svgPt.x, y: svgPt.y })
      return
    }
    if (dragId) {
      const newX = snap(clamp(svgPt.x - dragOffset.dx, 40, VW - 40), gridSize)
      const newY = snap(clamp(svgPt.y - dragOffset.dy, 40, VH - 40), gridSize)
      setDragPos({ x: newX, y: newY })
    }
    if (placementShape || placementFixture) {
      const gx = snap(clamp(svgPt.x, 40, VW - 40), gridSize)
      const gy = snap(clamp(svgPt.y, 40, VH - 40), gridSize)
      setGhostPos({ x: gx, y: gy })
    }
  }, [dragId, dragOffset, placementShape, placementFixture, gridSize, measureMode, measureStart])

  const handleMouseUp = useCallback(() => {
    if (dragId && dragPos) {
      if (dragType === 'table') {
        moveTable(dragId, dragPos.x, dragPos.y)
        const newSection = getSectionForPoint(rooms, dragPos.x, dragPos.y)
        updateTable(dragId, { section: newSection })
      } else {
        setFixtures(prev => prev.map(f => f.id === dragId ? { ...f, x: dragPos.x, y: dragPos.y } : f))
      }
      pushHistory()
    }
    setDragId(null)
    setDragPos(null)
  }, [dragId, dragPos, dragType, moveTable, updateTable, rooms, pushHistory])

  const handleTableMouseDown = useCallback((tableId: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    if (!svgRef.current) return
    if (viewMode !== '2d' && viewMode !== '3d') return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)
    const table = tables.find(t => t.id === tableId)
    if (!table) return
    setDragId(tableId)
    setDragType('table')
    setDragOffset({ dx: svgPt.x - table.x, dy: svgPt.y - table.y })
    setDragPos({ x: table.x, y: table.y })
    setSelectedId(tableId); setSelectedFixtureId(null)
  }, [tables, viewMode])

  const handleFixtureMouseDown = useCallback((fixtureId: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    if (!svgRef.current) return
    if (viewMode !== '2d' && viewMode !== '3d') return
    const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)
    const fix = fixtures.find(f => f.id === fixtureId)
    if (!fix) return
    setDragId(fixtureId)
    setDragType('fixture')
    setDragOffset({ dx: svgPt.x - fix.x, dy: svgPt.y - fix.y })
    setDragPos({ x: fix.x, y: fix.y })
    setSelectedFixtureId(fixtureId); setSelectedId(null)
  }, [fixtures, viewMode])

  const handleTableClick = useCallback((tableId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragId) return
    setSelectedId(tableId); setSelectedFixtureId(null)
    setPlacementShape(null); setPlacementFixture(null); setGhostPos(null)
  }, [dragId])

  const handleFixtureClick = useCallback((fixtureId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragId) return
    setSelectedFixtureId(fixtureId); setSelectedId(null)
    setPlacementShape(null); setPlacementFixture(null); setGhostPos(null)
  }, [dragId])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return

    if (measureMode) {
      const svgPt = screenToSVG(svgRef.current, e.clientX, e.clientY)
      if (!measureStart) {
        setMeasureStart(svgPt); setMeasureEnd(svgPt)
      } else {
        // Finish measurement
        setMeasureStart(null)
        // Keep measureEnd for a moment then clear? Keep visible.
      }
      return
    }

    if (placementShape && ghostPos) {
      const id = uid()
      const name = `Table ${tableCounter.current}`
      tableCounter.current++
      const section = getSectionForPoint(rooms, ghostPos.x, ghostPos.y)
      const newTable = makeTable(id, name, placementShape, 4, ghostPos.x, ghostPos.y, section)
      addTable(newTable)
      setSelectedId(id); setSelectedFixtureId(null)
      setPlacementShape(null); setGhostPos(null)
      pushHistory()
    } else if (placementFixture && ghostPos) {
      const id = fuid()
      const newFixture: Fixture = {
        id, type: placementFixture,
        x: ghostPos.x, y: ghostPos.y, rotation: 0,
        room: getSectionForPoint(rooms, ghostPos.x, ghostPos.y),
      }
      setFixtures(prev => [...prev, newFixture])
      setSelectedFixtureId(id); setSelectedId(null)
      setPlacementFixture(null); setGhostPos(null)
      pushHistory()
    } else {
      setSelectedId(null); setSelectedFixtureId(null)
    }
  }, [placementShape, placementFixture, ghostPos, addTable, rooms, pushHistory, measureMode, measureStart])

  const startPlacement = (shape: TableShape) => {
    setPlacementShape(shape); setPlacementFixture(null)
    setSelectedId(null); setSelectedFixtureId(null)
    setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null)
  }
  const startFixturePlacement = (type: string) => {
    setPlacementFixture(type); setPlacementShape(null)
    setSelectedId(null); setSelectedFixtureId(null)
    setMeasureMode(false); setMeasureStart(null); setMeasureEnd(null)
  }

  const setProp = (updates: Partial<Table>) => {
    if (!selectedId) return
    updateTable(selectedId, updates)
    pushHistory()
  }
  const setFixtureProp = (updates: Partial<Fixture>) => {
    if (!selectedFixtureId) return
    setFixtures(prev => prev.map(f => f.id === selectedFixtureId ? { ...f, ...updates } : f))
    pushHistory()
  }

  const handleDelete = () => {
    if (!selectedId) return
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    removeTable(selectedId); setSelectedId(null); setDeleteConfirm(false)
    pushHistory()
  }
  const handleFixtureDelete = () => {
    if (!selectedFixtureId) return
    if (!fixtureDeleteConfirm) { setFixtureDeleteConfirm(true); return }
    setFixtures(prev => prev.filter(f => f.id !== selectedFixtureId))
    setSelectedFixtureId(null); setFixtureDeleteConfirm(false)
    pushHistory()
  }
  const handleReset = () => {
    if (!showResetConfirm) { setShowResetConfirm(true); return }
    resetData()
    setFixtures([])
    setRooms(DEFAULT_ROOMS)
    setSelectedId(null); setSelectedFixtureId(null); setShowResetConfirm(false)
    pushHistory()
  }

  /* ── Align tools */
  const alignTables = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distH' | 'distV') => {
    const room = rooms.find(r => r.id === activeRoom)
    if (!room) return
    const inRoom = tables.filter(t => t.section === activeRoom && !t.isMergedInto)
    if (inRoom.length < 2) return

    if (mode === 'left') {
      const minX = Math.min(...inRoom.map(t => t.x))
      inRoom.forEach(t => updateTable(t.id, { x: minX }))
    } else if (mode === 'right') {
      const maxX = Math.max(...inRoom.map(t => t.x))
      inRoom.forEach(t => updateTable(t.id, { x: maxX }))
    } else if (mode === 'center') {
      const cx = inRoom.reduce((a, t) => a + t.x, 0) / inRoom.length
      inRoom.forEach(t => updateTable(t.id, { x: snap(cx, gridSize) }))
    } else if (mode === 'top') {
      const minY = Math.min(...inRoom.map(t => t.y))
      inRoom.forEach(t => updateTable(t.id, { y: minY }))
    } else if (mode === 'bottom') {
      const maxY = Math.max(...inRoom.map(t => t.y))
      inRoom.forEach(t => updateTable(t.id, { y: maxY }))
    } else if (mode === 'middle') {
      const cy = inRoom.reduce((a, t) => a + t.y, 0) / inRoom.length
      inRoom.forEach(t => updateTable(t.id, { y: snap(cy, gridSize) }))
    } else if (mode === 'distH') {
      const sorted = [...inRoom].sort((a, b) => a.x - b.x)
      const first = sorted[0], last = sorted[sorted.length - 1]
      const gap = (last.x - first.x) / (sorted.length - 1)
      sorted.forEach((t, i) => updateTable(t.id, { x: snap(first.x + gap * i, gridSize) }))
    } else if (mode === 'distV') {
      const sorted = [...inRoom].sort((a, b) => a.y - b.y)
      const first = sorted[0], last = sorted[sorted.length - 1]
      const gap = (last.y - first.y) / (sorted.length - 1)
      sorted.forEach((t, i) => updateTable(t.id, { y: snap(first.y + gap * i, gridSize) }))
    }
    pushHistory()
  }

  /* ── Templates */
  const applyTemplate = (template: Template) => {
    // Clear tables in active room
    tables.filter(t => t.section === activeRoom).forEach(t => removeTable(t.id))
    const room = rooms.find(r => r.id === activeRoom)
    if (!room) return
    template.tables.forEach(t => {
      const id = uid()
      const newTable = makeTable(
        id, t.name, t.shape, t.seats,
        room.x + t.x, room.y + t.y,
        activeRoom,
      )
      addTable(newTable)
    })
    setShowTemplates(false)
    pushHistory()
  }

  /* ── Scenes (presets) */
  const saveScene = (label: string) => {
    const newScene: Scene = {
      id: sid(), label,
      tables: JSON.parse(JSON.stringify(tables)),
      fixtures: JSON.parse(JSON.stringify(fixtures)),
      rooms: JSON.parse(JSON.stringify(rooms)),
      createdAt: Date.now(),
    }
    setScenes(prev => [...prev, newScene])
  }
  const loadScene = (scene: Scene) => {
    // Clear current
    tables.forEach(t => removeTable(t.id))
    scene.tables.forEach(t => addTable(t))
    setFixtures(scene.fixtures)
    setRooms(scene.rooms)
    pushHistory()
  }
  const deleteScene = (id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id))
  }

  /* ── Import/Export */
  const exportLayout = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tables, fixtures, rooms,
    }
    const json = JSON.stringify(data, null, 2)
    setExportText(json)
    setShowImportExport(true)
  }
  const downloadLayout = () => {
    const blob = new Blob([exportText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creorga-plan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const importLayout = () => {
    try {
      const data = JSON.parse(importText)
      if (!data.tables || !data.fixtures) throw new Error('Format invalide')
      tables.forEach(t => removeTable(t.id))
      data.tables.forEach((t: Table) => addTable(t))
      setFixtures(data.fixtures)
      if (data.rooms) setRooms(data.rooms)
      setShowImportExport(false)
      setImportText('')
      pushHistory()
    } catch (err) {
      alert('Erreur: format JSON invalide')
    }
  }
  const triggerFileImport = () => fileInputRef.current?.click()
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImportText(ev.target?.result as string || '')
      setShowImportExport(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /* ── Background image */
  const triggerBgUpload = () => bgInputRef.current?.click()
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBgImage(ev.target?.result as string || null)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* ── Rooms edit */
  const addRoom = () => {
    const n = rooms.length
    const newRoom: Room = {
      id: rid(),
      label: `Salle ${n + 1}`,
      color: ROOM_COLOR_POOL[n % ROOM_COLOR_POOL.length],
      x: 20 + (n % 3) * 200, y: 20 + Math.floor(n / 3) * 200,
      w: 180, h: 180,
    }
    setRooms(prev => [...prev, newRoom])
    pushHistory()
  }
  const removeRoom = (id: string) => {
    if (rooms.length <= 1) return
    setRooms(prev => prev.filter(r => r.id !== id))
    if (activeRoom === id && rooms[0]) setActiveRoom(rooms[0].id)
    pushHistory()
  }
  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  /* ── Capacity calculation */
  const capacity = useMemo(() => {
    const totalSeats = tables.filter(t => !t.isMergedInto).reduce((a, t) => a + t.seats, 0)
    // Surface in m² = rough approximation
    const totalSurface = rooms.reduce((a, r) => a + (r.w * r.h) / 10000, 0) // scaling
    const perPerson = totalSeats > 0 ? totalSurface / totalSeats : 0
    // Covid compliance: min 4 m² per person, table spacing > 1m
    const covidOk = perPerson >= 1.2
    return {
      totalSeats,
      totalSurface: totalSurface.toFixed(1),
      perPerson: perPerson.toFixed(2),
      covidOk,
      roomCount: rooms.length,
      tableCount: tables.filter(t => !t.isMergedInto).length,
      fixtureCount: fixtures.length,
    }
  }, [tables, rooms, fixtures])

  /* ── Get positions */
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

  /* ── Measurement display */
  const measureInfo = useMemo(() => {
    if (!measureStart || !measureEnd) return null
    const dx = measureEnd.x - measureStart.x
    const dy = measureEnd.y - measureStart.y
    const distUnits = Math.sqrt(dx * dx + dy * dy)
    return {
      distUnits,
      distMeters: unitsToMeters(distUnits).toFixed(2),
    }
  }, [measureStart, measureEnd])

  /* ── Styles */
  const panelBg = '#0a0a14'
  const surfaceBg = '#0e0e1a'
  const borderColor = '#1e1e32'
  const textPrimary = '#e2e8f0'
  const textSecondary = '#8892a8'
  const textMuted = '#505570'
  const accent = '#818cf8'
  const accentFixture = '#f59e0b'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 10,
    border: `1px solid ${borderColor}`, background: surfaceBg,
    color: textPrimary, fontSize: 13, fontWeight: 500, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const smallBtnStyle: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8,
    border: `1px solid ${borderColor}`, background: surfaceBg,
    color: textSecondary, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', gap: 4,
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#07070d',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      color: textPrimary, overflow: 'hidden', userSelect: 'none',
    }}>
      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileImport} style={{ display: 'none' }} />
      <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} style={{ display: 'none' }} />

      {/* ═════ TOP BAR ═════ */}
      <div style={{
        height: 56, minHeight: 56,
        background: panelBg, borderBottom: `1px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 8,
            background: `${accent}15`, border: `1px solid ${accent}30`,
            color: accent, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Mode Édition
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Éditeur de plan
          </span>

          {/* View mode toggle */}
          <div style={{
            marginLeft: 12, display: 'inline-flex', gap: 2,
            background: surfaceBg, border: `1px solid ${borderColor}`,
            borderRadius: 10, padding: 3,
          }}>
            {(['2d', '3d', 'walk'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: viewMode === v ? `${accent}25` : 'transparent',
                color: viewMode === v ? accent : textSecondary,
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit', textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {v === '2d' ? '2D' : v === '3d' ? '3D' : '1P'}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          fontSize: 12, color: textMuted, fontWeight: 500,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <span>{visibleTables.length} table{visibleTables.length > 1 ? 's' : ''}</span>
          <span style={{ color: '#333' }}>|</span>
          <span>{fixtures.length} objet{fixtures.length > 1 ? 's' : ''}</span>
          <span style={{ color: '#333' }}>|</span>
          <span>{rooms.length} salle{rooms.length > 1 ? 's' : ''}</span>
          <span style={{ color: '#333' }}>|</span>
          <span>{capacity.totalSeats} places</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={undo} disabled={historyIndex <= 0}
            style={{ ...smallBtnStyle, opacity: historyIndex <= 0 ? 0.4 : 1 }}
            title="Annuler (Ctrl+Z)">↶ Annuler</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1}
            style={{ ...smallBtnStyle, opacity: historyIndex >= history.length - 1 ? 0.4 : 1 }}
            title="Rétablir (Ctrl+Y)">↷ Rétablir</button>
          <button onClick={() => setShowTemplates(true)} style={smallBtnStyle}>📐 Modèles</button>
          <button onClick={() => setShowCapacity(true)} style={smallBtnStyle}>📊 Capacité</button>
          <button onClick={() => setShowAccessibility(true)} style={smallBtnStyle}>♿ Accès</button>
          <button onClick={() => setShowPrintPreview(true)} style={smallBtnStyle}>🖨️ Imprimer</button>
          <button onClick={exportLayout} style={smallBtnStyle}>↓ Export</button>
          <button onClick={triggerFileImport} style={smallBtnStyle}>↑ Import</button>
          <button onClick={() => setShowScenesPanel(true)} style={smallBtnStyle}>🎬 Scènes</button>
          <button onClick={handleReset}
            style={{
              ...smallBtnStyle,
              borderColor: showResetConfirm ? '#f43f5e40' : borderColor,
              color: showResetConfirm ? '#f43f5e' : textSecondary,
              background: showResetConfirm ? '#f43f5e10' : surfaceBg,
            }}>
            {showResetConfirm ? 'Confirmer ?' : 'Reset'}
          </button>
          <button onClick={onBack} style={{
            ...smallBtnStyle, background: `${accent}15`,
            borderColor: `${accent}30`, color: accent,
          }}>
            Retour
          </button>
        </div>
      </div>

      {/* ═════ BODY ═════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═════ LEFT TOOLBAR ═════ */}
        <div style={{
          width: 252, minWidth: 252,
          background: panelBg, borderRight: `1px solid ${borderColor}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>

            {/* ── Rooms ── */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8,
              }}>
                <div style={sectionLabel(textMuted)}>Salles</div>
                <button onClick={() => setShowRoomEditor(true)} style={{
                  ...smallBtnStyle, padding: '3px 8px', fontSize: 10,
                }}>Gérer</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rooms.map(r => (
                  <button key={r.id}
                    onClick={() => setActiveRoom(r.id)}
                    style={{
                      padding: '8px 10px', borderRadius: 8,
                      border: activeRoom === r.id ? `1px solid ${r.color}` : `1px solid ${borderColor}`,
                      background: activeRoom === r.id ? `${r.color}15` : surfaceBg,
                      color: activeRoom === r.id ? r.color : textSecondary,
                      fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <span>{r.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {tables.filter(t => t.section === r.id).length}
                    </span>
                  </button>
                ))}
                <button onClick={addRoom} style={{
                  ...smallBtnStyle, justifyContent: 'center',
                  borderStyle: 'dashed', opacity: 0.7,
                }}>+ Salle</button>
              </div>
            </div>

            {/* ── Table shapes ── */}
            <div>
              <div style={sectionLabel(textMuted)}>Ajouter table</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SHAPE_DEFS.map(s => (
                  <button key={s.shape}
                    onClick={() => startPlacement(s.shape)}
                    style={{
                      padding: '10px 8px', borderRadius: 8,
                      border: placementShape === s.shape ? `1.5px solid ${accent}` : `1px solid ${borderColor}`,
                      background: placementShape === s.shape ? `${accent}15` : surfaceBg,
                      color: placementShape === s.shape ? accent : textSecondary,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 6,
                    }}>
                    <ShapeIcon shape={s.shape} size={24}
                      color={placementShape === s.shape ? accent : textSecondary} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tools ── */}
            <div>
              <div style={sectionLabel(textMuted)}>Outils</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button onClick={() => {
                  setMeasureMode(m => !m)
                  setMeasureStart(null); setMeasureEnd(null)
                }} style={{
                  ...smallBtnStyle, justifyContent: 'center',
                  background: measureMode ? `${accent}15` : surfaceBg,
                  borderColor: measureMode ? `${accent}40` : borderColor,
                  color: measureMode ? accent : textSecondary,
                }}>
                  📏 Mesure {measureMode ? '(actif)' : ''}
                </button>
                <button onClick={triggerBgUpload} style={{
                  ...smallBtnStyle, justifyContent: 'center',
                }}>
                  🖼️ Image de fond
                </button>
                {bgImage && (
                  <>
                    <div style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>
                      Opacité: {Math.round(bgOpacity * 100)}%
                    </div>
                    <input type="range" min="0" max="1" step="0.05"
                      value={bgOpacity}
                      onChange={e => setBgOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%' }} />
                    <button onClick={() => setBgImage(null)} style={{
                      ...smallBtnStyle, justifyContent: 'center',
                      color: '#f87171', borderColor: '#f8717140',
                    }}>Retirer</button>
                  </>
                )}
              </div>
            </div>

            {/* ── Grid ── */}
            <div>
              <div style={sectionLabel(textMuted)}>Grille</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {([10, 20, 50] as GridSize[]).map(g => (
                  <button key={g} onClick={() => setGridSize(g)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 6,
                    border: gridSize === g ? `1px solid ${accent}` : `1px solid ${borderColor}`,
                    background: gridSize === g ? `${accent}15` : surfaceBg,
                    color: gridSize === g ? accent : textSecondary,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    {g}cm
                  </button>
                ))}
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                fontSize: 11, color: textSecondary, fontWeight: 600,
              }}>
                <input type="checkbox" checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)} />
                Afficher grille
              </label>
            </div>

            {/* ── Align tools ── */}
            <div>
              <div style={sectionLabel(textMuted)}>Aligner (salle active)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                <button onClick={() => alignTables('left')} style={miniAlignBtn()}>⇤</button>
                <button onClick={() => alignTables('center')} style={miniAlignBtn()}>⇔</button>
                <button onClick={() => alignTables('right')} style={miniAlignBtn()}>⇥</button>
                <button onClick={() => alignTables('top')} style={miniAlignBtn()}>⇡</button>
                <button onClick={() => alignTables('middle')} style={miniAlignBtn()}>⇕</button>
                <button onClick={() => alignTables('bottom')} style={miniAlignBtn()}>⇣</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                <button onClick={() => alignTables('distH')} style={{
                  ...smallBtnStyle, justifyContent: 'center', fontSize: 10,
                }}>Dist. H</button>
                <button onClick={() => alignTables('distV')} style={{
                  ...smallBtnStyle, justifyContent: 'center', fontSize: 10,
                }}>Dist. V</button>
              </div>
            </div>

            {/* ── Fixtures library ── */}
            <div>
              <div style={sectionLabel(textMuted)}>Objets</div>
              {FIXTURE_CATEGORIES.map(cat => {
                const defs = FIXTURE_DEFS.filter(d => d.category === cat)
                const collapsed = collapsedCategories[cat]
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <button onClick={() => toggleCategory(cat)} style={{
                      width: '100%', padding: '6px 8px', borderRadius: 6,
                      border: 'none', background: 'transparent',
                      color: textSecondary, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{cat}</span>
                      <span style={{ fontSize: 8 }}>{collapsed ? '▸' : '▾'}</span>
                    </button>
                    {!collapsed && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {defs.map(d => (
                          <button key={d.type}
                            onClick={() => startFixturePlacement(d.type)}
                            title={d.label}
                            style={{
                              padding: '8px 4px', borderRadius: 8,
                              border: placementFixture === d.type
                                ? `1.5px solid ${accentFixture}`
                                : `1px solid ${borderColor}`,
                              background: placementFixture === d.type
                                ? `${accentFixture}15` : surfaceBg,
                              color: placementFixture === d.type ? accentFixture : textSecondary,
                              fontSize: 9, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: 3,
                              textOverflow: 'ellipsis', overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}>
                            <span style={{ fontSize: 18 }}>{d.emoji}</span>
                            <span style={{
                              maxWidth: '100%', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ═════ CANVAS ═════ */}
        <div style={{
          flex: 1, background: '#06060c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, position: 'relative',
        }}>
          {viewMode === 'walk' ? (
            <WalkView
              rooms={rooms} tables={visibleTables} fixtures={fixtures}
              walkPos={walkPos} walkAngle={walkAngle}
            />
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VW} ${VH}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              style={{
                width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%',
                background: '#06060c', borderRadius: 12,
                cursor: isPlacing ? 'crosshair' : measureMode ? 'crosshair' : 'default',
                transform: viewMode === '3d' ? 'perspective(1400px) rotateX(45deg) scale(0.9)' : 'none',
                transition: 'transform .3s',
              }}
            >
              {/* Defs */}
              <defs>
                <pattern id="editorGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#151528" strokeWidth={0.6} />
                </pattern>
                <pattern id="editorGridCoarse" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#1a1a32" strokeWidth={1} />
                </pattern>
              </defs>

              {/* Background */}
              <rect x={0} y={0} width={VW} height={VH} fill="#07070d" />

              {/* Background image */}
              {bgImage && (
                <image href={bgImage} x={0} y={0} width={VW} height={VH}
                  preserveAspectRatio="xMidYMid slice"
                  opacity={bgOpacity} style={{ pointerEvents: 'none' }} />
              )}

              {/* Grid */}
              {showGrid && (
                <>
                  <rect x={0} y={0} width={VW} height={VH} fill="url(#editorGrid)" />
                  <rect x={0} y={0} width={VW} height={VH} fill="url(#editorGridCoarse)" />
                </>
              )}

              {/* Rooms */}
              {rooms.map(r => (
                <EditorRoomBg key={r.id} room={r}
                  isActive={r.id === activeRoom}
                  onClick={() => setActiveRoom(r.id)} />
              ))}

              {/* Alignment guides while dragging */}
              {dragId && dragPos && dragType === 'table' && (
                <AlignmentGuides dragId={dragId} dragX={dragPos.x} dragY={dragPos.y} tables={visibleTables} />
              )}

              {/* Fixtures */}
              {fixtures.map(f => {
                const def = FIXTURE_DEFS.find(d => d.type === f.type)
                if (!def) return null
                const pos = getFixturePos(f)
                const displayF = { ...f, x: pos.x, y: pos.y }
                return (
                  <EditorFixtureShape key={f.id}
                    fixture={displayF} def={def}
                    isSelected={f.id === selectedFixtureId}
                    isDragging={f.id === dragId}
                    onMouseDown={(e) => handleFixtureMouseDown(f.id, e)}
                    onClick={(e) => handleFixtureClick(f.id, e)} />
                )
              })}

              {/* Tables */}
              {visibleTables.map(t => {
                const pos = getTablePos(t)
                const displayT = { ...t, x: pos.x, y: pos.y }
                return (
                  <EditorTableShape key={t.id}
                    table={displayT}
                    isSelected={t.id === selectedId}
                    isDragging={t.id === dragId}
                    onMouseDown={(e) => handleTableMouseDown(t.id, e)}
                    onClick={(e) => handleTableClick(t.id, e)}
                    rotation={t.rotation || 0}
                    isoMode={viewMode === '3d'} />
                )
              })}

              {/* Ghost */}
              {placementShape && ghostPos && (
                <GhostTable shape={placementShape} seats={4} x={ghostPos.x} y={ghostPos.y} />
              )}
              {placementFixtureDef && ghostPos && (
                <GhostFixture def={placementFixtureDef} x={ghostPos.x} y={ghostPos.y} />
              )}

              {/* Measure line */}
              {measureStart && measureEnd && measureInfo && (
                <g style={{ pointerEvents: 'none' }}>
                  <line
                    x1={measureStart.x} y1={measureStart.y}
                    x2={measureEnd.x} y2={measureEnd.y}
                    stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 3"
                  />
                  <circle cx={measureStart.x} cy={measureStart.y} r={5} fill="#fbbf24" />
                  <circle cx={measureEnd.x} cy={measureEnd.y} r={5} fill="#fbbf24" />
                  <rect
                    x={(measureStart.x + measureEnd.x) / 2 - 40}
                    y={(measureStart.y + measureEnd.y) / 2 - 14}
                    width={80} height={22} rx={6}
                    fill="rgba(8,8,18,0.92)"
                    stroke="#fbbf24" strokeWidth={1}
                  />
                  <text
                    x={(measureStart.x + measureEnd.x) / 2}
                    y={(measureStart.y + measureEnd.y) / 2 + 2}
                    textAnchor="middle"
                    fontSize={12} fontWeight={800} fill="#fbbf24"
                  >
                    {measureInfo.distMeters} m
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* View mode hint */}
          {viewMode === 'walk' && (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 18px', background: 'rgba(10,10,22,0.9)',
              border: `1px solid ${borderColor}`, borderRadius: 10,
              color: textSecondary, fontSize: 12, fontWeight: 600,
            }}>
              Utilisez les flèches ↑↓←→ pour vous déplacer
            </div>
          )}
        </div>

        {/* ═════ RIGHT PANEL (Properties) ═════ */}
        <PropertiesPanel
          panelBg={panelBg} borderColor={borderColor}
          textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
          accent={accent} surfaceBg={surfaceBg} inputStyle={inputStyle} smallBtnStyle={smallBtnStyle}
          selectedTable={selectedTable}
          selectedFixture={selectedFixture}
          selectedFixtureDef={selectedFixtureDef}
          setProp={setProp} setFixtureProp={setFixtureProp}
          handleDelete={handleDelete} deleteConfirm={deleteConfirm}
          handleFixtureDelete={handleFixtureDelete} fixtureDeleteConfirm={fixtureDeleteConfirm}
          rooms={rooms}
        />
      </div>

      {/* ═════ MODALS ═════ */}
      <AnimatePresence>
        {showTemplates && (
          <TemplatesModal onClose={() => setShowTemplates(false)} onApply={applyTemplate} activeRoom={activeRoom} />
        )}
        {showCapacity && (
          <CapacityModal capacity={capacity} onClose={() => setShowCapacity(false)} />
        )}
        {showAccessibility && (
          <AccessibilityModal
            tables={visibleTables} fixtures={fixtures}
            onClose={() => setShowAccessibility(false)}
          />
        )}
        {showPrintPreview && (
          <PrintPreviewModal
            tables={visibleTables} fixtures={fixtures} rooms={rooms}
            onClose={() => setShowPrintPreview(false)}
          />
        )}
        {showImportExport && (
          <ImportExportModal
            exportText={exportText} importText={importText}
            setImportText={setImportText}
            onImport={importLayout} onDownload={downloadLayout}
            onClose={() => setShowImportExport(false)}
          />
        )}
        {showScenesPanel && (
          <ScenesModal
            scenes={scenes} onSave={saveScene} onLoad={loadScene}
            onDelete={deleteScene} onClose={() => setShowScenesPanel(false)}
          />
        )}
        {showRoomEditor && (
          <RoomEditorModal
            rooms={rooms} onUpdate={updateRoom} onRemove={removeRoom} onAdd={addRoom}
            onClose={() => setShowRoomEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROPERTIES PANEL
   ══════════════════════════════════════════════════════════════════════════════ */

function PropertiesPanel({
  panelBg, borderColor, textPrimary, textSecondary, textMuted, accent, surfaceBg,
  inputStyle, smallBtnStyle,
  selectedTable, selectedFixture, selectedFixtureDef,
  setProp, setFixtureProp,
  handleDelete, deleteConfirm,
  handleFixtureDelete, fixtureDeleteConfirm,
  rooms,
}: any) {
  return (
    <div style={{
      width: 260, minWidth: 260,
      background: panelBg, borderLeft: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
      }}>
        <div style={sectionLabel(textMuted)}>Propriétés</div>

        {!selectedTable && !selectedFixture && (
          <div style={{
            padding: 24, textAlign: 'center',
            color: textMuted, fontSize: 12, lineHeight: 1.6,
          }}>
            Sélectionnez un élément pour modifier ses propriétés.
          </div>
        )}

        {selectedTable && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={fieldLabel(textMuted)}>Nom</div>
              <input style={inputStyle} value={selectedTable.name}
                onChange={e => setProp({ name: e.target.value })} />
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Couverts</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[2, 4, 6, 8, 10].map(n => (
                  <button key={n} onClick={() => setProp({ seats: n })} style={{
                    flex: 1, padding: '6px 0', borderRadius: 6,
                    border: selectedTable.seats === n ? `1px solid ${accent}` : `1px solid ${borderColor}`,
                    background: selectedTable.seats === n ? `${accent}15` : surfaceBg,
                    color: selectedTable.seats === n ? accent : textSecondary,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Salle</div>
              <select style={inputStyle} value={selectedTable.section}
                onChange={e => setProp({ section: e.target.value })}>
                {rooms.map((r: Room) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Rotation: {selectedTable.rotation || 0}°</div>
              <input type="range" min="0" max="360" step="5"
                value={selectedTable.rotation || 0}
                onChange={e => setProp({ rotation: parseInt(e.target.value) })}
                style={{ width: '100%' }} />
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Position</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} type="number"
                  value={Math.round(selectedTable.x)}
                  onChange={e => setProp({ x: parseInt(e.target.value) || 0 })} />
                <input style={{ ...inputStyle, flex: 1 }} type="number"
                  value={Math.round(selectedTable.y)}
                  onChange={e => setProp({ y: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <button onClick={handleDelete} style={{
              padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${deleteConfirm ? '#f43f5e' : '#f43f5e40'}`,
              background: deleteConfirm ? '#f43f5e20' : '#f43f5e10',
              color: '#f87171', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
            }}>
              {deleteConfirm ? 'Confirmer suppression' : 'Supprimer table'}
            </button>
          </div>
        )}

        {selectedFixture && selectedFixtureDef && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: 10, borderRadius: 10,
              background: `${selectedFixtureDef.color}20`,
              border: `1px solid ${selectedFixtureDef.color}40`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>{selectedFixtureDef.emoji}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: textPrimary,
              }}>{selectedFixtureDef.label}</span>
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Étiquette</div>
              <input style={inputStyle}
                value={selectedFixture.label || ''}
                placeholder={selectedFixtureDef.label}
                onChange={e => setFixtureProp({ label: e.target.value })} />
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Rotation: {selectedFixture.rotation}°</div>
              <input type="range" min="0" max="360" step="5"
                value={selectedFixture.rotation}
                onChange={e => setFixtureProp({ rotation: parseInt(e.target.value) })}
                style={{ width: '100%' }} />
            </div>
            <div>
              <div style={fieldLabel(textMuted)}>Position</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inputStyle, flex: 1 }} type="number"
                  value={Math.round(selectedFixture.x)}
                  onChange={e => setFixtureProp({ x: parseInt(e.target.value) || 0 })} />
                <input style={{ ...inputStyle, flex: 1 }} type="number"
                  value={Math.round(selectedFixture.y)}
                  onChange={e => setFixtureProp({ y: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <button onClick={handleFixtureDelete} style={{
              padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${fixtureDeleteConfirm ? '#f43f5e' : '#f43f5e40'}`,
              background: fixtureDeleteConfirm ? '#f43f5e20' : '#f43f5e10',
              color: '#f87171', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
            }}>
              {fixtureDeleteConfirm ? 'Confirmer suppression' : 'Supprimer objet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   WALK VIEW (first-person mock)
   ══════════════════════════════════════════════════════════════════════════════ */

function WalkView({ rooms, tables, fixtures, walkPos, walkAngle }: {
  rooms: Room[]
  tables: Table[]
  fixtures: Fixture[]
  walkPos: { x: number; y: number }
  walkAngle: number
}) {
  // Generate a fake 3D "look ahead" view based on distance to nearest walls/tables
  const fov = Math.PI / 2.5
  const rays = 40
  const slices: { dist: number; color: string; kind: string }[] = []
  for (let i = 0; i < rays; i++) {
    const angle = walkAngle - fov / 2 + (fov * i) / rays
    let minDist = 500
    let color = '#1a1a2a'
    let kind = 'wall'
    // Check tables
    tables.forEach(t => {
      const dx = t.x - walkPos.x
      const dy = t.y - walkPos.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const a = Math.atan2(dy, dx)
      const aDiff = Math.abs(((a - angle + Math.PI) % (2 * Math.PI)) - Math.PI)
      if (aDiff < 0.1 && d < minDist) {
        minDist = d; color = '#4b5072'; kind = 'table'
      }
    })
    fixtures.forEach(f => {
      const dx = f.x - walkPos.x
      const dy = f.y - walkPos.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const a = Math.atan2(dy, dx)
      const aDiff = Math.abs(((a - angle + Math.PI) % (2 * Math.PI)) - Math.PI)
      if (aDiff < 0.12 && d < minDist) {
        minDist = d; color = '#6b5b95'; kind = 'fixture'
      }
    })
    slices.push({ dist: minDist, color, kind })
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      position: 'relative', overflow: 'hidden',
      borderRadius: 12,
      background: 'linear-gradient(to bottom, #1a1a2a 0%, #0a0a14 50%, #1a1a2a 100%)',
    }}>
      {/* Ceiling */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(to bottom, #2a2a44, #0a0a14)',
      }} />
      {/* Floor */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(to top, #3a3a5a, #0a0a14)',
      }} />

      {/* Slices */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center',
      }}>
        {slices.map((s, i) => {
          const height = Math.min(90, (400 / Math.max(1, s.dist)) * 100)
          return (
            <div key={i} style={{
              flex: 1, height: `${height}%`,
              background: s.color,
              opacity: Math.max(0.2, 1 - s.dist / 500),
              borderLeft: '1px solid rgba(0,0,0,0.2)',
            }} />
          )
        })}
      </div>

      {/* Mini-map */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        width: 180, height: 110,
        background: 'rgba(8,8,18,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: 4,
      }}>
        <svg viewBox="0 0 1100 680" width="100%" height="100%">
          {rooms.map(r => (
            <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h}
              fill={`${r.color}15`} stroke={`${r.color}60`} strokeWidth={4} />
          ))}
          {tables.map(t => (
            <circle key={t.id} cx={t.x} cy={t.y} r={16} fill="#4b5072" />
          ))}
          {/* Walker */}
          <circle cx={walkPos.x} cy={walkPos.y} r={12} fill="#818cf8" />
          <line
            x1={walkPos.x} y1={walkPos.y}
            x2={walkPos.x + Math.cos(walkAngle) * 50}
            y2={walkPos.y + Math.sin(walkAngle) * 50}
            stroke="#818cf8" strokeWidth={4}
          />
        </svg>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATES MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function TemplatesModal({ onClose, onApply, activeRoom }: {
  onClose: () => void
  onApply: (t: Template) => void
  activeRoom: string
}) {
  return (
    <ModalShell onClose={onClose} title="📐 Modèles de salle">
      <div style={{
        fontSize: 12, color: '#8892a8', marginBottom: 14,
      }}>
        Remplace les tables de la salle active ({activeRoom}) par un modèle prédéfini.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => onApply(t)} style={{
            padding: 18, borderRadius: 12,
            border: '1px solid #1e1e32',
            background: '#0e0e1a',
            color: '#e2e8f0', textAlign: 'left',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#818cf880'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e32'}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: '#8892a8', marginBottom: 10 }}>{t.description}</div>
            <div style={{
              fontSize: 10, color: '#818cf8', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {t.tables.length} tables · {t.tables.reduce((a, x) => a + x.seats, 0)} places
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   CAPACITY MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function CapacityModal({ capacity, onClose }: any) {
  return (
    <ModalShell onClose={onClose} title="📊 Capacité & conformité">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatBox label="Places totales" value={capacity.totalSeats.toString()} color="#22c55e" />
        <StatBox label="Tables" value={capacity.tableCount.toString()} color="#818cf8" />
        <StatBox label="Surface (m²)" value={capacity.totalSurface} color="#60a5fa" />
        <StatBox label="Moy. m²/pers" value={capacity.perPerson} color="#f59e0b" />
        <StatBox label="Salles" value={capacity.roomCount.toString()} color="#a78bfa" />
        <StatBox label="Objets" value={capacity.fixtureCount.toString()} color="#f472b6" />
      </div>

      <div style={{
        padding: 14, borderRadius: 10,
        background: capacity.covidOk ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${capacity.covidOk ? '#22c55e40' : '#ef444440'}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: capacity.covidOk ? '#22c55e' : '#ef4444',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          {capacity.covidOk ? '✓ Conformité distance' : '✗ Distance insuffisante'}
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
          {capacity.covidOk
            ? 'Espacement minimum respecté (>1.2 m²/pers).'
            : 'Recommandation: minimum 1.2 m² par personne (COVID / sanitaire).'}
        </div>
      </div>
    </ModalShell>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: `${color}12`,
      border: `1px solid ${color}25`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 900, color,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ACCESSIBILITY MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function AccessibilityModal({ tables, fixtures, onClose }: {
  tables: Table[]
  fixtures: Fixture[]
  onClose: () => void
}) {
  const hasEmergencyExit = fixtures.some(f => f.type === 'porte_urgence')
  const hasPmr = fixtures.some(f => f.type === 'pmr')
  const hasWc = fixtures.some(f => f.type === 'wc')

  // Table spacing check
  let tooClose = 0
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const dx = tables[i].x - tables[j].x
      const dy = tables[i].y - tables[j].y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 90) tooClose++
    }
  }

  const checks = [
    { label: 'Sortie de secours présente', ok: hasEmergencyExit, hint: 'Ajoutez un objet "Sortie de secours"' },
    { label: 'Accès PMR signalé', ok: hasPmr, hint: 'Ajoutez un marqueur PMR (♿)' },
    { label: 'Toilettes accessibles', ok: hasWc, hint: 'Ajoutez un objet WC' },
    { label: 'Espacement tables ≥ 90cm', ok: tooClose === 0, hint: `${tooClose} paires trop proches` },
  ]

  return (
    <ModalShell onClose={onClose} title="♿ Vérification accessibilité">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {checks.map((c, i) => (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 10,
            background: c.ok ? 'rgba(34,197,94,0.08)' : 'rgba(251,146,60,0.08)',
            border: `1px solid ${c.ok ? '#22c55e30' : '#fb923c30'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              fontSize: 18, color: c.ok ? '#22c55e' : '#fb923c',
              fontWeight: 900,
            }}>
              {c.ok ? '✓' : '⚠'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{c.label}</div>
              {!c.ok && (
                <div style={{ fontSize: 11, color: '#8892a8', marginTop: 2 }}>
                  {c.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 16, padding: 12,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8, fontSize: 11, color: '#8892a8', lineHeight: 1.5,
      }}>
        <strong style={{ color: '#cbd5e1' }}>Rappel:</strong> le plan doit permettre le passage
        d'un fauteuil roulant (min. 140 cm) jusqu'à chaque table, WC, et sortie de secours.
      </div>
    </ModalShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRINT PREVIEW MODAL (A4 preview)
   ══════════════════════════════════════════════════════════════════════════════ */

function PrintPreviewModal({ tables, fixtures, rooms, onClose }: {
  tables: Table[]
  fixtures: Fixture[]
  rooms: Room[]
  onClose: () => void
}) {
  return (
    <ModalShell onClose={onClose} title="🖨️ Aperçu impression A4" wide>
      <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 12 }}>
        Plan de salle — conformité sécurité incendie
      </div>
      <div style={{
        width: '100%', aspectRatio: '297 / 210',
        background: '#f8fafc', borderRadius: 6,
        padding: 20, boxSizing: 'border-box',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 6,
          borderBottom: '2px solid #0f172a', paddingBottom: 4,
        }}>
          Café um Rond-Point — Plan d'évacuation
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>
          {new Date().toLocaleDateString('fr-LU')} · {tables.length} tables · {fixtures.length} éléments
        </div>
        <svg viewBox="0 0 1100 680" style={{ width: '100%', height: 'calc(100% - 60px)' }}>
          {rooms.map(r => (
            <g key={r.id}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10}
                fill="none" stroke="#0f172a" strokeWidth={2} strokeDasharray="6 3" />
              <text x={r.x + 10} y={r.y + 18} fontSize={11} fontWeight={800} fill="#0f172a">
                {r.label.toUpperCase()}
              </text>
            </g>
          ))}
          {tables.map(t => {
            const g = tableGeometry(t)
            return g.type === 'circle' ? (
              <g key={t.id}>
                <circle cx={t.x} cy={t.y} r={g.r} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.5} />
                <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0f172a">
                  {t.name}
                </text>
              </g>
            ) : (
              <g key={t.id}>
                <rect x={t.x - g.w / 2} y={t.y - g.h / 2} width={g.w} height={g.h}
                  rx={6} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.5} />
                <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0f172a">
                  {t.name}
                </text>
              </g>
            )
          })}
          {fixtures.map(f => {
            const def = FIXTURE_DEFS.find(d => d.type === f.type)
            if (!def) return null
            const isExit = f.type === 'porte_urgence'
            return (
              <g key={f.id}>
                {def.shape === 'circle' ? (
                  <circle cx={f.x} cy={f.y} r={def.width / 2}
                    fill={isExit ? '#22c55e' : '#cbd5e1'} stroke="#0f172a" strokeWidth={1} />
                ) : (
                  <rect x={f.x - def.width / 2} y={f.y - def.height / 2}
                    width={def.width} height={def.height}
                    fill={isExit ? '#22c55e' : '#cbd5e1'} stroke="#0f172a" strokeWidth={1} />
                )}
                <text x={f.x} y={f.y + 3} textAnchor="middle" fontSize={9} fill="#0f172a">
                  {def.emoji}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={() => window.print()} style={{
          padding: '10px 18px', borderRadius: 10,
          border: '1px solid #818cf880',
          background: '#818cf820', color: '#a5b4fc',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Imprimer
        </button>
      </div>
    </ModalShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   IMPORT/EXPORT MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function ImportExportModal({ exportText, importText, setImportText, onImport, onDownload, onClose }: any) {
  const [tab, setTab] = useState<'export' | 'import'>(exportText ? 'export' : 'import')
  return (
    <ModalShell onClose={onClose} title="📤 Import / Export JSON" wide>
      <div style={{
        display: 'inline-flex', gap: 2, marginBottom: 14,
        background: '#0e0e1a', border: '1px solid #1e1e32',
        borderRadius: 10, padding: 3,
      }}>
        {(['export', 'import'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none',
            background: tab === t ? 'rgba(129,140,248,0.2)' : 'transparent',
            color: tab === t ? '#a5b4fc' : '#8892a8',
            fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t === 'export' ? 'Exporter' : 'Importer'}
          </button>
        ))}
      </div>

      {tab === 'export' ? (
        <>
          <textarea readOnly value={exportText}
            style={{
              width: '100%', height: 300,
              padding: 12, borderRadius: 8,
              background: '#07070d', color: '#cbd5e1',
              border: '1px solid #1e1e32', fontFamily: 'monospace',
              fontSize: 11, resize: 'none', boxSizing: 'border-box',
            }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={() => navigator.clipboard?.writeText(exportText)} style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #1e1e32', background: '#0e0e1a',
              color: '#cbd5e1', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Copier
            </button>
            <button onClick={onDownload} style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #818cf880', background: '#818cf820',
              color: '#a5b4fc', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Télécharger .json
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea value={importText}
            placeholder="Coller le JSON à importer..."
            onChange={e => setImportText(e.target.value)}
            style={{
              width: '100%', height: 300,
              padding: 12, borderRadius: 8,
              background: '#07070d', color: '#cbd5e1',
              border: '1px solid #1e1e32', fontFamily: 'monospace',
              fontSize: 11, resize: 'none', boxSizing: 'border-box',
            }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button onClick={onImport} disabled={!importText} style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #22c55e80', background: '#22c55e20',
              color: '#4ade80', fontSize: 12, fontWeight: 700,
              cursor: importText ? 'pointer' : 'not-allowed',
              opacity: importText ? 1 : 0.4,
              fontFamily: 'inherit',
            }}>
              Importer le plan
            </button>
          </div>
        </>
      )}
    </ModalShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SCENES MODAL (presets)
   ══════════════════════════════════════════════════════════════════════════════ */

function ScenesModal({ scenes, onSave, onLoad, onDelete, onClose }: any) {
  const [newLabel, setNewLabel] = useState('')
  return (
    <ModalShell onClose={onClose} title="🎬 Scènes / Layouts">
      <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 14 }}>
        Sauvegardez un layout complet et rechargez-le en un clic (Layout soir, midi, événement…)
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <input value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Nom de la scène (ex: Layout soir)"
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1px solid #1e1e32', background: '#0e0e1a',
            color: '#e2e8f0', fontSize: 13, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }} />
        <button onClick={() => {
          if (newLabel.trim()) { onSave(newLabel.trim()); setNewLabel('') }
        }} style={{
          padding: '10px 18px', borderRadius: 10,
          border: '1px solid #818cf880', background: '#818cf820',
          color: '#a5b4fc', fontSize: 12, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Enregistrer
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
        {scenes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 30,
            color: '#505570', fontSize: 12,
          }}>
            Aucune scène enregistrée
          </div>
        ) : scenes.map((s: Scene) => (
          <div key={s.id} style={{
            padding: 12, borderRadius: 10,
            background: '#0e0e1a', border: '1px solid #1e1e32',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 10, color: '#8892a8', marginTop: 2 }}>
                {s.tables.length} tables · {s.fixtures.length} objets · {new Date(s.createdAt).toLocaleDateString('fr-LU')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onLoad(s)} style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid #22c55e60', background: '#22c55e15',
                color: '#4ade80', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Charger</button>
              <button onClick={() => onDelete(s.id)} style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1px solid #f4445660', background: '#f4445615',
                color: '#f87171', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOM EDITOR MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function RoomEditorModal({ rooms, onUpdate, onRemove, onAdd, onClose }: any) {
  return (
    <ModalShell onClose={onClose} title="🏠 Gestion des salles">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {rooms.map((r: Room) => (
          <div key={r.id} style={{
            padding: 12, borderRadius: 10,
            background: `${r.color}10`,
            border: `1px solid ${r.color}30`,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: r.color,
              }} />
              <input value={r.label}
                onChange={e => onUpdate(r.id, { label: e.target.value })}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid #1e1e32', background: '#0a0a14',
                  color: '#e2e8f0', fontSize: 12, fontWeight: 700,
                  outline: 'none', fontFamily: 'inherit',
                }} />
              {rooms.length > 1 && (
                <button onClick={() => onRemove(r.id)} style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid #f4445640', background: '#f4445615',
                  color: '#f87171', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>×</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              <SmallNumberField label="X" value={r.x} onChange={v => onUpdate(r.id, { x: v })} />
              <SmallNumberField label="Y" value={r.y} onChange={v => onUpdate(r.id, { y: v })} />
              <SmallNumberField label="L" value={r.w} onChange={v => onUpdate(r.id, { w: v })} />
              <SmallNumberField label="H" value={r.h} onChange={v => onUpdate(r.id, { h: v })} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={onAdd} style={{
        width: '100%', padding: '10px', borderRadius: 10,
        border: '1.5px dashed rgba(129,140,248,0.4)',
        background: 'rgba(129,140,248,0.05)',
        color: '#a5b4fc', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        + Ajouter une salle
      </button>
    </ModalShell>
  )
}

function SmallNumberField({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: '#505570',
        fontWeight: 700, letterSpacing: '0.08em',
        marginBottom: 2,
      }}>{label}</div>
      <input type="number" value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{
          width: '100%', padding: '4px 6px', borderRadius: 5,
          border: '1px solid #1e1e32', background: '#0a0a14',
          color: '#cbd5e1', fontSize: 11, outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL SHELL
   ══════════════════════════════════════════════════════════════════════════════ */

function ModalShell({ children, onClose, title, wide }: {
  children: React.ReactNode
  onClose: () => void
  title: string
  wide?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: wide ? 720 : 500, maxWidth: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          background: '#0c0c1a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18,
        }}>
          <span style={{
            fontSize: 18, fontWeight: 900, color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#94a3b8', fontSize: 16, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>×</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SMALL HELPERS
   ══════════════════════════════════════════════════════════════════════════════ */

function sectionLabel(textMuted: string): React.CSSProperties {
  return {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: textMuted, marginBottom: 8,
  }
}
function fieldLabel(textMuted: string): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: textMuted, marginBottom: 4,
  }
}
function miniAlignBtn(): React.CSSProperties {
  return {
    padding: '8px 0', borderRadius: 6,
    border: '1px solid #1e1e32', background: '#0e0e1a',
    color: '#8892a8', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    textAlign: 'center',
  }
}
