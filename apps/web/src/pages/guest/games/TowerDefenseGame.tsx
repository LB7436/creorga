import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  Coins,
  Crosshair,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import * as THREE from 'three'
import { ACCENT, ACCENT2, BG, BORDER, MUTED, SURFACE, SURFACE2, TEXT } from './theme'

type Phase = 'menu' | 'prep' | 'wave' | 'victory' | 'defeat'
type Difficulty = 'easy' | 'normal' | 'hard'
type TowerType = 'pulse' | 'cryo' | 'rail' | 'storm'
type EnemyType = 'runner' | 'brute' | 'drone' | 'warden'

interface TowerDef {
  label: string
  short: string
  cost: number
  color: string
  range: number
  damage: number
  fireRate: number
  splash: number
  slow: number
}

interface EnemyDef {
  label: string
  color: string
  hp: number
  speed: number
  reward: number
  armor: number
  flying: boolean
  scale: number
}

interface Tower {
  id: number
  type: TowerType
  col: number
  row: number
  x: number
  z: number
  level: number
  cooldown: number
  invested: number
  yaw: number
}

interface Enemy {
  id: number
  type: EnemyType
  hp: number
  maxHp: number
  speed: number
  seg: number
  prog: number
  x: number
  z: number
  y: number
  slowUntil: number
  dead: boolean
  reachedEnd: boolean
}

interface Shot {
  id: number
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  born: number
  ttl: number
  width: number
}

interface Spark {
  id: number
  x: number
  y: number
  z: number
  color: string
  born: number
  ttl: number
  radius: number
}

interface SpawnItem {
  type: EnemyType
  delay: number
}

interface GameState {
  phase: Phase
  difficulty: Difficulty
  paused: boolean
  wave: number
  gold: number
  lives: number
  score: number
  speed: number
  idCounter: number
  selectedTowerId: number | null
  placingType: TowerType | null
  hoverCell: GridCell | null
  towers: Tower[]
  enemies: Enemy[]
  shots: Shot[]
  sparks: Spark[]
  spawnQueue: SpawnItem[]
  nextSpawnAt: number
  lastTick: number
  occupied: Set<string>
}

interface GridCell {
  col: number
  row: number
}

interface HudState {
  phase: Phase
  difficulty: Difficulty
  paused: boolean
  wave: number
  gold: number
  lives: number
  score: number
  speed: number
  selectedTowerId: number | null
  placingType: TowerType | null
  hoverCell: GridCell | null
}

interface ThreeRuntime {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  ground: THREE.Mesh
  hoverRing: THREE.Mesh
  rangeRing: THREE.Mesh
  towerMeshes: Map<number, THREE.Group>
  enemyMeshes: Map<number, THREE.Group>
  shotMeshes: Map<number, THREE.Object3D>
  sparkMeshes: Map<number, THREE.Object3D>
  resizeObserver: ResizeObserver
  dispose: () => void
}

const COLS = 12
const ROWS = 8
const CELL = 1.08
const TOTAL_WAVES = 9
const SELL_RATIO = 0.55

const PATH_POINTS: [number, number][] = [
  [-1, 4],
  [2, 4],
  [2, 1],
  [5, 1],
  [5, 6],
  [8, 6],
  [8, 2],
  [11, 2],
  [11, 5],
  [12, 5],
]

const PATH_CELLS = new Set<string>()
for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
  const [aCol, aRow] = PATH_POINTS[i]
  const [bCol, bRow] = PATH_POINTS[i + 1]
  if (aRow === bRow) {
    const min = Math.max(0, Math.min(aCol, bCol))
    const max = Math.min(COLS - 1, Math.max(aCol, bCol))
    for (let col = min; col <= max; col += 1) PATH_CELLS.add(cellKey(col, aRow))
  } else {
    const min = Math.max(0, Math.min(aRow, bRow))
    const max = Math.min(ROWS - 1, Math.max(aRow, bRow))
    for (let row = min; row <= max; row += 1) PATH_CELLS.add(cellKey(aCol, row))
  }
}

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  pulse: {
    label: 'Pulse',
    short: 'P',
    cost: 80,
    color: '#14f1d9',
    range: 2.75,
    damage: 22,
    fireRate: 0.62,
    splash: 0,
    slow: 0,
  },
  cryo: {
    label: 'Cryo',
    short: 'C',
    cost: 115,
    color: '#73a7ff',
    range: 2.55,
    damage: 12,
    fireRate: 0.95,
    splash: 0,
    slow: 0.48,
  },
  rail: {
    label: 'Rail',
    short: 'R',
    cost: 150,
    color: '#ffb15c',
    range: 3.75,
    damage: 72,
    fireRate: 1.7,
    splash: 0,
    slow: 0,
  },
  storm: {
    label: 'Storm',
    short: 'S',
    cost: 190,
    color: '#c084fc',
    range: 2.45,
    damage: 38,
    fireRate: 1.18,
    splash: 0.92,
    slow: 0,
  },
}

const TOWER_TYPES: TowerType[] = ['pulse', 'cryo', 'rail', 'storm']

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  runner: {
    label: 'Runner',
    color: '#8ee86b',
    hp: 70,
    speed: 1.16,
    reward: 9,
    armor: 0,
    flying: false,
    scale: 0.78,
  },
  brute: {
    label: 'Brute',
    color: '#ff6b6b',
    hp: 190,
    speed: 0.72,
    reward: 17,
    armor: 7,
    flying: false,
    scale: 1.05,
  },
  drone: {
    label: 'Drone',
    color: '#61d8ff',
    hp: 115,
    speed: 1.04,
    reward: 14,
    armor: 0,
    flying: true,
    scale: 0.72,
  },
  warden: {
    label: 'Warden',
    color: '#f7d560',
    hp: 640,
    speed: 0.48,
    reward: 65,
    armor: 14,
    flying: false,
    scale: 1.35,
  },
}

