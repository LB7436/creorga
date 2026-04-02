import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

type Phase = 'idle'|'show'|'input'|'result'

function randNum(digits: number) {
  const min = Math.pow(10, digits-1)
  const max = Math.pow(10, digits)-1
  return String(Math.floor(Math.random()*(max-min+1)+min))
}

export default function NumberMemoryGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(0)
  const [target, setTarget] = useState('')
  const [input, setInput] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [correct, setCorrect] = useState<boolean|null>(null)

  const showTime = (lvl: number) => Math.max(1000, 3000 - lvl*150)

  const startRound = (lvl = level) => {
    const num = randNum(lvl)
    setTarget(num); setInput(''); setCorrect(null); setPhase('show')
    const ms = showTime(lvl)
    let t = Math.ceil(ms/1000)
    setCountdown(t)
    const iv = setInterval(()=>{ t--; setCountdown(t); if(t<=0) clearInterval(iv) }, 1000)
    setTimeout(()=>{ setPhase('input') }, ms)
  }

  const submit = () => {
    const ok = input === target
    setCorrect(ok)
    setPhase('result')
    if (ok) { const nl=level+1; setBest(b=>Math.max(b,nl)); setLevel(nl) }
    else { setLevel(1) }
  }

  const next = () => startRound(correct?level:1)
  const press = (d: string) => { if (input.length < 20) setInput(p=>p+d) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🧠 Mémoire des Chiffres</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>
          Niveau <span style={{color:TEXT}}>{level}</span> · Record <span style={{color:ACCENT}}>{best}</span>
        </div>
      </div>

      {phase==='idle' && (
        <div className="rounded-2xl p-8 text-center space-y-3" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <div className="text-4xl">🔢</div>
          <p style={{color:MUTED}}>Mémorisez le nombre affiché, puis retapez-le.</p>
          <button onClick={()=>startRound(1)} className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>Commencer</button>
        </div>
      )}

      {phase==='show' && (
        <div className="rounded-2xl p-8 text-center space-y-4" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <p className="text-xs" style={{color:MUTED}}>Mémorisez ce nombre · {countdown}s</p>
          <p className="font-black tracking-widest" style={{color:TEXT,fontSize:Math.max(24,48-level*2)}}>{target}</p>
          <div className="h-1 rounded-full overflow-hidden" style={{background:SURFACE2}}>
            <div className="h-full rounded-full" style={{background:ACCENT,width:`${(countdown/(Math.ceil(showTime(level)/1000)))*100}%`,transition:'width 1s linear'}}/>
          </div>
        </div>
      )}

      {phase==='input' && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
            <p className="text-xs mb-2" style={{color:MUTED}}>Quel était le nombre ?</p>
            <p className="font-black text-3xl tracking-widest min-h-10" style={{color:TEXT}}>{input||'—'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9].map(d=>(
              <button key={d} onClick={()=>press(String(d))}
                className="py-3 rounded-xl font-bold text-lg transition-all hover:opacity-80"
                style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>{d}</button>
            ))}
            <button onClick={()=>setInput(p=>p.slice(0,-1))} className="py-3 rounded-xl font-bold text-sm"
              style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:MUTED}}>⌫</button>
            <button onClick={()=>press('0')} className="py-3 rounded-xl font-bold text-lg"
              style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>0</button>
            <button onClick={submit} disabled={!input} className="py-3 rounded-xl font-bold text-sm"
              style={{background:input?ACCENT:SURFACE2,color:input?'#fff':MUTED,border:`1px solid ${input?'transparent':BORDER}`}}>OK</button>
          </div>
        </div>
      )}

      {phase==='result' && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 text-center space-y-2"
            style={{background:correct?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
              border:`1px solid ${correct?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`}}>
            <p className="font-black text-xl" style={{color:correct?'#22c55e':'#ef4444'}}>
              {correct?`✓ Correct ! Niveau ${level} 🎉`:'✗ Raté !'}
            </p>
            {!correct && <p className="text-sm" style={{color:MUTED}}>Le nombre était : <span style={{color:TEXT,fontWeight:'bold'}}>{target}</span></p>}
            {!correct && <p className="text-sm" style={{color:MUTED}}>Vous avez tapé : <span style={{color:'#ef4444'}}>{input}</span></p>}
          </div>
          <button onClick={next} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>
            {correct?'Niveau suivant →':'Réessayer'}
          </button>
        </div>
      )}
    </div>
  )
}
