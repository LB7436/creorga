import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7']
const LABELS = ['Rouge','Orange','Jaune','Vert','Bleu','Violet']
const CODE_LEN = 4
const MAX_TRIES = 8

function makeCode() { return Array.from({length:CODE_LEN},()=>Math.floor(Math.random()*COLORS.length)) }

function check(code: number[], guess: number[]): { black: number; white: number } {
  let black = 0, white = 0
  const codeLeft = [...code], guessLeft = [...guess]
  for (let i=0;i<CODE_LEN;i++) if (guess[i]===code[i]) { black++; codeLeft[i]=-1; guessLeft[i]=-2 }
  for (let i=0;i<CODE_LEN;i++) {
    if (guessLeft[i]===-2) continue
    const j = codeLeft.indexOf(guessLeft[i])
    if (j!==-1) { white++; codeLeft[j]=-1 }
  }
  return {black,white}
}

export default function MastermindGame({ onBack }: { onBack: () => void }) {
  const [code] = useState(makeCode)
  const [guesses, setGuesses] = useState<{guess:number[];result:{black:number;white:number}}[]>([])
  const [current, setCurrent] = useState<number[]>([])
  const [won, setWon] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const addColor = (c: number) => { if (current.length < CODE_LEN && !won && guesses.length < MAX_TRIES) setCurrent(p=>[...p,c]) }
  const remove = () => setCurrent(p=>p.slice(0,-1))
  const submit = () => {
    if (current.length!==CODE_LEN) return
    const result = check(code, current)
    const newGuesses = [...guesses,{guess:current,result}]
    setGuesses(newGuesses)
    setCurrent([])
    if (result.black===CODE_LEN) setWon(true)
    else if (newGuesses.length>=MAX_TRIES) setRevealed(true)
  }
  const reset = () => { window.location.reload() }

  const over = won || revealed
  const tryNum = guesses.length+1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🔐 Mastermind</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>Essai {Math.min(tryNum,MAX_TRIES)}/{MAX_TRIES}</span>
      </div>

      {/* Secret code (revealed or hidden) */}
      <div className="rounded-2xl p-3" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
        <p className="text-xs mb-2" style={{color:MUTED}}>Code secret</p>
        <div className="flex gap-2">
          {code.map((c,i)=>(
            <div key={i} className="w-9 h-9 rounded-full border-2"
              style={{background:over||revealed?COLORS[c]:'#1a1a2e',borderColor:over?COLORS[c]:BORDER}}/>
          ))}
        </div>
      </div>

      {/* Result message */}
      {(won||revealed) && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:won?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.08)',
            border:`1px solid ${won?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.2)'}`,
            color:won?'#22c55e':'#ef4444'}}>
          {won?`🎉 Trouvé en ${guesses.length} essai${guesses.length>1?'s':''}!`:'😞 Perdu ! Voilà le code.'}
        </div>
      )}

      {/* Past guesses */}
      <div className="space-y-2">
        {guesses.map((g,ri)=>(
          <div key={ri} className="flex items-center gap-3 rounded-xl px-3 py-2"
            style={{background:SURFACE2,border:`1px solid ${BORDER}`}}>
            <div className="flex gap-1.5">
              {g.guess.map((c,i)=>(
                <div key={i} className="w-7 h-7 rounded-full" style={{background:COLORS[c]}}/>
              ))}
            </div>
            <div className="ml-auto flex gap-1 flex-wrap" style={{maxWidth:56}}>
              {Array(g.result.black).fill(0).map((_,i)=>(
                <div key={`b${i}`} className="w-3 h-3 rounded-full bg-gray-900 border border-gray-600"/>
              ))}
              {Array(g.result.white).fill(0).map((_,i)=>(
                <div key={`w${i}`} className="w-3 h-3 rounded-full bg-white border border-gray-300"/>
              ))}
              {g.result.black+g.result.white===0 && <span className="text-[10px]" style={{color:MUTED}}>✗</span>}
            </div>
            <div className="text-[10px]" style={{color:MUTED}}>
              {g.result.black}● {g.result.white}○
            </div>
          </div>
        ))}
      </div>

      {/* Current guess */}
      {!over && (
        <div className="rounded-2xl p-3 space-y-3" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
          <div className="flex gap-2 justify-center">
            {Array(CODE_LEN).fill(0).map((_,i)=>(
              <div key={i} className="w-9 h-9 rounded-full border-2 transition-all"
                style={{background:current[i]!==undefined?COLORS[current[i]]:'transparent',
                  borderColor:i<current.length?COLORS[current[i]]:BORDER,borderStyle:i===current.length?'dashed':'solid'}}/>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {COLORS.map((col,i)=>(
              <button key={i} onClick={()=>addColor(i)} title={LABELS[i]}
                className="w-full aspect-square rounded-full border-2 transition-all hover:scale-110"
                style={{background:col,borderColor:'transparent'}}/>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={remove} disabled={current.length===0} className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{background:SURFACE2,border:`1px solid ${BORDER}`,color:MUTED,opacity:current.length?1:0.4}}>
              ← Effacer
            </button>
            <button onClick={submit} disabled={current.length!==CODE_LEN} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{background:current.length===CODE_LEN?ACCENT:SURFACE2,
                border:`1px solid ${current.length===CODE_LEN?'transparent':BORDER}`,
                color:current.length===CODE_LEN?'#fff':MUTED,opacity:current.length===CODE_LEN?1:0.5}}>
              Valider ✓
            </button>
          </div>
        </div>
      )}

      {over && (
        <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>
          Nouvelle partie
        </button>
      )}
      <p className="text-center text-[10px]" style={{color:MUTED}}>⚫ = bonne couleur & position · ⚪ = bonne couleur mauvaise position</p>
    </div>
  )
}
