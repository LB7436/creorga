import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Blackjack — vs Dealer (rules : dealer hits soft 17, blackjack pays 3:2).
 * Real card deck, animated cards, hit/stand/double.
 */

type Suit = '♠' | '♥' | '♦' | '♣'
interface Card { suit: Suit; rank: string; value: number }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 }, { rank: '3', value: 3 }, { rank: '4', value: 4 },
  { rank: '5', value: 5 }, { rank: '6', value: 6 }, { rank: '7', value: 7 },
  { rank: '8', value: 8 }, { rank: '9', value: 9 }, { rank: '10', value: 10 },
  { rank: 'J', value: 10 }, { rank: 'Q', value: 10 }, { rank: 'K', value: 10 },
]

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r.rank, value: r.value })
  return deck.sort(() => Math.random() - 0.5)
}

function handValue(cards: Card[]): number {
  let total = cards.reduce((s, c) => s + c.value, 0)
  let aces = cards.filter((c) => c.rank === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

type Phase = 'betting' | 'playing' | 'dealer' | 'ended'

export default function Blackjack({ accent }: { accent: string }) {
  const [credits, setCredits] = useState(100)
  const [bet, setBet] = useState(10)
  const [deck, setDeck] = useState<Card[]>(() => buildDeck())
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [phase, setPhase] = useState<Phase>('betting')
  const [message, setMessage] = useState<string>('')

  const draw = (current: Card[] = deck): { card: Card; rest: Card[] } => {
    if (current.length === 0) {
      const newDeck = buildDeck()
      return { card: newDeck[0], rest: newDeck.slice(1) }
    }
    return { card: current[0], rest: current.slice(1) }
  }

  const start = () => {
    if (credits < bet) return
    setCredits((c) => c - bet)
    setMessage('')
    let d = deck.length < 10 ? buildDeck() : deck
    const p1 = draw(d); const d1 = draw(p1.rest)
    const p2 = draw(d1.rest); const d2 = draw(p2.rest)
    setPlayer([p1.card, p2.card])
    setDealer([d1.card, d2.card])
    setDeck(d2.rest)
    // Check natural blackjack
    if (handValue([p1.card, p2.card]) === 21) {
      setPhase('ended')
      const win = Math.floor(bet * 2.5)
      setMessage(`🎉 Blackjack ! +${win}`)
      setCredits((c) => c + win)
      return
    }
    setPhase('playing')
  }

  const hit = () => {
    if (phase !== 'playing') return
    const { card, rest } = draw()
    const newPlayer = [...player, card]
    setPlayer(newPlayer)
    setDeck(rest)
    const v = handValue(newPlayer)
    if (v > 21) { setPhase('ended'); setMessage(`💥 Bust ! Perdu`) }
    else if (v === 21) stand(newPlayer)
  }

  const stand = (p: Card[] = player) => {
    setPhase('dealer')
    let d = [...dealer]
    let currentDeck = deck
    while (handValue(d) < 17) {
      const { card, rest } = draw(currentDeck)
      d = [...d, card]; currentDeck = rest
    }
    setDealer(d); setDeck(currentDeck)
    setTimeout(() => {
      const pv = handValue(p), dv = handValue(d)
      if (dv > 21) { setMessage(`🎉 Dealer bust ! +${bet * 2}`); setCredits((c) => c + bet * 2) }
      else if (dv > pv) setMessage(`😢 Dealer ${dv} vs ${pv}`)
      else if (dv === pv) { setMessage(`🤝 Égalité, mise rendue`); setCredits((c) => c + bet) }
      else { setMessage(`🎉 Vous gagnez ${pv} vs ${dv} ! +${bet * 2}`); setCredits((c) => c + bet * 2) }
      setPhase('ended')
    }, 800)
  }

  const reset = () => { setPlayer([]); setDealer([]); setMessage(''); setPhase('betting') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 420, width: '100%' }}>
      <div style={hud(accent)}>
        <div>
          <div style={hudLabel}>CRÉDITS</div>
          <div style={hudValue('#fbbf24')}>{credits} 🪙</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={hudLabel}>MISE</div>
          <div style={hudValue(accent)}>{bet} 🪙</div>
        </div>
      </div>

      {/* Dealer */}
      {(phase !== 'betting' && dealer.length > 0) && (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            🤖 Croupier {phase === 'playing' ? '· ?' : `· ${handValue(dealer)}`}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dealer.map((c, i) => (
              <CardView key={i} card={c} hidden={phase === 'playing' && i === 1} delay={i * 0.1} />
            ))}
          </div>
        </div>
      )}

      {/* Player */}
      {(phase !== 'betting' && player.length > 0) && (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            🧑 Vous · {handValue(player)}
            {handValue(player) === 21 && ' 🎯'}
            {handValue(player) > 21 && ' 💥'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {player.map((c, i) => (
              <CardView key={i} card={c} delay={i * 0.1} />
            ))}
          </div>
        </div>
      )}

      {message && (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
          style={{
            padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 800,
            background: message.includes('gagnez') || message.includes('Blackjack') || message.includes('bust !') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: message.includes('gagnez') || message.includes('Blackjack') || message.includes('bust !') ? '#10b981' : '#ef4444',
            textAlign: 'center', width: '100%',
          }}>
          {message}
        </motion.div>
      )}

      {/* Actions */}
      {phase === 'betting' && (
        <>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            {[5, 10, 25, 50, 100].map((b) => (
              <button key={b} onClick={() => setBet(b)} disabled={credits < b}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: bet === b ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(255,255,255,0.05)',
                  color: '#fff', fontWeight: 700, fontSize: 12, opacity: credits < b ? 0.4 : 1,
                }}>{b}</button>
            ))}
          </div>
          <button onClick={start} disabled={credits < bet} style={btnPrimary(accent, credits >= bet)}>
            🎴 Distribuer {bet}
          </button>
        </>
      )}
      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button onClick={hit} style={{ ...btnPrimary(accent, true), flex: 1 }}>
            ➕ Tirer (Hit)
          </button>
          <button onClick={() => stand()} style={{ ...btnPrimary('#94a3b8', true), flex: 1, background: 'rgba(255,255,255,0.1)' }}>
            ✋ Rester (Stand)
          </button>
        </div>
      )}
      {phase === 'ended' && (
        <button onClick={reset} style={btnPrimary(accent, true)}>🔄 Nouvelle main</button>
      )}

      {credits < 5 && phase === 'betting' && (
        <button onClick={() => setCredits(100)} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px dashed #94a3b8',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
        }}>+ Recharger 100 crédits</button>
      )}
    </div>
  )
}

