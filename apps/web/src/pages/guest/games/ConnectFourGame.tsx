import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, BG, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROWS = 6
const COLS = 7

type Cell = 0 | 1 | 2   // 0=empty 1=player 2=cpu
type Grid = Cell[][]
type DiffId = 'easy' | 'medium' | 'expert'

interface Diff { id: DiffId; label: string }

const DIFFS: Diff[] = [
  { id: 'easy',   label: 'Facile'  },
  { id: 'medium', label: 'Moyen'   },
  { id: 'expert', label: 'Expert'  },
]

const PLAYER_COLOR  = '#ef4444'
const CPU_COLOR     = '#eab308'
const BOARD_COLOR   = '#1e3a8a'
const BOARD_BORDER  = '#1d4ed8'

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes c4-drop {
  from { transform: translateY(var(--drop-from)); }
  to   { transform: translateY(0); }
}
@keyframes c4-win-pulse {
  0%,100% { filter: brightness(1) drop-shadow(0 0 4px currentColor); }
  50%     { filter: brightness(1.4) drop-shadow(0 0 12px currentColor); }
}
@keyframes c4-ghost-fade {
  0%,100% { opacity: 0.25; }
  50%     { opacity: 0.45; }
}
@keyframes c4-thinking-dot {
  0%,80%,100% { transform: scale(0.6); opacity: 0.3; }
  40%         { transform: scale(1.0); opacity: 1;   }
}
@keyframes c4-score-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes c4-result-in {
  from { transform: translateY(-8px) scale(0.95); opacity: 0; }
  to   { transform: translateY(0) scale(1);        opacity: 1; }
}
@keyframes c4-board-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes c4-col-hover {
  0%,100% { background: rgba(255,255,255,0.04); }
  50%     { background: rgba(255,255,255,0.08); }
}
`

function injectCSS(id: string, css: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = css
  document.head.appendChild(s)
}

// ── Grid helpers ───────────────────────────────────────────────────────────────

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[])
}

function dropRow(grid: Grid, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === 0) return r
  }
  return -1
}

function checkWin(grid: Grid, r: number, c: number, p: Cell): number[][] | null {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]]
  for (const [dr, dc] of dirs) {
    const cells: number[][] = [[r, c]]
    for (let d = 1; d < 4; d++) {
      const nr = r + dr * d, nc = c + dc * d
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === p) cells.push([nr, nc])
      else break
    }
    for (let d = 1; d < 4; d++) {
      const nr = r - dr * d, nc = c - dc * d
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === p) cells.push([nr, nc])
      else break
    }
    if (cells.length >= 4) return cells
  }
  return null
}

function isDraw(grid: Grid): boolean {
  return grid[0].every(c => c !== 0)
}

// ── AI — minimax with alpha-beta ───────────────────────────────────────────────

function scoreWindow(window: Cell[], p: Cell): number {
  const opp = p === 2 ? 1 : 2
  let score = 0
  const pCount = window.filter(c => c === p).length
  const emptyCount = window.filter(c => c === 0).length
  const oppCount = window.filter(c => c === opp).length

  if (pCount === 4) score += 100
  else if (pCount === 3 && emptyCount === 1) score += 5
  else if (pCount === 2 && emptyCount === 2) score += 2
  if (oppCount === 3 && emptyCount === 1) score -= 4

  return score
}

function scoreGrid(grid: Grid, p: Cell): number {
  let score = 0
  // Center column preference
  const centerCol = grid.map(r => r[Math.floor(COLS / 2)])
  score += centerCol.filter(c => c === p).length * 3

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const w = [grid[r][c], grid[r][c+1], grid[r][c+2], grid[r][c+3]] as Cell[]
      score += scoreWindow(w, p)
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const w = [grid[r][c], grid[r+1][c], grid[r+2][c], grid[r+3][c]] as Cell[]
      score += scoreWindow(w, p)
    }
  }
  // Diagonal /
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const w = [grid[r][c], grid[r+1][c+1], grid[r+2][c+2], grid[r+3][c+3]] as Cell[]
      score += scoreWindow(w, p)
    }
  }
  // Diagonal \
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const w = [grid[r][c], grid[r-1][c+1], grid[r-2][c+2], grid[r-3][c+3]] as Cell[]
      score += scoreWindow(w, p)
    }
  }
  return score
}

function isTerminal(grid: Grid): boolean {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== 0 && checkWin(grid, r, c, grid[r][c] as Cell)) return true
  return isDraw(grid)
}

function minimax(grid: Grid, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0 || isTerminal(grid)) {
    if (isTerminal(grid)) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (grid[r][c] !== 0) {
            const win = checkWin(grid, r, c, grid[r][c] as Cell)
            if (win) return grid[r][c] === 2 ? 100000 : -100000
          }
      return 0
    }
    return scoreGrid(grid, 2) - scoreGrid(grid, 1)
  }

  const validCols = Array.from({ length: COLS }, (_, i) => i).filter(c => dropRow(grid, c) >= 0)

  if (isMax) {
    let value = -Infinity
    for (const col of validCols) {
      const r = dropRow(grid, col)
      const g = grid.map(row => [...row]) as Grid
      g[r][col] = 2
      value = Math.max(value, minimax(g, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return value
  } else {
    let value = Infinity
    for (const col of validCols) {
      const r = dropRow(grid, col)
      const g = grid.map(row => [...row]) as Grid
      g[r][col] = 1
      value = Math.min(value, minimax(g, depth - 1, alpha, beta, true))
      beta = Math.min(beta, value)
      if (alpha >= beta) break
    }
    return value
  }
}

function aiMove(grid: Grid, diff: DiffId): number {
  const validCols = Array.from({ length: COLS }, (_, i) => i).filter(c => dropRow(grid, c) >= 0)
  if (validCols.length === 0) return 0

  if (diff === 'easy') {
    return validCols[Math.floor(Math.random() * validCols.length)]
  }

  // Always win or block immediately
  for (const col of validCols) {
    const r = dropRow(grid, col)
    const g = grid.map(row => [...row]) as Grid
    g[r][col] = 2
    if (checkWin(g, r, col, 2)) return col
  }
  for (const col of validCols) {
    const r = dropRow(grid, col)
    const g = grid.map(row => [...row]) as Grid
    g[r][col] = 1
    if (checkWin(g, r, col, 1)) return col
  }

  if (diff === 'medium') {
    // Prefer center, then random
    const center = Math.floor(COLS / 2)
    if (validCols.includes(center)) {
      if (Math.random() < 0.7) return center
    }
    return validCols[Math.floor(Math.random() * validCols.length)]
  }

  // Expert: minimax depth 6
  let bestVal = -Infinity
  let bestCol = validCols[Math.floor(Math.random() * validCols.length)]
  for (const col of validCols) {
    const r = dropRow(grid, col)
    const g = grid.map(row => [...row]) as Grid
    g[r][col] = 2
    const val = minimax(g, 5, -Infinity, Infinity, false)
    if (val > bestVal) { bestVal = val; bestCol = col }
  }
  return bestCol
}

// ── Thinking dots ──────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 6 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          display: 'inline-block',
          width: 5, height: 5, borderRadius: '50%',
          background: CPU_COLOR,
          animation: `c4-thinking-dot 1s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </span>
  )
}

