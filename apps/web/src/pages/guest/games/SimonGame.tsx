import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Audio ────────────────────────────────────────────────────────────────────
function playTone(freq: number, duration = 0.6) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(0.45, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + duration - 0.1)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    osc.onended = () => ctx.close()
  } catch {
    // Audio not available
  }
}

function playError() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    // Audio not available
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────
type SpeedMode = 'classic' | 'fast' | 'speed'
const SPEED_MS: Record<SpeedMode, number> = { classic: 700, fast: 500, speed: 300 }
const SPEED_LABELS: Record<SpeedMode, string> = { classic: 'Classic', fast: 'Fast', speed: 'Speed' }

const BUTTONS = [
  { id: 0, color: '#22c55e', dim: '#14532d', glow: 'rgba(34,197,94,0.6)',  label: 'G', freq: 392 },
  { id: 1, color: '#ef4444', dim: '#7f1d1d', glow: 'rgba(239,68,68,0.6)',  label: 'R', freq: 261 },
  { id: 2, color: '#eab308', dim: '#713f12', glow: 'rgba(234,179,8,0.6)',  label: 'Y', freq: 330 },
  { id: 3, color: '#3b82f6', dim: '#1e3a8a', glow: 'rgba(59,130,246,0.6)', label: 'B', freq: 523 },
]

// Arc positions: top-left, top-right, bottom-right, bottom-left
const ARC_STYLES: React.CSSProperties[] = [
  { top: 0, left: 0, borderRadius: '100% 0 0 0' },
  { top: 0, right: 0, borderRadius: '0 100% 0 0' },
  { bottom: 0, right: 0, borderRadius: '0 0 100% 0' },
  { bottom: 0, left: 0, borderRadius: '0 0 0 100%' },
]

type Phase = 'idle' | 'showing' | 'input' | 'over'

