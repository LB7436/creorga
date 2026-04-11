import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types & Config ────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'normal' | 'hard'

interface DiffConfig {
  label: string
  colors: number
  duplicates: boolean
  maxTries: number
}

const DIFF: Record<Difficulty, DiffConfig> = {
  easy:   { label: 'Facile',   colors: 6, duplicates: false, maxTries: 10 },
  normal: { label: 'Normal',   colors: 6, duplicates: true,  maxTries: 10 },
  hard:   { label: 'Difficile', colors: 8, duplicates: true, maxTries: 10 },
}

// 8 colors for hard mode
const ALL_COLORS = [
  '#ef4444', // Rouge
  '#f97316', // Orange
  '#eab308', // Jaune
  '#22c55e', // Vert
  '#3b82f6', // Bleu
  '#a855f7', // Violet
  '#ec4899', // Rose  (hard only)
  '#14b8a6', // Turquoise (hard only)
]

const COLOR_NAMES = ['Rouge', 'Orange', 'Jaune', 'Vert', 'Bleu', 'Violet', 'Rose', 'Turquoise']

const CODE_LEN = 4

// ─── Logic ────────────────────────────────────────────────────────────────────

function makeCode(cfg: DiffConfig): number[] {
  const code: number[] = []
  const pool = Array.from({ length: cfg.colors }, (_, i) => i)
  while (code.length < CODE_LEN) {
    const idx = Math.floor(Math.random() * pool.length)
    const color = pool[idx]
    if (!cfg.duplicates) pool.splice(idx, 1)
    code.push(color)
  }
  return code
}

function checkGuess(code: number[], guess: number[]): { black: number; white: number } {
  let black = 0, white = 0
  const codeLeft = [...code]
  const guessLeft = [...guess]
  for (let i = 0; i < CODE_LEN; i++) {
    if (guess[i] === code[i]) {
      black++
      codeLeft[i] = -1
      guessLeft[i] = -2
    }
  }
  for (let i = 0; i < CODE_LEN; i++) {
    if (guessLeft[i] === -2) continue
    const j = codeLeft.indexOf(guessLeft[i])
    if (j !== -1) { white++; codeLeft[j] = -1 }
  }
  return { black, white }
}

// ─── Best score storage ────────────────────────────────────────────────────────

function loadBest(): Partial<Record<Difficulty, number>> {
  try { return JSON.parse(localStorage.getItem('mastermind_best') ?? '{}') } catch { return {} }
}
function saveBest(d: Difficulty, n: number) {
  try {
    const b = loadBest()
    if (!b[d] || n < b[d]!) { b[d] = n; localStorage.setItem('mastermind_best', JSON.stringify(b)) }
  } catch { /* ignore */ }
}

// ─── Color Peg ────────────────────────────────────────────────────────────────

