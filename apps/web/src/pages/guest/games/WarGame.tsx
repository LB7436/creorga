import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const SUITS = ['♠','♥','♦','♣']
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
type Card = { rank: string; suit: string }
const isRed = (s:string) => s==='♥'||s==='♦'
const val = (r:string) => RANKS.indexOf(r)

function makeDeck(): Card[] {
  const d = SUITS.flatMap(s=>RANKS.map(r=>({rank:r,suit:s})))
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}
  return d
}

export default function WarGame({ onBack }: { onBack: () => void }) {
  const [pDeck, setPDeck] = useState<Card[]>(()=>makeDeck().slice(0,26))
  const [cDeck, setCDeck] = useState<Card[]>(()=>makeDeck().slice(0,26))
  const [pCard, setPCard] = useState<Card|null>(null)
  const [cCard, setCCard] = useState<Card|null>(null)
  const [msg, setMsg] = useState('')

  const draw = () => {
    if (!pDeck.length || !cDeck.length) return
    const pc = pDeck[0], cc = cDeck[0]
    const newP = pDeck.slice(1), newC = cDeck.slice(1)
    setPCard(pc); setCCard(cc)
    const pv=val(pc.rank), cv=val(cc.rank)
    if(pv>cv){ setMsg('Vous gagnez ce pli ! 🎉'); setPDeck([...newP,pc,cc]); setCDeck(newC) }
    else if(cv>pv){ setMsg('CPU gagne ce pli 😞'); setCDeck([...newC,pc,cc]); setPDeck(newP) }
    else { setMsg('Égalité — guerre !'); setPDeck(newP); setCDeck(newC) }
  }

  const over = !pDeck.length || !cDeck.length
  const CardEl = ({c}:{c:Card}) => (
    <div className="w-16 h-22 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold"
      style={{background:'#fff',borderColor:'#e5e7eb',color:isRed(c.suit)?'#dc2626':'#111',minHeight:88}}>
      <span className="text-sm">{c.rank}</span><span className="text-2xl">{c.suit}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>⚔️ Bataille</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>
          <span style={{color:'#22c55e'}}>Vous : {pDeck.length}</span> · <span>CPU : {cDeck.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-3 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <p className="text-xs mb-2" style={{color:MUTED}}>CPU ({cDeck.length} cartes)</p>
          {cCard ? <CardEl c={cCard}/> : <div className="w-16 h-22 rounded-xl border-2 mx-auto flex items-center justify-center text-3xl"
            style={{background:'#1a1a2e',borderColor:BORDER,minHeight:88}}>🂠</div>}
        </div>
        <div className="rounded-2xl p-3 text-center" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <p className="text-xs mb-2" style={{color:MUTED}}>Vous ({pDeck.length} cartes)</p>
          {pCard ? <CardEl c={pCard}/> : <div className="w-16 h-22 rounded-xl border-2 mx-auto flex items-center justify-center text-3xl"
            style={{background:'#1a1a2e',borderColor:BORDER,minHeight:88}}>🂠</div>}
        </div>
      </div>

      {msg && <div className="rounded-xl p-2.5 text-center text-sm font-bold"
        style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>{msg}</div>}

      {over && <div className="rounded-xl p-3 text-center font-bold"
        style={{background:!pDeck.length?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',
          border:`1px solid ${!pDeck.length?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)'}`,
          color:!pDeck.length?'#ef4444':'#22c55e'}}>
        {!pDeck.length?'CPU a toutes les cartes 😞':'Vous avez toutes les cartes ! 🏆'}
      </div>}

      <div className="flex gap-2">
        <button onClick={draw} disabled={over} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
          style={{background:over?SURFACE2:ACCENT,border:`1px solid ${over?BORDER:'transparent'}`,color:over?MUTED:'#fff'}}>
          🃏 Tirer une carte
        </button>
        <button onClick={()=>{setPDeck(makeDeck().slice(0,26));setCDeck(makeDeck().slice(0,26));setPCard(null);setCCard(null);setMsg('')}}
          className="px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}>🔄</button>
      </div>
    </div>
  )
}
