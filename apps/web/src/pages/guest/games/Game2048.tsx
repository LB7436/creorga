import { useState, useEffect, useCallback, useRef } from 'react'
import type { TouchEvent } from 'react'
import { ChevronLeft, ChevronUp, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tile = {
  id: number
  value: number
  row: number
  col: number
  merged: boolean
  isNew: boolean
}

type ScorePopup = {
  id: number
  value: number
  row: number
  col: number
}

type GameState = {
  tiles: Tile[]
  score: number
}

type GridSize = 4 | 5

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 68
const GAP = 8

let tileIdCounter = 1

// ─── Tile colors (dark theme) ─────────────────────────────────────────────────

function getTileStyle(value: number): {
  background: string
  color: string
  boxShadow?: string
  fontSize: number
} {
  const fontSize = value >= 1024 ? 14 : value >= 128 ? 17 : value >= 16 ? 20 : 22

  if (value === 2048)
    return {
      background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      color: '#fff',
      boxShadow: '0 0 20px rgba(245,158,11,0.6), 0 0 40px rgba(239,68,68,0.4)',
      fontSize,
    }

  if (value >= 4096) return { background: '#1e1b4b', color: '#a5b4fc', fontSize }

  const map: Record<number, { background: string; color: string }> = {
    2:    { background: '#374151', color: '#e5e7eb' },
    4:    { background: '#4b5563', color: '#e5e7eb' },
    8:    { background: '#ea580c', color: '#fff' },
    16:   { background: '#dc2626', color: '#fff' },
    32:   { background: '#9333ea', color: '#fff' },
    64:   { background: '#2563eb', color: '#fff' },
    128:  { background: '#d97706', color: '#fff' },
    256:  { background: '#f59e0b', color: '#fff' },
    512:  { background: '#10b981', color: '#fff' },
    1024: { background: '#06b6d4', color: '#fff' },
  }
  return { ...(map[value] ?? { background: '#374151', color: '#e5e7eb' }), fontSize }
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

function randomEmpty(tiles: Tile[], size: GridSize): [number, number] | null {
  const occupied = new Set(tiles.map(t => `${t.row},${t.col}`))
  const empty: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!occupied.has(`${r},${c}`)) empty.push([r, c])
  if (!empty.length) return null
  return empty[Math.floor(Math.random() * empty.length)]
}

function addRandomTile(tiles: Tile[], size: GridSize): Tile[] {
  const pos = randomEmpty(tiles, size)
  if (!pos) return tiles
  return [
    ...tiles,
    {
      id: tileIdCounter++,
      value: Math.random() < 0.9 ? 2 : 4,
      row: pos[0],
      col: pos[1],
      merged: false,
      isNew: true,
    },
  ]
}

function initTiles(size: GridSize): Tile[] {
  const a = addRandomTile([], size)
  return addRandomTile(a, size)
}

// Slide a 1-D array of tiles toward index 0. Returns moved tiles + score + merge positions.
type MergeInfo = { index: number; value: number }

function slideLine(
  line: Tile[],
  toTile: (t: Tile, index: number) => Tile,
): { tiles: Tile[]; scoreGained: number; merges: MergeInfo[] } {
  const present = line.filter(Boolean)
  const result: Tile[] = []
  const merges: MergeInfo[] = []
  let scoreGained = 0
  let i = 0
  let pos = 0

  while (i < present.length) {
    if (i + 1 < present.length && present[i].value === present[i + 1].value) {
      const newVal = present[i].value * 2
      scoreGained += newVal
      merges.push({ index: pos, value: newVal })
      result.push(toTile({ ...present[i], value: newVal, merged: true, isNew: false }, pos))
      i += 2
    } else {
      result.push(toTile({ ...present[i], merged: false, isNew: false }, pos))
      i++
    }
    pos++
  }
  return { tiles: result, scoreGained, merges }
}

type MoveResult = {
  tiles: Tile[]
  scoreGained: number
  mergePositions: Array<{ row: number; col: number; value: number }>
}

function moveBoard(tiles: Tile[], dir: 'up' | 'down' | 'left' | 'right', size: GridSize): MoveResult {
  const allMergePositions: Array<{ row: number; col: number; value: number }> = []
  let totalScore = 0
  const resultTiles: Tile[] = []

  if (dir === 'left' || dir === 'right') {
    for (let r = 0; r < size; r++) {
      const rowTiles = tiles
        .filter(t => t.row === r)
        .sort((a, b) => (dir === 'left' ? a.col - b.col : b.col - a.col))

      const { tiles: slid, scoreGained, merges } = slideLine(
        rowTiles,
        (t, i) => ({ ...t, row: r, col: dir === 'left' ? i : size - 1 - i }),
      )
      totalScore += scoreGained
      merges.forEach(m => {
        allMergePositions.push({ row: r, col: dir === 'left' ? m.index : size - 1 - m.index, value: m.value })
      })
      resultTiles.push(...slid)
    }
  } else {
    for (let c = 0; c < size; c++) {
      const colTiles = tiles
        .filter(t => t.col === c)
        .sort((a, b) => (dir === 'up' ? a.row - b.row : b.row - a.row))

      const { tiles: slid, scoreGained, merges } = slideLine(
        colTiles,
        (t, i) => ({ ...t, row: dir === 'up' ? i : size - 1 - i, col: c }),
      )
      totalScore += scoreGained
      merges.forEach(m => {
        allMergePositions.push({ row: dir === 'up' ? m.index : size - 1 - m.index, col: c, value: m.value })
      })
      resultTiles.push(...slid)
    }
  }

  return { tiles: resultTiles, scoreGained: totalScore, mergePositions: allMergePositions }
}

function tilesChanged(prev: Tile[], next: Tile[]): boolean {
  if (prev.length !== next.length) return true
  const prevMap = new Map(prev.map(t => [t.id, t]))
  for (const t of next) {
    const p = prevMap.get(t.id)
    if (!p || p.row !== t.row || p.col !== t.col || p.value !== t.value) return true
  }
  return false
}

function isGameOver(tiles: Tile[], size: GridSize): boolean {
  if (tiles.length < size * size) return false
  const grid: Record<string, number> = {}
  for (const t of tiles) grid[`${t.row},${t.col}`] = t.value
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[`${r},${c}`]
      if (!v) return false
      if (c + 1 < size && grid[`${r},${c + 1}`] === v) return false
      if (r + 1 < size && grid[`${r + 1},${c}`] === v) return false
    }
  }
  return true
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Game2048({ onBack }: { onBack?: () => void }) {
  const [gridSize, setGridSize] = useState<GridSize>(4)
  const [tiles, setTiles] = useState<Tile[]>(() => initTiles(4))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('2048_best') ?? '0') || 0 } catch { return 0 }
  })
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [continueAfterWin, setContinueAfterWin] = useState(false)
  const [popups, setPopups] = useState<ScorePopup[]>([])
  const [prevState, setPrevState] = useState<GameState | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [animating, setAnimating] = useState(false)

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const popupCounter = useRef(0)
  const scoreRef = useRef(score)
  scoreRef.current = score

  // Persist best
  useEffect(() => {
    try { localStorage.setItem('2048_best', String(best)) } catch { /* ignore */ }
  }, [best])

  const addPopup = useCallback(
    (mergePositions: Array<{ row: number; col: number; value: number }>) => {
      if (!mergePositions.length) return
      const newPopups: ScorePopup[] = mergePositions.map(mp => ({
        id: popupCounter.current++,
        value: mp.value,
        row: mp.row,
        col: mp.col,
      }))
      setPopups(prev => [...prev, ...newPopups])
      const ids = new Set(newPopups.map(p => p.id))
      setTimeout(() => setPopups(prev => prev.filter(p => !ids.has(p.id))), 700)
    },
    [],
  )

  const applyMove = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (over || animating) return

      setTiles(currentTiles => {
        const cleared = currentTiles.map(t => ({ ...t, isNew: false, merged: false }))
        const result = moveBoard(cleared, dir, gridSize)

        if (!tilesChanged(cleared, result.tiles)) return currentTiles

        // Save for undo — capture current score synchronously via ref
        const currentScore = scoreRef.current
        setPrevState({ tiles: currentTiles, score: currentScore })
        setCanUndo(true)

        if (result.scoreGained > 0) {
          setScore(s => {
            const ns = s + result.scoreGained
            setBest(b => Math.max(b, ns))
            return ns
          })
        }

        addPopup(result.mergePositions)

        const withNew = addRandomTile(result.tiles, gridSize)

        if (!continueAfterWin && withNew.some(t => t.value === 2048)) setWon(true)
        if (isGameOver(withNew, gridSize)) setOver(true)

        setAnimating(true)
        setTimeout(() => setAnimating(false), 130)

        return withNew
      })
    },
    [over, animating, gridSize, continueAfterWin, addPopup],
  )

  const handleUndo = useCallback(() => {
    if (!canUndo || !prevState) return
    setTiles(prevState.tiles)
    setScore(prevState.score)
    setOver(false)
    setCanUndo(false)
    setPrevState(null)
  }, [canUndo, prevState])

  const reset = useCallback(
    (size: GridSize = gridSize) => {
      setTiles(initTiles(size))
      setScore(0)
      setOver(false)
      setWon(false)
      setContinueAfterWin(false)
      setCanUndo(false)
      setPrevState(null)
      setPopups([])
    },
    [gridSize],
  )

  const toggleGridSize = useCallback(() => {
    const newSize: GridSize = gridSize === 4 ? 5 : 4
    setGridSize(newSize)
    reset(newSize)
  }, [gridSize, reset])

  // Keyboard
  useEffect(() => {
    const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    }
    const handler = (e: KeyboardEvent) => {
      const d = dirMap[e.key]
      if (d) { e.preventDefault(); applyMove(d) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [applyMove])

  // Touch swipe
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? 'right' : 'left')
    else applyMove(dy > 0 ? 'down' : 'up')
  }

  const boardPx = gridSize * CELL_SIZE + (gridSize - 1) * GAP

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* CSS Animations */}
      <style>{`
        @keyframes tileAppear {
          0%   { transform: scale(0);    opacity: 0; }
          80%  { transform: scale(1.1);  opacity: 1; }
          100% { transform: scale(1.0);  opacity: 1; }
        }
        @keyframes tileMerge {
          0%   { transform: scale(1);    filter: brightness(1); }
          40%  { transform: scale(1.15); filter: brightness(1.35); }
          100% { transform: scale(1.0);  filter: brightness(1); }
        }
        @keyframes popupFloat {
          0%   { transform: translate(-50%, -50%);              opacity: 1; }
          100% { transform: translate(-50%, calc(-50% - 30px)); opacity: 0; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: MUTED }}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="font-black text-base tracking-tight" style={{ color: TEXT }}>
            2048
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg font-semibold" style={{ background: SURFACE2, color: MUTED }}>
            Score <span style={{ color: TEXT }}>{score}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg font-semibold" style={{ background: SURFACE2, color: MUTED }}>
            Meilleur <span style={{ color: ACCENT }}>{best}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
            style={{
              background: SURFACE2,
              color: canUndo ? TEXT : MUTED,
              border: `1px solid ${BORDER}`,
              opacity: canUndo ? 1 : 0.4,
              cursor: canUndo ? 'pointer' : 'default',
            }}
          >
            <RotateCcw size={12} />
            Annuler
          </button>
          <button
            onClick={toggleGridSize}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}` }}
          >
            {gridSize}×{gridSize}
          </button>
        </div>
        <button
          onClick={() => reset()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
          style={{ background: ACCENT, color: '#fff' }}
        >
          Nouveau
        </button>
      </div>

      {/* Win banner */}
      {won && !continueAfterWin && (
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}
        >
          <p className="font-black text-sm" style={{ color: '#f59e0b' }}>
            Vous avez atteint 2048 !
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <button
              onClick={() => { setWon(false); setContinueAfterWin(true) }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#f59e0b', color: '#fff' }}
            >
              Continuer
            </button>
            <button
              onClick={() => reset()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              Nouveau jeu
            </button>
          </div>
        </div>
      )}

      {/* Game over banner */}
      {over && (
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <p className="font-black text-sm" style={{ color: '#ef4444' }}>
            Partie terminée !
          </p>
          <button
            onClick={() => reset()}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            Recommencer
          </button>
        </div>
      )}

      {/* Board */}
      <div
        className="rounded-2xl mx-auto"
        style={{ padding: GAP, background: '#1f2937' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div style={{ position: 'relative', width: boardPx, height: boardPx }}>
          {/* Background cells */}
          {Array.from({ length: gridSize * gridSize }, (_, i) => {
            const r = Math.floor(i / gridSize)
            const c = i % gridSize
            return (
              <div
                key={`cell-${i}`}
                style={{
                  position: 'absolute',
                  left: c * (CELL_SIZE + GAP),
                  top: r * (CELL_SIZE + GAP),
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
            )
          })}

          {/* Tiles */}
          {tiles.map(tile => {
            const s = getTileStyle(tile.value)
            const left = tile.col * (CELL_SIZE + GAP)
            const top = tile.row * (CELL_SIZE + GAP)
            return (
              <div
                key={tile.id}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: s.fontSize,
                  background: s.background,
                  color: s.color,
                  boxShadow: s.boxShadow,
                  transition: 'left 120ms ease-in-out, top 120ms ease-in-out',
                  animation: tile.isNew
                    ? 'tileAppear 150ms ease-out forwards'
                    : tile.merged
                    ? 'tileMerge 150ms ease-out forwards'
                    : undefined,
                  zIndex: tile.merged ? 10 : 1,
                  willChange: 'left, top',
                }}
              >
                {tile.value}
              </div>
            )
          })}

          {/* Score popups */}
          {popups.map(popup => (
            <div
              key={popup.id}
              style={{
                position: 'absolute',
                left: popup.col * (CELL_SIZE + GAP) + CELL_SIZE / 2,
                top: popup.row * (CELL_SIZE + GAP) + CELL_SIZE / 2,
                transform: 'translate(-50%, -50%)',
                fontSize: 13,
                fontWeight: 900,
                color: '#fbbf24',
                pointerEvents: 'none',
                zIndex: 20,
                animation: 'popupFloat 600ms ease-out forwards',
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
              }}
            >
              +{popup.value}
            </div>
          ))}
        </div>
      </div>

      {/* D-pad */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => applyMove('up')}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <ChevronUp size={20} />
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => applyMove('left')}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => applyMove('down')}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <ChevronDown size={20} />
          </button>
          <button
            onClick={() => applyMove('right')}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
