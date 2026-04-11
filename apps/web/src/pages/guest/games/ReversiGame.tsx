import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, RotateCcw, Trophy, BookOpen } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types & Constants ────────────────────────────────────────────────────────
type Cell = 0 | 1 | 2        // 0=empty, 1=black(player), 2=white(cpu)
type Board = Cell[][]
type Difficulty = 'facile' | 'moyen' | 'expert'
type Screen = 'menu' | 'game'

const SIZE = 8
const DIRS: [number, number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
const CORNERS: [number, number][] = [[0,0],[0,7],[7,0],[7,7]]
const EDGES: [number, number][] = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,0],[2,0],[3,0],[4,0],[5,0],[6,0],
  [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],
  [1,7],[2,7],[3,7],[4,7],[5,7],[6,7],
]

// Positional weight table for minimax (corners highest)
const WEIGHT: number[][] = [
  [100,-20, 10,  5,  5, 10,-20,100],
  [-20,-50, -2, -2, -2, -2,-50,-20],
  [ 10, -2, -1, -1, -1, -1, -2, 10],
  [  5, -2, -1, -1, -1, -1, -2,  5],
  [  5, -2, -1, -1, -1, -1, -2,  5],
  [ 10, -2, -1, -1, -1, -1, -2, 10],
  [-20,-50, -2, -2, -2, -2,-50,-20],
  [100,-20, 10,  5,  5, 10,-20,100],
]

const DIFF_META: Record<Difficulty, { label: string; color: string; desc: string }> = {
  facile: { label: 'Facile',  color: '#22c55e', desc: 'Coups aléatoires' },
  moyen:  { label: 'Moyen',   color: '#f59e0b', desc: 'Stratégie gloutonne' },
  expert: { label: 'Expert',  color: '#ef4444', desc: 'Minimax + coins' },
}

interface MoveLog { player: 1 | 2; row: number; col: number; flipped: number }
interface GameStats { wins: number; losses: number; draws: number }
type StatsMap = Record<Difficulty, GameStats>

const DEFAULT_STATS: StatsMap = {
  facile: { wins: 0, losses: 0, draws: 0 },
  moyen:  { wins: 0, losses: 0, draws: 0 },
  expert: { wins: 0, losses: 0, draws: 0 },
}

// ─── Board logic ──────────────────────────────────────────────────────────────
function initBoard(): Board {
  const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as Cell[])
  b[3][3] = 2; b[3][4] = 1; b[4][3] = 1; b[4][4] = 2
  return b
}

function getFlips(board: Board, r: number, c: number, player: Cell): [number, number][] {
  if (board[r][c] !== 0) return []
  const opp = player === 1 ? 2 : 1
  const result: [number, number][] = []
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = []
    let nr = r + dr, nc = c + dc
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === opp) {
      line.push([nr, nc]); nr += dr; nc += dc
    }
    if (line.length && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
      result.push(...line)
    }
  }
  return result
}

function getValidMoves(board: Board, player: Cell): [number, number][] {
  const moves: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c] === 0 && getFlips(board, r, c, player).length > 0)
        moves.push([r, c])
  return moves
}

function applyMove(board: Board, r: number, c: number, player: Cell): Board {
  const flips = getFlips(board, r, c, player)
  if (!flips.length) return board
  const next = board.map(row => [...row]) as Board
  next[r][c] = player
  flips.forEach(([fr, fc]) => { next[fr][fc] = player })
  return next
}

function countPieces(board: Board): [number, number] {
  let b = 0, w = 0
  board.flat().forEach(v => { if (v === 1) b++; if (v === 2) w++ })
  return [b, w]
}

// ── CPU AI ────────────────────────────────────────────────────────────────────
function cpuRandom(board: Board): [number, number] | null {
  const moves = getValidMoves(board, 2)
  if (!moves.length) return null
  return moves[Math.floor(Math.random() * moves.length)]
}

function cpuGreedy(board: Board): [number, number] | null {
  const moves = getValidMoves(board, 2)
  if (!moves.length) return null
  // Prefer corners first
  const corner = moves.find(([r, c]) => CORNERS.some(([cr, cc]) => cr === r && cc === c))
  if (corner) return corner
  // Then edges
  const edge = moves.find(([r, c]) => EDGES.some(([er, ec]) => er === r && ec === c))
  if (edge) return edge
  // Else maximize flips
  return moves.reduce((best, m) =>
    getFlips(board, m[0], m[1], 2).length > getFlips(board, best[0], best[1], 2).length ? m : best
  )
}

