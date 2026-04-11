import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, RotateCcw, Users } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Constants ────────────────────────────────────────────────────────────────
const GOAL = 100

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: number
  name: string
  type: 'human' | 'cpu'
  total: number
  color: string
  bankThreshold: number  // CPU banks at this turn score
}

type GamePhase = 'setup' | 'playing' | 'over'

// ─── SVG Die ──────────────────────────────────────────────────────────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
}

interface DieProps {
  value: number | null
  rolling: boolean
  isPig: boolean
  size?: number
}

function Die({ value, rolling, isPig, size = 88 }: DieProps) {
  const pips = value ? (PIP_POSITIONS[value] || []) : []

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: 20,
        border: `3px solid ${isPig ? '#ef4444' : value ? ACCENT : BORDER}`,
        background: isPig
          ? 'rgba(239,68,68,0.12)'
          : value
          ? `rgba(168,85,247,0.1)`
          : SURFACE2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isPig
          ? '0 0 20px rgba(239,68,68,0.35)'
          : value
          ? `0 0 16px rgba(168,85,247,0.25)`
          : 'none',
        animation: rolling ? `dieRoll 0.3s ease infinite alternate` : isPig ? `pigShake 0.4s ease` : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        flexShrink: 0,
      }}
    >
      {value && (
        <svg viewBox="0 0 100 100" width={size - 18} height={size - 18}>
          {pips.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={11}
              fill={isPig ? '#ef4444' : ACCENT}
            />
          ))}
        </svg>
      )}
      {!value && (
        <span style={{ fontSize: 28, opacity: 0.3 }}>?</span>
      )}
      <style>{`
        @keyframes dieRoll {
          0%   { transform: rotate(-12deg) scale(0.93); }
          100% { transform: rotate(12deg)  scale(1.07); }
        }
        @keyframes pigShake {
          0%   { transform: rotate(-8deg); }
          25%  { transform: rotate(8deg); }
          50%  { transform: rotate(-5deg); }
          75%  { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Player score card ────────────────────────────────────────────────────────
interface ScoreCardProps {
  player: Player
  isActive: boolean
  turnScore: number
  goal: number
}

function ScoreCard({ player, isActive, turnScore, goal }: ScoreCardProps) {
  const progress = Math.min(player.total / goal * 100, 100)
  const turnPct = Math.min((player.total + turnScore) / goal * 100, 100)

  return (
    <div
      style={{
        borderRadius: 12,
        padding: '10px 12px',
        background: isActive ? `rgba(168,85,247,0.1)` : SURFACE,
        border: `2px solid ${isActive ? player.color : BORDER}`,
        transition: 'all 0.2s',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? player.color : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name} {isActive ? '▶' : ''}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: TEXT, flexShrink: 0 }}>{player.total}</span>
      </div>

      {/* Stacked progress bar: banked + turn */}
      <div style={{ height: 6, borderRadius: 9999, background: SURFACE2, overflow: 'hidden', position: 'relative' }}>
        {/* Turn score (lighter) */}
        {isActive && turnScore > 0 && (
          <div style={{
            position: 'absolute', left: `${progress}%`,
            width: `${Math.max(0, turnPct - progress)}%`,
            height: '100%',
            background: `${player.color}60`,
            borderRadius: 9999,
          }} />
        )}
        {/* Banked score */}
        <div style={{
          height: '100%', borderRadius: 9999,
          background: player.color,
          width: `${progress}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      <div style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>
        {player.total}/{goal}
        {isActive && turnScore > 0 && <span style={{ color: '#f59e0b' }}> (+{turnScore})</span>}
      </div>
    </div>
  )
}

// ─── Flash overlay ────────────────────────────────────────────────────────────
function Flash({ color, active }: { color: string; active: boolean }) {
  if (!active) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: color,
        animation: 'flashFade 0.5s ease forwards',
        zIndex: 50,
      }}
    >
      <style>{`@keyframes flashFade { 0% { opacity: 0.35; } 100% { opacity: 0; } }`}</style>
    </div>
  )
}

// ─── Default player setup ─────────────────────────────────────────────────────
const COLORS = [ACCENT, ACCENT2, '#22c55e', '#f59e0b']
const CPU_NAMES = ['CPU-1', 'CPU-2', 'CPU-3']
const CPU_THRESHOLDS = [20, 25, 18]  // each CPU has slightly different strategy

