import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const WORDS = [
  'CHIEN','MAISON','PLAGE','FLEUVE','NUAGE','ROUTE','FORET','PORTE',
  'CARTE','LAMPE','TABLE','LIVRE','BRUIT','CALME','PLUME','ETOIL',
  'ARBRE','FLEUR','NEIGE','PLUIE','SOLEI','LUNDI','MARDI','PIANO',
  'GRAPE','SUCRE','SALUT','MERCI','BONNE','NOIRE','BLANC','ROUGE',
  'VAGUE','SABLE','CLAIR','VERRE','METAL','FORGE','SPORT','DANSE',
]

const pick = () => WORDS[Math.floor(Math.random()*WORDS.length)]

type LetterState = 'correct'|'present'|'absent'|'empty'
type Row = { letter: string; state: LetterState }[]

function evaluate(word: string, guess: string): Row {
  const result: Row = Array.from({length:5},(_,i)=>({letter:guess[i]||'',state:'absent' as LetterState}))
  const available = [...word]
  for (let i=0;i<5;i++) if (guess[i]===word[i]) { result[i].state='correct'; available[i]=' ' }
  for (let i=0;i<5;i++) {
    if (result[i].state==='correct') continue
    const j = available.indexOf(guess[i])
    if (j!==-1) { result[i].state='present'; available[j]=' ' }
  }
  return result
}


export default function MotusGame({ onBack }: { onBack: () => void }) {
  const [word, setWord] = useState(pick)
  const [rows, setRows] = useState<Row[]>([])
  const [current, setCurrent] = useState('')
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)

  const letterStates: Record<string,LetterState> = {}
  rows.flat().forEach(({letter,state})=>{
    if (!letterStates[letter]||state==='correct'||(state==='present'&&letterStates[letter]==='absent'))
      letterStates[letter]=state
  })

  useEffect(()=>{
    const h = (e: KeyboardEvent)=>{
      if (won||lost) return
      if (e.key==='Enter') submit()
      else if (e.key==='Backspace') setCurrent(c=>c.slice(0,-1))
      else if (/^[a-zA-Z]$/.test(e.key)) setCurrent(c=>c.length<5?c+(e.key.toUpperCase()):''+c)
    }
    window.addEventListener('keydown',h)
    return ()=>window.removeEventListener('keydown',h)
  })

  const submit = () => {
    if (current.length!==5||won||lost) return
    const row = evaluate(word, current)
    const newRows = [...rows, row]
    setRows(newRows); setCurrent('')
    if (current===word) setWon(true)
    else if (newRows.length>=6) setLost(true)
  }

  const reset = ()=>{ setWord(pick()); setRows([]); setCurrent(''); setWon(false); setLost(false) }

  const stateColor: Record<LetterState,string> = {
    correct:'#22c55e', present:'#eab308', absent:'rgba(255,255,255,0.08)', empty:'transparent'
  }
  const stateBorder: Record<LetterState,string> = {
    correct:'#22c55e', present:'#eab308', absent:'rgba(255,255,255,0.1)', empty:BORDER
  }

  const allRows = [...rows]
  if (!won && !lost && rows.length<6) {
    const cur: Row = Array.from({length:5},(_,i)=>({letter:current[i]||'',state:'empty' as LetterState}))
    allRows.push(cur)
  }
  while (allRows.length<6) allRows.push(Array.from({length:5},()=>({letter:'',state:'empty' as LetterState})))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>📝 Motus</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>{rows.length}/6 essais</span>
      </div>

      {(won||lost) && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:won?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
            border:`1px solid ${won?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
            color:won?'#22c55e':'#ef4444'}}>
          {won?`🎉 Bravo en ${rows.length} essai${rows.length>1?'s':''}!`:`😞 Le mot était : ${word}`}
        </div>
      )}

      {/* Grid */}
      <div className="flex flex-col gap-1.5 items-center">
        {allRows.map((row,ri)=>(
          <div key={ri} className="flex gap-1.5">
            {row.map((cell,ci)=>(
              <div key={ci} className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-base border-2 transition-all"
                style={{background:stateColor[cell.state],borderColor:stateBorder[cell.state],color:TEXT}}>
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      {!won && !lost && (
        <div className="space-y-1">
          {['AZERTY','UIOPQS','DFGHJK','LMWXCV','BN'].map((row,i)=>(
            <div key={i} className="flex justify-center gap-1">
              {row.split('').map(l=>{
                const st = letterStates[l]
                return (
                  <button key={l} onClick={()=>setCurrent(c=>c.length<5?c+l:c)}
                    className="w-7 h-8 rounded-md text-xs font-bold transition-all"
                    style={{background:st?stateColor[st]:SURFACE2,borderColor:st?stateBorder[st]:BORDER,
                      border:`1px solid ${st?stateBorder[st]:BORDER}`,color:st==='absent'?MUTED:TEXT}}>
                    {l}
                  </button>
                )
              })}
            </div>
          ))}
          <div className="flex justify-center gap-2 mt-1">
            <button onClick={()=>setCurrent(c=>c.slice(0,-1))} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:MUTED}}>⌫</button>
            <button onClick={submit} disabled={current.length!==5} className="px-4 py-1.5 rounded-lg text-xs font-bold"
              style={{background:current.length===5?ACCENT:SURFACE2,border:`1px solid ${BORDER}`,
                color:current.length===5?'#fff':MUTED,opacity:current.length===5?1:0.5}}>Entrer</button>
          </div>
        </div>
      )}

      {(won||lost) && <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>Rejouer</button>}
    </div>
  )
}
