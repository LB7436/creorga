import { useState } from 'react'
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const QUESTIONS = [
  { q:"Quelle est la capitale du Luxembourg ?", a:"Luxembourg-Ville", o:["Esch-sur-Alzette","Differdange","Luxembourg-Ville","Ettelbruck"] },
  { q:"Combien de continents y a-t-il sur Terre ?", a:"7", o:["5","6","7","8"] },
  { q:"Quel est le plus grand océan du monde ?", a:"Pacifique", o:["Atlantique","Pacifique","Indien","Arctique"] },
  { q:"En quelle année a débuté la Première Guerre Mondiale ?", a:"1914", o:["1912","1914","1916","1918"] },
  { q:"Combien de grammes dans un kilogramme ?", a:"1000", o:["100","500","1000","10000"] },
  { q:"Quelle planète est la plus proche du Soleil ?", a:"Mercure", o:["Vénus","Terre","Mars","Mercure"] },
  { q:"Qui a peint la Joconde ?", a:"Léonard de Vinci", o:["Michel-Ange","Raphaël","Léonard de Vinci","Botticelli"] },
  { q:"Quelle est la devise de la France ?", a:"Liberté, Égalité, Fraternité", o:["Unité, Travail, Progrès","Liberté, Égalité, Fraternité","Foi, Patrie, Justice","Dieu, Roi, Honneur"] },
  { q:"Combien de côtés a un hexagone ?", a:"6", o:["4","5","6","8"] },
  { q:"Quelle est la langue officielle du Brésil ?", a:"Portugais", o:["Espagnol","Portugais","Français","Brésilien"] },
  { q:"Quel élément chimique a le symbole 'Au' ?", a:"Or", o:["Argent","Aluminium","Or","Cuivre"] },
  { q:"Dans quel sport joue-t-on avec un volant ?", a:"Badminton", o:["Tennis","Squash","Badminton","Ping-pong"] },
  { q:"Quelle est la vitesse de la lumière (km/s) ?", a:"300 000", o:["150 000","300 000","450 000","600 000"] },
  { q:"Combien d'heures dure une journée ?", a:"24", o:["12","20","24","48"] },
  { q:"Quelle montagne est la plus haute du monde ?", a:"Everest", o:["K2","Mont Blanc","Everest","Kilimandjaro"] },
  { q:"Qui a écrit 'Les Misérables' ?", a:"Victor Hugo", o:["Balzac","Flaubert","Victor Hugo","Zola"] },
  { q:"Combien de joueurs dans une équipe de football ?", a:"11", o:["9","10","11","12"] },
  { q:"Quel pays a la plus grande superficie ?", a:"Russie", o:["Canada","Chine","USA","Russie"] },
  { q:"Quelle est la formule chimique de l'eau ?", a:"H₂O", o:["CO₂","H₂O","O₂","NaCl"] },
  { q:"En quelle année l'homme a-t-il marché sur la Lune ?", a:"1969", o:["1965","1967","1969","1971"] },
]

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(()=>Math.random()-0.5) }

export default function QuizGame({ onBack }: { onBack: () => void }) {
  const [questions] = useState(()=>shuffle(QUESTIONS).slice(0,10))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [chosen, setChosen] = useState<string|null>(null)
  const [done, setDone] = useState(false)

  const q = questions[idx]
  const options = useState(()=>questions.map(q=>shuffle(q.o)))[0]

  const pick = (ans: string) => {
    if (chosen||done) return
    setChosen(ans)
    if (ans===q.a) setScore(s=>s+1)
    setTimeout(()=>{
      if (idx+1>=questions.length) setDone(true)
      else { setIdx(i=>i+1); setChosen(null) }
    }, 900)
  }

  const reset = ()=>{ window.location.reload() }

  if (done) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
        <span className="font-bold text-base" style={{color:TEXT}}>❓ Quiz Général</span>
      </div>
      <div className="rounded-2xl p-6 text-center space-y-3" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
        <div className="text-5xl">{score>=8?'🏆':score>=5?'🎯':'📚'}</div>
        <p className="font-black text-3xl" style={{color:ACCENT}}>{score}/10</p>
        <p style={{color:MUTED}}>{score>=8?'Excellent !':score>=5?'Bien joué !':'Continuez à apprendre !'}</p>
        <button onClick={reset} className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>Rejouer</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>❓ Quiz Général</span>
        </div>
        <span className="text-xs" style={{color:MUTED}}>{idx+1}/10 · {score} ✓</span>
      </div>

      {/* Progress */}
      <div className="rounded-full h-1.5 overflow-hidden" style={{background:SURFACE2}}>
        <div className="h-full rounded-full transition-all" style={{width:`${(idx/10)*100}%`,background:ACCENT}}/>
      </div>

      <div className="rounded-2xl p-4" style={{background:SURFACE,border:`1px solid ${BORDER}`}}>
        <p className="font-semibold text-sm leading-relaxed" style={{color:TEXT}}>{q.q}</p>
      </div>

      <div className="space-y-2">
        {options[idx].map(opt=>{
          const isChosen = chosen===opt
          const isCorrect = opt===q.a
          const showResult = chosen!==null
          let bg = SURFACE2, border = BORDER, color = TEXT
          if (showResult) {
            if (isCorrect) { bg='rgba(34,197,94,0.15)'; border='rgba(34,197,94,0.5)'; color='#22c55e' }
            else if (isChosen) { bg='rgba(239,68,68,0.1)'; border='rgba(239,68,68,0.3)'; color='#ef4444' }
            else { color=MUTED }
          }
          return (
            <button key={opt} onClick={()=>pick(opt)}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium flex items-center justify-between transition-all"
              style={{background:bg,border:`1px solid ${border}`,color}}>
              {opt}
              {showResult&&isCorrect&&<CheckCircle2 size={16} className="shrink-0" style={{color:'#22c55e'}}/>}
              {showResult&&isChosen&&!isCorrect&&<XCircle size={16} className="shrink-0" style={{color:'#ef4444'}}/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
