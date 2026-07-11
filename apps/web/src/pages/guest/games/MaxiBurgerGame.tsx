/**
 * v6.0 — MAXI BURGER (Creorga Original)
 * Stack de précision : les ingrédients défilent en balancier, un tap les lâche.
 * Mal aligné = tranche rognée ; « Parfait » = la tranche regrossit + combo.
 * Mode table (ensemble/tournoi) : même graine quotidienne pour toute la table.
 */
import { useEffect, useRef, useState } from 'react'
import { useGameShell } from './lib/GameShell'
import { useGameScore } from './useGameScore'
import {
  buzz,
  createParticles,
  createShaker,
  damp,
  ease,
  isMuted,
  setMuted,
  setupCanvas,
  sfx,
  useGameLoop,
} from './lib/juice'
import GameOverModal from './GameOverModal'
import { ACCENT, BORDER, MUTED, SURFACE, TEXT } from './theme'

// ---------------------------------------------------------------------------
// Constantes de gameplay
// ---------------------------------------------------------------------------

const BASE_WIDTH = 190
const MIN_WIDTH = 26
const SLICE_H = 26
const REGROW_PERFECT = 9
const COMBO_BONUS = 5
const SWAY_BASE_SPEED = 1.55
const SWAY_SPEED_PER_FLOOR = 0.045
const DROP_GRAVITY = 2600

const DIFF_SETTINGS: Record<string, { tol: number; speedMul: number }> = {
  facile: { tol: 11, speedMul: 0.82 },
  moyen: { tol: 7, speedMul: 1 },
  difficile: { tol: 5, speedMul: 1.22 },
}

interface Ingredient {
  name: string
  color: string
  edge: string
  detail: 'lettuce' | 'cheese' | 'tomato' | 'onion' | 'bacon' | 'steak'
}

const INGREDIENTS: Ingredient[] = [
  { name: 'Steak', color: '#7c3f21', edge: '#5b2d16', detail: 'steak' },
  { name: 'Salade', color: '#4ade80', edge: '#22c55e', detail: 'lettuce' },
  { name: 'Tomate', color: '#ef4444', edge: '#b91c1c', detail: 'tomato' },
  { name: 'Fromage', color: '#facc15', edge: '#d97706', detail: 'cheese' },
  { name: 'Oignon', color: '#e9d5ff', edge: '#c084fc', detail: 'onion' },
  { name: 'Bacon', color: '#dc6b4a', edge: '#9a3412', detail: 'bacon' },
]

interface Slice {
  x: number
  width: number
  ing: Ingredient
  squash: number // 1 = normal, anime vers 1 après l'atterrissage
  isBun?: boolean
}

interface FallingPiece {
  x: number
  y: number
  width: number
  vx: number
  vy: number
  rot: number
  vrot: number
  ing: Ingredient
}

interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
  max: number
}

type Phase = 'ready' | 'play' | 'over'

