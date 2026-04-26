import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Poker — 5-Card Draw vs CPU.
 * Phases: betting → deal → discard (sélectionne cartes à jeter) → showdown.
 * Hand ranking : Royal Flush > Straight Flush > Four > Full > Flush > Straight > Three > Two Pair > Pair > High Card.
 * Payouts table : pair Jacks+ ×1, two pair ×2, three ×3, straight ×4, flush ×6, full ×9, four ×25, sf ×50, royal ×250.
 */

type Suit = '♠' | '♥' | '♦' | '♣'
interface Card { suit: Suit; rank: number; label: string }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANK_LABELS = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

function buildDeck(): Card[] {
  const d: Card[] = []
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ suit: s, rank: r, label: RANK_LABELS[r] })
  return d.sort(() => Math.random() - 0.5)
}

interface HandResult { rank: number; name: string; payout: number }

function evaluateHand(cards: Card[]): HandResult {
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b)
  const counts = new Map<number, number>()
  ranks.forEach((r) => counts.set(r, (counts.get(r) || 0) + 1))
  const countVals = [...counts.values()].sort((a, b) => b - a)
  const isFlush = cards.every((c) => c.suit === cards[0].suit)
  // straight: consecutive 5 unique ranks; A-2-3-4-5 wheel
  const unique = [...new Set(ranks)].sort((a, b) => a - b)
  let isStraight = false
  if (unique.length === 5) {
    if (unique[4] - unique[0] === 4) isStraight = true
    if (unique.join(',') === '2,3,4,5,14') isStraight = true
  }
  const isRoyal = isFlush && unique.join(',') === '10,11,12,13,14'

  if (isRoyal)                    return { rank: 9, name: 'Quinte flush royale', payout: 250 }
  if (isStraight && isFlush)      return { rank: 8, name: 'Quinte flush',         payout: 50 }
  if (countVals[0] === 4)         return { rank: 7, name: 'Carré',                payout: 25 }
  if (countVals[0] === 3 && countVals[1] === 2) return { rank: 6, name: 'Full',   payout: 9 }
  if (isFlush)                    return { rank: 5, name: 'Couleur',              payout: 6 }
  if (isStraight)                 return { rank: 4, name: 'Quinte',               payout: 4 }
  if (countVals[0] === 3)         return { rank: 3, name: 'Brelan',               payout: 3 }
  if (countVals[0] === 2 && countVals[1] === 2) return { rank: 2, name: 'Double paire', payout: 2 }
  if (countVals[0] === 2) {
    // Pair of Jacks or better
    const pairRank = [...counts.entries()].find(([_, c]) => c === 2)![0]
    if (pairRank >= 11) return { rank: 1, name: 'Paire (J+)', payout: 1 }
    return { rank: 0, name: 'Paire faible', payout: 0 }
  }
  return { rank: 0, name: 'Hauteur', payout: 0 }
}

type Phase = 'betting' | 'discard' | 'showdown'

