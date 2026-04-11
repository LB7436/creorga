import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, RotateCcw, Zap, Hash, Grid } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────
type GameMode = 'reaction' | 'sequence' | 'numbertap'
type ReactionPhase = 'idle' | 'waiting' | 'ready' | 'result' | 'early'

const STORAGE_KEY = 'reaction_stats'
interface Stats {
  best: number
  times: number[]
}
function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Stats
  } catch { /* noop */ }
  return { best: 0, times: [] }
}
function saveStats(s: Stats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* noop */ }
}

// ─── Reaction Time Mode ───────────────────────────────────────────────────────
function ReactionTimeMode() {
  const [phase, setPhase] = useState<ReactionPhase>('idle')
  const [time, setTime] = useState(0)
  const [stats, setStats] = useState<Stats>(loadStats)
  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const startWait = useCallback(() => {
    setPhase('waiting')
    const delay = 1500 + Math.random() * 4000
    timerRef.current = setTimeout(() => {
      setPhase('ready')
      startRef.current = Date.now()
    }, delay)
  }, [])

  const handleTap = () => {
    if (phase === 'waiting') {
      clearTimeout(timerRef.current)
      setPhase('early')
      return
    }
    if (phase === 'ready') {
      const ms = Date.now() - startRef.current
      setTime(ms)
      setPhase('result')
      setStats(prev => {
        const next: Stats = {
          best: prev.best === 0 ? ms : Math.min(prev.best, ms),
          times: [...prev.times, ms].slice(-10),
        }
        saveStats(next)
        return next
      })
      return
    }
    // idle / result / early → start new round
    startWait()
  }

  const reset = () => {
    clearTimeout(timerRef.current)
    setPhase('idle')
  }

  const avg = stats.times.length
    ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length)
    : 0
  const maxTime = stats.times.length ? Math.max(...stats.times) : 1

  const bgColor =
    phase === 'ready' ? '#16a34a' :
    phase === 'waiting' ? '#dc2626' :
    phase === 'early' ? '#d97706' :
    SURFACE2

  const glowColor =
    phase === 'ready' ? 'rgba(34,197,94,0.5)' :
    phase === 'waiting' ? 'rgba(239,68,68,0.4)' :
    phase === 'early' ? 'rgba(245,158,11,0.4)' :
    'transparent'

  const label =
    phase === 'idle' ? 'Appuyez pour commencer' :
    phase === 'waiting' ? 'Attendez le vert…' :
    phase === 'ready' ? 'APPUYEZ !' :
    phase === 'early' ? 'Trop tôt ! Appuyez pour réessayer' :
    `${time} ms`

  const rating = (ms: number) =>
    ms < 150 ? { text: 'Surhumain !', color: '#a855f7' } :
    ms < 200 ? { text: 'Éclair !', color: '#22c55e' } :
    ms < 250 ? { text: 'Excellent', color: '#22c55e' } :
    ms < 300 ? { text: 'Très bien', color: ACCENT2 } :
    ms < 400 ? { text: 'Bien', color: '#f59e0b' } :
    ms < 500 ? { text: 'Moyen', color: MUTED } :
    { text: 'Lent', color: '#ef4444' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats row */}
      {stats.times.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Meilleur', value: `${stats.best}ms`, color: ACCENT },
            { label: 'Moyenne', value: `${avg}ms`, color: TEXT },
            { label: 'Tentatives', value: stats.times.length, color: MUTED },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, borderRadius: 12, padding: '8px 6px', textAlign: 'center',
              background: SURFACE, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Big tap target */}
      <button
        onClick={handleTap}
        style={{
          width: '100%', minHeight: 220, borderRadius: 24,
          background: bgColor,
          border: `3px solid ${bgColor === SURFACE2 ? BORDER : bgColor}`,
          boxShadow: `0 0 40px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'background 0.15s ease, box-shadow 0.2s ease',
        }}
      >
        <span style={{ fontSize: 56, lineHeight: 1 }}>
          {phase === 'ready' ? '🟢' : phase === 'waiting' ? '🔴' : phase === 'early' ? '🟡' : '👆'}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', textAlign: 'center', padding: '0 20px' }}>
          {label}
        </span>
        {phase === 'result' && (
          <span style={{ fontSize: 28, fontWeight: 900, color: rating(time).color }}>
            {rating(time).text}
          </span>
        )}
        {phase === 'result' && stats.best === time && (
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>🏆 Nouveau record !</span>
        )}
      </button>

      {/* Histogram */}
      {stats.times.length > 1 && (
        <div style={{ borderRadius: 16, padding: '14px 14px 10px', background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 10 }}>
            Dernières {stats.times.length} tentatives
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
            {stats.times.map((t, i) => {
              const h = Math.max(8, Math.round((t / maxTime) * 56))
              const isLast = i === stats.times.length - 1
              const isBest = t === stats.best
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: '100%', height: h, borderRadius: 4,
                    background: isBest ? ACCENT : isLast ? ACCENT2 : SURFACE2,
                    border: `1px solid ${isBest ? ACCENT : isLast ? ACCENT2 : BORDER}`,
                    transition: 'height 0.4s ease',
                  }} />
                  <span style={{ fontSize: 8, color: isBest ? ACCENT : isLast ? ACCENT2 : MUTED, whiteSpace: 'nowrap' }}>
                    {t}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 9, color: MUTED, marginTop: 6, textAlign: 'center' }}>
            ms — violet = meilleur · cyan = dernier
          </div>
        </div>
      )}

      {phase !== 'idle' && (
        <button onClick={reset} style={{
          padding: '8px', borderRadius: 10, background: SURFACE2,
          border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12,
        }}>
          <RotateCcw size={13} /> Réinitialiser
        </button>
      )}

      <p style={{ textAlign: 'center', fontSize: 10, color: MUTED, margin: 0 }}>
        Temps de réaction humain moyen : ~250 ms
      </p>
    </div>
  )
}

// ─── Sequence Mode ────────────────────────────────────────────────────────────
const SEQ_COLORS = [
  { id: 0, bg: '#ef4444', glow: 'rgba(239,68,68,0.6)', label: 'Rouge' },
  { id: 1, bg: '#22c55e', glow: 'rgba(34,197,94,0.6)', label: 'Vert' },
  { id: 2, bg: '#3b82f6', glow: 'rgba(59,130,246,0.6)', label: 'Bleu' },
  { id: 3, bg: '#f59e0b', glow: 'rgba(245,158,11,0.6)', label: 'Jaune' },
]

type SeqPhase = 'idle' | 'showing' | 'input' | 'success' | 'fail'

function SequenceMode() {
  const [sequence, setSequence] = useState<number[]>([])
  const [playerSeq, setPlayerSeq] = useState<number[]>([])
  const [phase, setPhase] = useState<SeqPhase>('idle')
  const [showIdx, setShowIdx] = useState(-1)
  const [level, setLevel] = useState(1)
  const [bestLevel, setBestLevel] = useState(0)
  const [activeBtn, setActiveBtn] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const playSequence = useCallback((seq: number[]) => {
    setPhase('showing')
    setShowIdx(-1)
    let i = 0
    const next = () => {
      if (i >= seq.length) {
        timerRef.current = setTimeout(() => { setShowIdx(-1); setPhase('input') }, 400)
        return
      }
      setShowIdx(seq[i])
      timerRef.current = setTimeout(() => {
        setShowIdx(-1)
        timerRef.current = setTimeout(() => { i++; next() }, 250)
      }, 600)
    }
    timerRef.current = setTimeout(next, 400)
  }, [])

  const startGame = () => {
    const first = [Math.floor(Math.random() * 4)]
    setSequence(first)
    setPlayerSeq([])
    setLevel(1)
    playSequence(first)
  }

  const handlePress = (id: number) => {
    if (phase !== 'input') return
    setActiveBtn(id)
    setTimeout(() => setActiveBtn(null), 200)

    const next = [...playerSeq, id]
    const idx = next.length - 1

    if (next[idx] !== sequence[idx]) {
      setPhase('fail')
      if (level > bestLevel) setBestLevel(level)
      return
    }

    if (next.length === sequence.length) {
      setPhase('success')
      timerRef.current = setTimeout(() => {
        const newSeq = [...sequence, Math.floor(Math.random() * 4)]
        setSequence(newSeq)
        setPlayerSeq([])
        setLevel(l => l + 1)
        playSequence(newSeq)
      }, 800)
    } else {
      setPlayerSeq(next)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Niveau', value: level, color: ACCENT },
          { label: 'Record', value: bestLevel, color: '#f59e0b' },
          { label: 'Séquence', value: sequence.length, color: ACCENT2 },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '8px 6px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        borderRadius: 14, padding: '12px', textAlign: 'center',
        background: phase === 'success' ? 'rgba(34,197,94,0.1)' : phase === 'fail' ? 'rgba(239,68,68,0.1)' : SURFACE,
        border: `1px solid ${phase === 'success' ? 'rgba(34,197,94,0.3)' : phase === 'fail' ? 'rgba(239,68,68,0.3)' : BORDER}`,
        minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {phase === 'idle' && <span style={{ color: MUTED, fontSize: 13 }}>Mémorisez et répétez la séquence</span>}
        {phase === 'showing' && <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>Regardez la séquence… ({sequence.length} couleurs)</span>}
        {phase === 'input' && (
          <span style={{ color: ACCENT2, fontSize: 13, fontWeight: 600 }}>
            Répétez ! {playerSeq.length}/{sequence.length}
          </span>
        )}
        {phase === 'success' && <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 700 }}>✓ Parfait ! Niveau suivant…</span>}
        {phase === 'fail' && <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>✗ Raté ! Niveau {level} atteint</span>}
      </div>

      {/* Color buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SEQ_COLORS.map(c => {
          const isHighlighted = showIdx === c.id
          const isActive = activeBtn === c.id
          return (
            <button
              key={c.id}
              onClick={() => handlePress(c.id)}
              disabled={phase !== 'input'}
              style={{
                height: 90, borderRadius: 16, border: 'none', cursor: phase === 'input' ? 'pointer' : 'default',
                background: isHighlighted || isActive ? c.bg : `${c.bg}40`,
                boxShadow: isHighlighted || isActive ? `0 0 30px ${c.glow}` : 'none',
                transition: 'all 0.15s ease',
                transform: isActive ? 'scale(0.95)' : 'scale(1)',
              }}
            />
          )
        })}
      </div>

      {/* Progress dots */}
      {sequence.length > 0 && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {sequence.map((colorId, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < playerSeq.length
                ? SEQ_COLORS[colorId].bg
                : i === playerSeq.length && phase === 'input'
                  ? `${SEQ_COLORS[colorId].bg}60`
                  : SURFACE2,
              border: `1px solid ${i < playerSeq.length ? SEQ_COLORS[colorId].bg : BORDER}`,
            }} />
          ))}
        </div>
      )}

      {(phase === 'idle' || phase === 'fail') && (
        <button onClick={startGame} style={{
          padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 15,
          background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          {phase === 'fail' ? 'Réessayer' : 'Commencer'}
        </button>
      )}
    </div>
  )
}

// ─── Number Tap Mode (1→25) ───────────────────────────────────────────────────
function NumberTapMode() {
  const SIZE = 5
  const COUNT = SIZE * SIZE

  const [grid, setGrid] = useState<number[]>([])
  const [next, setNext] = useState(1)
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle')
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [bestTime, setBestTime] = useState(0)
  const [wrongFlash, setWrongFlash] = useState<number | null>(null)
  const [correctFlash, setCorrectFlash] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const shuffle = useCallback(() => {
    const nums = Array.from({ length: COUNT }, (_, i) => i + 1)
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]]
    }
    return nums
  }, [COUNT])

  const startGame = () => {
    setGrid(shuffle())
    setNext(1)
    setPhase('playing')
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => setElapsed(Date.now() - now), 50)
  }

  const handleTap = (num: number) => {
    if (phase !== 'playing') return
    if (num === next) {
      setCorrectFlash(num)
      setTimeout(() => setCorrectFlash(null), 300)
      const newNext = next + 1
      if (newNext > COUNT) {
        clearInterval(intervalRef.current)
        const total = Date.now() - startTime
        setElapsed(total)
        setPhase('done')
        if (bestTime === 0 || total < bestTime) setBestTime(total)
      } else {
        setNext(newNext)
      }
    } else {
      setWrongFlash(num)
      setTimeout(() => setWrongFlash(null), 300)
    }
  }

  const displayTime = (ms: number) => `${(ms / 1000).toFixed(2)}s`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Prochain', value: phase === 'playing' ? next : '—', color: ACCENT },
          { label: 'Temps', value: phase === 'playing' ? displayTime(elapsed) : phase === 'done' ? displayTime(elapsed) : '—', color: ACCENT2 },
          { label: 'Record', value: bestTime ? displayTime(bestTime) : '—', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '8px 6px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {phase === 'done' && (
        <div style={{
          borderRadius: 14, padding: 16, textAlign: 'center',
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', marginBottom: 4 }}>
            {bestTime === elapsed ? '🏆 Nouveau record !' : '✓ Terminé !'}
          </div>
          <div style={{ fontSize: 15, color: TEXT }}>{displayTime(elapsed)}</div>
        </div>
      )}

      {/* 5×5 Grid */}
      {grid.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {grid.map(num => {
            const isDone = num < next
            const isCurrent = num === next
            const isWrong = wrongFlash === num
            const isCorrect = correctFlash === num
            return (
              <button
                key={num}
                onClick={() => handleTap(num)}
                disabled={phase !== 'playing' || isDone}
                style={{
                  aspectRatio: '1', borderRadius: 10, fontSize: 16, fontWeight: 800,
                  border: `2px solid ${isCurrent ? ACCENT : isWrong ? '#ef4444' : isCorrect ? '#22c55e' : BORDER}`,
                  background: isDone ? `${ACCENT}25`
                    : isWrong ? 'rgba(239,68,68,0.2)'
                    : isCorrect ? 'rgba(34,197,94,0.2)'
                    : isCurrent ? `${ACCENT}18`
                    : SURFACE2,
                  color: isDone ? `${ACCENT}80`
                    : isWrong ? '#ef4444'
                    : isCorrect ? '#22c55e'
                    : isCurrent ? ACCENT
                    : TEXT,
                  cursor: phase === 'playing' && !isDone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  transform: isCorrect ? 'scale(0.92)' : isCurrent ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isCurrent ? `0 0 12px ${ACCENT}50` : 'none',
                }}
              >
                {num}
              </button>
            )
          })}
        </div>
      )}

      {(phase === 'idle' || phase === 'done') && (
        <button onClick={startGame} style={{
          padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 15,
          background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          {phase === 'done' ? 'Rejouer' : 'Commencer (1 → 25)'}
        </button>
      )}

      {phase === 'idle' && (
        <p style={{ textAlign: 'center', fontSize: 11, color: MUTED, margin: 0 }}>
          Touchez les chiffres de 1 à 25 dans l'ordre, le plus vite possible
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReactionGame({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<GameMode>('reaction')

  const modes: { id: GameMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'reaction', label: 'Réaction', icon: <Zap size={15} />, desc: 'Tapez quand ça devient vert' },
    { id: 'sequence', label: 'Séquence', icon: <Hash size={15} />, desc: 'Mémorisez les couleurs' },
    { id: 'numbertap', label: '1→25', icon: <Grid size={15} />, desc: "Touchez dans l'ordre" },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, userSelect: 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
        )}
        <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>⚡ Réflexes</span>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: 12, cursor: 'pointer',
              background: mode === m.id ? `${ACCENT}20` : SURFACE,
              border: `1.5px solid ${mode === m.id ? ACCENT : BORDER}`,
              color: mode === m.id ? ACCENT : MUTED,
              fontWeight: mode === m.id ? 700 : 400,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all 0.2s ease',
            }}
          >
            {m.icon}
            <span style={{ fontSize: 10, lineHeight: 1 }}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <div style={{ padding: '8px 12px', borderRadius: 10, background: SURFACE2, border: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 11, color: MUTED }}>
          {modes.find(m => m.id === mode)?.desc}
        </span>
      </div>

      {/* Active mode */}
      {mode === 'reaction' && <ReactionTimeMode />}
      {mode === 'sequence' && <SequenceMode />}
      {mode === 'numbertap' && <NumberTapMode />}
    </div>
  )
}
