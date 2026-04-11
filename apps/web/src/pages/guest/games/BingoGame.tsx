import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}
function shuffle<T>(a: T[]) {
  return [...a].sort(() => Math.random() - 0.5)
}

function makeCard(): number[][] {
  const cols = [
    shuffle(range(1, 15)).slice(0, 5),
    shuffle(range(16, 30)).slice(0, 5),
    shuffle(range(31, 45)).slice(0, 5),
    shuffle(range(46, 60)).slice(0, 5),
    shuffle(range(61, 75)).slice(0, 5),
  ]
  return Array.from({ length: 5 }, (_, r) => cols.map(c => c[r]))
}

const FREE_KEY = '2,2'
const FREE_SET = new Set([FREE_KEY])

function isMarked(r: number, c: number, card: number[][], called: Set<number>): boolean {
  return FREE_SET.has(`${r},${c}`) || called.has(card[r][c])
}

type WinType = 'row' | 'col' | 'diag' | 'corners' | 'full' | null

function checkWin(card: number[][], called: Set<number>): WinType {
  const m = (r: number, c: number) => isMarked(r, c, card, called)
  // Rows
  for (let r = 0; r < 5; r++) if ([0,1,2,3,4].every(c => m(r, c))) return 'row'
  // Cols
  for (let c = 0; c < 5; c++) if ([0,1,2,3,4].every(r => m(r, c))) return 'col'
  // Diagonals
  if ([0,1,2,3,4].every(i => m(i, i))) return 'diag'
  if ([0,1,2,3,4].every(i => m(i, 4 - i))) return 'diag'
  // 4 corners
  if (m(0,0) && m(0,4) && m(4,0) && m(4,4)) return 'corners'
  // Full card
  let full = true
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (!m(r, c)) { full = false; break }
  if (full) return 'full'
  return null
}

const WIN_LABELS: Record<NonNullable<WinType>, string> = {
  row: 'Ligne complète',
  col: 'Colonne complète',
  diag: 'Diagonale',
  corners: '4 Coins',
  full: 'Carte complète',
}

// ─── Column colors ─────────────────────────────────────────────────────────────
const COL_COLORS = ['#3b82f6', '#ef4444', '#f8fafc', '#22c55e', '#eab308']
const COL_BG = ['rgba(59,130,246,0.85)', 'rgba(239,68,68,0.85)', 'rgba(100,100,130,0.85)', 'rgba(34,197,94,0.85)', 'rgba(234,179,8,0.85)']
const COLS = ['B', 'I', 'N', 'G', 'O']

function colFor(n: number): number {
  if (n <= 15) return 0
  if (n <= 30) return 1
  if (n <= 45) return 2
  if (n <= 60) return 3
  return 4
}

// ─── Stats ────────────────────────────────────────────────────────────────────
interface BingoStats { games: number; bingos: number; fastest: number }

function loadStats(): BingoStats {
  try {
    const s = localStorage.getItem('bingo_stats')
    return s ? JSON.parse(s) : { games: 0, bingos: 0, fastest: 999 }
  } catch { return { games: 0, bingos: 0, fastest: 999 } }
}

function saveStats(won: boolean, ballCount: number) {
  const s = loadStats()
  const next: BingoStats = {
    games: s.games + 1,
    bingos: won ? s.bingos + 1 : s.bingos,
    fastest: won ? Math.min(s.fastest, ballCount) : s.fastest,
  }
  localStorage.setItem('bingo_stats', JSON.stringify(next))
  return next
}

// ─── Main component ───────────────────────────────────────────────────────────
type SpeedMode = 'manual' | 'auto'