const WAVES: { entries: { type: EnemyType; count: number; gap: number }[]; bonus: number }[] = [
  { entries: [{ type: 'runner', count: 8, gap: 0.58 }], bonus: 35 },
  { entries: [{ type: 'runner', count: 9, gap: 0.5 }, { type: 'brute', count: 2, gap: 1.2 }], bonus: 45 },
  { entries: [{ type: 'runner', count: 8, gap: 0.42 }, { type: 'drone', count: 5, gap: 0.7 }], bonus: 55 },
  { entries: [{ type: 'brute', count: 7, gap: 0.82 }, { type: 'runner', count: 8, gap: 0.36 }], bonus: 70 },
  { entries: [{ type: 'drone', count: 10, gap: 0.45 }, { type: 'brute', count: 5, gap: 0.86 }], bonus: 85 },
  { entries: [{ type: 'warden', count: 1, gap: 1.4 }, { type: 'runner', count: 14, gap: 0.32 }], bonus: 105 },
  { entries: [{ type: 'brute', count: 10, gap: 0.64 }, { type: 'drone', count: 10, gap: 0.44 }], bonus: 125 },
  { entries: [{ type: 'warden', count: 2, gap: 1.6 }, { type: 'drone', count: 12, gap: 0.34 }], bonus: 150 },
  { entries: [{ type: 'warden', count: 3, gap: 1.35 }, { type: 'brute', count: 10, gap: 0.5 }, { type: 'runner', count: 18, gap: 0.25 }], bonus: 220 },
]

function cellKey(col: number, row: number) {
  return `${col},${row}`
}

function cellToWorld(col: number, row: number) {
  return {
    x: (col - (COLS - 1) / 2) * CELL,
    z: (row - (ROWS - 1) / 2) * CELL,
  }
}

function worldToCell(x: number, z: number): GridCell | null {
  const col = Math.round(x / CELL + (COLS - 1) / 2)
  const row = Math.round(z / CELL + (ROWS - 1) / 2)
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  return { col, row }
}

function pathWorldPoint(index: number) {
  const [col, row] = PATH_POINTS[index]
  return cellToWorld(col, row)
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.hypot(dx, dz)
}

function pathPosition(seg: number, prog: number) {
  const a = pathWorldPoint(seg)
  const b = pathWorldPoint(seg + 1)
  return {
    x: a.x + (b.x - a.x) * prog,
    z: a.z + (b.z - a.z) * prog,
  }
}

function pathSegmentLength(seg: number) {
  return distance(pathWorldPoint(seg), pathWorldPoint(seg + 1))
}

function createSpawnQueue(waveIndex: number): SpawnItem[] {
  const wave = WAVES[waveIndex]
  const queue: SpawnItem[] = []
  let first = true
  wave.entries.forEach((entry, entryIndex) => {
    for (let i = 0; i < entry.count; i += 1) {
      const delay = first ? 0.55 : entryIndex > 0 && i === 0 ? 1.25 : entry.gap
      queue.push({ type: entry.type, delay })
      first = false
    }
  })
  return queue
}

function difficultySettings(difficulty: Difficulty) {
  if (difficulty === 'easy') return { gold: 260, lives: 28, hp: 0.82, reward: 1.18 }
  if (difficulty === 'hard') return { gold: 190, lives: 16, hp: 1.22, reward: 0.88 }
  return { gold: 225, lives: 22, hp: 1, reward: 1 }
}

function createGameState(difficulty: Difficulty): GameState {
  const settings = difficultySettings(difficulty)
  return {
    phase: 'prep',
    difficulty,
    paused: false,
    wave: 0,
    gold: settings.gold,
    lives: settings.lives,
    score: 0,
    speed: 1,
    idCounter: 1,
    selectedTowerId: null,
    placingType: 'pulse',
    hoverCell: null,
    towers: [],
    enemies: [],
    shots: [],
    sparks: [],
    spawnQueue: [],
    nextSpawnAt: 0,
    lastTick: performance.now(),
    occupied: new Set(),
  }
}

function createMenuState(difficulty: Difficulty): GameState {
  return { ...createGameState(difficulty), phase: 'menu', placingType: null }
}

function toHud(gs: GameState): HudState {
  return {
    phase: gs.phase,
    difficulty: gs.difficulty,
    paused: gs.paused,
    wave: gs.wave,
    gold: gs.gold,
    lives: gs.lives,
    score: gs.score,
    speed: gs.speed,
    selectedTowerId: gs.selectedTowerId,
    placingType: gs.placingType,
    hoverCell: gs.hoverCell,
  }
}

function towerStats(tower: Tower) {
  const def = TOWER_DEFS[tower.type]
  const level = tower.level
  return {
    range: def.range + (level - 1) * 0.34,
    damage: def.damage * (level === 1 ? 1 : level === 2 ? 1.58 : 2.35),
    fireRate: def.fireRate * (level === 3 ? 0.78 : level === 2 ? 0.88 : 1),
    splash: def.splash * (level === 1 ? 1 : level === 2 ? 1.3 : 1.65),
    slow: def.slow,
  }
}

function upgradeCost(tower: Tower) {
  if (tower.level >= 3) return null
  return tower.level === 1 ? Math.round(TOWER_DEFS[tower.type].cost * 0.72) : Math.round(TOWER_DEFS[tower.type].cost * 1.08)
}

function sellValue(tower: Tower) {
  return Math.round(tower.invested * SELL_RATIO)
}

function canPlace(gs: GameState, cell: GridCell | null) {
  if (!cell || !gs.placingType) return false
  const key = cellKey(cell.col, cell.row)
  return !PATH_CELLS.has(key) && !gs.occupied.has(key) && gs.gold >= TOWER_DEFS[gs.placingType].cost
}

function spawnEnemy(gs: GameState, type: EnemyType, now: number) {
  const def = ENEMY_DEFS[type]
  const difficulty = difficultySettings(gs.difficulty)
  const waveScale = 1 + gs.wave * 0.18
  const maxHp = Math.round(def.hp * waveScale * difficulty.hp)
  const pos = pathPosition(0, 0)
  gs.enemies.push({
    id: gs.idCounter++,
    type,
    hp: maxHp,
    maxHp,
    speed: def.speed,
    seg: 0,
    prog: 0,
    x: pos.x,
    z: pos.z,
    y: def.flying ? 0.82 : 0.22,
    slowUntil: now - 1,
    dead: false,
    reachedEnd: false,
  })
}