interface Sim {
  phase: Phase
  slices: Slice[]
  falling: FallingPiece[]
  floats: FloatText[]
  swayT: number
  swaySpeed: number
  swayAmp: number
  current: { ing: Ingredient; width: number } | null
  drop: { x: number; y: number; vy: number; width: number; ing: Ingredient } | null
  score: number
  floors: number
  combo: number
  cameraY: number // décalage monde (croît avec la tour)
  seedIndex: number
  rng: () => number
  over: boolean
  w: number
  h: number
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tableSeed(tableId: string | null) {
  const day = new Date()
  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${tableId ?? 'solo'}`
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function createSim(w: number, h: number, seeded: boolean, tableId: string | null): Sim {
  const seed = seeded ? tableSeed(tableId) : Math.floor(Math.random() * 2 ** 31)
  const rng = mulberry32(seed)
  return {
    phase: 'ready',
    slices: [],
    falling: [],
    floats: [],
    swayT: rng() * Math.PI * 2,
    swaySpeed: SWAY_BASE_SPEED,
    swayAmp: Math.min(w * 0.36, 150),
    current: null,
    drop: null,
    score: 0,
    floors: 0,
    combo: 0,
    cameraY: 0,
    seedIndex: 0,
    rng,
    over: false,
    w,
    h,
  }
}

// ---------------------------------------------------------------------------
// Dessin des tranches
// ---------------------------------------------------------------------------

function drawSlice(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, ing: Ingredient, squash: number, isBun?: boolean) {
  const h = SLICE_H * (2 - squash) * (isBun ? 1.35 : 1)
  const w = width * squash
  const x = cx - w / 2
  ctx.save()
  if (isBun) {
    // pain : dôme
    const grad = ctx.createLinearGradient(0, y - h, 0, y)
    grad.addColorStop(0, '#f6ad55')
    grad.addColorStop(1, '#c05621')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x, y - h * 1.5, cx, y - h * 1.5)
    ctx.quadraticCurveTo(x + w, y - h * 1.5, x + w, y)
    ctx.closePath()
    ctx.fill()
    // graines de sésame
    ctx.fillStyle = '#fef3c7'
    for (let i = 0; i < Math.max(3, Math.floor(w / 26)); i++) {
      const sx = x + w * (0.15 + (i * 0.7) / Math.max(3, Math.floor(w / 26)))
      const sy = y - h * (0.7 + 0.4 * Math.sin(i * 2.4))
      ctx.beginPath()
      ctx.ellipse(sx, sy, 3, 1.8, i * 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    return
  }
  ctx.fillStyle = ing.color
  ctx.strokeStyle = ing.edge
  ctx.lineWidth = 2
  const r = 7
  ctx.beginPath()
  ctx.roundRect(x, y - h, w, h, r)
  ctx.fill()
  ctx.stroke()
  // détails par ingrédient
  ctx.beginPath()
  ctx.rect(x, y - h, w, h)
  ctx.clip()
  switch (ing.detail) {
    case 'lettuce':
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let sx = x - 6; sx < x + w + 6; sx += 12) {
        ctx.moveTo(sx, y - 3)
        ctx.quadraticCurveTo(sx + 6, y - h * 0.85, sx + 12, y - 3)
      }
      ctx.stroke()
      break
    case 'cheese':
      ctx.fillStyle = '#fbbf24'
      for (let i = 0; i < Math.floor(w / 34); i++) {
        const dx = x + 16 + i * 34
        ctx.beginPath()
        ctx.moveTo(dx, y)
        ctx.lineTo(dx + 9, y)
        ctx.lineTo(dx + 4.5, y + 7)
        ctx.closePath()
        ctx.fill()
      }
      break
    case 'tomato':
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      for (let i = 0; i < Math.floor(w / 30); i++) {
        ctx.beginPath()
        ctx.arc(x + 18 + i * 30, y - h / 2, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'onion':
      ctx.strokeStyle = '#a855f7'
      ctx.lineWidth = 1.8
      for (let i = 0; i < Math.floor(w / 26); i++) {
        ctx.beginPath()
        ctx.arc(x + 14 + i * 26, y - h / 2, 7, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'bacon':
      ctx.strokeStyle = '#fca5a5'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let sx = x; sx < x + w; sx += 16) {
        ctx.moveTo(sx, y - h + 4)
        ctx.quadraticCurveTo(sx + 8, y - h / 2, sx + 16, y - h + 4)
      }
      ctx.stroke()
      break
    case 'steak':
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      for (let i = 0; i < Math.floor(w / 22); i++) {
        ctx.beginPath()
        ctx.ellipse(x + 12 + i * 22, y - h / 2 + (i % 2 ? 4 : -3), 6, 2.6, 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export default function MaxiBurgerGame({ onBack }: { onBack?: () => void }) {
  const shell = useGameShell()
  const { best, submit } = useGameScore('maxiburger')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const simRef = useRef<Sim | null>(null)
  const particlesRef = useRef(createParticles(256))
  const shakerRef = useRef(createShaker(7))
  const [hud, setHud] = useState({ phase: 'ready' as Phase, score: 0, floors: 0, combo: 0, isNewRecord: false })
  const [muted, setMutedState] = useState(isMuted())

  const seeded = shell.playMode !== 'solo'
  const diff = DIFF_SETTINGS[shell.difficulty] ?? DIFF_SETTINGS.moyen

  // --- mise en place canvas + resize
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const w = Math.max(280, Math.floor(rect.width))
      const h = Math.max(320, Math.floor(rect.height))
      ctxRef.current = setupCanvas(canvas, w, h)
      const sim = simRef.current
      if (sim) {
        sim.w = w
        sim.h = h
        sim.swayAmp = Math.min(w * 0.36, 150)
      } else {
        simRef.current = createSim(w, h, seeded, shell.tableId)
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nextIngredient = (sim: Sim) => {
    const ing = INGREDIENTS[Math.floor(sim.rng() * INGREDIENTS.length)]
    const top = sim.slices[sim.slices.length - 1]
    sim.current = { ing, width: top ? top.width : BASE_WIDTH }
    sim.swaySpeed = (SWAY_BASE_SPEED + sim.floors * SWAY_SPEED_PER_FLOOR) * diff.speedMul
  }

  const startGame = () => {
    const sim = simRef.current
    if (!sim) return
    const fresh = createSim(sim.w, sim.h, seeded, shell.tableId)
    fresh.phase = 'play'
    // socle : le pain du bas
    fresh.slices.push({ x: sim.w / 2, width: BASE_WIDTH, ing: INGREDIENTS[0], squash: 1, isBun: true })
    simRef.current = fresh
    nextIngredient(fresh)
    particlesRef.current.clear()
    setHud({ phase: 'play', score: 0, floors: 0, combo: 0, isNewRecord: false })
    sfx.tap()
    buzz.tap()
  }

  const endGame = (sim: Sim) => {
    sim.phase = 'over'
    sim.over = true
    sfx.explosion()
    buzz.lose()
    shakerRef.current.add(0.8)
    const isNewRecord = submit(sim.score)
    setHud({ phase: 'over', score: sim.score, floors: sim.floors, combo: 0, isNewRecord })
  }

  const dropCurrent = () => {
    const sim = simRef.current
    if (!sim || sim.phase !== 'play' || !sim.current || sim.drop) return
    const swayX = sim.w / 2 + Math.sin(sim.swayT) * sim.swayAmp
    const stackTopY = sim.h * 0.62 - sim.slices.length * SLICE_H
    sim.drop = {
      x: swayX,
      y: stackTopY - 240,
      vy: 0,
      width: sim.current.width,
      ing: sim.current.ing,
    }
    sim.current = null
    sfx.tap()
    buzz.tap()
  }

  const landDrop = (sim: Sim) => {
    const drop = sim.drop
    if (!drop) return
    const top = sim.slices[sim.slices.length - 1]
    const prevL = top.x - top.width / 2
    const prevR = top.x + top.width / 2
    const curL = drop.x - drop.width / 2
    const curR = drop.x + drop.width / 2
    const overlapL = Math.max(prevL, curL)
    const overlapR = Math.min(prevR, curR)
    const overlap = overlapR - overlapL
    const offset = Math.abs(drop.x - top.x)
    const landY = sim.h * 0.62 - sim.slices.length * SLICE_H
    sim.drop = null

    if (overlap <= 4) {
      // raté complet : la tranche tombe, fin de partie
      sim.falling.push({ x: drop.x, y: landY, width: drop.width, vx: drop.x > top.x ? 130 : -130, vy: -60, rot: 0, vrot: drop.x > top.x ? 2.4 : -2.4, ing: drop.ing })
      endGame(sim)
      return
    }

    if (offset <= diff.tol) {
      // PARFAIT
      sim.combo += 1
      const regrown = Math.min(BASE_WIDTH, drop.width + REGROW_PERFECT)
      sim.slices.push({ x: top.x, width: regrown, ing: drop.ing, squash: 0.62 })
      const bonus = COMBO_BONUS * sim.combo
      sim.score += 1 + bonus
      sim.floats.push({ x: top.x, y: landY - 40, text: sim.combo >= 2 ? `PARFAIT x${sim.combo} !` : 'PARFAIT !', color: '#4ade80', life: 0, max: 1 })
      sim.floats.push({ x: top.x, y: landY - 16, text: `+${1 + bonus}`, color: '#facc15', life: 0, max: 0.9 })
      sfx.combo(sim.combo)
      buzz.impact()
      particlesRef.current.burst(top.x, landY - SLICE_H, { count: 14, hue: 120, speed: 200 })
      if (sim.combo > 0 && sim.combo % 3 === 0) {
        particlesRef.current.confetti(sim.w / 2, landY - 80, 40)
        sfx.coin()
      }
    } else {
      // découpe
      sim.combo = 0
      const keptW = overlap
      const keptX = (overlapL + overlapR) / 2
      const cutW = drop.width - keptW
      const cutX = drop.x > top.x ? overlapR + cutW / 2 : overlapL - cutW / 2
      sim.falling.push({ x: cutX, y: landY, width: cutW, vx: drop.x > top.x ? 120 : -120, vy: -80, rot: 0, vrot: drop.x > top.x ? 2 : -2, ing: drop.ing })
      sim.slices.push({ x: keptX, width: keptW, ing: drop.ing, squash: 0.66 })
      sim.score += 1
      sfx.hit()
      shakerRef.current.add(0.25)
      particlesRef.current.burst(cutX, landY - SLICE_H / 2, { count: 10, hue: 28, speed: 240 })
      if (keptW < MIN_WIDTH) {
        endGame(sim)
        return
      }
    }

    sim.floors += 1
    setHud((h) => ({ ...h, score: sim.score, floors: sim.floors, combo: sim.combo }))
    nextIngredient(sim)
  }

  // --- boucle de jeu
  useGameLoop(
    (dt) => {
      const sim = simRef.current
      if (!sim) return
      // balancier
      if (sim.phase === 'play' && sim.current) sim.swayT += dt * sim.swaySpeed
      // chute
      if (sim.drop) {
        sim.drop.vy += DROP_GRAVITY * dt
        sim.drop.y += sim.drop.vy * dt
        const landY = sim.h * 0.62 - sim.slices.length * SLICE_H
        if (sim.drop.y >= landY) landDrop(sim)
      }
      // caméra suit la tour
      const targetCam = Math.max(0, sim.slices.length * SLICE_H - sim.h * 0.28)
      sim.cameraY = damp(sim.cameraY, targetCam, 5, dt)
      // squash des tranches
      for (const s of sim.slices) s.squash = Math.min(1, s.squash + dt * 3.2)
      // morceaux qui tombent
      for (const f of sim.falling) {
        f.vy += DROP_GRAVITY * 0.7 * dt
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.rot += f.vrot * dt
      }
      sim.falling = sim.falling.filter((f) => f.y < sim.h + sim.cameraY + 400)
      // textes flottants
      for (const t of sim.floats) t.life += dt
      sim.floats = sim.floats.filter((t) => t.life < t.max)
    },
    () => {
      const sim = simRef.current
      const ctx = ctxRef.current
      if (!sim || !ctx) return
      const { w, h } = sim
      ctx.save()
      // fond
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#1c1330')
      grad.addColorStop(0.55, '#2a1a3e')
      grad.addColorStop(1, '#0d0a1a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      // halo
      ctx.fillStyle = 'rgba(250,204,21,0.05)'
      ctx.beginPath()
      ctx.arc(w / 2, h * 0.35, Math.min(w, h) * 0.42, 0, Math.PI * 2)
      ctx.fill()

      shakerRef.current.apply(ctx, 1 / 60)
      ctx.translate(0, sim.cameraY)

      // assiette
      const plateY = h * 0.62 + 10
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.ellipse(w / 2, plateY, BASE_WIDTH * 0.85, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.ellipse(w / 2, plateY + 4, BASE_WIDTH * 0.85, 16, 0, 0, Math.PI)
      ctx.fill()

      // tour de tranches
      for (let i = 0; i < sim.slices.length; i++) {
        const s = sim.slices[i]
        const y = h * 0.62 - i * SLICE_H
        drawSlice(ctx, s.x, y, s.width, s.ing, s.squash, s.isBun)
      }

      // morceaux coupés qui tombent
      for (const f of sim.falling) {
        ctx.save()
        ctx.translate(f.x, f.y)
        ctx.rotate(f.rot)
        ctx.globalAlpha = 0.9
        drawSlice(ctx, 0, 0, f.width, f.ing, 1)
        ctx.restore()
      }

      // pièce en balancier ou en chute
      if (sim.phase === 'play') {
        const stackTopY = h * 0.62 - sim.slices.length * SLICE_H
        if (sim.current) {
          const swayX = w / 2 + Math.sin(sim.swayT) * sim.swayAmp
          const pieceY = stackTopY - 240 + Math.sin(sim.swayT * 2) * 6
          // fil du balancier
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(swayX, -sim.cameraY - 10)
          ctx.lineTo(swayX, pieceY - SLICE_H)
          ctx.stroke()
          // ombre projetée sur la tour
          const top = sim.slices[sim.slices.length - 1]
          const oL = Math.max(top.x - top.width / 2, swayX - sim.current.width / 2)
          const oR = Math.min(top.x + top.width / 2, swayX + sim.current.width / 2)
          ctx.fillStyle = oR - oL > 0 ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.3)'
          ctx.fillRect(swayX - sim.current.width / 2, stackTopY - 6, sim.current.width, 6)
          drawSlice(ctx, swayX, pieceY, sim.current.width, sim.current.ing, 1)
        }
        if (sim.drop) drawSlice(ctx, sim.drop.x, sim.drop.y, sim.drop.width, sim.drop.ing, 1)
      }

      // particules + textes flottants (espace monde)
      particlesRef.current.step(ctx, 1 / 60)
      for (const t of sim.floats) {
        const p = t.life / t.max
        ctx.globalAlpha = 1 - ease.outQuad(p)
        ctx.fillStyle = t.color
        ctx.font = '800 17px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(t.text, t.x, t.y - ease.outCubic(p) * 46)
      }
      ctx.globalAlpha = 1
      ctx.restore()
    },
    true,
  )

  const toggleMute = () => {
    const next = !isMuted()
    setMuted(next)
    setMutedState(next)
    if (!next) sfx.tap()
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0d0a1a', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={() => { if (hud.phase === 'play') dropCurrent() }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* HUD haut */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', pointerEvents: 'none' }}>
        {onBack && (
          <button
            onClick={(e) => { e.stopPropagation(); onBack() }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto', minWidth: 44, minHeight: 44, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(13,10,26,0.72)', color: MUTED, fontSize: 19, cursor: 'pointer' }}
          >
            ←
          </button>
        )}
        <span style={{ color: TEXT, fontWeight: 900, fontSize: 15 }}>🍔 Maxi Burger</span>
        {seeded && (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#facc15', border: '1px solid rgba(250,204,21,0.4)', borderRadius: 999, padding: '3px 8px' }}>
            Défi de table
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute() }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto', minWidth: 44, minHeight: 44, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(13,10,26,0.72)', color: MUTED, fontSize: 17, cursor: 'pointer' }}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* score */}
      <div style={{ position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 40, fontWeight: 950, color: TEXT, textShadow: '0 4px 18px rgba(0,0,0,0.6)' }}>{hud.score}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
          {hud.floors} étage{hud.floors > 1 ? 's' : ''} · record {Math.max(best, hud.score)}
        </div>
        {hud.combo >= 2 && (
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 900, color: '#4ade80' }}>🔥 Combo x{hud.combo}</div>
        )}
      </div>

      {/* écran d'accueil */}
      {hud.phase === 'ready' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'rgba(13,10,26,0.55)', backdropFilter: 'blur(3px)' }}>
          <div style={{ fontSize: 64 }}>🍔</div>
          <h2 style={{ margin: 0, color: TEXT, fontSize: 24, fontWeight: 950 }}>Maxi Burger</h2>
          <p style={{ margin: 0, color: MUTED, fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            Tapez pour lâcher l'ingrédient au bon moment.
            Mal aligné = tranche rognée. Visez le <strong style={{ color: '#4ade80' }}>PARFAIT</strong> pour regrossir le burger !
          </p>
          {seeded && (
            <p style={{ margin: 0, color: '#facc15', fontSize: 11, fontWeight: 700 }}>
              🏆 Défi de table : même burger pour tous aujourd'hui — comparez vos hauteurs !
            </p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); startGame() }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ marginTop: 6, minHeight: 52, padding: '0 42px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${ACCENT}, #f59e0b)`, color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer', boxShadow: '0 12px 30px rgba(245,158,11,0.35)' }}
          >
            ▶ Jouer
          </button>
          <div style={{ fontSize: 11, color: MUTED }}>Record : {best}</div>
        </div>
      )}

      {/* fin de partie */}
      {hud.phase === 'over' && (
        <GameOverModal
          score={hud.score}
          best={Math.max(best, hud.score)}
          isNewRecord={hud.isNewRecord}
          onReplay={startGame}
          onBack={onBack}
        />
      )}

      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700 }}>
        {hud.phase === 'play' ? 'TAP pour lâcher' : ''}
      </div>

      <div style={{ position: 'absolute', top: 0, right: 0, padding: 4, fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>
        {shell.difficulty}
      </div>
    </div>
  )
}