function makePlayers(numCPU: number): Player[] {
  const ps: Player[] = [
    { id: 0, name: 'Vous', type: 'human', total: 0, color: COLORS[0], bankThreshold: 20 },
  ]
  for (let i = 0; i < numCPU; i++) {
    ps.push({
      id: i + 1, name: CPU_NAMES[i], type: 'cpu',
      total: 0, color: COLORS[i + 1],
      bankThreshold: CPU_THRESHOLDS[i],
    })
  }
  return ps
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PigGame({ onBack }: { onBack?: () => void }) {
  const [numCPU, setNumCPU] = useState(1)
  const [players, setPlayers] = useState<Player[]>(() => makePlayers(1))
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [turnScore, setTurnScore] = useState(0)
  const [lastRoll, setLastRoll] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [isPig, setIsPig] = useState(false)
  const [flashColor, setFlashColor] = useState('')
  const [flashActive, setFlashActive] = useState(false)
  const [msg, setMsg] = useState('')
  const [winner, setWinner] = useState<Player | null>(null)
  const [rollHistory, setRollHistory] = useState<{ player: string; roll: number; action: string }[]>([])
  const cpuRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentPlayer = players[currentIdx]
  const isHumanTurn = phase === 'playing' && currentPlayer?.type === 'human'

  const triggerFlash = (color: string) => {
    setFlashColor(color)
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 500)
  }

  const addHistory = (player: string, roll: number, action: string) => {
    setRollHistory(h => [{ player, roll, action }, ...h].slice(0, 30))
  }

  const advanceTurn = useCallback((currentPlayers: Player[], fromIdx: number) => {
    const nextIdx = (fromIdx + 1) % currentPlayers.length
    setCurrentIdx(nextIdx)
    setTurnScore(0)
    setLastRoll(null)
    setIsPig(false)
    const next = currentPlayers[nextIdx]
    if (next.type === 'cpu') {
      setMsg(`Tour de ${next.name}...`)
      startCpuTurn(currentPlayers, nextIdx, 0)
    } else {
      setMsg(`Votre tour ! Lancez ou banquez.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCpuTurn = (currentPlayers: Player[], playerIdx: number, accumulated: number) => {
    const cpu = currentPlayers[playerIdx]
    if (!cpu) return

    const doRoll = (acc: number) => {
      setRolling(true)
      cpuRef.current = setTimeout(() => {
        setRolling(false)
        const roll = Math.ceil(Math.random() * 6)
        setLastRoll(roll)

        if (roll === 1) {
          setIsPig(true)
          triggerFlash('rgba(239,68,68,0.25)')
          setMsg(`${cpu.name} tire 1 — Cochon ! Perd ${acc} pts.`)
          addHistory(cpu.name, roll, 'Cochon !')
          cpuRef.current = setTimeout(() => {
            setIsPig(false)
            advanceTurn(currentPlayers, playerIdx)
          }, 1200)
        } else {
          const newAcc = acc + roll
          setTurnScore(newAcc)
          setMsg(`${cpu.name} tire ${roll} → total ce tour : ${newAcc}`)
          addHistory(cpu.name, roll, `+${roll}`)

          // Check win
          if (cpu.total + newAcc >= GOAL) {
            setPlayers(prev => prev.map(p => p.id === cpu.id ? { ...p, total: p.total + newAcc } : p))
            setWinner(cpu)
            setPhase('over')
            setMsg(`${cpu.name} gagne avec ${cpu.total + newAcc} points !`)
            triggerFlash('rgba(239,68,68,0.2)')
            return
          }

          // CPU decision: bank or roll again
          const shouldBank = newAcc >= cpu.bankThreshold || (cpu.total + newAcc >= GOAL - 10)
          if (shouldBank) {
            setPlayers(prev => prev.map(p => p.id === cpu.id ? { ...p, total: p.total + newAcc } : p))
            const newTotal = cpu.total + newAcc
            setMsg(`${cpu.name} banque ${newAcc} pts → total ${newTotal}`)
            addHistory(cpu.name, roll, `Banque ${newAcc}`)
            cpuRef.current = setTimeout(() => {
              advanceTurn(
                currentPlayers.map(p => p.id === cpu.id ? { ...p, total: newTotal } : p),
                playerIdx
              )
            }, 1000)
          } else {
            cpuRef.current = setTimeout(() => doRoll(newAcc), 750)
          }
        }
      }, 500)
    }

    cpuRef.current = setTimeout(() => doRoll(accumulated), 700)
  }

  useEffect(() => {
    return () => { if (cpuRef.current) clearTimeout(cpuRef.current) }
  }, [])

  const startGame = (n: number) => {
    if (cpuRef.current) clearTimeout(cpuRef.current)
    const ps = makePlayers(n)
    setNumCPU(n)
    setPlayers(ps)
    setCurrentIdx(0)
    setTurnScore(0)
    setLastRoll(null)
    setRolling(false)
    setIsPig(false)
    setWinner(null)
    setRollHistory([])
    setMsg('Votre tour ! Lancez ou banquez.')
    setPhase('playing')
  }

  const humanRoll = () => {
    if (!isHumanTurn || rolling) return
    setRolling(true)
    setIsPig(false)
    setTimeout(() => {
      setRolling(false)
      const roll = Math.ceil(Math.random() * 6)
      setLastRoll(roll)

      if (roll === 1) {
        setIsPig(true)
        triggerFlash('rgba(239,68,68,0.3)')
        setMsg('Cochon ! Vous perdez le score de ce tour.')
        addHistory('Vous', roll, 'Cochon !')
        setTimeout(() => {
          setIsPig(false)
          setTurnScore(0)
          advanceTurn(players, currentIdx)
        }, 1400)
      } else {
        const ns = turnScore + roll
        setTurnScore(ns)
        triggerFlash('rgba(168,85,247,0.15)')
        setMsg(`Vous tirez ${roll} — score ce tour : ${ns}`)
        addHistory('Vous', roll, `+${roll}`)
        if (currentPlayer.total + ns >= GOAL) {
          setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, total: p.total + ns } : p))
          setWinner(currentPlayer)
          setPhase('over')
          setMsg(`Vous gagnez avec ${currentPlayer.total + ns} points !`)
          triggerFlash('rgba(34,197,94,0.3)')
        }
      }
    }, 450)
  }

  const humanBank = () => {
    if (!isHumanTurn || turnScore === 0 || rolling) return
    const newTotal = currentPlayer.total + turnScore
    setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, total: newTotal } : p))
    addHistory('Vous', 0, `Banque ${turnScore}`)
    setMsg(`Vous banquez ${turnScore} pts → total ${newTotal}`)

    if (newTotal >= GOAL) {
      setWinner(currentPlayer)
      setPhase('over')
      setMsg(`Vous gagnez avec ${newTotal} points !`)
      triggerFlash('rgba(34,197,94,0.3)')
      return
    }

    advanceTurn(
      players.map(p => p.id === currentPlayer.id ? { ...p, total: newTotal } : p),
      currentIdx
    )
  }

  const resetGame = () => {
    if (cpuRef.current) clearTimeout(cpuRef.current)
    setPhase('setup')
    setWinner(null)
    setMsg('')
    setRollHistory([])
    setLastRoll(null)
    setIsPig(false)
    setRolling(false)
  }

  const gridCols = players.length <= 2 ? '1fr 1fr' : players.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr'

  return (
    <div style={{ color: TEXT, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Flash color={flashColor} active={flashActive} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onBack}
            style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 900, fontSize: 16 }}>🐷 Pig Dice</span>
        </div>
        <span style={{ fontSize: 11, color: MUTED }}>Premier à {GOAL} pts</span>
      </div>

      {/* Setup screen */}
      {phase === 'setup' && (
        <div style={{ borderRadius: 14, padding: 16, background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> Adversaires
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setNumCPU(n)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: `2px solid ${numCPU === n ? ACCENT : BORDER}`,
                  background: numCPU === n ? `rgba(168,85,247,0.15)` : SURFACE2,
                  color: numCPU === n ? ACCENT : MUTED,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                {n} CPU
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
            Lancez le dé pour accumuler des points. Banquez à tout moment.
            Tirez 1 (Cochon) et vous perdez le score de votre tour !
            Premier à {GOAL} pts gagne.
          </div>
          <button
            onClick={() => startGame(numCPU)}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12,
              border: 'none', background: ACCENT, color: '#fff',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}
          >
            Jouer
          </button>
        </div>
      )}

      {/* Score cards */}
      {phase !== 'setup' && (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8 }}>
          {players.map((p, i) => (
            <ScoreCard
              key={p.id}
              player={p}
              isActive={currentIdx === i && phase === 'playing'}
              turnScore={currentIdx === i && phase === 'playing' ? turnScore : 0}
              goal={GOAL}
            />
          ))}
        </div>
      )}

      {/* Winner banner */}
      {phase === 'over' && winner && (
        <div style={{
          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
          background: winner.type === 'human' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${winner.type === 'human' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}`,
          color: winner.type === 'human' ? '#22c55e' : '#ef4444',
          fontWeight: 800, fontSize: 16,
        }}>
          {winner.type === 'human' ? '🎉 Félicitations !' : `${winner.name} gagne !`}
          <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, color: MUTED }}>
            {winner.total} points
          </div>
        </div>
      )}

      {/* Die display */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Die value={lastRoll} rolling={rolling} isPig={isPig} size={92} />

          {isPig && (
            <div style={{ fontSize: 22, animation: 'bounce 0.3s ease infinite alternate' }}>
              🐷
              <style>{`@keyframes bounce { 0% { transform: scale(1); } 100% { transform: scale(1.25); } }`}</style>
            </div>
          )}

          {turnScore > 0 && !isPig && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 20,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#f59e0b', fontWeight: 800, fontSize: 16,
            }}>
              +{turnScore} ce tour
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {msg && phase !== 'setup' && (
        <div style={{
          padding: '8px 12px', borderRadius: 10,
          background: SURFACE2, border: `1px solid ${BORDER}`,
          color: TEXT, fontSize: 12, textAlign: 'center', fontWeight: 500,
        }}>
          {msg}
        </div>
      )}

      {/* Action buttons */}
      {isHumanTurn && !rolling && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={humanRoll}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
              background: ACCENT, color: '#fff',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
              boxShadow: `0 4px 16px rgba(168,85,247,0.3)`,
            }}
          >
            🎲 Lancer
          </button>
          <button
            onClick={humanBank}
            disabled={turnScore === 0}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
              background: turnScore > 0 ? '#22c55e' : SURFACE2,
              color: turnScore > 0 ? '#fff' : MUTED,
              fontWeight: 800, fontSize: 15,
              cursor: turnScore > 0 ? 'pointer' : 'default',
              opacity: turnScore > 0 ? 1 : 0.45,
              boxShadow: turnScore > 0 ? `0 4px 16px rgba(34,197,94,0.25)` : 'none',
            }}
          >
            🏦 Banquer
          </button>
        </div>
      )}

      {/* Rolling indicator for CPU */}
      {phase === 'playing' && currentPlayer?.type === 'cpu' && (
        <div style={{
          textAlign: 'center', fontSize: 12, color: MUTED,
          padding: '6px 0',
          animation: 'pulse 0.7s ease infinite alternate',
        }}>
          {currentPlayer.name} joue...
          <style>{`@keyframes pulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
        </div>
      )}

      {/* Game over buttons */}
      {phase === 'over' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => startGame(numCPU)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
              background: ACCENT, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <RotateCcw size={14} /> Rejouer
          </button>
          <button
            onClick={resetGame}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              border: `1px solid ${BORDER}`, background: SURFACE2,
              color: MUTED, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Paramètres
          </button>
        </div>
      )}

      {/* Roll history */}
      {rollHistory.length > 0 && (
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', background: SURFACE2, fontSize: 10, color: MUTED, fontWeight: 700 }}>
            Historique des lancers
          </div>
          <div style={{ maxHeight: 88, overflowY: 'auto' }}>
            {rollHistory.map((h, i) => {
              const player = players.find(p => p.name === h.player)
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '3px 10px', fontSize: 10,
                    background: i % 2 === 0 ? SURFACE : 'transparent',
                  }}
                >
                  <span style={{ color: player?.color || MUTED }}>{h.player}</span>
                  <span style={{ color: h.roll === 1 ? '#ef4444' : TEXT }}>
                    {h.roll === 1 ? '🐷' : h.roll > 0 ? `⚄ ${h.roll}` : ''}
                  </span>
                  <span style={{ color: h.action.includes('Cochon') ? '#ef4444' : h.action.includes('Banque') ? '#22c55e' : MUTED }}>
                    {h.action}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rules reminder */}
      {phase === 'playing' && (
        <div style={{
          borderRadius: 10, padding: '7px 12px', background: SURFACE,
          border: `1px solid ${BORDER}`, fontSize: 10, color: MUTED,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>🐷 Cochon = perdre le tour</span>
          <span>Banquez pour sécuriser</span>
          <span>But : {GOAL} pts</span>
        </div>
      )}
    </div>
  )
}
