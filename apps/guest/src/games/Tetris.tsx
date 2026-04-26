import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

/**
 * Tetris — 7 tetrominoes (I, O, T, S, Z, J, L), rotation, line clear, scoring.
 * Mobile-first: on-screen pad (←, →, rotate, ↓, drop). Keyboard arrows + space supported.
 */

const COLS = 10
const ROWS = 18
const CELL = 22
const TICK_MS_BASE = 700
const LEVEL_SPEEDUP = 60

type Cell = string | 0
type Board = Cell[][]
type Shape = number[][]
interface Piece { shape: Shape; color: string; x: number; y: number; type: string }

const PIECES: Record<string, { shape: Shape; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: '#22d3ee' },
  O: { shape: [[1, 1], [1, 1]], color: '#fbbf24' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a78bfa' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#10b981' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
}

const TYPES = Object.keys(PIECES)

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[])
}

function newPiece(): Piece {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]
  const def = PIECES[type]
  return {
    shape: def.shape.map((r) => [...r]),
    color: def.color,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0,
    type,
  }
}

function rotateMatrix(s: Shape): Shape {
  const rows = s.length, cols = s[0].length
  const out: Shape = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out[c][rows - 1 - r] = s[r][c]
  return out
}

function collide(board: Board, p: Piece, dx = 0, dy = 0, shape?: Shape): boolean {
  const s = shape || p.shape
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue
      const nx = p.x + c + dx, ny = p.y + r + dy
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  }
  return false
}

function merge(board: Board, p: Piece): Board {
  const next = board.map((r) => [...r])
  p.shape.forEach((row, r) => row.forEach((v, c) => {
    if (v && p.y + r >= 0) next[p.y + r][p.x + c] = p.color
  }))
  return next
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const remain = board.filter((row) => row.some((c) => !c))
  const cleared = ROWS - remain.length
  while (remain.length < ROWS) remain.unshift(Array(COLS).fill(0) as Cell[])
  return { board: remain, cleared }
}

