import { useEffect, useRef, useState, useCallback } from 'react'
import { BG, SURFACE, SURFACE2, BORDER, TEXT, MUTED } from './theme'

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'menu' | 'prep' | 'wave' | 'gameover' | 'victory'
type Difficulty = 'easy' | 'normal' | 'hard'
type TowerType = 'laser' | 'plasma' | 'cryo' | 'tesla' | 'railgun'
type EnemyType = 'scout' | 'trooper' | 'tank' | 'stealth' | 'shielded' | 'swarm' | 'flyer' | 'overlord'

interface TowerDef {
  name: string; color: string; cost: number
  upgradeCosts: [number, number]; sellPct: number
  baseDamage: number; baseRange: number; baseFireRate: number
  baseAoe: number; baseSlowMult: number; baseFreezeDur: number
  chainCount: number; piercing: boolean; ignoreFlying: boolean
}
interface EnemyDef {
  name: string; color: string; shape: 'circle' | 'square' | 'hexagon' | 'diamond' | 'pentagon' | 'triangle'
  baseHp: number; baseSpeed: number; reward: number; armor: number
  flying: boolean; stealth: boolean; spawnsOn: EnemyType | null; spawnCount: number
  size: number
}
interface Tower {
  id: number; type: TowerType; col: number; row: number
  level: number; cooldown: number; invested: number
  angle: number
}
interface Enemy {
  id: number; type: EnemyType
  hp: number; maxHp: number; speed: number; baseSpeed: number
  seg: number; prog: number; x: number; y: number
  reward: number; armor: number; flying: boolean; stealth: boolean
  slowUntil: number; freezeUntil: number
  dead: boolean; reachedEnd: boolean
  revealed: boolean
}
interface Projectile {
  id: number; towerId: number; towerType: TowerType
  x: number; y: number; tx: number; ty: number
  enemyId: number; speed: number
  damage: number; aoe: number; slowMult: number; freezeDur: number
  chainLeft: number; piercing: boolean
  dead: boolean; color: string
}
interface DamageNumber {
  x: number; y: number; value: number; alpha: number; vy: number
}
interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
interface Ability {
  name: string; icon: string; cooldown: number; lastUsed: number
  description: string
}
interface GS {
  phase: Phase; wave: number; gold: number; lives: number; score: number
  speedMult: number; difficulty: Difficulty
  enemies: Enemy[]; towers: Tower[]; projectiles: Projectile[]
  particles: Particle[]; damageNumbers: DamageNumber[]
  spawnQueue: { type: EnemyType; delay: number }[]
  nextSpawnAt: number; frameCount: number; idCounter: number
  abilities: Ability[]
  abilityActive: string | null
  selectedTowerId: number | null
  placingType: TowerType | null
  gridOccupied: Set<string>
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 20, ROWS = 11, TOTAL_WAVES = 15
const WAYPOINTS: [number, number][] = [
  [-1, 5], [3, 5], [3, 2], [8, 2], [8, 7], [13, 7], [13, 3], [17, 3], [17, 7], [21, 7]
]
const PATH_CELLS = new Set<string>()
;(function buildPath() {
  for (let s = 0; s < WAYPOINTS.length - 1; s++) {
    const [x0, y0] = WAYPOINTS[s]
    const [x1, y1] = WAYPOINTS[s + 1]
    if (y0 === y1) {
      const mn = Math.min(x0, x1), mx = Math.max(x0, x1)
      for (let c = Math.max(0, mn); c <= Math.min(COLS - 1, mx); c++) PATH_CELLS.add(`${c},${y0}`)
    } else {
      const mn = Math.min(y0, y1), mx = Math.max(y0, y1)
      for (let r = mn; r <= mx; r++) PATH_CELLS.add(`${x0},${r}`)
    }
  }
})()

const HP_MULT = [1, 1.1, 1.25, 1.4, 1.6, 1.8, 2.1, 2.4, 2.8, 3.2, 3.7, 4.3, 5.0, 5.8, 6.8]

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  laser: {
    name: 'Laser', color: '#00ffcc', cost: 80, upgradeCosts: [60, 80], sellPct: 0.5,
    baseDamage: 18, baseRange: 3.5, baseFireRate: 0.6, baseAoe: 0,
    baseSlowMult: 1, baseFreezeDur: 0, chainCount: 0, piercing: true, ignoreFlying: false,
  },
  plasma: {
    name: 'Plasma', color: '#a855f7', cost: 130, upgradeCosts: [90, 120], sellPct: 0.5,
    baseDamage: 40, baseRange: 2.8, baseFireRate: 1.8, baseAoe: 1.2,
    baseSlowMult: 1, baseFreezeDur: 0, chainCount: 0, piercing: false, ignoreFlying: true,
  },
  cryo: {
    name: 'Cryo', color: '#3b82f6', cost: 120, upgradeCosts: [80, 100], sellPct: 0.5,
    baseDamage: 12, baseRange: 3.0, baseFireRate: 1.2, baseAoe: 0,
    baseSlowMult: 0.6, baseFreezeDur: 0, chainCount: 0, piercing: false, ignoreFlying: false,
  },
  tesla: {
    name: 'Tesla', color: '#facc15', cost: 180, upgradeCosts: [120, 150], sellPct: 0.5,
    baseDamage: 25, baseRange: 3.2, baseFireRate: 1.0, baseAoe: 0,
    baseSlowMult: 1, baseFreezeDur: 0, chainCount: 1, piercing: false, ignoreFlying: false,
  },
  railgun: {
    name: 'Railgun', color: '#f97316', cost: 220, upgradeCosts: [150, 200], sellPct: 0.5,
    baseDamage: 90, baseRange: 4.5, baseFireRate: 2.5, baseAoe: 0,
    baseSlowMult: 1, baseFreezeDur: 0, chainCount: 0, piercing: true, ignoreFlying: false,
  },
}
const TOWER_TYPES: TowerType[] = ['laser', 'plasma', 'cryo', 'tesla', 'railgun']

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  scout:    { name: 'Scout',    color: '#84cc16', shape: 'circle',   baseHp: 60,   baseSpeed: 2.2, reward: 8,  armor: 0,   flying: false, stealth: false, spawnsOn: null,     spawnCount: 0, size: 10 },
  trooper:  { name: 'Trooper',  color: '#ef4444', shape: 'square',   baseHp: 120,  baseSpeed: 1.4, reward: 12, armor: 0,   flying: false, stealth: false, spawnsOn: null,     spawnCount: 0, size: 12 },
  tank:     { name: 'Tank',     color: '#f97316', shape: 'hexagon',  baseHp: 450,  baseSpeed: 0.7, reward: 22, armor: 15,  flying: false, stealth: false, spawnsOn: null,     spawnCount: 0, size: 16 },
  stealth:  { name: 'Stealth',  color: '#64748b', shape: 'diamond',  baseHp: 140,  baseSpeed: 1.9, reward: 18, armor: 0,   flying: false, stealth: true,  spawnsOn: null,     spawnCount: 0, size: 11 },
  shielded: { name: 'Shielded', color: '#94a3b8', shape: 'pentagon', baseHp: 200,  baseSpeed: 1.1, reward: 20, armor: 30,  flying: false, stealth: false, spawnsOn: null,     spawnCount: 0, size: 13 },
  swarm:    { name: 'Swarm',    color: '#f472b6', shape: 'triangle', baseHp: 80,   baseSpeed: 1.7, reward: 10, armor: 0,   flying: false, stealth: false, spawnsOn: 'scout',  spawnCount: 3, size: 9  },
  flyer:    { name: 'Flyer',    color: '#06b6d4', shape: 'diamond',  baseHp: 160,  baseSpeed: 1.8, reward: 15, armor: 0,   flying: true,  stealth: false, spawnsOn: null,     spawnCount: 0, size: 12 },
  overlord: { name: 'Overlord', color: '#fbbf24', shape: 'hexagon',  baseHp: 2000, baseSpeed: 0.5, reward: 80, armor: 20,  flying: false, stealth: false, spawnsOn: 'trooper',spawnCount: 4, size: 22 },
}

