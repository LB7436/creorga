import { useEffect, useRef, useCallback, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────
const COLS = 24
const ROWS = 18
const BASE_SPEEDS: Record<string, number> = { Easy: 130, Normal: 90, Hard: 60, Insane: 38 }
const DIFFICULTIES = ['Easy', 'Normal', 'Hard', 'Insane'] as const
type Difficulty = typeof DIFFICULTIES[number]

type Pos = { x: number; y: number }
type Dir = 'up' | 'down' | 'left' | 'right'
type FoodType = 'apple' | 'star' | 'diamond'
interface Food { pos: Pos; type: FoodType; spawnTime: number }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; alpha: number; born: number }

// ── Helpers ────────────────────────────────────────────────────────────────────
function randPos(occupied: Pos[]): Pos {
  let p: Pos
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
  while (occupied.some(o => o.x === p.x && o.y === p.y))
  return p
}

function lerpColor(t: number): string {
  // head: #22c55e  tail: #166534
  const r = Math.round(0x22 + (0x16 - 0x22) * t)
  const g = Math.round(0xc5 + (0x65 - 0xc5) * t)
  const b = Math.round(0x5e + (0x34 - 0x5e) * t)
  return `rgb(${r},${g},${b})`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SnakeGame({ onBack }: { onBack?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // game state refs (mutated each tick without re-render)
  const snakeRef = useRef<Pos[]>([{ x: 12, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 9 }])
  const dirRef = useRef<Dir>('right')
  const nextDirRef = useRef<Dir>('right')
  const foodsRef = useRef<Food[]>([])
  const particlesRef = useRef<Particle[]>([])
  const scoreRef = useRef(0)
  const bestRef = useRef(0)
  const foodsEatenRef = useRef(0)
  const runningRef = useRef(false)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)
  const flashCountRef = useRef(0)
  const cellSizeRef = useRef(0)
  const speedRef = useRef(130)
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  // React state for HUD re-renders
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal')
  const [walls, setWalls] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)

  const difficultyRef = useRef<Difficulty>('Normal')
  const wallsRef = useRef(false)

  // touch swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // ── Init foods ───────────────────────────────────────────────────────────────
  const spawnApple = useCallback((snake: Pos[], currentFoods: Food[]): Food => {
    const occupied = [...snake, ...currentFoods.map(f => f.pos)]
    return { pos: randPos(occupied), type: 'apple', spawnTime: Date.now() }
  }, [])

  const maybeSpawnBonus = useCallback((snake: Pos[], currentFoods: Food[]) => {
    const hasStar = currentFoods.some(f => f.type === 'star')
    const hasDiamond = currentFoods.some(f => f.type === 'diamond')
    const occupied = [...snake, ...currentFoods.map(f => f.pos)]

    if (!hasStar) {
      foodsRef.current.push({ pos: randPos(occupied), type: 'star', spawnTime: Date.now() })
    }
    if (!hasDiamond && Math.random() < 0.2) {
      const occ2 = [...occupied, foodsRef.current[foodsRef.current.length - 1]?.pos ?? { x: -1, y: -1 }]
      foodsRef.current.push({ pos: randPos(occ2), type: 'diamond', spawnTime: Date.now() })
    }
  }, [])

  // ── Particle burst ───────────────────────────────────────────────────────────
  const spawnParticles = useCallback((cx: number, cy: number, color: string) => {
    const now = Date.now()
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const speed = 2 + Math.random() * 2
      particlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        born: now,
      })
    }
  }, [])

  // ── Draw ─────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cs = cellSizeRef.current
    const w = canvas.width
    const h = canvas.height
    const now = Date.now()

    // background
    ctx.fillStyle = '#07070d'
    ctx.fillRect(0, 0, w, h)

    // subtle grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        ctx.beginPath()
        ctx.arc(col * cs + cs / 2, row * cs + cs / 2, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // particles
    particlesRef.current = particlesRef.current.filter(p => {
      const age = now - p.born
      if (age > 400) return false
      p.x += p.vx
      p.y += p.vy
      p.alpha = 1 - age / 400
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
      return true
    })
    ctx.globalAlpha = 1

    // foods
    const expiryStar = 15000
    const expiryDiamond = 8000

    foodsRef.current.forEach(food => {
      const cx = food.pos.x * cs + cs / 2
      const cy = food.pos.y * cs + cs / 2
      const r = cs * 0.38

      if (food.type === 'apple') {
        ctx.shadowBlur = 12
        ctx.shadowColor = '#ef4444'
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        // stem
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#86efac'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + 3, cy - r - 4)
        ctx.stroke()
      } else if (food.type === 'star') {
        const age = (now - food.spawnTime) / expiryStar
        const pulse = 1 + 0.15 * Math.sin(now / 180)
        // flash when about to expire
        if (age > 0.75 && Math.floor(now / 200) % 2 === 0) return
        ctx.shadowBlur = 18 * pulse
        ctx.shadowColor = '#facc15'
        ctx.fillStyle = '#facc15'
        // 5-pointed star
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(pulse, pulse)
        ctx.beginPath()
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2
          const rad = i % 2 === 0 ? r : r * 0.45
          if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      } else if (food.type === 'diamond') {
        const age = (now - food.spawnTime) / expiryDiamond
        if (age > 0.75 && Math.floor(now / 150) % 2 === 0) return
        ctx.shadowBlur = 20
        ctx.shadowColor = '#22d3ee'
        ctx.fillStyle = '#22d3ee'
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx + r * 0.65, cy)
        ctx.lineTo(cx, cy + r)
        ctx.lineTo(cx - r * 0.65, cy)
        ctx.closePath()
        ctx.fill()
      }
      ctx.shadowBlur = 0
    })

    // snake — flash red on game over
    const flashRed = gameOverRef.current && Math.floor(flashCountRef.current / 6) % 2 === 0
    const snake = snakeRef.current
    snake.forEach((seg, i) => {
      const t = snake.length > 1 ? i / (snake.length - 1) : 0
      const color = flashRed ? `rgba(239,68,68,${1 - t * 0.5})` : lerpColor(t)
      const pad = 1.5
      const x = seg.x * cs + pad
      const y = seg.y * cs + pad
      const size = cs - pad * 2
      const radius = i === 0 ? size * 0.42 : size * 0.3

      ctx.fillStyle = color
      // head glow
      if (i === 0 && !flashRed) {
        ctx.shadowBlur = 10
        ctx.shadowColor = '#22c55e'
      }
      roundRect(ctx, x, y, size, size, radius)
      ctx.fill()
      ctx.shadowBlur = 0

      // eyes on head
      if (i === 0) {
        const d = dirRef.current
        const eyeR = size * 0.1
        const eyeOffset = size * 0.22
        let e1: Pos, e2: Pos
        const mid = { x: seg.x * cs + cs / 2, y: seg.y * cs + cs / 2 }
        if (d === 'right' || d === 'left') {
          const ex = d === 'right' ? mid.x + eyeOffset : mid.x - eyeOffset
          e1 = { x: ex, y: mid.y - eyeOffset }
          e2 = { x: ex, y: mid.y + eyeOffset }
        } else {
          const ey = d === 'down' ? mid.y + eyeOffset : mid.y - eyeOffset
          e1 = { x: mid.x - eyeOffset, y: ey }
          e2 = { x: mid.x + eyeOffset, y: ey }
        }
        ctx.fillStyle = 'white'
        ctx.beginPath(); ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#07070d'
        ctx.beginPath(); ctx.arc(e1.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0), e1.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0), eyeR * 0.55, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(e2.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0), e2.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0), eyeR * 0.55, 0, Math.PI * 2); ctx.fill()
      }
    })

    rafRef.current = requestAnimationFrame(draw)
  }, [])

  // ── Game tick ────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!runningRef.current || gameOverRef.current || pausedRef.current) return

    dirRef.current = nextDirRef.current

    const head = snakeRef.current[0]
    const d = dirRef.current
    let nx = head.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0)
    let ny = head.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0)

    if (wallsRef.current) {
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        triggerGameOver()
        return
      }
    } else {
      nx = (nx + COLS) % COLS
      ny = (ny + ROWS) % ROWS
    }

    const next: Pos = { x: nx, y: ny }

    // self-collision (skip last segment — it will move)
    if (snakeRef.current.slice(0, -1).some(s => s.x === next.x && s.y === next.y)) {
      triggerGameOver()
      return
    }

    const cs = cellSizeRef.current
    const cx = next.x * cs + cs / 2
    const cy = next.y * cs + cs / 2

    // expire bonus foods
    const now = Date.now()
    foodsRef.current = foodsRef.current.filter(f => {
      if (f.type === 'star' && now - f.spawnTime > 15000) return false
      if (f.type === 'diamond' && now - f.spawnTime > 8000) return false
      return true
    })

    // check food collision
    let grew = false
    let newFoods = [...foodsRef.current]
    for (let i = 0; i < newFoods.length; i++) {
      const f = newFoods[i]
      if (f.pos.x === next.x && f.pos.y === next.y) {
        const pts = f.type === 'apple' ? 1 : f.type === 'star' ? 5 : 15
        scoreRef.current += pts
        setScore(scoreRef.current)
        grew = true
        foodsEatenRef.current++

        const pColor = f.type === 'apple' ? '#ef4444' : f.type === 'star' ? '#facc15' : '#22d3ee'
        spawnParticles(cx, cy, pColor)

        newFoods.splice(i, 1)
        break
      }
    }

    // ensure apple always present
    if (!newFoods.some(f => f.type === 'apple')) {
      newFoods.push(spawnApple([next, ...snakeRef.current], newFoods))
    }

    foodsRef.current = newFoods

    // update snake
    const newSnake = [next, ...snakeRef.current]
    if (!grew) newSnake.pop()
    snakeRef.current = newSnake

    // speed ramp every 5 foods
    const base = BASE_SPEEDS[difficultyRef.current]
    const cap = Math.max(28, base - 30)
    const reductions = Math.floor(foodsEatenRef.current / 5)
    speedRef.current = Math.max(cap, base - reductions * 3)

    // spawn bonus every 5 foods
    if (grew && foodsEatenRef.current % 5 === 0) {
      maybeSpawnBonus(snakeRef.current, foodsRef.current)
    }

    tickTimerRef.current = setTimeout(tick, speedRef.current)
  }, [spawnApple, spawnParticles, maybeSpawnBonus])

  const triggerGameOver = useCallback(() => {
    runningRef.current = false
    gameOverRef.current = true
    flashCountRef.current = 0

    const score = scoreRef.current
    if (score > bestRef.current) {
      bestRef.current = score
      setBest(score)
    }
    setGameOver(true)

    // flash animation: 3 flashes = 18 frames (each ~100ms)
    let frame = 0
    const flashInterval = setInterval(() => {
      flashCountRef.current = frame
      frame++
      if (frame > 18) clearInterval(flashInterval)
    }, 100)
  }, [])

  // ── Start / Reset ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    const initSnake = [{ x: 12, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 9 }]
    snakeRef.current = initSnake
    dirRef.current = 'right'
    nextDirRef.current = 'right'
    scoreRef.current = 0
    foodsEatenRef.current = 0
    speedRef.current = BASE_SPEEDS[difficultyRef.current]
    particlesRef.current = []
    flashCountRef.current = 0
    gameOverRef.current = false
    runningRef.current = false
    pausedRef.current = false
    setScore(0)
    setGameOver(false)
    setStarted(false)
    setPaused(false)

    // spawn initial apple
    foodsRef.current = [{ pos: randPos(initSnake), type: 'apple', spawnTime: Date.now() }]
  }, [])

  const startGame = useCallback(() => {
    if (gameOverRef.current) reset()
    runningRef.current = true
    gameOverRef.current = false
    pausedRef.current = false
    setStarted(true)
    setGameOver(false)
    setPaused(false)
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    tickTimerRef.current = setTimeout(tick, speedRef.current)
  }, [tick, reset])

  const togglePause = useCallback(() => {
    if (!runningRef.current && !pausedRef.current) return
    if (pausedRef.current) {
      pausedRef.current = false
      setPaused(false)
      tickTimerRef.current = setTimeout(tick, speedRef.current)
    } else {
      pausedRef.current = true
      setPaused(true)
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    }
  }, [tick])

  // ── Direction input ──────────────────────────────────────────────────────────
  const changeDir = useCallback((d: Dir) => {
    const opp: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    if (d !== opp[dirRef.current]) nextDirRef.current = d
    if (!runningRef.current && !gameOverRef.current) startGame()
  }, [startGame])

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      }
      if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]) }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [changeDir, togglePause])

  // ── Touch swipe ───────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? 'right' : 'left')
    else changeDir(dy > 0 ? 'down' : 'up')
  }, [changeDir])

  // ── Resize canvas ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return
      const maxW = Math.min(container.clientWidth, 600)
      const csW = Math.floor(maxW / COLS)
      const csH = Math.floor((window.innerHeight * 0.52) / ROWS)
      const cs = Math.max(16, Math.min(csW, csH))
      cellSizeRef.current = cs
      canvas.width = cs * COLS
      canvas.height = cs * ROWS
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── RAF draw loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    foodsRef.current = [{ pos: randPos(snakeRef.current), type: 'apple', spawnTime: Date.now() }]
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current)
    }
  }, [draw])

  // ── Difficulty change ────────────────────────────────────────────────────────
  const handleDifficulty = useCallback((d: Difficulty) => {
    difficultyRef.current = d
    setDifficulty(d)
    speedRef.current = BASE_SPEEDS[d]
    reset()
  }, [reset])

  // ── Walls toggle ─────────────────────────────────────────────────────────────
  const handleWalls = useCallback(() => {
    wallsRef.current = !wallsRef.current
    setWalls(w => !w)
    reset()
  }, [reset])

  // ── Render ───────────────────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, userSelect: 'none', background: '#07070d',
        padding: '10px 8px', borderRadius: 16,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 600, gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ ...btnBase, background: '#1c1c2e', color: '#aaa', padding: '0 12px', fontSize: 18 }}>
            ←
          </button>
        )}
        <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 16 }}>🐍 Snake</span>
        <div style={{ flex: 1 }} />
        {/* Difficulty */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => handleDifficulty(d)}
              style={{
                ...btnBase,
                padding: '4px 8px',
                minWidth: 0,
                minHeight: 32,
                background: difficulty === d ? '#22c55e' : '#1c1c2e',
                color: difficulty === d ? '#07070d' : '#aaa',
              }}
            >
              {d}
            </button>
          ))}
        </div>
        {/* Walls toggle */}
        <button
          onClick={handleWalls}
          style={{
            ...btnBase,
            padding: '4px 10px',
            minHeight: 32,
            background: walls ? '#ef4444' : '#1c1c2e',
            color: walls ? '#fff' : '#aaa',
            fontSize: 12,
          }}
        >
          Walls {walls ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', width: '100%', maxWidth: 600, justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>
          <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>SCORE </span>
          {score}
        </div>
        <div style={{ color: '#facc15', fontSize: 22, fontWeight: 800 }}>
          <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>BEST </span>
          {best}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ display: 'block', borderRadius: 12, border: '1px solid #1c1c2e' }}
        />

        {/* Start overlay */}
        {!started && !gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'rgba(7,7,13,0.82)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 42 }}>🐍</div>
            <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 22 }}>Snake</div>
            <button
              onClick={startGame}
              style={{ ...btnBase, padding: '12px 36px', background: '#22c55e', color: '#07070d', fontSize: 15 }}
            >
              ▶ Start
            </button>
            <div style={{ color: '#4b5563', fontSize: 11 }}>Arrow keys / WASD / D-pad / Swipe</div>
          </div>
        )}

        {/* Pause overlay */}
        {paused && !gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'rgba(7,7,13,0.82)', borderRadius: 12,
          }}>
            <div style={{ color: '#facc15', fontWeight: 800, fontSize: 24 }}>⏸ Paused</div>
            <button
              onClick={togglePause}
              style={{ ...btnBase, padding: '12px 36px', background: '#22c55e', color: '#07070d', fontSize: 15 }}
            >
              ▶ Resume
            </button>
          </div>
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(7,7,13,0.88)', borderRadius: 12,
          }}>
            <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 26 }}>Game Over</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Score: {score}</div>
            {score >= best && score > 0 && (
              <div style={{ color: '#facc15', fontSize: 13, fontWeight: 600 }}>⭐ New Best!</div>
            )}
            <button
              onClick={() => { reset(); startGame() }}
              style={{ ...btnBase, padding: '12px 36px', background: '#22c55e', color: '#07070d', fontSize: 15 }}
            >
              🔄 Play Again
            </button>
          </div>
        )}
      </div>

      {/* Food legend */}
      <div style={{ display: 'flex', gap: 14, color: '#6b7280', fontSize: 11 }}>
        <span><span style={{ color: '#ef4444' }}>●</span> Apple +1</span>
        <span><span style={{ color: '#facc15' }}>★</span> Star +5 (15s)</span>
        <span><span style={{ color: '#22d3ee' }}>◆</span> Diamond +15 (8s)</span>
      </div>

      {/* D-pad */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <button onClick={() => changeDir('up')} style={{ ...btnBase, background: '#1c1c2e', color: '#e5e7eb', width: 52, height: 52, fontSize: 20 }}>▲</button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => changeDir('left')} style={{ ...btnBase, background: '#1c1c2e', color: '#e5e7eb', width: 52, height: 52, fontSize: 20 }}>◀</button>
          <button onClick={() => changeDir('down')} style={{ ...btnBase, background: '#1c1c2e', color: '#e5e7eb', width: 52, height: 52, fontSize: 20 }}>▼</button>
          <button onClick={() => changeDir('right')} style={{ ...btnBase, background: '#1c1c2e', color: '#e5e7eb', width: 52, height: 52, fontSize: 20 }}>▶</button>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 600 }}>
        {started && !gameOver && (
          <button
            onClick={togglePause}
            style={{ ...btnBase, flex: 1, background: '#1c1c2e', color: '#e5e7eb' }}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
        <button
          onClick={() => { reset(); startGame() }}
          style={{
            ...btnBase, flex: 1,
            background: gameOver ? '#22c55e' : '#1c1c2e',
            color: gameOver ? '#07070d' : '#e5e7eb',
          }}
        >
          🔄 Restart
        </button>
      </div>
    </div>
  )
}
