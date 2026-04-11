import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, RotateCcw, Users } from 'lucide-react'
import { ACCENT, ACCENT2, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerType = 'human' | 'cpu'
type RoundPhase = 'setup' | 'rolling' | 'cpu_playing' | 'result'

interface Player {
  id: number
  name: string
  type: PlayerType
  tokens: number
  color: string
}

interface RoundResult {
  playerId: number
  dice: number[]
  combo: Combo
}

interface Combo {
  label: string
  rank: number   // higher = better
  tokens: number // tokens given to loser
}

// ─── Scoring / Combo detection ────────────────────────────────────────────────
function detectCombo(rawDice: number[]): Combo {
  const d = [...rawDice].sort((a, b) => b - a)
  const [a, b, c] = d

  // 4-2-1 (best)
  if (a === 4 && b === 2 && c === 1) return { label: '4-2-1', rank: 1000, tokens: 8 }

  // 1-1-1
  if (a === 1 && b === 1 && c === 1) return { label: '1-1-1', rank: 900, tokens: 7 }

  // Other triples: sorted desc so a===b===c
  if (a === b && b === c) {
    return { label: `${a}-${a}-${a}`, rank: 800 + a, tokens: 6 }
  }

  // 4-4-1
  if (a === 4 && b === 4 && c === 1) return { label: '4-4-1', rank: 700, tokens: 6 }

  // Full house (pair + different third): sorted desc, check a===b or b===c
  if (a === b && b !== c) return { label: `Paire de ${a} + ${c}`, rank: 500 + a * 10 + c, tokens: 5 }
  if (b === c && a !== b) return { label: `Paire de ${b} + ${a}`, rank: 500 + b * 10 + a, tokens: 5 }

  // 4-2-x (has a 4 and a 2 but not a 1)
  if (d.includes(4) && d.includes(2)) return { label: `4-2-${c}`, rank: 300 + c, tokens: 3 }

  // Sequence check
  const sorted = [...rawDice].sort((a, b) => a - b)
  const isSeq = sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1
  if (isSeq) return { label: `${sorted[0]}-${sorted[1]}-${sorted[2]}`, rank: 200 + sorted[2], tokens: 2 }

  // High card
  return { label: d.join('-'), rank: a * 100 + b * 10 + c, tokens: 1 }
}

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
  value: number
  kept: boolean
  rolling: boolean
  onClick?: () => void
  disabled?: boolean
  size?: number
  color?: string
}

function Die({ value, kept, rolling, onClick, disabled, size = 60, color = ACCENT }: DieProps) {
  const pips = PIP_POSITIONS[value] || []
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size, height: size,
        padding: 0, flexShrink: 0,
        border: `2.5px solid ${kept ? color : BORDER}`,
        borderRadius: 14,
        background: kept ? `rgba(168,85,247,0.18)` : SURFACE2,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        boxShadow: kept ? `0 0 14px rgba(168,85,247,0.35)` : '0 2px 6px rgba(0,0,0,0.3)',
        animation: rolling ? `dieRoll 0.35s ease infinite alternate` : 'none',
        transform: kept ? 'translateY(-3px)' : 'none',
      }}
    >
      <svg viewBox="0 0 100 100" width={size - 10} height={size - 10}>
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={10} fill={kept ? color : TEXT} />
        ))}
      </svg>
      <style>{`@keyframes dieRoll { 0% { transform: rotate(-10deg) scale(0.92); } 100% { transform: rotate(10deg) scale(1.08); } }`}</style>
    </button>
  )
}

// ─── Token display ────────────────────────────────────────────────────────────
function TokenPile({ count, color }: { count: number; color: string }) {
  const show = Math.min(count, 10)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', minHeight: 14 }}>
      {Array.from({ length: show }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color, boxShadow: `0 0 4px ${color}80`,
          }}
        />
      ))}
      {count > 10 && <span style={{ fontSize: 9, color: MUTED }}>+{count - 10}</span>}
    </div>
  )
}

// ─── Default players ──────────────────────────────────────────────────────────
const PLAYER_COLORS = [ACCENT, ACCENT2, '#22c55e', '#f59e0b']
const CPU_NAMES = ['CPU Alpha', 'CPU Beta', 'CPU Gamma']

function makePlayers(numCPU: number): Player[] {
  const players: Player[] = [
    { id: 0, name: 'Vous', type: 'human', tokens: 6, color: PLAYER_COLORS[0] },
  ]
  for (let i = 0; i < numCPU; i++) {
    players.push({ id: i + 1, name: CPU_NAMES[i], type: 'cpu', tokens: 6, color: PLAYER_COLORS[i + 1] })
  }
  return players
}

