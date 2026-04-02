import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

type Grid = (number | 0)[][]

const TILE_COLORS: Record<number, { bg: string; color: string }> = {
  0:    { bg: 'rgba(255,255,255,0.05)', color: 'transparent' },
  2:    { bg: '#eee4da', color: '#776e65' },
  4:    { bg: '#ede0c8', color: '#776e65' },
  8:    { bg: '#f2b179', color: '#fff' },
  16:   { bg: '#f59563', color: '#fff' },
  32:   { bg: '#f67c5f', color: '#fff' },
  64:   { bg: '#f65e3b', color: '#fff' },
  128:  { bg: '#edcf72', color: '#fff' },
  256:  { bg: '#edcc61', color: '#fff' },
  512:  { bg: '#edc850', color: '#fff' },
  1024: { bg: '#edc53f', color: '#fff' },
  2048: { bg: '#edc22e', color: '#fff' },
}

function emptyGrid(): Grid { return Array.from({ length: 4 }, () => Array(4).fill(0)) }

function addRandom(grid: Grid): Grid {
  const empty: [number,number][] = []
  grid.forEach((row,r) => row.forEach((v,c) => { if (!v) empty.push([r,c]) }))
  if (!empty.length) return grid
  const [r,c] = empty[Math.floor(Math.random() * empty.length)]
  const next = grid.map(row => [...row]) as Grid
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function initGrid(): Grid { return addRandom(addRandom(emptyGrid())) }

function slideLeft(row: number[]): { row: number[]; score: number } {
  const nums = row.filter(v => v)
  let score = 0
  const merged: number[] = []
  let i = 0
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i+1]) {
      merged.push(nums[i] * 2)
      score += nums[i] * 2
      i += 2
    } else {
      merged.push(nums[i])
      i++
    }
  }
  return { row: [...merged, ...Array(4 - merged.length).fill(0)], score }
}

function move(grid: Grid, dir: 'up'|'down'|'left'|'right'): { grid: Grid; score: number } {
  let g = grid.map(r => [...r]) as Grid
  let score = 0

  if (dir === 'left') {
    g = g.map(row => { const r = slideLeft(row); score += r.score; return r.row })
  } else if (dir === 'right') {
    g = g.map(row => { const rev = slideLeft([...row].reverse()); score += rev.score; return rev.row.reverse() })
  } else if (dir === 'up') {
    for (let c = 0; c < 4; c++) {
      const col = [g[0][c],g[1][c],g[2][c],g[3][c]]
      const r = slideLeft(col); score += r.score
      r.row.forEach((v,i) => { g[i][c] = v })
    }
  } else {
    for (let c = 0; c < 4; c++) {
      const col = [g[3][c],g[2][c],g[1][c],g[0][c]]
      const r = slideLeft(col); score += r.score
      r.row.forEach((v,i) => { g[3-i][c] = v })
    }
  }
  return { grid: g, score }
}

function isOver(grid: Grid): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return false
      if (c < 3 && grid[r][c] === grid[r][c+1]) return false
      if (r < 3 && grid[r][c] === grid[r+1][c]) return false
    }
  return true
}

export default function Game2048({ onBack }: { onBack: () => void }) {
  const [grid, setGrid] = useState<Grid>(initGrid)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)

  const applyMove = useCallback((dir: 'up'|'down'|'left'|'right') => {
    if (over) return
    setGrid(g => {
      const res = move(g, dir)
      const changed = JSON.stringify(res.grid) !== JSON.stringify(g)
      if (!changed) return g
      const next = addRandom(res.grid)
      setScore(s => {
        const ns = s + res.score
        setBest(b => Math.max(b, ns))
        return ns
      })
      if (next.some(row => row.includes(2048))) setWon(true)
      if (isOver(next)) setOver(true)
      return next
    })
  }, [over])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') applyMove('up')
      if (e.key === 'ArrowDown') applyMove('down')
      if (e.key === 'ArrowLeft') applyMove('left')
      if (e.key === 'ArrowRight') applyMove('right')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [applyMove])

  const reset = () => { setGrid(initGrid()); setScore(0); setOver(false); setWon(false) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>🔢 2048</span>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg" style={{ background: SURFACE2, color: MUTED }}>Score <span style={{ color: TEXT }}>{score}</span></div>
          <div className="px-2.5 py-1 rounded-lg" style={{ background: SURFACE2, color: MUTED }}>Meilleur <span style={{ color: ACCENT }}>{best}</span></div>
        </div>
      </div>

      {(over || won) && (
        <div className="rounded-xl p-3 text-center font-bold text-sm"
          style={{ background: won ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${won ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
            color: won ? '#22c55e' : '#ef4444' }}>
          {won ? '🎉 Vous avez atteint 2048 !' : 'Partie terminée !'}
        </div>
      )}

      {/* Grid */}
      <div className="rounded-2xl p-2" style={{ background: '#bbada0' }}>
        <div className="grid grid-cols-4 gap-1.5">
          {grid.flat().map((v, i) => {
            const tc = TILE_COLORS[v] || { bg: '#3c3a32', color: '#fff' }
            return (
              <div key={i} className="aspect-square rounded-lg flex items-center justify-center font-black text-sm transition-all"
                style={{ background: tc.bg, color: tc.color, fontSize: v >= 1024 ? 11 : v >= 128 ? 14 : 18 }}>
                {v || ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* D-pad */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => applyMove('up')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}><ChevronUp size={20}/></button>
        <div className="flex gap-1">
          <button onClick={() => applyMove('left')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}><ChevronLeft size={20}/></button>
          <button onClick={() => applyMove('down')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}><ChevronDown size={20}/></button>
          <button onClick={() => applyMove('right')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}><ChevronRight size={20}/></button>
        </div>
      </div>

      <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: ACCENT, color: '#fff' }}>
        Nouvelle partie
      </button>
    </div>
  )
}
