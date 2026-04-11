import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, RotateCcw, Swords } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ───────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
type Suit = typeof SUITS[number]
type Rank = typeof RANKS[number]
type Card = { rank: Rank; suit: Suit; id: string }

const isRed = (s: Suit) => s === '♥' || s === '♦'
const cardValue = (r: Rank) => RANKS.indexOf(r)

function makeDeck(): Card[] {
  const deck: Card[] = SUITS.flatMap(s => RANKS.map(r => ({ rank: r, suit: s, id: `${r}${s}${Math.random()}` })))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function freshDeal(): [Card[], Card[]] {
  const full = makeDeck()
  return [full.slice(0, 26), full.slice(26)]
}

// ─── Card Component ───────────────────────────────────────────────────────────
function PlayingCard({ card, faceDown = false, small = false, animate = false }: {
  card: Card; faceDown?: boolean; small?: boolean; animate?: boolean
}) {
  const red = isRed(card.suit)
  const w = small ? 44 : 72
  const h = small ? 62 : 100

  if (faceDown) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 10, border: '2px solid rgba(168,85,247,0.4)',
        background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #1a1040 100%)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          width: w - 12, height: h - 12, borderRadius: 6,
          border: '1.5px solid rgba(168,85,247,0.3)',
          background: 'repeating-linear-gradient(45deg, rgba(168,85,247,0.08) 0px, rgba(168,85,247,0.08) 4px, transparent 4px, transparent 8px)',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      width: w, height: h, borderRadius: 10, border: '2px solid #e5e7eb',
      background: '#ffffff',
      boxShadow: animate ? '0 8px 32px rgba(168,85,247,0.4), 0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.3)',
      display: 'flex', flexDirection: 'column',
      padding: small ? '3px 4px' : '5px 7px',
      position: 'relative', flexShrink: 0,
      transition: 'box-shadow 0.3s ease',
    }}>
      {/* Top-left rank + suit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontWeight: 900, fontSize: small ? 11 : 16, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{card.rank}</span>
        <span style={{ fontSize: small ? 9 : 13, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{card.suit}</span>
      </div>
      {/* Center suit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: small ? 18 : 32, color: red ? '#dc2626' : '#111', userSelect: 'none' }}>{card.suit}</span>
      </div>
      {/* Bottom-right rank + suit (rotated) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1, transform: 'rotate(180deg)' }}>
        <span style={{ fontWeight: 900, fontSize: small ? 11 : 16, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{card.rank}</span>
        <span style={{ fontSize: small ? 9 : 13, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{card.suit}</span>
      </div>
    </div>
  )
}

// ─── Deck Pile Visual ────────────────────────────────────────────────────────
function DeckPile({ count, label }: { count: number; label: string }) {
  const layers = Math.min(4, Math.ceil(count / 6))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 72, height: 100 + layers * 3 }}>
        {Array.from({ length: layers }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: i * 2, top: i * 2,
            width: 72, height: 100, borderRadius: 10,
            border: '2px solid rgba(168,85,247,0.3)',
            background: `linear-gradient(135deg, hsl(${260 + i * 5},60%,${12 + i * 2}%) 0%, hsl(${270 + i * 5},60%,${20 + i * 2}%) 100%)`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }} />
        ))}
        {count === 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: 72, height: 100, borderRadius: 10,
            border: '2px dashed rgba(148,163,184,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>∅</span>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: MUTED }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>{count}</div>
        <div style={{ fontSize: 10, color: MUTED }}>cartes</div>
      </div>
    </div>
  )
}

// ─── War Cards (face-down piles during war) ──────────────────────────────────
function WarPile({ cards }: { cards: Card[] }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
      {cards.map((c) => (
        <PlayingCard key={c.id} card={c} faceDown small />
      ))}
    </div>
  )
}

// ─── Main Game ───────────────────────────────────────────────────────────────
type GamePhase = 'playing' | 'war' | 'animating' | 'victory'
type BattleResult = 'player' | 'cpu' | 'war' | null

export default function WarGame({ onBack }: { onBack?: () => void }) {
  const [pDeck, setPDeck] = useState<Card[]>(() => freshDeal()[0])
  const [cDeck, setCDeck] = useState<Card[]>(() => freshDeal()[1])
  const [pCard, setPCard] = useState<Card | null>(null)
  const [cCard, setCCard] = useState<Card | null>(null)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [result, setResult] = useState<BattleResult>(null)
  const [warCards, setWarCards] = useState<Card[]>([])
  const [roundCount, setRoundCount] = useState(0)
  const [warCount, setWarCount] = useState(0)
  const [playerWins, setPlayerWins] = useState(0)
  const [cpuWins, setCpuWins] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const newGame = () => {
    clearTimeout(timerRef.current)
    const [p, c] = freshDeal()
    setPDeck(p); setCDeck(c)
    setPCard(null); setCCard(null)
    setPhase('playing'); setResult(null)
    setWarCards([]); setRoundCount(0)
    setWarCount(0); setPlayerWins(0); setCpuWins(0)
    setAnimKey(k => k + 1)
  }

  const drawBattle = () => {
    if (phase !== 'playing' || pDeck.length === 0 || cDeck.length === 0) return

    setPhase('animating')
    const pc = pDeck[0], cc = cDeck[0]
    const newP = pDeck.slice(1), newC = cDeck.slice(1)
    setPCard(pc); setCCard(cc)
    setRoundCount(r => r + 1)
    setAnimKey(k => k + 1)

    const pv = cardValue(pc.rank), cv = cardValue(cc.rank)

    timerRef.current = setTimeout(() => {
      if (pv > cv) {
        setResult('player')
        setPlayerWins(w => w + 1)
        timerRef.current = setTimeout(() => {
          setPDeck([...newP, pc, cc, ...warCards])
          setCDeck(newC)
          setWarCards([])
          setResult(null)
          setPCard(null); setCCard(null)
          setPhase(newC.length === 0 ? 'victory' : 'playing')
        }, 1200)
      } else if (cv > pv) {
        setResult('cpu')
        setCpuWins(w => w + 1)
        timerRef.current = setTimeout(() => {
          setCDeck([...newC, pc, cc, ...warCards])
          setPDeck(newP)
          setWarCards([])
          setResult(null)
          setPCard(null); setCCard(null)
          setPhase(newP.length === 0 ? 'victory' : 'playing')
        }, 1200)
      } else {
        setResult('war')
        setWarCount(w => w + 1)
        timerRef.current = setTimeout(() => {
          // War: each side puts 3 cards face-down
          const warP = newP.slice(0, 3), warC = newC.slice(0, 3)
          const remainP = newP.slice(3), remainC = newC.slice(3)
          setWarCards(prev => [...prev, pc, cc, ...warP, ...warC])
          setPDeck(remainP); setCDeck(remainC)
          setPCard(null); setCCard(null)
          setResult(null)
          if (remainP.length === 0 || remainC.length === 0) {
            setPhase('victory')
          } else {
            setPhase('war')
            timerRef.current = setTimeout(() => setPhase('playing'), 600)
          }
        }, 1400)
      }
    }, 700)
  }

  const totalCards = pDeck.length + cDeck.length + warCards.length + (pCard ? 1 : 0) + (cCard ? 1 : 0)
  const pPct = totalCards > 0 ? Math.round((pDeck.length / totalCards) * 100) : 50
  const winner = pDeck.length === 0 ? 'cpu' : cDeck.length === 0 ? 'player' : null

  const resultColor = result === 'player' ? '#22c55e' : result === 'cpu' ? '#ef4444' : result === 'war' ? '#f59e0b' : 'transparent'
  const resultMsg = result === 'player' ? 'Vous gagnez ce pli !' : result === 'cpu' ? 'CPU gagne ce pli' : result === 'war' ? '⚔️ GUERRE !' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, userSelect: 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} style={{ padding: '6px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>⚔️ Bataille</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: MUTED, textAlign: 'right' }}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>Vous {playerWins}</span>
            <span style={{ color: MUTED }}> — </span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{cpuWins} CPU</span>
          </div>
          <button onClick={newGame} style={{ padding: '6px', borderRadius: 8, background: SURFACE2, border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: SURFACE2, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
          width: `${pPct}%`,
          transition: 'width 0.5s ease',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, height: '100%',
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          width: `${100 - pPct}%`,
          borderRadius: '0 3px 3px 0',
        }} />
      </div>

      {/* Main battle area */}
      <div style={{
        borderRadius: 20, padding: '20px 16px',
        background: SURFACE, border: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
      }}>

        {/* CPU side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
          <DeckPile count={cDeck.length} label="CPU" />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
            {cCard ? (
              <div key={`cpu-${animKey}`} style={{ animation: 'slideDown 0.35s ease-out' }}>
                <PlayingCard card={cCard} animate={result !== null} />
              </div>
            ) : (
              <div style={{ width: 72, height: 100, borderRadius: 10, border: '2px dashed rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: MUTED, fontSize: 10, opacity: 0.5 }}>...</span>
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        <div style={{
          minHeight: 40, width: '100%', borderRadius: 12,
          background: result ? `${resultColor}18` : 'transparent',
          border: `1px solid ${result ? `${resultColor}40` : 'transparent'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          padding: result ? '8px 16px' : '0',
        }}>
          {result && (
            <span style={{ fontSize: 15, fontWeight: 700, color: resultColor }}>{resultMsg}</span>
          )}
          {phase === 'war' && warCards.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                <Swords size={14} style={{ display: 'inline', marginRight: 4 }} />
                {warCards.length} cartes en jeu
              </span>
              <WarPile cards={warCards} />
            </div>
          )}
          {phase === 'playing' && !result && roundCount === 0 && (
            <span style={{ fontSize: 12, color: MUTED }}>Tirez une carte pour commencer</span>
          )}
        </div>

        {/* Player side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
            {pCard ? (
              <div key={`p-${animKey}`} style={{ animation: 'slideUp 0.35s ease-out' }}>
                <PlayingCard card={pCard} animate={result !== null} />
              </div>
            ) : (
              <div style={{ width: 72, height: 100, borderRadius: 10, border: '2px dashed rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: MUTED, fontSize: 10, opacity: 0.5 }}>...</span>
              </div>
            )}
          </div>
          <DeckPile count={pDeck.length} label="Vous" />
        </div>
      </div>

      {/* Stats row */}
      {roundCount > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Plis joués', value: roundCount },
            { label: 'Guerres', value: warCount },
            { label: 'Vos victoires', value: playerWins, color: '#22c55e' },
            { label: 'Victoires CPU', value: cpuWins, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, borderRadius: 12, padding: '8px 6px', textAlign: 'center',
              background: SURFACE, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color || TEXT }}>{s.value}</div>
              <div style={{ fontSize: 9, color: MUTED, marginTop: 2, lineHeight: 1.2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Victory screen */}
      {(phase === 'victory' || winner) && (
        <div style={{
          borderRadius: 20, padding: 24, textAlign: 'center',
          background: winner === 'player' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${winner === 'player' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{winner === 'player' ? '🏆' : '💀'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: winner === 'player' ? '#22c55e' : '#ef4444', marginBottom: 4 }}>
            {winner === 'player' ? 'Victoire !' : 'Défaite'}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
            {winner === 'player' ? 'Vous avez toutes les 52 cartes !' : 'Le CPU a toutes les 52 cartes'}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
            {roundCount} plis joués · {warCount} guerres
          </div>
          <button onClick={newGame} style={{
            padding: '12px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Rejouer
          </button>
        </div>
      )}

      {/* Action button */}
      {phase !== 'victory' && !winner && (
        <button
          onClick={drawBattle}
          disabled={phase === 'animating' || pDeck.length === 0 || cDeck.length === 0}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            fontWeight: 700, fontSize: 15,
            background: (phase === 'animating') ? SURFACE2 : ACCENT,
            color: (phase === 'animating') ? MUTED : '#fff',
            border: `1px solid ${(phase === 'animating') ? BORDER : 'transparent'}`,
            cursor: (phase === 'animating') ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}>
          {phase === 'war' ? '⚔️ Résoudre la guerre !' : '🃏 Tirer une carte'}
        </button>
      )}

      <style>{`
        @keyframes slideDown { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideUp   { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
