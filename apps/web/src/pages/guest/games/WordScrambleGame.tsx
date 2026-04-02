import { useState } from 'react'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const WORDS = [
  {w:'RESTAURANT',h:'Lieu où l\'on mange'},
  {w:'MUSIQUE',h:'Art des sons'},
  {w:'VOYAGE',h:'Déplacement vers un lieu lointain'},
  {w:'CUISINE',h:'Art de préparer les repas'},
  {w:'LUMIERE',h:'Ce que produit le soleil'},
  {w:'FAMILLE',h:'Groupe de personnes liées'},
  {w:'AMITIE',h:'Lien affectif entre personnes'},
  {w:'BONHEUR',h:'État de satisfaction'},
  {w:'NATURE',h:'Le monde naturel'},
  {w:'SILENCE',h:'Absence de bruit'},
  {w:'CHOCOLAT',h:'Douceur sucrée'},
  {w:'MONTAGNE',h:'Relief élevé'},
  {w:'RIVIERE',h:'Cours d\'eau'},
  {w:'SOLEIL',h:'Notre étoile'},
  {w:'PRINTEMPS',h:'Saison des fleurs'},
  {w:'ORDINATEUR',h:'Machine électronique'},
  {w:'TELEPHONE',h:'Appareil de communication'},
  {w:'BOULANGER',h:'Artisan du pain'},
  {w:'JARDINIER',h:'Entretient les plantes'},
  {w:'AVENTURE',h:'Expérience excitante'},
]

function scramble(w: string): string {
  let s = w.split('')
  do { s.sort(()=>Math.random()-0.5) } while (s.join('')===w)
  return s.join('')
}

function pick() {
  const item = WORDS[Math.floor(Math.random()*WORDS.length)]
  return { ...item, scrambled: scramble(item.w) }
}

export default function WordScrambleGame({ onBack }: { onBack: () => void }) {
  const [current, setCurrent] = useState(pick)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<'correct'|'wrong'|null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [round, setRound] = useState(1)

  const submit = () => {
    if (!input.trim()) return
    const ok = input.trim().toUpperCase() === current.w
    setResult(ok?'correct':'wrong')
    if (ok) {
      const ns=score+1, st=streak+1
      setScore(ns); setStreak(st)
    } else { setStreak(0) }
    setTimeout(()=>{
      setCurrent(pick()); setInput(''); setResult(null); setShowHint(false); setRound(r=>r+1)
    }, 1000)
  }

  const scrambleNew = () => setCurrent(c=>({...c, scrambled: scramble(c.w)}))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🔀 Anagramme</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>
          Score <span style={{color:TEXT}}>{score}</span> · Série <span style={{color:'#f59e0b'}}>{streak}🔥</span>
        </div>
      </div>

      <div className="rounded-2xl p-5 text-center space-y-3" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
        <p className="text-xs" style={{color:MUTED}}>Remettez les lettres dans l'ordre</p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {current.scrambled.split('').map((l,i)=>(
            <div key={i} className="w-9 h-10 rounded-lg flex items-center justify-center font-black text-base"
              style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:ACCENT}}>{l}</div>
          ))}
        </div>
        <button onClick={scrambleNew} className="flex items-center gap-1 mx-auto text-xs"
          style={{color:MUTED}}>
          <RefreshCw size={11}/> Remélanger
        </button>
      </div>

      {showHint && (
        <div className="rounded-xl px-3 py-2 text-xs text-center" style={{background:'rgba(168,85,247,0.1)',border:`1px solid ${BORDER}`,color:MUTED}}>
          💡 {current.h}
        </div>
      )}

      {result && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:result==='correct'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
            border:`1px solid ${result==='correct'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
            color:result==='correct'?'#22c55e':'#ef4444'}}>
          {result==='correct'?'✓ Correct !':'✗ Raté ! Le mot était : '+current.w}
        </div>
      )}

      <div className="space-y-2">
        <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())}
          onKeyDown={e=>e.key==='Enter'&&submit()}
          placeholder="Votre réponse…" maxLength={current.w.length+2}
          className="w-full px-4 py-3 rounded-xl font-bold text-base tracking-widest text-center outline-none"
          style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:TEXT}}/>
        <div className="flex gap-2">
          <button onClick={()=>setShowHint(true)} className="px-3 py-2.5 rounded-xl text-sm"
            style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:MUTED}}>💡 Indice</button>
          <button onClick={submit} disabled={!input.trim()||result!==null} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{background:input.trim()&&!result?ACCENT:SURFACE2,
              color:input.trim()&&!result?'#fff':MUTED,
              border:`1px solid ${!input.trim()||result?BORDER:'transparent'}`,
              opacity:!input.trim()||result?0.6:1}}>
            Valider ✓
          </button>
        </div>
      </div>

      <p className="text-center text-[10px]" style={{color:MUTED}}>Mot {round} · {current.w.length} lettres</p>
    </div>
  )
}