// ─── CPU strategy: keep dice that are part of 4-2-1 or high combos ────────────
function cpuKeepDecision(dice: number[], rollsLeft: number, currentCombo: Combo): boolean[] {
  const d = [...dice]
  const has421 = d.includes(4) && d.includes(2) && d.includes(1)
  const has111 = d.filter(v => v === 1).length === 3

  if (has421 || has111 || currentCombo.rank >= 800) return d.map(() => true)

  // Keep 4s and 2s and 1s for 4-2-1 attempts
  if (rollsLeft > 0) {
    return d.map(v => v === 4 || v === 2 || v === 1)
  }

  // Keep all (no more rolls)
  return d.map(() => true)
}

// ─── Round History ─────────────────────────────────────────────────────────────
interface RoundSummary {
  round: number
  results: RoundResult[]
  loser: number
  tokensTaken: number
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Game421({ onBack }: { onBack?: () => void }) {
  const [numCPU, setNumCPU] = useState(1)
  const [players, setPlayers] = useState<Player[]>(() => makePlayers(1))
  const [phase, setPhase] = useState<RoundPhase>('setup')
  const [currentPlayer, setCurrentPlayer] = useState(0)  // index in players
  const [dice, setDice] = useState([1, 2, 3])
  const [kept, setKept] = useState([false, false, false])
  const [rolling, setRolling] = useState([false, false, false])
  const [rollsLeft, setRollsLeft] = useState(3)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [roundHistory, setRoundHistory] = useState<RoundSummary[]>([])
  const [roundNum, setRoundNum] = useState(1)
  const [msg, setMsg] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)
  const cpuRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isHumanTurn = currentPlayer === 0 && phase === 'rolling'

  // Setup change
  const applySetup = (n: number) => {
    setNumCPU(n)
    setPlayers(makePlayers(n))
    setPhase('setup')
    setRoundResults([])
    setRoundHistory([])
    setRoundNum(1)
    setGameOver(false)
    setWinner(null)
    setMsg('')
  }

  const startRound = () => {
    setDice([1, 2, 3])
    setKept([false, false, false])
    setRolling([false, false, false])
    setRollsLeft(3)
    setRoundResults([])
    setCurrentPlayer(0)
    setPhase('rolling')
    setMsg('Votre tour — lancez les dés !')
  }

  const rollDiceForHuman = () => {
    if (rollsLeft <= 0 || !isHumanTurn) return
    const newRolling = kept.map(k => !k)
    setRolling(newRolling)
    setTimeout(() => {
      setRolling([false, false, false])
      const newDice = dice.map((v, i) => kept[i] ? v : Math.ceil(Math.random() * 6))
      setDice(newDice)
      setRollsLeft(r => r - 1)
      const combo = detectCombo(newDice)
      setMsg(`${combo.label} — ${rollsLeft - 1 > 0 ? `${rollsLeft - 1} lancer(s) restant(s)` : 'Dernier lancer !'}`)
    }, 380)
  }

  const keepResult = useCallback(() => {
    const combo = detectCombo(dice)
    const result: RoundResult = { playerId: 0, dice: [...dice], combo }
    const newResults = [...roundResults, result]
    setRoundResults(newResults)
    setMsg(`Résultat enregistré : ${combo.label}`)

    // Now run CPU turns
    if (players.length > 1) {
      setPhase('cpu_playing')
      runCpuTurns(newResults, 1)
    } else {
      finishRound(newResults)
    }
  }, [dice, roundResults, players])

  const runCpuTurns = (results: RoundResult[], cpuIdx: number) => {
    if (cpuIdx >= players.length) {
      finishRound(results)
      return
    }
    const cpu = players[cpuIdx]
    setCurrentPlayer(cpuIdx)
    setMsg(`${cpu.name} joue...`)

    let cpuDice = [1, 2, 3]
    let cpuKept = [false, false, false]
    let rollsRemaining = 3

    const doRoll = () => {
      if (rollsRemaining <= 0) {
        const combo = detectCombo(cpuDice)
        setDice(cpuDice)
        setKept([true, true, true])
        setMsg(`${cpu.name} : ${combo.label}`)
        const result: RoundResult = { playerId: cpuIdx, dice: [...cpuDice], combo }
        const newResults = [...results, result]
        cpuRef.current = setTimeout(() => runCpuTurns(newResults, cpuIdx + 1), 900)
        return
      }

      const rolling2 = cpuKept.map(k => !k)
      setRolling(rolling2)
      cpuRef.current = setTimeout(() => {
        setRolling([false, false, false])
        cpuDice = cpuDice.map((v, i) => cpuKept[i] ? v : Math.ceil(Math.random() * 6))
        const combo = detectCombo(cpuDice)
        cpuKept = cpuKeepDecision(cpuDice, rollsRemaining - 1, combo)
        setDice([...cpuDice])
        setKept([...cpuKept])
        rollsRemaining--

        if (combo.rank >= 900 || rollsRemaining === 0) {
          // Done
          const result: RoundResult = { playerId: cpuIdx, dice: [...cpuDice], combo }
          const newResults = [...results, result]
          setMsg(`${cpu.name} : ${combo.label}`)
          cpuRef.current = setTimeout(() => runCpuTurns(newResults, cpuIdx + 1), 800)
        } else {
          cpuRef.current = setTimeout(doRoll, 500)
        }
      }, 380)
    }

    cpuRef.current = setTimeout(doRoll, 600)
  }