function ColorPeg({ color, size = 28, selected, onClick, pulse }: {
  color: number | null
  size?: number
  selected?: boolean
  onClick?: () => void
  pulse?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: color !== null ? ALL_COLORS[color] : 'transparent',
        border: `2px solid ${color !== null ? ALL_COLORS[color] : BORDER}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected
          ? `0 0 0 3px ${ACCENT}, 0 0 12px ${ACCENT}60`
          : color !== null
            ? `0 2px 8px ${ALL_COLORS[color]}50`
            : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        transform: pulse ? 'scale(1.15)' : selected ? 'scale(1.08)' : 'scale(1)',
        flexShrink: 0,
        animation: pulse ? 'pegShake 0.35s ease' : 'none',
      }}
    />
  )
}

// ─── Clue Pegs ────────────────────────────────────────────────────────────────

function ClueDisplay({ black, white }: { black: number; white: number }) {
  const pegs = [
    ...Array(black).fill('black'),
    ...Array(white).fill('white'),
    ...Array(CODE_LEN - black - white).fill('empty'),
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: 28 }}>
      {pegs.map((type, i) => (
        <div key={i} style={{
          width: 11, height: 11, borderRadius: '50%',
          background: type === 'black' ? '#111' : type === 'white' ? '#f8fafc' : 'transparent',
          border: `1.5px solid ${type === 'empty' ? BORDER : type === 'black' ? '#444' : '#ccc'}`,
        }} />
      ))}
    </div>
  )
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-10px',
          width: 8, height: 8,
          borderRadius: Math.random() > 0.5 ? '50%' : 2,
          background: ALL_COLORS[i % ALL_COLORS.length],
          animation: `confettiFall ${1.2 + Math.random() * 1.2}s ${Math.random() * 0.8}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MastermindGame({ onBack }: { onBack?: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [code, setCode] = useState<number[]>([])
  const [guesses, setGuesses] = useState<{ guess: number[]; result: { black: number; white: number } }[]>([])
  const [current, setCurrent] = useState<(number | null)[]>([null, null, null, null])
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null)    // which peg slot is active
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [shakingRow, setShakingRow] = useState<number | null>(null)
  const [best, setBest] = useState(loadBest)
  const [showConfetti, setShowConfetti] = useState(false)
  const [codeRevealIdx, setCodeRevealIdx] = useState(0)
  const cfg = difficulty ? DIFF[difficulty] : DIFF.normal

  function startGame(d: Difficulty) {
    setDifficulty(d)
    setCode(makeCode(DIFF[d]))
    setGuesses([])
    setCurrent([null, null, null, null])
    setSelectedPeg(null)
    setWon(false)
    setLost(false)
    setShowConfetti(false)
    setCodeRevealIdx(0)
  }

  function reset() {
    if (difficulty) startGame(difficulty)
  }

  const over = won || lost

  // Reveal code on lose
  useEffect(() => {
    if (!lost) return
    if (codeRevealIdx >= CODE_LEN) return
    const t = setTimeout(() => setCodeRevealIdx(i => i + 1), 200)
    return () => clearTimeout(t)
  }, [lost, codeRevealIdx])

  // Confetti on win
  useEffect(() => {
    if (!won) return
    setShowConfetti(true)
    const t = setTimeout(() => setShowConfetti(false), 2800)
    return () => clearTimeout(t)
  }, [won])

  function selectPeg(slotIdx: number) {
    if (over) return
    setSelectedPeg(slotIdx === selectedPeg ? null : slotIdx)
  }

  function pickColor(colorIdx: number) {
    if (over || selectedPeg === null) return
    setCurrent(c => {
      const next = [...c]
      next[selectedPeg] = colorIdx
      return next
    })
    // Auto-advance to next empty slot
    const nextEmpty = current.findIndex((v, i) => i > selectedPeg && v === null)
    if (nextEmpty !== -1) setSelectedPeg(nextEmpty)
    else setSelectedPeg(null)
  }

  function submit() {
    if (current.some(v => v === null)) return
    const guess = current as number[]
    const result = checkGuess(code, guess)
    const newGuesses = [...guesses, { guess, result }]
    setGuesses(newGuesses)

    // Shake animation
    const rowIdx = newGuesses.length - 1
    setShakingRow(rowIdx)
    setTimeout(() => setShakingRow(null), 400)

    if (result.black === CODE_LEN) {
      setWon(true)
      if (difficulty) {
        saveBest(difficulty, newGuesses.length)
        setBest(loadBest())
      }
    } else if (newGuesses.length >= cfg.maxTries) {
      setLost(true)
    } else {
      setCurrent([null, null, null, null])
      setSelectedPeg(0)
    }
  }

  function clearSlot() {
    if (selectedPeg === null) return
    setCurrent(c => { const n = [...c]; n[selectedPeg] = null; return n })
  }

  const isReady = current.every(v => v !== null)

  // ── Difficulty selection ───────────────────────────────────────────────────
  if (!difficulty) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{`
          @keyframes confettiFall {
            to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          @keyframes pegShake {
            0%,100% { transform: scale(1.15) translateX(0); }
            25%      { transform: scale(1.15) translateX(-4px); }
            75%      { transform: scale(1.15) translateX(4px); }
          }
          @keyframes codeReveal {
            from { transform: scale(0) rotateY(90deg); opacity: 0; }
            to   { transform: scale(1) rotateY(0deg);  opacity: 1; }
          }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>🔐 Mastermind</span>
        </div>

        {/* Best scores */}
        <div style={{ display: 'flex', gap: 8, background: SURFACE2, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '10px 14px' }}>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
            <div key={d} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>
                {best[d] ? best[d] : '—'}
              </div>
              <div style={{ fontSize: 9, color: MUTED }}>{DIFF[d].label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>
          🔴 = bonne couleur & position · ⚪ = bonne couleur, mauvaise position
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => {
            const dc = DIFF[d]
            const colors: Record<Difficulty, string> = { easy: '#22c55e', normal: '#f59e0b', hard: '#ef4444' }
            const col = colors[d]
            return (
              <button key={d} onClick={() => startGame(d)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${col}10`, border: `1px solid ${col}40`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                transition: 'transform 0.1s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{dc.label}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {dc.colors} couleurs · {dc.duplicates ? 'doublons possibles' : 'sans doublons'} · {dc.maxTries} essais
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {ALL_COLORS.slice(0, dc.colors).map((c, i) => (
                    <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Game screen ───────────────────────────────────────────────────────────
  const tryNum = guesses.length + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      <style>{`
        @keyframes confettiFall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pegShake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-5px); }
          75%      { transform: translateX(5px); }
        }
        @keyframes codeReveal {
          from { transform: scale(0) rotateY(90deg); opacity: 0; }
          to   { transform: scale(1) rotateY(0deg);  opacity: 1; }
        }
      `}</style>

      {showConfetti && <Confetti />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDifficulty(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>🔐 Mastermind</span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700,
            background: `${ACCENT}20`, color: ACCENT,
          }}>{cfg.label}</span>
        </div>
        <span style={{ fontSize: 11, color: MUTED }}>
          Essai {Math.min(tryNum, cfg.maxTries)}/{cfg.maxTries}
          {best[difficulty] && <span style={{ color: '#f59e0b', marginLeft: 6 }}>Record: {best[difficulty]}</span>}
        </span>
      </div>

      {/* Secret code shield */}
      <div style={{
        background: SURFACE, border: `1px solid ${BORDER}`,
        borderRadius: 12, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: MUTED, minWidth: 70 }}>Code secret</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {code.map((c, i) => {
            const revealed = won || (lost && i < codeRevealIdx)
            return (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: revealed ? ALL_COLORS[c] : '#1a1a3e',
                border: `2px solid ${revealed ? ALL_COLORS[c] : BORDER}`,
                boxShadow: revealed ? `0 0 8px ${ALL_COLORS[c]}60` : 'none',
                transition: 'background 0.2s, border-color 0.2s',
                animation: revealed && lost ? `codeReveal 0.4s ${i * 0.15}s ease both` : 'none',
              }} />
            )
          })}
        </div>
        {!over && (
          <span style={{ marginLeft: 'auto', fontSize: 18 }}>🛡️</span>
        )}
        {won && <span style={{ marginLeft: 'auto', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>Déchiffré !</span>}
        {lost && <span style={{ marginLeft: 'auto', fontSize: 13, color: '#ef4444', fontWeight: 700 }}>Révélé</span>}
      </div>

      {/* Result banner */}
      {over && (
        <div style={{
          textAlign: 'center', padding: '8px 12px', borderRadius: 12,
          background: won ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${won ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
          color: won ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 13,
        }}>
          {won
            ? `🎉 Déchiffré en ${guesses.length} coup${guesses.length > 1 ? 's' : ''} !`
            : '😞 Code non déchiffré...'
          }
        </div>
      )}

      {/* Guess history */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
        {guesses.map((g, ri) => (
          <div key={ri} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: SURFACE2, border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: '6px 10px',
            animation: shakingRow === ri ? 'pegShake 0.35s ease' : 'none',
          }}>
            <span style={{ fontSize: 10, color: MUTED, minWidth: 18 }}>#{ri + 1}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {g.guess.map((c, i) => (
                <ColorPeg key={i} color={c} size={22} />
              ))}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <ClueDisplay black={g.result.black} white={g.result.white} />
            </div>
            <span style={{ fontSize: 10, color: MUTED, minWidth: 36, textAlign: 'right' }}>
              {g.result.black}🔴 {g.result.white}⚪
            </span>
          </div>
        ))}
      </div>

      {/* Current guess row */}
      {!over && (
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 12, padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Peg slots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: MUTED, minWidth: 18 }}>#{tryNum}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {current.map((c, i) => (
                <div key={i} onClick={() => selectPeg(i)} style={{ cursor: 'pointer' }}>
                  <ColorPeg
                    color={c}
                    size={28}
                    selected={selectedPeg === i}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={clearSlot} disabled={selectedPeg === null}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED,
                  cursor: selectedPeg !== null ? 'pointer' : 'default', opacity: selectedPeg !== null ? 1 : 0.4,
                }}>✕</button>
            </div>
          </div>

          {/* Color palette */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {ALL_COLORS.slice(0, cfg.colors).map((_, ci) => (
              <div key={ci} onClick={() => pickColor(ci)}
                style={{ cursor: selectedPeg !== null ? 'pointer' : 'default', opacity: selectedPeg !== null ? 1 : 0.5 }}
                title={COLOR_NAMES[ci]}
              >
                <ColorPeg color={ci} size={30} />
              </div>
            ))}
          </div>

          {/* Validate */}
          <button onClick={submit} disabled={!isReady}
            style={{
              padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
              background: isReady ? ACCENT : SURFACE2,
              border: `1px solid ${isReady ? 'transparent' : BORDER}`,
              color: isReady ? '#fff' : MUTED,
              cursor: isReady ? 'pointer' : 'default',
              opacity: isReady ? 1 : 0.5,
              transition: 'all 0.15s',
            }}>
            Valider ✓
          </button>
        </div>
      )}

      {/* Selected color hint */}
      {!over && selectedPeg !== null && (
        <div style={{ textAlign: 'center', fontSize: 11, color: MUTED }}>
          Cliquer une couleur pour la case {selectedPeg + 1}
        </div>
      )}
      {!over && selectedPeg === null && (
        <div style={{ textAlign: 'center', fontSize: 11, color: MUTED }}>
          Cliquer un peg pour le sélectionner
        </div>
      )}

      {/* Play again */}
      {over && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={reset} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            Nouvelle partie
          </button>
          <button onClick={() => setDifficulty(null)} style={{
            padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: SURFACE2, border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer',
          }}>
            Menu
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 10, color: MUTED }}>
        🔴 bonne couleur & position · ⚪ bonne couleur, mauvaise position
      </p>
    </div>
  )
}
