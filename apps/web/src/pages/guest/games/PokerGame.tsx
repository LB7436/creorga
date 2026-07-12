import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'
import { useGameScore } from './useGameScore'

// ─── Types ────────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
type Suit = typeof SUITS[number]
type Rank = typeof RANKS[number]
type Card = { rank: Rank; suit: Suit }
type Phase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
type Action = 'fold' | 'check' | 'call' | 'raise'
type PlayerPos = 0 | 1 | 2  // 0 = human, 1 = cpu1 (top-left), 2 = cpu2 (top-right)

interface Player {
  id: PlayerPos
  name: string
  chips: number
  hand: Card[]
  bet: number          // bet in current betting round
  totalBet: number     // total bet in the hand
  folded: boolean
  isDealer: boolean
  isAllIn: boolean
  hasActed: boolean    // a agi depuis la dernière relance / le début de la street
}

interface GameState {
  deck: Card[]
  players: Player[]
  community: Card[]
  phase: Phase
  pot: number
  currentBet: number   // highest bet in current round
  activePlayer: PlayerPos
  dealer: PlayerPos
  result: string
  winners: PlayerPos[]
  handNum: number
  animatingCards: boolean
  raiseAmount: number
  lastAction: { player: PlayerPos; action: string } | null
  bettingDone: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isRed = (s: Suit) => s === '♥' || s === '♦'
const rankVal = (r: Rank) => RANKS.indexOf(r)
const START_CHIPS = 1000
const SB = 10
const BB = 20

function makeDeck(): Card[] {
  return SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })))
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

// ─── Hand Evaluator ───────────────────────────────────────────────────────────

function getBestFive(cards: Card[]): Card[] {
  if (cards.length <= 5) return cards
  let best: Card[] = []
  let bestScore = -1
  const n = cards.length
  for (let i = 0; i < n - 4; i++)
    for (let j = i + 1; j < n - 3; j++)
      for (let k = j + 1; k < n - 2; k++)
        for (let l = k + 1; l < n - 1; l++)
          for (let m = l + 1; m < n; m++) {
            const hand = [cards[i], cards[j], cards[k], cards[l], cards[m]]
            const s = score5(hand).score
            if (s > bestScore) { bestScore = s; best = hand }
          }
  return best
}

function score5(cards: Card[]): { score: number; name: string } {
  const vals = cards.map(c => rankVal(c.rank)).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const flush = suits.every(s => s === suits[0])
  const isWheel = vals[0] === 12 && vals[1] === 3 && vals[2] === 2 && vals[3] === 1 && vals[4] === 0
  const isRun = vals.every((v, i) => i === 0 || v === vals[i - 1] - 1)
  const straight = isRun || isWheel
  // La roue A-2-3-4-5 vaut « hauteur 5 » (pas As-haut) : sinon elle battrait à tort une suite au Roi.
  const straightHigh = isWheel ? 3 : vals[0]

  const counts: Record<number, number> = {}
  vals.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
  // Rangs distincts ordonnés par (fréquence desc, puis valeur desc) = ordre canonique
  // de départage : rang du groupe (paire/brelan/carré) d'abord, puis kickers décroissants.
  const groups = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a)
  const freq = groups.map(v => counts[v]).sort((a, b) => b - a)

  // Score = catégorie dominante puis 5 clés de départage (base 16, offset +1),
  // pour départager correctement kickers et rangs de paires (fini paire-2 == paire-As).
  const enc = (cat: number, tb: number[]): number => {
    let s = cat
    for (let i = 0; i < 5; i++) s = s * 16 + ((tb[i] ?? -1) + 1)
    return s
  }

  if (straight && flush)
    return { score: enc(8, [straightHigh]), name: straightHigh === 12 ? 'Quinte Royale' : 'Quinte Flush' }
  if (freq[0] === 4) return { score: enc(7, groups), name: 'Carré' }
  if (freq[0] === 3 && freq[1] === 2) return { score: enc(6, groups), name: 'Full House' }
  if (flush) return { score: enc(5, vals), name: 'Couleur' }
  if (straight) return { score: enc(4, [straightHigh]), name: 'Suite' }
  if (freq[0] === 3) return { score: enc(3, groups), name: 'Brelan' }
  if (freq[0] === 2 && freq[1] === 2) return { score: enc(2, groups), name: 'Double Paire' }
  if (freq[0] === 2) return { score: enc(1, groups), name: 'Paire' }
  return { score: enc(0, vals), name: 'Carte haute' }
}