  const finishRound = (results: RoundResult[]) => {
    if (results.length === 0) return

    // Find loser: player with lowest combo rank; ties resolved by order
    const loser = results.reduce((worst, r) =>
      r.combo.rank < worst.combo.rank ? r : worst
    )
    // Find winner (best)
    const winnerResult = results.reduce((best, r) =>
      r.combo.rank > best.combo.rank ? r : best
    )
    const tokensTaken = loser.combo.tokens

    setPlayers(prev => {
      const next = prev.map(p => {
        if (p.id === loser.playerId) return { ...p, tokens: p.tokens + tokensTaken }
        return p
      })
      // Check if any player is eliminated (>= 15 tokens or some limit)
      const eliminated = next.filter(p => p.tokens >= 15)
      if (eliminated.length > 0) {
        // Last standing wins
        const remaining = next.filter(p => p.tokens < 15)
        if (remaining.length === 1) {
          setGameOver(true)
          setWinner(remaining[0])
        } else if (remaining.length === 0) {
          setGameOver(true)
          setWinner(next.reduce((b, p) => p.tokens < b.tokens ? p : b))
        }
      }
      return next
    })

    const loserPlayer = players[loser.playerId] || players[0]
    const winnerPlayer = players[winnerResult.playerId] || players[0]
    const summary: RoundSummary = { round: roundNum, results, loser: loser.playerId, tokensTaken }
    setRoundHistory(h => [...h, summary])
    setMsg(`Manche ${roundNum} : ${winnerPlayer.name} gagne (${winnerResult.combo.label}) · ${loserPlayer.name} prend ${tokensTaken} jeton(s)`)
    setRoundNum(n => n + 1)
    setPhase('result')
  }

  const nextRound = () => {
    if (gameOver) return
    startRound()
  }

  const resetGame = () => {
    if (cpuRef.current) clearTimeout(cpuRef.current)
    const newPlayers = makePlayers(numCPU)
    setPlayers(newPlayers)
    setPhase('setup')
    setRoundResults([])
    setRoundHistory([])
    setRoundNum(1)
    setGameOver(false)
    setWinner(null)
    setMsg('')
    setDice([1, 2, 3])
    setKept([false, false, false])
  }

