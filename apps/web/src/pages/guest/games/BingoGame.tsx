import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

function makeCard(): number[][] {
  const cols = [
    shuffle(range(1,15)).slice(0,5),
    shuffle(range(16,30)).slice(0,5),
    shuffle(range(31,45)).slice(0,5),
    shuffle(range(46,60)).slice(0,5),
    shuffle(range(61,75)).slice(0,5),
  ]
  return Array.from({length:5},(_,r)=>cols.map(c=>c[r]))
}
function range(a:number,b:number){ return Array.from({length:b-a+1},(_,i)=>a+i) }
function shuffle<T>(a:T[]){ return [...a].sort(()=>Math.random()-0.5) }

function checkWin(card: number[][], called: Set<number>, free: Set<string>): boolean {
  const marked = (r:number,c:number)=> free.has(`${r},${c}`) || called.has(card[r][c])
  for(let i=0;i<5;i++){
    if([0,1,2,3,4].every(j=>marked(i,j))) return true // row
    if([0,1,2,3,4].every(j=>marked(j,i))) return true // col
  }
  if([0,1,2,3,4].every(i=>marked(i,i))) return true
  if([0,1,2,3,4].every(i=>marked(i,4-i))) return true
  return false
}

export default function BingoGame({ onBack }: { onBack: () => void }) {
  const [card] = useState(makeCard)
  const [called, setCalled] = useState<Set<number>>(new Set())
  const [won, setWon] = useState(false)
  const [lastCall, setLastCall] = useState<number|null>(null)
  const FREE = new Set(['2,2'])
  const COLS = ['B','I','N','G','O']

  const callNumber = () => {
    if (won) return
    const remaining = range(1,75).filter(n=>!called.has(n))
    if (!remaining.length) return
    const n = remaining[Math.floor(Math.random()*remaining.length)]
    const next = new Set(called); next.add(n)
    setCalled(next); setLastCall(n)
    if (checkWin(card, next, FREE)) setWon(true)
  }

  const reset = () => { setCalled(new Set()); setWon(false); setLastCall(null) }

  const isMarked = (r:number,c:number) => FREE.has(`${r},${c}`) || called.has(card[r][c])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🎰 Bingo</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>{called.size} numéros appelés</span>
      </div>

      {won && (
        <div className="rounded-xl p-3 text-center text-lg font-black"
          style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e'}}>
          🎉 BINGO ! Vous avez gagné !
        </div>
      )}

      {lastCall && !won && (
        <div className="rounded-xl p-3 text-center" style={{background:SURFACE2,border:`1px solid ${BORDER}`}}>
          <span className="text-xs" style={{color:MUTED}}>Dernier numéro : </span>
          <span className="text-2xl font-black" style={{color:ACCENT}}>{lastCall}</span>
        </div>
      )}

      {/* Card */}
      <div className="rounded-2xl overflow-hidden" style={{border:`1px solid ${BORDER}`}}>
        {/* Header */}
        <div className="grid grid-cols-5">
          {COLS.map(c=>(
            <div key={c} className="py-2 text-center font-black text-base" style={{background:ACCENT,color:'#fff'}}>{c}</div>
          ))}
        </div>
        {/* Cells */}
        {card.map((row,r)=>(
          <div key={r} className="grid grid-cols-5">
            {row.map((n,c)=>{
              const free = FREE.has(`${r},${c}`)
              const marked = isMarked(r,c)
              return (
                <div key={c} className="flex items-center justify-center font-bold text-sm transition-all"
                  style={{height:44,background:free?ACCENT:marked?'rgba(168,85,247,0.2)':SURFACE,
                    border:`1px solid ${BORDER}`,color:free?'#fff':marked?ACCENT:TEXT}}>
                  {free?'★':n}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={callNumber} disabled={won}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-80"
          style={{background:won?SURFACE2:ACCENT,border:`1px solid ${won?BORDER:'transparent'}`,color:won?MUTED:'#fff'}}>
          🎱 Appeler un numéro
        </button>
        <button onClick={reset} className="px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>🔄</button>
      </div>
    </div>
  )
}