export default function Tetris({ accent }: { accent: string }) {
  const [board, setBoard] = useState<Board>(emptyBoard)
  const [piece, setPiece] = useState<Piece>(newPiece)
  const [next, setNext] = useState<Piece>(newPiece)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [over, setOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const tickRef = useRef<number | null>(null)

  const drop = useCallback(() => {
    setPiece((p) => {
      if (!collide(board, p, 0, 1)) return { ...p, y: p.y + 1 }
      // lock
      const merged = merge(board, p)
      const { board: cleaned, cleared } = clearLines(merged)
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * level
        setScore((s) => s + points)
        setLines((l) => {
          const newLines = l + cleared
          setLevel(Math.floor(newLines / 10) + 1)
          return newLines
        })
      }
      setBoard(cleaned)
      const np = next
      setNext(newPiece())
      if (collide(cleaned, np, 0, 0)) {
        setOver(true)
        return p
      }
      return np
    })
  }, [board, next, level])

  // gravity tick
  useEffect(() => {
    if (over || paused) return
    const ms = Math.max(80, TICK_MS_BASE - (level - 1) * LEVEL_SPEEDUP)
    tickRef.current = window.setInterval(drop, ms)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [drop, level, over, paused])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over) return
      if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'ArrowRight') move(1)
      else if (e.key === 'ArrowDown') drop()
      else if (e.key === 'ArrowUp') rotate()
      else if (e.key === ' ') hardDrop()
      else if (e.key === 'p' || e.key === 'P') setPaused((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function move(dx: number) {
    setPiece((p) => collide(board, p, dx, 0) ? p : { ...p, x: p.x + dx })
  }
  function rotate() {
    setPiece((p) => {
      if (p.type === 'O') return p
      const rotated = rotateMatrix(p.shape)
      // wall kicks: try center, +1, -1, +2, -2
      for (const dx of [0, 1, -1, 2, -2]) {
        if (!collide(board, p, dx, 0, rotated)) return { ...p, x: p.x + dx, shape: rotated }
      }
      return p
    })
  }
  function hardDrop() {
    setPiece((p) => {
      let dy = 0
      while (!collide(board, p, 0, dy + 1)) dy++
      // immediate lock via state mutation effect
      const fall = { ...p, y: p.y + dy }
      const merged = merge(board, fall)
      const { board: cleaned, cleared } = clearLines(merged)
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * level
        setScore((s) => s + points + dy * 2)
        setLines((l) => {
          const newLines = l + cleared
          setLevel(Math.floor(newLines / 10) + 1)
          return newLines
        })
      } else {
        setScore((s) => s + dy * 2)
      }
      setBoard(cleaned)
      const np = next
      setNext(newPiece())
      if (collide(cleaned, np, 0, 0)) {
        setOver(true)
        return fall
      }
      return np
    })
  }

  function reset() {
    setBoard(emptyBoard())
    setPiece(newPiece())
    setNext(newPiece())
    setScore(0); setLines(0); setLevel(1)
    setOver(false); setPaused(false)
  }

  // Build display board with floating piece overlaid
  const display: Board = board.map((r) => [...r])
  piece.shape.forEach((row, r) => row.forEach((v, c) => {
    if (v && piece.y + r >= 0 && piece.y + r < ROWS && piece.x + c >= 0 && piece.x + c < COLS) {
      display[piece.y + r][piece.x + c] = piece.color
    }
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 360, width: '100%' }}>
      <div style={hud(accent)}>
        <div>
          <div style={hudLabel}>SCORE</div>
          <div style={hudValue('#fbbf24')}>{score}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={hudLabel}>LIGNES</div>
          <div style={hudValue(accent)}>{lines}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={hudLabel}>NIV.</div>
          <div style={hudValue('#10b981')}>{level}</div>
        </div>
      </div>

      {/* Board */}
      <div style={{
        position: 'relative',
        width: COLS * CELL, height: ROWS * CELL,
        background: '#0b0617', borderRadius: 8,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 30px ${accent}40`,
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
      }}>
        {display.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{
            width: CELL, height: CELL,
            background: cell || 'transparent',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            boxShadow: cell ? 'inset 0 0 4px rgba(0,0,0,0.4), inset 2px 2px 0 rgba(255,255,255,0.2)' : 'none',
          }} />
        )))}

        {over && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 32 }}>💀</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>Game Over</div>
            <div style={{ color: '#fbbf24', fontWeight: 700, marginTop: 4 }}>Score : {score}</div>
            <button onClick={reset} style={{
              marginTop: 12, padding: '10px 18px', borderRadius: 999, border: 'none',
              background: `linear-gradient(135deg, ${accent}, #ec4899)`,
              color: '#fff', fontWeight: 800, cursor: 'pointer',
            }}>🔄 Rejouer</button>
          </div>
        )}

        {paused && !over && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', borderRadius: 6, fontSize: 22, fontWeight: 800,
          }}>⏸ PAUSE</div>
        )}
      </div>

      {/* Next piece preview */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#94a3b8',
      }}>
        <span>SUIVANT :</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {next.shape.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 2 }}>
              {row.map((v, c) => (
                <div key={c} style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: v ? next.color : 'transparent',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Touch controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, width: '100%' }}>
        <PadBtn onClick={() => !over && move(-1)} accent={accent}>◀</PadBtn>
        <PadBtn onClick={() => !over && rotate()} accent={accent}>↻</PadBtn>
        <PadBtn onClick={() => !over && move(1)} accent={accent}>▶</PadBtn>
        <PadBtn onClick={() => !over && drop()} accent={accent}>▼</PadBtn>
        <PadBtn onClick={() => !over && hardDrop()} accent={accent}>⏬</PadBtn>
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button onClick={() => setPaused((p) => !p)} disabled={over}
          style={{
            flex: 1, padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: 12,
            opacity: over ? 0.5 : 1,
          }}>
          {paused ? '▶ Reprendre' : '⏸ Pause'}
        </button>
        <button onClick={reset} style={{
          flex: 1, padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 12,
        }}>🔄 Reset</button>
      </div>
    </div>
  )
}

function PadBtn({ children, onClick, accent }: any) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick}
      style={{
        padding: '14px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${accent}30, rgba(236,72,153,0.15))`,
        color: '#fff', fontWeight: 800, fontSize: 18,
        touchAction: 'manipulation',
      }}>
      {children}
    </motion.button>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between',
  padding: '10px 14px', borderRadius: 10,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 9, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 18, fontWeight: 800, color })