  const currentCombo = phase === 'rolling' && rollsLeft < 3 ? detectCombo(dice) : null

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
          <span style={{ fontWeight: 900, fontSize: 16 }}>🎯 Jeu du 421</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED }}>
          <span>Manche {roundNum}</span>
          {phase === 'rolling' && isHumanTurn && (
            <span style={{ color: ACCENT }}>{rollsLeft} lancer(s)</span>
          )}
        </div>
      </div>

      {/* Setup: number of CPUs */}
      {phase === 'setup' && (
        <div style={{ borderRadius: 14, padding: 16, background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> Nombre d'adversaires
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => applySetup(n)}
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
          <button
            onClick={startRound}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 12,
              border: 'none', background: ACCENT, color: '#fff',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}
          >
            Commencer la partie
          </button>
        </div>
      )}

      {/* Player scoreboard */}
      {phase !== 'setup' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: 6 }}>
          {players.map((p, idx) => {
            const isActive = currentPlayer === idx && (phase === 'rolling' || phase === 'cpu_playing')
            const lastResult = roundResults.find(r => r.playerId === p.id)
            return (
              <div
                key={p.id}
                style={{
                  borderRadius: 12, padding: '8px 6px',
                  background: isActive ? `rgba(${p.color === ACCENT ? '168,85,247' : p.color === ACCENT2 ? '6,182,212' : '34,197,94'},0.12)` : SURFACE,
                  border: `2px solid ${isActive ? p.color : BORDER}`,
                  textAlign: 'center', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 10, color: p.color, fontWeight: 700, marginBottom: 4 }}>
                  {p.name} {isActive ? '▶' : ''}
                </div>
                <TokenPile count={p.tokens} color={p.color} />
                <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>{p.tokens} jetons</div>
                {lastResult && (
                  <div style={{ fontSize: 9, color: TEXT, marginTop: 3, fontWeight: 600 }}>
                    {lastResult.combo.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Game over */}
      {gameOver && winner && (
        <div style={{
          borderRadius: 14, padding: '14px 16px', textAlign: 'center',
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
          color: '#22c55e', fontWeight: 800, fontSize: 16,
        }}>
          {winner.type === 'human' ? '🎉 Vous gagnez !' : `${winner.name} gagne !`}
        </div>
      )}

      {/* Message */}
      {msg && (
        <div style={{
          padding: '8px 12px', borderRadius: 10, background: SURFACE2,
          border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12,
          textAlign: 'center', fontWeight: 500,
        }}>
          {msg}
        </div>
      )}

      {/* Combo preview */}
      {currentCombo && isHumanTurn && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderRadius: 10,
          background: `rgba(168,85,247,0.1)`, border: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 11, color: MUTED }}>Combinaison actuelle</span>
          <span style={{ fontWeight: 800, color: ACCENT, fontSize: 14 }}>{currentCombo.label}</span>
          <span style={{ fontSize: 10, color: MUTED }}>{currentCombo.tokens} jeton(s)</span>
        </div>
      )}

      {/* Dice */}
      {phase !== 'setup' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {dice.map((v, i) => (
              <Die
                key={i}
                value={v}
                kept={kept[i]}
                rolling={rolling[i]}
                color={players[currentPlayer]?.color || ACCENT}
                onClick={isHumanTurn && rollsLeft < 3 ? () => {
                  setKept(k => { const n = [...k]; n[i] = !n[i]; return n })
                } : undefined}
                disabled={!isHumanTurn || rollsLeft >= 3}
              />
            ))}
          </div>
          {isHumanTurn && rollsLeft < 3 && (
            <p style={{ textAlign: 'center', fontSize: 10, color: MUTED, margin: 0 }}>
              Cliquez sur un dé pour le garder / libérer (violet = gardé)
            </p>
          )}
        </>
      )}

      {/* Human actions */}
      {isHumanTurn && !gameOver && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={rollDiceForHuman}
            disabled={rollsLeft <= 0}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
              background: rollsLeft > 0 ? ACCENT : SURFACE2,
              color: rollsLeft > 0 ? '#fff' : MUTED,
              fontWeight: 800, fontSize: 14,
              cursor: rollsLeft > 0 ? 'pointer' : 'default',
              opacity: rollsLeft <= 0 ? 0.4 : 1,
            }}
          >
            🎲 {rollsLeft === 3 ? 'Lancer' : 'Relancer'}
          </button>
          {rollsLeft < 3 && (
            <button
              onClick={keepResult}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
                background: '#22c55e', color: '#fff',
                fontWeight: 800, fontSize: 14, cursor: 'pointer',
              }}
            >
              ✓ Valider
            </button>
          )}
        </div>
      )}

      {/* Result phase */}
      {phase === 'result' && !gameOver && (
        <button
          onClick={nextRound}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
            background: ACCENT, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}
        >
          Manche suivante →
        </button>
      )}

      {gameOver && (
        <button
          onClick={resetGame}
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
        border: `1px solid ${BORDER}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px',
        fontSize: 10, color: MUTED,
      }}>
        <span style={{ color: ACCENT, fontWeight: 700 }}>4-2-1 = 8 jetons</span>
        <span>1-1-1 = 7 jetons</span>
        <span>Brelan = 6 jetons</span>
        <span>4-4-1 = 6 jetons</span>
        <span>Paire = 5 jetons</span>
        <span>4-2-x = 3 jetons</span>
        <span>Séquence = 2 jetons</span>
        <span>Autre = 1 jeton</span>
      </div>

      {/* Round history */}
      {roundHistory.length > 0 && (
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px', background: SURFACE2, fontSize: 10, color: MUTED, fontWeight: 700 }}>
            Historique des manches
          </div>
          <div style={{ maxHeight: 90, overflowY: 'auto' }}>
            {[...roundHistory].reverse().map((h, i) => {
              const loserPlayer = players.find(p => p.id === h.loser)
              const best = h.results.reduce((b, r) => r.combo.rank > b.combo.rank ? r : b)
              const bestPlayer = players.find(p => p.id === best.playerId)
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '4px 10px', fontSize: 10,
                  background: i % 2 === 0 ? SURFACE : 'transparent', color: MUTED,
                }}>
                  <span>M{h.round}</span>
                  <span style={{ color: bestPlayer?.color }}>{bestPlayer?.name} gagne ({best.combo.label})</span>
                  <span style={{ color: '#ef4444' }}>{loserPlayer?.name} +{h.tokensTaken}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
