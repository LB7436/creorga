import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, Trophy, RotateCcw } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Constants ────────────────────────────────────────────────────────────────
const TARGET = 10000
const ON_BOARD_MIN = 500

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'rolled' | 'farkle' | 'banking' | 'cpu' | 'over'

interface ScoreBreakdown {
  total: number
  lines: string[]
}

// ─── SVG Die ──────────────────────────────────────────────────────────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
}

interface DieProps {
  value: number
  kept: boolean
  rolling: boolean
  onClick: () => void
  disabled: boolean
  size?: number
}

function Die({ value, kept, rolling, onClick, disabled, size = 56 }: DieProps) {
  const pips = PIP_POSITIONS[value] || []
  const scale = size / 100

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={kept ? 'Cliquez pour libérer' : 'Cliquez pour garder'}
      style={{
        width: size,
        height: size,
        padding: 0,
        border: `2.5px solid ${kept ? ACCENT : rolling ? ACCENT2 : BORDER}`,
        borderRadius: 12,
        background: kept
          ? `rgba(168,85,247,0.2)`
          : rolling
          ? `rgba(6,182,212,0.1)`
          : SURFACE2,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: kept ? `0 0 12px rgba(168,85,247,0.4)` : 'none',
        animation: rolling ? `dieRoll 0.4s ease infinite alternate` : 'none',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 100 100" width={size - 8} height={size - 8}>
        {pips.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={9 / scale}
            fill={kept ? ACCENT : TEXT}
          />
        ))}
      </svg>
      <style>{`
        @keyframes dieRoll {
          0%   { transform: rotate(-8deg) scale(0.95); }
          100% { transform: rotate(8deg)  scale(1.05); }
        }
      `}</style>
    </button>
  )
}

// ─── Scoring Logic ────────────────────────────────────────────────────────────
function scoreDice(dice: number[]): ScoreBreakdown {
  const counts = Array(7).fill(0)
  dice.forEach(d => counts[d]++)
  let total = 0
  const lines: string[] = []
  const c = [...counts]

  // Straight 1-2-3-4-5-6
  if (dice.length === 6 && c.slice(1).every(v => v === 1)) {
    return { total: 1500, lines: ['Suite 1-6 = 1500'] }
  }

  // Three pairs
  if (dice.length === 6) {
    const pairs = c.filter(v => v === 2).length
    if (pairs === 3) return { total: 1500, lines: ['Trois paires = 1500'] }
  }

  for (let v = 1; v <= 6; v++) {
    const cnt = c[v]
    if (cnt >= 3) {
      const base = v === 1 ? 1000 : v * 100
      const extra = cnt - 3
      let mult = 1
      if (extra === 1) mult = 2
      if (extra === 2) mult = 4
      if (extra === 3) mult = 8
      const pts = base * mult
      const label = cnt === 3 ? `Brelan de ${v}` : cnt === 4 ? `Carré de ${v}` : cnt === 5 ? `Quinte de ${v}` : `Six de ${v}`
      lines.push(`${label} = ${pts}`)
      total += pts
      c[v] = 0
    }
  }

  // Remaining singles: 1=100, 5=50
  total += c[1] * 100
  if (c[1] > 0) lines.push(`${c[1]}×1 = ${c[1] * 100}`)
  total += c[5] * 50
  if (c[5] > 0) lines.push(`${c[5]}×5 = ${c[5] * 50}`)

  return { total, lines }
}

function canScore(dice: number[]): boolean {
  return scoreDice(dice).total > 0
}

function allKeptScore(kept: boolean[], dice: number[]): ScoreBreakdown {
  return scoreDice(dice.filter((_, i) => kept[i]))
}

// ─── CPU Strategy ─────────────────────────────────────────────────────────────
function cpuDecideKeep(dice: number[]): boolean[] {
  // Keep all scoring dice; prefer keeping ones that contribute most
  const kept = dice.map(() => false)
  const counts = Array(7).fill(0)
  dice.forEach(d => counts[d]++)

  // Mark all that are part of scoring combos
  const c = [...counts]
  for (let v = 1; v <= 6; v++) {
    if (c[v] >= 3) {
      let marked = 0
      dice.forEach((d, i) => { if (d === v && marked < c[v]) { kept[i] = true; marked++ } })
      c[v] = 0
    }
  }
  // Singles
  dice.forEach((d, i) => {
    if (d === 1 || d === 5) kept[i] = true
  })
  return kept
}

