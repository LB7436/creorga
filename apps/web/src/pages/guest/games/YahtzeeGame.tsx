import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

type Category = 'ones'|'twos'|'threes'|'fours'|'fives'|'sixes'|'threeKind'|'fourKind'|'fullHouse'|'smallStraight'|'largeStraight'|'yahtzee'|'chance'

const CATS: { id: Category; label: string }[] = [
  {id:'ones',label:'As (1)'},{id:'twos',label:'Deux (2)'},{id:'threes',label:'Trois (3)'},
  {id:'fours',label:'Quatre (4)'},{id:'fives',label:'Cinq (5)'},{id:'sixes',label:'Six (6)'},
  {id:'threeKind',label:'Brelan'},{id:'fourKind',label:'Carré'},{id:'fullHouse',label:'Full (25)'},
  {id:'smallStraight',label:'Petite Suite (30)'},{id:'largeStraight',label:'Grande Suite (40)'},
  {id:'yahtzee',label:'Yahtzee! (50)'},{id:'chance',label:'Chance'},
]

function calcScore(cat: Category, dice: number[]): number {
  const counts = Array(7).fill(0)
  dice.forEach(d => counts[d]++)
  const sum = dice.reduce((a,b) => a+b, 0)
  const numMap: Record<string,number> = {ones:1,twos:2,threes:3,fours:4,fives:5,sixes:6}
  if (numMap[cat]) return counts[numMap[cat]] * numMap[cat]
  if (cat==='threeKind') return counts.some(c=>c>=3) ? sum : 0
  if (cat==='fourKind') return counts.some(c=>c>=4) ? sum : 0
  if (cat==='fullHouse') return (counts.some(c=>c===3)&&counts.some(c=>c===2)) ? 25 : 0
  if (cat==='smallStraight') {
    const set = new Set(dice)
    return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(s=>s.every(v=>set.has(v))) ? 30 : 0
  }
  if (cat==='largeStraight') {
    const sorted = [...new Set(dice)].sort((a,b)=>a-b).join('')
    return (sorted==='12345'||sorted==='23456') ? 40 : 0
  }
  if (cat==='yahtzee') return counts.some(c=>c===5) ? 50 : 0
  if (cat==='chance') return sum
  return 0
}

export default function YahtzeeGame({ onBack }: { onBack: () => void }) {
  const [dice, setDice] = useState([1,1,1,1,1])
  const [held, setHeld] = useState([false,false,false,false,false])
  const [rolls, setRolls] = useState(0)
  const [scores, setScores] = useState<Partial<Record<Category,number>>>({})
  const [round, setRound] = useState(1)

  const roll = () => {
    if (rolls >= 3) return
    setDice(d => d.map((v,i) => held[i] ? v : Math.ceil(Math.random()*6)))
    setRolls(r => r+1)
  }

  const toggleHold = (i: number) => { if (rolls===0) return; setHeld(h => h.map((v,j)=>j===i?!v:v)) }

  const score = (cat: Category) => {
    if (scores[cat] !== undefined || rolls === 0) return
    const s = calcScore(cat, dice)
    setScores(prev => ({ ...prev, [cat]: s }))
    setDice([1,1,1,1,1]); setHeld([false,false,false,false,false])
    setRolls(0); setRound(r => r+1)
  }

  const total = Object.values(scores).reduce((a,b)=>a+(b??0),0)
  const done = Object.keys(scores).length === CATS.length
  const reset = () => { setDice([1,1,1,1,1]); setHeld([false,false,false,false,false]); setRolls(0); setScores({}); setRound(1) }

  const diceFace = ['','⚀','⚁','⚂','⚃','⚄','⚅']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>🎲 Yahtzee</span>
        </div>
        <div className="text-xs" style={{ color: MUTED }}>
          Tour {Math.min(round, CATS.length)}/{CATS.length} · <span style={{ color: ACCENT }}>Total : {total}</span>
        </div>
      </div>

      {done ? (
        <div className="rounded-xl p-4 text-center space-y-2">
          <div className="text-3xl">🏆</div>
          <p className="font-bold text-lg" style={{ color: ACCENT }}>Score final : {total}</p>
          <button onClick={reset} className="px-5 py-2 rounded-xl font-bold text-sm" style={{ background: ACCENT, color:'#fff' }}>Rejouer</button>
        </div>
      ) : (
        <>
          {/* Dice */}
          <div className="flex justify-center gap-2">
            {dice.map((d,i) => (
              <button key={i} onClick={() => toggleHold(i)}
                className="text-3xl w-13 h-13 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: held[i] ? `rgba(168,85,247,0.2)` : SURFACE2,
                  border: `2px solid ${held[i] ? ACCENT : BORDER}`,
                  width: 52, height: 52,
                }}>
                {diceFace[d]}
              </button>
            ))}
          </div>
          {rolls > 0 && <p className="text-center text-xs" style={{ color: MUTED }}>Cliquez pour garder · {3-rolls} lancé(s) restant(s)</p>}

          <button onClick={roll} disabled={rolls>=3}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{ background: rolls>=3?SURFACE2:ACCENT, color: rolls>=3?MUTED:'#fff', border: rolls>=3?`1px solid ${BORDER}`:'none', opacity: rolls>=3?0.6:1 }}>
            {rolls===0 ? 'Lancer les dés' : rolls<3 ? `Relancer (${3-rolls} restant${3-rolls>1?'s':''})` : 'Choisissez une catégorie'}
          </button>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-1.5">
            {CATS.map(cat => {
              const saved = scores[cat.id] !== undefined
              const preview = !saved && rolls > 0 ? calcScore(cat.id, dice) : null
              return (
                <button key={cat.id} onClick={() => score(cat.id)}
                  disabled={saved || rolls===0}
                  className="rounded-xl px-3 py-2 text-left text-xs transition-all"
                  style={{
                    background: saved ? 'rgba(168,85,247,0.08)' : SURFACE,
                    border: `1px solid ${saved?'rgba(168,85,247,0.3)':BORDER}`,
                    opacity: saved||rolls===0 ? (saved?0.6:0.4) : 1,
                    cursor: saved||rolls===0 ? 'default' : 'pointer',
                  }}>
                  <span style={{ color: MUTED }}>{cat.label}</span>
                  <span className="float-right font-bold" style={{ color: saved?ACCENT:preview!==null?ACCENT2:MUTED }}>
                    {saved ? scores[cat.id] : preview !== null ? `+${preview}` : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
