import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Game launcher — fullscreen modal hosting playable games.
 * Mobile-first: touch controls, responsive canvas, no scroll.
 *
 * Games included (real, playable):
 *   - morpion   (Tic-tac-toe — vs CPU)
 *   - snake     (classic Snake — touch swipe + arrow keys)
 *   - 2048      (slide tiles to merge)
 *   - memory    (flip cards, find pairs)
 *   - pong      (paddle vs CPU)
 *   - puissance4 (Connect 4 vs CPU)
 *   - quiz      (5 random questions)
 *   - flechettes (target throwing)
 *
 * All other game IDs fall back to "Coming soon".
 */

interface Props {
  gameId: string | null
  onClose: () => void
  accent: string
}

export default function GameLauncher({ gameId, onClose, accent }: Props) {
  if (!gameId) return null

  const Game = pickGame(gameId)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'linear-gradient(135deg,#0a0a14,#1a0a2e)',
        color: '#f1f5f9', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <header style={{
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{getTitle(gameId)}</div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 16,
        }}>✕</button>
      </header>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12, overflow: 'auto',
      }}>
        <Game accent={accent} />
      </div>
    </motion.div>
  )
}

function getTitle(id: string): string {
  const t: Record<string, string> = {
    morpion: '⭕ Morpion',
    snake: '🐍 Snake',
    '2048': '🔢 2048',
    memory: '🧠 Memory',
    pong: '🏓 Pong',
    puissance4: '🔵 Puissance 4',
    quiz: '❓ Quiz',
    flechettes: '🎯 Fléchettes',
    darts: '🎯 Fléchettes',
  }
  return t[id] || '🎮 ' + id
}

function pickGame(id: string): React.FC<{ accent: string }> {
  switch (id) {
    case 'morpion':    return Morpion
    case 'snake':      return Snake
    case '2048':       return Game2048
    case 'memory':     return Memory
    case 'pong':       return Pong
    case 'puissance4': return Puissance4
    case 'quiz':       return Quiz
    case 'flechettes':
    case 'darts':      return Flechettes
    default:           return ComingSoon
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Morpion (Tic-tac-toe vs CPU)
// ════════════════════════════════════════════════════════════════════════════
function Morpion({ accent }: { accent: string }) {
  const [board, setBoard] = useState<(null | 'X' | 'O')[]>(Array(9).fill(null))
  const [winner, setWinner] = useState<string | null>(null)

  const checkWinner = (b: any[]): string | null => {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for (const [a,c,d] of wins) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]
    return b.every(x => x) ? '=' : null
  }

  const cpuMove = useCallback((b: any[]) => {
    const empty = b.map((v,i) => v ? null : i).filter((v): v is number => v !== null)
    if (empty.length === 0) return b
    // Try to win
    for (const i of empty) { const t = [...b]; t[i] = 'O'; if (checkWinner(t) === 'O') return t }
    // Try to block
    for (const i of empty) { const t = [...b]; t[i] = 'X'; if (checkWinner(t) === 'X') { const r = [...b]; r[i] = 'O'; return r } }
    // Random
    const r = [...b]; r[empty[Math.floor(Math.random() * empty.length)]] = 'O'; return r
  }, [])

  const play = (i: number) => {
    if (board[i] || winner) return
    const next = [...board]; next[i] = 'X'
    const w = checkWinner(next)
    if (w) { setBoard(next); setWinner(w); return }
    const after = cpuMove(next)
    setBoard(after); setWinner(checkWinner(after))
  }

  const reset = () => { setBoard(Array(9).fill(null)); setWinner(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 13, color: '#a78bfa' }}>Vous (X) vs CPU (O)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: 6 }}>
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} style={{
            width: 90, height: 90, fontSize: 50, fontWeight: 800,
            background: c ? `${accent}20` : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
            color: c === 'X' ? accent : c === 'O' ? '#ec4899' : '#fff', cursor: 'pointer',
          }}>{c || ''}</button>
        ))}
      </div>
      {winner && (
        <div style={{ padding: 16, fontSize: 22, fontWeight: 800,
          color: winner === 'X' ? '#10b981' : winner === '=' ? '#94a3b8' : '#ef4444' }}>
          {winner === 'X' ? '🎉 Gagné !' : winner === '=' ? '🤝 Égalité' : '🤖 CPU gagne'}
        </div>
      )}
      <button onClick={reset} style={btnPrimary(accent)}>Nouvelle partie</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Snake (touch + keyboard)