export default function BingoGame({ onBack }: { onBack?: () => void }) {
  const [card, setCard] = useState<number[][]>(makeCard)
  const [called, setCalled] = useState<Set<number>>(new Set())
  const [history, setHistory] = useState<number[]>([])
  const [lastCall, setLastCall] = useState<number | null>(null)
  const [winType, setWinType] = useState<WinType>(null)
  const [ballAnim, setBallAnim] = useState(false)
  const [speed, setSpeed] = useState<SpeedMode>('manual')
  const [stats, setStats] = useState<BingoStats>(loadStats)
  const [newlyMarked, setNewlyMarked] = useState<string | null>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statsSavedRef = useRef(false)

  // Auto mode
  useEffect(() => {
    if (speed === 'auto' && !winType) {
      autoRef.current = setInterval(() => {
        callNumber()
      }, 2000)
    } else {
      if (autoRef.current) clearInterval(autoRef.current)
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, winType, called])

  const callNumber = useCallback(() => {
    setCalled(prev => {
      const remaining = range(1, 75).filter(n => !prev.has(n))
      if (!remaining.length) return prev
      const n = remaining[Math.floor(Math.random() * remaining.length)]
      const next = new Set(prev)
      next.add(n)
      setLastCall(n)
      setHistory(h => [n, ...h].slice(0, 10))
      setBallAnim(true)
      setTimeout(() => setBallAnim(false), 500)

      // Find newly marked cell
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (card[r][c] === n) {
            setNewlyMarked(`${r},${c}`)
            setTimeout(() => setNewlyMarked(null), 800)
          }
        }
      }

      const w = checkWin(card, next)
      if (w && !statsSavedRef.current) {
        statsSavedRef.current = true
        setWinType(w)
        const s = saveStats(true, next.size)
        setStats(s)
      }
      return next
    })
  }, [card])

  const newGame = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current)
    if (!statsSavedRef.current && called.size > 0) {
      saveStats(false, called.size)
    }
    setCard(makeCard())
    setCalled(new Set())
    setHistory([])
    setLastCall(null)
    setWinType(null)
    setSpeed('manual')
    setBallAnim(false)
    setNewlyMarked(null)
    statsSavedRef.current = false
    setStats(loadStats())
  }, [called])

  const allUsed = called.size >= 75

  return (
    <div className="space-y-3">
      {/* Confetti CSS */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(720deg); opacity: 0; }
        }
        @keyframes bingoText {
          0%   { transform: scale(0.5) rotate(-5deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ballIn {
          0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
          70%  { transform: scale(1.15) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes cellPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.25); }
          100% { transform: scale(1); }
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
          <span className="font-bold text-base" style={{ color: TEXT }}>Bingo</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
          <span>{called.size} numéros</span>
          {stats.bingos > 0 && <span>· {stats.bingos} 🎯</span>}
          {stats.fastest < 999 && <span>· Meilleur: {stats.fastest}</span>}
        </div>
      </div>

      {/* Win banner */}
      {winType && (
        <div
          className="relative rounded-2xl p-4 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(168,85,247,0.2))',
            border: '2px solid rgba(34,197,94,0.5)',
          }}
        >
          {/* Confetti dots */}
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none"
              style={{
                width: 6, height: 6,
                left: `${Math.random() * 100}%`,
                top: 0,
                background: ['#22c55e','#a855f7','#f59e0b','#ef4444','#3b82f6'][i % 5],
                animation: `confettiFall ${0.8 + Math.random() * 0.8}s ease-out ${i * 0.06}s both`,
              }}
            />
          ))}
          <div className="text-3xl font-black tracking-widest" style={{ color: '#22c55e', animation: 'bingoText 0.5s ease-out both' }}>
            B I N G O !
          </div>
          <p className="text-xs mt-1" style={{ color: '#22c55e' }}>{WIN_LABELS[winType]} · {called.size} numéros</p>
        </div>
      )}

      {/* Ball display */}
      {lastCall && (
        <div className="flex items-center gap-3">
          {/* Current ball */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center rounded-full font-black"
            style={{
              width: 60, height: 60,
              background: COL_BG[colFor(lastCall)],
              color: colFor(lastCall) === 2 ? '#1e293b' : '#fff',
              boxShadow: `0 4px 20px ${COL_COLORS[colFor(lastCall)]}55`,
              animation: ballAnim ? 'ballIn 0.45s ease-out both' : 'none',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900 }}>{COLS[colFor(lastCall)]}</span>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{lastCall}</span>
          </div>

          {/* History */}
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {history.slice(1, 9).map((n, i) => (
              <div key={`${n}-${i}`}
                className="flex items-center justify-center rounded-full text-xs font-bold"
                style={{
                  width: 28, height: 28,
                  background: COL_BG[colFor(n)],
                  color: colFor(n) === 2 ? '#1e293b' : '#fff',
                  opacity: 1 - i * 0.1,
                  fontSize: 10,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bingo card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        {/* Header row */}
        <div className="grid grid-cols-5">
          {COLS.map((col, ci) => (
            <div key={col} className="py-2 text-center font-black text-base tracking-wider"
              style={{ background: COL_BG[ci], color: ci === 2 ? '#1e293b' : '#fff' }}>
              {col}
            </div>
          ))}
        </div>

        {/* Cells */}
        {card.map((row, r) => (
          <div key={r} className="grid grid-cols-5">
            {row.map((n, c) => {
              const free = r === 2 && c === 2
              const marked = isMarked(r, c, card, called)
              const isNew = newlyMarked === `${r},${c}`
              return (
                <div
                  key={c}
                  className="flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    height: 46,
                    background: free
                      ? COL_BG[2]
                      : marked
                        ? 'rgba(168,85,247,0.25)'
                        : SURFACE,
                    border: `1px solid ${BORDER}`,
                    color: free ? '#1e293b' : marked ? '#a855f7' : TEXT,
                    position: 'relative',
                    animation: isNew ? 'cellPop 0.4s ease-out' : 'none',
                    boxShadow: marked && !free ? 'inset 0 0 12px rgba(168,85,247,0.2)' : 'none',
                  }}
                >
                  {free ? (
                    <span style={{ fontSize: 18 }}>★</span>
                  ) : marked ? (
                    <span style={{ fontSize: 16 }}>✓</span>
                  ) : (
                    <span style={{ fontSize: 12 }}>{n}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Speed toggle */}
      <div className="flex gap-1.5 justify-center">
        {(['manual', 'auto'] as SpeedMode[]).map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            disabled={!!winType || allUsed}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: speed === s ? '#a855f7' : SURFACE2,
              color: speed === s ? '#fff' : MUTED,
              border: `1px solid ${speed === s ? '#a855f7' : BORDER}`,
            }}
          >
            {s === 'manual' ? 'Manuel' : '⚡ Auto (2s)'}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={callNumber}
          disabled={!!winType || allUsed || speed === 'auto'}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95 disabled:cursor-default"
          style={{
            background: winType || allUsed || speed === 'auto'
              ? SURFACE2
              : 'linear-gradient(135deg,#a855f7,#7c3aed)',
            color: winType || allUsed || speed === 'auto' ? MUTED : '#fff',
            border: winType || allUsed || speed === 'auto' ? `1px solid ${BORDER}` : 'none',
            boxShadow: !winType && !allUsed && speed === 'manual' ? '0 4px 16px rgba(168,85,247,0.35)' : 'none',
          }}
        >
          {winType ? '🎉 BINGO !' : allUsed ? 'Tous appelés' : speed === 'auto' ? '⚡ Auto…' : '🎱 Appeler'}
        </button>

        <button
          onClick={newGame}
          className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110"
          style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
        >
          ↺
        </button>
      </div>

      {/* Stats row */}
      {stats.games > 0 && (
        <div className="flex justify-center gap-4 text-xs" style={{ color: MUTED }}>
          <span>Parties : <strong style={{ color: TEXT }}>{stats.games}</strong></span>
          <span>Bingos : <strong style={{ color: '#22c55e' }}>{stats.bingos}</strong></span>
          {stats.fastest < 999 && (
            <span>Record : <strong style={{ color: '#f59e0b' }}>{stats.fastest} 🎱</strong></span>
          )}
        </div>
      )}
    </div>
  )
}
