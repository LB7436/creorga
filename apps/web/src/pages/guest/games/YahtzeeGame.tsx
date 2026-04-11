import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types & constants ────────────────────────────────────────────────────────
type Category =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeKind' | 'fourKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight'
  | 'yahtzee' | 'chance'

const UPPER_CATS: Category[] = ['ones','twos','threes','fours','fives','sixes']
const LOWER_CATS: Category[] = ['threeKind','fourKind','fullHouse','smallStraight','largeStraight','yahtzee','chance']

const CAT_LABELS: Record<Category, string> = {
  ones: 'As', twos: 'Deux', threes: 'Trois', fours: 'Quatre', fives: 'Cinq', sixes: 'Six',
  threeKind: 'Brelan', fourKind: 'Carré', fullHouse: 'Full (25)',
  smallStraight: 'P. Suite (30)', largeStraight: 'G. Suite (40)',
  yahtzee: 'Yahtzee! (50)', chance: 'Chance',
}

const UPPER_NUM: Record<string, number> = { ones:1, twos:2, threes:3, fours:4, fives:5, sixes:6 }
const UPPER_BONUS_THRESHOLD = 63
const UPPER_BONUS = 35
const YAHTZEE_BONUS = 100

function calcScore(cat: Category, dice: number[]): number {
  const counts = Array(7).fill(0)
  dice.forEach(d => counts[d]++)
  const sum = dice.reduce((a, b) => a + b, 0)
  if (UPPER_NUM[cat]) return counts[UPPER_NUM[cat]] * UPPER_NUM[cat]
  if (cat === 'threeKind') return counts.some(c => c >= 3) ? sum : 0
  if (cat === 'fourKind') return counts.some(c => c >= 4) ? sum : 0
  if (cat === 'fullHouse') return (counts.some(c => c === 3) && counts.some(c => c === 2)) ? 25 : 0
  if (cat === 'smallStraight') {
    const set = new Set(dice)
    return [[1,2,3,4],[2,3,4,5],[3,4,5,6]].some(s => s.every(v => set.has(v))) ? 30 : 0
  }
  if (cat === 'largeStraight') {
    const sorted = [...new Set(dice)].sort((a, b) => a - b).join('')
    return (sorted === '12345' || sorted === '23456') ? 40 : 0
  }
  if (cat === 'yahtzee') return counts.some(c => c === 5) ? 50 : 0
  if (cat === 'chance') return sum
  return 0
}

// ─── SVG Pips ────────────────────────────────────────────────────────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

function DieFace({ value, held, rolling, onClick }: {
  value: number
  held: boolean
  rolling: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-xl flex items-center justify-center transition-all active:scale-90"
      style={{
        width: 54, height: 54,
        background: held ? 'rgba(168,85,247,0.15)' : '#f8fafc',
        border: `3px solid ${held ? '#a855f7' : '#e2e8f0'}`,
        boxShadow: held
          ? '0 0 16px rgba(168,85,247,0.4), inset 0 0 8px rgba(168,85,247,0.1)'
          : '0 2px 8px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        transform: rolling ? `rotate(${Math.random() * 720 - 360}deg)` : 'none',
        animation: rolling ? 'dieRoll 0.5s ease-out' : 'none',
      }}
    >
      <svg viewBox="0 0 100 100" width="44" height="44">
        {PIP_POSITIONS[value]?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={8}
            fill={held ? '#a855f7' : '#1e293b'} />
        ))}
      </svg>
    </button>
  )
}

// ─── Stats helpers ────────────────────────────────────────────────────────────
interface YahtzeeStats { games: number; best: number; total: number }

function loadStats(): YahtzeeStats {
  try {
    const s = localStorage.getItem('yahtzee_stats')
    return s ? JSON.parse(s) : { games: 0, best: 0, total: 0 }
  } catch { return { games: 0, best: 0, total: 0 } }
}

