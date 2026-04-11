import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Trophy, RotateCcw, Zap } from 'lucide-react'
import { ACCENT, ACCENT2, BG, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ── Types ──────────────────────────────────────────────────────────────────────

type DifficultyId = 'easy' | 'medium' | 'hard'
type ThemeId = 'animals' | 'food' | 'sports' | 'symbols'

interface Difficulty {
  id: DifficultyId
  label: string
  cols: number
  rows: number
  pairs: number
}

interface CardState {
  id: number
  value: string
  flipped: boolean
  matched: boolean
  mismatch: boolean
  bouncing: boolean
}

interface BestScore {
  moves: number
  time: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = [
  { id: 'easy',   label: 'Facile',  cols: 4, rows: 4, pairs: 8  },
  { id: 'medium', label: 'Moyen',   cols: 4, rows: 5, pairs: 10 },
  { id: 'hard',   label: 'Difficile',cols: 5, rows: 6, pairs: 15 },
]

const THEMES: Record<ThemeId, { label: string; emoji: string; values: string[] }> = {
  animals: {
    label: 'Animaux',
    emoji: '🐾',
    values: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄'],
  },
  food: {
    label: 'Nourriture',
    emoji: '🍕',
    values: ['🍕','🍔','🌮','🍜','🍣','🍦','🍩','🍪','🎂','🍰','🍎','🍓','🥑','🍇','🌽','🥕'],
  },
  sports: {
    label: 'Sports',
    emoji: '⚽',
    values: ['⚽','🏀','🎾','🏈','⚾','🎱','🏐','🏉','🎯','🏹','🎣','🥊','🏋️','🤸','🏊','🎿'],
  },
  symbols: {
    label: 'Symboles',
    emoji: '✨',
    values: ['✨','⚡','🔥','💎','🌙','⭐','❄️','🌈','💫','🎵','🔮','🗝️','💡','🎪','🎭','🎨'],
  },
}

const HARD_VALUES = ['1','2','3','4','5','6','7','8','9','0','A','B','C','D','E','F','G','H','!','@','#','$','%','&','*','(',')','?','<','>']

// ── CSS Animations (injected once) ────────────────────────────────────────────

const CSS = `
@keyframes mem-bounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.18); }
  70%  { transform: scale(0.93); }
  100% { transform: scale(1); }
}
@keyframes mem-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-5px); }
  40%     { transform: translateX(5px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}
@keyframes mem-pulse-match {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
@keyframes mem-flip-in {
  from { transform: perspective(600px) rotateY(90deg); opacity: 0.6; }
  to   { transform: perspective(600px) rotateY(0deg);  opacity: 1; }
}
@keyframes mem-confetti {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
}
@keyframes mem-win-glow {
  0%,100% { text-shadow: 0 0 8px #f59e0b; }
  50%     { text-shadow: 0 0 24px #f59e0b, 0 0 48px #f59e0baa; }
}
@keyframes mem-combo-pop {
  0%   { transform: scale(0.6) translateY(8px); opacity: 0; }
  60%  { transform: scale(1.2) translateY(-2px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes mem-timer-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.5; }
}
`

function injectCSS(id: string, css: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('style')
  s.id = id
  s.textContent = css
  document.head.appendChild(s)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function buildCards(diff: Difficulty, theme: ThemeId): CardState[] {
  let pool: string[]
  if (diff.id === 'hard') {
    pool = HARD_VALUES.slice(0, diff.pairs)
  } else {
    pool = THEMES[theme].values.slice(0, diff.pairs)
  }
  const pairs = pool.slice(0, diff.pairs).flatMap(v => [v, v])
  return shuffle(pairs).map((value, id) => ({
    id, value, flipped: false, matched: false, mismatch: false, bouncing: false,
  }))
}

function lsKey(diff: DifficultyId, theme: ThemeId) {
  return `mem_best_${diff}_${theme}`
}

function getBest(diff: DifficultyId, theme: ThemeId): BestScore | null {
  try {
    const raw = localStorage.getItem(lsKey(diff, theme))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveBest(diff: DifficultyId, theme: ThemeId, score: BestScore) {
  try { localStorage.setItem(lsKey(diff, theme), JSON.stringify(score)) } catch { /* noop */ }
}

// ── Confetti ───────────────────────────────────────────────────────────────────

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    i,
    color: ['#f59e0b','#22c55e','#a855f7','#06b6d4','#ef4444','#ec4899'][i % 6],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    size: 6 + Math.random() * 8,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.i} style={{
          position: 'absolute',
          top: '-10px',
          left: p.left,
          width: p.size,
          height: p.size,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          background: p.color,
          animation: `mem-confetti ${1.2 + Math.random() * 0.6}s ease-in forwards`,
          animationDelay: p.delay,
        }} />
      ))}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────

interface CardProps {
  card: CardState
  size: number
  themeId: ThemeId
  diffId: DifficultyId
  onClick: () => void
  disabled: boolean
}

function Card({ card, size, themeId: _themeId, diffId, onClick, disabled }: CardProps) {
  const isHard = diffId === 'hard'

  const backBg = card.matched
    ? 'linear-gradient(135deg, #14532d 0%, #166534 100%)'
    : card.mismatch
    ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
    : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'

  const frontBg = isHard
    ? 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)'
    : 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)'

  const borderColor = card.matched
    ? 'rgba(34,197,94,0.6)'
    : card.mismatch
    ? 'rgba(239,68,68,0.5)'
    : card.flipped
    ? 'rgba(168,85,247,0.6)'
    : 'rgba(99,102,241,0.25)'

  const glowStyle = card.matched
    ? '0 0 16px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
    : card.flipped && !card.matched
    ? '0 0 12px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
    : 'inset 0 1px 0 rgba(255,255,255,0.04)'

  const animation = card.bouncing
    ? 'mem-bounce 0.45s ease-out'
    : card.mismatch
    ? 'mem-shake 0.4s ease-out'
    : card.flipped && !card.matched
    ? 'mem-flip-in 0.25s ease-out'
    : undefined

  const pulseAnim = card.matched ? 'mem-pulse-match 0.6s ease-out' : undefined

  return (
    <button
      onClick={disabled || card.matched ? undefined : onClick}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        border: `1.5px solid ${borderColor}`,
        background: card.flipped || card.matched ? frontBg : backBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: card.matched || disabled ? 'default' : 'pointer',
        fontSize: isHard ? size * 0.38 : size * 0.46,
        fontWeight: isHard ? 900 : 400,
        color: isHard ? '#93c5fd' : TEXT,
        boxShadow: pulseAnim ? undefined : glowStyle,
        animation: pulseAnim ?? animation,
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Shine overlay on back */}
      {!card.flipped && !card.matched && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 11,
          backgroundImage: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Dot pattern on back */}
      {!card.flipped && !card.matched && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 11, opacity: 0.18,
          backgroundImage: 'radial-gradient(circle, #a5b4fc 1px, transparent 1px)',
          backgroundSize: '10px 10px',
          pointerEvents: 'none',
        }} />
      )}
      {(card.flipped || card.matched) ? card.value : '?'}
    </button>
  )
}