// ─── Score History Item ───────────────────────────────────────────────────────
interface HistoryEntry { turn: number; player: string; pts: number; total: number }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FarkleGame({ onBack }: { onBack?: () => void }) {
  const [pScore, setPScore] = useState(0)
  const [cScore, setCScore] = useState(0)
  const [pOnBoard, setPOnBoard] = useState(false)
  const [cOnBoard, setCOnBoard] = useState(false)
  const [turn, setTurn] = useState<'p' | 'c'>('p')
  const [dice, setDice] = useState<number[]>([])
  const [kept, setKept] = useState<boolean[]>([])
  const [rolling, setRolling] = useState<boolean[]>([])
  const [turnScore, setTurnScore] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [msg, setMsg] = useState('Lancez les dés pour commencer !')
  const [msgColor, setMsgColor] = useState(TEXT)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [turnNum, setTurnNum] = useState(1)
  const [preview, setPreview] = useState<ScoreBreakdown>({ total: 0, lines: [] })
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOver = phase === 'over'

  // Update score preview whenever kept changes
  useEffect(() => {
    if (dice.length === 0) { setPreview({ total: 0, lines: [] }); return }
    setPreview(allKeptScore(kept, dice))
  }, [kept, dice])

  const rollDice = useCallback(() => {
    if (isOver || turn !== 'p') return
    const numKept = kept.filter(Boolean).length
    const numToRoll = dice.length === 0 ? 6 : dice.length - numKept
    if (numToRoll === 0) return

    // Animate rolling dice
    const rollingMask = dice.length === 0
      ? Array(6).fill(true)
      : kept.map(k => !k)
    setRolling(dice.length === 0 ? Array(6).fill(true) : rollingMask)

    setTimeout(() => {
      setRolling([])
      const newVals = Array.from({ length: numToRoll }, () => Math.ceil(Math.random() * 6))
      let idx = 0
      const newDice = dice.length === 0
        ? newVals
        : dice.map((v, i) => kept[i] ? v : newVals[idx++])
      const newKept = dice.length === 0 ? Array(6).fill(false) : [...kept]
      const freeDice = newDice.filter((_, i) => !newKept[i])

      if (!canScore(freeDice)) {
        // Farkle!
        setDice(newDice)
        setKept(newKept)
        setPhase('farkle')
        setMsg('FARKLE ! Vous perdez le score de ce tour.')
        setMsgColor('#ef4444')
        setTimeout(() => {
          setDice([])
          setKept([])
          setTurnScore(0)
          setPhase('cpu')
          setMsg('Tour CPU...')
          setMsgColor(MUTED)
          setTurnNum(n => n + 1)
          startCpuTurn(cScore, cOnBoard)
        }, 1400)
      } else {
        setDice(newDice)
        setKept(newKept)
        setPhase('rolled')
        setMsg('Sélectionnez les dés à garder, puis relancez ou banquez.')
        setMsgColor(TEXT)
      }
    }, 450)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dice, kept, isOver, turn, cScore, cOnBoard])

  const toggleKept = (i: number) => {
    if (phase !== 'rolled' || turn !== 'p') return
    setKept(k => {
      const next = [...k]
      // Can't un-keep a die that was kept from a previous roll if it's scoring
      next[i] = !next[i]
      return next
    })
  }

  const bank = () => {
    if (phase !== 'rolled' || turn !== 'p') return
    const keptDice = dice.filter((_, i) => kept[i])
    if (keptDice.length === 0) return
    const { total: keptPts } = scoreDice(keptDice)
    if (keptPts === 0) { setMsg('Aucun dé gardé ne marque de points !'); return }
    const newTurnScore = turnScore + keptPts

    // Minimum 500 to get on board
    if (!pOnBoard && newTurnScore < ON_BOARD_MIN) {
      setMsg(`Vous devez marquer au moins ${ON_BOARD_MIN} pts pour entrer en jeu ! (actuellement ${newTurnScore})`)
      setMsgColor('#f59e0b')
      return
    }

    const newTotal = pScore + newTurnScore
    setPScore(newTotal)
    if (!pOnBoard) setPOnBoard(true)
    setHistory(h => [...h, { turn: turnNum, player: 'Vous', pts: newTurnScore, total: newTotal }])
    setTurnScore(0)
    setDice([])
    setKept([])

    if (newTotal >= TARGET) {
      setPhase('over')
      setMsg(`Vous gagnez avec ${newTotal} points !`)
      setMsgColor('#22c55e')
      return
    }

    setPhase('cpu')
    setMsg('Tour CPU...')
    setMsgColor(MUTED)
    setTurnNum(n => n + 1)
    startCpuTurn(cScore, cOnBoard)
  }