interface WaveEntry { type: EnemyType; count: number; interval: number }
const WAVES: { enemies: WaveEntry[]; bonusGold: number }[] = [
  { enemies: [{ type: 'scout', count: 8, interval: 600 }], bonusGold: 40 },
  { enemies: [{ type: 'scout', count: 6, interval: 600 }, { type: 'trooper', count: 4, interval: 900 }], bonusGold: 50 },
  { enemies: [{ type: 'trooper', count: 8, interval: 800 }], bonusGold: 60 },
  { enemies: [{ type: 'trooper', count: 6, interval: 700 }, { type: 'tank', count: 2, interval: 1800 }], bonusGold: 70 },
  { enemies: [{ type: 'scout', count: 10, interval: 450 }, { type: 'shielded', count: 4, interval: 1200 }], bonusGold: 80 },
  { enemies: [{ type: 'tank', count: 4, interval: 1600 }, { type: 'shielded', count: 5, interval: 1000 }], bonusGold: 90 },
  { enemies: [{ type: 'stealth', count: 8, interval: 700 }, { type: 'swarm', count: 4, interval: 1100 }], bonusGold: 100 },
  { enemies: [{ type: 'trooper', count: 6, interval: 700 }, { type: 'stealth', count: 6, interval: 700 }, { type: 'tank', count: 3, interval: 1600 }], bonusGold: 110 },
  { enemies: [{ type: 'flyer', count: 8, interval: 600 }, { type: 'swarm', count: 6, interval: 900 }], bonusGold: 120 },
  { enemies: [{ type: 'flyer', count: 10, interval: 500 }, { type: 'shielded', count: 6, interval: 1000 }, { type: 'tank', count: 4, interval: 1500 }], bonusGold: 140 },
  { enemies: [{ type: 'stealth', count: 10, interval: 600 }, { type: 'flyer', count: 8, interval: 600 }, { type: 'tank', count: 5, interval: 1400 }], bonusGold: 160 },
  { enemies: [{ type: 'overlord', count: 1, interval: 3000 }, { type: 'trooper', count: 12, interval: 500 }], bonusGold: 180 },
  { enemies: [{ type: 'swarm', count: 12, interval: 600 }, { type: 'overlord', count: 1, interval: 3000 }, { type: 'flyer', count: 10, interval: 500 }], bonusGold: 200 },
  { enemies: [{ type: 'tank', count: 10, interval: 900 }, { type: 'shielded', count: 8, interval: 900 }, { type: 'overlord', count: 2, interval: 3000 }], bonusGold: 220 },
  { enemies: [{ type: 'overlord', count: 3, interval: 2500 }, { type: 'stealth', count: 15, interval: 450 }, { type: 'swarm', count: 10, interval: 600 }, { type: 'flyer', count: 12, interval: 400 }], bonusGold: 300 },
]

const ABILITIES: Ability[] = [
  { name: 'Orbital Strike', icon: '💥', cooldown: 45000, lastUsed: -999999, description: 'AoE nuke on click' },
  { name: 'EMP Pulse', icon: '⚡', cooldown: 30000, lastUsed: -999999, description: 'Freeze all 3s' },
  { name: 'Emergency Funds', icon: '💰', cooldown: 60000, lastUsed: -999999, description: '+100 gold' },
]