// ── Win Screen ─────────────────────────────────────────────────────────────────

interface WinScreenProps {
  moves: number
  time: number
  comboBest: number
  isRecord: boolean
  diffLabel: string
  onReplay: () => void
  onBack?: () => void
}

function WinScreen({ moves, time, comboBest, isRecord, diffLabel, onReplay, onBack }: WinScreenProps) {
  const baseScore = 1000 - moves * 10
  const timeBonus = Math.max(0, 300 - time * 2)
  const comboBonus = comboBest * 50
  const total = Math.max(0, baseScore + timeBonus + comboBonus)

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,15,0.92)',
      zIndex: 10, borderRadius: 16, gap: 12, padding: 24,
    }}>
      <Confetti />
      <div style={{ fontSize: 52, animation: 'mem-win-glow 1.5s ease-in-out infinite', lineHeight: 1 }}>🏆</div>
      <div style={{ color: TEXT, fontSize: 22, fontWeight: 900, textAlign: 'center' }}>
        Bravo !
      </div>
      {isRecord && (
        <div style={{
          background: 'linear-gradient(90deg, #f59e0b22, #f59e0b44, #f59e0b22)',
          border: '1px solid #f59e0b66',
          borderRadius: 20, padding: '4px 16px',
          color: '#f59e0b', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
        }}>
          NOUVEAU RECORD — {diffLabel}
        </div>
      )}
      <div style={{
        background: SURFACE2, border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: '14px 24px', width: '100%', maxWidth: 280,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: MUTED, fontSize: 12 }}>Coups</span>
          <span style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>{moves}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: MUTED, fontSize: 12 }}>Temps</span>
          <span style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>{fmt(time)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: MUTED, fontSize: 12 }}>Meilleur combo</span>
          <span style={{ color: ACCENT2, fontSize: 12, fontWeight: 700 }}>×{comboBest}</span>
        </div>
        <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: MUTED, fontSize: 13, fontWeight: 700 }}>Score total</span>
          <span style={{ color: '#f59e0b', fontSize: 15, fontWeight: 900 }}>{total}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
        <button onClick={onReplay} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
          background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>
          Rejouer
        </button>
        {onBack && (
          <button onClick={onBack} style={{
            flex: 1, padding: '10px 0', borderRadius: 10,
            border: `1px solid ${BORDER}`, background: 'transparent',
            color: MUTED, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Menu
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main MemoryGame ────────────────────────────────────────────────────────────

export default function MemoryGame({ onBack }: { onBack?: () => void }) {
  injectCSS('mem-styles', CSS)

  const [diffId, setDiffId]     = useState<DifficultyId>('easy')
  const [themeId, setThemeId]   = useState<ThemeId>('animals')
  const [cards, setCards]       = useState<CardState[]>([])
  const [flipped, setFlipped]   = useState<number[]>([])
  const [moves, setMoves]       = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const [running, setRunning]   = useState(false)
  const [won, setWon]           = useState(false)
  const [combo, setCombo]       = useState(0)
  const [comboBest, setComboBest] = useState(0)
  const [comboAnim, setComboAnim] = useState(false)
  const [isRecord, setIsRecord] = useState(false)
  const [locked, setLocked]     = useState(false)


  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const lockRef   = useRef(false)

  const diff = DIFFICULTIES.find(d => d.id === diffId)!

  // ── Init ──
  const startGame = useCallback((d: DifficultyId = diffId, t: ThemeId = themeId) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const newCards = buildCards(DIFFICULTIES.find(x => x.id === d)!, t)
    setCards(newCards)
    setFlipped([])
    setMoves(0)
    setElapsed(0)
    setRunning(false)
    setWon(false)
    setCombo(0)
    setComboBest(0)
    setComboAnim(false)
    setIsRecord(false)
    setLocked(false)
    lockRef.current = false
  }, [diffId, themeId])

  useEffect(() => { startGame() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ──
  useEffect(() => {
    if (running && !won) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, won])

  // ── Flip ──
  const flip = useCallback((id: number) => {
    if (lockRef.current || won) return
    const card = cards.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return
    if (flipped.length >= 2) return

    if (!running) setRunning(true)

    const newFlipped = [...flipped, id]
    setCards(cs => cs.map(c => c.id === id ? { ...c, flipped: true, bouncing: true } : c))

    // Clear bounce after anim
    setTimeout(() => {
      setCards(cs => cs.map(c => c.id === id ? { ...c, bouncing: false } : c))
    }, 450)

    if (newFlipped.length === 2) {
      setLocked(true)
      lockRef.current = true
      setMoves(m => m + 1)

      const [aId, bId] = newFlipped
      const a = cards.find(c => c.id === aId)!
      const b = cards.find(c => c.id === bId)!

      if (a.value === b.value) {
        // Match
        const newCombo = combo + 1
        setCombo(newCombo)
        setComboBest(prev => Math.max(prev, newCombo))
        if (newCombo >= 2) {
          setComboAnim(true)
          setTimeout(() => setComboAnim(false), 700)
        }

        setTimeout(() => {
          setCards(cs => {
            const next = cs.map(c =>
              newFlipped.includes(c.id) ? { ...c, matched: true, flipped: true } : c
            )
            // Check win
            if (next.every(c => c.matched)) {
              setWon(true)
              setRunning(false)

              // Check record
              const best = getBest(diffId, themeId)
              const currentMoves = moves + 1
              if (!best || currentMoves < best.moves || (currentMoves === best.moves && elapsed < best.time)) {
                saveBest(diffId, themeId, { moves: currentMoves, time: elapsed })
                setIsRecord(true)
              }
            }
            return next
          })
          setFlipped([])
          setLocked(false)
          lockRef.current = false
        }, 400)
      } else {
        // Mismatch
        setCombo(0)
        setCards(cs => cs.map(c =>
          newFlipped.includes(c.id) ? { ...c, mismatch: true } : c
        ))
        setTimeout(() => {
          setCards(cs => cs.map(c =>
            newFlipped.includes(c.id) ? { ...c, flipped: false, mismatch: false } : c
          ))
          setFlipped([])
          setLocked(false)
          lockRef.current = false
        }, 800)
      }
      setFlipped(newFlipped)
    } else {
      setFlipped(newFlipped)
    }
  }, [cards, flipped, running, won, combo, diffId, themeId, moves, elapsed])

  const matched = cards.filter(c => c.matched).length / 2
  const total   = diff.pairs
  const best    = getBest(diffId, themeId)

  // ── Card sizing ──
  const containerWidth = 340
  const gap = 5
  const cardSize = Math.floor((containerWidth - gap * (diff.cols - 1)) / diff.cols)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: BG, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: MUTED, display: 'flex', alignItems: 'center', padding: 4,
          }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <span style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>🔮 Memory</span>

        {/* Combo badge */}
        {combo >= 2 && (
          <div style={{
            marginLeft: 4,
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            borderRadius: 20, padding: '2px 10px',
            color: '#fff', fontSize: 11, fontWeight: 900,
            animation: comboAnim ? 'mem-combo-pop 0.4s ease-out' : undefined,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Zap size={10} /> ×{combo} COMBO
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: MUTED, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>PAIRES</div>
            <div style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>{matched}/{total}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: MUTED, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>COUPS</div>
            <div style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>{moves}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: MUTED, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>TEMPS</div>
            <div style={{
              color: running && elapsed > 90 ? '#ef4444' : TEXT,
              fontSize: 13, fontWeight: 800,
              animation: running && elapsed > 90 ? 'mem-timer-pulse 1s ease-in-out infinite' : undefined,
            }}>{fmt(elapsed)}</div>
          </div>
        </div>
      </div>

      {/* Controls: Difficulty + Theme */}
      <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
        {/* Difficulty row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id} onClick={() => { setDiffId(d.id); startGame(d.id, themeId) }} style={{
              flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              background: diffId === d.id ? ACCENT : SURFACE2,
              border: `1px solid ${diffId === d.id ? ACCENT : BORDER}`,
              color: diffId === d.id ? '#fff' : MUTED,
            }}>{d.label}</button>
          ))}
        </div>
        {/* Theme row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, t]) => (
            <button key={id} onClick={() => { setThemeId(id); startGame(diffId, id) }} style={{
              flex: 1, padding: '4px 0', borderRadius: 8, fontSize: 14,
              cursor: 'pointer', transition: 'all 0.15s',
              background: themeId === id ? 'rgba(168,85,247,0.2)' : SURFACE,
              border: `1px solid ${themeId === id ? ACCENT : BORDER}`,
            }} title={t.label}>{t.emoji}</button>
          ))}
        </div>

        {/* Best score */}
        {best && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
            borderRadius: 8, background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)', marginBottom: 10,
          }}>
            <Trophy size={11} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>
              Record : {best.moves} coups · {fmt(best.time)}
            </span>
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          {won && (
            <WinScreen
              moves={moves} time={elapsed}
              comboBest={comboBest} isRecord={isRecord}
              diffLabel={diff.label}
              onReplay={() => startGame()} onBack={onBack}
            />
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${diff.cols}, ${cardSize}px)`,
            gap,
          }}>
            {cards.map(card => (
              <Card
                key={card.id}
                card={card}
                size={cardSize}
                themeId={themeId}
                diffId={diffId}
                onClick={() => flip(card.id)}
                disabled={locked || won}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Replay */}
      <div style={{ padding: '10px 16px 16px', flexShrink: 0 }}>
        <button onClick={() => startGame()} style={{
          width: '100%', padding: '11px 0', borderRadius: 10,
          border: `1px solid ${BORDER}`, background: SURFACE2,
          color: MUTED, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <RotateCcw size={14} /> Nouvelle partie
        </button>
      </div>
    </div>
  )
}
