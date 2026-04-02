import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

type Phase = 'idle'|'waiting'|'ready'|'result'|'early'

export default function ReactionGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [time, setTime] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const start = () => {
    setPhase('waiting')
    const delay = 2000 + Math.random() * 4000
    timerRef.current = setTimeout(()=>{ setPhase('ready'); startRef.current = Date.now() }, delay)
  }

  const click = () => {
    if (phase==='waiting') {
      clearTimeout(timerRef.current); setPhase('early'); return
    }
    if (phase==='ready') {
      const ms = Date.now()-startRef.current
      setTime(ms); setScores(s=>[...s,ms].slice(-5)); setPhase('result')
    }
    if (phase==='idle'||phase==='result'||phase==='early') start()
  }

  useEffect(()=>()=>clearTimeout(timerRef.current), [])

  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0
  const best = scores.length ? Math.min(...scores) : 0

  const bgColor = phase==='ready'?'#22c55e':phase==='waiting'?'#ef4444':phase==='early'?'#f59e0b':SURFACE2
  const label = phase==='idle'?'Cliquez pour commencer'
    :phase==='waiting'?'Attendez le vert…'
    :phase==='ready'?'CLIQUEZ !'
    :phase==='early'?'Trop tôt ! Cliquez pour réessayer'
    :`${time} ms — Cliquez pour rejouer`

  const rating = (ms:number) => ms<200?'⚡ Éclair!':ms<300?'🔥 Excellent':ms<400?'✓ Bien':ms<500?'~ Moyen':'🐌 Lent'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>⚡ Réaction</span>
        </div>
        {scores.length>0 && (
          <div className="text-xs" style={{color:MUTED}}>
            Moy <span style={{color:TEXT}}>{avg}ms</span> · Meilleur <span style={{color:ACCENT}}>{best}ms</span>
          </div>
        )}
      </div>

      <button onClick={click} className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all"
        style={{height:200,background:bgColor,border:`2px solid ${bgColor}`,cursor:'pointer'}}>
        <span className="text-5xl">{phase==='ready'?'🟢':phase==='waiting'?'🔴':phase==='early'?'🟡':'👆'}</span>
        <span className="font-bold text-sm text-center px-4" style={{color:phase==='waiting'?'#fff':phase==='ready'?'#fff':TEXT}}>
          {label}
        </span>
        {phase==='result' && <span className="text-lg font-black" style={{color:'#fff'}}>{rating(time)}</span>}
      </button>

      {scores.length>0 && (
        <div className="rounded-2xl p-3 space-y-2" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <p className="text-xs font-semibold" style={{color:MUTED}}>Derniers essais</p>
          <div className="flex gap-2 flex-wrap">
            {scores.map((s,i)=>(
              <div key={i} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:s===best?ACCENT:TEXT}}>
                {s}ms {s===best?'🏆':''}
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs pt-1" style={{color:MUTED}}>
            <span>Moyenne : <b style={{color:TEXT}}>{avg}ms</b></span>
            <span>Meilleur : <b style={{color:ACCENT}}>{best}ms</b></span>
          </div>
        </div>
      )}
      <p className="text-center text-[10px]" style={{color:MUTED}}>Temps de réaction humain moyen : 250ms</p>
    </div>
  )
}