function damageEnemy(gs: GameState, enemy: Enemy, amount: number, slow: number, now: number) {
  const def = ENEMY_DEFS[enemy.type]
  const hit = Math.max(1, amount - def.armor)
  enemy.hp -= hit
  if (slow > 0) enemy.slowUntil = Math.max(enemy.slowUntil, now + 1.65)
  if (enemy.hp <= 0 && !enemy.dead) {
    const reward = Math.round(def.reward * difficultySettings(gs.difficulty).reward)
    enemy.dead = true
    gs.gold += reward
    gs.score += reward * 12 + Math.round(enemy.maxHp * 0.5)
    gs.sparks.push({
      id: gs.idCounter++,
      x: enemy.x,
      y: enemy.y,
      z: enemy.z,
      color: def.color,
      born: now,
      ttl: 0.55,
      radius: 0.35 + def.scale * 0.15,
    })
  }
}

function launchWave(gs: GameState, now: number) {
  if (gs.phase !== 'prep' || gs.wave >= TOTAL_WAVES) return
  gs.phase = 'wave'
  gs.paused = false
  gs.wave += 1
  gs.spawnQueue = createSpawnQueue(gs.wave - 1)
  gs.nextSpawnAt = now + (gs.spawnQueue[0]?.delay ?? 0)
  gs.selectedTowerId = null
  gs.placingType = null
}

function stepSimulation(gs: GameState, nowMs: number) {
  if (gs.paused || gs.phase !== 'wave') return
  const rawDt = Math.min(0.05, Math.max(0, (nowMs - gs.lastTick) / 1000))
  const dt = rawDt * gs.speed
  const now = nowMs / 1000

  while (gs.spawnQueue.length > 0 && now >= gs.nextSpawnAt) {
    const next = gs.spawnQueue.shift()
    if (!next) break
    spawnEnemy(gs, next.type, now)
    gs.nextSpawnAt = now + (gs.spawnQueue[0]?.delay ?? 0)
  }

  for (const enemy of gs.enemies) {
    if (enemy.dead || enemy.reachedEnd) continue
    const slowMult = enemy.slowUntil > now ? 0.52 : 1
    let travel = enemy.speed * slowMult * dt
    while (travel > 0 && !enemy.reachedEnd) {
      const segLength = pathSegmentLength(enemy.seg)
      const remaining = (1 - enemy.prog) * segLength
      if (travel < remaining) {
        enemy.prog += travel / segLength
        travel = 0
      } else {
        travel -= remaining
        enemy.seg += 1
        enemy.prog = 0
        if (enemy.seg >= PATH_POINTS.length - 1) {
          enemy.reachedEnd = true
          gs.lives -= ENEMY_DEFS[enemy.type].flying ? 2 : 1
          gs.sparks.push({
            id: gs.idCounter++,
            x: enemy.x,
            y: enemy.y,
            z: enemy.z,
            color: '#ef4444',
            born: now,
            ttl: 0.6,
            radius: 0.6,
          })
          if (gs.lives <= 0) {
            gs.lives = 0
            gs.phase = 'defeat'
          }
        }
      }
    }
    if (!enemy.reachedEnd) {
      const pos = pathPosition(enemy.seg, enemy.prog)
      enemy.x = pos.x
      enemy.z = pos.z
    }
  }

  for (const tower of gs.towers) {
    if (tower.cooldown > 0) tower.cooldown -= dt
    if (tower.cooldown > 0) continue
    const stats = towerStats(tower)
    let target: Enemy | null = null
    let bestProgress = -1
    for (const enemy of gs.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue
      const dist = Math.hypot(enemy.x - tower.x, enemy.z - tower.z)
      if (dist > stats.range) continue
      const enemyProgress = enemy.seg + enemy.prog
      if (enemyProgress > bestProgress) {
        bestProgress = enemyProgress
        target = enemy
      }
    }
    if (!target) continue

    tower.yaw = Math.atan2(target.x - tower.x, target.z - tower.z)
    tower.cooldown = stats.fireRate
    const def = TOWER_DEFS[tower.type]
    const from = new THREE.Vector3(tower.x, 0.82 + tower.level * 0.08, tower.z)
    const to = new THREE.Vector3(target.x, target.y + 0.16, target.z)
    gs.shots.push({
      id: gs.idCounter++,
      from,
      to,
      color: def.color,
      born: now,
      ttl: tower.type === 'rail' ? 0.2 : 0.32,
      width: tower.type === 'rail' ? 0.045 : 0.03,
    })
    damageEnemy(gs, target, stats.damage, stats.slow, now)
    if (stats.splash > 0) {
      for (const enemy of gs.enemies) {
        if (enemy === target || enemy.dead || enemy.reachedEnd) continue
        const dist = Math.hypot(enemy.x - target.x, enemy.z - target.z)
        if (dist <= stats.splash) damageEnemy(gs, enemy, stats.damage * 0.55, 0, now)
      }
      gs.sparks.push({
        id: gs.idCounter++,
        x: target.x,
        y: 0.18,
        z: target.z,
        color: def.color,
        born: now,
        ttl: 0.38,
        radius: stats.splash,
      })
    }
  }

  gs.enemies = gs.enemies.filter((enemy) => !enemy.dead && !enemy.reachedEnd)
  gs.shots = gs.shots.filter((shot) => now - shot.born <= shot.ttl)
  gs.sparks = gs.sparks.filter((spark) => now - spark.born <= spark.ttl)

  if (gs.phase === 'wave' && gs.spawnQueue.length === 0 && gs.enemies.length === 0) {
    const wave = WAVES[gs.wave - 1]
    gs.gold += wave.bonus
    gs.score += wave.bonus * 10 + gs.lives * 5
    gs.phase = gs.wave >= TOTAL_WAVES ? 'victory' : 'prep'
    gs.placingType = gs.wave >= TOTAL_WAVES ? null : 'pulse'
  }
}

function makeMaterial(color: string, roughness = 0.55, metalness = 0.22) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: color,
    emissiveIntensity: 0.05,
  })
}