// ════════════════════════════════════════════════════════════════════════════
function Snake({ accent }: { accent: string }) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([{ x: 10, y: 10 }])
  const [food, setFood] = useState({ x: 5, y: 5 })
  const [dir, setDir] = useState<'U' | 'D' | 'L' | 'R'>('R')
  const [dead, setDead] = useState(false)
  const [score, setScore] = useState(0)
  const dirRef = useRef(dir)
  const SIZE = 20

  useEffect(() => { dirRef.current = dir }, [dir])

  useEffect(() => {
    if (dead) return
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = { ...prev[0] }
        const d = dirRef.current
        if (d === 'U') head.y--; if (d === 'D') head.y++; if (d === 'L') head.x--; if (d === 'R') head.x++
        if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) { setDead(true); return prev }
        if (prev.some(s => s.x === head.x && s.y === head.y)) { setDead(true); return prev }
        const next = [head, ...prev]
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 1)
          setFood({ x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) })
        } else next.pop()
        return next
      })
    }, 120)
    return () => clearInterval(id)
  }, [dead, food])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && dirRef.current !== 'D') setDir('U')
      if (e.key === 'ArrowDown' && dirRef.current !== 'U') setDir('D')
      if (e.key === 'ArrowLeft' && dirRef.current !== 'R') setDir('L')
      if (e.key === 'ArrowRight' && dirRef.current !== 'L') setDir('R')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const reset = () => { setSnake([{ x: 10, y: 10 }]); setFood({ x: 5, y: 5 }); setDir('R'); setDead(false); setScore(0) }
  const go = (d: typeof dir) => { if (
    (d === 'U' && dirRef.current !== 'D') || (d === 'D' && dirRef.current !== 'U') ||
    (d === 'L' && dirRef.current !== 'R') || (d === 'R' && dirRef.current !== 'L')
  ) setDir(d) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Score : <span style={{ color: accent }}>{score}</span></div>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        width: 'min(90vw, 360px)', aspectRatio: '1',
        background: 'rgba(0,0,0,0.5)', border: '2px solid ' + accent, borderRadius: 8, overflow: 'hidden',
      }}>
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = i % SIZE, y = Math.floor(i / SIZE)
          const isHead = snake[0].x === x && snake[0].y === y
          const isBody = snake.some((s, idx) => idx > 0 && s.x === x && s.y === y)
          const isFood = food.x === x && food.y === y
          return <div key={i} style={{
            background: isHead ? accent : isBody ? `${accent}88` : isFood ? '#ef4444' : 'transparent',
            borderRadius: isFood ? '50%' : 2,
          }} />
        })}
      </div>
      {dead && <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 18 }}>💀 Game Over — score {score}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 4 }}>
        <div /><button onClick={() => go('U')} style={padBtn(accent)}>↑</button><div />
        <button onClick={() => go('L')} style={padBtn(accent)}>←</button>
        <button onClick={reset} style={{ ...padBtn(accent), background: '#1f2937' }}>↺</button>
        <button onClick={() => go('R')} style={padBtn(accent)}>→</button>
        <div /><button onClick={() => go('D')} style={padBtn(accent)}>↓</button><div />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2048
