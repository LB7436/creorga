import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'beginner' | 'intermediate' | 'expert'
type GameState = 'idle' | 'playing' | 'won' | 'lost'
type FlagState = 'none' | 'flag' | 'question'

interface Cell {
  mine: boolean
  revealed: boolean
  flag: FlagState
  adj: number
  exploded: boolean
  wrongFlag: boolean
}

type Grid = Cell[][]

interface Config {
  rows: number
  cols: number
  mines: number
  label: string
}

interface BestTimes {
  beginner?: number
  intermediate?: number
  expert?: number
}

interface Stats {
  played: number
  wins: number
  bestTimes: BestTimes
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIGS: Record<Difficulty, Config> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, label: 'Débutant' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermédiaire' },
  expert:       { rows: 16, cols: 30, mines: 99, label: 'Expert' },
}

const NUM_COLORS: Record<number, string> = {
  1: '#3b82f6', 2: '#22c55e', 3: '#ef4444',
  4: '#8b5cf6', 5: '#f97316', 6: '#06b6d4',
  7: '#a855f7', 8: '#94a3b8',
}

const NEIGHBORS = [-1,-1,-1,0,-1,1,0,-1,0,1,1,-1,1,0,1,1]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNeighbors(rows: number, cols: number, r: number, c: number): [number, number][] {
  const result: [number, number][] = []
  for (let i = 0; i < NEIGHBORS.length; i += 2) {
    const nr = r + NEIGHBORS[i], nc = c + NEIGHBORS[i+1]
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc])
  }
  return result
}

function makeEmptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false, revealed: false, flag: 'none' as FlagState,
      adj: 0, exploded: false, wrongFlag: false,
    }))
  )
}

function placeMines(grid: Grid, rows: number, cols: number, mines: number, safeR: number, safeC: number): Grid {
  const next = grid.map(row => row.map(c => ({ ...c })))
  const mineSet = new Set<string>()
  while (mineSet.size < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue
    mineSet.add(`${r},${c}`)
  }
  mineSet.forEach(key => {
    const [r, c] = key.split(',').map(Number)
    next[r][c].mine = true
  })
  // Calculate adjacency
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].mine) continue
      next[r][c].adj = getNeighbors(rows, cols, r, c).filter(([nr, nc]) => next[nr][nc].mine).length
    }
  }
  return next
}

function floodReveal(grid: Grid, rows: number, cols: number, r: number, c: number): Grid {
  const next = grid.map(row => row.map(cell => ({ ...cell })))
  const queue: [number, number][] = [[r, c]]
  const visited = new Set<string>()
  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!
    const key = `${cr},${cc}`
    if (visited.has(key)) continue
    visited.add(key)
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue
    const cell = next[cr][cc]
    if (cell.revealed || cell.flag !== 'none') continue
    cell.revealed = true
    if (cell.adj === 0 && !cell.mine) {
      getNeighbors(rows, cols, cr, cc).forEach(n => queue.push(n))
    }
  }
  return next
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem('minesweeper_stats')
    if (raw) return JSON.parse(raw) as Stats
  } catch { /* ignore */ }
  return { played: 0, wins: 0, bestTimes: {} }
}

function saveStats(stats: Stats) {
  try { localStorage.setItem('minesweeper_stats', JSON.stringify(stats)) } catch { /* ignore */ }
}

// ─── 7-Segment Display ────────────────────────────────────────────────────────

function SevenSegDisplay({ value, digits = 3 }: { value: number; digits?: number }) {
  const clamped = Math.max(0, Math.min(999, Math.abs(Math.floor(value))))
  const str = String(clamped).padStart(digits, '0').slice(-digits)
  return (
    <div style={{
      background: '#1a0000', border: '2px inset #000', borderRadius: 4,
      padding: '2px 6px', fontFamily: "'Courier New', monospace",
      fontSize: 22, fontWeight: 900, color: '#ff2200',
      letterSpacing: 3, minWidth: digits * 18, textAlign: 'center',
      textShadow: '0 0 8px #ff2200, 0 0 2px #ff0000',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
    }}>
      {str}
    </div>
  )
}

// ─── Cell Component ───────────────────────────────────────────────────────────

interface CellProps {
  cell: Cell
  gameState: GameState
  onReveal: () => void
  onFlag: (e: React.MouseEvent) => void
  onMouseDown: () => void
  onMouseUp: () => void
  onChord: () => void
  size: number
}