  const startCpuTurn = (currentScore: number, onBoard: boolean) => {
    let cpuDice: number[] = []
    let cpuTurnScore = 0
    let rollCount = 0

    const cpuRoll = () => {
      const numToRoll = cpuDice.length === 0 ? 6 : cpuDice.filter((_: unknown, i: number) => !cpuDecideKeep(cpuDice)[i]).length || cpuDice.length
      const newVals = Array.from({ length: numToRoll }, () => Math.ceil(Math.random() * 6))
      let idx2 = 0
      cpuDice = cpuDice.length === 0 ? newVals : cpuDice.map((v, i) => cpuDecideKeep(cpuDice)[i] ? v : newVals[idx2++])
      const cpuKept = cpuDecideKeep(cpuDice)
      const keptDice = cpuDice.filter((_, i) => cpuKept[i])

      if (!canScore(cpuDice.filter((_, i) => !cpuKept[i])) && keptDice.length === 0) {
        // Farkle
        setMsg(`CPU Farkle ! Perd ${cpuTurnScore} pts.`)
        setMsgColor('#ef4444')
        cpuTimerRef.current = setTimeout(endCpuTurn, 1200)
        return
      }

      const { total: pts } = scoreDice(keptDice)
      cpuTurnScore += pts
      rollCount++

      // Hot dice: all 6 scored
      const allScored = keptDice.length === cpuDice.length
      if (allScored) {
        cpuDice = []
      }

      // CPU banks if: has enough pts to get on board (or already on), and score threshold reached
      const threshold = onBoard ? 300 : ON_BOARD_MIN
      const shouldBank = cpuTurnScore >= threshold && (rollCount >= 2 || cpuTurnScore >= 800)
      const willWin = currentScore + cpuTurnScore >= TARGET

      setMsg(`CPU réfléchit... (${cpuTurnScore} pts ce tour)`)

      if (willWin || shouldBank) {
        const newCTotal = currentScore + cpuTurnScore
        setCScore(newCTotal)
        if (!onBoard) setCOnBoard(true)
        setHistory(h => [...h, { turn: turnNum, player: 'CPU', pts: cpuTurnScore, total: newCTotal }])
        if (newCTotal >= TARGET) {
          setPhase('over')
          setMsg(`CPU gagne avec ${newCTotal} points !`)
          setMsgColor('#ef4444')
        } else {
          setMsg(`CPU banque ${cpuTurnScore} pts → total ${newCTotal}`)
          setMsgColor(MUTED)
          cpuTimerRef.current = setTimeout(endCpuTurn, 1200)
        }
      } else {
        cpuTimerRef.current = setTimeout(cpuRoll, 800)
      }
    }

    const endCpuTurn = () => {
      setTurn('p')
      setPhase('idle')
      setMsg('Votre tour ! Lancez les dés.')
      setMsgColor(TEXT)
    }

    cpuTimerRef.current = setTimeout(cpuRoll, 900)
  }

