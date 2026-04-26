import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * Slots — premium reels with animation.
 * 3 reels × 5 symbols, paylines, jackpot, audio-style feedback.
 * Inspired by classic Vegas slots + modern mobile UX.
 */

const SYMBOLS = [
  { sym: '🍒', mult: 2,  weight: 30 },
  { sym: '🍋', mult: 3,  weight: 25 },
  { sym: '🔔', mult: 5,  weight: 18 },
  { sym: '🍇', mult: 8,  weight: 12 },
  { sym: '⭐', mult: 15, weight: 8  },
  { sym: '💎', mult: 30, weight: 5  },
  { sym: '7️⃣', mult: 100,weight: 2  },
]

function pickSymbol() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s }
  return SYMBOLS[0]
}

export default function Slots({ accent }: { accent: string }) {
  const [credits, setCredits] = useState(100)
  const [bet, setBet] = useState(5)
  const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]])
  const [spinning, setSpinning] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [history, setHistory] = useState<{ result: string; win: number }[]>([])
  const reelRefs = useRef<HTMLDivElement[]>([])

  const spin = () => {
    if (spinning || credits < bet) return
    setSpinning(true)
    setCredits((c) => c - bet)
    setLastWin(0)

    // Generate target symbols
    const targets = [pickSymbol(), pickSymbol(), pickSymbol()]

    // Animate each reel sequentially with staggered stop
    setTimeout(() => setReels((r) => [targets[0], r[1], r[2]]), 800)
    setTimeout(() => setReels((r) => [r[0], targets[1], r[2]]), 1300)
    setTimeout(() => {
      setReels(targets)
      // Calculate win
      let winnings = 0
      let result = ''
      if (targets[0].sym === targets[1].sym && targets[1].sym === targets[2].sym) {
        // Triple match — full multiplier
        winnings = bet * targets[0].mult
        result = `🎰 TRIPLE ${targets[0].sym} ×${targets[0].mult}`
      } else if (targets[0].sym === targets[1].sym || targets[1].sym === targets[2].sym) {
        // Two adjacent match — small consolation
        winnings = Math.floor(bet * 0.5)
        result = `Petite paire`
      }
      if (winnings > 0) {
        setCredits((c) => c + winnings)
        setLastWin(winnings)
      }
      setHistory((h) => [{ result: result || 'Perdu', win: winnings }, ...h.slice(0, 4)])
      setSpinning(false)
    }, 1800)
  }

  const isJackpot = lastWin >= bet * 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 420, width: '100%' }}>
      {/* Credits HUD */}
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg, #fbbf2420, #f5970020)',
        border: '1px solid rgba(251,191,36,0.4)',
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1 }}>CRÉDITS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>{credits} 🪙</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1 }}>DERNIER GAIN</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: lastWin > 0 ? '#10b981' : '#94a3b8' }}>
            {lastWin > 0 ? `+${lastWin}` : '0'} 🪙
          </div>
        </div>
      </div>

      {/* Reels */}
      <div style={{
        position: 'relative',
        width: '100%', padding: 16, borderRadius: 16,
        background: 'linear-gradient(135deg, #2d1b69, #11052c)',
        border: `3px solid ${accent}`,
        boxShadow: isJackpot ? `0 0 40px ${accent}, 0 0 80px ${accent}` : `0 8px 24px ${accent}40`,
      }}>
        {isJackpot && (
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              padding: '6px 18px', background: 'linear-gradient(135deg,#fbbf24,#ef4444)',
              borderRadius: 999, fontSize: 14, fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 16px rgba(251,191,36,0.6)',
            }}>🎉 JACKPOT</motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {reels.map((sym, i) => (
            <Reel key={i} symbol={sym.sym} spinning={spinning} delay={i * 100} />
          ))}
        </div>
      </div>

      {/* Bet selector */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
        <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 50 }}>Mise :</span>
        {[1, 5, 10, 25, 50].map((b) => (
          <button key={b} onClick={() => !spinning && setBet(b)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, cursor: spinning ? 'not-allowed' : 'pointer',
              background: bet === b ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(255,255,255,0.05)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
              opacity: spinning ? 0.5 : 1,
            }}>{b}</button>
        ))}
      </div>

      {/* Spin button */}
      <button onClick={spin} disabled={spinning || credits < bet}
        style={{
          width: '100%', padding: '16px 24px', borderRadius: 999,
          background: spinning
            ? 'rgba(148,163,184,0.3)'
            : credits < bet
              ? 'rgba(239,68,68,0.3)'
              : `linear-gradient(135deg, ${accent}, #ec4899)`,
          border: 'none', color: '#fff', fontWeight: 800, fontSize: 18,
          cursor: spinning || credits < bet ? 'not-allowed' : 'pointer',
          boxShadow: !spinning && credits >= bet ? `0 8px 24px ${accent}50` : 'none',
          letterSpacing: 1,
        }}>
        {spinning ? '🎰 SPIN…' : credits < bet ? '💸 Crédits insuffisants' : `🎰 SPIN ${bet}`}
      </button>

      {/* Paytable */}
      <details style={{ width: '100%', fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', color: '#94a3b8', padding: 8 }}>📋 Table des gains</summary>
        <div style={{
          padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11,
        }}>
          {SYMBOLS.map((s) => (
            <div key={s.sym} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span>{s.sym} {s.sym} {s.sym}</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>×{s.mult}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Recharge si à sec */}
      {credits < 5 && (
        <button onClick={() => setCredits(100)} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px dashed #94a3b8',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
        }}>+ Recharger 100 crédits (démo)</button>
      )}
    </div>
  )
}

function Reel({ symbol, spinning, delay }: { symbol: string; spinning: boolean; delay: number }) {
  return (
    <div style={{
      height: 100, borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(255,255,255,0.1)',
    }}>
      <motion.div
        animate={spinning ? { y: [-100, 100], opacity: [1, 0.4, 1] } : { y: 0, opacity: 1 }}
        transition={spinning
          ? { duration: 0.15, repeat: Infinity, ease: 'linear', delay: delay / 1000 }
          : { type: 'spring', damping: 15, stiffness: 120 }}
        style={{ fontSize: 56, lineHeight: 1 }}
      >
        {spinning ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].sym : symbol}
      </motion.div>
    </div>
  )
}