// ── Disc ───────────────────────────────────────────────────────────────────────

interface DiscProps {
  player: Cell
  isWin: boolean
  isLast: boolean
  dropFromRow: number   // rows above landing (for drop animation)
  cellPx: number
}

function Disc({ player, isWin, isLast, dropFromRow, cellPx }: DiscProps) {
  const color = player === 1 ? PLAYER_COLOR : CPU_COLOR
  const dropPx = dropFromRow * cellPx

  return (
    <div style={{
      width: cellPx - 8, height: cellPx - 8,
      borderRadius: '50%',
      background: `radial-gradient(circle at 35% 30%, ${color}ee 0%, ${color} 45%, color-mix(in srgb, ${color} 60%, #000) 100%)`,
      boxShadow: isWin
        ? `0 0 0 2px ${color}, 0 0 14px ${color}99`
        : isLast
        ? `0 2px 8px ${color}66`
        : `inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.15)`,
      animation: dropFromRow > 0
        ? `c4-drop 0.35s cubic-bezier(0.215,0.610,0.355,1.000) forwards`
        : isWin
        ? `c4-win-pulse 0.8s ease-in-out infinite`
        : undefined,
      ['--drop-from' as string]: `-${dropPx}px`,
      transition: 'box-shadow 0.2s',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Shine */}
      <div style={{
        position: 'absolute', top: '18%', left: '20%',
        width: '35%', height: '28%', borderRadius: '50%',
        background: 'rgba(255,255,255,0.35)',
        transform: 'rotate(-30deg)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Main ConnectFourGame ───────────────────────────────────────────────────────

export default function ConnectFourGame({ onBack }: { onBack?: () => void }) {
  injectCSS('c4-styles', CSS)

  const [grid, setGrid]         = useState<Grid>(emptyGrid)
  const [diff, setDiff]         = useState<DiffId>('medium')
  const [winner, setWinner]     = useState<Cell>(0)
  const [winCells, setWinCells] = useState<number[][] | null>(null)
  const [draw, setDraw]         = useState(false)
  const [cpuThinking, setCpu]   = useState(false)
  const [lastCell, setLast]     = useState<[number,number] | null>(null)
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  const [scoreP, setScoreP]     = useState(0)
  const [scoreCpu, setScoreCpu] = useState(0)
  const [draws, setDraws]       = useState(0)
  // Track drop animations: map "r,c" -> dropFromRow count
  const [dropAnims, setDropAnims] = useState<Record<string, number>>({})

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameOver = winner !== 0 || draw

  // Count to detect whose turn
  const p1Count = grid.flat().filter(c => c === 1).length
  const p2Count = grid.flat().filter(c => c === 2).length
  const playerTurn = !gameOver && !cpuThinking

  // CPU trigger
  useEffect(() => {
    if (p1Count > p2Count && !gameOver) {
      setCpu(true)
      const delay = diff === 'easy' ? 500 : diff === 'medium' ? 700 : 1000
      timerRef.current = setTimeout(() => {
        setGrid(prev => {
          const col = aiMove(prev, diff)
          const r = dropRow(prev, col)
          if (r < 0) return prev
          const g = prev.map(row => [...row]) as Grid
          g[r][col] = 2
          setLast([r, col])
          setDropAnims(d => ({ ...d, [`${r},${col}`]: r + 1 }))

          const win = checkWin(g, r, col, 2)
          if (win) { setWinner(2); setWinCells(win); setScoreCpu(s => s + 1) }
          else if (isDraw(g)) { setDraw(true); setDraws(d => d + 1) }
          return g
        })
        setCpu(false)
      }, delay)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid])

  const drop = (col: number) => {
    if (gameOver || cpuThinking) return
    const r = dropRow(grid, col)
    if (r < 0) return

    const g = grid.map(row => [...row]) as Grid
    g[r][col] = 1
    setLast([r, col])
    setDropAnims(d => ({ ...d, [`${r},${col}`]: r + 1 }))

    const win = checkWin(g, r, col, 1)
    if (win) { setWinner(1); setWinCells(win); setScoreP(s => s + 1) }
    else if (isDraw(g)) { setDraw(true); setDraws(d => d + 1) }

    setGrid(g)
  }

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setGrid(emptyGrid())
    setWinner(0)
    setWinCells(null)
    setDraw(false)
    setCpu(false)
    setLast(null)
    setHoverCol(null)
    setDropAnims({})
  }

  const resetAll = () => { reset(); setScoreP(0); setScoreCpu(0); setDraws(0) }

  // ── Layout ──
  // Fit board into ~340px container
  const cellPx = 44
  const boardW = COLS * cellPx

  const statusText = winner === 1 ? 'Vous gagnez ! 🎉'
    : winner === 2 ? 'CPU gagne !'
    : draw ? 'Match nul !'
    : ''
  const statusColor = winner === 1 ? '#22c55e' : winner === 2 ? '#ef4444' : '#f59e0b'

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
        <span style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>🔴 Puissance 4</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {cpuThinking ? (
            <span style={{ color: CPU_COLOR, fontSize: 12, fontWeight: 700 }}>
              CPU réfléchit <ThinkingDots />
            </span>
          ) : gameOver ? (
            <span style={{ color: statusColor, fontSize: 12, fontWeight: 700, animation: 'c4-result-in 0.3s ease-out' }}>
              {statusText}
            </span>
          ) : (
            <span style={{ color: MUTED, fontSize: 12 }}>Votre tour</span>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', flexShrink: 0 }}>
        {[
          { label: 'Vous', score: scoreP,   color: PLAYER_COLOR, disc: true,  p: 1 },
          { label: 'Nuls', score: draws,    color: MUTED,        disc: false, p: 0 },
          { label: 'CPU',  score: scoreCpu, color: CPU_COLOR,    disc: true,  p: 2 },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '10px 0',
            background: SURFACE2, border: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          }}>
            {s.disc ? (
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: s.color,
                boxShadow: `0 0 6px ${s.color}88`,
              }} />
            ) : (
              <span style={{ color: MUTED, fontSize: 15, lineHeight: 1 }}>–</span>
            )}
            <span style={{
              color: TEXT, fontSize: 22, fontWeight: 900,
              animation: 'c4-score-pop 0.3s ease-out',
            }}>{s.score}</span>
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

      {/* Board area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '12px 16px',
        overflow: 'hidden',
      }}>
        {/* Ghost disc row — column preview */}
        <div style={{
          display: 'flex', width: boardW, marginBottom: 4, height: cellPx * 0.7,
        }}>
          {Array.from({ length: COLS }, (_, col) => {
            const colFull = dropRow(grid, col) < 0
            const isHover = hoverCol === col && playerTurn && !colFull

            return (
              <div key={col} style={{
                width: cellPx, height: cellPx * 0.7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isHover && (
                  <div style={{
                    width: cellPx - 12, height: cellPx - 12, borderRadius: '50%',
                    background: PLAYER_COLOR,
                    opacity: 0.3,
                    animation: 'c4-ghost-fade 0.8s ease-in-out infinite',
                    boxShadow: `0 0 8px ${PLAYER_COLOR}55`,
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Board */}
        <div
          style={{
            background: BOARD_COLOR,
            border: `2px solid ${BOARD_BORDER}`,
            borderRadius: 12,
            padding: 4,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
            animation: 'c4-board-in 0.3s ease-out',
            width: boardW + 8,
            overflow: 'hidden',
          }}
          onMouseLeave={() => setHoverCol(null)}
        >
          {grid.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((cell, c) => {
                const isWinCell = winCells?.some(([wr, wc]) => wr === r && wc === c) ?? false
                const isLastCell = lastCell?.[0] === r && lastCell?.[1] === c
                const dropFrom = dropAnims[`${r},${c}`] ?? 0

                return (
                  <div
                    key={c}
                    onClick={() => drop(c)}
                    onMouseEnter={() => { if (playerTurn) setHoverCol(c) }}
                    style={{
                      width: cellPx, height: cellPx,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: playerTurn && cell === 0 && dropRow(grid, c) >= 0 ? 'pointer' : 'default',
                      position: 'relative',
                    }}
                  >
                    {cell === 0 ? (
                      /* Empty hole */
                      <div style={{
                        width: cellPx - 8, height: cellPx - 8, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
                        transition: 'background 0.15s',
                      }} />
                    ) : (
                      <Disc
                        player={cell}
                        isWin={isWinCell}
                        isLast={isLastCell}
                        dropFromRow={dropFrom}
                        cellPx={cellPx}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Column tap buttons overlay (touch-friendly) */}
        <div style={{ display: 'flex', width: boardW + 8, marginTop: 2 }}>
          {Array.from({ length: COLS }, (_, col) => {
            const colFull = dropRow(grid, col) < 0
            return (
              <button
                key={col}
                onClick={() => drop(col)}
                disabled={gameOver || cpuThinking || colFull}
                style={{
                  flex: 1, height: 28, borderRadius: 6,
                  border: 'none',
                  background: hoverCol === col && playerTurn && !colFull
                    ? 'rgba(239,68,68,0.12)' : 'transparent',
                  cursor: playerTurn && !colFull ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  fontSize: 9, color: MUTED, fontWeight: 700,
                }}
                onMouseEnter={() => { if (playerTurn) setHoverCol(col) }}
                onMouseLeave={() => setHoverCol(null)}
              >
                {col + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Player indicators */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '0 16px 8px', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px',
          borderRadius: 20,
          background: playerTurn ? 'rgba(239,68,68,0.1)' : 'transparent',
          border: `1px solid ${playerTurn ? PLAYER_COLOR + '44' : 'transparent'}`,
          transition: 'all 0.2s',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: PLAYER_COLOR }} />
          <span style={{ color: MUTED, fontSize: 11 }}>Vous</span>
        </div>
        <span style={{ color: MUTED, fontSize: 11 }}>vs</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px',
          borderRadius: 20,
          background: cpuThinking ? 'rgba(234,179,8,0.1)' : 'transparent',
          border: `1px solid ${cpuThinking ? CPU_COLOR + '44' : 'transparent'}`,
          transition: 'all 0.2s',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: CPU_COLOR }} />
          <span style={{ color: MUTED, fontSize: 11 }}>CPU</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', flexShrink: 0 }}>
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