export default function SimonGame({ onBack }: { onBack?: () => void }) {
  const [seq, setSeq] = useState<number[]>([])
  const [inputIdx, setInputIdx] = useState(0)
  const [lit, setLit] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [curScore, setCurScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [speed, setSpeed] = useState<SpeedMode>('classic')
  const [errorFlash, setErrorFlash] = useState(false)
  const busy = useRef(false)

  // Load best from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('simon_best')
    if (stored) setBestScore(parseInt(stored, 10))
  }, [])

  const saveBest = useCallback((s: number) => {
    setBestScore(prev => {
      const next = Math.max(prev, s)
      localStorage.setItem('simon_best', String(next))
      return next
    })
  }, [])

  const flashButton = useCallback((id: number, ms: number): Promise<void> =>
    new Promise(res => {
      setLit(id)
      playTone(BUTTONS[id].freq, ms / 1000)
      setTimeout(() => {
        setLit(null)
        setTimeout(res, ms * 0.2)
      }, ms)
    }), [])

  const playSequence = useCallback(async (s: number[], ms: number) => {
    busy.current = true
    setPhase('showing')
    await new Promise(r => setTimeout(r, 400))
    for (const id of s) {
      await flashButton(id, ms)
      await new Promise(r => setTimeout(r, ms * 0.15))
    }
    busy.current = false
    setPhase('input')
  }, [flashButton])

  const startGame = useCallback(() => {
    const first = Math.floor(Math.random() * 4)
    const newSeq = [first]
    setSeq(newSeq)
    setInputIdx(0)
    setCurScore(0)
    setErrorFlash(false)
    playSequence(newSeq, SPEED_MS[speed])
  }, [speed, playSequence])

  const handlePress = useCallback(async (id: number) => {
    if (phase !== 'input' || busy.current) return
    busy.current = true
    setLit(id)
    playTone(BUTTONS[id].freq, 0.25)
    setTimeout(() => setLit(null), 250)

    const idx = inputIdx
    if (id !== seq[idx]) {
      // Wrong!
      playError()
      setErrorFlash(true)
      setTimeout(() => setErrorFlash(false), 600)
      const score = seq.length - 1
      setCurScore(score)
      saveBest(score)
      setPhase('over')
      busy.current = false
      return
    }

    const nextIdx = idx + 1
    setInputIdx(nextIdx)

    if (nextIdx === seq.length) {
      // Completed sequence
      const newScore = seq.length
      setCurScore(newScore)
      const next = [...seq, Math.floor(Math.random() * 4)]
      setSeq(next)
      setInputIdx(0)
      await new Promise(r => setTimeout(r, 600))
      await playSequence(next, SPEED_MS[speed])
    } else {
      busy.current = false
    }
  }, [phase, inputIdx, seq, speed, saveBest, playSequence])

  const discSize = 260

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: MUTED }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="font-bold text-base" style={{ color: TEXT }}>Simon</span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
          <span>Score <span style={{ color: TEXT, fontWeight: 700 }}>{curScore}</span></span>
          <span>Record <span style={{ color: '#f59e0b', fontWeight: 700 }}>{bestScore}</span></span>
        </div>
      </div>

      {/* Speed selector */}
      <div className="flex gap-1.5 justify-center">
        {(['classic', 'fast', 'speed'] as SpeedMode[]).map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            disabled={phase === 'showing' || phase === 'input'}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: speed === s ? '#a855f7' : SURFACE2,
              color: speed === s ? '#fff' : MUTED,
              border: `1px solid ${speed === s ? '#a855f7' : BORDER}`,
              opacity: (phase === 'showing' || phase === 'input') ? 0.5 : 1,
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Phase indicator */}
      <div className="text-center h-6">
        {phase === 'showing' && (
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f59e0b' }}>
            ● SIMON
          </span>
        )}
        {phase === 'input' && (
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#22c55e' }}>
            ● TOI — {inputIdx}/{seq.length}
          </span>
        )}
        {phase === 'over' && (
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
            ✕ ERREUR — Score : {curScore}
          </span>
        )}
      </div>

      {/* Simon disc */}
      <div
        className="relative mx-auto select-none"
        style={{
          width: discSize,
          height: discSize,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          filter: errorFlash ? 'brightness(0.3) sepia(1) hue-rotate(320deg)' : 'none',
          transition: 'filter 0.1s',
        }}
      >
        {/* Gap cross — creates the 4 arc divisions */}
        <div className="absolute inset-0 z-20 pointer-events-none" style={{
          background: 'transparent',
        }}>
          {/* Horizontal gap */}
          <div className="absolute" style={{
            top: '50%', left: 0, right: 0, height: 8,
            background: '#05050f', transform: 'translateY(-50%)', zIndex: 20,
          }} />
          {/* Vertical gap */}
          <div className="absolute" style={{
            left: '50%', top: 0, bottom: 0, width: 8,
            background: '#05050f', transform: 'translateX(-50%)', zIndex: 20,
          }} />
        </div>

        {/* Center button (decorative) */}
        <div className="absolute z-30 rounded-full flex items-center justify-center" style={{
          top: '50%', left: '50%',
          width: 56, height: 56,
          transform: 'translate(-50%, -50%)',
          background: '#0a0a20',
          border: '3px solid #1a1a3a',
          boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
        }}>
          {phase === 'showing' && (
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
          )}
          {phase === 'input' && (
            <span className="text-[10px] font-black" style={{ color: TEXT }}>
              {inputIdx}/{seq.length}
            </span>
          )}
          {(phase === 'idle' || phase === 'over') && (
            <div className="w-2 h-2 rounded-full" style={{ background: BORDER }} />
          )}
        </div>

        {/* 4 arc buttons */}
        {BUTTONS.map((btn, i) => {
          const isLit = lit === btn.id
          return (
            <button
              key={btn.id}
              onClick={() => handlePress(btn.id)}
              className="absolute transition-all"
              style={{
                ...ARC_STYLES[i],
                width: '50%',
                height: '50%',
                background: isLit ? btn.color : btn.dim,
                boxShadow: isLit ? `inset 0 0 30px rgba(255,255,255,0.3), 0 0 40px ${btn.glow}` : 'inset 0 0 10px rgba(0,0,0,0.5)',
                cursor: phase === 'input' ? 'pointer' : 'default',
                filter: isLit ? 'brightness(1.5)' : 'brightness(1)',
                transition: 'filter 80ms, box-shadow 80ms, background 80ms',
                zIndex: 10,
                border: 'none',
              }}
            />
          )
        })}
      </div>

      {/* Action button */}
      {(phase === 'idle' || phase === 'over') && (
        <button
          onClick={startGame}
          className="w-full py-3 rounded-2xl font-bold text-sm tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
          }}
        >
          {phase === 'idle' ? '▶ Démarrer' : '↺ Rejouer'}
        </button>
      )}

      {phase === 'showing' && (
        <div className="w-full py-3 rounded-2xl text-center text-sm font-semibold" style={{ color: MUTED, background: SURFACE2, border: `1px solid ${BORDER}` }}>
          Observez la séquence…
        </div>
      )}
      {phase === 'input' && (
        <div className="w-full py-3 rounded-2xl text-center text-sm font-semibold" style={{ color: TEXT, background: SURFACE2, border: `1px solid ${BORDER}` }}>
          Reproduisez la séquence !
        </div>
      )}
    </div>
  )
}