function evalHand(cards: Card[]): { score: number; name: string } {
  return score5(getBestFive(cards))
}

// Hand strength 0..1 for AI decision
function handStrength(hand: Card[], community: Card[]): number {
  if (community.length === 0) {
    // Pre-flop: use rank of hole cards
    const r1 = rankVal(hand[0].rank)
    const r2 = rankVal(hand[1].rank)
    const paired = r1 === r2
    const suited = hand[0].suit === hand[1].suit
    const high = Math.max(r1, r2)
    let s = high / 12
    if (paired) s = Math.min(1, s + 0.3)
    if (suited) s = Math.min(1, s + 0.1)
    return s
  }
  const { score } = evalHand([...hand, ...community])
  // Normalize: royal flush ~8M, high card ~12
  return Math.min(1, score / 6_000_000)
}

// ─── Game Init ────────────────────────────────────────────────────────────────

function initPlayers(dealer: PlayerPos, prevPlayers?: Player[]): Player[] {
  return [0, 1, 2].map(id => ({
    id: id as PlayerPos,
    name: id === 0 ? 'Vous' : `CPU ${id}`,
    chips: prevPlayers ? prevPlayers[id].chips : START_CHIPS,
    hand: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    isDealer: id === dealer,
    isAllIn: false,
    hasActed: false,
  }))
}

function dealHands(players: Player[], deck: Card[]): { players: Player[]; deck: Card[] } {
  const d = [...deck]
  const newPlayers = players.map(p => ({ ...p, hand: [d.shift()!, d.shift()!] }))
  return { players: newPlayers, deck: d }
}

function nextDealer(current: PlayerPos): PlayerPos {
  return ((current + 1) % 3) as PlayerPos
}

function nextActive(from: PlayerPos, players: Player[]): PlayerPos {
  for (let i = 1; i <= 3; i++) {
    const next = ((from + i) % 3) as PlayerPos
    if (!players[next].folded && !players[next].isAllIn) return next
  }
  return from
}

// ─── New Hand ────────────────────────────────────────────────────────────────

function startNewHand(prevState?: GameState): GameState {
  const dealer: PlayerPos = prevState ? nextDealer(prevState.dealer) : 0
  const sb: PlayerPos = ((dealer + 1) % 3) as PlayerPos
  const bb: PlayerPos = ((dealer + 2) % 3) as PlayerPos

  const deck = shuffle(makeDeck())
  let players = initPlayers(dealer, prevState?.players)

  // Post blinds
  players[sb].chips -= SB; players[sb].bet = SB; players[sb].totalBet = SB
  players[bb].chips -= BB; players[bb].bet = BB; players[bb].totalBet = BB

  const dealt = dealHands(players, deck)
  players = dealt.players

  // UTG acts first pre-flop (player after BB)
  const utg = ((bb + 1) % 3) as PlayerPos

  return {
    deck: dealt.deck,
    players,
    community: [],
    phase: 'preflop',
    pot: SB + BB,
    currentBet: BB,
    activePlayer: utg,
    dealer,
    result: '',
    winners: [],
    handNum: (prevState?.handNum ?? 0) + 1,
    animatingCards: true,
    raiseAmount: BB * 2,
    lastAction: null,
    bettingDone: false,
  }
}

// ─── Card Component ───────────────────────────────────────────────────────────

function CardEl({ c, hidden, small, animate }: {
  c?: Card; hidden?: boolean; small?: boolean; animate?: boolean
}) {
  const [visible, setVisible] = useState(!animate)
  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [animate])

  const w = small ? 32 : 44
  const h = small ? 44 : 60

  return (
    <div style={{
      width: w, minWidth: w, height: h, minHeight: h,
      borderRadius: 6,
      border: '1px solid',
      borderColor: hidden ? BORDER : '#e5e7eb',
      background: hidden ? '#1a1a3e' : '#fff',
      color: (c && !hidden) ? (isRed(c.suit) ? '#dc2626' : '#111') : '#555',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 2, fontSize: small ? 9 : 11, fontWeight: 700,
      userSelect: 'none', flexShrink: 0,
      transition: 'transform 0.3s, opacity 0.3s',
      transform: visible ? 'translateY(0) rotateY(0deg)' : 'translateY(-20px) rotateY(90deg)',
      opacity: visible ? 1 : 0,
      boxShadow: hidden ? 'none' : '0 1px 4px rgba(0,0,0,0.15)',
    }}>
      {hidden
        ? <span style={{ fontSize: small ? 12 : 18, opacity: 0.4 }}>🂠</span>
        : c
          ? <><span>{c.rank}</span><span style={{ fontSize: small ? 11 : 15 }}>{c.suit}</span></>
          : null
      }
    </div>
  )
}

