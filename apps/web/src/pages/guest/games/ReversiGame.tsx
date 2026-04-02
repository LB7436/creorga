import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, BORDER, TEXT, MUTED } from './theme'

type Board = (0|1|2)[][] // 0=empty, 1=black(player), 2=white(cpu)
const SIZE = 8
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

function initBoard(): Board {
  const b = Array.from({length:SIZE},()=>Array(SIZE).fill(0)) as Board
  b[3][3]=2; b[3][4]=1; b[4][3]=1; b[4][4]=2
  return b
}

function flips(board: Board, r: number, c: number, player: 1|2): [number,number][] {
  if (board[r][c]) return []
  const opp = player===1?2:1
  const result: [number,number][] = []
  for (const [dr,dc] of DIRS) {
    const line: [number,number][] = []
    let nr=r+dr, nc=c+dc
    while (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===opp) {
      line.push([nr,nc]); nr+=dr; nc+=dc
    }
    if (line.length && nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===player) result.push(...line)
  }
  return result
}

function validMoves(board: Board, player: 1|2): [number,number][] {
  const moves: [number,number][] = []
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++)
    if (!board[r][c] && flips(board,r,c,player).length) moves.push([r,c])
  return moves
}

function place(board: Board, r: number, c: number, player: 1|2): Board {
  const f = flips(board,r,c,player)
  if (!f.length) return board
  const next = board.map(row=>[...row]) as Board
  next[r][c]=player
  f.forEach(([fr,fc])=>{next[fr][fc]=player})
  return next
}

function cpuMove(board: Board): Board {
  const moves = validMoves(board, 2)
  if (!moves.length) return board
  // Prefer corners, then edges, then max flips
  const corners: [number,number][] = [[0,0],[0,7],[7,0],[7,7]]
  const corner = moves.find(([r,c])=>corners.some(([cr,cc])=>cr===r&&cc===c))
  if (corner) return place(board, corner[0], corner[1], 2)
  const best = moves.reduce((a,b)=>flips(board,a[0],a[1],2).length>=flips(board,b[0],b[1],2).length?a:b)
  return place(board, best[0], best[1], 2)
}

function count(board: Board): [number,number] {
  let b=0,w=0
  board.flat().forEach(v=>{if(v===1)b++;if(v===2)w++})
  return [b,w]
}

export default function ReversiGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Board>(initBoard)
  const [turn, setTurn] = useState<1|2>(1)
  const [msg, setMsg] = useState('')

  const hints = validMoves(board, 1)
  const [black, white] = count(board)

  const click = (r: number, c: number) => {
    if (turn!==1) return
    const f = flips(board, r, c, 1)
    if (!f.length) return
    let next = place(board, r, c, 1)
    const cpuMoves = validMoves(next, 2)
    if (!cpuMoves.length) {
      const playerMoves = validMoves(next, 1)
      if (!playerMoves.length) { endGame(next); return }
      setMsg("CPU passe son tour !"); setBoard(next); return
    }
    setTurn(2); setMsg('')
    setTimeout(()=>{
      next = cpuMove(next)
      const pm = validMoves(next, 1)
      if (!pm.length) { const cm=validMoves(next,2); if(!cm.length){endGame(next);return}; setMsg("Vous passez votre tour !"); setBoard(next); setTurn(2); return }
      setBoard(next); setTurn(1)
    }, 500)
  }

  const endGame = (b: Board) => {
    const [bl,wh] = count(b)
    setMsg(bl>wh?`Vous gagnez ! 🎉 (${bl}-${wh})`:bl<wh?`CPU gagne 😞 (${bl}-${wh})`:`Égalité ! (${bl}-${wh})`)
    setTurn(0 as 1|2); setBoard(b)
  }

  const reset = ()=>{setBoard(initBoard());setTurn(1);setMsg('')}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{color:MUTED}}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{color:TEXT}}>⭕ Reversi</span>
        </div>
        <div className="flex gap-3 text-xs" style={{color:MUTED}}>
          <span>⚫ {black}</span><span>⚪ {white}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5" style={{color:turn===1?TEXT:MUTED}}>
          <div className="w-3 h-3 rounded-full bg-gray-900 border border-gray-500"/>
          {turn===1?'Votre tour':''}
        </div>
        <div className="flex items-center gap-1.5" style={{color:turn===2?TEXT:MUTED}}>
          {turn===2?'CPU réfléchit…':''}
          <div className="w-3 h-3 rounded-full bg-white"/>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl p-2.5 text-center text-sm font-bold"
          style={{background:'rgba(168,85,247,0.1)',border:`1px solid ${BORDER}`,color:ACCENT}}>{msg}</div>
      )}

      <div className="rounded-2xl overflow-hidden mx-auto" style={{background:'#1a6b3c',border:'3px solid #145a31',width:288}}>
        {board.map((row,r)=>(
          <div key={r} className="flex">
            {row.map((cell,c)=>{
              const isHint = hints.some(([hr,hc])=>hr===r&&hc===c)
              return (
                <button key={c} onClick={()=>click(r,c)}
                  className="flex items-center justify-center transition-all"
                  style={{width:36,height:36,background:'transparent',border:'1px solid rgba(0,100,50,0.4)',cursor:isHint&&turn===1?'pointer':'default'}}>
                  {cell===1 && <div className="w-6 h-6 rounded-full" style={{background:'#111',boxShadow:'inset 0 -2px 4px rgba(255,255,255,0.1)'}}/>}
                  {cell===2 && <div className="w-6 h-6 rounded-full" style={{background:'#f8f8f8',boxShadow:'inset 0 -2px 4px rgba(0,0,0,0.2)'}}/>}
                  {!cell && isHint && turn===1 && <div className="w-2.5 h-2.5 rounded-full opacity-50" style={{background:ACCENT}}/>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm"
        style={{background:ACCENT,color:'#fff'}}>Nouvelle partie</button>
    </div>
  )
}
