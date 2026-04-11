import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, Trophy, RotateCcw, Brain } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types & Constants ────────────────────────────────────────────────────────
type Phase = 'idle' | 'show' | 'input' | 'result'
type Difficulty = 'easy' | 'normal' | 'hard'

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; msPerDigit: number; color: string }> = {
  easy:   { label: 'Facile',  msPerDigit: 4000, color: '#22c55e' },
  normal: { label: 'Normal',  msPerDigit: 2000, color: '#f59e0b' },
  hard:   { label: 'Difficile', msPerDigit: 1000, color: '#ef4444' },
}

const STORAGE_KEY = 'numbermemory_stats'
interface StoredStats {
  bestByDifficulty: Record<Difficulty, number>
  history: { level: number; correct: boolean; difficulty: Difficulty }[]
}

function loadStats(): StoredStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredStats
  } catch { /* noop */ }
  return {
    bestByDifficulty: { easy: 0, normal: 0, hard: 0 },
    history: [],
  }
}
function saveStats(s: StoredStats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* noop */ }
}

function randNum(digits: number): string {
  if (digits === 1) return String(Math.floor(Math.random() * 9) + 1)
  const min = Math.pow(10, digits - 1)
  const max = Math.pow(10, digits) - 1
  return String(Math.floor(Math.random() * (max - min + 1) + min))
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: SURFACE2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 3,
        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
        width: `${Math.max(0, Math.min(100, pct))}%`,
        transition: 'width 0.1s linear',
        boxShadow: `0 0 8px ${color}80`,
      }} />
    </div>
  )
}

