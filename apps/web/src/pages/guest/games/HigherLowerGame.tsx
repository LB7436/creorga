import { useState } from 'react'
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, BORDER, TEXT, MUTED } from './theme'

const SUITS = ['♠','♥','♦','♣']
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
type Card = { rank: string; suit: string }
const isRed = (s:string)=>s==='♥'||s==='♦'
const val = (r:string)=>RANKS.indexOf(r)
const rand = ():Card=>({ rank:RANKS[Math.floor(Math.random()*13)], suit:SUITS[Math.floor(Math.random()*4)] })

export default function HigherLowerGame({ onBack }: { onBack: () => void }) {
  const [current, setCurrent] = useState<Card>(rand)
  const [next, setNext] = useState<Card|null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [streak, setStreak] = useState(0)
  const [result, setResult] = useState<'correct'|'wrong'|null>(null)

  const guess = (higher: boolean) => {
    const n = rand()
    setNext(n)
    const cv = val(current.rank), nv = val(n.rank)
    const correct = higher ? nv >= cv : nv <= cv
    setResult(correct?'correct':'wrong')
    setTimeout(()=>{
      if (correct) {
        const ns = score+1, st = streak+1
        setScore(ns); setStreak(st); setBest(b=>Math.max(b,ns))
        setCurrent(n); setNext(null); setResult(null)
      } else {
        setBest(b=>Math.max(b,score))
        setScore(0); setStreak(0); setCurrent(rand()); setNext(null); setResult(null)
      }
    }, 900)
  }

  const CardEl = ({c,label}:{c:Card;label:string}) => (
    <div className="rounded-2xl p-3 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
      <p className="text-xs mb-2" style={{color:MUTED}}>{label}</p>
      <div className="w-16 h-22 rounded-xl border-2 mx-auto flex flex-col items-center justify-center gap-1 font-bold"
        style={{background:'#fff',borderColor:'#e5e7eb',color:isRed(c.suit)?'#dc2626':'#111',minHeight:88}}>
        <span className="text-base">{c.rank}</span><span className="text-2xl">{c.suit}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>📈 Plus ou Moins</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>
          Score <span style={{color:TEXT}}>{score}</span> · Record <span style={{color:'#f59e0b'}}>{best}</span>
        </div>
      </div>

      {result && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:result==='correct'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
            border:`1px solid ${result==='correct'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
            color:result==='correct'?'#22c55e':'#ef4444'}}>
          {result==='correct'?'✓ Correct !':'✗ Raté !'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <CardEl c={current} label="Carte actuelle"/>
        <CardEl c={next||{rank:'?',suit:'?'}} label="Prochaine carte"/>
      </div>

      {streak>1 && <div className="text-center text-xs font-bold" style={{color:'#f59e0b'}}>🔥 Série de {streak} !</div>}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={()=>guess(true)} disabled={result!==null}
          className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{background:ACCENT,color:'#fff',opacity:result?0.5:1}}>
          <TrendingUp size={18}/> Plus haut
        </button>
        <button onClick={()=>guess(false)} disabled={result!==null}
          className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{background:ACCENT2,color:'#fff',opacity:result?0.5:1}}>
          <TrendingDown size={18}/> Plus bas
        </button>
      </div>
    </div>
  )
}
