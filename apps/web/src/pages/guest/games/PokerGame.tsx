import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

const SUITS = ['♠','♥','♦','♣'] as const
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const
type Card = { rank: typeof RANKS[number]; suit: typeof SUITS[number] }

interface PokerTableDef {
  name: string
  smallBlind: number
  bigBlind: number
  startChips: number
  highStakes: boolean
}

const POKER_TABLES: PokerTableDef[] = [
  { name: '1€/2€',     smallBlind: 1,   bigBlind: 2,   startChips: 200,   highStakes: false },
  { name: '5€/10€',    smallBlind: 5,   bigBlind: 10,  startChips: 1000,  highStakes: false },
  { name: '25€/50€',   smallBlind: 25,  bigBlind: 50,  startChips: 5000,  highStakes: true  },
  { name: '100€/200€', smallBlind: 100, bigBlind: 200, startChips: 20000, highStakes: true  },
]

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

function newGame(chips: number, bigBlind: number): State {
  const deck = shuffle()
  return {
    deck,
    player: [deck[0], deck[1]],
    cpu: [deck[2], deck[3]],
    community: [],
    phase: 'deal',
    chips,
    pot: bigBlind * 2,
    result: '',
    cpuFolded: false,
  }
}

export default function PokerGame({ onBack }: { onBack: () => void }) {
  const [selectedTable, setSelectedTable] = useState<PokerTableDef | null>(null)
  const [state, setState] = useState<State>(() => newGame(200, 2))

  function selectTable(table: PokerTableDef) {
    setSelectedTable(table)
    setState(newGame(table.startChips, table.bigBlind))
  }

  const bigBlind = selectedTable?.bigBlind ?? 2

  const next = () => {
    setState(s => {
      const deck = [...s.deck]
      const community = [...s.community]
      let phase = s.phase
      let pot = s.pot
      let result = ''
      let cpuFolded = s.cpuFolded
      const bb = bigBlind

      if (phase === 'deal') {
        // Flop — deal 3 community
        community.push(deck[4], deck[5], deck[6])
        phase = 'flop'
        pot += bb * 2
        // CPU may fold on weak hand
        const cpuHand = evalHand([...s.cpu, ...community])
        if (cpuHand.score < 1_000_000 && Math.random() < 0.35) cpuFolded = true
      } else if (phase === 'flop') {
        community.push(deck[7])
        phase = 'turn'
        pot += bb * 2
      } else if (phase === 'turn') {
        community.push(deck[8])
        phase = 'river'
        pot += bb * 2
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
        ? (won ? s.chips + pot : result.includes('Égalité') ? s.chips : s.chips - bb * 2)
        : s.chips - bb * 2

      return { ...s, deck, community, phase, pot, result, cpuFolded, chips }
    })
  }

  const fold = () => setState(s => ({
    ...s, phase: 'showdown',
    result: `Vous vous couchez. CPU gagne ${s.pot} jetons 😞`,
    chips: s.chips - bigBlind * 2,
  }))

  const reset = () => setState(s => newGame(s.chips, bigBlind))

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

  // ── Table selection screen ────────────────────────────────────────────────
  if (!selectedTable) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
            <span className="font-bold text-base" style={{ color: TEXT }}>🃏 Poker Texas Hold'em</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 13, color: MUTED }}>Choisissez votre table pour commencer</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {POKER_TABLES.map((table, idx) => (
            <button
              key={table.name}
              onClick={() => selectTable(table)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%',
                background: table.highStakes
                  ? 'linear-gradient(135deg, rgba(180,83,9,0.18) 0%, rgba(120,53,15,0.10) 100%)'
                  : 'linear-gradient(135deg, rgba(22,101,52,0.18) 0%, rgba(13,51,24,0.10) 100%)',
                border: table.highStakes
                  ? `1.5px solid rgba(251,191,36,0.3)`
                  : `1.5px solid rgba(34,197,94,0.18)`,
                borderRadius: idx === 0 ? '12px 12px 4px 4px' : idx === POKER_TABLES.length - 1 ? '4px 4px 12px 12px' : '4px',
                padding: '14px 16px',
                cursor: 'pointer',
                color: TEXT,
                textAlign: 'left',
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: table.highStakes ? 'linear-gradient(135deg,#b45309,#92400e)' : 'linear-gradient(135deg,#16a34a,#15803d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#fff', fontWeight: 900,
                }}>
                  {table.highStakes ? '★' : '♠'}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                    Blindes {table.name}
                    {table.highStakes && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(251,191,36,0.18)', color: '#fbbf24', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                        HIGH STAKES
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                    SB/BB : <span style={{ color: table.highStakes ? '#fbbf24' : '#4ade80', fontWeight: 600 }}>{table.smallBlind}€ / {table.bigBlind}€</span>
                    <span style={{ marginLeft: 10 }}>
                      Départ : <span style={{ color: TEXT, fontWeight: 600 }}>{table.startChips.toLocaleString('fr-FR')}€</span>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 18, color: MUTED, opacity: 0.5 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedTable(null)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}><ChevronLeft size={18}/></button>
          <div>
            <span className="font-bold text-base" style={{ color: TEXT }}>🃏 Poker Texas Hold'em</span>
            <div style={{ fontSize: 11, color: selectedTable.highStakes ? '#fbbf24' : '#4ade80', fontWeight: 600, marginTop: 1 }}>
              Blindes {selectedTable.name}
            </div>
          </div>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(168,85,247,0.15)', color: ACCENT }}>
          {state.chips.toLocaleString('fr-FR')} jetons
        </div>
      </div>

      {/* Phase + Pot */}
      <div className="flex items-center justify-between text-xs" style={{ color: MUTED }}>
        <span>{phaseLabel[state.phase]}</span>
        <span className="font-bold" style={{ color: '#f59e0b' }}>Pot : {state.pot.toLocaleString('fr-FR')} 🪙</span>
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
          <>
            <button onClick={reset} className="flex-1 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: ACCENT, color: '#fff' }}>Nouvelle main</button>
            <button onClick={() => setSelectedTable(null)} className="px-4 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED }}>Tables</button>
          </>
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