function CellButton({ cell, gameState, onReveal, onFlag, onMouseDown, onMouseUp, onChord, size }: CellProps) {
  const fontSize = Math.max(10, size * 0.48)
  const isActive = gameState === 'playing' || gameState === 'idle'

  let bg = '#2a2a3e'
  let content: React.ReactNode = null
  let color = TEXT
  let boxShadow = 'inset 2px 2px 3px rgba(255,255,255,0.12), inset -2px -2px 3px rgba(0,0,0,0.5)'

  if (cell.revealed) {
    bg = '#1a1a2e'
    boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.6)'
    if (cell.mine) {
      bg = cell.exploded ? '#7f1d1d' : '#1a1a2e'
      content = cell.exploded ? '💥' : '💣'
    } else if (cell.adj > 0) {
      color = NUM_COLORS[cell.adj] ?? TEXT
      content = cell.adj
    }
  } else if (cell.wrongFlag) {
    bg = '#2a1a1a'
    content = '❌'
    boxShadow = 'inset 2px 2px 3px rgba(255,255,255,0.08), inset -2px -2px 3px rgba(0,0,0,0.5)'
  } else if (cell.flag === 'flag') {
    content = '🚩'
  } else if (cell.flag === 'question') {
    content = '❓'
    color = '#facc15'
  }

  const handleClick = () => {
    if (!isActive) return
    if (!cell.revealed) { onReveal(); return }
    if (cell.revealed && cell.adj > 0) onChord()
  }

  return (
    <button
      onClick={handleClick}
      onContextMenu={onFlag}
      onMouseDown={() => { if (!cell.revealed) onMouseDown() }}
      onMouseUp={onMouseUp}
      style={{
        width: size, height: size, fontSize,
        background: bg, color,
        border: '1px solid rgba(0,0,0,0.4)',
        boxShadow, cursor: isActive && !cell.revealed ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, userSelect: 'none', flexShrink: 0,
        transition: 'background 0.05s',
      }}
    >
      {content}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MinesweeperGame({ onBack }: { onBack?: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [grid, setGrid] = useState<Grid>(() => makeEmptyGrid(9, 9))
  const [gameState, setGameState] = useState<GameState>('idle')
  const [flagCount, setFlagCount] = useState(0)
  const [time, setTime] = useState(0)
  const [smiley, setSmiley] = useState<'normal' | 'scared' | 'win' | 'lose'>('normal')
  const [stats, setStats] = useState<Stats>(loadStats)
  const [showStats, setShowStats] = useState(false)
  const [winTime, setWinTime] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const cfg = CONFIGS[difficulty]

  // Timer management
  useEffect(() => {
    if (gameState === 'playing') {
      startTimeRef.current = Date.now() - time * 1000
      timerRef.current = setInterval(() => {
        setTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState]) // eslint-disable-line react-hooks/exhaustive-deps

  const startNewGame = useCallback((diff?: Difficulty) => {
    const d = diff ?? difficulty
    if (diff) setDifficulty(d)
    const c = CONFIGS[d]
    setGrid(makeEmptyGrid(c.rows, c.cols))
    setGameState('idle')
    setFlagCount(0)
    setTime(0)
    setSmiley('normal')
    setWinTime(null)
  }, [difficulty])

  // Auto-restart when difficulty changes
  useEffect(() => {
    startNewGame(difficulty)
  }, [difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const cell = prev[r][c]
      if (cell.revealed || cell.flag !== 'none') return prev

      let currentGrid = prev

      // First click: place mines
      if (gameState === 'idle') {
        currentGrid = placeMines(prev, cfg.rows, cfg.cols, cfg.mines, r, c)
        setGameState('playing')
        startTimeRef.current = Date.now()
      }

      const clickedCell = currentGrid[r][c]
      if (clickedCell.mine) {
        // LOSE
        const next = currentGrid.map((row, ri) => row.map((cl, ci) => {
          if (ri === r && ci === c) return { ...cl, revealed: true, exploded: true }
          if (cl.mine) return { ...cl, revealed: true }
          if (!cl.mine && cl.flag === 'flag') return { ...cl, wrongFlag: true }
          return { ...cl }
        }))
        setGameState('lost')
        setSmiley('lose')
        const newStats = { ...loadStats(), played: loadStats().played + 1 }
        saveStats(newStats)
        setStats(newStats)
        return next
      }

      const next = floodReveal(currentGrid, cfg.rows, cfg.cols, r, c)

      // Check win: all non-mine cells revealed
      const remaining = next.flat().filter(cl => !cl.revealed && !cl.mine).length
      if (remaining === 0) {
        // Auto-flag all mines
        const won = next.map(row => row.map(cl => cl.mine ? { ...cl, flag: 'flag' as FlagState } : cl))
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setGameState('won')
        setSmiley('win')
        setWinTime(elapsed)
        setTime(elapsed)
        setFlagCount(cfg.mines)
        const old = loadStats()
        const newBest = { ...old.bestTimes }
        if (!newBest[difficulty] || elapsed < newBest[difficulty]!) newBest[difficulty] = elapsed
        const newStats: Stats = { played: old.played + 1, wins: old.wins + 1, bestTimes: newBest }
        saveStats(newStats)
        setStats(newStats)
        return won
      }

      return next
    })
  }, [gameState, cfg, difficulty])

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (gameState !== 'playing' && gameState !== 'idle') return
    setGrid(prev => {
      const cell = prev[r][c]
      if (cell.revealed) return prev
      const cycle: Record<FlagState, FlagState> = { none: 'flag', flag: 'question', question: 'none' }
      const newFlag = cycle[cell.flag]
      setFlagCount(fc => {
        if (cell.flag === 'none' && newFlag === 'flag') return fc + 1
        if (cell.flag === 'flag' && newFlag === 'question') return fc - 1
        return fc
      })
      return prev.map((row, ri) => row.map((cl, ci) =>
        ri === r && ci === c ? { ...cl, flag: newFlag } : cl
      ))
    })
  }, [gameState])

  const handleChord = useCallback((r: number, c: number) => {
    if (gameState !== 'playing') return
    setGrid(prev => {
      const cell = prev[r][c]
      if (!cell.revealed || cell.adj === 0) return prev
      const neighbors = getNeighbors(cfg.rows, cfg.cols, r, c)
      const flaggedNeighbors = neighbors.filter(([nr, nc]) => prev[nr][nc].flag === 'flag').length
      if (flaggedNeighbors !== cell.adj) return prev
      let next = prev
      neighbors.forEach(([nr, nc]) => {
        const n = next[nr][nc]
        if (!n.revealed && n.flag === 'none') {
          if (n.mine) {
            // Chord hit a mine — reveal all mines
            next = next.map((row, ri) => row.map((cl, ci) => {
              if (ri === nr && ci === nc) return { ...cl, revealed: true, exploded: true }
              if (cl.mine) return { ...cl, revealed: true }
              if (!cl.mine && cl.flag === 'flag') return { ...cl, wrongFlag: true }
              return { ...cl }
            }))
            setGameState('lost')
            setSmiley('lose')
            const old = loadStats()
            const ns = { ...old, played: old.played + 1 }
            saveStats(ns)
            setStats(ns)
          } else {
            next = floodReveal(next, cfg.rows, cfg.cols, nr, nc)
          }
        }
      })
      // Check win after chord
      const remaining = next.flat().filter(cl => !cl.revealed && !cl.mine).length
      if (remaining === 0) {
        const wonGrid = next.map(row => row.map(cl => cl.mine ? { ...cl, flag: 'flag' as FlagState } : cl))
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setGameState('won')
        setSmiley('win')
        setWinTime(elapsed)
        setTime(elapsed)
        setFlagCount(cfg.mines)
        const old = loadStats()
        const newBest = { ...old.bestTimes }
        if (!newBest[difficulty] || elapsed < newBest[difficulty]!) newBest[difficulty] = elapsed
        const ns: Stats = { played: old.played + 1, wins: old.wins + 1, bestTimes: newBest }
        saveStats(ns)
        setStats(ns)
        return wonGrid
      }
      return next
    })
  }, [gameState, cfg, difficulty])

  // Responsive cell size
  const maxW = Math.min(typeof window !== 'undefined' ? window.innerWidth - 40 : 360, 600)
  const cellSize = Math.max(18, Math.floor(Math.min(maxW / cfg.cols, 36)))

  const mineCounter = cfg.mines - flagCount
  const smileyFace = { normal: '🙂', scared: '😮', win: '😎', lose: '😵' }[smiley]
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0

  return (
    <div style={{ color: TEXT, userSelect: 'none' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span style={{ fontWeight: 700, fontSize: 15 }}>💣 Démineur</span>
        </div>
        <button
          onClick={() => setShowStats(s => !s)}
          style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}
        >
          Stats
        </button>
      </div>

      {/* Difficulty selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(Object.keys(CONFIGS) as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => startNewGame(d)}
            style={{
              flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600, borderRadius: 8,
              cursor: 'pointer', border: `1px solid ${difficulty === d ? '#a855f7' : BORDER}`,
              background: difficulty === d ? 'rgba(168,85,247,0.2)' : SURFACE2,
              color: difficulty === d ? '#a855f7' : MUTED,
              transition: 'all 0.15s',
            }}
          >
            {CONFIGS[d].label}
          </button>
        ))}
      </div>

      {/* Stats panel */}
      {showStats && (
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
          padding: 14, marginBottom: 12, fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: TEXT }}>Statistiques</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div><div style={{ fontSize: 20, fontWeight: 900, color: '#a855f7' }}>{stats.played}</div><div style={{ color: MUTED }}>Parties</div></div>
            <div><div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{stats.wins}</div><div style={{ color: MUTED }}>Victoires</div></div>
            <div><div style={{ fontSize: 20, fontWeight: 900, color: '#06b6d4' }}>{winRate}%</div><div style={{ color: MUTED }}>Taux</div></div>
          </div>
          <div style={{ marginTop: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
            <div style={{ color: MUTED, marginBottom: 4 }}>Meilleurs temps :</div>
            {(Object.keys(CONFIGS) as Difficulty[]).map(d => (
              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: MUTED }}>{CONFIGS[d].label}</span>
                <span style={{ color: stats.bestTimes[d] ? '#facc15' : MUTED, fontWeight: 700 }}>
                  {stats.bestTimes[d] ? `${stats.bestTimes[d]}s` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game panel — sunken 3D header */}
      <div style={{
        background: SURFACE,
        border: `2px solid`,
        borderColor: '#3a3a5c #0a0a1a #0a0a1a #3a3a5c',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.06)',
        display: 'inline-block',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'linear-gradient(180deg, #22213f 0%, #16153a 100%)',
          borderBottom: '3px solid',
          borderBottomColor: '#0a0a1a',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <SevenSegDisplay value={mineCounter} />
          <button
            onClick={() => startNewGame()}
            onMouseDown={() => setSmiley('scared')}
            onMouseUp={() => setSmiley(gameState === 'won' ? 'win' : gameState === 'lost' ? 'lose' : 'normal')}
            style={{
              fontSize: 22, background: SURFACE2,
              border: '2px solid', borderColor: '#3a3a5c #0a0a1a #0a0a1a #3a3a5c',
              borderRadius: 6, cursor: 'pointer', width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {smileyFace}
          </button>
          <SevenSegDisplay value={time} />
        </div>

        {/* Grid */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#111128',
          padding: 3,
          boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.6)',
        }}>
          {grid.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((cell, c) => (
                <CellButton
                  key={c}
                  cell={cell}
                  gameState={gameState}
                  size={cellSize}
                  onReveal={() => handleReveal(r, c)}
                  onFlag={e => handleFlag(e, r, c)}
                  onMouseDown={() => setSmiley('scared')}
                  onMouseUp={() => setSmiley(gameState === 'won' ? 'win' : gameState === 'lost' ? 'lose' : 'normal')}
                  onChord={() => handleChord(r, c)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Win overlay */}
      {gameState === 'won' && winTime !== null && (
        <div style={{
          marginTop: 12, padding: '12px 16px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>🎉 Félicitations!</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
            ⏱ {winTime}s
            {stats.bestTimes[difficulty] === winTime && (
              <span style={{ color: '#facc15', marginLeft: 8 }}>🏆 Nouveau record!</span>
            )}
          </div>
        </div>
      )}

      {/* Lose message */}
      {gameState === 'lost' && (
        <div style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>💥 Boom ! Vous avez touché une mine !</div>
        </div>
      )}

      {/* Hint */}
      {gameState === 'idle' && (
        <p style={{ color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          Cliquez pour commencer · Clic droit pour poser un drapeau
        </p>
      )}
    </div>
  )
}