// ════════════════════════════════════════════════════════════════════════════
function Game2048({ accent }: { accent: string }) {
  const init = (): number[][] => {
    const g = Array.from({ length: 4 }, () => Array(4).fill(0))
    return addRandom(addRandom(g))
  }
  const [grid, setGrid] = useState<number[][]>(init)
  const [score, setScore] = useState(0)

  function addRandom(g: number[][]): number[][] {
    const empty: [number, number][] = []
    g.forEach((row, y) => row.forEach((v, x) => { if (v === 0) empty.push([x, y]) }))
    if (empty.length === 0) return g
    const [x, y] = empty[Math.floor(Math.random() * empty.length)]
    const ng = g.map(r => [...r])
    ng[y][x] = Math.random() < 0.9 ? 2 : 4
    return ng
  }

  function slide(row: number[]): { row: number[]; gained: number } {
    let r = row.filter(v => v)
    let gained = 0
    for (let i = 0; i < r.length - 1; i++) {
      if (r[i] === r[i + 1]) { r[i] *= 2; gained += r[i]; r.splice(i + 1, 1) }
    }
    while (r.length < 4) r.push(0)
    return { row: r, gained }
  }

  const move = useCallback((d: 'U' | 'D' | 'L' | 'R') => {
    setGrid(prev => {
      let g = prev.map(r => [...r])
      let totalGained = 0
      const rotateLeft = (m: number[][]) => m[0].map((_, i) => m.map(r => r[i]).reverse())
      const rotateRight = (m: number[][]) => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]))
      if (d === 'U') g = rotateLeft(g)
      if (d === 'D') g = rotateRight(g)
      if (d === 'R') g = g.map(r => r.reverse())
      g = g.map(row => { const { row: r, gained } = slide(row); totalGained += gained; return r })
      if (d === 'U') g = rotateRight(g)
      if (d === 'D') g = rotateLeft(g)
      if (d === 'R') g = g.map(r => r.reverse())
      setScore(s => s + totalGained)
      if (JSON.stringify(g) !== JSON.stringify(prev)) g = addRandom(g)
      return g
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move('U')
      if (e.key === 'ArrowDown') move('D')
      if (e.key === 'ArrowLeft') move('L')
      if (e.key === 'ArrowRight') move('R')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 'R' : 'L')
    } else {
      if (Math.abs(dy) > 30) move(dy > 0 ? 'D' : 'U')
    }
  }

  const colorFor = (v: number) => {
    const map: any = { 0: 'transparent', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f',
      64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' }
    return map[v] || accent
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Score : <span style={{ color: accent }}>{score}</span></div>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
          width: 'min(85vw, 340px)', aspectRatio: '1',
          background: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 12,
          border: `2px solid ${accent}50`,
        }}>
        {grid.flat().map((v, i) => (
          <div key={i} style={{
            background: colorFor(v), borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: v >= 1024 ? 22 : v >= 100 ? 26 : 32, fontWeight: 800,
            color: v <= 4 ? '#776e65' : '#fff',
          }}>{v || ''}</div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Glissez (touch) ou flèches du clavier</div>
      <button onClick={() => { setGrid(init); setScore(0) }} style={btnPrimary(accent)}>Recommencer</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Memory
// ════════════════════════════════════════════════════════════════════════════
function Memory({ accent }: { accent: string }) {
  const SYMS = ['🍕', '🍔', '🌮', '🍣', '🥐', '🍰', '🍷', '☕']
  const init = () => [...SYMS, ...SYMS]
    .map((s, i) => ({ id: i, sym: s, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
  const [cards, setCards] = useState(init)
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)

  const click = (i: number) => {
    if (cards[i].flipped || cards[i].matched || flipped.length === 2) return
    const next = cards.map((c, idx) => idx === i ? { ...c, flipped: true } : c)
    setCards(next)
    const newFlipped = [...flipped, i]
    setFlipped(newFlipped)
    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      setTimeout(() => {
        if (next[newFlipped[0]].sym === next[newFlipped[1]].sym) {
          setCards(c => c.map((card, idx) => newFlipped.includes(idx) ? { ...card, matched: true } : card))
        } else {
          setCards(c => c.map((card, idx) => newFlipped.includes(idx) ? { ...card, flipped: false } : card))
        }
        setFlipped([])
      }, 700)
    }
  }
  const won = cards.every(c => c.matched)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Coups : <span style={{ color: accent }}>{moves}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 70px)', gap: 6 }}>
        {cards.map((c, i) => (
          <button key={c.id} onClick={() => click(i)} style={{
            width: 70, height: 70, fontSize: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: c.matched ? `${accent}50` : c.flipped ? `${accent}30` : 'rgba(255,255,255,0.06)',
            transition: 'all .25s', transform: c.flipped ? 'rotateY(180deg)' : 'none',
          }}>{c.flipped || c.matched ? c.sym : '?'}</button>
        ))}
      </div>
      {won && <div style={{ color: '#10b981', fontWeight: 800, fontSize: 20 }}>🎉 Bravo en {moves} coups !</div>}
      <button onClick={() => { setCards(init); setFlipped([]); setMoves(0) }} style={btnPrimary(accent)}>Nouvelle partie</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Pong
// ════════════════════════════════════════════════════════════════════════════
function Pong({ accent }: { accent: string }) {
  const [score, setScore] = useState({ player: 0, cpu: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    ball: { x: 200, y: 150, vx: 4, vy: 3 },
    pp: 100, cp: 100, // paddles y
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height, PH = 60

    let raf: number
    const loop = () => {
      const s = stateRef.current
      s.ball.x += s.ball.vx; s.ball.y += s.ball.vy
      if (s.ball.y < 0 || s.ball.y > H) s.ball.vy *= -1
      // Player paddle (left)
      if (s.ball.x < 20 && s.ball.y > s.pp && s.ball.y < s.pp + PH) s.ball.vx *= -1
      // CPU paddle (right)
      if (s.ball.x > W - 20 && s.ball.y > s.cp && s.ball.y < s.cp + PH) s.ball.vx *= -1
      // CPU AI
      const target = s.ball.y - PH / 2
      s.cp += (target - s.cp) * 0.05
      // Score
      if (s.ball.x < 0) { setScore(sc => ({ ...sc, cpu: sc.cpu + 1 })); s.ball.x = W / 2; s.ball.y = H / 2; s.ball.vx = 4 }
      if (s.ball.x > W) { setScore(sc => ({ ...sc, player: sc.player + 1 })); s.ball.x = W / 2; s.ball.y = H / 2; s.ball.vx = -4 }
      // Draw
      ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = accent
      ctx.fillRect(10, s.pp, 8, PH)
      ctx.fillRect(W - 18, s.cp, 8, PH)
      ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 5, 0, Math.PI * 2); ctx.fill()
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [accent])

  const move = (dy: number) => {
    stateRef.current.pp = Math.max(0, Math.min(240, stateRef.current.pp + dy))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move(-30)
      if (e.key === 'ArrowDown') move(30)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>
        {score.player} : {score.cpu}
      </div>
      <canvas ref={canvasRef} width={400} height={300}
        style={{ border: `2px solid ${accent}50`, borderRadius: 8, maxWidth: '90vw', height: 'auto' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onTouchStart={() => move(-30)} onClick={() => move(-30)} style={padBtn(accent)}>↑</button>
        <button onTouchStart={() => move(30)} onClick={() => move(30)} style={padBtn(accent)}>↓</button>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Flèches haut/bas ou boutons tactiles</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Puissance 4
// ════════════════════════════════════════════════════════════════════════════
function Puissance4({ accent }: { accent: string }) {
  const COLS = 7, ROWS = 6
  const init = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  const [grid, setGrid] = useState<number[][]>(init)
  const [turn, setTurn] = useState<1 | 2>(1)
  const [winner, setWinner] = useState(0)

  const checkWin = (g: number[][], p: number): boolean => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++)
      if (g[r][c] === p && g[r][c+1] === p && g[r][c+2] === p && g[r][c+3] === p) return true
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c < COLS; c++)
      if (g[r][c] === p && g[r+1][c] === p && g[r+2][c] === p && g[r+3][c] === p) return true
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++)
      if (g[r][c] === p && g[r+1][c+1] === p && g[r+2][c+2] === p && g[r+3][c+3] === p) return true
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++)
      if (g[r][c] === p && g[r-1][c+1] === p && g[r-2][c+2] === p && g[r-3][c+3] === p) return true
    return false
  }

  const drop = (col: number, p: number, g: number[][]) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][col] === 0) { g[r][col] = p; return r }
    }
    return -1
  }

  const play = (col: number) => {
    if (winner) return
    const g = grid.map(r => [...r])
    const r = drop(col, 1, g)
    if (r < 0) return
    if (checkWin(g, 1)) { setGrid(g); setWinner(1); return }
    // CPU random valid column
    const valid = Array.from({ length: COLS }, (_, i) => i).filter(c => g[0][c] === 0)
    if (valid.length === 0) { setGrid(g); setWinner(3); return }
    const cpu = valid[Math.floor(Math.random() * valid.length)]
    drop(cpu, 2, g)
    setGrid(g)
    if (checkWin(g, 2)) setWinner(2)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Vous (rouge) vs CPU (jaune)</div>
      <div style={{ background: '#1e3a8a', padding: 10, borderRadius: 12 }}>
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex', gap: 6 }}>
            {row.map((cell, c) => (
              <button key={c} onClick={() => play(c)} disabled={!!winner}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: cell === 1 ? '#ef4444' : cell === 2 ? '#fbbf24' : '#0f172a',
                  border: 'none', cursor: winner ? 'default' : 'pointer', marginBottom: 6,
                }} />
            ))}
          </div>
        ))}
      </div>
      {winner > 0 && (
        <div style={{ fontSize: 18, fontWeight: 800, color: winner === 1 ? '#10b981' : winner === 2 ? '#ef4444' : '#94a3b8' }}>
          {winner === 1 ? '🎉 Gagné !' : winner === 2 ? '🤖 CPU gagne' : '🤝 Égalité'}
        </div>
      )}
      <button onClick={() => { setGrid(init); setTurn(1); setWinner(0) }} style={btnPrimary(accent)}>Recommencer</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Quiz
