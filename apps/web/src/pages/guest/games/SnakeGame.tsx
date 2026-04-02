import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const COLS = 16
const ROWS = 14
type Pos = { x: number; y: number }
type Dir = 'up'|'down'|'left'|'right'

function randPos(snake: Pos[]): Pos {
  let p: Pos
  do { p = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) } }
  while (snake.some(s => s.x===p.x && s.y===p.y))
  return p
}

export default function SnakeGame({ onBack }: { onBack: () => void }) {
  const initSnake = [{ x:8, y:7 }, { x:7, y:7 }, { x:6, y:7 }]
  const [snake, setSnake] = useState<Pos[]>(initSnake)
  const [food, setFood] = useState<Pos>(() => randPos(initSnake))
  const [, setDir] = useState<Dir>('right')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const dirRef = useRef<Dir>('right')

  const changeDir = useCallback((d: Dir) => {
    const opp: Record<Dir,Dir> = { up:'down', down:'up', left:'right', right:'left' }
    if (d !== opp[dirRef.current]) { dirRef.current = d; setDir(d) }
  }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const map: Record<string,Dir> = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' }
      if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [changeDir])

  useEffect(() => {
    if (!running || over) return
    const id = setInterval(() => {
      setSnake(prev => {
        const head = prev[0]
        const d = dirRef.current
        const next = {
          x: (head.x + (d==='right'?1:d==='left'?-1:0) + COLS) % COLS,
          y: (head.y + (d==='down'?1:d==='up'?-1:0) + ROWS) % ROWS,
        }
        if (prev.some(s => s.x===next.x && s.y===next.y)) {
          setOver(true); setRunning(false)
          setScore(s => { setBest(b => Math.max(b, s)); return s })
          return prev
        }
        let newSnake = [next, ...prev]
        setFood(f => {
          if (next.x===f.x && next.y===f.y) {
            setScore(s => s + 10)
            return randPos(newSnake)
          }
          newSnake = newSnake.slice(0, -1)
          return f
        })
        return newSnake
      })
    }, 140)
    return () => clearInterval(id)
  }, [running, over])

  const reset = () => {
    const s = [{ x:8, y:7 }, { x:7, y:7 }, { x:6, y:7 }]
    setSnake(s); setFood(randPos(s)); dirRef.current='right'; setDir('right')
    setScore(0); setOver(false); setRunning(false)
  }

  const cellSize = Math.floor(280 / COLS)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>🐍 Snake</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span style={{ color: MUTED }}>Score : <span style={{ color: TEXT }}>{score}</span></span>
          <span style={{ color: MUTED }}>Meilleur : <span style={{ color: ACCENT }}>{best}</span></span>
        </div>
      </div>

      {over && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
          Game Over ! Score : {score}
        </div>
      )}

      {/* Canvas-like grid */}
      <div className="rounded-2xl overflow-hidden mx-auto relative"
        style={{ background:'#0a0a18', border:`1px solid ${BORDER}`, width: COLS*cellSize, height: ROWS*cellSize }}>
        {!running && !over && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <button onClick={() => setRunning(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: ACCENT, color: '#fff' }}>▶ Démarrer</button>
          </div>
        )}
        {/* Food */}
        <div className="absolute rounded-full" style={{
          left: food.x * cellSize + 2, top: food.y * cellSize + 2,
          width: cellSize - 4, height: cellSize - 4, background: '#ef4444',
          boxShadow: '0 0 6px #ef4444',
        }}/>
        {/* Snake */}
        {snake.map((s,i) => (
          <div key={`${s.x}-${s.y}-${i}`} className="absolute rounded-sm transition-none" style={{
            left: s.x * cellSize + 1, top: s.y * cellSize + 1,
            width: cellSize - 2, height: cellSize - 2,
            background: i === 0 ? ACCENT : `rgba(168,85,247,${0.9 - i*0.02})`,
          }}/>
        ))}
      </div>

      {/* D-pad */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => changeDir('up')} className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: SURFACE2, border:`1px solid ${BORDER}`, color: TEXT }}><ChevronUp size={20}/></button>
        <div className="flex gap-1">
          <button onClick={() => changeDir('left')} className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: SURFACE2, border:`1px solid ${BORDER}`, color: TEXT }}><ChevronLeft size={20}/></button>
          <button onClick={() => changeDir('down')} className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: SURFACE2, border:`1px solid ${BORDER}`, color: TEXT }}><ChevronDown size={20}/></button>
          <button onClick={() => changeDir('right')} className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: SURFACE2, border:`1px solid ${BORDER}`, color: TEXT }}><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="flex gap-2">
        {running ? (
          <button onClick={() => setRunning(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: SURFACE2, border:`1px solid ${BORDER}`, color: TEXT }}>⏸ Pause</button>
        ) : !over ? (
          <button onClick={() => setRunning(true)} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: ACCENT, color:'#fff' }}>▶ {score > 0 ? 'Reprendre' : 'Démarrer'}</button>
        ) : null}
        <button onClick={reset} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: over?ACCENT:SURFACE2, border:`1px solid ${BORDER}`, color: over?'#fff':TEXT }}>
          🔄 Rejouer
        </button>
      </div>
    </div>
  )
}
