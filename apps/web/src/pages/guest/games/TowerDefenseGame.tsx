import { useRef, useEffect, useState, useCallback } from 'react'
import { ACCENT, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type TowerType = 'archer' | 'mage' | 'cannon'
type EnemyType = 'goblin' | 'orc' | 'troll' | 'giant'
type Phase = 'prepare' | 'wave' | 'gameover' | 'victory'

interface TowerDef {
  type: TowerType
  label: string
  emoji: string
  cost: number
  range: number
  damage: number
  cooldownMs: number
  splash: boolean
  splashRadius: number
  slow: number
  color: string
}

interface EnemyDef {
  type: EnemyType
  hp: number
  speed: number
  reward: number
  color: string
  emoji: string
}

interface Tower {
  col: number
  row: number
  type: TowerType
  cooldownRemaining: number
}

interface Enemy {
  id: string
  type: EnemyType
  pathIdx: number
  progress: number
  hp: number
  maxHp: number
  speed: number
  reward: number
  color: string
  emoji: string
  slowed: number
}

interface Projectile {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  damage: number
  targetId: string
  splash: boolean
  splashRadius: number
  slow: number
  color: string
}

interface SpawnEntry {
  type: EnemyType
  delay: number
}

interface GameState {
  towers: Tower[]
  enemies: Enemy[]
  projectiles: Projectile[]
  tick: number
  gold: number
  lives: number
  wave: number
  phase: Phase
  score: number
  spawnQueue: SpawnEntry[]
  spawnTimer: number
  speedMultiplier: number
}

interface UiState {
  gold: number
  lives: number
  wave: number
  score: number
  phase: Phase
}

// Draw-time visual state (passed into draw each frame, never causes React re-renders)
interface DrawMeta {
  hoverCell: { col: number; row: number } | null
  selectedCell: { col: number; row: number } | null
  cellSize: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 18
const ROWS = 11

const PATH_NODES: [number, number][] = [
  [0, 5], [3, 5], [3, 2], [7, 2], [7, 7], [12, 7], [12, 3], [17, 3],
]

function buildPath(): [number, number][] {
  const cells: [number, number][] = []
  const seen = new Set<string>()
  for (let i = 0; i < PATH_NODES.length - 1; i++) {
    const [c1, r1] = PATH_NODES[i]
    const [c2, r2] = PATH_NODES[i + 1]
    const dc = Math.sign(c2 - c1)
    const dr = Math.sign(r2 - r1)
    let c = c1
    let r = r1
    while (c !== c2 || r !== r2) {
      const key = `${c},${r}`
      if (!seen.has(key)) { seen.add(key); cells.push([c, r]) }
      c += dc
      r += dr
    }
    // Add endpoint of segment
    const endKey = `${c2},${r2}`
    if (!seen.has(endKey)) { seen.add(endKey); cells.push([c2, r2]) }
  }
  return cells
}

const PATH: [number, number][] = buildPath()
const PATH_SET = new Set(PATH.map(([c, r]) => `${c},${r}`))

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  archer: {
    type: 'archer', label: 'Archer', emoji: '🏹',
    cost: 50, range: 3.0, damage: 15, cooldownMs: 1000,
    splash: false, splashRadius: 0, slow: 0, color: '#22c55e',
  },
  mage: {
    type: 'mage', label: 'Mage', emoji: '🔮',
    cost: 100, range: 2.5, damage: 35, cooldownMs: 1500,
    splash: true, splashRadius: 0.8, slow: 0, color: '#a855f7',
  },
  cannon: {
    type: 'cannon', label: 'Cannon', emoji: '💣',
    cost: 175, range: 4.0, damage: 80, cooldownMs: 2000,
    splash: false, splashRadius: 0, slow: 600, color: '#f97316',
  },
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  goblin: { type: 'goblin', hp: 80,   speed: 0.028, reward: 10, color: '#4ade80', emoji: '👺' },
  orc:    { type: 'orc',    hp: 220,  speed: 0.020, reward: 20, color: '#facc15', emoji: '🧟' },
  troll:  { type: 'troll',  hp: 600,  speed: 0.012, reward: 40, color: '#fb923c', emoji: '👹' },
  giant:  { type: 'giant',  hp: 1500, speed: 0.008, reward: 80, color: '#f87171', emoji: '🐉' },
}

type WaveEntry = { type: EnemyType; count: number }
const WAVES: WaveEntry[][] = [
  [{ type: 'goblin', count: 12 }],
  [{ type: 'goblin', count: 10 }, { type: 'orc', count: 6 }],
  [{ type: 'goblin', count: 8 }, { type: 'orc', count: 8 }, { type: 'troll', count: 3 }],
  [{ type: 'orc', count: 12 }, { type: 'troll', count: 6 }, { type: 'giant', count: 2 }],
  [{ type: 'orc', count: 20 }, { type: 'troll', count: 8 }, { type: 'giant', count: 3 }],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _eid = 0
let _pid = 0

function getEnemyPos(enemy: Enemy, cs: number): { x: number; y: number } {
  const idx = Math.min(enemy.pathIdx, PATH.length - 1)
  if (idx >= PATH.length - 1) {
    const [c, r] = PATH[PATH.length - 1]
    return { x: (c + 0.5) * cs, y: (r + 0.5) * cs }
  }
  const [c1, r1] = PATH[idx]
  const [c2, r2] = PATH[idx + 1]
  const t = enemy.progress
  return {
    x: (c1 + (c2 - c1) * t + 0.5) * cs,
    y: (r1 + (r2 - r1) * t + 0.5) * cs,
  }
}

function getTowerCenter(tower: Tower, cs: number): { x: number; y: number } {
  return { x: (tower.col + 0.5) * cs, y: (tower.row + 0.5) * cs }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

function buildSpawnQueue(waveIndex: number): SpawnEntry[] {
  const entries = WAVES[waveIndex]
  const allEnemies: EnemyType[] = []
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) allEnemies.push(entry.type)
  }
  // Interleave by cycling through types
  const byType: Record<string, EnemyType[]> = {}
  for (const e of allEnemies) {
    if (!byType[e]) byType[e] = []
    byType[e].push(e)
  }
  const interleaved: EnemyType[] = []
  const queues = Object.values(byType)
  let remaining = allEnemies.length
  while (remaining > 0) {
    for (const q of queues) {
      if (q.length > 0) { interleaved.push(q.shift()!); remaining-- }
    }
  }
  return interleaved.map((type, i) => ({ type, delay: i === 0 ? 0 : 700 }))
}

function spawnEnemy(type: EnemyType): Enemy {
  const def = ENEMY_DEFS[type]
  return {
    id: `e_${++_eid}`,
    type,
    pathIdx: 0,
    progress: 0,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    reward: def.reward,
    color: def.color,
    emoji: def.emoji,
    slowed: 0,
  }
}

function makeInitialState(): GameState {
  return {
    towers: [],
    enemies: [],
    projectiles: [],
    tick: 0,
    gold: 200,
    lives: 20,
    wave: 0,
    phase: 'prepare',
    score: 0,
    spawnQueue: [],
    spawnTimer: 0,
    speedMultiplier: 1,
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

function drawGame(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  meta: DrawMeta,
): void {
  const { cellSize: cs, hoverCell, selectedCell } = meta
  const W = ctx.canvas.width
  const H = ctx.canvas.height

  // Background
  ctx.fillStyle = '#1a2510'
  ctx.fillRect(0, 0, W, H)

  // Grid cells
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = `${col},${row}`
      const isPath = PATH_SET.has(key)
      const x = col * cs
      const y = row * cs

      if (isPath) {
        ctx.fillStyle = '#7c5c30'
        ctx.fillRect(x, y, cs, cs)
        // Subtle texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1)
      } else {
        // Grass pattern alternating
        const shade = (col + row) % 2 === 0 ? '#1e2a14' : '#1a2610'
        ctx.fillStyle = shade
        ctx.fillRect(x, y, cs, cs)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1)
      }
    }
  }

  // Path direction arrows (subtle)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < PATH.length - 1; i++) {
    const [pc, pr] = PATH[i]
    const [nc, nr] = PATH[i + 1]
    let arrow = '·'
    if (nc > pc) arrow = '›'
    else if (nc < pc) arrow = '‹'
    else if (nr > pr) arrow = 'v'
    else arrow = '^'
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.font = `${Math.round(cs * 0.28)}px monospace`
    ctx.fillText(arrow, (pc + 0.5) * cs, (pr + 0.5) * cs)
  }

  // Entry highlight
  const [ec, er] = PATH[0]
  ctx.fillStyle = 'rgba(34,197,94,0.35)'
  ctx.fillRect(ec * cs, er * cs, cs, cs)
  ctx.font = `${Math.round(cs * 0.6)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('▶', (ec + 0.5) * cs, (er + 0.5) * cs)

  // Exit highlight
  const [xc, xr] = PATH[PATH.length - 1]
  ctx.fillStyle = 'rgba(248,113,113,0.35)'
  ctx.fillRect(xc * cs, xr * cs, cs, cs)
  ctx.font = `${Math.round(cs * 0.55)}px sans-serif`
  ctx.fillText('🏁', (xc + 0.5) * cs, (xr + 0.5) * cs)

  // Hover highlight for tower placement
  if (hoverCell) {
    const key = `${hoverCell.col},${hoverCell.row}`
    if (!PATH_SET.has(key)) {
      const hasTower = gs.towers.some(t => t.col === hoverCell.col && t.row === hoverCell.row)
      ctx.fillStyle = hasTower ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.13)'
      ctx.fillRect(hoverCell.col * cs, hoverCell.row * cs, cs, cs)
      ctx.strokeStyle = hasTower ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(hoverCell.col * cs + 1, hoverCell.row * cs + 1, cs - 2, cs - 2)
    }
  }

  // Towers — range rings (behind tower sprites)
  for (const tower of gs.towers) {
    const def = TOWER_DEFS[tower.type]
    const tc = getTowerCenter(tower, cs)
    const showRange = (hoverCell && hoverCell.col === tower.col && hoverCell.row === tower.row) ||
      (selectedCell && selectedCell.col === tower.col && selectedCell.row === tower.row)
    if (showRange) {
      ctx.save()
      ctx.globalAlpha = 0.15
      ctx.beginPath()
      ctx.arc(tc.x, tc.y, def.range * cs, 0, Math.PI * 2)
      ctx.fillStyle = def.color
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.arc(tc.x, tc.y, def.range * cs, 0, Math.PI * 2)
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  // Tower sprites
  for (const tower of gs.towers) {
    const def = TOWER_DEFS[tower.type]
    const tc = getTowerCenter(tower, cs)

    // Glow behind
    ctx.save()
    ctx.globalAlpha = 0.38
    ctx.beginPath()
    ctx.arc(tc.x, tc.y, cs * 0.44, 0, Math.PI * 2)
    ctx.fillStyle = def.color
    ctx.fill()
    ctx.restore()

    // Cooldown dark overlay arc
    if (tower.cooldownRemaining > 0) {
      const cdRatio = Math.min(1, tower.cooldownRemaining / def.cooldownMs)
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.moveTo(tc.x, tc.y)
      ctx.arc(tc.x, tc.y, cs * 0.44, -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2)
      ctx.closePath()
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fill()
      ctx.restore()
    }

    // Emoji
    ctx.font = `${Math.round(cs * 0.56)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.emoji, tc.x, tc.y + 1)
  }

  // Projectiles
  for (const proj of gs.projectiles) {
    const px = proj.fromX + (proj.toX - proj.fromX) * proj.progress
    const py = proj.fromY + (proj.toY - proj.fromY) * proj.progress
    const radius = Math.max(3, cs * 0.11)

    // Trail
    const trailT = Math.max(0, proj.progress - 0.15)
    const trailX = proj.fromX + (proj.toX - proj.fromX) * trailT
    const trailY = proj.fromY + (proj.toY - proj.fromY) * trailT
    ctx.save()
    const grad = ctx.createLinearGradient(trailX, trailY, px, py)
    grad.addColorStop(0, 'transparent')
    grad.addColorStop(1, proj.color)
    ctx.beginPath()
    ctx.moveTo(trailX, trailY)
    ctx.lineTo(px, py)
    ctx.strokeStyle = grad
    ctx.lineWidth = radius * 1.4
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.6
    ctx.stroke()
    ctx.restore()

    // Dot
    ctx.save()
    ctx.shadowColor = proj.color
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = proj.color
    ctx.fill()
    ctx.restore()
  }

  // Enemies
  for (const enemy of gs.enemies) {
    const ep = getEnemyPos(enemy, cs)
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp)
    const baseR = cs * 0.37
    const radius = baseR * (0.65 + 0.35 * hpRatio)

    // Drop shadow
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.ellipse(ep.x, ep.y + radius * 0.55, radius * 0.75, radius * 0.22, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()

    // Slow frost ring
    if (enemy.slowed > 0) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(ep.x, ep.y, radius + cs * 0.07, 0, Math.PI * 2)
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    // Body
    ctx.beginPath()
    ctx.arc(ep.x, ep.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = enemy.color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Emoji
    ctx.font = `${Math.round(radius * 1.45)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(enemy.emoji, ep.x, ep.y + 1)

    // HP bar
    const barW = cs * 0.82
    const barH = Math.max(3, cs * 0.07)
    const barX = ep.x - barW / 2
    const barY = ep.y - radius - barH - 4

    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2)
      ctx.fill()
    } else {
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2)
    }

    const hpColor = hpRatio > 0.6 ? '#22c55e' : hpRatio > 0.3 ? '#facc15' : '#ef4444'
    ctx.fillStyle = hpColor
    if (ctx.roundRect && barW * hpRatio > 0) {
      ctx.beginPath()
      ctx.roundRect(barX, barY, Math.max(1, barW * hpRatio), barH, 1)
      ctx.fill()
    } else {
      ctx.fillRect(barX, barY, Math.max(1, barW * hpRatio), barH)
    }
  }

  // Prepare phase banner
  if (gs.phase === 'prepare' && gs.wave < WAVES.length) {
    const bW = Math.min(W * 0.72, cs * 12)
    const bH = cs * 1.3
    const bX = W / 2 - bW / 2
    const bY = H / 2 - bH / 2

    ctx.save()
    ctx.globalAlpha = 0.82
    ctx.fillStyle = '#0f1f08'
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(bX, bY, bW, bH, 10)
      ctx.fill()
    } else {
      ctx.fillRect(bX, bY, bW, bH)
    }
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 1.5
    if (ctx.roundRect) {
      ctx.beginPath()
      ctx.roundRect(bX, bY, bW, bH, 10)
      ctx.stroke()
    } else {
      ctx.strokeRect(bX, bY, bW, bH)
    }
    ctx.restore()

    ctx.fillStyle = '#22c55e'
    ctx.font = `bold ${Math.round(cs * 0.52)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`⚔️  Vague ${gs.wave + 1} — Placez vos tours !`, W / 2, H / 2)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TowerDefenseGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // All mutable game state lives here — never triggers React re-renders
  const gsRef = useRef<GameState>(makeInitialState())
  // Visual-only state for the draw call, also in a ref
  const drawMetaRef = useRef<DrawMeta>({ hoverCell: null, selectedCell: null, cellSize: 40 })

  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // Minimal React state — only what the UI layer needs
  const [uiState, setUiState] = useState<UiState>({
    gold: 200, lives: 20, wave: 0, score: 0, phase: 'prepare',
  })
  const [selectedTower, setSelectedTower] = useState<TowerType>('archer')
  const [speed2x, setSpeed2x] = useState(false)

  // Keep selected tower accessible from the RAF loop without stale closure
  const selectedTowerRef = useRef<TowerType>('archer')
  useEffect(() => { selectedTowerRef.current = selectedTower }, [selectedTower])

  // ─── Resize ─────────────────────────────────────────────────────────────

  const resize = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const w = container.clientWidth
    const cs = Math.max(28, Math.floor(w / COLS))
    drawMetaRef.current.cellSize = cs
    canvas.width = cs * COLS
    canvas.height = cs * ROWS
  }, [])

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [resize])

  // ─── Game loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    let rafId: number

    const loop = (timestamp: number) => {
      const rawDt = timestamp - (lastTimeRef.current || timestamp)
      lastTimeRef.current = timestamp
      const dt = Math.min(rawDt, 50) // cap at 50ms to avoid spiral of death

      const gs = gsRef.current
      const cs = drawMetaRef.current.cellSize

      if (gs.phase === 'wave') {
        // ── Spawn ──────────────────────────────────────────────────────
        if (gs.spawnQueue.length > 0) {
          gs.spawnTimer -= dt * gs.speedMultiplier
          if (gs.spawnTimer <= 0) {
            const next = gs.spawnQueue.shift()!
            gs.enemies.push(spawnEnemy(next.type))
            gs.spawnTimer = gs.spawnQueue.length > 0 ? gs.spawnQueue[0].delay : 0
          }
        }

        // ── Move enemies ───────────────────────────────────────────────
        const reachedEnd = new Set<string>()
        for (const enemy of gs.enemies) {
          if (enemy.slowed > 0) enemy.slowed = Math.max(0, enemy.slowed - dt * gs.speedMultiplier)
          const slowFactor = enemy.slowed > 0 ? 0.4 : 1
          enemy.progress += enemy.speed * dt * slowFactor * gs.speedMultiplier

          while (enemy.progress >= 1) {
            enemy.progress -= 1
            enemy.pathIdx++
            if (enemy.pathIdx >= PATH.length - 1) {
              gs.lives = Math.max(0, gs.lives - 1)
              reachedEnd.add(enemy.id)
              break
            }
          }
        }
        gs.enemies = gs.enemies.filter(e => !reachedEnd.has(e.id))

        // ── Tower fire ─────────────────────────────────────────────────
        for (const tower of gs.towers) {
          const def = TOWER_DEFS[tower.type]
          tower.cooldownRemaining = Math.max(0, tower.cooldownRemaining - dt * gs.speedMultiplier)
          if (tower.cooldownRemaining > 0) continue

          const tc = getTowerCenter(tower, cs)
          const rangePixels = def.range * cs

          // Target: furthest along the path within range
          let target: Enemy | null = null
          let bestProgress = -1
          for (const enemy of gs.enemies) {
            const ep = getEnemyPos(enemy, cs)
            if (dist(tc.x, tc.y, ep.x, ep.y) <= rangePixels) {
              const tot = enemy.pathIdx + enemy.progress
              if (tot > bestProgress) { bestProgress = tot; target = enemy }
            }
          }

          if (target) {
            const ep = getEnemyPos(target, cs)
            gs.projectiles.push({
              id: `p_${++_pid}`,
              fromX: tc.x, fromY: tc.y,
              toX: ep.x, toY: ep.y,
              progress: 0,
              damage: def.damage,
              targetId: target.id,
              splash: def.splash,
              splashRadius: def.splashRadius * cs,
              slow: def.slow,
              color: def.color,
            })
            tower.cooldownRemaining = def.cooldownMs
          }
        }

        // ── Move + resolve projectiles ─────────────────────────────────
        const hitSet = new Set<string>()
        for (const proj of gs.projectiles) {
          proj.progress += 0.08 * gs.speedMultiplier
          if (proj.progress >= 1) {
            hitSet.add(proj.id)
            if (proj.splash) {
              for (const enemy of gs.enemies) {
                const ep = getEnemyPos(enemy, cs)
                if (dist(proj.toX, proj.toY, ep.x, ep.y) <= proj.splashRadius) {
                  enemy.hp -= proj.damage
                  if (proj.slow > 0) enemy.slowed = proj.slow
                }
              }
            } else {
              const target = gs.enemies.find(e => e.id === proj.targetId)
              if (target) {
                target.hp -= proj.damage
                if (proj.slow > 0) target.slowed = proj.slow
              }
            }
          }
        }
        gs.projectiles = gs.projectiles.filter(p => !hitSet.has(p.id))

        // ── Kill dead enemies ──────────────────────────────────────────
        let goldGained = 0
        let scoreGained = 0
        gs.enemies = gs.enemies.filter(e => {
          if (e.hp <= 0) {
            goldGained += e.reward
            scoreGained += e.reward * 10
            return false
          }
          return true
        })
        gs.gold += goldGained
        gs.score += scoreGained

        // ── Check wave/game end ────────────────────────────────────────
        if (gs.lives <= 0) {
          gs.phase = 'gameover'
        } else if (gs.spawnQueue.length === 0 && gs.enemies.length === 0) {
          gs.phase = gs.wave >= WAVES.length ? 'victory' : 'prepare'
        }
      }

      // ── Draw ───────────────────────────────────────────────────────────
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) drawGame(ctx, gs, drawMetaRef.current)
      }

      // ── Sync UI every 6 ticks ──────────────────────────────────────────
      gs.tick++
      if (gs.tick % 6 === 0) {
        setUiState({ gold: gs.gold, lives: gs.lives, wave: gs.wave, score: gs.score, phase: gs.phase })
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    rafRef.current = rafId
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty deps — intentional: game loop is self-contained via refs

  // ─── Input helpers ───────────────────────────────────────────────────────

  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const cs = drawMetaRef.current.cellSize
    const col = Math.floor((e.clientX - rect.left) / cs)
    const row = Math.floor((e.clientY - rect.top) / cs)
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
    return { col, row }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    drawMetaRef.current.hoverCell = getCellFromEvent(e)
  }, [getCellFromEvent])

  const handleMouseLeave = useCallback(() => {
    drawMetaRef.current.hoverCell = null
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e)
    if (!cell) return
    const gs = gsRef.current
    if (gs.phase === 'gameover' || gs.phase === 'victory') return

    const { col, row } = cell
    const key = `${col},${row}`

    if (PATH_SET.has(key)) return

    const existing = gs.towers.find(t => t.col === col && t.row === row)
    if (existing) {
      // Click on existing tower: toggle selection to show range
      const cur = drawMetaRef.current.selectedCell
      drawMetaRef.current.selectedCell =
        cur && cur.col === col && cur.row === row ? null : { col, row }
      return
    }

    const def = TOWER_DEFS[selectedTowerRef.current]
    if (gs.gold < def.cost) return

    gs.gold -= def.cost
    gs.towers.push({ col, row, type: selectedTowerRef.current, cooldownRemaining: 0 })
    drawMetaRef.current.selectedCell = null
    // Immediate UI sync for gold
    setUiState(u => ({ ...u, gold: gs.gold }))
  }, [getCellFromEvent])

  // ─── Actions ─────────────────────────────────────────────────────────────

  const launchWave = useCallback(() => {
    const gs = gsRef.current
    if (gs.phase !== 'prepare' || gs.wave >= WAVES.length) return
    gs.spawnQueue = buildSpawnQueue(gs.wave)
    gs.spawnTimer = 0
    gs.wave++
    gs.phase = 'wave'
    setUiState(u => ({ ...u, wave: gs.wave, phase: 'wave' }))
  }, [])

  const toggleSpeed = useCallback(() => {
    const gs = gsRef.current
    gs.speedMultiplier = gs.speedMultiplier === 1 ? 2 : 1
    setSpeed2x(gs.speedMultiplier === 2)
  }, [])

  const restart = useCallback(() => {
    const fresh = makeInitialState()
    Object.assign(gsRef.current, fresh)
    drawMetaRef.current.hoverCell = null
    drawMetaRef.current.selectedCell = null
    setSpeed2x(false)
    setUiState({ gold: 200, lives: 20, wave: 0, score: 0, phase: 'prepare' })
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0f06', color: TEXT, fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden', userSelect: 'none',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
        flexWrap: 'wrap', rowGap: 6,
      }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED,
          cursor: 'pointer', borderRadius: 8, padding: '4px 12px', fontSize: 13,
          transition: 'border-color 0.15s',
        }}>← Retour</button>

        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 0.5 }}>⚔️ Tower Defense</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <StatPill label="Or"    value={`💰 ${uiState.gold}`}          color="#facc15" />
          <StatPill label="Vies"  value={`❤️ ${uiState.lives}`}         color="#f87171" />
          <StatPill label="Vague" value={`🌊 ${uiState.wave}/${WAVES.length}`} color="#60a5fa" />
          <StatPill label="Score" value={`⭐ ${uiState.score}`}          color={ACCENT} />
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'crosshair', maxWidth: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Game-over / victory overlay */}
        {(uiState.phase === 'gameover' || uiState.phase === 'victory') && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)',
          }}>
            <div style={{
              background: SURFACE2, border: `2px solid ${BORDER}`,
              borderRadius: 18, padding: '40px 52px', textAlign: 'center',
              maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            }}>
              <div style={{ fontSize: 52, lineHeight: 1 }}>
                {uiState.phase === 'victory' ? '🏆' : '💀'}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 14 }}>
                {uiState.phase === 'victory' ? 'Victoire !' : 'Défaite !'}
              </div>
              <div style={{ color: MUTED, marginTop: 8, fontSize: 14 }}>
                Score final :{' '}
                <span style={{ color: ACCENT, fontWeight: 700, fontSize: 16 }}>
                  {uiState.score}
                </span>
              </div>
              <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                Vague {uiState.wave} / {WAVES.length}
              </div>
              <button
                onClick={restart}
                style={{
                  marginTop: 26, padding: '11px 32px', borderRadius: 10,
                  border: 'none', background: ACCENT, color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  boxShadow: `0 0 20px ${ACCENT}66`,
                }}
              >
                Rejouer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        padding: '10px 14px', background: SURFACE, borderTop: `1px solid ${BORDER}`,
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        flexShrink: 0, rowGap: 6,
      }}>
        {/* Tower selector */}
        {(Object.keys(TOWER_DEFS) as TowerType[]).map(type => {
          const def = TOWER_DEFS[type]
          const isSelected = selectedTower === type
          const cantAfford = uiState.gold < def.cost
          return (
            <button
              key={type}
              onClick={() => setSelectedTower(type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                border: isSelected ? `2px solid ${def.color}` : `2px solid ${BORDER}`,
                background: isSelected ? `${def.color}1e` : SURFACE2,
                color: cantAfford ? MUTED : TEXT,
                opacity: cantAfford ? 0.65 : 1,
                transition: 'all 0.13s',
                position: 'relative',
              }}
              title={cantAfford ? "Pas assez d'or" : `Placer un ${def.label}`}
            >
              <span style={{ fontSize: 16 }}>{def.emoji}</span>
              <span>{def.label}</span>
              <span style={{
                fontSize: 11, background: 'rgba(250,204,21,0.15)', color: '#facc15',
                borderRadius: 5, padding: '1px 6px', fontWeight: 700,
              }}>
                {def.cost}💰
              </span>
              {cantAfford && (
                <span style={{
                  fontSize: 10, color: '#f87171', position: 'absolute',
                  bottom: -14, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}>
                  Manque d'or
                </span>
              )}
            </button>
          )
        })}

        <div style={{ width: 1, height: 30, background: BORDER, margin: '0 2px' }} />

        {/* Launch wave */}
        {uiState.phase === 'prepare' && uiState.wave < WAVES.length && (
          <button
            onClick={launchWave}
            style={{
              padding: '7px 18px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 0 12px rgba(22,163,74,0.45)',
            }}
          >
            ▶ Lancer vague {uiState.wave + 1}
          </button>
        )}

        {/* Speed toggle */}
        <button
          onClick={toggleSpeed}
          style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            border: speed2x ? '2px solid #f97316' : `2px solid ${BORDER}`,
            background: speed2x ? 'rgba(249,115,22,0.15)' : SURFACE2,
            color: speed2x ? '#f97316' : TEXT,
            transition: 'all 0.13s',
          }}
        >
          {speed2x ? '⏩ 2×' : '▶ 1×'}
        </button>

        {/* Status hint */}
        {uiState.phase === 'wave' && (
          <span style={{ fontSize: 12, color: MUTED, marginLeft: 4 }}>
            Vague en cours…
          </span>
        )}
        {uiState.phase === 'prepare' && uiState.wave === 0 && (
          <span style={{ fontSize: 12, color: MUTED, marginLeft: 4 }}>
            Cliquez sur la grille pour placer des tours
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
    </div>
  )
}