function CardView({ card, hidden, delay }: { card: Card; hidden?: boolean; delay?: number }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <motion.div
      initial={{ y: -30, opacity: 0, rotate: -10 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
      style={{
        width: 60, height: 84, borderRadius: 8, padding: 6,
        background: hidden
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : '#fff',
        color: hidden ? '#fff' : isRed ? '#ef4444' : '#0f172a',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
      {hidden ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🂠</div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{card.rank}</div>
          <div style={{ textAlign: 'center', fontSize: 26, lineHeight: 1 }}>{card.suit}</div>
          <div style={{ fontSize: 14, fontWeight: 800, transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>{card.rank}</div>
        </>
      )}
    </motion.div>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between',
  padding: '12px 16px', borderRadius: 12,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 10, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 22, fontWeight: 800, color })
const btnPrimary = (color: string, enabled: boolean): React.CSSProperties => ({
  padding: '14px 24px', borderRadius: 999, border: 'none',
  background: enabled ? `linear-gradient(135deg, ${color}, #ec4899)` : 'rgba(148,163,184,0.3)',
  color: '#fff', fontWeight: 800, fontSize: 15,
  cursor: enabled ? 'pointer' : 'not-allowed',
  boxShadow: enabled ? `0 4px 14px ${color}50` : 'none',
})
