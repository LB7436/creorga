import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, ACCENT2, BG, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ── Types ──────────────────────────────────────────────────────────────────────

type Cell = 'X' | 'O' | null
type DiffId = 'easy' | 'medium' | 'hard'

interface Diff { id: DiffId; label: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const DIFFS: Diff[] = [
  { id: 'easy',   label: 'Facile'     },
  { id: 'medium', label: 'Moyen'      },
  { id: 'hard',   label: 'Difficile'  },
]

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],          // diags
]

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes ttt-draw-x1 {
  from { stroke-dashoffset: 40; }
  to   { stroke-dashoffset: 0; }
}
@keyframes ttt-draw-x2 {
  from { stroke-dashoffset: 40; }
  to   { stroke-dashoffset: 0; }
}
@keyframes ttt-draw-o {
  from { stroke-dashoffset: 113; }
  to   { stroke-dashoffset: 0; }
}
@keyframes ttt-win-line {
  from { stroke-dashoffset: 300; opacity: 0; }
  to   { stroke-dashoffset: 0;   opacity: 1; }
}
@keyframes ttt-cell-in {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes ttt-win-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(168,85,247,0.3); }
  50%     { box-shadow: 0 0 24px rgba(168,85,247,0.7); }
}
@keyframes ttt-thinking {
  0%,80%,100% { transform: scale(0); opacity: 0.4; }
  40%         { transform: scale(1);   opacity: 1; }
}
@keyframes ttt-score-pop {
  0%   { transform: scale(0.7); opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes ttt-indicator-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.4; }
}
@keyframes ttt-result-in {
  from { transform: translateY(-10px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
`

function injectCSS(id: string, css: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = css
  document.head.appendChild(s)
}

// ── AI Logic ───────────────────────────────────────────────────────────────────

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line }
    }
  }
  return null
}

function minimax(board: Cell[], isMax: boolean, alpha: number, beta: number, depth: number): number {
  const result = checkWinner(board)
  if (result?.winner === 'O') return 10 - depth
  if (result?.winner === 'X') return depth - 10
  if (board.every(Boolean)) return 0

  const empty = board.map((_, i) => i).filter(i => !board[i])

  if (isMax) {
    let best = -Infinity
    for (const i of empty) {
      const b = [...board] as Cell[]
      b[i] = 'O'
      best = Math.max(best, minimax(b, false, alpha, beta, depth + 1))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const i of empty) {
      const b = [...board] as Cell[]
      b[i] = 'X'
      best = Math.min(best, minimax(b, true, alpha, beta, depth + 1))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function bestMove(board: Cell[], diff: DiffId): number {
  const empty = board.map((_, i) => i).filter(i => !board[i])
  if (empty.length === 0) return -1

  if (diff === 'easy') {
    return empty[Math.floor(Math.random() * empty.length)]
  }

  if (diff === 'medium') {
    // 1. Win immediately
    for (const i of empty) {
      const b = [...board] as Cell[]
      b[i] = 'O'
      if (checkWinner(b)) return i
    }
    // 2. Block player win
    for (const i of empty) {
      const b = [...board] as Cell[]
      b[i] = 'X'
      if (checkWinner(b)) return i
    }
    // 3. Prefer center, then corners
    if (!board[4]) return 4
    const corners = [0, 2, 6, 8].filter(i => !board[i])
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
    return empty[Math.floor(Math.random() * empty.length)]
  }

  // hard: unbeatable minimax
  let bestVal = -Infinity
  let chosen = empty[0]
  for (const i of empty) {
    const b = [...board] as Cell[]
    b[i] = 'O'
    const val = minimax(b, false, -Infinity, Infinity, 0)
    if (val > bestVal) { bestVal = val; chosen = i }
  }
  return chosen
}

// ── X Drawing ─────────────────────────────────────────────────────────────────

function XMark({ size, color }: { size: number; color: string }) {
  const p = size * 0.22
  const e = size - p
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <line
        x1={p} y1={p} x2={e} y2={e}
        stroke={color} strokeWidth={size * 0.1} strokeLinecap="round"
        strokeDasharray={40} strokeDashoffset={0}
        style={{ animation: 'ttt-draw-x1 0.25s ease-out forwards' }}
      />
      <line
        x1={e} y1={p} x2={p} y2={e}
        stroke={color} strokeWidth={size * 0.1} strokeLinecap="round"
        strokeDasharray={40} strokeDashoffset={0}
        style={{ animation: 'ttt-draw-x2 0.25s ease-out 0.1s forwards' }}
      />
    </svg>
  )
}

function OMark({ size, color }: { size: number; color: string }) {
  const r = size * 0.33
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke={color} strokeWidth={size * 0.1} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={0}
        style={{ animation: `ttt-draw-o 0.35s ease-out forwards`, transformOrigin: `${cx}px ${cx}px`, transform: 'rotate(-90deg)' }}
      />
    </svg>
  )
}

// ── Thinking Dots ──────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: ACCENT2,
          animation: `ttt-thinking 1s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Win Line Overlay ───────────────────────────────────────────────────────────

function WinLineOverlay({ line, boardSize }: { line: number[]; boardSize: number }) {
  const cell = boardSize / 3
  const half = cell / 2

  const cx = (idx: number) => (idx % 3) * cell + half
  const cy = (idx: number) => Math.floor(idx / 3) * cell + half

  const [a, , c] = line
  const x1 = cx(a), y1 = cy(a), x2 = cx(c), y2 = cy(c)
  const len = Math.hypot(x2 - x1, y2 - y1) + 20

  return (
    <svg
      width={boardSize} height={boardSize}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
    >
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={ACCENT} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={0}
        opacity={0}
        style={{ animation: 'ttt-win-line 0.4s ease-out 0.1s forwards' }}
      />
    </svg>
  )
}

// ── Main TicTacToeGame ─────────────────────────────────────────────────────────

export default function TicTacToeGame({ onBack }: { onBack?: () => void }) {
  injectCSS('ttt-styles', CSS)

  const [board, setBoard]         = useState<Cell[]>(Array(9).fill(null))
  const [diff, setDiff]           = useState<DiffId>('medium')
  const [cpuThinking, setCpu]     = useState(false)
  const [scoreP, setScoreP]       = useState(0)
  const [scoreCpu, setScoreCpu]   = useState(0)
  const [draws, setDraws]         = useState(0)
  const [lastPlaced, setLast]     = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const result = checkWinner(board)
  const winner = result?.winner ?? null
  const winLine = result?.line ?? null
  const full = board.every(Boolean)
  const gameOver = !!(winner || full)

  const xCount = board.filter(v => v === 'X').length
  const oCount = board.filter(v => v === 'O').length
  const playerTurn = !gameOver && !cpuThinking

  // CPU move trigger
  useEffect(() => {
    if (xCount > oCount && !gameOver) {
      setCpu(true)
      const delay = diff === 'easy' ? 400 : diff === 'medium' ? 600 : 800
      timerRef.current = setTimeout(() => {
        setBoard(prev => {
          if (checkWinner(prev) || prev.every(Boolean)) return prev
          const move = bestMove(prev, diff)
          if (move === -1) return prev
          const next = [...prev] as Cell[]
          next[move] = 'O'
          setLast(move)

          const r = checkWinner(next)
          if (r?.winner === 'O') setScoreCpu(s => s + 1)
          return next
        })
        setCpu(false)
      }, delay)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  // Track draws
  useEffect(() => {
    if (full && !winner) setDraws(d => d + 1)
  }, [full, winner])

  const click = (i: number) => {
    if (board[i] || gameOver || !playerTurn) return
    const next = [...board] as Cell[]
    next[i] = 'X'
    setLast(i)
    const r = checkWinner(next)
    if (r?.winner === 'X') setScoreP(s => s + 1)
    setBoard(next)
  }

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setBoard(Array(9).fill(null))
    setCpu(false)
    setLast(null)
  }

  const resetAll = () => { reset(); setScoreP(0); setScoreCpu(0); setDraws(0) }

  const statusText = winner
    ? winner === 'X' ? 'Vous gagnez ! 🎉' : 'CPU gagne !'
    : full ? 'Égalité !'
    : cpuThinking ? '' : 'Votre tour'

  const statusColor = winner === 'X' ? '#22c55e' : winner === 'O' ? '#ef4444' : full ? '#f59e0b' : MUTED

  const BOARD_SIZE = 234
  const CELL = BOARD_SIZE / 3

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: BG, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: MUTED, display: 'flex', alignItems: 'center', padding: 4,
          }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <span style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>✖️ Morpion</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {cpuThinking ? <ThinkingDots /> : (
            <span style={{ color: statusColor, fontSize: 12, fontWeight: 700, animation: gameOver ? 'ttt-result-in 0.3s ease-out' : undefined }}>
              {statusText}
            </span>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px 0', flexShrink: 0,
      }}>
        {[
          { label: 'Vous', score: scoreP, color: ACCENT, mark: 'X' },
          { label: 'Nuls', score: draws,  color: MUTED,  mark: '–' },
          { label: 'CPU',  score: scoreCpu, color: ACCENT2, mark: 'O' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '10px 0',
            background: SURFACE2, border: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ color: s.color, fontSize: 15, fontWeight: 900 }}>{s.mark}</span>
            <span style={{
              color: TEXT, fontSize: 22, fontWeight: 900,
              animation: 'ttt-score-pop 0.3s ease-out',
              key: s.score,
            } as React.CSSProperties}>{s.score}</span>
            <span style={{ color: MUTED, fontSize: 10, fontWeight: 700 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Difficulty */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px 0', flexShrink: 0 }}>
        {DIFFS.map(d => (
          <button key={d.id} onClick={() => { setDiff(d.id); reset() }} style={{
            flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            background: diff === d.id ? ACCENT : SURFACE2,
            border: `1px solid ${diff === d.id ? ACCENT : BORDER}`,
            color: diff === d.id ? '#fff' : MUTED,
          }}>{d.label}</button>
        ))}
      </div>

      {/* Turn indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '12px 16px 8px', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px',
          borderRadius: 20,
          background: !gameOver && playerTurn ? 'rgba(168,85,247,0.12)' : 'transparent',
          border: `1px solid ${!gameOver && playerTurn ? ACCENT : 'transparent'}`,
          transition: 'all 0.2s',
          animation: !gameOver && playerTurn ? 'ttt-indicator-pulse 1.5s ease-in-out infinite' : undefined,
        }}>
          <span style={{ color: ACCENT, fontSize: 12, fontWeight: 800 }}>X</span>
          <span style={{ color: MUTED, fontSize: 11 }}>Vous</span>
        </div>
        <div style={{ color: MUTED, fontSize: 11 }}>vs</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px',
          borderRadius: 20,
          background: !gameOver && cpuThinking ? 'rgba(6,182,212,0.12)' : 'transparent',
          border: `1px solid ${!gameOver && cpuThinking ? ACCENT2 : 'transparent'}`,
          transition: 'all 0.2s',
          animation: !gameOver && cpuThinking ? 'ttt-indicator-pulse 1.5s ease-in-out infinite' : undefined,
        }}>
          <span style={{ color: ACCENT2, fontSize: 12, fontWeight: 800 }}>O</span>
          <span style={{ color: MUTED, fontSize: 11 }}>CPU</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ position: 'relative', width: BOARD_SIZE, height: BOARD_SIZE }}>
          {/* Grid lines */}
          <svg
            width={BOARD_SIZE} height={BOARD_SIZE}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          >
            {/* Vertical dividers */}
            {[1, 2].map(i => (
              <line
                key={`v${i}`}
                x1={CELL * i} y1={8} x2={CELL * i} y2={BOARD_SIZE - 8}
                stroke={BORDER} strokeWidth={2} strokeLinecap="round"
              />
            ))}
            {/* Horizontal dividers */}
            {[1, 2].map(i => (
              <line
                key={`h${i}`}
                x1={8} y1={CELL * i} x2={BOARD_SIZE - 8} y2={CELL * i}
                stroke={BORDER} strokeWidth={2} strokeLinecap="round"
              />
            ))}
          </svg>

          {/* Win line */}
          {winLine && <WinLineOverlay line={winLine} boardSize={BOARD_SIZE} />}

          {/* Cells */}
          {board.map((v, i) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            const isWin = winLine?.includes(i) ?? false
            const isLast = lastPlaced === i

            return (
              <button
                key={i}
                onClick={() => click(i)}
                style={{
                  position: 'absolute',
                  left: col * CELL + 4, top: row * CELL + 4,
                  width: CELL - 8, height: CELL - 8,
                  borderRadius: 12,
                  border: 'none',
                  background: isWin
                    ? 'rgba(168,85,247,0.15)'
                    : isLast
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                  cursor: playerTurn && !v ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                  transition: 'background 0.2s',
                  boxShadow: isWin ? '0 0 20px rgba(168,85,247,0.3)' : 'none',
                  animation: isWin ? 'ttt-win-pulse 1s ease-in-out infinite' : undefined,
                }}
              >
                {v === 'X' && <XMark size={CELL * 0.55} color={ACCENT} />}
                {v === 'O' && <OMark size={CELL * 0.55} color={ACCENT2} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 16px', flexShrink: 0 }}>
        <button onClick={reset} style={{
          flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
          background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>
          Nouvelle partie
        </button>
        <button onClick={resetAll} style={{
          flex: 1, padding: '11px 0', borderRadius: 10,
          border: `1px solid ${BORDER}`, background: 'transparent',
          color: MUTED, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Tout reset
        </button>
      </div>
    </div>
  )
}
