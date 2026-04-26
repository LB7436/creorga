import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

/**
 * Démineur (Minesweeper) — 9×9 with 10 mines.
 * Left tap: reveal · Long press / right click / flag toggle: mark mine.
 * Recursive flood-fill on empty cells.
 */

const SIZE = 9
const MINES = 10

interface Cell { mine: boolean; revealed: boolean; flagged: boolean; n: number }

function createBoard(): Cell[][] {
  const b: Cell[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, n: 0 }))
  )
  let placed = 0
  while (placed < MINES) {
    const r = Math.floor(Math.random() * SIZE), c = Math.floor(Math.random() * SIZE)
    if (!b[r][c].mine) { b[r][c].mine = true; placed++ }
  }
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (b[r][c].mine) continue
    let n = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc].mine) n++
    }
    b[r][c].n = n
  }
  return b
}

const NUM_COLOR = ['', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#1f2937', '#6b7280']

export default function Demineur({ accent }: { accent: string }) {
  const [board, setBoard] = useState<Cell[][]>(createBoard)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [time, setTime] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || over || won) return
    const id = setInterval(() => setTime((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [running, over, won])

  // Win check
  useEffect(() => {
    let safe = 0
    for (const row of board) for (const c of row) if (!c.mine && c.revealed) safe++
    if (safe === SIZE * SIZE - MINES && !over) { setWon(true); setRunning(false) }
  }, [board, over])

  const reveal = (r: number, c: number) => {
    if (over || won) return
    if (!running) setRunning(true)
    if (flagMode) { toggleFlag(r, c); return }
    if (board[r][c].flagged || board[r][c].revealed) return
    if (board[r][c].mine) {
      const next = board.map((row) => row.map((x) => ({ ...x })))
      for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) if (next[i][j].mine) next[i][j].revealed = true
      setBoard(next); setOver(true); setRunning(false)
      return
    }
    const next = board.map((row) => row.map((x) => ({ ...x })))
    flood(next, r, c)
    setBoard(next)
  }

  const flood = (b: Cell[][], r: number, c: number) => {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return
    const cell = b[r][c]
    if (cell.revealed || cell.flagged || cell.mine) return
    cell.revealed = true
    if (cell.n === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        flood(b, r + dr, c + dc)
      }
    }
  }

  const toggleFlag = (r: number, c: number) => {
    if (over || won || board[r][c].revealed) return
    if (!running) setRunning(true)
    const next = board.map((row) => row.map((x) => ({ ...x })))
    next[r][c].flagged = !next[r][c].flagged
    setBoard(next)
  }

  const reset = () => {
    setBoard(createBoard())
    setOver(false); setWon(false); setTime(0); setRunning(false)
  }

  const flags = board.flat().filter((c) => c.flagged).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 360, width: '100%' }}>
      <div style={hud(accent)}>
        <div>
          <div style={hudLabel}>BOMBES</div>
          <div style={hudValue('#ef4444')}>💣 {MINES - flags}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={reset} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 28,
          }}>{won ? '😎' : over ? '😵' : '🙂'}</button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={hudLabel}>TEMPS</div>
          <div style={hudValue(accent)}>⏱ {time}s</div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2,
        padding: 6, background: '#0b0617', borderRadius: 8,
        border: `2px solid ${accent}`, boxShadow: `0 0 20px ${accent}30`,
      }}>
        {board.map((row, r) => row.map((cell, c) => {
          const handlePress = () => reveal(r, c)
          const handleContext = (e: React.MouseEvent) => { e.preventDefault(); toggleFlag(r, c) }
          return (
            <motion.button
              key={`${r}-${c}`}
              whileTap={{ scale: cell.revealed ? 1 : 0.92 }}
              onClick={handlePress}
              onContextMenu={handleContext}
              style={{
                width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: cell.revealed
                  ? cell.mine ? 'linear-gradient(135deg,#ef4444,#7f1d1d)' : 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg,#475569,#334155)',
                color: cell.mine ? '#fff' : NUM_COLOR[cell.n] || '#fff',
                fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: cell.revealed ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : '2px 2px 0 rgba(0,0,0,0.4)',
                touchAction: 'manipulation',
              }}>
              {cell.flagged && !cell.revealed ? '🚩'
                : cell.revealed
                  ? cell.mine ? '💣' : cell.n > 0 ? cell.n : ''
                  : ''}
            </motion.button>
          )
        }))}
      </div>

      {(over || won) && (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
          style={{
            padding: '10px 16px', borderRadius: 999,
            background: won ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: won ? '#10b981' : '#ef4444', fontWeight: 800,
          }}>
          {won ? `🏆 Gagné ! ${time}s` : '💥 Boom — perdu'}
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button onClick={() => setFlagMode((f) => !f)} style={{
          flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: flagMode ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(255,255,255,0.08)',
          color: '#fff', fontWeight: 700, fontSize: 12,
        }}>
          🚩 Mode drapeau {flagMode ? '· ON' : '· OFF'}
        </button>
        <button onClick={reset} style={{
          flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 12,
        }}>🔄 Nouvelle partie</button>
      </div>

      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
        Tap pour révéler · Mode drapeau pour marquer les bombes (long press / clic droit ok aussi)
      </p>
    </div>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 14px', borderRadius: 10,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 9, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 18, fontWeight: 800, color })
