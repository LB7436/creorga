import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const N = 4
const GOAL = [...Array(N*N-1).keys()].map(i=>i+1).concat([0])

function shuffle(): number[] {
  let tiles = [...GOAL]
  for (let i=0;i<1000;i++){
    const blank=tiles.indexOf(0)
    const r=Math.floor(blank/N),c=blank%N
    const neighbors=[]
    if(r>0)neighbors.push(blank-N)
    if(r<N-1)neighbors.push(blank+N)
    if(c>0)neighbors.push(blank-1)
    if(c<N-1)neighbors.push(blank+1)
    const swap=neighbors[Math.floor(Math.random()*neighbors.length)]
    ;[tiles[blank],tiles[swap]]=[tiles[swap],tiles[blank]]
  }
  return tiles
}

export default function SlidingPuzzleGame({ onBack }: { onBack: () => void }) {
  const [tiles, setTiles] = useState<number[]>(shuffle)
  const [moves, setMoves] = useState(0)
  const [best, setBest] = useState(999)

  const won = tiles.every((v,i)=>v===GOAL[i])

  const click = (idx: number) => {
    if (won) return
    const blank = tiles.indexOf(0)
    const r1=Math.floor(idx/N),c1=idx%N
    const r2=Math.floor(blank/N),c2=blank%N
    if (Math.abs(r1-r2)+Math.abs(c1-c2)!==1) return
    const next=[...tiles];[next[idx],next[blank]]=[next[blank],next[idx]]
    setTiles(next)
    setMoves(m=>{
      const nm=m+1
      if (next.every((v,i)=>v===GOAL[i])) setBest(b=>Math.min(b,nm))
      return nm
    })
  }

  const reset = () => { setTiles(shuffle()); setMoves(0) }

  const size = 60

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>🧩 Taquin</span>
        </div>
        <div className="text-xs" style={{color:MUTED}}>
          Coups : <span style={{color:TEXT}}>{moves}</span>
          {best<999&&<> · Record : <span style={{color:'#f59e0b'}}>{best}</span></>}
        </div>
      </div>

      {won && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e'}}>
          🎉 Résolu en {moves} coups !
        </div>
      )}

      <div className="mx-auto rounded-2xl p-2 grid gap-1.5"
        style={{background:SURFACE,border:`1px solid ${BORDER}`,width:N*size+N*6+16,gridTemplateColumns:`repeat(${N},1fr)`}}>
        {tiles.map((v,i)=>(
          <button key={i} onClick={()=>click(i)}
            className="rounded-xl flex items-center justify-center font-black text-lg transition-all"
            style={{
              width:size,height:size,
              background:v===0?'transparent':SURFACE2,
              border:v===0?`2px dashed ${BORDER}`:`1px solid ${BORDER}`,
              color:v===GOAL[i]&&v!==0?'#22c55e':TEXT,
              cursor:v===0?'default':'pointer',
              boxShadow:v===0?'none':`0 2px 8px rgba(0,0,0,0.3)`,
              fontSize:v>=10?16:20,
            }}>
            {v||''}
          </button>
        ))}
      </div>

      <p className="text-center text-xs" style={{color:MUTED}}>Glissez les tuiles pour reconstituer 1→15</p>
      <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm" style={{background:ACCENT,color:'#fff'}}>
        Mélanger
      </button>
    </div>
  )
}