  useEffect(() => {
    return () => { if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current) }
  }, [])

  // Hot dice detection
  const keptCount = kept.filter(Boolean).length
  const isHotDice = dice.length > 0 && keptCount === dice.length && phase === 'rolled'

  // Current kept score for display
  const keptScore = preview.total
  const canBank = phase === 'rolled' && kept.some(Boolean) && keptScore > 0

  const reset = () => {
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    setPScore(0); setCScore(0)
    setPOnBoard(false); setCOnBoard(false)
    setTurn('p'); setDice([]); setKept([]); setRolling([])
    setTurnScore(0); setPhase('idle'); setTurnNum(1)
    setHistory([])
    setMsg('Lancez les dés pour commencer !')
    setMsgColor(TEXT)
  }

  const pct = (s: number) => Math.min(s / TARGET * 100, 100)

  return (
    <div style={{ color: TEXT, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onBack}
            style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 900, fontSize: 16 }}>🎲 Farkle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED }}>
          <Trophy size={12} />
          <span>Objectif : {TARGET.toLocaleString()}</span>
        </div>
      </div>

      {/* Score boards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Vous', score: pScore, active: turn === 'p' && !isOver, onBoard: pOnBoard, color: ACCENT },
          { label: 'CPU', score: cScore, active: turn === 'c' && !isOver, onBoard: cOnBoard, color: ACCENT2 },
        ].map(p => (
          <div
            key={p.label}
            style={{
              borderRadius: 12,
              padding: '10px 12px',
              background: p.active ? `rgba(${p.color === ACCENT ? '168,85,247' : '6,182,212'},0.12)` : SURFACE,
              border: `2px solid ${p.active ? p.color : BORDER}`,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: MUTED }}>{p.label} {p.active ? '◀' : ''}</span>
              {!p.onBoard && <span style={{ fontSize: 9, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '1px 5px', borderRadius: 4 }}>PAS EN JEU</span>}
            </div>
            <div style={{ fontWeight: 900, fontSize: 22, color: TEXT, lineHeight: 1.2 }}>
              {p.score.toLocaleString()}
            </div>
            <div style={{ height: 3, borderRadius: 9999, background: SURFACE2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 9999, background: p.color, width: `${pct(p.score)}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{pct(p.score).toFixed(0)}% vers {TARGET.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Turn score */}
      {(turnScore > 0 || (phase === 'rolled' && keptScore > 0)) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
        }}>
          <span style={{ fontSize: 11, color: '#f59e0b' }}>Score ce tour</span>
          <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 16 }}>
            {turnScore > 0 ? `${turnScore} + ` : ''}{keptScore > 0 ? `+${keptScore}` : ''} pts
          </span>
        </div>
      )}

      {/* Score preview breakdown */}
      {preview.lines.length > 0 && phase === 'rolled' && (
        <div style={{ fontSize: 10, color: ACCENT, background: `rgba(168,85,247,0.08)`, borderRadius: 8, padding: '6px 10px' }}>
          {preview.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Hot dice notice */}
      {isHotDice && (
        <div style={{
          textAlign: 'center', padding: '6px 12px', borderRadius: 10,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
          color: '#22c55e', fontWeight: 700, fontSize: 13,
          animation: 'pulse 0.8s ease infinite alternate',
        }}>
          Dés brûlants ! Tous les dés scorent — vous pouvez relancer les 6 !
        </div>
      )}

      {/* Message */}
      <div style={{
        padding: '8px 12px',
        borderRadius: 10,
        background: SURFACE2,
        border: `1px solid ${BORDER}`,
        color: msgColor,
        fontSize: 12,
        textAlign: 'center',
        fontWeight: 500,
        minHeight: 36,
      }}>
        {msg}
      </div>

      {/* Dice area */}
      {dice.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {dice.map((d, i) => (
            <Die
              key={i}
              value={d}
              kept={kept[i] || false}
              rolling={rolling[i] || false}
              onClick={() => toggleKept(i)}
              disabled={turn !== 'p' || phase !== 'rolled'}
            />
          ))}
        </div>
      )}

      {/* Dice instructions */}
      {phase === 'rolled' && turn === 'p' && (
        <p style={{ textAlign: 'center', fontSize: 10, color: MUTED, margin: 0 }}>
          Cliquez sur un dé pour le garder/libérer (violet = gardé)
        </p>
      )}

      {/* Action buttons */}
      {!isOver && turn === 'p' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={rollDice}
            disabled={phase === 'farkle' || phase === 'cpu' || phase === 'banking'}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
              background: (phase === 'idle' || phase === 'rolled') ? ACCENT : SURFACE2,
              color: (phase === 'idle' || phase === 'rolled') ? '#fff' : MUTED,
              fontWeight: 800, fontSize: 14, cursor: (phase === 'idle' || phase === 'rolled') ? 'pointer' : 'default',
              opacity: (phase === 'farkle' || phase === 'cpu') ? 0.4 : 1,
            }}
          >
            🎲 {dice.length === 0 ? 'Lancer' : isHotDice ? 'Hot Dice !' : 'Relancer'}
          </button>
          <button
            onClick={bank}
            disabled={!canBank}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
              background: canBank ? '#22c55e' : SURFACE2,
              color: canBank ? '#fff' : MUTED,
              fontWeight: 800, fontSize: 14,
              cursor: canBank ? 'pointer' : 'default',
              opacity: canBank ? 1 : 0.4,
            }}
          >
            🏦 Banquer
          </button>
        </div>
      )}

      {isOver && (
        <button
          onClick={reset}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
            background: ACCENT, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <RotateCcw size={15} /> Nouvelle partie
        </button>
      )}

      {/* Scoring reference */}
      <div style={{
        borderRadius: 10, padding: '8px 12px', background: SURFACE,
        border: `1px solid ${BORDER}`, fontSize: 10, color: MUTED,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px',
      }}>
        <span>⚀ = 100 pts</span>
        <span>⚄ = 50 pts</span>
        <span>3×1 = 1000 pts</span>
        <span>3×v = v×100 pts</span>
        <span>4+ identiques = ×2/4/8</span>
        <span>Suite / 3 paires = 1500</span>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', background: SURFACE2, fontSize: 10, color: MUTED, fontWeight: 700 }}>
            Historique des tours
          </div>
          <div style={{ maxHeight: 80, overflowY: 'auto' }}>
            {[...history].reverse().map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '4px 10px', fontSize: 10,
                  background: i % 2 === 0 ? SURFACE : 'transparent',
                  color: MUTED,
                }}
              >
                <span style={{ color: h.player === 'Vous' ? ACCENT : ACCENT2 }}>{h.player}</span>
                <span>+{h.pts}</span>
                <span style={{ color: TEXT }}>{h.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
