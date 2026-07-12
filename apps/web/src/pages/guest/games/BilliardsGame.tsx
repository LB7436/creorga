import { useEffect, useRef, useState } from 'react'
import { Game3DShell, StatPill, ghostButtonStyle } from './arcade3d'
import { ACCENT2, MUTED } from './theme'
import GameOverModal from './GameOverModal'
import { useGameScore } from './useGameScore'

/**
 * v4.9 — Billard refait en physique 2D canvas (9-ball simplifié).
 *
 * Visée : drag depuis la bille blanche (direction + puissance, ligne
 * pointillée). Friction, collisions bille-bille (échange d'impulsion sur
 * l'axe des centres), rebonds sur bandes, empochage par rayon de poche.
 */

const W = 380
const H = 220
const BALL_R = 8
const FRICTION = 0.985
const POCKET_R = 14

interface BallState {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  potted: boolean
}

const COLORS = ['#fbbf24', '#3b82f6', '#ef4444', '#8b5cf6', '#f97316', '#22c55e', '#78350f', '#111827', '#ec4899']

function makeBalls(): BallState[] {
  const cue: BallState = { id: 0, x: 70, y: H / 2, vx: 0, vy: 0, color: '#f8fafc', potted: false }
  const balls: BallState[] = [cue]
  let i = 0
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col <= row; col++) {
      if (i >= 9) break
      balls.push({
        id: i + 1,
        x: W - 90 + row * (BALL_R * 1.8),
        y: H / 2 - row * BALL_R + col * BALL_R * 2,
        vx: 0, vy: 0,
        color: COLORS[i],
        potted: false,
      })
      i++
    }
  }
  return balls
}

function pockets(): { x: number; y: number }[] {
  return [
    { x: 10, y: 10 }, { x: W / 2, y: 6 }, { x: W - 10, y: 10 },
    { x: 10, y: H - 10 }, { x: W / 2, y: H - 6 }, { x: W - 10, y: H - 10 },
  ]
}

export default function BilliardsGame({ onBack }: { onBack?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<BallState[]>(makeBalls())
  const dragRef = useRef<{ active: boolean; startX: number; startY: number } | null>(null)
  const movingRef = useRef(false)

  const [shots, setShots] = useState(0)
  const [fouls, setFouls] = useState(0)
  const [message, setMessage] = useState('Glissez depuis la bille blanche pour viser.')
  const [gameOver, setGameOver] = useState(false)
  const [aimLine, setAimLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [, forceRerender] = useState(0)

  const { best, submit } = useGameScore('billard', { legacyKey: 'creorga.game.best.billiards' })
  const [isNewRecord, setIsNewRecord] = useState(false)
  const score = Math.max(10, 100 - shots * 5 - fouls * 10)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf: number

    const step = () => {
      const balls = ballsRef.current
      let anyMoving = false

      for (const b of balls) {
        if (b.potted) continue
        b.x += b.vx
        b.y += b.vy
        b.vx *= FRICTION
        b.vy *= FRICTION
        if (Math.abs(b.vx) < 0.02) b.vx = 0
        if (Math.abs(b.vy) < 0.02) b.vy = 0
        if (b.vx !== 0 || b.vy !== 0) anyMoving = true

        // Rebonds sur les bandes
        if (b.x < BALL_R) { b.x = BALL_R; b.vx *= -1 }
        if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx *= -1 }
        if (b.y < BALL_R) { b.y = BALL_R; b.vy *= -1 }
        if (b.y > H - BALL_R) { b.y = H - BALL_R; b.vy *= -1 }

        // Empochage
        for (const p of pockets()) {
          const dx = b.x - p.x
          const dy = b.y - p.y
          if (Math.sqrt(dx * dx + dy * dy) < POCKET_R) {
            b.potted = true
            b.vx = 0
            b.vy = 0
          }
        }
      }

      // Collisions bille-bille (échange d'impulsion élastique simple)
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i]
          const c = balls[j]
          if (a.potted || c.potted) continue
          const dx = c.x - a.x
          const dy = c.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < BALL_R * 2 && dist > 0) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = BALL_R * 2 - dist
            a.x -= nx * overlap / 2
            a.y -= ny * overlap / 2
            c.x += nx * overlap / 2
            c.y += ny * overlap / 2

            const relVx = a.vx - c.vx
            const relVy = a.vy - c.vy
            const speed = relVx * nx + relVy * ny
            if (speed > 0) {
              a.vx -= speed * nx
              a.vy -= speed * ny
              c.vx += speed * nx
              c.vy += speed * ny
            }
          }
        }
      }

      movingRef.current = anyMoving

      // Fin de tir : gérer faute / fin de partie
      if (!anyMoving && dragRef.current === null) {
        const cue = balls[0]
        if (cue.potted) {
          setFouls((f) => f + 1)
          cue.potted = false
          cue.x = 70
          cue.y = H / 2
          cue.vx = 0
          cue.vy = 0
          setMessage('Faute : la blanche est replacée (+2 coups pénalité).')
        }
        const remaining = balls.slice(1).filter((b) => !b.potted)
        if (remaining.length === 0 && !gameOver) {
          setGameOver(true)
          const finalScore = Math.max(10, 100 - shots * 5 - fouls * 10)
          const record = submit(finalScore)
          setIsNewRecord(record)
        }
      }

      // Render
      ctx.clearRect(0, 0, W, H)
      const grad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W)
      grad.addColorStop(0, '#166534')
      grad.addColorStop(1, '#052e16')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      for (const p of pockets()) {
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2)
        ctx.fill()
      }

      if (aimLine) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(aimLine.x1, aimLine.y1)
        ctx.lineTo(aimLine.x2, aimLine.y2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      for (const b of balls) {
        if (b.potted) continue
        ctx.beginPath()
        ctx.fillStyle = b.color
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [aimLine, gameOver, shots, fouls, submit])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (movingRef.current || gameOver) return
    const cue = ballsRef.current[0]
    if (cue.potted) return
    const pos = getPos(e)
    dragRef.current = { active: true, startX: pos.x, startY: pos.y }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current?.active) return
    const pos = getPos(e)
    setAimLine({ x1: dragRef.current.startX, y1: dragRef.current.startY, x2: pos.x, y2: pos.y })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current?.active) return
    const pos = getPos(e)
    const dx = dragRef.current.startX - pos.x
    const dy = dragRef.current.startY - pos.y
    dragRef.current = null
    setAimLine(null)

    const power = Math.min(Math.sqrt(dx * dx + dy * dy) / 6, 14)
    if (power < 1) return

    const cue = ballsRef.current[0]
    cue.vx = (dx / Math.sqrt(dx * dx + dy * dy || 1)) * power
    cue.vy = (dy / Math.sqrt(dx * dx + dy * dy || 1)) * power
    setShots((s) => s + 1)
    setMessage('Tir joué.')
    forceRerender((n) => n + 1)
  }

  const restart = () => {
    ballsRef.current = makeBalls()
    setShots(0)
    setFouls(0)
    setGameOver(false)
    setIsNewRecord(false)
    setMessage('Glissez depuis la bille blanche pour viser.')
  }

  return (
    <>
      <Game3DShell
        title="Billard Lounge"
        subtitle="9-ball — empochez toutes les billes en un minimum de coups"
        onBack={onBack}
        side={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatPill label="Coups" value={shots} color={ACCENT2} />
              <StatPill label="Fautes" value={fouls} color="#ef4444" />
              <StatPill label="Score" value={score} color="#f59e0b" />
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
