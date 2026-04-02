import { useState } from 'react'
import { ChevronLeft, Flag, Bomb } from 'lucide-react'
import { ACCENT, BORDER, TEXT, MUTED } from './theme'

const ROWS = 9, COLS = 9, MINES = 12

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number }
type Grid = Cell[][]

function makeGrid(firstR: number, firstC: number): Grid {
  const mines = new Set<string>()
  while (mines.size < MINES) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    if (Math.abs(r-firstR)<=1 && Math.abs(c-firstC)<=1) continue
    mines.add(`${r},${c}`)
  }
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      mine: mines.has(`${r},${c}`),
      revealed: false, flagged: false,
      adj: [-1,-1,-1,0,-1,1,0,-1,0,1,1,-1,1,0,1,1]
        .reduce((acc,_,i,a) => i%2===0 ? acc + (mines.has(`${r+a[i]},${c+a[i+1]}`) ? 1 : 0) : acc, 0)
    }))
  )
}

function reveal(grid: Grid, r: number, c: number): Grid {
  if (r<0||r>=ROWS||c<0||c>=COLS) return grid
  const cell = grid[r][c]
  if (cell.revealed || cell.flagged) return grid
  const next = grid.map(row => row.map(c => ({ ...c })))
  next[r][c].revealed = true
  if (next[r][c].adj === 0 && !next[r][c].mine) {
    for (let dr=-1; dr<=1; dr++)
      for (let dc=-1; dc<=1; dc++)
        if (dr||dc) reveal(next, r+dr, c+dc).forEach((row,i) => { next[i] = row })
  }
  return next
}

const ADJ_COLORS = ['','#3b82f6','#22c55e','#ef4444','#7c3aed','#dc2626','#06b6d4','#111','#6b7280']

export default function MinesweeperGame({ onBack }: { onBack: () => void }) {
  const [grid, setGrid] = useState<Grid | null>(null)
  const [started, setStarted] = useState(false)
  const [over, setOver] = useState<'win'|'lose'|null>(null)
  const [flags, setFlags] = useState(0)

  const click = (r: number, c: number) => {
    if (over) return
    if (!started) {
      setStarted(true)
      const g = makeGrid(r, c)
      setGrid(reveal(g, r, c))
      return
    }
    if (!grid) return
    const cell = grid[r][c]
    if (cell.revealed || cell.flagged) return
    if (cell.mine) {
      // Reveal all mines
      const next = grid.map((row, ri) => row.map((c2, ci) => ({
        ...c2, revealed: ri===r&&ci===c ? true : c2.revealed || c2.mine
      })))
      setGrid(next); setOver('lose'); return
    }
    const next = reveal(grid, r, c)
    setGrid(next)
    const hidden = next.flat().filter(c2 => !c2.revealed && !c2.mine).length
    if (hidden === 0) setOver('win')
  }

  const flag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (!started || over || !grid) return
    const cell = grid[r][c]
    if (cell.revealed) return
    const next = grid.map((row,ri) => row.map((c2,ci) => ri===r&&ci===c ? {...c2,flagged:!c2.flagged} : c2))
    setGrid(next)
    setFlags(f => cell.flagged ? f-1 : f+1)
  }

  const reset = () => { setGrid(null); setStarted(false); setOver(null); setFlags(0) }

  const cellSize = Math.floor(280 / COLS)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>💣 Démineur</span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
          <span><Flag size={11} className="inline mr-0.5"/>{flags}/{MINES}</span>
          <span><Bomb size={11} className="inline mr-0.5"/>{MINES}</span>
        </div>
      </div>

      {over && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{ background: over==='win'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
            border:`1px solid ${over==='win'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
            color: over==='win'?'#22c55e':'#ef4444' }}>
          {over==='win' ? '🎉 Bravo ! Toutes les mines évitées !' : '💥 Boom ! Vous avez touché une mine !'}
        </div>
      )}

      {!started && !grid && (
        <div className="text-center py-2 text-xs" style={{ color: MUTED }}>Cliquez sur une case pour commencer</div>
      )}

      <div className="rounded-2xl overflow-hidden mx-auto" style={{ width: COLS*cellSize, border:`1px solid ${BORDER}` }}>
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="flex">
            {Array.from({ length: COLS }, (_, c) => {
              const cell = grid?.[r]?.[c]
              const revealed = cell?.revealed
              const flagged = cell?.flagged
              const mine = cell?.mine
              const adj = cell?.adj ?? 0
              return (
                <button key={c}
                  onClick={() => click(r, c)}
                  onContextMenu={e => flag(e, r, c)}
                  className="flex items-center justify-center font-bold transition-colors"
                  style={{
                    width: cellSize, height: cellSize, fontSize: cellSize * 0.45,
                    background: revealed ? (mine ? '#dc2626' : r%2===c%2 ? '#e8d5b7' : '#d4bc98') : (r%2===c%2?'#8fbc7e':'#7aaa6b'),
                    color: revealed ? ADJ_COLORS[adj] : 'transparent',
                    cursor: revealed ? 'default' : 'pointer',
                    border: 'none',
                  }}>
                  {revealed && mine ? '💣' : flagged ? '🚩' : revealed && adj > 0 ? adj : ''}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-center text-[10px]" style={{ color: MUTED }}>Clic droit (ou appui long) pour placer un drapeau</p>

      <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm"
        style={{ background: ACCENT, color: '#fff' }}>Nouvelle partie</button>
    </div>
  )
}
