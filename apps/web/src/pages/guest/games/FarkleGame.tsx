import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

function rollDice(n: number) { return Array.from({length:n},()=>Math.ceil(Math.random()*6)) }

function calcScore(dice: number[]): number {
  const c = Array(7).fill(0); dice.forEach(d=>c[d]++)
  let s = 0
  for (let v=1;v<=6;v++) {
    if(c[v]>=3) { s += v===1?1000:v*100; c[v]-=3 }
  }
  s += c[1]*100 + c[5]*50
  return s
}

const TARGET = 5000

export default function FarkleGame({ onBack }: { onBack: () => void }) {
  const [pScore, setPScore] = useState(0)
  const [cScore, setCScore] = useState(0)
  const [turn, setTurn] = useState<'p'|'c'>('p')
  const [dice, setDice] = useState<number[]>([])
  const [held, setHeld] = useState<boolean[]>([])
  const [turnScore, setTurnScore] = useState(0)
  const [msg, setMsg] = useState('Lancez les dés pour commencer !')
  const [over, setOver] = useState(false)

  const roll = () => {
    const activeDice = dice.filter((_,i)=>!held[i])
    const numToRoll = activeDice.length || 6
    const newDice = dice.map((d,i)=>held[i]?d:0)
    const rolled = rollDice(numToRoll)
    let ri=0
    const finalDice = newDice.map(v=>v===0?rolled[ri++]:v)
    const freeIdx = finalDice.map((_,i)=>!held[i])
    const freeDice = finalDice.filter((_,i)=>freeIdx[i])
    const s = calcScore(freeDice)
    if (s===0) {
      setMsg(`💀 Farkle ! Tour perdu.`); setTurnScore(0)
      setTimeout(()=>{ setDice([]); setHeld([]); setTurnScore(0); switchTurn() }, 1200)
    } else {
      setDice(finalDice); setHeld(new Array(finalDice.length).fill(false))
      setTurnScore(ts=>ts+s); setMsg(`+${s} pts ce lancer — tenez ou relancez`)
    }
  }

  const switchTurn = () => {
    if (turn==='p') {
      setTurn('c'); setMsg('Tour CPU…')
      setTimeout(()=>{
        const s = Math.floor(Math.random()*800+300)
        setCScore(cs=>{ const ns=cs+s; if(ns>=TARGET){setOver(true);setMsg('CPU gagne 😞')}; return ns })
        setTurn('p'); setMsg('Votre tour !')
      }, 1000)
    } else { setTurn('p'); setMsg('Votre tour !') }
  }

  const bank = () => {
    if (turnScore===0) return
    const ns = pScore + turnScore
    setPScore(ns); setTurnScore(0); setDice([]); setHeld([])
    if (ns>=TARGET) { setOver(true); setMsg(`🏆 Vous gagnez avec ${ns} points !`) }
    else { setMsg(`Banqué ${turnScore} pts → total ${ns}`); switchTurn() }
  }

  const reset = ()=>{ setPScore(0);setCScore(0);setTurn('p');setDice([]);setHeld([]);setTurnScore(0);setMsg('Lancez les dés pour commencer !');setOver(false) }
  const diceFace = ['','⚀','⚁','⚂','⚃','⚄','⚅']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🎲 Farkle</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>Objectif : {TARGET}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl p-2" style={{background:turn==='p'?'rgba(168,85,247,0.15)':SURFACE,border:`1px solid ${turn==='p'?ACCENT:BORDER}`}}>
          <p className="text-xs" style={{color:MUTED}}>Vous</p>
          <p className="font-black text-xl" style={{color:TEXT}}>{pScore}</p>
        </div>
        <div className="rounded-xl p-2" style={{background:turn==='c'?'rgba(6,182,212,0.15)':SURFACE,border:`1px solid ${turn==='c'?'#06b6d4':BORDER}`}}>
          <p className="text-xs" style={{color:MUTED}}>CPU</p>
          <p className="font-black text-xl" style={{color:TEXT}}>{cScore}</p>
        </div>
      </div>

      <div className="rounded-xl p-2.5 text-center text-sm" style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>{msg}</div>

      {turnScore>0 && <div className="text-center text-xs font-bold" style={{color:'#f59e0b'}}>Score ce tour : +{turnScore}</div>}

      {dice.length>0 && (
        <div className="flex justify-center gap-2">
          {dice.map((d,i)=>(
            <button key={i} onClick={()=>{ if(over||turn!=='p') return; setHeld(h=>h.map((v,j)=>j===i?!v:v)) }}
              className="text-3xl w-12 h-12 rounded-xl flex items-center justify-center"
              style={{background:held[i]?'rgba(168,85,247,0.2)':SURFACE2,border:`2px solid ${held[i]?ACCENT:BORDER}`}}>
              {diceFace[d]}
            </button>
          ))}
        </div>
      )}

      {!over && turn==='p' && (
        <div className="flex gap-2">
          <button onClick={roll} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>
            🎲 Lancer
          </button>
          <button onClick={bank} disabled={turnScore===0} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{background:turnScore>0?'#22c55e':SURFACE2,color:turnScore>0?'#fff':MUTED,border:`1px solid ${BORDER}`,opacity:turnScore>0?1:0.5}}>
            🏦 Banquer
          </button>
        </div>
      )}

      {over && <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>Nouvelle partie</button>}
      <p className="text-center text-[10px]" style={{color:MUTED}}>1=100pts · 5=50pts · 3×=valeur×100 · 3×1=1000pts</p>
    </div>
  )
}