// ── Tower stat helpers ────────────────────────────────────────────────────────
function getTowerStats(t: Tower) {
  const d = TOWER_DEFS[t.type]
  const lvl = t.level
  const dmgMult = lvl === 1 ? 1 : lvl === 2 ? 1.6 : 2.5
  const rangeMult = lvl === 3 && t.type === 'laser' ? 1.5 : lvl === 3 && t.type === 'railgun' ? 1.4 : 1
  const aoe = d.baseAoe * (lvl === 2 ? 1.5 : lvl === 3 ? 2.5 : 1)
  const chain = t.type === 'tesla' ? (lvl === 1 ? 1 : lvl === 2 ? 3 : 5) : d.chainCount
  const freezeDur = t.type === 'cryo' ? (lvl >= 2 ? 1500 : 0) : 0
  const slowMult = t.type === 'cryo' ? (lvl === 1 ? 0.6 : lvl === 2 ? 0.5 : 0.3) : 1
  const beams = t.type === 'laser' ? (lvl === 1 ? 1 : lvl === 2 ? 2 : 3) : 1
  return {
    damage: d.baseDamage * dmgMult,
    range: d.baseRange * rangeMult * (t.type === 'railgun' && lvl === 3 ? 1 : 1),
    fireRate: d.baseFireRate * (lvl === 3 ? 0.85 : 1),
    aoe, chain, freezeDur, slowMult, beams,
    piercing: d.piercing || (t.type === 'railgun' && lvl >= 2),
    color: d.color,
  }
}
function getUpgradeCost(t: Tower): number | null {
  const d = TOWER_DEFS[t.type]
  if (t.level >= 3) return null
  return d.upgradeCosts[t.level - 1]
}
function getSellValue(t: Tower): number {
  return Math.floor(t.invested * TOWER_DEFS[t.type].sellPct)
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  ctx.closePath()
}
function pentPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i - Math.PI / 2
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  ctx.closePath()
}
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, now: number) {
  const def = ENEMY_DEFS[e.type]
  const frozen = e.freezeUntil > now
  const slowed = e.slowUntil > now
  let color = def.color
  if (frozen) color = '#93c5fd'
  else if (slowed) color = '#bfdbfe'
  const alpha = (e.stealth && !e.revealed) ? 0.35 : 1
  ctx.globalAlpha = alpha
  ctx.shadowColor = color; ctx.shadowBlur = 12
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
  const s = def.size
  const { x, y } = e
  switch (def.shape) {
    case 'circle':
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      break
    case 'square':
      ctx.beginPath(); ctx.rect(x - s, y - s, s * 2, s * 2); ctx.fill(); ctx.stroke()
      break
    case 'hexagon':
      hexPath(ctx, x, y, s); ctx.fill(); ctx.stroke()
      break
    case 'diamond':
      ctx.beginPath()
      ctx.moveTo(x, y - s * 1.2); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 1.2); ctx.lineTo(x - s, y)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      if (e.flying) {
        ctx.strokeStyle = color; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x - s * 1.8, y - 2); ctx.lineTo(x - s * 0.5, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + s * 1.8, y - 2); ctx.lineTo(x + s * 0.5, y); ctx.stroke()
      }
      break
    case 'pentagon':
      pentPath(ctx, x, y, s); ctx.fill(); ctx.stroke()
      break
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.9, y + s * 0.6); ctx.lineTo(x - s * 0.9, y + s * 0.6)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1
  // HP bar
  const bw = s * 2.2, bh = 3, bx = x - bw / 2, by = y - s - 7
  ctx.fillStyle = '#1f2937'; ctx.fillRect(bx, by, bw, bh)
  const pct = e.hp / e.maxHp
  ctx.fillStyle = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444'
  ctx.fillRect(bx, by, bw * pct, bh)
}
function drawTower(ctx: CanvasRenderingContext2D, t: Tower, cellW: number, cellH: number, selected: boolean) {
  const def = TOWER_DEFS[t.type]
  const cx = (t.col + 0.5) * cellW, cy = (t.row + 0.5) * cellH
  const r = Math.min(cellW, cellH) * 0.35 + t.level * 2
  const color = def.color
  ctx.shadowColor = color; ctx.shadowBlur = selected ? 24 : 14
  ctx.fillStyle = color + '33'; ctx.strokeStyle = color; ctx.lineWidth = 2
  // base platform
  hexPath(ctx, cx, cy, r + 4); ctx.fill(); ctx.stroke()
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
  ctx.shadowBlur = selected ? 30 : 18
  switch (t.type) {
    case 'laser':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = color; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t.angle) * r, cy + Math.sin(t.angle) * r); ctx.stroke()
      break
    case 'plasma':
      hexPath(ctx, cx, cy, r * 0.6); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2); ctx.fill()
      break
    case 'cryo':
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + t.angle
        ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3)
        ctx.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7)
        ctx.stroke()
      }
      break
    case 'tesla':
      ctx.beginPath()
      ctx.moveTo(cx, cy - r * 0.65); ctx.lineTo(cx + r * 0.6, cy + r * 0.35); ctx.lineTo(cx - r * 0.6, cy + r * 0.35)
      ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    case 'railgun':
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.angle)
      ctx.fillRect(-r * 0.25, -r * 0.6, r * 0.5, r * 1.2); ctx.strokeRect(-r * 0.25, -r * 0.6, r * 0.5, r * 1.2)
      ctx.restore()
      break
  }
  if (t.level > 1) {
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(cellW * 0.22)}px monospace`
    ctx.textAlign = 'center'; ctx.fillText(`T${t.level}`, cx, cy + r + 10)
  }
  ctx.shadowBlur = 0
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TowerDefenseGame({ onBack }: { onBack?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gsRef = useRef<GS | null>(null)
  const rafRef = useRef<number>(0)
  const cellRef = useRef({ w: 40, h: 40 })

  const [phase, setPhase] = useState<Phase>('menu')
  const [gold, setGold] = useState(250)
  const [lives, setLives] = useState(25)
  const [wave, setWave] = useState(0)
  const [score, setScore] = useState(0)
  const [speedMult, setSpeedMultState] = useState(1)
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null)
  const [placingType, setPlacingType] = useState<TowerType | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [abilityCooldowns, setAbilityCooldowns] = useState<number[]>([0, 0, 0])
  const [abilityActive, setAbilityActive] = useState<string | null>(null)

  const syncHud = useCallback(() => {
    const gs = gsRef.current; if (!gs) return
    setGold(gs.gold); setLives(gs.lives); setWave(gs.wave); setScore(gs.score)
    setSpeedMultState(gs.speedMult); setSelectedTowerId(gs.selectedTowerId)
    setPlacingType(gs.placingType); setPhase(gs.phase)
    setAbilityActive(gs.abilityActive)
    const now = performance.now()
    setAbilityCooldowns(gs.abilities.map(a => {
      const elapsed = now - a.lastUsed
      return Math.max(0, 1 - elapsed / a.cooldown)
    }))
  }, [])

  const initGS = useCallback((diff: Difficulty): GS => {
    const goldMult = diff === 'easy' ? 1.3 : diff === 'hard' ? 0.8 : 1
    const livesMult = diff === 'easy' ? 1.5 : diff === 'hard' ? 0.7 : 1
    return {
      phase: 'prep', wave: 0, gold: Math.floor(250 * goldMult),
      lives: Math.floor(25 * livesMult), score: 0, speedMult: 1, difficulty: diff,
      enemies: [], towers: [], projectiles: [], particles: [], damageNumbers: [],
      spawnQueue: [], nextSpawnAt: 0, frameCount: 0, idCounter: 1,
      abilities: ABILITIES.map(a => ({ ...a, lastUsed: -999999 })),
      abilityActive: null, selectedTowerId: null, placingType: null,
      gridOccupied: new Set(PATH_CELLS),
    }
  }, [])

  // ── Drawing ──────────────────────────────────────────────────────────────────
  const draw = useCallback((gs: GS, now: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const { w: cw, h: ch } = cellRef.current
    const W = canvas.width, H = canvas.height
    // background
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
    // grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${c},${r}`
        if (PATH_CELLS.has(key)) {
          ctx.fillStyle = '#0a1f1f'
          ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 8
          ctx.fillRect(c * cw, r * ch, cw, ch)
          ctx.strokeStyle = '#00ffcc33'; ctx.lineWidth = 1
          ctx.strokeRect(c * cw, r * ch, cw, ch)
          ctx.shadowBlur = 0
        } else {
          ctx.fillStyle = '#0a0a1a'
          ctx.fillRect(c * cw, r * ch, cw, ch)
          ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 0.5
          ctx.strokeRect(c * cw, r * ch, cw, ch)
        }
      }
    }
    // path glow overlay
    ctx.strokeStyle = '#00ffcc'
    ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 16; ctx.lineWidth = 3
    ctx.beginPath()
    for (let i = 0; i < WAYPOINTS.length; i++) {
      const [wx, wy] = WAYPOINTS[i]
      const px = (wx + 0.5) * cw, py = (wy + 0.5) * ch
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke(); ctx.shadowBlur = 0
    // placing preview
    if (gs.placingType) {
      const def = TOWER_DEFS[gs.placingType]
      ctx.fillStyle = def.color + '22'; ctx.strokeStyle = def.color + '88'
      ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!gs.gridOccupied.has(`${c},${r}`)) {
            ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2)
          }
        }
      }
      ctx.setLineDash([])
    }
    // towers
    for (const t of gs.towers) {
      drawTower(ctx, t, cw, ch, t.id === gs.selectedTowerId)
    }
    // range ring for selected tower
    if (gs.selectedTowerId !== null) {
      const t = gs.towers.find(x => x.id === gs.selectedTowerId)
      if (t) {
        const stats = getTowerStats(t)
        const cx = (t.col + 0.5) * cw, cy = (t.row + 0.5) * ch
        ctx.strokeStyle = TOWER_DEFS[t.type].color + '55'
        ctx.lineWidth = 1; ctx.setLineDash([5, 5])
        ctx.beginPath(); ctx.arc(cx, cy, stats.range * cw, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])
      }
    }
    // projectiles
    for (const p of gs.projectiles) {
      if (p.dead) continue
      ctx.shadowColor = p.color; ctx.shadowBlur = 10
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }
    // enemies
    for (const e of gs.enemies) {
      if (e.dead || e.reachedEnd) continue
      drawEnemy(ctx, e, now)
    }
    // particles
    for (const p of gs.particles) {
      const a = p.life / p.maxLife
      ctx.globalAlpha = a; ctx.fillStyle = p.color
      ctx.shadowColor = p.color; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
    // damage numbers
    for (const dn of gs.damageNumbers) {
      ctx.globalAlpha = dn.alpha
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`-${dn.value}`, dn.x, dn.y)
    }
    ctx.globalAlpha = 1
  }, [])

  // ── Segment travel ────────────────────────────────────────────────────────────
  function posOnPath(seg: number, prog: number): { x: number; y: number } {
    const cw = cellRef.current.w, ch = cellRef.current.h
    if (seg >= WAYPOINTS.length - 1) {
      const [wx, wy] = WAYPOINTS[WAYPOINTS.length - 1]
      return { x: (wx + 0.5) * cw, y: (wy + 0.5) * ch }
    }
    const [ax, ay] = WAYPOINTS[seg]; const [bx, by] = WAYPOINTS[seg + 1]
    return {
      x: ((ax + (bx - ax) * prog) + 0.5) * cw,
      y: ((ay + (by - ay) * prog) + 0.5) * ch,
    }
  }
  function segLen(seg: number): number {
    const [ax, ay] = WAYPOINTS[seg]; const [bx, by] = WAYPOINTS[seg + 1]
    return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────
  const gameLoop = useCallback((prevTs: number, ts: number) => {
    const gs = gsRef.current; if (!gs) return
    const now = performance.now()
    if (gs.phase !== 'wave' && gs.phase !== 'prep') { draw(gs, now); return }

    const rawDt = Math.min((ts - prevTs) / 1000, 0.05)
    const dt = rawDt * gs.speedMult
    gs.frameCount++

    // spawn
    if (gs.phase === 'wave' && gs.spawnQueue.length > 0) {
      if (now >= gs.nextSpawnAt) {
        const entry = gs.spawnQueue.shift()!
        const def = ENEMY_DEFS[entry.type]
        const hpMult = HP_MULT[Math.min(gs.wave - 1, 14)]
        const e: Enemy = {
          id: gs.idCounter++, type: entry.type,
          hp: Math.floor(def.baseHp * hpMult), maxHp: Math.floor(def.baseHp * hpMult),
          speed: def.baseSpeed * 40, baseSpeed: def.baseSpeed * 40,
          seg: 0, prog: 0, x: 0, y: 0,
          reward: def.reward, armor: def.armor,
          flying: def.flying, stealth: def.stealth, revealed: false,
          slowUntil: 0, freezeUntil: 0,
          dead: false, reachedEnd: false,
        }
        const pos = posOnPath(0, 0); e.x = pos.x; e.y = pos.y
        gs.enemies.push(e)
        gs.nextSpawnAt = now + entry.delay
      }
    }

    // move enemies
    const cw = cellRef.current.w
    for (const e of gs.enemies) {
      if (e.dead || e.reachedEnd) continue
      if (e.freezeUntil > now) continue
      const effSpeed = e.slowUntil > now ? e.speed * 0.55 : e.speed
      let dist = effSpeed * dt
      while (dist > 0 && e.seg < WAYPOINTS.length - 1) {
        const sl = segLen(e.seg) * cw
        const remaining = sl * (1 - e.prog)
        if (dist < remaining) {
          e.prog += dist / sl
          break
        } else {
          dist -= remaining
          e.seg++; e.prog = 0
        }
      }
      const pos = posOnPath(e.seg, e.prog); e.x = pos.x; e.y = pos.y
      if (e.seg >= WAYPOINTS.length - 1) {
        e.reachedEnd = true
        gs.lives = Math.max(0, gs.lives - 1)
        if (gs.lives <= 0) { gs.phase = 'gameover'; syncHud(); return }
      }
    }

    // tower shooting
    for (const t of gs.towers) {
      if (t.cooldown > 0) { t.cooldown -= dt; continue }
      const stats = getTowerStats(t)
      const tcx = (t.col + 0.5) * cellRef.current.w
      const tcy = (t.row + 0.5) * cellRef.current.h
      const rangePx = stats.range * cellRef.current.w

      // find target (nearest to end = highest seg+prog, or for flyers check ignoreFlying)
      let target: Enemy | null = null
      let bestProgress = -Infinity
      for (const e of gs.enemies) {
        if (e.dead || e.reachedEnd) continue
        if (e.flying && !TOWER_DEFS[t.type].ignoreFlying && t.type !== 'laser' && t.type !== 'tesla' && t.type !== 'railgun') continue
        if (e.stealth && !e.revealed) continue
        const dist = Math.hypot(e.x - tcx, e.y - tcy)
        if (dist > rangePx) continue
        const prog = e.seg + e.prog
        if (prog > bestProgress) { bestProgress = prog; target = e }
      }
      if (!target) continue
      t.angle = Math.atan2(target.y - tcy, target.x - tcx)
      t.cooldown = stats.fireRate

      // reveal stealth
      if (target.stealth) target.revealed = true

      const proj: Projectile = {
        id: gs.idCounter++, towerId: t.id, towerType: t.type,
        x: tcx, y: tcy, tx: target.x, ty: target.y,
        enemyId: target.id,
        speed: t.type === 'railgun' && t.level === 3 ? 9999 : 350 + t.level * 60,
        damage: stats.damage, aoe: stats.aoe,
        slowMult: stats.slowMult, freezeDur: stats.freezeDur,
        chainLeft: stats.chain - 1, piercing: stats.piercing,
        dead: false, color: TOWER_DEFS[t.type].color,
      }
      // extra beams for laser T2/T3
      for (let b = 0; b < stats.beams; b++) {
        if (b > 0) {
          const extraTarget = gs.enemies.find(e2 =>
            !e2.dead && !e2.reachedEnd && e2.id !== target!.id &&
            Math.hypot(e2.x - tcx, e2.y - tcy) <= rangePx
          )
          if (extraTarget) {
            gs.projectiles.push({
              ...proj, id: gs.idCounter++, enemyId: extraTarget.id,
              tx: extraTarget.x, ty: extraTarget.y,
            })
          }
        } else {
          gs.projectiles.push({ ...proj })
        }
      }
    }

    // move projectiles & apply damage
    for (const p of gs.projectiles) {
      if (p.dead) continue
      const target = gs.enemies.find(e => e.id === p.enemyId)
      if (!target || target.dead || target.reachedEnd) { p.dead = true; continue }
      p.tx = target.x; p.ty = target.y
      const dist = Math.hypot(p.tx - p.x, p.ty - p.y)
      const step = p.speed * dt
      if (step >= dist) {
        // hit
        p.dead = true
        applyDamage(gs, target, p.damage, p.aoe, p.slowMult, p.freezeDur, p.color, now)
        // chain lightning
        if (p.chainLeft > 0) {
          const chained = gs.enemies
            .filter(e => !e.dead && !e.reachedEnd && e.id !== target.id && Math.hypot(e.x - target.x, e.y - target.y) < 80)
            .slice(0, p.chainLeft)
          for (const ce of chained) {
            gs.projectiles.push({
              id: gs.idCounter++, towerId: p.towerId, towerType: p.towerType,
              x: target.x, y: target.y, tx: ce.x, ty: ce.y,
              enemyId: ce.id, speed: p.speed,
              damage: p.damage * 0.7, aoe: 0,
              slowMult: p.slowMult, freezeDur: p.freezeDur,
              chainLeft: p.chainLeft - 1, piercing: false,
              dead: false, color: p.color,
            })
          }
        }
      } else {
        const ratio = step / dist
        p.x += (p.tx - p.x) * ratio; p.y += (p.ty - p.y) * ratio
      }
    }
    gs.projectiles = gs.projectiles.filter(p => !p.dead)

    // particles
    for (const p of gs.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt }
    gs.particles = gs.particles.filter(p => p.life > 0)
    // damage numbers
    for (const dn of gs.damageNumbers) { dn.y += dn.vy * dt; dn.alpha -= dt * 1.5 }
    gs.damageNumbers = gs.damageNumbers.filter(dn => dn.alpha > 0)
    // clean dead enemies
    gs.enemies = gs.enemies.filter(e => !e.dead && !e.reachedEnd)

    // wave clear check
    if (gs.phase === 'wave' && gs.spawnQueue.length === 0 && gs.enemies.length === 0) {
      const bonus = 30 + gs.wave * 10 + (WAVES[gs.wave - 1]?.bonusGold ?? 0)
      gs.gold += bonus
      gs.score += bonus * 10
      if (gs.wave >= TOTAL_WAVES) {
        gs.phase = 'victory'
      } else {
        gs.phase = 'prep'
      }
      syncHud()
    }

    // sync HUD every 6 frames
    if (gs.frameCount % 6 === 0) syncHud()
    draw(gs, now)
  }, [draw, syncHud])

  function applyDamage(gs: GS, e: Enemy, dmg: number, aoe: number, slowMult: number, freezeDur: number, color: string, now: number) {
    if (aoe > 0) {
      const aoePx = aoe * cellRef.current.w
      for (const other of gs.enemies) {
        if (other.dead || other.reachedEnd) continue
        if (Math.hypot(other.x - e.x, other.y - e.y) <= aoePx) {
          dealDmg(gs, other, dmg, slowMult, freezeDur, color, now)
        }
      }
    } else {
      dealDmg(gs, e, dmg, slowMult, freezeDur, color, now)
    }
  }

  function dealDmg(gs: GS, e: Enemy, dmg: number, slowMult: number, freezeDur: number, _color: string, now: number) {
    const actual = Math.max(1, Math.floor(dmg * (1 - e.armor / 100)))
    e.hp -= actual
    gs.damageNumbers.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y - 15, value: actual, alpha: 1, vy: -40 })
    gs.score += actual
    if (slowMult < 1) e.slowUntil = now + 2000
    if (freezeDur > 0) e.freezeUntil = now + freezeDur
    if (e.hp <= 0) {
      e.dead = true
      gs.gold += e.reward
      gs.score += e.reward * 5
      spawnParticles(gs, e)
      // spawn minions
      const def = ENEMY_DEFS[e.type]
      if (def.spawnsOn) {
        const minionDef = ENEMY_DEFS[def.spawnsOn]
        for (let i = 0; i < def.spawnCount; i++) {
          const minion: Enemy = {
            id: gs.idCounter++, type: def.spawnsOn,
            hp: minionDef.baseHp, maxHp: minionDef.baseHp,
            speed: minionDef.baseSpeed * 40, baseSpeed: minionDef.baseSpeed * 40,
            seg: e.seg, prog: e.prog, x: e.x, y: e.y,
            reward: Math.floor(minionDef.reward / 2), armor: minionDef.armor,
            flying: minionDef.flying, stealth: false, revealed: false,
            slowUntil: 0, freezeUntil: 0,
            dead: false, reachedEnd: false,
          }
          gs.enemies.push(minion)
        }
      }
    }
  }

  function spawnParticles(gs: GS, e: Enemy) {
    const color = ENEMY_DEFS[e.type].color
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.4
      const spd = 60 + Math.random() * 80
      gs.particles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.2, maxLife: 0.5,
        color, size: 3 + Math.random() * 3,
      })
    }
  }

  // ── RAF management ────────────────────────────────────────────────────────────
  useEffect(() => {
    let prevTs = performance.now()
    const loop = (ts: number) => {
      gameLoop(prevTs, ts)
      prevTs = ts
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [gameLoop])

  // ── Resize ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current; const cont = containerRef.current
      if (!canvas || !cont) return
      const W = cont.clientWidth, H = cont.clientHeight
      canvas.width = W; canvas.height = H
      const cw = Math.floor(W / COLS), ch = Math.floor(H / ROWS)
      cellRef.current = { w: cw, h: ch }
    }
    const obs = new ResizeObserver(resize)
    if (containerRef.current) obs.observe(containerRef.current)
    resize()
    return () => obs.disconnect()
  }, [])

  // ── Start game ────────────────────────────────────────────────────────────────
  const startGame = useCallback((diff: Difficulty) => {
    const gs = initGS(diff)
    gsRef.current = gs
    syncHud()
  }, [initGS, syncHud])

  // ── Launch wave ───────────────────────────────────────────────────────────────
  const launchWave = useCallback(() => {
    const gs = gsRef.current; if (!gs || gs.phase !== 'prep') return
    gs.wave++
    const waveDef = WAVES[gs.wave - 1]
    if (!waveDef) return
    const queue: { type: EnemyType; delay: number }[] = []
    for (const entry of waveDef.enemies) {
      for (let i = 0; i < entry.count; i++) queue.push({ type: entry.type, delay: entry.interval })
    }
    // shuffle slightly for variety
    gs.spawnQueue = queue
    gs.nextSpawnAt = performance.now() + 500
    gs.phase = 'wave'
    syncHud()
  }, [syncHud])

  // ── Canvas click ──────────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const gs = gsRef.current; if (!gs) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const cw = cellRef.current.w, ch = cellRef.current.h
    const col = Math.floor(mx / cw), row = Math.floor(my / ch)

    // ability: orbital strike
    if (gs.abilityActive === 'Orbital Strike') {
      const now = performance.now()
      const aIdx = gs.abilities.findIndex(a => a.name === 'Orbital Strike')
      if (aIdx >= 0 && now - gs.abilities[aIdx].lastUsed >= gs.abilities[aIdx].cooldown) {
        gs.abilities[aIdx].lastUsed = now
        const cx = col * cw + cw / 2, cy = row * ch + ch / 2
        const radius = 2.5 * cw
        for (const en of gs.enemies) {
          if (!en.dead && !en.reachedEnd && Math.hypot(en.x - cx, en.y - cy) <= radius) {
            dealDmg(gs, en, 500, 1, 0, '#f97316', now)
          }
        }
        for (let i = 0; i < 16; i++) {
          const angle = (Math.PI * 2 / 16) * i
          gs.particles.push({ x: cx, y: cy, vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150, life: 0.6, maxLife: 0.6, color: '#f97316', size: 5 })
        }
        gs.abilityActive = null
      }
      syncHud(); return
    }

    if (gs.placingType) {
      const key = `${col},${row}`
      if (!gs.gridOccupied.has(key) && col >= 0 && col < COLS && row >= 0 && row < ROWS) {
        const def = TOWER_DEFS[gs.placingType]
        if (gs.gold >= def.cost) {
          gs.gold -= def.cost
          const t: Tower = {
            id: gs.idCounter++, type: gs.placingType, col, row,
            level: 1, cooldown: 0, invested: def.cost, angle: 0,
          }
          gs.towers.push(t); gs.gridOccupied.add(key)
          gs.placingType = null
          syncHud()
        }
      }
      return
    }
    // select tower
    const clicked = gs.towers.find(t => t.col === col && t.row === row)
    gs.selectedTowerId = clicked ? clicked.id : null
    syncHud()
  }, [syncHud])

  // ── UI actions ────────────────────────────────────────────────────────────────
  const selectPlacing = useCallback((type: TowerType) => {
    const gs = gsRef.current; if (!gs) return
    gs.placingType = gs.placingType === type ? null : type
    gs.selectedTowerId = null
    syncHud()
  }, [syncHud])

  const upgradeTower = useCallback(() => {
    const gs = gsRef.current; if (!gs || gs.selectedTowerId === null) return
    const t = gs.towers.find(x => x.id === gs.selectedTowerId); if (!t) return
    const cost = getUpgradeCost(t); if (cost === null || gs.gold < cost) return
    gs.gold -= cost; t.level++; t.invested += cost
    syncHud()
  }, [syncHud])

  const sellTower = useCallback(() => {
    const gs = gsRef.current; if (!gs || gs.selectedTowerId === null) return
    const idx = gs.towers.findIndex(x => x.id === gs.selectedTowerId); if (idx < 0) return
    const t = gs.towers[idx]
    gs.gold += getSellValue(t)
    gs.gridOccupied.delete(`${t.col},${t.row}`)
    gs.towers.splice(idx, 1)
    gs.selectedTowerId = null
    syncHud()
  }, [syncHud])

  const toggleSpeed = useCallback(() => {
    const gs = gsRef.current; if (!gs) return
    gs.speedMult = gs.speedMult === 1 ? 2 : gs.speedMult === 2 ? 3 : 1
    syncHud()
  }, [syncHud])

  const useAbility = useCallback((idx: number) => {
    const gs = gsRef.current; if (!gs) return
    const a = gs.abilities[idx]; if (!a) return
    const now = performance.now()
    if (now - a.lastUsed < a.cooldown) return
    if (a.name === 'Orbital Strike') {
      gs.abilityActive = gs.abilityActive === 'Orbital Strike' ? null : 'Orbital Strike'
      syncHud(); return
    }
    if (a.name === 'EMP Pulse') {
      a.lastUsed = now
      const until = now + 3000
      for (const e of gs.enemies) { if (!e.dead) e.freezeUntil = until }
    }
    if (a.name === 'Emergency Funds') {
      a.lastUsed = now; gs.gold += 100
    }
    syncHud()
  }, [syncHud])

  const closeSelection = useCallback(() => {
    const gs = gsRef.current; if (!gs) return
    gs.selectedTowerId = null; gs.placingType = null; syncHud()
  }, [syncHud])

  // ── Derived UI state ──────────────────────────────────────────────────────────
  const selectedTower = gsRef.current?.towers.find(t => t.id === selectedTowerId) ?? null
  const selectedStats = selectedTower ? getTowerStats(selectedTower) : null
  const upgradeCost = selectedTower ? getUpgradeCost(selectedTower) : null
  const sellVal = selectedTower ? getSellValue(selectedTower) : null

  const towerBtnStyle = (type: TowerType): React.CSSProperties => ({
    padding: '6px 10px', borderRadius: 6, border: `2px solid ${TOWER_DEFS[type].color}`,
    background: placingType === type ? TOWER_DEFS[type].color + '44' : SURFACE2,
    color: TOWER_DEFS[type].color, cursor: 'pointer', fontSize: 12, fontWeight: 700,
    opacity: (gsRef.current?.gold ?? 0) < TOWER_DEFS[type].cost ? 0.5 : 1,
  })
  const upBtnStyle = (canAfford: boolean): React.CSSProperties => ({
    padding: '7px 10px', borderRadius: 6, border: '2px solid #00ffcc',
    background: canAfford ? '#00ffcc22' : '#1f2937', color: canAfford ? '#00ffcc' : MUTED,
    cursor: canAfford ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 12,
  })
  const styles: Record<string, React.CSSProperties> = {
    root: { position: 'relative', width: '100%', height: '100%', background: BG, fontFamily: 'monospace', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: TEXT },
    canvasArea: { flex: 1, position: 'relative', minHeight: 0 },
    canvas: { display: 'block', width: '100%', height: '100%', cursor: placingType ? 'crosshair' : abilityActive === 'Orbital Strike' ? 'cell' : 'default' },
    topBar: { display: 'flex', alignItems: 'center', gap: 16, padding: '6px 12px', background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, flexWrap: 'wrap' },
    stat: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 },
    abilityBar: { display: 'flex', gap: 8, padding: '4px 12px', background: SURFACE2, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 },
    bottomPanel: { display: 'flex', gap: 6, padding: '6px 12px', background: SURFACE, borderTop: `1px solid ${BORDER}`, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' },
    waveBtn: { padding: '8px 18px', borderRadius: 8, border: '2px solid #00ffcc', background: '#00ffcc22', color: '#00ffcc', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
    speedBtn: { padding: '4px 10px', borderRadius: 6, border: '1px solid #facc15', background: '#facc1522', color: '#facc15', cursor: 'pointer', fontSize: 12 },
    sidePanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 180, background: SURFACE + 'ee', borderLeft: `1px solid ${BORDER}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 },
    sellBtn: { padding: '7px 10px', borderRadius: 6, border: '2px solid #ef4444', background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
    closeBtn: { padding: '4px 8px', borderRadius: 4, border: '1px solid ' + BORDER, background: SURFACE2, color: MUTED, cursor: 'pointer', alignSelf: 'flex-end', fontSize: 11 },
  }

  // ── Menu screen ───────────────────────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 4, color: '#00ffcc', textShadow: '0 0 30px #00ffcc, 0 0 60px #00ffcc55' }}>
            CYBER DEFENSE
          </div>
          <div style={{ color: MUTED, marginTop: 8, fontSize: 13 }}>Defend the grid. Destroy the swarm.</div>
          <div style={{ margin: '24px 0', display: 'flex', gap: 10, justifyContent: 'center' }}>
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                border: `2px solid ${difficulty === d ? '#00ffcc' : BORDER}`,
                background: difficulty === d ? '#00ffcc22' : SURFACE2,
                color: difficulty === d ? '#00ffcc' : MUTED,
              }}>{d.toUpperCase()}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 20 }}>
            {difficulty === 'easy' ? 'Gold ×1.3 | Lives ×1.5' : difficulty === 'hard' ? 'Gold ×0.8 | Lives ×0.7' : 'Standard balance'}
          </div>
          <button onClick={() => startGame(difficulty)} style={{
            padding: '14px 40px', borderRadius: 10, fontSize: 18, fontWeight: 900, cursor: 'pointer',
            border: '2px solid #00ffcc', background: '#00ffcc22', color: '#00ffcc',
            boxShadow: '0 0 24px #00ffcc55', letterSpacing: 2,
          }}>DÉMARRER</button>
          {onBack && <div style={{ marginTop: 16 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13 }}>← Retour</button>
          </div>}
        </div>
      </div>
    )
  }

  // ── Game over / Victory ───────────────────────────────────────────────────────
  if (phase === 'gameover' || phase === 'victory') {
    const stars = phase === 'victory' ? (lives > 15 ? 3 : lives > 5 ? 2 : 1) : 0
    return (
      <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 360 }}>
          {phase === 'victory' ? (
            <>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#facc15', textShadow: '0 0 30px #facc15' }}>VICTOIRE</div>
              <div style={{ fontSize: 28, margin: '8px 0' }}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
            </>
          ) : (
            <div style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', textShadow: '0 0 30px #ef4444' }}>GAME OVER</div>
          )}
          <div style={{ margin: '16px 0', color: MUTED, fontSize: 14 }}>
            <div>Score: <span style={{ color: TEXT, fontWeight: 700 }}>{score.toLocaleString()}</span></div>
            <div>Vagues: <span style={{ color: TEXT }}>{wave}/{TOTAL_WAVES}</span></div>
            <div>Vies restantes: <span style={{ color: TEXT }}>{lives}</span></div>
          </div>
          <button onClick={() => startGame(difficulty)} style={{
            padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            border: '2px solid #00ffcc', background: '#00ffcc22', color: '#00ffcc', margin: '4px',
          }}>REJOUER</button>
          <button onClick={() => setPhase('menu')} style={{
            padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${BORDER}`, background: SURFACE2, color: MUTED, margin: '4px',
          }}>MENU</button>
        </div>
      </div>
    )
  }

  // ── In-game UI ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Top HUD */}
      <div style={styles.topBar}>
        <span style={{ ...styles.stat, color: '#ef4444' }}>❤️ {lives}</span>
        <span style={{ ...styles.stat, color: '#facc15' }}>💰 {gold}</span>
        <span style={{ ...styles.stat, color: '#00ffcc' }}>Vague {wave}/{TOTAL_WAVES}</span>
        <span style={{ ...styles.stat, color: '#a855f7' }}>⭐ {score.toLocaleString()}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleSpeed} style={styles.speedBtn}>{speedMult}x</button>
          {onBack && <button onClick={onBack} style={{ ...styles.speedBtn, borderColor: BORDER, color: MUTED }}>← Quitter</button>}
        </div>
      </div>

      {/* Ability bar */}
      <div style={styles.abilityBar}>
        {gsRef.current?.abilities.map((a, i) => {
          const cd = abilityCooldowns[i]
          const ready = cd === 0
          const isActive = abilityActive === a.name
          return (
            <button key={a.name} onClick={() => useAbility(i)} title={a.description} style={{
              position: 'relative', padding: '4px 12px', borderRadius: 6, cursor: ready ? 'pointer' : 'not-allowed',
              border: `2px solid ${isActive ? '#f97316' : ready ? '#00ffcc' : BORDER}`,
              background: isActive ? '#f9731622' : ready ? '#00ffcc11' : SURFACE,
              color: ready ? TEXT : MUTED, fontSize: 12, overflow: 'hidden',
            }}>
              {cd > 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(1 - cd) * 100}%`, background: '#00ffcc22', transition: 'width 0.1s' }} />}
              <span style={{ position: 'relative' }}>{a.icon} {a.name}</span>
            </button>
          )
        })}
      </div>

      {/* Canvas area */}
      <div ref={containerRef} style={styles.canvasArea}>
        <canvas ref={canvasRef} style={styles.canvas} onClick={handleCanvasClick} />
        {/* Tower info panel */}
        {selectedTower && selectedStats && (
          <div style={styles.sidePanel}>
            <button onClick={closeSelection} style={styles.closeBtn}>✕ Fermer</button>
            <div style={{ fontWeight: 900, color: TOWER_DEFS[selectedTower.type].color, fontSize: 14 }}>
              {TOWER_DEFS[selectedTower.type].name}
            </div>
            <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: TOWER_DEFS[selectedTower.type].color + '33', color: TOWER_DEFS[selectedTower.type].color, fontWeight: 700 }}>
              Tier {selectedTower.level}
            </div>
            <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.6 }}>
              <div>Dégâts: <span style={{ color: TEXT }}>{Math.round(selectedStats.damage)}</span></div>
              <div>Portée: <span style={{ color: TEXT }}>{selectedStats.range.toFixed(1)}</span></div>
              <div>Cadence: <span style={{ color: TEXT }}>{selectedStats.fireRate.toFixed(1)}s</span></div>
              {selectedStats.aoe > 0 && <div>AoE: <span style={{ color: TEXT }}>{selectedStats.aoe.toFixed(1)}</span></div>}
              {selectedStats.chain > 1 && <div>Chaînes: <span style={{ color: TEXT }}>{selectedStats.chain}</span></div>}
              {selectedStats.freezeDur > 0 && <div>Gel: <span style={{ color: '#93c5fd' }}>{(selectedStats.freezeDur / 1000).toFixed(1)}s</span></div>}
            </div>
            {upgradeCost !== null && (
              <button onClick={upgradeTower} style={upBtnStyle(gold >= upgradeCost)}>
                ↑ Améliorer {upgradeCost}💰
              </button>
            )}
            {upgradeCost === null && <div style={{ color: '#facc15', fontSize: 11, fontWeight: 700 }}>MAX LEVEL</div>}
            <button onClick={sellTower} style={styles.sellBtn}>
              Vendre {sellVal}💰
            </button>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={styles.bottomPanel}>
        {TOWER_TYPES.map(type => (
          <button key={type} onClick={() => selectPlacing(type)} style={towerBtnStyle(type)}>
            <div style={{ fontSize: 11, marginBottom: 2 }}>{TOWER_DEFS[type].name}</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>{TOWER_DEFS[type].cost}💰</div>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          {phase === 'prep' && (
            <button onClick={launchWave} style={styles.waveBtn}>
              ▶ Vague {wave + 1}/{TOTAL_WAVES}
            </button>
          )}
          {phase === 'wave' && (
            <div style={{ color: '#00ffcc', fontSize: 13, fontWeight: 700 }}>
              Vague {wave} en cours…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
