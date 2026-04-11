import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, TrendingUp, TrendingDown, Heart, Trophy, Zap } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types & Helpers ──────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
type Suit = typeof SUITS[number]
type Rank = typeof RANKS[number]
type Card = { rank: Rank; suit: Suit }

const isRed = (s: Suit) => s === '♥' || s === '♦'
const cardValue = (r: Rank, aceHigh: boolean): number => {
  if (r === 'A') return aceHigh ? 13 : 0
  return RANKS.indexOf(r)
}

function randCard(): Card {
  return {
    rank: RANKS[Math.floor(Math.random() * 13)],
    suit: SUITS[Math.floor(Math.random() * 4)],
  }
}

const STORAGE_KEY = 'hilo_best_streak'

function loadBest(): number {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0 } catch { return 0 }
}
function saveBest(n: number) {
  try { localStorage.setItem(STORAGE_KEY, String(n)) } catch { /* noop */ }
}

// ─── Playing Card Component ───────────────────────────────────────────────────
function PlayingCard({ card, revealed = true, size = 'md', glow }: {
  card: Card; revealed?: boolean; size?: 'sm' | 'md' | 'lg'; glow?: 'green' | 'red' | null
}) {
  const dims = { sm: [52, 74], md: [76, 108], lg: [96, 136] }
  const [w, h] = dims[size]
  const fontSizes = { sm: [12, 20, 12], md: [18, 36, 18], lg: [22, 48, 22] }
  const [rankSize, suitSize, btmSize] = fontSizes[size]
  const red = isRed(card.suit)

  const glowShadow = glow === 'green'
    ? '0 0 24px rgba(34,197,94,0.6), 0 8px 32px rgba(0,0,0,0.4)'
    : glow === 'red'
      ? '0 0 24px rgba(239,68,68,0.6), 0 8px 32px rgba(0,0,0,0.4)'
      : '0 8px 24px rgba(0,0,0,0.4)'

  if (!revealed) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 12, flexShrink: 0,
        border: '2px solid rgba(168,85,247,0.4)',
        background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #1a1040 100%)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: w - 14, height: h - 14, borderRadius: 8,
          border: '1.5px solid rgba(168,85,247,0.3)',
          background: 'repeating-linear-gradient(45deg, rgba(168,85,247,0.07) 0px, rgba(168,85,247,0.07) 4px, transparent 4px, transparent 8px)',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      width: w, height: h, borderRadius: 12, flexShrink: 0,
      background: '#ffffff', border: `2px solid ${glow === 'green' ? '#22c55e' : glow === 'red' ? '#ef4444' : '#e5e7eb'}`,
      boxShadow: glowShadow,
      display: 'flex', flexDirection: 'column',
      padding: size === 'sm' ? '3px 5px' : '6px 8px',
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontWeight: 900, fontSize: rankSize, color: red ? '#dc2626' : '#111' }}>{card.rank}</span>
        <span style={{ fontSize: rankSize * 0.75, color: red ? '#dc2626' : '#111' }}>{card.suit}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: suitSize, color: red ? '#dc2626' : '#111', userSelect: 'none' }}>{card.suit}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1, transform: 'rotate(180deg)' }}>
        <span style={{ fontWeight: 900, fontSize: btmSize, color: red ? '#dc2626' : '#111' }}>{card.rank}</span>
        <span style={{ fontSize: btmSize * 0.75, color: red ? '#dc2626' : '#111' }}>{card.suit}</span>
      </div>
    </div>
  )
}