export default function Poker({ accent }: { accent: string }) {
  const [credits, setCredits] = useState(100)
  const [bet, setBet] = useState(5)
  const [hand, setHand] = useState<Card[]>([])
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false])
  const [phase, setPhase] = useState<Phase>('betting')
  const [result, setResult] = useState<HandResult | null>(null)
  const [deck, setDeck] = useState<Card[]>([])

  const deal = () => {
    if (credits < bet) return
    setCredits((c) => c - bet)
    const d = buildDeck()
    setHand(d.slice(0, 5))
    setDeck(d.slice(5))
    setHeld([false, false, false, false, false])
    setPhase('discard')
    setResult(null)
  }

  const toggleHold = (i: number) => {
    if (phase !== 'discard') return
    setHeld((h) => h.map((v, idx) => idx === i ? !v : v))
  }

  const draw = () => {
    if (phase !== 'discard') return
    let d = [...deck]
    const newHand = hand.map((c, i) => held[i] ? c : (d.shift() || c))
    setHand(newHand)
    setDeck(d)
    const res = evaluateHand(newHand)
    setResult(res)
    if (res.payout > 0) setCredits((c) => c + bet * res.payout)
    setPhase('showdown')
  }

  const reset = () => {
    setPhase('betting'); setHand([]); setResult(null); setHeld([false, false, false, false, false])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 460, width: '100%' }}>
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

      {phase !== 'betting' && (
        <div style={{
          display: 'flex', gap: 6, padding: 10, borderRadius: 10,
          background: 'linear-gradient(135deg, #0a3d2a, #052e1a)',
          border: '2px solid #10b981',
        }}>
          {hand.map((c, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={() => toggleHold(i)}
              initial={{ y: -30, opacity: 0, rotate: -8 }}
              animate={{ y: held[i] && phase === 'discard' ? -10 : 0, opacity: 1, rotate: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
              style={{
                width: 56, height: 80, borderRadius: 8, padding: 6,
                background: held[i] ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#fff',
                color: c.suit === '♥' || c.suit === '♦' ? '#ef4444' : '#0f172a',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                cursor: phase === 'discard' ? 'pointer' : 'default',
                boxShadow: held[i] ? '0 6px 14px rgba(251,191,36,0.6)' : '0 4px 8px rgba(0,0,0,0.4)',
                border: held[i] ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
              }}>
              <div style={{ fontSize: 12, fontWeight: 800 }}>{c.label}</div>
              <div style={{ textAlign: 'center', fontSize: 24, lineHeight: 1 }}>{c.suit}</div>
              <div style={{ fontSize: 12, fontWeight: 800, transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>{c.label}</div>
              {held[i] && phase === 'discard' && (
                <div style={{
                  position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                  padding: '1px 6px', background: '#f59e0b', color: '#fff', borderRadius: 999,
                  fontSize: 8, fontWeight: 800,
                }}>HOLD</div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {result && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{
            padding: '10px 18px', borderRadius: 999,
            background: result.payout > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(148,163,184,0.3)',
            color: '#fff', fontWeight: 800, fontSize: 15,
          }}>
          {result.payout > 0 ? `🎉 ${result.name} · +${bet * result.payout} (×${result.payout})` : `${result.name} · perdu`}
        </motion.div>
      )}

      {phase === 'betting' && (
        <>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            {[1, 5, 10, 25, 50].map((b) => (
              <button key={b} onClick={() => setBet(b)} disabled={credits < b}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: bet === b ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(255,255,255,0.05)',
                  color: '#fff', fontWeight: 700, fontSize: 12, opacity: credits < b ? 0.4 : 1,
                }}>{b}</button>
            ))}
          </div>
          <button onClick={deal} disabled={credits < bet}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 999, border: 'none',
              background: credits >= bet ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(148,163,184,0.3)',
              color: '#fff', fontWeight: 800, fontSize: 15, cursor: credits >= bet ? 'pointer' : 'not-allowed',
            }}>
            🃏 Distribuer ({bet} 🪙)
          </button>
        </>
      )}
      {phase === 'discard' && (
        <>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
            Tape les cartes à <b>garder</b>. Les autres seront remplacées.
          </p>
          <button onClick={draw} style={{
            width: '100%', padding: '14px 20px', borderRadius: 999, border: 'none',
            background: `linear-gradient(135deg, ${accent}, #ec4899)`,
            color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          }}>
            🎴 Tirer
          </button>
        </>
      )}
      {phase === 'showdown' && (
        <button onClick={reset} style={{
          width: '100%', padding: '14px 20px', borderRadius: 999, border: 'none',
          background: `linear-gradient(135deg, ${accent}, #ec4899)`,
          color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>
          🔄 Nouvelle main
        </button>
      )}

      <details style={{ width: '100%', fontSize: 11 }}>
        <summary style={{ cursor: 'pointer', color: '#94a3b8', padding: 6 }}>📋 Table des gains</summary>
        <div style={{ padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
          {[
            ['Quinte flush royale', 250],
            ['Quinte flush', 50],
            ['Carré', 25],
            ['Full', 9],
            ['Couleur', 6],
            ['Quinte', 4],
            ['Brelan', 3],
            ['Double paire', 2],
            ['Paire J+', 1],
          ].map(([n, p]) => (
            <div key={n} style={{ display: 'contents' }}>
              <span>{n}</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>×{p}</span>
            </div>
          ))}
        </div>
      </details>

      {credits < 5 && phase === 'betting' && (
        <button onClick={() => setCredits(100)} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px dashed #94a3b8',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
        }}>+ 100 crédits</button>
      )}
    </div>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between',
  padding: '10px 14px', borderRadius: 10,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 9, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 20, fontWeight: 800, color })
