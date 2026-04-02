import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const GOAL = 100

export default function PigGame({ onBack }: { onBack: () => void }) {
  const [pTotal, setPTotal] = useState(0)
  const [cTotal, setCTotal] = useState(0)
  const [turn, setTurn] = useState<'p'|'c'>('p')
  const [turnScore, setTurnScore] = useState(0)
  const [lastRoll, setLastRoll] = useState<number|null>(null)
  const [msg, setMsg] = useState('')
  const [over, setOver] = useState(false)

  const diceFace = ['','⚀','⚁','⚂','⚃','⚄','⚅']

  const cpuTurn = (ct: number) => {
    let score = 0
    const doRoll = () => {
      const d = Math.ceil(Math.random()*6)
      setLastRoll(d)
      if (d===1) { setMsg('CPU tire 1 — perd son tour !'); setTurn('p'); setTurnScore(0); return }
      score += d
      if (ct+score>=GOAL) { setCTotal(ct+score); setOver(true); setMsg(`CPU gagne avec ${ct+score} ! 😞`); return }
      if (score>=20||Math.random()<0.3) {
        setCTotal(ct+score); setMsg(`CPU banque ${score} pts → ${ct+score} total`); setTurn('p'); setTurnScore(0)
      } else { setTimeout(doRoll, 700) }
    }
    setTimeout(doRoll, 800)
  }

  const roll = () => {
    if (over||turn!=='p') return
    const d = Math.ceil(Math.random()*6)
    setLastRoll(d)
    if (d===1) { setMsg('😱 Vous tirez 1 — tour perdu !'); setTurnScore(0); setTurn('c'); setTimeout(()=>cpuTurn(cTotal),900) }
    else {
      const ns = turnScore+d
      setTurnScore(ns)
      setMsg(`Vous tirez ${d} — total ce tour : ${ns}`)
      if (pTotal+ns>=GOAL) { setPTotal(pTotal+ns); setOver(true); setMsg(`🎉 Vous gagnez avec ${pTotal+ns} !`) }
    }
  }

  const bank = () => {
    if (turnScore===0||turn!=='p'||over) return
    const ns = pTotal+turnScore
    setPTotal(ns); setTurnScore(0)
    if (ns>=GOAL) { setOver(true); setMsg(`🎉 Vous gagnez avec ${ns} !`); return }
    setMsg(`Banqué ${turnScore} pts → ${ns} total`); setTurn('c')
    setTimeout(()=>cpuTurn(cTotal), 500)
  }

  const reset = ()=>{ setPTotal(0);setCTotal(0);setTurn('p');setTurnScore(0);setLastRoll(null);setMsg('');setOver(false) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🐷 Pig Dice</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>Premier à {GOAL} pts</span>
      </div>

      {/* Progress bars */}
      <div className="space-y-2">
        {[{label:'Vous',score:pTotal,active:turn==='p',color:ACCENT},{label:'CPU',score:cTotal,active:turn==='c',color:'#06b6d4'}].map(p=>(
          <div key={p.label}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{color:p.active?TEXT:MUTED}}>{p.label} {p.active&&!over?'◀':''}</span>
              <span style={{color:p.active?TEXT:MUTED}}>{p.score}/{GOAL}</span>
            </div>
            <div className="rounded-full h-2 overflow-hidden" style={{background:SURFACE2}}>
              <div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.min(p.score/GOAL*100,100)}%`,background:p.color}}/>
            </div>
          </div>
        ))}
      </div>

      {lastRoll!==null && (
        <div className="text-6xl text-center py-2">{diceFace[lastRoll]}</div>
      )}

      {turnScore>0 && turn==='p' && (
        <div className="text-center text-sm font-bold" style={{color:'#f59e0b'}}>Score ce tour : +{turnScore}</div>
      )}

      {msg && <div className="rounded-xl p-2.5 text-center text-sm" style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>{msg}</div>}

      {!over && (
        <div className="flex gap-2">
          <button onClick={roll} disabled={turn!=='p'}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{background:turn==='p'?ACCENT:SURFACE2,color:turn==='p'?'#fff':MUTED,border:`1px solid ${BORDER}`,opacity:turn==='p'?1:0.5}}>
            🎲 Lancer
          </button>
          <button onClick={bank} disabled={turn!=='p'||turnScore===0}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{background:turn==='p'&&turnScore>0?'#22c55e':SURFACE2,color:turn==='p'&&turnScore>0?'#fff':MUTED,
              border:`1px solid ${BORDER}`,opacity:turn==='p'&&turnScore>0?1:0.5}}>
            🏦 Banquer
          </button>
        </div>
      )}

      {over && <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>Nouvelle partie</button>}
    </div>
  )
}