function createTowerMesh(tower: Tower) {
  const def = TOWER_DEFS[tower.type]
  const group = new THREE.Group()
  group.position.set(tower.x, 0, tower.z)
  group.userData.kind = 'tower'
  group.userData.id = tower.id

  const color = new THREE.Color(def.color)
  const baseMat = new THREE.MeshStandardMaterial({
    color: '#22283a',
    roughness: 0.48,
    metalness: 0.62,
    emissive: color,
    emissiveIntensity: 0.08,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.38,
    metalness: 0.48,
    emissive: color,
    emissiveIntensity: 0.5,
  })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.22, 8), baseMat)
  base.position.y = 0.11
  group.add(base)

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.58, 8), accentMat)
  column.position.y = 0.5
  group.add(column)

  const headGeometry =
    tower.type === 'rail'
      ? new THREE.BoxGeometry(0.24, 0.18, 0.72)
      : tower.type === 'storm'
        ? new THREE.OctahedronGeometry(0.29, 0)
        : new THREE.ConeGeometry(0.26, 0.38, 10)
  const head = new THREE.Mesh(headGeometry, accentMat)
  head.position.y = 0.89
  head.position.z = tower.type === 'rail' ? 0.2 : 0
  group.add(head)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.47, 0.016, 8, 32),
    new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.55 }),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.07
  group.add(ring)

  return group
}

function createEnemyMesh(enemy: Enemy) {
  const def = ENEMY_DEFS[enemy.type]
  const group = new THREE.Group()
  group.position.set(enemy.x, enemy.y, enemy.z)
  group.userData.kind = 'enemy'
  group.userData.id = enemy.id

  const color = new THREE.Color(def.color)
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.5,
    metalness: 0.28,
    emissive: color,
    emissiveIntensity: def.flying ? 0.36 : 0.18,
  })
  const body =
    enemy.type === 'brute'
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 * def.scale, 0), mat)
      : enemy.type === 'warden'
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.56, 7), mat)
        : enemy.type === 'drone'
          ? new THREE.Mesh(new THREE.OctahedronGeometry(0.27 * def.scale, 0), mat)
          : new THREE.Mesh(new THREE.SphereGeometry(0.24 * def.scale, 12, 8), mat)
  body.position.y = def.flying ? 0 : 0.1
  group.add(body)

  if (def.flying) {
    const wingMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.42 })
    const wingGeo = new THREE.BoxGeometry(0.55, 0.02, 0.11)
    const wing = new THREE.Mesh(wingGeo, wingMat)
    wing.position.y = -0.02
    group.add(wing)
  }

  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.055),
    new THREE.MeshBasicMaterial({ color: '#111827', transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  )
  hpBg.position.set(0, 0.58, 0)
  hpBg.name = 'hp-bg'
  group.add(hpBg)

  const hp = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.035),
    new THREE.MeshBasicMaterial({ color: '#22c55e', side: THREE.DoubleSide }),
  )
  hp.position.set(0, 0.585, 0.002)
  hp.name = 'hp'
  group.add(hp)
  return group
}

function createBeam(shot: Shot) {
  const dir = new THREE.Vector3().subVectors(shot.to, shot.from)
  const len = dir.length()
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: shot.color, transparent: true, opacity: 0.86 })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(shot.width, shot.width, len, 8), mat)
  beam.position.copy(shot.from).add(shot.to).multiplyScalar(0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  group.add(beam)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(shot.width * 2.5, 8, 6), mat)
  cap.position.copy(shot.to)
  group.add(cap)
  return group
}

function createSparkMesh(spark: Spark) {
  const group = new THREE.Group()
  group.position.set(spark.x, spark.y + 0.03, spark.z)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(0.02, spark.radius - 0.035), spark.radius, 48),
    new THREE.MeshBasicMaterial({ color: spark.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  group.add(ring)
  return group
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else if (material) material.dispose()
  })
}

function syncThree(runtime: ThreeRuntime, gs: GameState, now: number) {
  const towerIds = new Set(gs.towers.map((tower) => tower.id))
  for (const [id, group] of runtime.towerMeshes) {
    if (!towerIds.has(id)) {
      runtime.scene.remove(group)
      disposeObject(group)
      runtime.towerMeshes.delete(id)
    }
  }

  for (const tower of gs.towers) {
    let group = runtime.towerMeshes.get(tower.id)
    if (!group) {
      group = createTowerMesh(tower)
      runtime.scene.add(group)
      runtime.towerMeshes.set(tower.id, group)
    }
    group.position.set(tower.x, 0, tower.z)
    // Lerp sur le plus court chemin angulaire (sinon la tourelle fait un tour complet en croisant ±π)
    const yawDelta = ((tower.yaw - group.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
    group.rotation.y += yawDelta * 0.18
    group.scale.setScalar(1 + (tower.level - 1) * 0.08)
    // Opacité pleine par défaut ; on n'estompe que les tours non sélectionnées quand une sélection existe
    const anySelected = gs.selectedTowerId !== null
    const selected = gs.selectedTowerId === tower.id
    const targetOpacity = anySelected && !selected ? 0.6 : 1
    group.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.Material | undefined
      if (material && 'opacity' in material) {
        material.transparent = targetOpacity < 1
        material.opacity = targetOpacity
      }
    })
  }

  const enemyIds = new Set(gs.enemies.map((enemy) => enemy.id))
  for (const [id, group] of runtime.enemyMeshes) {
    if (!enemyIds.has(id)) {
      runtime.scene.remove(group)
      disposeObject(group)
      runtime.enemyMeshes.delete(id)
    }
  }

  for (const enemy of gs.enemies) {
    let group = runtime.enemyMeshes.get(enemy.id)
    if (!group) {
      group = createEnemyMesh(enemy)
      runtime.scene.add(group)
      runtime.enemyMeshes.set(enemy.id, group)
    }
    const bob = ENEMY_DEFS[enemy.type].flying ? Math.sin(now * 4 + enemy.id) * 0.08 : 0
    group.position.set(enemy.x, enemy.y + bob, enemy.z)
    group.lookAt(runtime.camera.position)
    const hp = group.getObjectByName('hp') as THREE.Mesh | undefined
    if (hp) {
      const pct = Math.max(0.04, enemy.hp / enemy.maxHp)
      hp.scale.x = pct
      hp.position.x = -(0.52 * (1 - pct)) / 2
      const hpMat = hp.material as THREE.MeshBasicMaterial
      hpMat.color.set(pct > 0.6 ? '#22c55e' : pct > 0.32 ? '#f59e0b' : '#ef4444')
    }
  }

  const shotIds = new Set(gs.shots.map((shot) => shot.id))
  for (const [id, object] of runtime.shotMeshes) {
    if (!shotIds.has(id)) {
      runtime.scene.remove(object)
      disposeObject(object)
      runtime.shotMeshes.delete(id)
    }
  }
  for (const shot of gs.shots) {
    let mesh = runtime.shotMeshes.get(shot.id)
    if (!mesh) {
      mesh = createBeam(shot)
      runtime.scene.add(mesh)
      runtime.shotMeshes.set(shot.id, mesh)
    }
    const fade = 1 - Math.min(1, (now - shot.born) / shot.ttl)
    mesh.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
      if (material) material.opacity = fade
    })
  }

  const sparkIds = new Set(gs.sparks.map((spark) => spark.id))
  for (const [id, object] of runtime.sparkMeshes) {
    if (!sparkIds.has(id)) {
      runtime.scene.remove(object)
      disposeObject(object)
      runtime.sparkMeshes.delete(id)
    }
  }
  for (const spark of gs.sparks) {
    let mesh = runtime.sparkMeshes.get(spark.id)
    if (!mesh) {
      mesh = createSparkMesh(spark)
      runtime.scene.add(mesh)
      runtime.sparkMeshes.set(spark.id, mesh)
    }
    const age = Math.min(1, (now - spark.born) / spark.ttl)
    mesh.scale.setScalar(0.35 + age * 1.4)
    mesh.traverse((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
      if (material) material.opacity = 0.75 * (1 - age)
    })
  }

  const hover = gs.hoverCell
  if (hover && gs.phase !== 'menu') {
    const world = cellToWorld(hover.col, hover.row)
    runtime.hoverRing.visible = true
    runtime.hoverRing.position.set(world.x, 0.055, world.z)
    const valid = canPlace(gs, hover)
    const mat = runtime.hoverRing.material as THREE.MeshBasicMaterial
    mat.color.set(valid ? '#22c55e' : '#ef4444')
    mat.opacity = valid ? 0.6 : 0.42
  } else {
    runtime.hoverRing.visible = false
  }

  const selectedTower = gs.selectedTowerId === null ? null : gs.towers.find((tower) => tower.id === gs.selectedTowerId) ?? null
  if (selectedTower) {
    const stats = towerStats(selectedTower)
    runtime.rangeRing.visible = true
    runtime.rangeRing.position.set(selectedTower.x, 0.065, selectedTower.z)
    runtime.rangeRing.scale.setScalar(stats.range)
    const mat = runtime.rangeRing.material as THREE.MeshBasicMaterial
    mat.color.set(TOWER_DEFS[selectedTower.type].color)
  } else if (gs.placingType && gs.hoverCell) {
    const world = cellToWorld(gs.hoverCell.col, gs.hoverCell.row)
    runtime.rangeRing.visible = true
    runtime.rangeRing.position.set(world.x, 0.065, world.z)
    runtime.rangeRing.scale.setScalar(TOWER_DEFS[gs.placingType].range)
    const mat = runtime.rangeRing.material as THREE.MeshBasicMaterial
    mat.color.set(TOWER_DEFS[gs.placingType].color)
  } else {
    runtime.rangeRing.visible = false
  }
}