// ─── Player Seat ──────────────────────────────────────────────────────────────

function PlayerSeat({ player, isActive, community, showCards, position }: {
  player: Player
  isActive: boolean
  community: Card[]
  showCards: boolean
  position: 'bottom' | 'top-left' | 'top-right'
}) {
  const isHuman = player.id === 0
  const hand = evalHand([...player.hand, ...community])
  const posStyles: Record<string, React.CSSProperties> = {
    'bottom':    { alignSelf: 'flex-end', marginBottom: 4 },
    'top-left':  { alignSelf: 'flex-start', marginTop: 4 },
    'top-right': { alignSelf: 'flex-start', marginTop: 4 },
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      ...posStyles[position],
      opacity: player.folded ? 0.4 : 1,
      transition: 'opacity 0.3s',
    }}>
      {/* Name + chips */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: isActive ? 'rgba(168,85,247,0.2)' : 'rgba(14,13,32,0.8)',
        border: `1px solid ${isActive ? ACCENT : BORDER}`,
        borderRadius: 8, padding: '4px 8px', fontSize: 11,
        transition: 'all 0.2s',
        boxShadow: isActive ? `0 0 12px rgba(168,85,247,0.4)` : 'none',
      }}>
        {player.isDealer && (
          <span style={{
            background: '#f59e0b', color: '#000', borderRadius: '50%',
            width: 16, height: 16, fontSize: 9, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>D</span>
        )}
        <span style={{ color: TEXT, fontWeight: 700 }}>{player.name}</span>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>
          {player.chips.toLocaleString()}🪙
        </span>
        {player.folded && <span style={{ color: '#ef4444', fontSize: 9, fontWeight: 700 }}>COUCHÉ</span>}
        {player.isAllIn && !player.folded && <span style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700 }}>ALL-IN</span>}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 3 }}>
        {player.hand.map((c, i) => (
          <CardEl
            key={i} c={c}
            hidden={!isHuman && !showCards}
            small={!isHuman}
            animate={true}
          />
        ))}
      </div>

      {/* Hand name (showdown for CPU, always for human) */}
      {(isHuman || showCards) && community.length >= 3 && !player.folded && (
        <div style={{ fontSize: 9, color: ACCENT, fontWeight: 700, textAlign: 'center' }}>
          {hand.name}
        </div>
      )}

      {/* Current round bet */}
      {player.bet > 0 && (
        <div style={{ fontSize: 9, color: '#f59e0b' }}>Mise: {player.bet}</div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PokerGame({ onBack }: { onBack?: () => void }) {
  const [gs, setGs] = useState<GameState>(() => startNewHand())
  const [showRaise, setShowRaise] = useState(false)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { submit } = useGameScore('poker')
  const scoreSubmittedRef = useRef(false)

  // Fin de main (abattage) : on soumet le tapis du joueur, une seule fois par main —
  // le flag se réarme quand la main suivante démarre (la phase quitte 'showdown')
  useEffect(() => {
    if (gs.phase === 'showdown' && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true
      submit(Math.max(0, Math.min(1000000, Math.round(gs.players[0].chips))))
    } else if (gs.phase !== 'showdown') {
      scoreSubmittedRef.current = false
    }
  }, [gs.phase, gs.players])

  // Clear animation flag
  useEffect(() => {
    if (gs.animatingCards) {
      const t = setTimeout(() => setGs(s => ({ ...s, animatingCards: false })), 500)
      return () => clearTimeout(t)
    }
  }, [gs.animatingCards, gs.handNum])

  // AI turn
  useEffect(() => {
    if (gs.phase === 'showdown' || gs.bettingDone) return
    const active = gs.activePlayer
    if (active === 0) return  // human's turn

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    aiTimerRef.current = setTimeout(() => {
      setGs(s => aiAction(s))
    }, 800 + Math.random() * 600)

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [gs.activePlayer, gs.phase, gs.bettingDone])

  // Advance phase when betting is done
  useEffect(() => {
    if (!gs.bettingDone || gs.phase === 'showdown') return
    const t = setTimeout(() => setGs(s => advancePhase(s)), 400)
    return () => clearTimeout(t)
  }, [gs.bettingDone, gs.phase])

  function handlePlayerAction(action: Action) {
    if (gs.activePlayer !== 0) return
    setShowRaise(false)
    setGs(s => applyAction(s, 0, action))
  }

  const callAmount = gs.currentBet - gs.players[0].bet
  const canCheck = callAmount === 0
  const canCall = callAmount > 0 && gs.players[0].chips >= callAmount
  const canRaise = gs.players[0].chips > callAmount

  const phaseLabel: Record<Phase, string> = {
    preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn',
    river: 'Rivière', showdown: 'Abattage',
  }

  const isShowdown = gs.phase === 'showdown'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>♠ Texas Hold'em</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
          <span style={{ color: MUTED }}>Main #{gs.handNum}</span>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{phaseLabel[gs.phase]}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #0f4c2c 0%, #083521 60%, #052416 100%)',
        padding: 12, gap: 8, overflow: 'hidden', minHeight: 0,
        borderBottom: `1px solid ${BORDER}`,
      }}>

        {/* Top row: 2 CPUs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <PlayerSeat player={gs.players[1]} isActive={gs.activePlayer === 1} community={gs.community} showCards={isShowdown} position="top-left" />
          <PlayerSeat player={gs.players[2]} isActive={gs.activePlayer === 2} community={gs.community} showCards={isShowdown} position="top-right" />
        </div>

        {/* Center: pot + community cards */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
          {/* Pot */}
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#f59e0b',
          }}>
            Pot: {gs.pot.toLocaleString()} 🪙
          </div>

          {/* Community cards */}
          <div style={{ display: 'flex', gap: 5 }}>
            {gs.community.map((c, i) => (
              <CardEl key={i} c={c} animate={true} />
            ))}
            {Array.from({ length: 5 - gs.community.length }).map((_, i) => (
              <div key={i} style={{
                width: 44, height: 60, borderRadius: 6,
                border: '1px dashed rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.2)', flexShrink: 0,
              }} />
            ))}
          </div>

          {/* Last action label */}
          {gs.lastAction && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              {gs.lastAction.player === 0 ? 'Vous' : `CPU ${gs.lastAction.player}`} : {gs.lastAction.action}
            </div>
          )}
        </div>

        {/* Bottom: human player */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PlayerSeat player={gs.players[0]} isActive={gs.activePlayer === 0 && !isShowdown} community={gs.community} showCards={true} position="bottom" />
        </div>
      </div>

      {/* Result banner */}
      {isShowdown && gs.result && (
        <div style={{
          padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 13,
          background: gs.winners.includes(0) ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
          color: gs.winners.includes(0) ? '#22c55e' : '#ef4444',
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          {gs.result}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '8px 12px', flexShrink: 0, background: SURFACE }}>

        {isShowdown ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setShowRaise(false); setGs(s => startNewHand(s)) }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Nouvelle main →
            </button>
            {gs.players.some(p => p.chips <= 0) && (
              <div style={{ fontSize: 11, color: MUTED, alignSelf: 'center' }}>
                Recrédit automatique à 1000
              </div>
            )}
          </div>
        ) : gs.activePlayer !== 0 ? (
          <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, padding: '8px 0' }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>
              {gs.players[gs.activePlayer].name} réfléchit...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Raise slider */}
            {showRaise && (
              <div style={{
                background: SURFACE2, border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: '8px 10px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED }}>
                  <span>Relance :</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>{gs.raiseAmount} 🪙</span>
                </div>
                <input
                  type="range"
                  min={Math.max(BB, gs.currentBet * 2)}
                  max={gs.players[0].chips}
                  step={BB}
                  value={gs.raiseAmount}
                  onChange={e => setGs(s => ({ ...s, raiseAmount: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: ACCENT }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0.25, 0.5, 0.75, 1].map(frac => {
                    const v = Math.round(gs.pot * frac / BB) * BB
                    return (
                      <button key={frac}
                        onClick={() => setGs(s => ({ ...s, raiseAmount: Math.min(gs.players[0].chips, Math.max(BB * 2, v)) }))}
                        style={{ flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 10, fontWeight: 600, background: SURFACE, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer' }}
                      >
                        {frac === 1 ? 'All-in' : `${Math.round(frac * 100)}%`}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handlePlayerAction('fold')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}
              >
                Se coucher
              </button>

              {canCheck ? (
                <button
                  onClick={() => handlePlayerAction('check')}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12, background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT, cursor: 'pointer' }}
                >
                  Check
                </button>
              ) : (
                <button
                  onClick={() => handlePlayerAction('call')}
                  disabled={!canCall}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12, background: SURFACE2, border: `1px solid ${BORDER}`, color: canCall ? TEXT : MUTED, cursor: canCall ? 'pointer' : 'default', opacity: canCall ? 1 : 0.5 }}
                >
                  Suivre {callAmount}
                </button>
              )}

              {canRaise && (
                <button
                  onClick={() => {
                    if (showRaise) handlePlayerAction('raise')
                    else setShowRaise(true)
                  }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12, background: showRaise ? ACCENT : 'rgba(168,85,247,0.15)', border: `1px solid ${showRaise ? 'transparent' : 'rgba(168,85,247,0.3)'}`, color: showRaise ? '#fff' : ACCENT, cursor: 'pointer' }}
                >
                  {showRaise ? `Relancer ${gs.raiseAmount}` : 'Relancer'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Game Logic ───────────────────────────────────────────────────────────────

function applyAction(s: GameState, pid: PlayerPos, action: Action): GameState {
  const players = s.players.map(p => ({ ...p }))
  const p = players[pid]
  let { pot, currentBet, raiseAmount } = s

  let actionLabel = ''

  if (action === 'fold') {
    p.folded = true
    actionLabel = 'Se couche'
  } else if (action === 'check') {
    actionLabel = 'Check'
  } else if (action === 'call') {
    const toCall = Math.min(currentBet - p.bet, p.chips)
    p.chips -= toCall
    p.bet += toCall
    p.totalBet += toCall
    pot += toCall
    if (p.chips === 0) p.isAllIn = true
    actionLabel = `Suit (${toCall})`
  } else if (action === 'raise') {
    const totalPut = raiseAmount
    const extra = Math.min(totalPut - p.bet, p.chips)
    p.chips -= extra
    p.totalBet += extra
    pot += extra
    currentBet = totalPut
    p.bet = totalPut
    if (p.chips === 0) p.isAllIn = true
    actionLabel = `Relance ${totalPut}`
  }

  // Le joueur a agi. Une relance rouvre le tour : tous les autres joueurs encore
  // en jeu (non couchés, non all-in) doivent à nouveau répondre.
  p.hasActed = true
  if (action === 'raise') {
    players.forEach(other => {
      if (other.id !== pid && !other.folded && !other.isAllIn) other.hasActed = false
    })
  }

  // Check if betting round is over
  const bettingDone = checkBettingDone(players, currentBet, s.phase)

  // Next player
  let activePlayer = s.activePlayer
  if (!bettingDone) {
    activePlayer = nextActive(pid, players)
  }

  return {
    ...s,
    players,
    pot,
    currentBet,
    activePlayer,
    lastAction: { player: pid, action: actionLabel },
    bettingDone,
  }
}

function checkBettingDone(players: Player[], currentBet: number, _phase: Phase): boolean {
  // Only 1 or 0 non-folded players left
  const notFolded = players.filter(p => !p.folded)
  if (notFolded.length <= 1) return true
  const active = players.filter(p => !p.folded && !p.isAllIn)
  // Le tour n'est clos que si TOUS les joueurs encore en jeu ont AGI depuis la
  // dernière relance ET égalisé la mise. Sinon un simple check post-flop clôturait
  // le tour (les autres ne jouaient jamais) et la grosse blinde n'avait pas son option préflop.
  return active.every(p => p.hasActed && p.bet === currentBet)
}

function advancePhase(s: GameState): GameState {
  // Reset bets AND acted-flag for new round (chacun doit rejouer sur la nouvelle street)
  const players = s.players.map(p => ({ ...p, bet: 0, hasActed: false }))
  const notFolded = players.filter(p => !p.folded)

  // Only 1 player left — they win
  if (notFolded.length === 1) {
    const winner = notFolded[0]
    winner.chips += s.pot
    return {
      ...s, players, phase: 'showdown',
      result: `${winner.name} remporte le pot de ${s.pot} 🪙`,
      winners: [winner.id as PlayerPos],
      bettingDone: false,
    }
  }

  const deck = [...s.deck]
  let community = [...s.community]
  let phase = s.phase

  if (phase === 'preflop') {
    community = [deck.shift()!, deck.shift()!, deck.shift()!]
    phase = 'flop'
  } else if (phase === 'flop') {
    community.push(deck.shift()!)
    phase = 'turn'
  } else if (phase === 'turn') {
    community.push(deck.shift()!)
    phase = 'river'
  } else if (phase === 'river') {
    return doShowdown({ ...s, players, community, deck })
  }

  // Find first to act post-flop: first active player left of dealer
  const dealer = s.dealer
  let firstAct = nextActive(dealer, players)
  // Reset currentBet for new round
  return {
    ...s, players, community, deck, phase,
    currentBet: 0, activePlayer: firstAct,
    bettingDone: false, lastAction: null,
    raiseAmount: BB * 2,
    animatingCards: true,
  }
}

function doShowdown(s: GameState): GameState {
  const players = s.players.map(p => ({ ...p }))

  // Score de chaque joueur encore en lice, calculé une seule fois.
  const scoreOf = new Map<PlayerPos, number>()
  players.forEach(p => {
    if (!p.folded) scoreOf.set(p.id, evalHand([...p.hand, ...s.community]).score)
  })

  // Répartition en side-pots par paliers de contribution (totalBet) : un joueur
  // all-in short-stack ne peut gagner que le pot qu'il a réellement couvert, le
  // surplus mis par les gros tapis forme un pot annexe disputé entre eux seuls.
  const payouts: Record<number, number> = {}
  players.forEach(p => { payouts[p.id] = 0 })

  const levels = [...new Set(players.map(p => p.totalBet).filter(t => t > 0))].sort((a, b) => a - b)
  let prev = 0
  for (const level of levels) {
    const layerPer = level - prev
    const contributors = players.filter(p => p.totalBet >= level)
    const potLayer = layerPer * contributors.length
    const eligible = contributors.filter(p => !p.folded)
    if (eligible.length > 0 && potLayer > 0) {
      const best = Math.max(...eligible.map(p => scoreOf.get(p.id) ?? -1))
      const winners = eligible.filter(p => scoreOf.get(p.id) === best)
      const share = Math.floor(potLayer / winners.length)
      let remainder = potLayer - share * winners.length
      winners.forEach(w => {
        payouts[w.id] += share
        if (remainder > 0) { payouts[w.id] += 1; remainder-- } // jeton impair au(x) premier(s)
      })
    }
    prev = level
  }

  players.forEach(p => { p.chips += payouts[p.id] })

  // Vainqueur(s) du pot principal (meilleure main) pour le message et le surlignage.
  const overallBest = Math.max(...[...scoreOf.values()])
  const mainWinners = players.filter(p => !p.folded && scoreOf.get(p.id) === overallBest)
  const humanWon = payouts[0] > 0

  let result = ''
  if (mainWinners.length === 1) {
    const w = mainWinners[0]
    const hand = evalHand([...w.hand, ...s.community])
    result = w.id === 0
      ? `Vous gagnez avec ${hand.name} ! +${payouts[0]} 🎉`
      : humanWon
        ? `${w.name} gagne avec ${hand.name} — vous récupérez +${payouts[0]}`
        : `${w.name} gagne avec ${hand.name} 😞`
  } else {
    result = humanWon ? `Égalité — vous remportez +${payouts[0]} 🤝` : `Égalité ! Pot partagé 🤝`
  }

  // Bust check — give 1000 chips back
  players.forEach(p => {
    if (p.chips <= 0) { p.chips = START_CHIPS }
  })

  return {
    ...s, players, phase: 'showdown',
    result, winners: players.filter(p => payouts[p.id] > 0).map(w => w.id as PlayerPos),
    bettingDone: false,
  }
}

function aiAction(s: GameState): GameState {
  const pid = s.activePlayer
  const player = s.players[pid]
  const strength = handStrength(player.hand, s.community)
  const callAmount = s.currentBet - player.bet
  const bluff = Math.random() < 0.10

  let action: Action
  if (bluff) {
    action = callAmount === 0 ? 'raise' : Math.random() < 0.5 ? 'raise' : 'call'
  } else if (strength < 0.25) {
    action = callAmount === 0 ? 'check' : 'fold'
  } else if (strength < 0.50) {
    action = callAmount === 0 ? 'check' : 'call'
  } else if (strength < 0.75) {
    action = callAmount === 0 ? 'raise' : 'call'
  } else {
    action = 'raise'
  }

  // Can't raise if not enough chips
  if (action === 'raise' && player.chips <= callAmount) {
    action = player.chips > 0 ? 'call' : 'fold'
  }

  let newState = s
  if (action === 'raise') {
    const minRaise = Math.max(BB * 2, s.currentBet * 2)
    const raiseAmt = Math.min(player.chips, Math.round(minRaise * (1 + strength)))
    newState = { ...s, raiseAmount: raiseAmt }
  }

  return applyAction(newState, pid, action)
}