// ─── Lives Display ────────────────────────────────────────────────────────────
function LivesDisplay({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Heart
          key={i}
          size={18}
          style={{
            color: i < lives ? '#ef4444' : MUTED,
            fill: i < lives ? '#ef4444' : 'transparent',
            opacity: i < lives ? 1 : 0.3,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

// ─── Streak Multiplier Badge ──────────────────────────────────────────────────
function StreakBadge({ streak }: { streak: number }) {
  if (streak < 3) return null
  const multiplier = streak >= 10 ? 4 : streak >= 7 ? 3 : streak >= 5 ? 2 : 1.5
  const color = streak >= 10 ? '#f59e0b' : streak >= 7 ? '#ef4444' : streak >= 5 ? '#a855f7' : ACCENT2

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: `${color}20`, border: `1px solid ${color}40`,
      animation: 'pulseBadge 1.5s ease-in-out infinite',
    }}>
      <Zap size={13} style={{ color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        x{multiplier} · Série de {streak} !
      </span>
    </div>
  )
}

// ─── Main Game ────────────────────────────────────────────────────────────────
type GameState = 'playing' | 'feedback' | 'gameover'

export default function HigherLowerGame({ onBack }: { onBack?: () => void }) {
  const [currentCard, setCurrentCard] = useState<Card>(randCard)
  const [nextCard, setNextCard] = useState<Card | null>(null)
  const [state, setState] = useState<GameState>('playing')
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [aceHigh, setAceHigh] = useState(true)
  const [bestStreak, setBestStreak] = useState(loadBest)
  const [history, setHistory] = useState<boolean[]>([])
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleGuess = (higher: boolean) => {
    if (state !== 'playing') return
    const next = randCard()
    setNextCard(next)
    setAnimKey(k => k + 1)

    const cv = cardValue(currentCard.rank, aceHigh)
    const nv = cardValue(next.rank, aceHigh)
    const correct = higher ? nv >= cv : nv <= cv

    setFeedbackCorrect(correct)
    setState('feedback')
    setHistory(h => [...h.slice(-9), correct])

    timerRef.current = setTimeout(() => {
      if (correct) {
        const newStreak = streak + 1
        setStreak(newStreak)
        setTotalCorrect(t => t + 1)
        if (newStreak > bestStreak) {
          setBestStreak(newStreak)
          saveBest(newStreak)
        }
        setCurrentCard(next)
        setNextCard(null)
        setFeedbackCorrect(null)
        setState('playing')
      } else {
        const newLives = lives - 1
        setLives(newLives)
        if (newLives <= 0) {
          setState('gameover')
        } else {
          setStreak(0)
          setCurrentCard(next)
          setNextCard(null)
          setFeedbackCorrect(null)
          setState('playing')
        }
      }
    }, 1000)
  }

  const resetGame = () => {
    clearTimeout(timerRef.current)
    setCurrentCard(randCard())
    setNextCard(null)
    setState('playing')
    setFeedbackCorrect(null)
    setStreak(0)
    setLives(3)
    setTotalCorrect(0)
    setHistory([])
    setAnimKey(k => k + 1)
  }

  const feedbackBg = feedbackCorrect === true
    ? 'rgba(34,197,94,0.12)'
    : feedbackCorrect === false
      ? 'rgba(239,68,68,0.12)'
      : 'transparent'

  const feedbackBorder = feedbackCorrect === true
    ? 'rgba(34,197,94,0.3)'
    : feedbackCorrect === false
      ? 'rgba(239,68,68,0.3)'
      : BORDER

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, userSelect: 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>📈 Plus ou Moins</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LivesDisplay lives={lives} />
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { icon: <Zap size={13} />, label: 'Série', value: streak, color: streak >= 5 ? '#f59e0b' : TEXT },
          { icon: <Trophy size={13} />, label: 'Record', value: bestStreak, color: '#f59e0b' },
          { icon: null, label: 'Correct', value: totalCorrect, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '8px 8px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak badge */}
      {streak >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StreakBadge streak={streak} />
        </div>
      )}

      {/* Feedback banner */}
      {feedbackCorrect !== null && (
        <div style={{
          borderRadius: 12, padding: '10px 16px', textAlign: 'center',
          background: feedbackBg, border: `1px solid ${feedbackBorder}`,
          transition: 'all 0.3s ease',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: feedbackCorrect ? '#22c55e' : '#ef4444' }}>
            {feedbackCorrect ? '✓ Correct !' : '✗ Raté !'}
          </span>
        </div>
      )}

      {/* Card arena */}
      <div style={{
        borderRadius: 20, padding: '24px 16px',
        background: SURFACE, border: `1px solid ${feedbackBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        transition: 'border-color 0.3s ease',
        minHeight: 160,
      }}>
        {/* Current card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>ACTUELLE</div>
          <div key={`curr-${animKey}`} style={{ animation: 'fadeIn 0.3s ease' }}>
            <PlayingCard card={currentCard} size="lg" />
          </div>
        </div>

        {/* VS divider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 1, height: 40, background: BORDER }} />
          <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>VS</span>
          <div style={{ width: 1, height: 40, background: BORDER }} />
        </div>

        {/* Next card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>SUIVANTE</div>
          {nextCard ? (
            <div key={`next-${animKey}`} style={{ animation: 'flipIn 0.4s ease' }}>
              <PlayingCard
                card={nextCard}
                size="lg"
                glow={feedbackCorrect === true ? 'green' : feedbackCorrect === false ? 'red' : null}
              />
            </div>
          ) : (
            <PlayingCard card={{ rank: '?', suit: '?' } as unknown as Card} revealed={false} size="lg" />
          )}
        </div>
      </div>

      {/* Ace toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: MUTED }}>As :</span>
        <button
          onClick={() => setAceHigh(h => !h)}
          disabled={state === 'feedback'}
          style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: aceHigh ? `${ACCENT}20` : `${ACCENT2}20`,
            border: `1px solid ${aceHigh ? ACCENT : ACCENT2}`,
            color: aceHigh ? ACCENT : ACCENT2,
            cursor: 'pointer',
          }}
        >
          {aceHigh ? 'As haut (14)' : 'As bas (1)'}
        </button>
      </div>

      {/* History dots */}
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: MUTED, marginRight: 4 }}>Historique :</span>
          {history.map((h, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: h ? '#22c55e' : '#ef4444',
              boxShadow: h ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
            }} />
          ))}
        </div>
      )}

      {/* Game Over */}
      {state === 'gameover' && (
        <div style={{
          borderRadius: 20, padding: 24, textAlign: 'center',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💔</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', marginBottom: 4 }}>Game Over</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>Plus de vies restantes</div>
          <div style={{ fontSize: 13, color: TEXT, marginBottom: 16 }}>
            {totalCorrect} bonnes réponses · Meilleure série : {bestStreak}
          </div>
          <button onClick={resetGame} style={{
            padding: '12px 32px', borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Rejouer
          </button>
        </div>
      )}

      {/* Guess buttons */}
      {state !== 'gameover' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleGuess(true)}
            disabled={state === 'feedback'}
            style={{
              flex: 1, padding: '14px', borderRadius: 14,
              fontWeight: 700, fontSize: 14,
              background: state === 'feedback' ? SURFACE2 : ACCENT,
              color: state === 'feedback' ? MUTED : '#fff',
              border: `1px solid ${state === 'feedback' ? BORDER : 'transparent'}`,
              cursor: state === 'feedback' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <TrendingUp size={18} /> Plus haut
          </button>
          <button
            onClick={() => handleGuess(false)}
            disabled={state === 'feedback'}
            style={{
              flex: 1, padding: '14px', borderRadius: 14,
              fontWeight: 700, fontSize: 14,
              background: state === 'feedback' ? SURFACE2 : ACCENT2,
              color: state === 'feedback' ? MUTED : '#fff',
              border: `1px solid ${state === 'feedback' ? BORDER : 'transparent'}`,
              cursor: state === 'feedback' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <TrendingDown size={18} /> Plus bas
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes flipIn  { from { opacity: 0; transform: rotateY(90deg) scale(0.8); } to { opacity: 1; transform: rotateY(0deg) scale(1); } }
        @keyframes pulseBadge { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  )
}
