import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'
import { useGameScore } from './useGameScore'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
}
function shuffle<T>(a: T[]) {
  // Fisher-Yates : sort(() => Math.random()-0.5) est notoirement biaisé.
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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

// Marquage désormais par CASE (clé "r,c") et non par numéro : en pointage manuel,
// une case n'est marquée que si le joueur l'a pointée, pas dès que le numéro sort.
function isMarked(r: number, c: number, daubed: Set<string>): boolean {
  return FREE_SET.has(`${r},${c}`) || daubed.has(`${r},${c}`)
}

type WinType = 'row' | 'col' | 'diag' | 'corners' | 'full' | null

function checkWin(daubed: Set<string>): WinType {
  const m = (r: number, c: number) => isMarked(r, c, daubed)
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
// Le record (ancien champ `fastest`) est géré par useGameScore ; ici ne restent
// que les compteurs de parties/bingos, qui ne sont pas des records.
interface BingoStats { games: number; bingos: number }

function loadStats(): BingoStats {
  try {
    const s = localStorage.getItem('bingo_stats')
    if (!s) return { games: 0, bingos: 0 }
    const parsed = JSON.parse(s) as { games?: number; bingos?: number }
    return {
      games: typeof parsed?.games === 'number' ? parsed.games : 0,
      bingos: typeof parsed?.bingos === 'number' ? parsed.bingos : 0,
    }
  } catch { return { games: 0, bingos: 0 } }
}

function saveStats(won: boolean): BingoStats {
  const s = loadStats()
  const next: BingoStats = {
    games: s.games + 1,
    bingos: won ? s.bingos + 1 : s.bingos,
  }
  // try/catch : en navigation privée iOS (quota 0), setItem throw et crashait le
  // rendu au moment du bingo.
  try { localStorage.setItem('bingo_stats', JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

// Score leaderboard higher-is-better : gagner en moins de boules = plus de points
// (score = SCORE_BASE - nb de boules appelées ; affichage inverse : SCORE_BASE - best).
const SCORE_BASE = 100

// Migration one-time du record : bingo_stats est un JSON complexe et `fastest` est
// lower-is-better (nb de boules), donc pas de legacyKey possible — on convertit et
// copie vers la clé simple lue par useGameScore('bingo').
;(() => {
  try {
    const raw = localStorage.getItem('bingo_stats')
    if (!raw) return
    const fastest = Number((JSON.parse(raw) as { fastest?: number }).fastest)
    if (!Number.isFinite(fastest) || fastest <= 0 || fastest >= 999) return
    const converted = Math.max(0, SCORE_BASE - Math.round(fastest))
    const key = 'creorga.game.best.bingo'
    const current = Number(localStorage.getItem(key) || 0)
    if (converted > current) localStorage.setItem(key, String(converted))
  } catch { /* ignore */ }
})()

// ─── Main component ───────────────────────────────────────────────────────────
type SpeedMode = 'manual' | 'auto'

export default function BingoGame({ onBack }: { onBack?: () => void }) {
  const { best, submit } = useGameScore('bingo')
  const [card, setCard] = useState<number[][]>(makeCard)
  const [called, setCalled] = useState<Set<number>>(new Set())
  const [daubed, setDaubed] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState<number[]>([])
  const [lastCall, setLastCall] = useState<number | null>(null)
  const [winType, setWinType] = useState<WinType>(null)
  const [ballAnim, setBallAnim] = useState(false)
  const [speed, setSpeed] = useState<SpeedMode>('manual')       // cadence de tirage
  const [daubMode, setDaubMode] = useState<SpeedMode>('manual') // pointage manuel/auto
  const [misses, setMisses] = useState(0)                       // pointages sur un n° non tiré
  const [hint, setHint] = useState<string | null>(null)
  const [stats, setStats] = useState<BingoStats>(loadStats)
  const [newlyMarked, setNewlyMarked] = useState<string | null>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statsSavedRef = useRef(false)
  const ballTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calledRef = useRef(called)
  calledRef.current = called
  const daubedRef = useRef(daubed)
  daubedRef.current = daubed
  const daubModeRef = useRef(daubMode)
  daubModeRef.current = daubMode
  // Positions du confetti figées une fois : sinon Math.random() dans le JSX les
  // recalcule à chaque re-render post-victoire (les confettis « sautent »).
  const confettiRef = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      left: Math.random() * 100,
      dur: 0.8 + Math.random() * 0.8,
      color: ['#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#3b82f6'][i % 5],
      delay: i * 0.06,
    })),
  )
  useEffect(() => () => {
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current)
    if (markTimerRef.current) clearTimeout(markTimerRef.current)
  }, [])

  // callNumber via ref : l'intervalle auto ne dépend plus de `called` (sinon
  // détruit/recréé à chaque numéro -> cadence réelle imprévisible).
  const callNumberRef = useRef<() => void>(() => {})

  // Auto mode (cadence) : un seul intervalle par session auto.
  useEffect(() => {
    if (speed !== 'auto' || winType) return
    autoRef.current = setInterval(() => callNumberRef.current(), 2000)
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [speed, winType])

  // Pop bref d'une case (au pointage manuel ou auto).
  const flashCell = (key: string) => {
    setNewlyMarked(key)
    if (markTimerRef.current) clearTimeout(markTimerRef.current)
    markTimerRef.current = setTimeout(() => setNewlyMarked(null), 800)
  }

  // Applique un nouvel ensemble pointé + vérifie le bingo. Utilisé par les actions
  // pilotées par l'utilisateur (pointage manuel, bascule vers auto). N'utilise que
  // des refs + setters stables -> sûr même redéfini à chaque rendu.
  const commitDaub = (nextDaubed: Set<string>) => {
    daubedRef.current = nextDaubed
    setDaubed(nextDaubed)
    const w = checkWin(nextDaubed)
    if (w && !statsSavedRef.current) {
      statsSavedRef.current = true
      setWinType(w)
      setStats(saveStats(true))
      submit(Math.max(0, SCORE_BASE - calledRef.current.size))
    }
  }

  const callNumber = useCallback(() => {
    // Tout HORS d'un updater setState : sinon StrictMode le ré-exécute avec un
    // second Math.random() -> le numéro poussé dans l'historique diffère de celui
    // ajouté à 'called' (grille et historique désynchronisés).
    const prevCalled = calledRef.current
    const remaining = range(1, 75).filter(n => !prevCalled.has(n))
    if (!remaining.length) return
    const n = remaining[Math.floor(Math.random() * remaining.length)]
    const nextCalled = new Set(prevCalled)
    nextCalled.add(n)
    calledRef.current = nextCalled
    setCalled(nextCalled)
    setLastCall(n)
    setHistory(h => [n, ...h].slice(0, 10))
    setBallAnim(true)
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current)
    ballTimerRef.current = setTimeout(() => setBallAnim(false), 500)
    setHint(null)

    // Localise la case portant n (unique sur la carte).
    let cell: string | null = null
    outer: for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (card[r][c] === n) { cell = `${r},${c}`; break outer }
      }
    }

    if (daubModeRef.current === 'auto' && cell) {
      // Pointage auto : marque immédiatement + vérifie le bingo (ancien comportement).
      const nextDaubed = new Set(daubedRef.current)
      nextDaubed.add(cell)
      daubedRef.current = nextDaubed
      setDaubed(nextDaubed)
      setNewlyMarked(cell)
      if (markTimerRef.current) clearTimeout(markTimerRef.current)
      markTimerRef.current = setTimeout(() => setNewlyMarked(null), 800)
      const w = checkWin(nextDaubed)
      if (w && !statsSavedRef.current) {
        statsSavedRef.current = true
        setWinType(w)
        setStats(saveStats(true))
        submit(Math.max(0, SCORE_BASE - nextCalled.size))
      }
    } else if (cell) {
      // Pointage manuel : la case devient « à pointer » (rendu pulsant) + indice.
      setHint(`Vous avez le ${n} — touchez la case pour le pointer.`)
    }
  }, [card, submit])
  callNumberRef.current = callNumber

  // Pointage manuel : le joueur touche une case pour la marquer.
  const toggleDaub = (r: number, c: number) => {
    if (winType) return
    const key = `${r},${c}`
    if (FREE_SET.has(key)) return
    if (daubedRef.current.has(key)) {
      // Dé-pointer (corriger un clic) — pas de re-check bingo (partie non gagnée).
      const next = new Set(daubedRef.current)
      next.delete(key)
      daubedRef.current = next
      setDaubed(next)
      setHint(null)
      return
    }
    if (calledRef.current.has(card[r][c])) {
      const next = new Set(daubedRef.current)
      next.add(key)
      flashCell(key)
      setHint(null)
      commitDaub(next)
    } else {
      // Pointage d'un numéro pas encore tiré : raté (métrique d'adresse).
      setMisses(m => m + 1)
      setHint('Ce numéro n’a pas encore été tiré.')
    }
  }

  // Bascule du mode de pointage. Vers « auto » : rattrape toutes les cases déjà
  // tirées et vérifie un éventuel bingo immédiat.
  const changeDaubMode = (mode: SpeedMode) => {
    if (winType) return
    if (mode === 'auto') {
      const next = new Set(daubedRef.current)
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (calledRef.current.has(card[r][c])) next.add(`${r},${c}`)
        }
      }
      setDaubMode('auto')
      daubModeRef.current = 'auto'
      setHint(null)
      commitDaub(next)
    } else {
      setDaubMode('manual')
      daubModeRef.current = 'manual'
    }
  }

  const newGame = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current)
    if (!statsSavedRef.current && called.size > 0) {
      saveStats(false)
    }
    setCard(makeCard())
    setCalled(new Set())
    setDaubed(new Set())
    daubedRef.current = new Set()
    setHistory([])
    setLastCall(null)
    setWinType(null)
    setSpeed('manual')
    setDaubMode('manual')
    daubModeRef.current = 'manual'
    setMisses(0)
    setHint(null)
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
        @keyframes daubPulse {
          0%, 100% { box-shadow: inset 0 0 0 0 rgba(234,179,8,0); }
          50%      { box-shadow: inset 0 0 11px 1px rgba(234,179,8,0.55); }
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
          {best > 0 && <span>· Meilleur: {SCORE_BASE - best}</span>}
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
          {/* Confetti dots — positions mémoïsées (confettiRef) */}
          {confettiRef.current.map((cf, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none"
              style={{
                width: 6, height: 6,
                left: `${cf.left}%`,
                top: 0,
                background: cf.color,
                animation: `confettiFall ${cf.dur}s ease-out ${cf.delay}s both`,
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
              const marked = isMarked(r, c, daubed)
              // « À pointer » : numéro tiré mais pas encore marqué (pointage manuel).
              const callable = !free && !marked && called.has(n)
              const isNew = newlyMarked === `${r},${c}`
              const interactive = !free && !winType
              return (
                <div
                  key={c}
                  onClick={interactive ? () => toggleDaub(r, c) : undefined}
                  role={interactive ? 'button' : undefined}
                  aria-pressed={interactive ? marked : undefined}
                  aria-label={free ? 'Case gratuite' : `${COLS[c]} ${n}${marked ? ', pointé' : callable ? ', à pointer' : ''}`}
                  className="flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    height: 46,
                    cursor: interactive ? 'pointer' : 'default',
                    background: free
                      ? COL_BG[2]
                      : marked
                        ? 'rgba(168,85,247,0.25)'
                        : callable
                          ? 'rgba(234,179,8,0.14)'
                          : SURFACE,
                    border: `1px solid ${callable ? '#eab308' : BORDER}`,
                    color: free ? '#1e293b' : marked ? '#a855f7' : TEXT,
                    position: 'relative',
                    animation: isNew
                      ? 'cellPop 0.4s ease-out'
                      : callable
                        ? 'daubPulse 1.1s ease-in-out infinite'
                        : 'none',
                    boxShadow: marked && !free ? 'inset 0 0 12px rgba(168,85,247,0.2)' : 'none',
                  }}
                >
                  {free ? (
                    <span style={{ fontSize: 18 }}>★</span>
                  ) : (
                    <>
                      {marked && (
                        <span style={{
                          position: 'absolute', width: 30, height: 30, borderRadius: '50%',
                          background: 'rgba(168,85,247,0.30)', border: '2px solid #a855f7',
                          pointerEvents: 'none',
                        }} />
                      )}
                      {/* Le numéro reste TOUJOURS visible sous le marquage (UX bingo). */}
                      <span style={{ fontSize: 12, position: 'relative', fontWeight: 800, color: marked ? '#fff' : TEXT }}>{n}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Instruction / feedback line (états vides + guidage du pointage manuel) */}
      {!winType && (
        <p className="text-xs text-center px-2" style={{ color: hint ? '#eab308' : MUTED, minHeight: 16 }}>
          {hint
            ? hint
            : daubMode === 'auto'
              ? 'Pointage automatique : les cases se marquent seules.'
              : called.size === 0
                ? 'Tirez une boule, puis touchez vos numéros pour les pointer.'
                : 'Touchez vos numéros dès qu’ils sortent pour valider votre carte.'}
        </p>
      )}

      {/* Toggles : pointage (manuel/auto) + cadence de tirage */}
      <div className="flex flex-col gap-1.5 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs w-14 text-right" style={{ color: MUTED }}>Pointage</span>
          {(['manual', 'auto'] as SpeedMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => changeDaubMode(mode)}
              disabled={!!winType}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: daubMode === mode ? '#eab308' : SURFACE2,
                color: daubMode === mode ? '#1e293b' : MUTED,
                border: `1px solid ${daubMode === mode ? '#eab308' : BORDER}`,
              }}
            >
              {mode === 'manual' ? '✋ Manuel' : 'Auto'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-14 text-right" style={{ color: MUTED }}>Tirage</span>
          {(['manual', 'auto'] as SpeedMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              disabled={!!winType || allUsed}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
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
      {(stats.games > 0 || misses > 0) && (
        <div className="flex justify-center gap-4 text-xs flex-wrap" style={{ color: MUTED }}>
          <span>Parties : <strong style={{ color: TEXT }}>{stats.games}</strong></span>
          <span>Bingos : <strong style={{ color: '#22c55e' }}>{stats.bingos}</strong></span>
          {misses > 0 && (
            <span>Ratés : <strong style={{ color: '#ef4444' }}>{misses}</strong></span>
          )}
          {best > 0 && (
            <span>Record : <strong style={{ color: '#f59e0b' }}>{SCORE_BASE - best} 🎱</strong></span>
          )}
        </div>
      )}
    </div>
  )
}