function boardScore(board: Board, player: Cell): number {
  const opp = player === 1 ? 2 : 1
  let score = 0
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === player) score += WEIGHT[r][c]
      else if (board[r][c] === opp) score -= WEIGHT[r][c]
    }
  return score
}

function minimax(board: Board, depth: number, maximizing: boolean, alpha: number, beta: number, cpuPlayer: Cell): number {
  const humanPlayer: Cell = cpuPlayer === 2 ? 1 : 2
  const player: Cell = maximizing ? cpuPlayer : humanPlayer
  const moves = getValidMoves(board, player)
  if (depth === 0 || (moves.length === 0 && getValidMoves(board, maximizing ? humanPlayer : cpuPlayer).length === 0)) {
    return boardScore(board, cpuPlayer)
  }
  if (moves.length === 0) return minimax(board, depth - 1, !maximizing, alpha, beta, cpuPlayer)
  if (maximizing) {
    let val = -Infinity
    for (const [r, c] of moves) {
      const next = applyMove(board, r, c, player)
      val = Math.max(val, minimax(next, depth - 1, false, alpha, beta, cpuPlayer))
      alpha = Math.max(alpha, val)
      if (beta <= alpha) break
    }
    return val
  } else {
    let val = Infinity
    for (const [r, c] of moves) {
      const next = applyMove(board, r, c, player)
      val = Math.min(val, minimax(next, depth - 1, true, alpha, beta, cpuPlayer))
      beta = Math.min(beta, val)
      if (beta <= alpha) break
    }
    return val
  }
}

function cpuMinimax(board: Board): [number, number] | null {
  const moves = getValidMoves(board, 2)
  if (!moves.length) return null
  // Immediately grab corner if available
  const corner = moves.find(([r, c]) => CORNERS.some(([cr, cc]) => cr === r && cc === c))
  if (corner) return corner
  let best: [number, number] = moves[0]
  let bestVal = -Infinity
  for (const [r, c] of moves) {
    const next = applyMove(board, r, c, 2)
    const val = minimax(next, 4, false, -Infinity, Infinity, 2)
    if (val > bestVal) { bestVal = val; best = [r, c] }
  }
  return best
}

function getLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function setLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReversiGame({ onBack }: { onBack?: () => void }) {
  const [screen, setScreen] = useState<Screen>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen')
  const [board, setBoard] = useState<Board>(initBoard)
  const [turn, setTurn] = useState<Cell>(1)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('')
  const [lastPlaced, setLastPlaced] = useState<[number, number] | null>(null)
  const [flipping, setFlipping] = useState<[number, number][]>([])
  const [moveLog, setMoveLog] = useState<MoveLog[]>([])
  const [stats, setStats] = useState<StatsMap>(() => getLS('reversi_stats', DEFAULT_STATS))
  const [showStats, setShowStats] = useState(false)
  const cpuThinking = useRef(false)

  const validMoves = gameOver || turn !== 1 ? [] : getValidMoves(board, 1)
  const [black, white] = countPieces(board)
  const total = black + white

  // ── CPU turn ──
  useEffect(() => {
    if (turn !== 2 || gameOver || screen !== 'game') return
    if (cpuThinking.current) return
    cpuThinking.current = true
    const delay = difficulty === 'expert' ? 700 : 400
    const timer = setTimeout(() => {
      setBoard(prev => {
        let move: [number, number] | null = null
        if (difficulty === 'facile') move = cpuRandom(prev)
        else if (difficulty === 'moyen') move = cpuGreedy(prev)
        else move = cpuMinimax(prev)

        if (!move) {
          // CPU must pass
          const playerMoves = getValidMoves(prev, 1)
          if (!playerMoves.length) {
            endGame(prev)
          } else {
            setMessage('CPU passe son tour !')
            setTurn(1)
          }
          cpuThinking.current = false
          return prev
        }

        const [r, c] = move
        const flips = getFlips(prev, r, c, 2)
        setLastPlaced([r, c])
        setFlipping(flips)
        setTimeout(() => setFlipping([]), 600)

        const next = applyMove(prev, r, c, 2)
        setMoveLog(log => [{
          player: 2 as const,
          row: r,
          col: c,
          flipped: flips.length,
        }, ...log].slice(0, 5))

        const playerMoves = getValidMoves(next, 1)
        if (!playerMoves.length) {
          const cpuMoves2 = getValidMoves(next, 2)
          if (!cpuMoves2.length) {
            endGame(next)
          } else {
            setMessage('Vous passez votre tour !')
            setTurn(2)
          }
        } else {
          setMessage('')
          setTurn(1)
        }
        cpuThinking.current = false
        return next
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [turn, gameOver, difficulty, screen])

  const endGame = useCallback((b: Board) => {
    const [bl, wh] = countPieces(b)
    let msg = ''
    let outcome: 'wins' | 'losses' | 'draws' = 'draws'
    if (bl > wh) { msg = `Vous gagnez ! 🎉 (${bl}–${wh})`; outcome = 'wins' }
    else if (wh > bl) { msg = `CPU gagne ! 😤 (${bl}–${wh})`; outcome = 'losses' }
    else { msg = `Égalité ! (${bl}–${wh})` }
    setMessage(msg)
    setGameOver(true)
    setStats(prev => {
      const next = {
        ...prev,
        [difficulty]: {
          ...prev[difficulty],
          [outcome]: prev[difficulty][outcome] + 1,
        },
      }
      setLS('reversi_stats', next)
      return next
    })
  }, [difficulty])

  const handleCellClick = (r: number, c: number) => {
    if (turn !== 1 || gameOver || screen !== 'game') return
    const flips = getFlips(board, r, c, 1)
    if (!flips.length) return

    setFlipping(flips)
    setTimeout(() => setFlipping([]), 600)
    setLastPlaced([r, c])

    const next = applyMove(board, r, c, 1)
    setMoveLog(log => [{
      player: 1 as const,
      row: r,
      col: c,
      flipped: flips.length,
    }, ...log].slice(0, 5))

    const cpuMoves = getValidMoves(next, 2)
    if (!cpuMoves.length) {
      const playerMoves2 = getValidMoves(next, 1)
      if (!playerMoves2.length) {
        setBoard(next)
        endGame(next)
        return
      }
      setMessage('CPU passe son tour !')
      setBoard(next)
      setTurn(1)
      return
    }
    setMessage('')
    setBoard(next)
    setTurn(2)
  }

  const startNewGame = () => {
    cpuThinking.current = false
    setBoard(initBoard())
    setTurn(1)
    setGameOver(false)
    setMessage('')
    setLastPlaced(null)
    setFlipping([])
    setMoveLog([])
    setScreen('game')
  }

  const progressPct = (total / 64) * 100
  const blackPct = total > 0 ? (black / total) * 100 : 50

  // ── MENU ──
  if (screen === 'menu') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-black text-lg" style={{ color: TEXT }}>⭕ Reversi</span>
        </div>
        <button onClick={() => setShowStats(s => !s)} className="p-1.5 rounded-lg"
          style={{ color: showStats ? ACCENT : MUTED }}>
          <Trophy size={18} />
        </button>
      </div>

      {showStats ? (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="font-bold text-sm" style={{ color: TEXT }}>📊 Statistiques</p>
          {(Object.entries(stats) as [Difficulty, GameStats][]).map(([diff, s]) => {
            const total2 = s.wins + s.losses + s.draws
            const meta = DIFF_META[diff]
            return (
              <div key={diff} className="rounded-xl p-3" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{total2} parties</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span style={{ color: '#22c55e' }}>✓ {s.wins}</span>
                  <span style={{ color: '#ef4444' }}>✗ {s.losses}</span>
                  <span style={{ color: MUTED }}>= {s.draws}</span>
                  {total2 > 0 && (
                    <span className="ml-auto" style={{ color: MUTED }}>
                      {Math.round((s.wins / total2) * 100)}% victoires
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {/* Difficulty */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: MUTED }}>Difficulté</p>
            <div className="space-y-2">
              {(Object.entries(DIFF_META) as [Difficulty, typeof DIFF_META[Difficulty]][]).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className="w-full rounded-2xl p-3 flex items-center gap-3 text-left transition-all"
                  style={{
                    background: difficulty === key ? `${meta.color}18` : SURFACE2,
                    border: `2px solid ${difficulty === key ? meta.color : BORDER}`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black"
                    style={{ background: `${meta.color}22`, color: meta.color, fontSize: 18 }}>
                    {key === 'facile' ? '😊' : key === 'moyen' ? '🤔' : '🔥'}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: difficulty === key ? meta.color : TEXT }}>{meta.label}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>{meta.desc}</p>
                  </div>
                  {difficulty === key && (
                    <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: meta.color }}>
                      <span style={{ color: '#fff', fontSize: 10 }}>✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rules summary */}
          <div className="rounded-2xl p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: TEXT }}>
              <BookOpen size={13} /> Règles du Reversi
            </p>
            <ul className="space-y-0.5">
              {[
                'Placez un pion pour encadrer des pions adverses',
                'Les pions encadrés sont retournés à votre couleur',
                'Vous jouez les ⚫ Noirs, le CPU joue les ⚪ Blancs',
                'Gagne celui qui a le plus de pions à la fin',
              ].map((r, i) => (
                <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: MUTED }}>
                  <span style={{ color: ACCENT }}>·</span> {r}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <button
        onClick={startNewGame}
        className="w-full py-3.5 rounded-2xl font-black text-base"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}
      >
        Nouvelle Partie ⭕
      </button>
    </div>
  )

  // ── GAME ──
  const diffMeta = DIFF_META[difficulty]

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes flipPiece {
          0%   { transform: rotateY(0deg) scale(1); }
          40%  { transform: rotateY(90deg) scale(0.85); }
          60%  { transform: rotateY(90deg) scale(0.85); }
          100% { transform: rotateY(0deg) scale(1); }
        }
        @keyframes placeIn {
          from { transform: scale(0) rotateY(0deg); opacity: 0; }
          to   { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
        @keyframes pulse-hint {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50%       { opacity: 0.7;  transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('menu')} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: `${diffMeta.color}20`, color: diffMeta.color }}>
            {diffMeta.label}
          </span>
        </div>
        <button onClick={startNewGame} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Score display */}
      <div className="rounded-2xl p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-2">
          {/* Black (player) */}
          <div className={`flex items-center gap-2 ${turn === 1 && !gameOver ? 'opacity-100' : 'opacity-60'}`}>
            <div className="w-7 h-7 rounded-full shadow-lg"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #555, #111)',
                boxShadow: turn === 1 && !gameOver ? '0 0 12px rgba(0,0,0,0.8), 0 0 6px rgba(168,85,247,0.5)' : '0 2px 6px rgba(0,0,0,0.5)',
              }} />
            <div>
              <p className="font-black text-xl" style={{ color: TEXT }}>{black}</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Vous</p>
            </div>
          </div>

          {/* Turn indicator */}
          <div className="text-center">
            {gameOver ? (
              <p className="text-xs font-bold" style={{ color: ACCENT }}>Fin</p>
            ) : (
              <p className="text-[10px]" style={{ color: MUTED }}>
                {turn === 1 ? '⬇ Votre tour' : '⚙ CPU…'}
              </p>
            )}
            <p className="text-[10px]" style={{ color: MUTED }}>{total}/64</p>
          </div>

          {/* White (CPU) */}
          <div className={`flex items-center gap-2 ${turn === 2 && !gameOver ? 'opacity-100' : 'opacity-60'}`}>
            <div>
              <p className="font-black text-xl text-right" style={{ color: TEXT }}>{white}</p>
              <p className="text-[10px] text-right" style={{ color: MUTED }}>CPU</p>
            </div>
            <div className="w-7 h-7 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #fff, #ccc)',
                boxShadow: turn === 2 && !gameOver ? '0 0 12px rgba(255,255,255,0.4), 0 0 6px rgba(6,182,212,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
              }} />
          </div>
        </div>

        {/* Score bar */}
        <div className="rounded-full overflow-hidden h-2" style={{ background: '#f8f8f8' }}>
          <div className="h-full transition-all duration-500"
            style={{ width: `${blackPct}%`, background: 'linear-gradient(90deg, #111, #333)' }} />
        </div>

        {/* Board fill bar */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 rounded-full h-1 overflow-hidden" style={{ background: SURFACE2 }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})` }} />
          </div>
          <span className="text-[9px]" style={{ color: MUTED }}>{Math.round(progressPct)}%</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-xl px-3 py-2 text-center text-sm font-bold"
          style={{
            background: gameOver
              ? message.includes('gagnez')
                ? 'rgba(34,197,94,0.1)'
                : message.includes('Égalité')
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(239,68,68,0.1)'
              : 'rgba(168,85,247,0.1)',
            border: `1px solid ${gameOver ? (message.includes('gagnez') ? 'rgba(34,197,94,0.3)' : message.includes('Égalité') ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)') : BORDER}`,
            color: gameOver ? (message.includes('gagnez') ? '#22c55e' : message.includes('Égalité') ? '#f59e0b' : '#ef4444') : ACCENT,
            animation: 'slideIn 0.3s ease',
          }}
        >
          {message}
        </div>
      )}

      {/* Board */}
      <div
        className="rounded-2xl overflow-hidden mx-auto select-none"
        style={{
          background: 'linear-gradient(135deg, #1a5e3c, #144d30)',
          border: '3px solid #0d3d22',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          width: 288,
        }}
      >
        {/* Column labels */}
        <div className="flex pl-5">
          {Array.from({ length: SIZE }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[8px]" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: '14px' }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>

        {board.map((row, r) => (
          <div key={r} className="flex items-center">
            {/* Row label */}
            <div className="w-5 text-center text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{r + 1}</div>

            {row.map((cell, c) => {
              const isHint = validMoves.some(([hr, hc]) => hr === r && hc === c)
              const isLast = lastPlaced?.[0] === r && lastPlaced?.[1] === c
              const isFlipping = flipping.some(([fr, fc]) => fr === r && fc === c)
              const cellSize = 33

              return (
                <button
                  key={c}
                  onClick={() => handleCellClick(r, c)}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: (r + c) % 2 === 0
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.05)',
                    border: '1px solid rgba(0,80,40,0.5)',
                    cursor: isHint && turn === 1 && !gameOver ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {/* Corner markers */}
                  {r === 0 && c === 0 && <div className="absolute w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', top: 2, left: 2 }} />}
                  {r === 0 && c === 7 && <div className="absolute w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', top: 2, right: 2 }} />}
                  {r === 7 && c === 0 && <div className="absolute w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', bottom: 2, left: 2 }} />}
                  {r === 7 && c === 7 && <div className="absolute w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', bottom: 2, right: 2 }} />}

                  {cell === 1 && (
                    <div
                      style={{
                        width: 25,
                        height: 25,
                        borderRadius: '50%',
                        background: isFlipping
                          ? 'radial-gradient(circle at 35% 30%, #777, #222)'
                          : 'radial-gradient(circle at 35% 30%, #666, #111)',
                        boxShadow: isLast
                          ? '0 0 0 2px rgba(168,85,247,0.8), 0 3px 8px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(255,255,255,0.1)'
                          : '0 3px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.08)',
                        animation: isFlipping ? 'flipPiece 0.5s ease' : isLast ? 'placeIn 0.25s ease' : 'none',
                      }}
                    />
                  )}

                  {cell === 2 && (
                    <div
                      style={{
                        width: 25,
                        height: 25,
                        borderRadius: '50%',
                        background: isFlipping
                          ? 'radial-gradient(circle at 35% 30%, #aaa, #888)'
                          : 'radial-gradient(circle at 35% 30%, #fff, #d0d0d0)',
                        boxShadow: isLast
                          ? '0 0 0 2px rgba(6,182,212,0.8), 0 3px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.15)'
                          : '0 3px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)',
                        animation: isFlipping ? 'flipPiece 0.5s ease' : isLast ? 'placeIn 0.25s ease' : 'none',
                      }}
                    />
                  )}

                  {cell === 0 && isHint && turn === 1 && !gameOver && (
                    <div
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: ACCENT,
                        animation: 'pulse-hint 1.4s ease-in-out infinite',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Move log + action row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Move history */}
        <div className="rounded-xl p-2.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold mb-1.5" style={{ color: MUTED }}>Derniers coups</p>
          {moveLog.length === 0 && (
            <p className="text-[10px]" style={{ color: MUTED }}>Aucun coup</p>
          )}
          {moveLog.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] leading-5" style={{ color: i === 0 ? TEXT : MUTED }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{
                background: m.player === 1
                  ? 'radial-gradient(circle at 35% 30%, #555, #111)'
                  : 'radial-gradient(circle at 35% 30%, #fff, #ccc)',
              }} />
              {String.fromCharCode(65 + m.col)}{m.row + 1}
              <span style={{ color: m.player === 1 ? ACCENT : ACCENT2 }}>+{m.flipped}</span>
            </div>
          ))}
        </div>

        {/* Stats + controls */}
        <div className="space-y-2">
          <div className="rounded-xl p-2.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Bilan {diffMeta.label}</p>
            <div className="flex gap-2 text-[10px]">
              <span style={{ color: '#22c55e' }}>✓{stats[difficulty].wins}</span>
              <span style={{ color: '#ef4444' }}>✗{stats[difficulty].losses}</span>
              <span style={{ color: MUTED }}>={stats[difficulty].draws}</span>
            </div>
          </div>
          <button
            onClick={startNewGame}
            className="w-full rounded-xl py-2 font-black text-xs"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff' }}
          >
            Nouvelle partie
          </button>
          <button
            onClick={() => setScreen('menu')}
            className="w-full rounded-xl py-2 font-semibold text-xs"
            style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED }}
          >
            ← Menu
          </button>
        </div>
      </div>
    </div>
  )
}
