import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Roulette — European single-zero (37 numbers, 0-36).
 * Spin animation, multiple bet types (red/black/even/odd/dozen/specific).
 */

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

type BetKind = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | `n${number}`
interface Bet { kind: BetKind; amount: number }

const PAYOUTS: Record<string, number> = {
  red: 2, black: 2, even: 2, odd: 2, low: 2, high: 2,
}

export default function Roulette({ accent }: { accent: string }) {
  const [credits, setCredits] = useState(100)
  const [bets, setBets] = useState<Bet[]>([])
  const [bet, setBet] = useState(5)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [rotation, setRotation] = useState(0)

  const place = (kind: BetKind) => {
    if (credits < bet || spinning) return
    setCredits((c) => c - bet)
    setBets((b) => {
      const existing = b.find((x) => x.kind === kind)
      if (existing) return b.map((x) => x.kind === kind ? { ...x, amount: x.amount + bet } : x)
      return [...b, { kind, amount: bet }]
    })
  }

  const clearBets = () => {
    if (spinning) return
    setCredits((c) => c + bets.reduce((s, b) => s + b.amount, 0))
    setBets([])
  }

  const spin = () => {
    if (bets.length === 0 || spinning) return
    setSpinning(true)
    setMessage('')
    setResult(null)

    const winning = NUMBERS[Math.floor(Math.random() * NUMBERS.length)]
    const winningIdx = NUMBERS.indexOf(winning)
    const segDeg = 360 / NUMBERS.length
    const targetRotation = rotation + 1440 + (NUMBERS.length - winningIdx) * segDeg
    setRotation(targetRotation)

    setTimeout(() => {
      setResult(winning)
      // Compute winnings
      let totalWin = 0
      for (const b of bets) {
        if (b.kind === 'red' && REDS.has(winning)) totalWin += b.amount * PAYOUTS.red
        else if (b.kind === 'black' && winning !== 0 && !REDS.has(winning)) totalWin += b.amount * PAYOUTS.black
        else if (b.kind === 'even' && winning !== 0 && winning % 2 === 0) totalWin += b.amount * PAYOUTS.even
        else if (b.kind === 'odd' && winning % 2 === 1) totalWin += b.amount * PAYOUTS.odd
        else if (b.kind === 'low' && winning >= 1 && winning <= 18) totalWin += b.amount * PAYOUTS.low
        else if (b.kind === 'high' && winning >= 19 && winning <= 36) totalWin += b.amount * PAYOUTS.high
        else if (b.kind.startsWith('n')) {
          const n = parseInt(b.kind.slice(1))
          if (n === winning) totalWin += b.amount * 36
        }
      }
      setCredits((c) => c + totalWin)
      const totalBet = bets.reduce((s, b) => s + b.amount, 0)
      const net = totalWin - totalBet
      setMessage(net > 0
        ? `🎉 Vous gagnez ${totalWin} (net +${net})`
        : net === 0 ? `Mise rendue` : `😢 Perdu ${totalBet}`)
      setBets([])
      setSpinning(false)
    }, 4000)
  }

  const winningColor = (n: number) => n === 0 ? '#10b981' : REDS.has(n) ? '#ef4444' : '#0f172a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 420, width: '100%' }}>
      <div style={hud(accent)}>
        <div>
          <div style={hudLabel}>CRÉDITS</div>
          <div style={hudValue('#fbbf24')}>{credits} 🪙</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={hudLabel}>MISES</div>
          <div style={hudValue(accent)}>
            {bets.reduce((s, b) => s + b.amount, 0)} 🪙
          </div>
        </div>
      </div>

      {/* Wheel */}
      <div style={{ position: 'relative', width: 240, height: 240 }}>
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.16, 0.99] }}
          style={{
            width: 240, height: 240, borderRadius: '50%',
            border: `4px solid ${accent}`,
            background: 'conic-gradient(' + NUMBERS.map((n, i) => {
              const start = (i / NUMBERS.length) * 360
              const end = ((i + 1) / NUMBERS.length) * 360
              return `${winningColor(n)} ${start}deg ${end}deg`
            }).join(', ') + ')',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${accent}60`,
          }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d1b69, #11052c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>🎰</div>
        </motion.div>
        {/* Pointer */}
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent', borderTop: `20px solid ${accent}`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }} />
      </div>

      {result !== null && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{
            padding: '8px 18px', borderRadius: 999,
            background: winningColor(result), color: '#fff',
            fontWeight: 800, fontSize: 18, minWidth: 100, textAlign: 'center',
          }}>
          {result}
        </motion.div>
      )}

      {message && (
        <div style={{ fontSize: 13, fontWeight: 700, color: message.includes('gagnez') ? '#10b981' : '#94a3b8' }}>
          {message}
        </div>
      )}

      {/* Bet amount */}
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        {[1, 5, 10, 25].map((b) => (
          <button key={b} onClick={() => !spinning && setBet(b)}
            style={{
              flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: bet === b ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(255,255,255,0.05)',
              color: '#fff', fontWeight: 700, fontSize: 12,
            }}>{b}</button>
        ))}
      </div>

      {/* Bet types */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: '100%' }}>
        <BetBtn label="Rouge" sub="×2" color="#ef4444" onClick={() => place('red')} active={bets.find(b => b.kind === 'red')?.amount} />
        <BetBtn label="Noir" sub="×2" color="#0f172a" onClick={() => place('black')} active={bets.find(b => b.kind === 'black')?.amount} />
        <BetBtn label="Vert (0)" sub="×36" color="#10b981" onClick={() => place('n0')} active={bets.find(b => b.kind === 'n0')?.amount} />
        <BetBtn label="Pair" sub="×2" color="#6366f1" onClick={() => place('even')} active={bets.find(b => b.kind === 'even')?.amount} />
        <BetBtn label="Impair" sub="×2" color="#6366f1" onClick={() => place('odd')} active={bets.find(b => b.kind === 'odd')?.amount} />
        <BetBtn label="1-18" sub="×2" color="#8b5cf6" onClick={() => place('low')} active={bets.find(b => b.kind === 'low')?.amount} />
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <button onClick={clearBets} disabled={bets.length === 0 || spinning}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, fontSize: 12,
            opacity: bets.length === 0 || spinning ? 0.4 : 1 }}>
          Annuler mises
        </button>
        <button onClick={spin} disabled={bets.length === 0 || spinning}
          style={{ flex: 2, padding: '12px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: bets.length > 0 && !spinning ? `linear-gradient(135deg, ${accent}, #ec4899)` : 'rgba(148,163,184,0.3)',
            color: '#fff', fontWeight: 800, fontSize: 14 }}>
          {spinning ? '🎰 SPIN…' : '🎰 LANCER'}
        </button>
      </div>

      {credits < 5 && (
        <button onClick={() => setCredits(100)} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px dashed #94a3b8',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
        }}>+ 100 crédits</button>
      )}
    </div>
  )
}

function BetBtn({ label, sub, color, onClick, active }: any) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 6px', borderRadius: 8, border: active ? '2px solid #fbbf24' : 'none', cursor: 'pointer',
      background: color, color: '#fff', fontWeight: 700, fontSize: 11, position: 'relative',
    }}>
      <div>{label}</div>
      <div style={{ fontSize: 9, opacity: 0.8 }}>{sub}</div>
      {active && <div style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, fontWeight: 800, color: '#fbbf24' }}>+{active}</div>}
    </button>
  )
}

const hud = (accent: string): React.CSSProperties => ({
  width: '100%', display: 'flex', justifyContent: 'space-between',
  padding: '10px 14px', borderRadius: 10,
  background: `linear-gradient(135deg, ${accent}15, #ec489915)`,
  border: `1px solid ${accent}30`,
})
const hudLabel: React.CSSProperties = { fontSize: 9, color: '#94a3b8', letterSpacing: 1 }
const hudValue = (color: string): React.CSSProperties => ({ fontSize: 18, fontWeight: 800, color })
