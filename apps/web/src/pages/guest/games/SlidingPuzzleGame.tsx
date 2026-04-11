import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Trophy, RotateCcw, Timer } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────
type Size = 3 | 4 | 5
interface BestScore { moves: number; time: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildGoal(n: Size): number[] {
  return [...Array(n * n - 1).keys()].map(i => i + 1).concat([0])
}

function isSolvable(tiles: number[], n: Size): boolean {
  const arr = tiles.filter(v => v !== 0)
  let inv = 0
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] > arr[j]) inv++
  if (n % 2 === 1) return inv % 2 === 0
  const blankRow = Math.floor(tiles.indexOf(0) / n)
  const blankFromBottom = n - blankRow
  return (blankFromBottom % 2 === 1) ? inv % 2 === 0 : inv % 2 === 1
}

function createShuffled(n: Size): number[] {
  const goal = buildGoal(n)
  let tiles = [...goal]
  // Fisher-Yates, then fix parity
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }
  // If not solvable, swap first two non-zero tiles
  if (!isSolvable(tiles, n)) {
    const a = tiles.findIndex(v => v !== 0)
    const b = tiles.findIndex((v, i) => v !== 0 && i > a)
    ;[tiles[a], tiles[b]] = [tiles[b], tiles[a]]
  }
  // Ensure puzzle isn't already solved
  if (tiles.every((v, i) => v === goal[i])) return createShuffled(n)
  return tiles
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function loadBest(n: Size): BestScore | null {
  try {
    const raw = localStorage.getItem(`sliding_best_${n}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveBest(n: Size, score: BestScore) {
  try { localStorage.setItem(`sliding_best_${n}`, JSON.stringify(score)) } catch { /* noop */ }
}

// ─── SVG Die for confetti-like particle ───────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null
  const pieces = Array.from({ length: 20 }, (_, i) => i)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(i => {
        const colors = [ACCENT, ACCENT2, '#22c55e', '#f59e0b', '#ef4444', '#ec4899']
        const color = colors[i % colors.length]
        const left = `${(i * 5.2) % 100}%`
        const delay = `${(i * 0.07).toFixed(2)}s`
        const size = 6 + (i % 5) * 2
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '-10px',
              left,
              width: size,
              height: size,
              background: color,
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              animation: `confettiFall 1.8s ${delay} ease-in forwards`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(350px) rotate(720deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Tile component ───────────────────────────────────────────────────────────
interface TileProps {
  value: number
  index: number
  n: Size
  isCorrect: boolean
  onClick: () => void
  tileSize: number
}

function Tile({ value, index, n, isCorrect, onClick, tileSize }: TileProps) {
  const goal = buildGoal(n)
  const goalPos = goal.indexOf(value)
  const goalRow = Math.floor(goalPos / n)
  const goalCol = goalPos % n
  const curRow = Math.floor(index / n)
  const curCol = index % n
  const dx = (goalCol - curCol) * (tileSize + 6)
  const dy = (goalRow - curRow) * (tileSize + 6)
  void dx; void dy

  if (value === 0) {
    return (
      <div
        style={{
          width: tileSize,
          height: tileSize,
          borderRadius: 10,
          background: 'transparent',
          border: `2px dashed ${BORDER}`,
        }}
      />
    )
  }

  const fontSize = n === 3 ? 22 : n === 4 ? 18 : 14

  return (
    <button
      onClick={onClick}
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 10,
        background: isCorrect ? `rgba(34,197,94,0.15)` : SURFACE2,
        border: `2px solid ${isCorrect ? '#22c55e' : BORDER}`,
        color: isCorrect ? '#22c55e' : TEXT,
        fontSize,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: `0 2px 8px rgba(0,0,0,0.35)`,
        userSelect: 'none',
      }}
    >
      {value}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SlidingPuzzleGame({ onBack }: { onBack?: () => void }) {
  const [size, setSize] = useState<Size>(4)
  const [tiles, setTiles] = useState<number[]>(() => createShuffled(4))
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [won, setWon] = useState(false)
  const [best, setBest] = useState<BestScore | null>(() => loadBest(4))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goal = buildGoal(size)

  // Timer
  useEffect(() => {
    if (running && !won) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, won])

  const startNewGame = useCallback((n: Size) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSize(n)
    setTiles(createShuffled(n))
    setMoves(0)
    setElapsed(0)
    setRunning(false)
    setWon(false)
    setBest(loadBest(n))
  }, [])

  const moveTile = useCallback((idx: number) => {
    if (won) return
    setTiles(prev => {
      const blank = prev.indexOf(0)
      const r1 = Math.floor(idx / size), c1 = idx % size
      const r2 = Math.floor(blank / size), c2 = blank % size
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return prev
      const next = [...prev]
      ;[next[idx], next[blank]] = [next[blank], next[idx]]
      return next
    })
    setMoves(m => {
      const nm = m + 1
      if (!running) setRunning(true)
      return nm
    })
  }, [won, running, size])

  // Check win after tiles change
  useEffect(() => {
    if (moves === 0) return
    if (tiles.every((v, i) => v === goal[i])) {
      setWon(true)
      setRunning(false)
      if (timerRef.current) clearInterval(timerRef.current)
      const score: BestScore = { moves, time: elapsed }
      const prev = loadBest(size)
      if (!prev || moves < prev.moves || (moves === prev.moves && elapsed < prev.time)) {
        saveBest(size, score)
        setBest(score)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles])

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (won) return
      setTiles(prev => {
        const blank = prev.indexOf(0)
        const r = Math.floor(blank / size)
        const c = blank % size
        let target = -1
        if (e.key === 'ArrowUp'    && r < size - 1) target = blank + size
        if (e.key === 'ArrowDown'  && r > 0)        target = blank - size
        if (e.key === 'ArrowLeft'  && c < size - 1) target = blank + 1
        if (e.key === 'ArrowRight' && c > 0)        target = blank - 1
        if (target === -1) return prev
        e.preventDefault()
        const next = [...prev]
        ;[next[blank], next[target]] = [next[target], next[blank]]
        setMoves(m => m + 1)
        if (!running) setRunning(true)
        return next
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [size, won, running])

  // Touch swipe support
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
    setTiles(prev => {
      const blank = prev.indexOf(0)
      const r = Math.floor(blank / size), c = blank % size
      let target = -1
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && c > 0)        target = blank - 1
        if (dx < 0 && c < size - 1) target = blank + 1
      } else {
        if (dy > 0 && r > 0)        target = blank - size
        if (dy < 0 && r < size - 1) target = blank + size
      }
      if (target === -1) return prev
      const next = [...prev]
      ;[next[blank], next[target]] = [next[target], next[blank]]
      setMoves(m => m + 1)
      if (!running) setRunning(true)
      return next
    })
  }

  const tileSize = size === 3 ? 80 : size === 4 ? 68 : 56
  const gap = 6
  const boardSize = size * tileSize + (size - 1) * gap + 24

  const SIZES: { n: Size; label: string; sub: string }[] = [
    { n: 3, label: 'Facile', sub: '3×3' },
    { n: 4, label: 'Moyen', sub: '4×4' },
    { n: 5, label: 'Difficile', sub: '5×5' },
  ]

  const progress = tiles.filter((v, i) => v !== 0 && v === goal[i]).length / (size * size - 1)

  return (
    <div className="space-y-4" style={{ color: TEXT }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 900, fontSize: 16, color: TEXT }}>🧩 Taquin</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: MUTED }}>
            <Timer size={12} style={{ display: 'inline', marginRight: 3 }} />
            <span style={{ color: TEXT }}>{formatTime(elapsed)}</span>
          </span>
          <span style={{ color: MUTED }}>
            Coups : <span style={{ color: TEXT }}>{moves}</span>
          </span>
        </div>
      </div>

      {/* Difficulty selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {SIZES.map(({ n, label, sub }) => (
          <button
            key={n}
            onClick={() => startNewGame(n)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 10,
              border: `2px solid ${size === n ? ACCENT : BORDER}`,
              background: size === n ? `rgba(168,85,247,0.15)` : SURFACE,
              color: size === n ? ACCENT : MUTED,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <div>{label}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Best score */}
      {best && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 10,
            background: `rgba(245,158,11,0.1)`,
            border: `1px solid rgba(245,158,11,0.3)`,
            fontSize: 11,
            color: '#f59e0b',
          }}
        >
          <Trophy size={13} />
          Record {size}×{size} : {best.moves} coups · {formatTime(best.time)}
        </div>
      )}

      {/* Win banner */}
      {won && (
        <div
          style={{
            position: 'relative',
            borderRadius: 14,
            padding: '12px 16px',
            textAlign: 'center',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#22c55e',
            fontWeight: 800,
            fontSize: 15,
            overflow: 'hidden',
          }}
        >
          <Confetti active={won} />
          Résolu en {moves} coups · {formatTime(elapsed)} !
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, marginBottom: 4 }}>
          <span>Progression</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 9999, background: SURFACE2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 9999,
              background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
              width: `${progress * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          margin: '0 auto',
          width: boardSize,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 12,
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
        }}
      >
        {tiles.map((v, i) => (
          <Tile
            key={`${size}-${i}`}
            value={v}
            index={i}
            n={size}
            isCorrect={v !== 0 && v === goal[i]}
            onClick={() => moveTile(i)}
            tileSize={tileSize}
          />
        ))}
      </div>

      {/* Hint & controls */}
      <p style={{ textAlign: 'center', fontSize: 10, color: MUTED }}>
        Cliquez ou utilisez les flèches directionnelles · Glissez sur mobile
      </p>
      <button
        onClick={() => startNewGame(size)}
        style={{
          width: '100%',
          padding: '11px 0',
          borderRadius: 12,
          border: 'none',
          background: won ? '#22c55e' : ACCENT,
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <RotateCcw size={15} />
        {won ? 'Rejouer' : 'Mélanger'}
      </button>
    </div>
  )
}
