import { useState, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE2, BORDER, TEXT, MUTED } from './theme'

const BTNS = [
  { id:0, on:'#22c55e', off:'#14532d', label:'▲' },
  { id:1, on:'#ef4444', off:'#7f1d1d', label:'▶' },
  { id:2, on:'#eab308', off:'#713f12', label:'▼' },
  { id:3, on:'#3b82f6', off:'#1e3a8a', label:'◀' },
]

export default function SimonGame({ onBack }: { onBack: () => void }) {
  const [seq, setSeq] = useState<number[]>([])
  const [input, setInput] = useState<number[]>([])
  const [lit, setLit] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle'|'showing'|'input'|'over'>('idle')
  const [score, setBest] = useState({ cur: 0, best: 0 })
  const showing = useRef(false)

  const flash = (id: number, ms = 400) => new Promise<void>(res => {
    setLit(id); setTimeout(() => { setLit(null); setTimeout(res, 100) }, ms)
  })

  const playSeq = async (s: number[]) => {
    showing.current = true; setPhase('showing')
    await new Promise(r => setTimeout(r, 500))
    for (const id of s) await flash(id)
    showing.current = false; setPhase('input')
  }

  const start = () => {
    const first = Math.floor(Math.random() * 4)
    const newSeq = [first]
    setSeq(newSeq); setInput([])
    setBest(s => ({ ...s, cur: 0 }))
    playSeq(newSeq)
  }

  const press = async (id: number) => {
    if (phase !== 'input') return
    await flash(id, 200)
    const newInput = [...input, id]
    setInput(newInput)
    const idx = newInput.length - 1
    if (newInput[idx] !== seq[idx]) {
      setPhase('over')
      setBest(s => ({ cur: s.cur, best: Math.max(s.cur, s.best) }))
      return
    }
    if (newInput.length === seq.length) {
      const next = [...seq, Math.floor(Math.random() * 4)]
      setBest(s => ({ ...s, cur: next.length - 1 }))
      setSeq(next); setInput([])
      setTimeout(() => playSeq(next), 800)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>🔵 Simon</span>
        </div>
        <div className="text-xs" style={{ color: MUTED }}>
          Niveau <span style={{ color: TEXT }}>{score.cur}</span> · Record <span style={{ color: '#f59e0b' }}>{score.best}</span>
        </div>
      </div>

      {phase === 'over' && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
          Erreur ! Score : {score.cur}
        </div>
      )}

      <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
        {/* Center circle */}
        <div className="absolute z-10 rounded-full flex flex-col items-center justify-center gap-1"
          style={{ top:'35%', left:'35%', width:'30%', height:'30%', background: SURFACE2, border:`1px solid ${BORDER}` }}>
          {phase==='showing' && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:'#f59e0b' }}/>}
          {phase==='input' && <span className="text-[9px] font-bold" style={{ color: TEXT }}>{input.length}/{seq.length}</span>}
        </div>

        {BTNS.map((btn, i) => {
          const positions = [
            { top:0, left:'25%', width:'50%', height:'50%', borderRadius:'120px 120px 0 0' },
            { top:'25%', right:0, width:'50%', height:'50%', borderRadius:'0 120px 120px 0' },
            { bottom:0, left:'25%', width:'50%', height:'50%', borderRadius:'0 0 120px 120px' },
            { top:'25%', left:0, width:'50%', height:'50%', borderRadius:'120px 0 0 120px' },
          ]
          const isLit = lit === btn.id
          return (
            <button key={btn.id} onClick={() => press(btn.id)}
              className="absolute flex items-center justify-center text-white font-bold text-xl transition-all"
              style={{ ...positions[i], background: isLit ? btn.on : btn.off,
                boxShadow: isLit ? `0 0 20px ${btn.on}` : 'none',
                cursor: phase==='input'?'pointer':'default', border:'3px solid #0a0a18' }}>
              {btn.label}
            </button>
          )
        })}
      </div>

      {phase === 'showing' && <p className="text-center text-sm" style={{ color: MUTED }}>Observez la séquence…</p>}
      {phase === 'input' && <p className="text-center text-sm font-semibold" style={{ color: TEXT }}>À vous ! Reproduisez la séquence</p>}

      {(phase === 'idle' || phase === 'over') && (
        <button onClick={start} className="w-full py-2.5 rounded-xl font-bold text-sm"
          style={{ background:'#a855f7', color:'#fff' }}>
          {phase==='idle'?'▶ Démarrer':'🔄 Rejouer'}
        </button>
      )}
    </div>
  )
}
