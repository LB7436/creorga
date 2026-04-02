import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// 421: goal is to score 4-2-1 with 3 dice (up to 3 rolls, keep dice each time)
// Scoring: 421=highest, 111=second, 666=third, pairs with leftover, etc.

function scoreHand(d: number[]): { label: string; value: number } {
  const s = [...d].sort((a,b)=>b-a)
  if (s[0]===4&&s[1]===2&&s[2]===1) return { label:'421 🏆', value:1000 }
  if (s[0]===1&&s[1]===1&&s[2]===1) return { label:'111', value:900 }
  if (s[0]===s[1]&&s[1]===s[2]) return { label:`${s[0]}${s[1]}${s[2]}`, value:800+s[0] }
  if (s[0]===s[1]) return { label:`Paire de ${s[0]} + ${s[2]}`, value:500+s[0]*10+s[2] }
  if (s[1]===s[2]) return { label:`Paire de ${s[1]} + ${s[0]}`, value:500+s[1]*10+s[0] }
  return { label:s.join('-'), value:s[0]*100+s[1]*10+s[2] }
}

export default function Game421({ onBack }: { onBack: () => void }) {
  const [dice, setDice] = useState([1,1,1])
  const [kept, setKept] = useState([false,false,false])
  const [rolls, setRolls] = useState(0)
  const [pScore, setPScore] = useState<{label:string;value:number}|null>(null)
  const [cScore, setCScore] = useState<{label:string;value:number}|null>(null)
  const [phase, setPhase] = useState<'player'|'cpu'|'result'>('player')
  const [msg, setMsg] = useState('')

  const roll = () => {
    if (rolls>=3) return
    const newDice = dice.map((v,i)=>kept[i]?v:Math.ceil(Math.random()*6))
    setDice(newDice); setRolls(r=>r+1)
  }

  const toggleKeep = (i: number) => { if (rolls===0||rolls>=3) return; setKept(k=>k.map((v,j)=>j===i?!v:v)) }

  const bank = () => {
    const ps = scoreHand(dice)
    setPScore(ps); setPhase('cpu'); setMsg('CPU joue…')
    // CPU plays optimally (simplified)
    setTimeout(()=>{
      let d=[Math.ceil(Math.random()*6),Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)]
      for (let r=1;r<3;r++) {
        const s=scoreHand(d)
        if (s.value>=900) break // keep 421 or 111
        // keep pairs
        const counts:Record<number,number>={}; d.forEach(v=>counts[v]=(counts[v]||0)+1)
        const pair=Object.entries(counts).find(([,c])=>c>=2)
        if (pair) {
          const pv=parseInt(pair[0])
          d=d.map(v=>v===pv?v:Math.ceil(Math.random()*6))
        } else {
          d=[Math.ceil(Math.random()*6),Math.ceil(Math.random()*6),Math.ceil(Math.random()*6)]
        }
      }
      const cs=scoreHand(d)
      setCScore(cs)
      const won=ps.value>cs.value
      const tie=ps.value===cs.value
      setMsg(tie?'Égalité ! 🤝':won?`Vous gagnez ! ${ps.label} > ${cs.label} 🎉`:`CPU gagne ! ${cs.label} > ${ps.label} 😞`)
      setPhase('result')
    }, 1200)
  }

  const reset = ()=>{ setDice([1,1,1]);setKept([false,false,false]);setRolls(0);setPScore(null);setCScore(null);setPhase('player');setMsg('') }
  const diceFace = ['','⚀','⚁','⚂','⚃','⚄','⚅']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🎯 421</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>{3-rolls} lancers restants</span>
      </div>

      <p className="text-xs text-center" style={{color:MUTED}}>Objectif : obtenir 4-2-1. Conservez des dés entre les lancers.</p>

      {/* Scores */}
      {(pScore||cScore) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
            <p className="text-[10px]" style={{color:MUTED}}>Vous</p>
            <p className="font-bold text-sm" style={{color:ACCENT}}>{pScore?.label||'—'}</p>
          </div>
          <div className="rounded-xl p-2 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
            <p className="text-[10px]" style={{color:MUTED}}>CPU</p>
            <p className="font-bold text-sm" style={{color:'#06b6d4'}}>{cScore?.label||'…'}</p>
          </div>
        </div>
      )}

      {msg && <div className="rounded-xl p-2.5 text-center text-sm font-bold"
        style={{background:'rgba(168,85,247,0.1)',border:`1px solid ${BORDER}`,color:TEXT}}>{msg}</div>}

      {phase==='player' && (
        <>
          <div className="flex justify-center gap-3">
            {dice.map((d,i)=>(
              <button key={i} onClick={()=>toggleKeep(i)}
                className="text-4xl w-14 h-14 rounded-xl flex items-center justify-center transition-all"
                style={{background:kept[i]?'rgba(168,85,247,0.2)':SURFACE2,border:`2px solid ${kept[i]?ACCENT:BORDER}`}}>
                {diceFace[d]}
              </button>
            ))}
          </div>
          {rolls>0 && <p className="text-center text-[10px]" style={{color:MUTED}}>Cliquez pour conserver</p>}

          <div className="flex gap-2">
            <button onClick={roll} disabled={rolls>=3} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
              style={{background:rolls<3?ACCENT:SURFACE2,color:rolls<3?'#fff':MUTED,border:`1px solid ${BORDER}`,opacity:rolls>=3?0.5:1}}>
              🎲 {rolls===0?'Lancer':'Relancer'}
            </button>
            {rolls>0 && <button onClick={bank} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
              style={{background:'#22c55e',color:'#fff'}}>✓ Garder</button>}
          </div>
        </>
      )}

      {phase==='result' && (
        <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>
          Rejouer
        </button>
      )}
    </div>
  )
}