// ════════════════════════════════════════════════════════════════════════════
function Quiz({ accent }: { accent: string }) {
  const QUESTIONS = [
    { q: 'Capitale du Luxembourg ?', opts: ['Esch', 'Luxembourg', 'Bruxelles', 'Trier'], a: 1 },
    { q: 'Combien de communes au Luxembourg ?', opts: ['50', '102', '150', '200'], a: 1 },
    { q: 'Langue officielle nationale ?', opts: ['Français', 'Allemand', 'Lëtzebuergesch', 'Anglais'], a: 2 },
    { q: 'Devise du Luxembourg ?', opts: ['Franc', 'Euro', 'Dollar', 'Mark'], a: 1 },
    { q: 'Plus grand restaurant chain LU ?', opts: ['Quick', 'Mc Donald\'s', 'Subway', 'KFC'], a: 1 },
  ]
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === QUESTIONS[idx].a) setScore(s => s + 1)
    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) { setIdx(idx + 1); setPicked(null) }
    }, 1000)
  }

  const done = idx === QUESTIONS.length - 1 && picked !== null
  const reset = () => { setIdx(0); setScore(0); setPicked(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 400 }}>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>Question {idx + 1} / {QUESTIONS.length} · Score {score}</div>
      <h2 style={{ margin: 0, fontSize: 20, textAlign: 'center' }}>{QUESTIONS[idx].q}</h2>
      <div style={{ display: 'grid', gap: 8, width: '100%' }}>
        {QUESTIONS[idx].opts.map((o, i) => {
          const right = picked !== null && i === QUESTIONS[idx].a
          const wrong = picked === i && i !== QUESTIONS[idx].a
          return (
            <button key={i} onClick={() => choose(i)} disabled={picked !== null}
              style={{
                padding: 14, borderRadius: 10, border: 'none', cursor: picked === null ? 'pointer' : 'default',
                background: right ? '#10b981' : wrong ? '#ef4444' : `${accent}20`,
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>{o}</button>
          )
        })}
      </div>
      {done && (
        <>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent, marginTop: 14 }}>
            🏆 {score} / {QUESTIONS.length}
          </div>
          <button onClick={reset} style={btnPrimary(accent)}>Recommencer</button>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Fléchettes
// ════════════════════════════════════════════════════════════════════════════
function Flechettes({ accent }: { accent: string }) {
  const [shots, setShots] = useState<{ x: number; y: number; pts: number }[]>([])
  const [score, setScore] = useState(0)

  const throwAt = (e: React.MouseEvent | React.TouchEvent) => {
    if (shots.length >= 6) return
    const target = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = target.left + target.width / 2
    const cy = target.top + target.height / 2
    let clientX: number, clientY: number
    if ('touches' in e || 'changedTouches' in e) {
      const tt = (e as any).changedTouches?.[0] || (e as any).touches?.[0]
      clientX = tt.clientX; clientY = tt.clientY
    } else { clientX = (e as any).clientX; clientY = (e as any).clientY }
    // Add small randomness
    const dx = (clientX - cx) + (Math.random() - 0.5) * 30
    const dy = (clientY - cy) + (Math.random() - 0.5) * 30
    const dist = Math.sqrt(dx * dx + dy * dy)
    const pts = dist < 20 ? 50 : dist < 40 ? 25 : dist < 70 ? 10 : dist < 100 ? 5 : dist < 130 ? 1 : 0
    const x = cx + dx, y = cy + dy
    setShots(s => [...s, { x: dx, y: dy, pts }])
    setScore(s => s + pts)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>
        {6 - shots.length} flèche{6 - shots.length > 1 ? 's' : ''} restante{6 - shots.length > 1 ? 's' : ''} · Score : <span style={{ color: accent }}>{score}</span>
      </div>
      <div onClick={throwAt} onTouchEnd={throwAt}
        style={{
          width: 280, height: 280, borderRadius: '50%', position: 'relative',
          background: 'radial-gradient(circle, #ef4444 0% 8%, #fbbf24 8% 16%, #ef4444 16% 24%, #0a0a14 24% 36%, #fff 36% 48%, #0a0a14 48% 60%, #fff 60% 72%, #ef4444 72% 84%, #0a0a14 84% 100%)',
          cursor: 'crosshair', border: `4px solid ${accent}`,
        }}>
        {shots.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)`,
            transform: 'translate(-50%,-50%)',
            width: 16, height: 16, borderRadius: '50%',
            background: '#10b981', border: '2px solid #fff', boxShadow: '0 0 8px #10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#0f172a',
          }}>{s.pts}</div>
        ))}
      </div>
      {shots.length >= 6 && (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>🏁 Total : {score}</div>
          <button onClick={() => { setShots([]); setScore(0) }} style={btnPrimary(accent)}>Rejouer</button>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Coming soon
// ════════════════════════════════════════════════════════════════════════════
function ComingSoon({ accent }: { accent: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 80 }}>🚧</div>
      <h2 style={{ margin: '12px 0 4px' }}>Bientôt disponible</h2>
      <p style={{ color: '#94a3b8' }}>Ce jeu arrive prochainement sur Creorga.</p>
      <p style={{ color: '#a78bfa', fontSize: 12, marginTop: 14 }}>
        Essayez plutôt : Morpion · Snake · 2048 · Memory · Pong · Puissance 4 · Quiz · Fléchettes
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Shared styles
// ════════════════════════════════════════════════════════════════════════════
const btnPrimary = (accent: string): React.CSSProperties => ({
  padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
  background: `linear-gradient(135deg, ${accent}, #ec4899)`,
  color: '#fff', fontWeight: 800, fontSize: 14,
  boxShadow: `0 4px 14px ${accent}50`,
})
const padBtn = (accent: string): React.CSSProperties => ({
  width: 60, height: 60, borderRadius: 12, border: 'none', cursor: 'pointer',
  background: `${accent}30`, color: '#fff', fontSize: 22, fontWeight: 800,
  touchAction: 'manipulation',
})
