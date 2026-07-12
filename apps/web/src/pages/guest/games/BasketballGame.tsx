import { useEffect, useRef, useState } from 'react'
import { Game3DShell, ActionButton, StatPill, ghostButtonStyle } from './arcade3d'
import { ACCENT, ACCENT2, TEXT, MUTED } from './theme'
import GameOverModal from './GameOverModal'
import { useGameScore } from './useGameScore'

/**
 * v4.9 — Basket Rooftop refait en vrai jeu canvas.
 *
 * Le joueur fait un drag depuis le ballon : le vecteur donne l'angle et la
 * puissance du tir. Physique simple : gravité constante, rebond léger sur
 * le panneau. 30s chrono, 3 positions de tir qui alternent après chaque panier.
 */

const W = 360
const H = 520
const GRAVITY = 0.45
const GAME_DURATION = 30

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  flying: boolean
}

interface Hoop {
  x: number
  y: number
  radius: number
}

const SHOT_POSITIONS = [
  { x: W / 2, dist: 'proche' },
  { x: W / 2 - 60, dist: 'gauche' },
  { x: W / 2 + 60, dist: 'droite' },
]

export default function BasketballGame({ onBack }: { onBack?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballRef = useRef<Ball>({ x: W / 2, y: H - 60, vx: 0, vy: 0, flying: false })
  const dragRef = useRef<{ startX: number; startY: number; active: boolean }>({ startX: 0, startY: 0, active: false })
  const hoopRef = useRef<Hoop>({ x: W / 2, y: 110, radius: 26 })
  const positionIndexRef = useRef(0)
  const scoredThisShotRef = useRef(false)

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [message, setMessage] = useState('Glissez depuis le ballon pour viser et shooter.')
  const [gameOver, setGameOver] = useState(false)
  const [aimLine, setAimLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  const { best, submit } = useGameScore('basket3d', { legacyKey: 'creorga.game.best.basketball' })
  const [isNewRecord, setIsNewRecord] = useState(false)

  const resetBallPosition = () => {
    const pos = SHOT_POSITIONS[positionIndexRef.current % SHOT_POSITIONS.length]
    ballRef.current = { x: pos.x, y: H - 60, vx: 0, vy: 0, flying: false }
    scoredThisShotRef.current = false
  }

  useEffect(() => {
    if (gameOver) return
    if (timeLeft <= 0) {
      setGameOver(true)
      const record = submit(score)
      setIsNewRecord(record)
      return
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => window.clearTimeout(id)
  }, [timeLeft, gameOver, score, submit])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Fond
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#082f49')
      grad.addColorStop(1, '#0f172a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Panneau + arceau
      const hoop = hoopRef.current
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(hoop.x - 40, hoop.y - 50, 80, 46)
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(hoop.x, hoop.y, hoop.radius, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
      // Filet
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath()
        ctx.moveTo(hoop.x + i * hoop.radius * 0.8, hoop.y)
        ctx.lineTo(hoop.x + i * hoop.radius * 0.4, hoop.y + 24)
        ctx.stroke()
      }

      // Ligne de visée pendant le drag
      if (aimLine) {
        ctx.strokeStyle = ACCENT
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(aimLine.x1, aimLine.y1)
        ctx.lineTo(aimLine.x2, aimLine.y2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Ballon
      const ball = ballRef.current
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#7c2d12'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ball.x - 14, ball.y)
      ctx.lineTo(ball.x + 14, ball.y)
      ctx.moveTo(ball.x, ball.y - 14)
      ctx.lineTo(ball.x, ball.y + 14)
      ctx.stroke()

      // Physique
      if (ball.flying) {
        const prevY = ball.y
        ball.vy += GRAVITY
        ball.x += ball.vx
        ball.y += ball.vy

        // Panier validé : le ballon traverse le plan de l'anneau PAR LE HAUT en
        // descendant, à l'intérieur du cercle — plus fiable qu'une simple distance
        // (qui pouvait valider un ballon entrant par le côté).
        const withinRim = Math.abs(ball.x - hoop.x) < hoop.radius * 0.7
        const crossedDown = prevY < hoop.y && ball.y >= hoop.y && ball.vy > 0
        if (!scoredThisShotRef.current && withinRim && crossedDown) {
          scoredThisShotRef.current = true
          const pos = SHOT_POSITIONS[positionIndexRef.current % SHOT_POSITIONS.length]
          const points = pos.dist === 'proche' ? 2 : 3
          setScore((s) => s + points)
          setMessage(`Panier ! +${points} pts`)
          positionIndexRef.current += 1
          window.setTimeout(resetBallPosition, 400)
        }

        // Sortie de l'écran ou raté
        if (ball.y > H + 30 || ball.x < -30 || ball.x > W + 30) {
          if (!scoredThisShotRef.current) setMessage('Raté ! Ajustez votre tir.')
          window.setTimeout(resetBallPosition, 200)
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [aimLine])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (ballRef.current.flying || gameOver) return
    const pos = getPos(e)
    dragRef.current = { startX: pos.x, startY: pos.y, active: true }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return
    const pos = getPos(e)
    setAimLine({ x1: dragRef.current.startX, y1: dragRef.current.startY, x2: pos.x, y2: pos.y })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return
    const pos = getPos(e)
    const dx = dragRef.current.startX - pos.x
    const dy = dragRef.current.startY - pos.y
    dragRef.current.active = false
    setAimLine(null)

    const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 8, 18)
    if (power < 2) return

    const ball = ballRef.current
    // vx à la MÊME échelle que vy (dx/8, comme power = magnitude/8) et borné :
    // avant, dx/40 rendait la visée latérale quasi impossible (tir toujours vertical).
    ball.vx = Math.max(-14, Math.min(14, dx / 8))
    ball.vy = -power
    ball.flying = true
  }

  const restart = () => {
    positionIndexRef.current = 0
    resetBallPosition()
    setScore(0)
    setTimeLeft(GAME_DURATION)
    setGameOver(false)
    setIsNewRecord(false)
    setMessage('Glissez depuis le ballon pour viser et shooter.')
  }

  return (
    <>
      <Game3DShell
        title="Basket Rooftop"
        subtitle="Glissez pour viser, relâchez pour tirer — 30s chrono"
        onBack={onBack}
        side={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatPill label="Score" value={score} color="#f59e0b" />
              <StatPill label="Temps" value={`${timeLeft}s`} color={ACCENT2} />
            </div>
            <div style={{ color: MUTED, fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10 }}>
              {message}
            </div>
            <button onClick={restart} style={ghostButtonStyle}>Nouvelle partie</button>
          </div>
        }
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ width: '100%', maxWidth: W, height: 'auto', touchAction: 'none', borderRadius: 12, cursor: 'crosshair' }}
        />
      </Game3DShell>
      {gameOver && (
        <GameOverModal
          score={score}
          best={best}
          isNewRecord={isNewRecord}
          onReplay={restart}
          onBack={onBack}
        />
      )}
    </>
  )
}
