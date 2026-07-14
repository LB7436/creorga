/**
 * CASTLE RUSH (Creorga Original) — défense de château au RÉFLEXE.
 * Des assaillants descendent 3 couloirs vers ta porte : tape-les pour décocher
 * une flèche (les brutes encaissent plusieurs coups, un boss toutes les 5 vagues).
 * L'huile bouillante (coûte de l'or gagné aux kills) frappe tout l'écran.
 * Le château a des PV — survis le plus de vagues possible.
 * Distinct du Tower Defense : aucune tour à placer, tout au tap.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { useGameShell } from './lib/GameShell'
import { useGameScore } from './useGameScore'
import { buzz, createParticles, createShaker, isMuted, setMuted, setupCanvas, sfx, useGameLoop } from './lib/juice'
import GameOverModal from './GameOverModal'
import { BORDER, MUTED, SURFACE, SURFACE2, TEXT } from './theme'

// ── Dimensions logiques (le canvas est mis à l'échelle en CSS) ─────────────────
const W = 360
const H = 560
const CASTLE_TOP = H - 74
const SPAWN_Y = 54
const LANE_X = [W * 0.24, W * 0.5, W * 0.76]
const MAX_CASTLE_HP = 100
const WAVE_DURATION = 15 // secondes par vague
const OIL_COST = 5
const OIL_DMG = 5
const OIL_BTN = { x: 34, y: H - 34, r: 26 }
const ARROW_TIME = 0.11

type EnemyType = 'soldat' | 'brute' | 'boss'

interface EnemyDef { r: number; hp: number; speed: number; dmg: number; score: number; gold: number; body: string; edge: string }

const ENEMY: Record<EnemyType, EnemyDef> = {
  soldat: { r: 13, hp: 1, speed: 46, dmg: 6, score: 10, gold: 1, body: '#84cc16', edge: '#4d7c0f' },
  brute: { r: 18, hp: 3, speed: 31, dmg: 13, score: 26, gold: 3, body: '#94a3b8', edge: '#475569' },
  boss: { r: 28, hp: 14, speed: 22, dmg: 32, score: 160, gold: 20, body: '#ef4444', edge: '#7f1d1d' },
}

interface Enemy {
  x: number; y: number; lane: number
  hp: number; maxHp: number; speed: number; dmg: number; r: number
  type: EnemyType; hitFlash: number; dead: boolean; counted: boolean
}
interface Arrow { x: number; y: number; tx: number; ty: number; t: number }

interface GameState {
  enemies: Enemy[]
  arrows: Arrow[]
  castleHP: number
  score: number
  gold: number
  wave: number
  kills: number
  elapsed: number
  spawnTimer: number
  waveTimer: number
  oilFlash: number
  over: boolean
}

interface DiffSetting { speedMul: number; hpMul: number; spawnMul: number }
const DIFF: Record<string, DiffSetting> = {
  facile: { speedMul: 0.82, hpMul: 0.8, spawnMul: 1.35 },
  moyen: { speedMul: 1, hpMul: 1, spawnMul: 1 },
  difficile: { speedMul: 1.28, hpMul: 1.35, spawnMul: 0.78 },
}

function createInitialState(): GameState {
  return {
    enemies: [], arrows: [], castleHP: MAX_CASTLE_HP, score: 0, gold: 0,
    wave: 1, kills: 0, elapsed: 0, spawnTimer: 1, waveTimer: 0, oilFlash: 0, over: false,
  }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export default function CastleRushGame({ onBack }: { onBack?: () => void }) {
  const { difficulty } = useGameShell()
  const { best, submit } = useGameScore('castlerush')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const gameRef = useRef<GameState>(createInitialState())
  const particlesRef = useRef(createParticles(240))
  const shakerRef = useRef(createShaker(7))
  const diffRef = useRef<DiffSetting>(DIFF.moyen)
  diffRef.current = DIFF[difficulty] ?? DIFF.moyen

  const [gameOver, setGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) ctxRef.current = setupCanvas(canvas, W, H)
  }, [])

  const endGame = useCallback((score: number) => {
    setFinalScore(score)
    setIsNewRecord(submit(Math.max(0, Math.round(score))))
    setGameOver(true)
  }, [submit])

  // ── Logique de kill / dégâts (une seule source pour le score) ────────────────
  const award = (g: GameState, e: Enemy) => {
    const def = ENEMY[e.type]
    g.score += def.score
    g.gold += def.gold
    g.kills++
    particlesRef.current.burst(e.x, e.y, { count: e.type === 'boss' ? 26 : 10, hue: e.type === 'boss' ? 0 : 110, speed: e.type === 'boss' ? 300 : 180 })
    sfx.coin()
    if (e.type === 'boss') { shakerRef.current.add(0.6); sfx.explosion() }
  }
  const damageEnemy = (g: GameState, e: Enemy, amount: number) => {
    if (e.dead) return
    e.hp -= amount
    e.hitFlash = 0.13
    if (e.hp <= 0 && !e.counted) { e.counted = true; e.dead = true; award(g, e) }
  }

  const spawnEnemy = (g: GameState) => {
    const diff = diffRef.current
    const r = Math.random()
    let type: EnemyType = 'soldat'
    if (g.wave >= 3 && r < 0.34) type = 'brute'
    const def = ENEMY[type]
    const lane = Math.floor(Math.random() * 3)
    const hp = Math.ceil(def.hp * diff.hpMul + (type === 'brute' ? g.wave * 0.15 : 0))
    g.enemies.push({
      x: LANE_X[lane], y: SPAWN_Y, lane,
      hp, maxHp: hp,
      speed: def.speed * diff.speedMul * (1 + g.wave * 0.03),
      dmg: def.dmg, r: def.r, type, hitFlash: 0, dead: false, counted: false,
    })
  }
  const spawnBoss = (g: GameState) => {
    const diff = diffRef.current
    const def = ENEMY.boss
    const hp = Math.ceil(def.hp * diff.hpMul + g.wave)
    g.enemies.push({
      x: LANE_X[1], y: SPAWN_Y, lane: 1,
      hp, maxHp: hp, speed: def.speed * diff.speedMul, dmg: def.dmg, r: def.r,
      type: 'boss', hitFlash: 0, dead: false, counted: false,
    })
  }

  const castOil = (g: GameState) => {
    if (g.gold < OIL_COST) { sfx.bad(); return }
    g.gold -= OIL_COST
    g.oilFlash = 0.3
    shakerRef.current.add(0.55); sfx.explosion(); buzz.impact()
    for (const e of g.enemies) {
      particlesRef.current.burst(e.x, e.y, { count: 6, hue: 24, speed: 150 })
      damageEnemy(g, e, OIL_DMG)
    }
  }

  const handleTap = useCallback((lx: number, ly: number) => {
    const g = gameRef.current
    if (g.over) return
    // Bouton huile ?
    if (dist(lx, ly, OIL_BTN.x, OIL_BTN.y) <= OIL_BTN.r + 6) { castOil(g); return }
    // Ennemi le plus proche sous le doigt
    let hit: Enemy | null = null
    let bestD = Infinity
    for (const e of g.enemies) {
      if (e.dead) continue
      const d = dist(lx, ly, e.x, e.y)
      if (d <= e.r + 12 && d < bestD) { bestD = d; hit = e }
    }
    if (hit) {
      g.arrows.push({ x: W / 2, y: CASTLE_TOP + 4, tx: hit.x, ty: hit.y, t: 0 })
      particlesRef.current.burst(hit.x, hit.y, { count: 4, hue: 44, speed: 110 })
      sfx.hit(); buzz.tap()
      damageEnemy(g, hit, 1)
    } else {
      sfx.tap()
    }
  }, [])

  const spawnInterval = (g: GameState) =>
    Math.max(0.45, (1.7 - g.wave * 0.06) * diffRef.current.spawnMul)

  // ── Boucle ───────────────────────────────────────────────────────────────────
  const update = (dt: number) => {
    const g = gameRef.current
    if (g.over) return
    g.elapsed += dt
    if (g.oilFlash > 0) g.oilFlash = Math.max(0, g.oilFlash - dt)

    g.waveTimer += dt
    if (g.waveTimer >= WAVE_DURATION) {
      g.waveTimer = 0
      g.wave++
      g.score += g.wave * 10 // bonus de survie
      sfx.good()
      if (g.wave % 5 === 0) spawnBoss(g)
    }

    g.spawnTimer -= dt
    if (g.spawnTimer <= 0) { spawnEnemy(g); g.spawnTimer = spawnInterval(g) }

    for (const e of g.enemies) {
      if (e.dead) continue
      e.y += e.speed * dt
      if (e.hitFlash > 0) e.hitFlash -= dt
      if (e.y >= CASTLE_TOP - e.r) {
        g.castleHP -= e.dmg
        e.dead = true
        shakerRef.current.add(0.5); sfx.bad(); buzz.impact()
        particlesRef.current.burst(e.x, CASTLE_TOP, { count: 8, hue: 0, speed: 160 })
      }
    }
    g.enemies = g.enemies.filter((e) => !e.dead)

    for (const a of g.arrows) a.t += dt / ARROW_TIME
    g.arrows = g.arrows.filter((a) => a.t < 1)

    if (g.castleHP <= 0 && !g.over) {
      g.castleHP = 0
      g.over = true
      sfx.lose(); buzz.lose()
      endGame(g.score)
    }
  }

  const render = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const g = gameRef.current
    ctx.clearRect(0, 0, W, H)

    ctx.save()
    shakerRef.current.apply(ctx, 1 / 60)

    // Fond (ciel -> herbe)
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#0b1220')
    sky.addColorStop(0.55, '#14243a')
    sky.addColorStop(1, '#1f3a2a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // Couloirs
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (const lx of LANE_X) {
      ctx.beginPath(); ctx.moveTo(lx, SPAWN_Y - 10); ctx.lineTo(lx, CASTLE_TOP); ctx.stroke()
    }

    // Château
    ctx.fillStyle = '#3b3552'
    ctx.fillRect(0, CASTLE_TOP, W, H - CASTLE_TOP)
    ctx.fillStyle = '#2a2740'
    for (let x = 4; x < W; x += 28) ctx.fillRect(x, CASTLE_TOP - 8, 16, 8) // créneaux
    // Porte
    ctx.fillStyle = '#1b1830'
    ctx.fillRect(W / 2 - 22, CASTLE_TOP + 12, 44, H - CASTLE_TOP - 12)
    // Barre de PV du château
    const hpW = W - 24
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(12, CASTLE_TOP - 20, hpW, 8)
    const hpRatio = Math.max(0, g.castleHP / MAX_CASTLE_HP)
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444'
    ctx.fillRect(12, CASTLE_TOP - 20, hpW * hpRatio, 8)

    // Flèches
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 2
    for (const a of g.arrows) {
      const cx = a.x + (a.tx - a.x) * a.t
      const cy = a.y + (a.ty - a.y) * a.t
      const px = a.x + (a.tx - a.x) * Math.max(0, a.t - 0.16)
      const py = a.y + (a.ty - a.y) * Math.max(0, a.t - 0.16)
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke()
    }

    // Ennemis
    for (const e of g.enemies) {
      ctx.beginPath()
      ctx.fillStyle = ENEMY[e.type].body
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = ENEMY[e.type].edge
      ctx.stroke()
      if (e.type === 'boss') {
        ctx.fillStyle = ENEMY.boss.edge
        ctx.beginPath(); ctx.moveTo(e.x - e.r * 0.7, e.y - e.r * 0.6); ctx.lineTo(e.x - e.r * 0.35, e.y - e.r); ctx.lineTo(e.x - e.r * 0.1, e.y - e.r * 0.55); ctx.fill()
        ctx.beginPath(); ctx.moveTo(e.x + e.r * 0.7, e.y - e.r * 0.6); ctx.lineTo(e.x + e.r * 0.35, e.y - e.r); ctx.lineTo(e.x + e.r * 0.1, e.y - e.r * 0.55); ctx.fill()
      }
      // yeux
      ctx.fillStyle = '#0b1220'
      ctx.beginPath(); ctx.arc(e.x - e.r * 0.32, e.y - e.r * 0.1, e.r * 0.16, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(e.x + e.r * 0.32, e.y - e.r * 0.1, e.r * 0.16, 0, Math.PI * 2); ctx.fill()
      // flash de coup
      if (e.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.7, e.hitFlash * 5)
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }
      // PV pour les ennemis résistants
      if (e.maxHp > 1) {
        const bw = e.r * 2
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(e.x - e.r, e.y - e.r - 8, bw, 4)
        ctx.fillStyle = '#f87171'
        ctx.fillRect(e.x - e.r, e.y - e.r - 8, bw * Math.max(0, e.hp / e.maxHp), 4)
      }
    }

    // Particules
    particlesRef.current.step(ctx, 1 / 60)

    // Bouton huile bouillante
    const canOil = g.gold >= OIL_COST
    ctx.globalAlpha = canOil ? 1 : 0.4
    ctx.beginPath()
    ctx.fillStyle = canOil ? '#ea580c' : '#3f2a1a'
    ctx.arc(OIL_BTN.x, OIL_BTN.y, OIL_BTN.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '22px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🔥', OIL_BTN.x, OIL_BTN.y - 2)
    ctx.globalAlpha = 1
    ctx.font = 'bold 10px system-ui'
    ctx.fillStyle = canOil ? '#fed7aa' : '#78716c'
    ctx.fillText(`${OIL_COST}🪙`, OIL_BTN.x, OIL_BTN.y + OIL_BTN.r + 9)

    // HUD
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 16px system-ui'
    ctx.fillStyle = '#fff'
    ctx.fillText(`${g.score}`, 12, 12)
    ctx.font = '11px system-ui'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('score', 12, 32)

    ctx.textAlign = 'center'
    ctx.font = 'bold 14px system-ui'
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`Vague ${g.wave}`, W / 2, 14)

    ctx.textAlign = 'right'
    ctx.font = 'bold 15px system-ui'
    ctx.fillStyle = '#fde68a'
    ctx.fillText(`🪙 ${g.gold}`, W - 12, 12)

    // Flash huile
    if (g.oilFlash > 0) {
      ctx.globalAlpha = g.oilFlash
      ctx.fillStyle = '#f97316'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  useGameLoop(update, render, !gameOver)

  const restart = useCallback(() => {
    gameRef.current = createInitialState()
    particlesRef.current.clear()
    setFinalScore(0)
    setIsNewRecord(false)
    setGameOver(false)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const lx = (e.clientX - rect.left) * (W / rect.width)
    const ly = (e.clientY - rect.top) * (H / rect.height)
    handleTap(lx, ly)
  }

  const toggleMute = () => { const next = !muted; setMuted(next); setMutedState(next) }

  return (
    <div className="flex flex-col items-center" style={{ minHeight: '100%', background: SURFACE, padding: '12px 8px', gap: 10 }}>
      {/* Header */}
      <div className="flex items-center w-full" style={{ maxWidth: W, gap: 10 }}>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg" style={{ color: MUTED }} aria-label="Retour">
            <ChevronLeft size={18} />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: TEXT, fontSize: 15, fontWeight: 900 }}>🏰 Castle Rush</div>
          <div style={{ color: MUTED, fontSize: 11 }}>Tape les assaillants · défends la porte</div>
        </div>
        {best > 0 && <span style={{ color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>Record : {best}</span>}
        <button onClick={toggleMute} className="p-1.5 rounded-lg" style={{ color: MUTED }} aria-label="Son">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        style={{
          width: '100%', maxWidth: W, aspectRatio: `${W} / ${H}`, touchAction: 'manipulation',
          borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(0,0,0,0.45)', cursor: 'pointer',
        }}
      />

      {/* Aide */}
      <p className="text-xs text-center" style={{ color: MUTED, maxWidth: W }}>
        🎯 Tape un ennemi pour tirer · 🔥 l'huile bouillante (5 🪙) balaie tout l'écran · les brutes encaissent plusieurs coups, un boss toutes les 5 vagues.
      </p>

      {/* Restart rapide (hors game over) */}
      <button
        onClick={restart}
        className="text-xs font-bold px-4 py-2 rounded-full"
        style={{ background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT }}
      >
        ↺ Recommencer
      </button>

      {gameOver && (
        <GameOverModal
          score={finalScore}
          best={best}
          isNewRecord={isNewRecord}
          onReplay={restart}
          onBack={onBack}
        />
      )}
    </div>
  )
}