function saveStats(score: number) {
  const s = loadStats()
  const next: YahtzeeStats = {
    games: s.games + 1,
    best: Math.max(s.best, score),
    total: s.total + score,
  }
  localStorage.setItem('yahtzee_stats', JSON.stringify(next))
  return next
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function YahtzeeGame({ onBack }: { onBack?: () => void }) {
  const [dice, setDice] = useState([1, 2, 3, 4, 5])
  const [held, setHeld] = useState([false, false, false, false, false])
  const [rolls, setRolls] = useState(0)
  const [scores, setScores] = useState<Partial<Record<Category, number>>>({})
  const [yahtzeeBonus, setYahtzeeBonus] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [, setNewlyLit] = useState<number[]>([])
  const [finalStats, setFinalStats] = useState<YahtzeeStats | null>(null)
  const [stats] = useState<YahtzeeStats>(loadStats)
  const rollAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allCats: Category[] = [...UPPER_CATS, ...LOWER_CATS]
  const done = allCats.every(c => scores[c] !== undefined)

  // Upper section sum & bonus
  const upperSum = UPPER_CATS.reduce((acc, c) => acc + (scores[c] ?? 0), 0)
  const hasUpperBonus = upperSum >= UPPER_BONUS_THRESHOLD
  const upperProgress = Math.min(upperSum, UPPER_BONUS_THRESHOLD)

  // Total
  const baseTotal = allCats.reduce((acc, c) => acc + (scores[c] ?? 0), 0)
  const total = baseTotal + (hasUpperBonus ? UPPER_BONUS : 0) + yahtzeeBonus

  // Save when done
  useEffect(() => {
    if (done && finalStats === null) {
      const s = saveStats(total)
      setFinalStats(s)
    }
  }, [done, total, finalStats])

  const doRoll = useCallback(() => {
    if (rolls >= 3 || rolling) return
    setRolling(true)

    // Shake animation timing
    if (rollAnimRef.current) clearTimeout(rollAnimRef.current)
    rollAnimRef.current = setTimeout(() => {
      setDice(d => d.map((v, i) => held[i] ? v : Math.ceil(Math.random() * 6)))
      const newRolls = rolls + 1
      setRolls(newRolls)
      setRolling(false)
      setNewlyLit([])
    }, 480)
  }, [rolls, held, rolling])

  const toggleHold = useCallback((i: number) => {
    if (rolls === 0 || rolling) return
    setHeld(h => h.map((v, j) => j === i ? !v : v))
  }, [rolls, rolling])

  const lockScore = useCallback((cat: Category) => {
    if (scores[cat] !== undefined || rolls === 0) return
    const s = calcScore(cat, dice)

    // Yahtzee bonus logic
    if (cat === 'yahtzee' && scores.yahtzee !== undefined && s === 50) {
      setYahtzeeBonus(b => b + YAHTZEE_BONUS)
    }

    setScores(prev => ({ ...prev, [cat]: s }))
    setNewlyLit([])
    setDice([1, 2, 3, 4, 5])
    setHeld([false, false, false, false, false])
    setRolls(0)
  }, [scores, rolls, dice])

  const reset = useCallback(() => {
    setDice([1, 2, 3, 4, 5])
    setHeld([false, false, false, false, false])
    setRolls(0)
    setScores({})
    setYahtzeeBonus(0)
    setRolling(false)
    setNewlyLit([])
    setFinalStats(null)
  }, [])

  // ── Final screen ──
  if (done && finalStats) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="font-bold text-base" style={{ color: TEXT }}>Yahtzee</span>
        </div>

        <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
          <div className="text-4xl">🏆</div>
          <p className="text-2xl font-black" style={{ color: ACCENT }}>Score final : {total}</p>
          {hasUpperBonus && <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>+ Bonus section haute (+{UPPER_BONUS} pts) !</p>}
          {yahtzeeBonus > 0 && <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>+ Bonus Yahtzee : +{yahtzeeBonus} pts</p>}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: 'Parties', val: finalStats.games },
              { label: 'Record', val: finalStats.best },
              { label: 'Moy.', val: Math.round(finalStats.total / finalStats.games) },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl p-2" style={{ background: SURFACE }}>
                <div className="text-lg font-black" style={{ color: ACCENT }}>{val}</div>
                <div className="text-[10px]" style={{ color: MUTED }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={reset} className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' }}>
            ↺ Rejouer
          </button>
        </div>

        {/* Score recap */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {allCats.map(cat => (
            <div key={cat} className="flex items-center justify-between px-3 py-1.5 border-b text-xs"
              style={{ borderColor: BORDER, background: UPPER_CATS.includes(cat) ? SURFACE : SURFACE2 }}>
              <span style={{ color: MUTED }}>{CAT_LABELS[cat]}</span>
              <span className="font-bold" style={{ color: (scores[cat] ?? 0) > 0 ? ACCENT : MUTED }}>
                {scores[cat] ?? 0}
              </span>
            </div>
          ))}
          {hasUpperBonus && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b text-xs"
              style={{ borderColor: BORDER, background: SURFACE }}>
              <span style={{ color: '#22c55e' }}>Bonus supérieur</span>
              <span className="font-bold" style={{ color: '#22c55e' }}>+{UPPER_BONUS}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* CSS animation for rolling dice */}
      <style>{`
        @keyframes dieRoll {
          0%   { transform: rotate(0deg) scale(1); }
          25%  { transform: rotate(180deg) scale(0.85); }
          60%  { transform: rotate(420deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="font-bold text-base" style={{ color: TEXT }}>Yahtzee</span>
        </div>
        <div className="text-xs" style={{ color: MUTED }}>
          Tour <span style={{ color: TEXT, fontWeight: 700 }}>{Math.min(Object.keys(scores).length + 1, 13)}/13</span>
          {' · '}
          Total <span style={{ color: ACCENT, fontWeight: 700 }}>{total}</span>
          {stats.best > 0 && <span> · Record <span style={{ color: '#f59e0b', fontWeight: 700 }}>{stats.best}</span></span>}
        </div>
      </div>

      {/* Dice row */}
      <div className="flex justify-center gap-2 py-1">
        {dice.map((d, i) => (
          <DieFace key={i} value={d} held={held[i]} rolling={rolling && !held[i]}
            onClick={() => toggleHold(i)} />
        ))}
      </div>

      {/* Hold hint */}
      <p className="text-center text-xs" style={{ color: MUTED, minHeight: 16 }}>
        {rolls > 0 && rolls < 3 && 'Cliquez pour garder · '}
        {rolls > 0 && `${3 - rolls} lancé${3 - rolls > 1 ? 's' : ''} restant${3 - rolls > 1 ? 's' : ''}`}
        {rolls === 3 && 'Choisissez une catégorie'}
      </p>

      {/* Roll button */}
      <button
        onClick={doRoll}
        disabled={rolls >= 3 || rolling}
        className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95 disabled:cursor-default"
        style={{
          background: rolls >= 3 ? SURFACE2 : 'linear-gradient(135deg,#a855f7,#7c3aed)',
          color: rolls >= 3 ? MUTED : '#fff',
          border: rolls >= 3 ? `1px solid ${BORDER}` : 'none',
          opacity: rolling ? 0.7 : 1,
          boxShadow: rolls < 3 ? '0 4px 16px rgba(168,85,247,0.35)' : 'none',
        }}
      >
        {rolls === 0 ? '🎲 Lancer les dés' :
         rolls < 3 ? `🎲 Relancer (${3 - rolls} restant${3 - rolls > 1 ? 's' : ''})` :
         'Choisissez une catégorie'}
      </button>

      {/* Upper section bonus progress */}
      <div className="rounded-xl px-3 py-2" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
        <div className="flex justify-between items-center mb-1.5 text-xs">
          <span style={{ color: MUTED }}>Bonus supérieur</span>
          <span style={{ color: hasUpperBonus ? '#22c55e' : MUTED, fontWeight: 700 }}>
            {upperProgress}/{UPPER_BONUS_THRESHOLD} pts
            {hasUpperBonus ? ' ✓ +35' : ''}
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 5, background: SURFACE }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(upperProgress / UPPER_BONUS_THRESHOLD) * 100}%`,
              background: hasUpperBonus ? '#22c55e' : 'linear-gradient(90deg,#a855f7,#7c3aed)',
            }}
          />
        </div>
      </div>

      {/* Score categories — two columns */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: MUTED }}>Section haute</p>
        <div className="grid grid-cols-2 gap-1">
          {UPPER_CATS.map(cat => <ScoreRow key={cat} cat={cat} scores={scores} dice={dice} rolls={rolls} onLock={lockScore} />)}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest px-1 pt-1" style={{ color: MUTED }}>Section basse</p>
        <div className="grid grid-cols-2 gap-1">
          {LOWER_CATS.map(cat => <ScoreRow key={cat} cat={cat} scores={scores} dice={dice} rolls={rolls} onLock={lockScore} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Score row sub-component ──────────────────────────────────────────────────
function ScoreRow({ cat, scores, dice, rolls, onLock }: {
  cat: Category
  scores: Partial<Record<Category, number>>
  dice: number[]
  rolls: number
  onLock: (cat: Category) => void
}) {
  const saved = scores[cat] !== undefined
  const preview = !saved && rolls > 0 ? calcScore(cat, dice) : null
  return (
    <button
      onClick={() => onLock(cat)}
      disabled={saved || rolls === 0}
      className="rounded-xl px-2.5 py-2 text-left text-xs transition-all hover:brightness-110 active:scale-95 disabled:cursor-default"
      style={{
        background: saved ? 'rgba(168,85,247,0.10)' : SURFACE,
        border: `1px solid ${saved ? 'rgba(168,85,247,0.35)' : preview !== null && preview > 0 ? 'rgba(168,85,247,0.5)' : BORDER}`,
        opacity: saved ? 0.7 : rolls === 0 ? 0.45 : 1,
        boxShadow: !saved && preview !== null && preview > 0 ? '0 0 8px rgba(168,85,247,0.2)' : 'none',
      }}
    >
      <span className="block" style={{ color: MUTED, fontSize: 10 }}>{CAT_LABELS[cat]}</span>
      <span
        className="block font-black mt-0.5"
        style={{
          color: saved ? ACCENT : preview !== null ? (preview > 0 ? ACCENT2 : MUTED) : MUTED,
          fontSize: 13,
          opacity: !saved && preview !== null ? 0.85 : 1,
        }}
      >
        {saved ? scores[cat] : preview !== null ? (preview > 0 ? `+${preview}` : '0') : '—'}
      </span>
    </button>
  )
}