function buildPath(scene: THREE.Scene) {
  const mat = new THREE.MeshStandardMaterial({
    color: '#182035',
    roughness: 0.7,
    metalness: 0.2,
    emissive: '#6d28d9',
    emissiveIntensity: 0.05,
  })
  for (const key of PATH_CELLS) {
    const [col, row] = key.split(',').map(Number)
    const world = cellToWorld(col, row)
    const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.96, 0.07, CELL * 0.96), mat)
    tile.position.set(world.x, 0.015, world.z)
    scene.add(tile)
  }
  const start = cellToWorld(0, 4)
  const end = cellToWorld(COLS - 1, 5)
  const startMat = makeMaterial('#22c55e', 0.45, 0.25)
  const endMat = makeMaterial('#ef4444', 0.45, 0.25)
  const startGate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 1.0), startMat)
  startGate.position.set(start.x - CELL * 0.72, 0.42, start.z)
  scene.add(startGate)
  const endGate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 1.0), endMat)
  endGate.position.set(end.x + CELL * 0.72, 0.42, end.z)
  scene.add(endGate)
}

function buildPads(scene: THREE.Scene) {
  const padMat = new THREE.MeshStandardMaterial({
    color: '#15182a',
    roughness: 0.75,
    metalness: 0.1,
    emissive: '#141a2f',
    emissiveIntensity: 0.04,
  })
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (PATH_CELLS.has(cellKey(col, row))) continue
      const { x, z } = cellToWorld(col, row)
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.035, 6), padMat)
      pad.position.set(x, 0.045, z)
      pad.rotation.y = Math.PI / 6
      scene.add(pad)
    }
  }
}