// ─── Number Pad ───────────────────────────────────────────────────────────────
function NumberPad({ onPress, onDelete, onSubmit, value, disabled }: {
  onPress: (d: string) => void
  onDelete: () => void
  onSubmit: () => void
  value: string
  disabled: boolean
}) {
  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','OK']]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 8 }}>
          {row.map(key => {
            const isDelete = key === '⌫'
            const isOk = key === 'OK'
            const isDisabledOk = isOk && (!value || disabled)
            return (
              <button
                key={key}
                disabled={disabled && !isOk || isDisabledOk}
                onClick={() => {
                  if (isDelete) onDelete()
                  else if (isOk) onSubmit()
                  else onPress(key)
                }}
                style={{
                  flex: 1, padding: '16px 0', borderRadius: 14,
                  fontSize: isOk ? 14 : isDelete ? 18 : 22,
                  fontWeight: 700,
                  background: isOk
                    ? (isDisabledOk ? SURFACE2 : ACCENT)
                    : isDelete
                      ? SURFACE2
                      : SURFACE,
                  color: isOk
                    ? (isDisabledOk ? MUTED : '#fff')
                    : isDelete
                      ? MUTED
                      : TEXT,
                  border: `1.5px solid ${isOk && !isDisabledOk ? ACCENT : BORDER}`,
                  cursor: (disabled || isDisabledOk) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isOk && !isDisabledOk ? `0 0 16px ${ACCENT}40` : 'none',
                }}
              >
                {key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── History Mini Chart ───────────────────────────────────────────────────────
function HistoryChart({ history }: { history: StoredStats['history'] }) {
  const last = history.slice(-10)
  if (last.length === 0) return null
  return (
    <div style={{ borderRadius: 14, padding: '12px 12px 8px', background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 8 }}>
        Historique ({last.length} dernières)
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 48 }}>
        {last.map((entry, i) => {
          const h = Math.max(10, Math.min(44, entry.level * 3.5))
          const diff = DIFFICULTY_CONFIG[entry.difficulty]
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: '100%', height: h, borderRadius: 4,
                background: entry.correct ? diff.color : `${diff.color}40`,
                border: `1px solid ${diff.color}60`,
                transition: 'height 0.3s ease',
                boxShadow: entry.correct ? `0 0 6px ${diff.color}50` : 'none',
              }} />
              <span style={{ fontSize: 8, color: entry.correct ? diff.color : MUTED }}>
                {entry.level}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 4, textAlign: 'center' }}>
        plein = correct · pâle = raté
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NumberMemoryGame({ onBack }: { onBack?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [level, setLevel] = useState(3)
  const [target, setTarget] = useState('')
  const [input, setInput] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [lives, setLives] = useState(3)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [stats, setStats] = useState<StoredStats>(loadStats)
  const [progress, setProgress] = useState(100)
  const [showMs, setShowMs] = useState(0)
  const [animKey, setAnimKey] = useState(0)

  const showIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase === 'input') {
        if (e.key >= '0' && e.key <= '9') handlePress(e.key)
        else if (e.key === 'Backspace') handleDelete()
        else if (e.key === 'Enter') handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  useEffect(() => () => {
    clearInterval(showIntervalRef.current)
    clearTimeout(hideTimerRef.current)
  }, [])

  const startRound = useCallback((lvl: number, diff: Difficulty) => {
    clearInterval(showIntervalRef.current)
    clearTimeout(hideTimerRef.current)

    const num = randNum(lvl)
    const totalMs = DIFFICULTY_CONFIG[diff].msPerDigit * lvl
    setTarget(num)
    setInput('')
    setCorrect(null)
    setProgress(100)
    setShowMs(totalMs)
    setPhase('show')
    setAnimKey(k => k + 1)

    const startAt = Date.now()
    showIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt
      const pct = Math.max(0, ((totalMs - elapsed) / totalMs) * 100)
      setProgress(pct)
      if (pct <= 0) clearInterval(showIntervalRef.current)
    }, 50)

    hideTimerRef.current = setTimeout(() => {
      clearInterval(showIntervalRef.current)
      setProgress(0)
      setPhase('input')
    }, totalMs)
  }, [])

  const handlePress = (d: string) => {
    if (input.length < 25) setInput(p => p + d)
  }
  const handleDelete = () => setInput(p => p.slice(0, -1))
  const handleSubmit = () => {
    if (!input) return
    const ok = input === target
    setCorrect(ok)
    setPhase('result')

    setStats(prev => {
      const newBest = { ...prev.bestByDifficulty }
      if (ok && level > newBest[difficulty]) newBest[difficulty] = level
      const next: StoredStats = {
        bestByDifficulty: newBest,
        history: [...prev.history, { level, correct: ok, difficulty }].slice(-50),
      }
      saveStats(next)
      return next
    })
  }

  const handleNext = () => {
    if (correct) {
      const newLevel = level + 1
      setLevel(newLevel)
      startRound(newLevel, difficulty)
    } else {
      const newLives = lives - 1
      if (newLives <= 0) {
        setPhase('idle')
        setLives(3)
        setLevel(3)
      } else {
        setLives(newLives)
        startRound(level, difficulty)
      }
    }
  }

  const newGame = () => {
    clearInterval(showIntervalRef.current)
    clearTimeout(hideTimerRef.current)
    setPhase('idle')
    setLevel(3)
    setLives(3)
    setInput('')
    setCorrect(null)
  }

  const diff = DIFFICULTY_CONFIG[difficulty]
  const best = stats.bestByDifficulty[difficulty]

  // Dynamic font size for the number display
  const numFontSize = Math.max(22, Math.min(52, 52 - (level - 3) * 2.5))

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
          <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>🧠 Mémoire des Chiffres</span>
        </div>
        {phase !== 'idle' && (
          <button onClick={newGame} style={{ padding: 6, borderRadius: 8, background: SURFACE2, border: `1px solid ${BORDER}`, cursor: 'pointer', color: MUTED, display: 'flex' }}>
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { icon: <Brain size={12} />, label: 'Niveau', value: level, color: ACCENT },
          { icon: <Trophy size={12} />, label: 'Record', value: best || '—', color: '#f59e0b' },
          { icon: null, label: 'Vies', value: '❤️'.repeat(lives), color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, borderRadius: 12, padding: '8px 6px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontSize: typeof s.value === 'number' ? 18 : 13, fontWeight: 900, color: s.color, lineHeight: 1.2 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── IDLE ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            borderRadius: 20, padding: '28px 20px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 56 }}>🔢</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Mémoire des Chiffres</div>
            <div style={{ fontSize: 13, color: MUTED, maxWidth: 260, lineHeight: 1.5 }}>
              Mémorisez le nombre affiché, puis retapez-le. Chaque bonne réponse augmente la longueur.
            </div>

            {/* Difficulty selector */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => {
                const cfg = DIFFICULTY_CONFIG[d]
                const isSelected = d === difficulty
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                      background: isSelected ? `${cfg.color}20` : SURFACE2,
                      border: `1.5px solid ${isSelected ? cfg.color : BORDER}`,
                      color: isSelected ? cfg.color : MUTED,
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                  >
                    {cfg.label}
                    <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, color: isSelected ? cfg.color : MUTED }}>
                      {cfg.msPerDigit / 1000}s/chiffre
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ fontSize: 11, color: MUTED }}>
              Meilleur en {diff.label} : <span style={{ color: diff.color, fontWeight: 700 }}>{best || '—'} chiffres</span>
            </div>
          </div>

          <HistoryChart history={stats.history} />

          <button
            onClick={() => startRound(level, difficulty)}
            style={{
              padding: '15px', borderRadius: 14, fontWeight: 700, fontSize: 16,
              background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: `0 0 24px ${ACCENT}40`,
            }}
          >
            Commencer ({level} chiffres)
          </button>
        </div>
      )}

      {/* ── SHOW ─────────────────────────────────────────────── */}
      {phase === 'show' && (
        <div style={{
          borderRadius: 20, padding: '28px 20px',
          background: SURFACE, border: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>
            NIVEAU {level} · {level} CHIFFRES · {(showMs / 1000).toFixed(0)}s
          </div>

          <div key={animKey} style={{ animation: 'numberAppear 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{
              fontSize: numFontSize,
              fontWeight: 900,
              color: TEXT,
              letterSpacing: level > 8 ? '0.08em' : '0.15em',
              textAlign: 'center',
              textShadow: `0 0 40px ${ACCENT}60, 0 0 80px ${ACCENT}30`,
              lineHeight: 1.2,
              maxWidth: 320,
              wordBreak: 'break-all',
              padding: '0 8px',
            }}>
              {target}
            </div>
          </div>

          <div style={{ width: '100%' }}>
            <ProgressBar pct={progress} color={diff.color} />
          </div>

          <div style={{ fontSize: 11, color: MUTED }}>
            Mémorisez puis retapez ce nombre
          </div>
        </div>
      )}

      {/* ── INPUT ────────────────────────────────────────────── */}
      {phase === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Display field */}
          <div style={{
            borderRadius: 16, padding: '16px 20px', textAlign: 'center',
            background: SURFACE, border: `1px solid ${BORDER}`,
            minHeight: 80, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>
              QUEL ÉTAIT LE NOMBRE ? ({level} chiffres)
            </div>
            <div style={{
              fontSize: Math.max(20, Math.min(36, 36 - level)),
              fontWeight: 900, color: input ? TEXT : MUTED,
              letterSpacing: '0.12em',
              minHeight: 44, display: 'flex', alignItems: 'center',
              transition: 'color 0.2s',
            }}>
              {input || '—'}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {input.length} / {level} chiffres
            </div>
          </div>

          <NumberPad
            onPress={handlePress}
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            value={input}
            disabled={false}
          />
        </div>
      )}

      {/* ── RESULT ───────────────────────────────────────────── */}
      {phase === 'result' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            borderRadius: 20, padding: '24px 20px', textAlign: 'center',
            background: correct ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 48 }}>{correct ? '🎉' : '💀'}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: correct ? '#22c55e' : '#ef4444' }}>
              {correct
                ? `Niveau ${level} réussi !`
                : `Raté — niveau ${level}`}
            </div>

            {!correct && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <div style={{ fontSize: 12, color: MUTED }}>Le nombre était :</div>
                <div style={{
                  fontSize: Math.max(18, 28 - level),
                  fontWeight: 900, color: '#22c55e',
                  letterSpacing: '0.1em',
                  textShadow: '0 0 20px rgba(34,197,94,0.4)',
                  wordBreak: 'break-all',
                }}>
                  {target}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Vous avez tapé :</div>
                <div style={{
                  fontSize: Math.max(18, 28 - level),
                  fontWeight: 900, color: '#ef4444',
                  letterSpacing: '0.1em',
                  wordBreak: 'break-all',
                }}>
                  {input}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                  Vies restantes : {'❤️'.repeat(Math.max(0, lives - 1))}{'🖤'.repeat(Math.max(0, 3 - lives + 1))}
                </div>
              </div>
            )}

            {correct && stats.bestByDifficulty[difficulty] === level && (
              <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>
                🏆 Nouveau record en {diff.label} !
              </div>
            )}
          </div>

          {correct ? (
            <button onClick={handleNext} style={{
              padding: '15px', borderRadius: 14, fontWeight: 700, fontSize: 16,
              background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: `0 0 24px ${ACCENT}40`,
            }}>
              Niveau {level + 1} →
            </button>
          ) : lives > 1 ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleNext} style={{
                flex: 1, padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                background: ACCENT2, color: '#fff', border: 'none', cursor: 'pointer',
              }}>
                Réessayer ({lives - 1} vie{lives - 1 > 1 ? 's' : ''})
              </button>
              <button onClick={newGame} style={{
                padding: '14px 18px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                background: SURFACE2, color: MUTED, border: `1px solid ${BORDER}`, cursor: 'pointer',
              }}>
                Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                borderRadius: 12, padding: '10px 14px', textAlign: 'center',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>Plus de vies !</span>
                <span style={{ fontSize: 12, color: MUTED, marginLeft: 8 }}>Meilleur : {stats.bestByDifficulty[difficulty]} chiffres</span>
              </div>
              <button onClick={newGame} style={{
                padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 15,
                background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
              }}>
                Rejouer
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes numberAppear {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
