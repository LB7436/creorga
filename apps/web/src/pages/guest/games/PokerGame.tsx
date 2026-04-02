import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const SUITS = ['♠','♥','♦','♣'] as const
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const
type Card = { rank: typeof RANKS[number]; suit: typeof SUITS[number] }

const isRed = (s: string) => s === '♥' || s === '♦'
const rankVal = (r: string) => RANKS.indexOf(r as typeof RANKS[number])

function shuffle(): Card[] {
  const deck = SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

// Hand evaluation — returns score (higher = better)
function evalHand(cards: Card[]): { score: number; name: string } {
  const best = getBestFive(cards)
  return score5(best)
}

function getBestFive(cards: Card[]): Card[] {
  if (cards.length <= 5) return cards
  let best: Card[] = []
  let bestScore = -1
  const n = cards.length
  for (let i = 0; i < n - 4; i++)
    for (let j = i+1; j < n - 3; j++)
      for (let k = j+1; k < n - 2; k++)
        for (let l = k+1; l < n - 1; l++)
          for (let m = l+1; m < n; m++) {
            const hand = [cards[i],cards[j],cards[k],cards[l],cards[m]]
            const s = score5(hand).score
            if (s > bestScore) { bestScore = s; best = hand }
          }
  return best
}

function score5(cards: Card[]): { score: number; name: string } {
  const vals = cards.map(c => rankVal(c.rank)).sort((a,b) => b-a)
  const suits = cards.map(c => c.suit)
  const flush = suits.every(s => s === suits[0])
  const straight = vals.every((v,i) => i === 0 || v === vals[i-1]-1) ||
    (vals[0]===12 && vals[1]===3 && vals[2]===2 && vals[3]===1 && vals[4]===0)
  const counts: Record<number,number> = {}
  vals.forEach(v => counts[v] = (counts[v]||0)+1)
  const freq = Object.values(counts).sort((a,b) => b-a)
  const topVal = vals[0]

  if (straight && flush) return { score: 8_000_000 + topVal, name: straight&&flush&&topVal===12?'Quinte Royale':'Quinte Flush' }
  if (freq[0]===4) return { score: 7_000_000 + topVal, name: 'Carré' }
  if (freq[0]===3&&freq[1]===2) return { score: 6_000_000 + topVal, name: 'Full House' }
  if (flush) return { score: 5_000_000 + topVal, name: 'Couleur' }
  if (straight) return { score: 4_000_000 + topVal, name: 'Suite' }
  if (freq[0]===3) return { score: 3_000_000 + topVal, name: 'Brelan' }
  if (freq[0]===2&&freq[1]===2) return { score: 2_000_000 + topVal, name: 'Double Paire' }
  if (freq[0]===2) return { score: 1_000_000 + topVal, name: 'Paire' }
  return { score: topVal, name: 'Carte haute' }
}

type Phase = 'deal'|'flop'|'turn'|'river'|'showdown'

interface State {
  deck: Card[]
  player: Card[]
  cpu: Card[]
  community: Card[]
  phase: Phase
  chips: number
  pot: number
  result: string
  cpuFolded: boolean
}

function newGame(chips: number): State {
  const deck = shuffle()
  return {
    deck,
    player: [deck[0], deck[1]],
    cpu: [deck[2], deck[3]],
    community: [],
    phase: 'deal',
    chips,
    pot: 20,
    result: '',
    cpuFolded: false,
  }
}

export default function PokerGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<State>(() => newGame(500))

  const next = () => {
    setState(s => {
      const deck = [...s.deck]
      const community = [...s.community]
      let phase = s.phase
      let pot = s.pot
      let result = ''
      let cpuFolded = s.cpuFolded

      if (phase === 'deal') {
        // Flop — deal 3 community
        community.push(deck[4], deck[5], deck[6])
        phase = 'flop'
        pot += 20
        // CPU may fold on weak hand
        const cpuHand = evalHand([...s.cpu, ...community])
        if (cpuHand.score < 1_000_000 && Math.random() < 0.35) cpuFolded = true
      } else if (phase === 'flop') {
        community.push(deck[7])
        phase = 'turn'
        pot += 20
      } else if (phase === 'turn') {
        community.push(deck[8])
        phase = 'river'
        pot += 20
      } else if (phase === 'river') {
        phase = 'showdown'
        if (cpuFolded) {
          result = `CPU s'est couché. Vous gagnez ${pot} jetons ! 🎉`
        } else {
          const playerHand = evalHand([...s.player, ...community])
          const cpuHand = evalHand([...s.cpu, ...community])
          if (playerHand.score > cpuHand.score)
            result = `Vous gagnez avec ${playerHand.name} ! +${pot} 🎉`
          else if (playerHand.score < cpuHand.score)
            result = `CPU gagne avec ${cpuHand.name} 😞`
          else
            result = `Égalité ! Pot partagé 🤝`
        }
      }

      const won = result.includes('gagnez')
      const chips = phase === 'showdown'
        ? (won ? s.chips + pot : result.includes('Égalité') ? s.chips : s.chips - 20)
        : s.chips - 20

      return { ...s, deck, community, phase, pot, result, cpuFolded, chips }
    })
  }

  const fold = () => setState(s => ({
    ...s, phase: 'showdown',
    result: `Vous vous couchez. CPU gagne ${s.pot} jetons 😞`,
    chips: s.chips - 20,
  }))

  const reset = () => setState(s => newGame(s.chips))

  const CardEl = ({ c, hidden }: { c: Card; hidden?: boolean }) => (
    <div className="w-11 h-15 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-0.5 select-none"
      style={{ background: hidden ? '#1a1a2e' : '#fff', borderColor: hidden ? BORDER : '#e5e7eb',
        color: hidden ? '#444' : isRed(c.suit) ? '#dc2626' : '#111',
        minWidth: 44, minHeight: 60 }}>
      {hidden ? <span className="text-lg">🂠</span> : <><span>{c.rank}</span><span className="text-base">{c.suit}</span></>}
    </div>
  )

  const phaseLabel: Record<Phase,string> = {
    deal: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Abattage'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <span className="font-bold text-base" style={{ color: TEXT }}>🃏 Poker Texas Hold'em</span>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(168,85,247,0.15)', color: ACCENT }}>
          {state.chips} jetons
        </div>
      </div>

      {/* Phase + Pot */}
      <div className="flex items-center justify-between text-xs" style={{ color: MUTED }}>
        <span>{phaseLabel[state.phase]}</span>
        <span className="font-bold" style={{ color: '#f59e0b' }}>Pot : {state.pot} 🪙</span>
      </div>

      {/* CPU hand */}
      <div className="rounded-2xl p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <p className="text-xs mb-2" style={{ color: MUTED }}>CPU {state.cpuFolded ? '(couché)' : ''}</p>
        <div className="flex gap-2">
          {state.cpu.map((c,i) => (
            <CardEl key={i} c={c} hidden={state.phase !== 'showdown' && !state.cpuFolded} />
          ))}
        </div>
      </div>

      {/* Community */}
      <div className="rounded-2xl p-3" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
        <p className="text-xs mb-2" style={{ color: MUTED }}>Tableau</p>
        <div className="flex gap-2 flex-wrap">
          {state.community.map((c,i) => <CardEl key={i} c={c} />)}
          {Array.from({ length: 5 - state.community.length }).map((_,i) => (
            <div key={i} className="rounded-lg border border-dashed" style={{ minWidth:44, minHeight:60, borderColor: BORDER, opacity:0.3 }}/>
          ))}
        </div>
      </div>

      {/* Player hand */}
      <div className="rounded-2xl p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <p className="text-xs mb-2" style={{ color: MUTED }}>Votre main</p>
        <div className="flex gap-2">
          {state.player.map((c,i) => <CardEl key={i} c={c} />)}
        </div>
        {state.phase === 'showdown' && !state.result.includes('couchez') && (
          <p className="text-xs mt-2 font-semibold" style={{ color: ACCENT }}>
            {evalHand([...state.player, ...state.community]).name}
          </p>
        )}
      </div>

      {/* Result */}
      {state.result && (
        <div className="rounded-xl p-3 text-center text-sm font-bold"
          style={{ background: state.result.includes('gagnez') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${state.result.includes('gagnez') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
            color: state.result.includes('gagnez') ? '#22c55e' : state.result.includes('Égalité') ? '#f59e0b' : '#ef4444' }}>
          {state.result}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {state.phase === 'showdown' ? (
          <button onClick={reset} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: ACCENT, color: '#fff' }}>Nouvelle main</button>
        ) : (
          <>
            <button onClick={next} className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-80"
              style={{ background: ACCENT, color: '#fff' }}>
              {state.phase === 'deal' ? 'Voir le Flop →' : state.phase === 'flop' ? 'Tour →' : state.phase === 'turn' ? 'Rivière →' : 'Abattage →'}
            </button>
            <button onClick={fold} className="px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: '#ef4444' }}>Se coucher</button>
          </>
        )}
      </div>
    </div>
  )
}