function createRuntime(container: HTMLDivElement) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG)
  scene.fog = new THREE.Fog(BG, 8, 19)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80)
  camera.position.set(0, 8.1, 8.8)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  container.appendChild(renderer.domElement)

  const ambient = new THREE.HemisphereLight('#e9e4ff', '#0a0d17', 1.35)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight('#ffffff', 1.9)
  sun.position.set(4, 9, 5)
  scene.add(sun)

  const groundMat = new THREE.MeshStandardMaterial({
    color: '#090b14',
    roughness: 0.82,
    metalness: 0.08,
  })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL + 1.2, ROWS * CELL + 1.2), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(Math.max(COLS, ROWS) * CELL + 1, Math.max(COLS, ROWS), '#2f3457', '#171b31')
  grid.position.y = 0.04
  scene.add(grid)
  buildPath(scene)
  buildPads(scene)

  const hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.48, 32),
    new THREE.MeshBasicMaterial({ color: '#22c55e', transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  )
  hoverRing.rotation.x = -Math.PI / 2
  hoverRing.visible = false
  scene.add(hoverRing)

  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.985, 1, 96),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
  )
  rangeRing.rotation.x = -Math.PI / 2
  rangeRing.visible = false
  scene.add(rangeRing)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const runtime: ThreeRuntime = {
    scene,
    camera,
    renderer,
    raycaster,
    pointer,
    ground,
    hoverRing,
    rangeRing,
    towerMeshes: new Map(),
    enemyMeshes: new Map(),
    shotMeshes: new Map(),
    sparkMeshes: new Map(),
    resizeObserver: new ResizeObserver(() => {
      const width = Math.max(1, container.clientWidth)
      const height = Math.max(1, container.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }),
    dispose: () => undefined,
  }

  runtime.resizeObserver.observe(container)
  const width = Math.max(1, container.clientWidth)
  const height = Math.max(1, container.clientHeight)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  runtime.dispose = () => {
    runtime.resizeObserver.disconnect()
    for (const group of runtime.towerMeshes.values()) disposeObject(group)
    for (const group of runtime.enemyMeshes.values()) disposeObject(group)
    for (const group of runtime.shotMeshes.values()) disposeObject(group)
    for (const group of runtime.sparkMeshes.values()) disposeObject(group)
    disposeObject(scene)
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  return runtime
}

function raycastCell(runtime: ThreeRuntime, event: PointerEvent | React.PointerEvent<HTMLDivElement>) {
  const rect = runtime.renderer.domElement.getBoundingClientRect()
  runtime.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  runtime.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  runtime.raycaster.setFromCamera(runtime.pointer, runtime.camera)
  const hit = runtime.raycaster.intersectObject(runtime.ground, false)[0]
  if (!hit) return null
  return worldToCell(hit.point.x, hit.point.z)
}

export default function TowerDefenseGame({ onBack }: { onBack?: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<ThreeRuntime | null>(null)
  const gsRef = useRef<GameState>(createMenuState('normal'))
  const rafRef = useRef<number>(0)
  const hudTickRef = useRef(0)
  const [hud, setHud] = useState<HudState>(() => toHud(gsRef.current))

  const selectedTower = hud.selectedTowerId === null
    ? null
    : gsRef.current.towers.find((tower) => tower.id === hud.selectedTowerId) ?? null
  const selectedStats = selectedTower ? towerStats(selectedTower) : null
  const selectedUpgradeCost = selectedTower ? upgradeCost(selectedTower) : null
  const selectedSell = selectedTower ? sellValue(selectedTower) : null

  const syncHud = useCallback(() => {
    setHud(toHud(gsRef.current))
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const runtime = createRuntime(container)
    runtimeRef.current = runtime

    const animate = (nowMs: number) => {
      const gs = gsRef.current
      stepSimulation(gs, nowMs)
      gs.lastTick = nowMs
      const now = nowMs / 1000
      syncThree(runtime, gs, now)

      const cameraDrift = gs.phase === 'menu' ? Math.sin(now * 0.4) * 0.45 : 0
      runtime.camera.position.x = THREE.MathUtils.lerp(runtime.camera.position.x, cameraDrift, 0.02)
      runtime.camera.position.y = THREE.MathUtils.lerp(runtime.camera.position.y, 8.1, 0.03)
      runtime.camera.position.z = THREE.MathUtils.lerp(runtime.camera.position.z, 8.8, 0.03)
      runtime.camera.lookAt(0, 0, 0)
      runtime.renderer.render(runtime.scene, runtime.camera)

      if (nowMs - hudTickRef.current > 120) {
        hudTickRef.current = nowMs
        syncHud()
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafRef.current)
      runtime.dispose()
      runtimeRef.current = null
    }
  }, [syncHud])

  const startGame = useCallback((difficulty: Difficulty) => {
    gsRef.current = createGameState(difficulty)
    syncHud()
  }, [syncHud])

  const resetGame = useCallback(() => {
    const difficulty = gsRef.current.difficulty
    gsRef.current = createMenuState(difficulty)
    syncHud()
  }, [syncHud])

  const chooseDifficulty = useCallback((difficulty: Difficulty) => {
    const gs = gsRef.current
    gs.difficulty = difficulty
    syncHud()
  }, [syncHud])

  const chooseTower = useCallback((type: TowerType) => {
    const gs = gsRef.current
    if (gs.phase === 'menu' || gs.phase === 'victory' || gs.phase === 'defeat') return
    gs.placingType = gs.placingType === type ? null : type
    gs.selectedTowerId = null
    syncHud()
  }, [syncHud])

  const startWave = useCallback(() => {
    launchWave(gsRef.current, performance.now() / 1000)
    syncHud()
  }, [syncHud])

  const togglePause = useCallback(() => {
    const gs = gsRef.current
    if (gs.phase !== 'wave') return
    gs.paused = !gs.paused
    syncHud()
  }, [syncHud])

  const cycleSpeed = useCallback(() => {
    const gs = gsRef.current
    gs.speed = gs.speed === 1 ? 1.5 : gs.speed === 1.5 ? 2 : 1
    syncHud()
  }, [syncHud])

  const upgradeSelected = useCallback(() => {
    const gs = gsRef.current
    if (gs.selectedTowerId === null) return
    const tower = gs.towers.find((item) => item.id === gs.selectedTowerId)
    if (!tower) return
    const cost = upgradeCost(tower)
    if (cost === null || gs.gold < cost) return
    gs.gold -= cost
    tower.level += 1
    tower.invested += cost
    syncHud()
  }, [syncHud])

  const sellSelected = useCallback(() => {
    const gs = gsRef.current
    if (gs.selectedTowerId === null) return
    const index = gs.towers.findIndex((item) => item.id === gs.selectedTowerId)
    if (index < 0) return
    const [tower] = gs.towers.splice(index, 1)
    gs.occupied.delete(cellKey(tower.col, tower.row))
    gs.gold += sellValue(tower)
    gs.selectedTowerId = null
    syncHud()
  }, [syncHud])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current
    if (!runtime) return
    const cell = raycastCell(runtime, event)
    const gs = gsRef.current
    if (
      gs.hoverCell?.col !== cell?.col ||
      gs.hoverCell?.row !== cell?.row
    ) {
      gs.hoverCell = cell
      syncHud()
    }
  }, [syncHud])

  const handlePointerLeave = useCallback(() => {
    gsRef.current.hoverCell = null
    syncHud()
  }, [syncHud])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current
    const gs = gsRef.current
    if (!runtime || gs.phase === 'menu' || gs.phase === 'victory' || gs.phase === 'defeat') return
    const cell = raycastCell(runtime, event)
    if (!cell) return
    const key = cellKey(cell.col, cell.row)
    const tower = gs.towers.find((item) => item.col === cell.col && item.row === cell.row)
    if (tower) {
      gs.selectedTowerId = tower.id
      gs.placingType = null
      syncHud()
      return
    }
    if (!gs.placingType || PATH_CELLS.has(key) || gs.occupied.has(key)) {
      gs.selectedTowerId = null
      syncHud()
      return
    }
    const def = TOWER_DEFS[gs.placingType]
    if (gs.gold < def.cost) return
    const { x, z } = cellToWorld(cell.col, cell.row)
    const placed: Tower = {
      id: gs.idCounter++,
      type: gs.placingType,
      col: cell.col,
      row: cell.row,
      x,
      z,
      level: 1,
      cooldown: 0.2,
      invested: def.cost,
      yaw: 0,
    }
    gs.towers.push(placed)
    gs.occupied.add(key)
    gs.gold -= def.cost
    gs.selectedTowerId = placed.id
    gs.placingType = null
    syncHud()
  }, [syncHud])

  const availableWaves = useMemo(() => `${Math.min(hud.wave + 1, TOTAL_WAVES)}/${TOTAL_WAVES}`, [hud.wave])
  const difficultyCopy = hud.difficulty === 'easy'
    ? 'Plus de vies et économie souple'
    : hud.difficulty === 'hard'
      ? 'Peu de vies, ennemis renforces'
      : 'Équilibre service tablette'

  return (
    <div style={styles.root}>
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        style={styles.scene}
      />

      {hud.phase === 'menu' && (
        <div style={styles.menuOverlay}>
          <div style={styles.menuPanel}>
            <div style={styles.logoMark}>
              <Shield size={28} />
            </div>
            <h1 style={styles.title}>Défense 3D</h1>
            <p style={styles.subtitle}>Protégez la ligne, gardez la table en jeu.</p>
            <div style={styles.difficultyRow}>
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => chooseDifficulty(difficulty)}
                  style={{
                    ...styles.difficultyButton,
                    borderColor: hud.difficulty === difficulty ? ACCENT2 : BORDER,
                    color: hud.difficulty === difficulty ? TEXT : MUTED,
                    background: hud.difficulty === difficulty ? 'rgba(6,182,212,0.18)' : 'rgba(14,13,32,0.92)',
                  }}
                >
                  {difficulty}
                </button>
              ))}
            </div>
            <p style={styles.menuNote}>{difficultyCopy}</p>
            <button onClick={() => startGame(hud.difficulty)} style={styles.primaryButton}>
              <Play size={18} />
              Démarrer
            </button>
            {onBack && (
              <button onClick={onBack} style={styles.ghostButton}>
                <ChevronLeft size={16} />
                Retour
              </button>
            )}
          </div>
        </div>
      )}

      {hud.phase !== 'menu' && (
        <>
          <div style={styles.topHud}>
            <Metric icon={<Heart size={15} />} value={hud.lives} label="Vies" color="#ef4444" />
            <Metric icon={<Coins size={15} />} value={hud.gold} label="Credit" color="#f59e0b" />
            <Metric icon={<Zap size={15} />} value={`${hud.wave}/${TOTAL_WAVES}`} label="Vague" color={ACCENT2} />
            <Metric icon={<Sparkles size={15} />} value={hud.score.toLocaleString('fr-FR')} label="Score" color={ACCENT} />
            <div style={styles.topActions}>
              <button onClick={cycleSpeed} style={styles.compactButton}>{hud.speed}x</button>
              <button onClick={togglePause} disabled={hud.phase !== 'wave'} style={styles.compactButton}>
                {hud.paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button onClick={resetGame} style={styles.compactButton}>
                <RotateCcw size={14} />
              </button>
              {onBack && (
                <button onClick={onBack} style={styles.compactButton}>
                  <ChevronLeft size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={styles.towerBar}>
            {TOWER_TYPES.map((type) => {
              const def = TOWER_DEFS[type]
              const active = hud.placingType === type
              const affordable = hud.gold >= def.cost
              return (
                <button
                  key={type}
                  onClick={() => chooseTower(type)}
                  disabled={!affordable && !active}
                  style={{
                    ...styles.towerButton,
                    borderColor: active ? def.color : BORDER,
                    background: active ? `${def.color}22` : 'rgba(14,13,32,0.88)',
                    opacity: affordable || active ? 1 : 0.48,
                  }}
                >
                  <span style={{ ...styles.towerGlyph, color: def.color }}>{def.short}</span>
                  <span style={styles.towerText}>{def.label}</span>
                  <span style={styles.towerCost}>{def.cost}</span>
                </button>
              )
            })}
            <div style={styles.waveDock}>
              {hud.phase === 'prep' ? (
                <button onClick={startWave} style={styles.waveButton}>
                  <Play size={16} />
                  Vague {availableWaves}
                </button>
              ) : hud.phase === 'wave' ? (
                <div style={styles.waveLive}>
                  <Crosshair size={15} />
                  Vague active
                </div>
              ) : null}
            </div>
          </div>

          {selectedTower && selectedStats && (
            <div style={styles.sidePanel}>
              <div style={styles.sideHead}>
                <div>
                  <p style={{ ...styles.sideTitle, color: TOWER_DEFS[selectedTower.type].color }}>
                    {TOWER_DEFS[selectedTower.type].label}
                  </p>
                  <p style={styles.sideSub}>Niveau {selectedTower.level}</p>
                </div>
                <button
                  onClick={() => {
                    gsRef.current.selectedTowerId = null
                    syncHud()
                  }}
                  style={styles.panelClose}
                >
                  Fermer
                </button>
              </div>
              <div style={styles.statGrid}>
                <MiniStat label="Dégâts" value={Math.round(selectedStats.damage)} />
                <MiniStat label="Portée" value={selectedStats.range.toFixed(1)} />
                <MiniStat label="Cadence" value={`${selectedStats.fireRate.toFixed(1)}s`} />
                <MiniStat label="Zone" value={selectedStats.splash ? selectedStats.splash.toFixed(1) : '-'} />
              </div>
              <button
                onClick={upgradeSelected}
                disabled={selectedUpgradeCost === null || hud.gold < selectedUpgradeCost}
                style={{
                  ...styles.panelButton,
                  borderColor: selectedUpgradeCost !== null && hud.gold >= selectedUpgradeCost ? ACCENT2 : BORDER,
                  color: selectedUpgradeCost !== null && hud.gold >= selectedUpgradeCost ? TEXT : MUTED,
                }}
              >
                {selectedUpgradeCost === null ? 'Niveau max' : `Améliorer ${selectedUpgradeCost}`}
              </button>
              <button onClick={sellSelected} style={{ ...styles.panelButton, color: '#ff8b8b', borderColor: 'rgba(239,68,68,0.32)' }}>
                Vendre {selectedSell}
              </button>
            </div>
          )}

          {(hud.phase === 'victory' || hud.phase === 'defeat') && (
            <div style={styles.resultOverlay}>
              <div style={styles.resultPanel}>
                <h2 style={{ ...styles.resultTitle, color: hud.phase === 'victory' ? '#facc15' : '#ef4444' }}>
                  {hud.phase === 'victory' ? 'Victoire' : 'Défense rompue'}
                </h2>
                <p style={styles.resultScore}>{hud.score.toLocaleString('fr-FR')}</p>
                <p style={styles.resultText}>
                  {hud.phase === 'victory'
                    ? `Base intacte avec ${hud.lives} vies restantes.`
                    : `Vous avez tenu ${hud.wave} vagues.`}
                </p>
                <button onClick={() => startGame(hud.difficulty)} style={styles.primaryButton}>
                  <RotateCcw size={18} />
                  Rejouer
                </button>
                <button onClick={resetGame} style={styles.ghostButton}>Menu</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Metric({ icon, value, label, color }: { icon: React.ReactNode; value: React.ReactNode; label: string; color: string }) {
  return (
    <div style={styles.metric}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={styles.metricValue}>{value}</span>
      <span style={styles.metricLabel}>{label}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.miniLabel}>{label}</span>
      <strong style={styles.miniValue}>{value}</strong>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    minHeight: 'calc(100vh - 112px)',
    height: 'min(780px, calc(100vh - 64px))',
    overflow: 'hidden',
    background: BG,
    color: TEXT,
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  scene: {
    position: 'absolute',
    inset: 0,
    cursor: 'crosshair',
    touchAction: 'none',
  },
  menuOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    pointerEvents: 'none',
  },
  menuPanel: {
    width: 'min(380px, 92vw)',
    padding: 24,
    borderRadius: 12,
    background: 'rgba(8,9,18,0.86)',
    border: `1px solid ${BORDER}`,
    boxShadow: '0 18px 45px rgba(0,0,0,0.38)',
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  logoMark: {
    width: 58,
    height: 58,
    margin: '0 auto 14px',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ACCENT2,
    background: 'rgba(6,182,212,0.12)',
    border: '1px solid rgba(6,182,212,0.24)',
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: 0,
  },
  subtitle: {
    margin: '8px 0 18px',
    color: MUTED,
    fontSize: 13,
  },
  difficultyRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginBottom: 10,
  },
  difficultyButton: {
    border: '1px solid',
    borderRadius: 8,
    padding: '9px 10px',
    textTransform: 'capitalize',
    cursor: 'pointer',
    fontWeight: 800,
  },
  menuNote: {
    minHeight: 18,
    margin: '0 0 18px',
    fontSize: 12,
    color: MUTED,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 150,
    padding: '12px 18px',
    borderRadius: 8,
    border: '1px solid rgba(6,182,212,0.48)',
    background: ACCENT2,
    color: '#021018',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 900,
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: 'rgba(14,13,32,0.82)',
    color: MUTED,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  topHud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
  },
  metric: {
    minWidth: 82,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(8,9,18,0.82)',
    border: `1px solid ${BORDER}`,
    pointerEvents: 'auto',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 900,
    color: TEXT,
  },
  metricLabel: {
    fontSize: 10,
    color: MUTED,
  },
  topActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 6,
    pointerEvents: 'auto',
  },
  compactButton: {
    minWidth: 38,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: 'rgba(8,9,18,0.86)',
    color: TEXT,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 900,
  },
  towerBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
  },
  towerButton: {
    minWidth: 78,
    display: 'grid',
    gridTemplateColumns: '24px 1fr',
    alignItems: 'center',
    gap: '2px 8px',
    border: '1px solid',
    borderRadius: 8,
    padding: '8px 10px',
    color: TEXT,
    cursor: 'pointer',
    pointerEvents: 'auto',
  },
  towerGlyph: {
    gridRow: 'span 2',
    width: 24,
    height: 24,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.07)',
    fontWeight: 900,
    fontSize: 12,
  },
  towerText: {
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1,
  },
  towerCost: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 1,
  },
  waveDock: {
    marginLeft: 'auto',
    pointerEvents: 'auto',
  },
  waveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(20,241,217,0.42)',
    background: 'rgba(20,241,217,0.16)',
    color: TEXT,
    cursor: 'pointer',
    fontWeight: 900,
  },
  waveLive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: 'rgba(8,9,18,0.82)',
    color: ACCENT2,
    fontWeight: 900,
  },
  sidePanel: {
    position: 'absolute',
    top: 64,
    right: 12,
    width: 232,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${BORDER}`,
    background: 'rgba(8,9,18,0.9)',
    boxShadow: '0 14px 35px rgba(0,0,0,0.35)',
  },
  sideHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sideTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
  },
  sideSub: {
    margin: '2px 0 0',
    color: MUTED,
    fontSize: 11,
  },
  panelClose: {
    height: 28,
    borderRadius: 6,
    border: `1px solid ${BORDER}`,
    background: SURFACE2,
    color: MUTED,
    cursor: 'pointer',
    fontSize: 11,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    marginBottom: 10,
  },
  miniStat: {
    padding: 8,
    borderRadius: 8,
    background: SURFACE,
    border: `1px solid ${BORDER}`,
  },
  miniLabel: {
    display: 'block',
    color: MUTED,
    fontSize: 10,
    marginBottom: 2,
  },
  miniValue: {
    color: TEXT,
    fontSize: 13,
  },
  panelButton: {
    width: '100%',
    marginTop: 6,
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid',
    background: SURFACE2,
    cursor: 'pointer',
    fontWeight: 800,
  },
  resultOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,15,0.45)',
    padding: 20,
  },
  resultPanel: {
    width: 'min(340px, 92vw)',
    padding: 24,
    borderRadius: 12,
    border: `1px solid ${BORDER}`,
    background: 'rgba(8,9,18,0.92)',
    textAlign: 'center',
    boxShadow: '0 18px 45px rgba(0,0,0,0.4)',
  },
  resultTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
  },
  resultScore: {
    margin: '8px 0 0',
    color: TEXT,
    fontSize: 34,
    fontWeight: 900,
  },
  resultText: {
    color: MUTED,
    margin: '4px 0 18px',
    fontSize: 13,
  },
}
