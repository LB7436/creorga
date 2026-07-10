/**
 * v6.0 — Kit "juice" partagé par tous les jeux guest.
 * Sons synthétisés WebAudio (zéro asset), haptique, particules poolées,
 * screen-shake, hit-stop, easings, count-up et boucle de jeu rAF.
 */
import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Audio — synthèse WebAudio, unlock au 1er geste, mute global persisté
// ---------------------------------------------------------------------------

const MUTE_KEY = 'creorga.games.muted'
let audioCtx: AudioContext | null = null
let muted = (() => {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
})()

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

function getAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

if (typeof window !== 'undefined') {
  const unlock = () => { getAudio() }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

export function isMuted() { return muted }

export function setMuted(value: boolean) {
  muted = value
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0') } catch { /* */ }
}

export interface ToneOptions {
  freq?: number
  endFreq?: number
  dur?: number
  type?: OscillatorType
  vol?: number
  delay?: number
}

/** Ton synthétisé avec enveloppe (pas de "click"). */
export function tone({ freq = 440, endFreq, dur = 0.1, type = 'square', vol = 0.15, delay = 0 }: ToneOptions = {}) {
  if (muted) return
  const ac = getAudio()
  if (!ac) return
  const t = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + dur)
}

/** Souffle de bruit blanc filtré (explosion, dégât lourd). */
export function noiseBurst({ dur = 0.4, vol = 0.2, fromHz = 2400, toHz = 100 }: { dur?: number; vol?: number; fromHz?: number; toHz?: number } = {}) {
  if (muted) return
  const ac = getAudio()
  if (!ac) return
  const t = ac.currentTime
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(fromHz, t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, toHz), t + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(t)
  src.stop(t + dur)
}

/** Recettes prêtes à l'emploi, cohérentes entre tous les jeux. */
export const sfx = {
  tap: () => tone({ freq: 880, dur: 0.04, vol: 0.1 }),
  coin: () => { tone({ freq: 660, dur: 0.05 }); tone({ freq: 880, dur: 0.06, delay: 0.05 }) },
  good: () => tone({ freq: 440, endFreq: 880, dur: 0.1, type: 'triangle' }),
  bad: () => tone({ freq: 200, endFreq: 50, dur: 0.08, type: 'sawtooth', vol: 0.2 }),
  hit: () => tone({ freq: 160, endFreq: 60, dur: 0.07, type: 'sawtooth', vol: 0.18 }),
  explosion: () => noiseBurst({ dur: 0.45, vol: 0.22 }),
  win: () => [660, 880, 990, 1320].forEach((f, i) => tone({ freq: f, dur: 0.09, type: 'triangle', delay: i * 0.07 })),
  lose: () => [440, 330, 220].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sawtooth', vol: 0.12, delay: i * 0.13 })),
  combo: (level: number) => tone({ freq: 440 * Math.pow(1.06, Math.min(level, 24)), dur: 0.06, type: 'triangle' }),
}

// ---------------------------------------------------------------------------
// Haptique — no-op silencieux si non supporté (iOS Safari)
// ---------------------------------------------------------------------------

export function haptic(pattern: number | number[] = 10) {
  try {
    if (!muted && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch { /* */ }
}

export const buzz = {
  tap: () => haptic(10),
  impact: () => haptic(40),
  win: () => haptic([40, 40, 40, 40, 80]),
  lose: () => haptic([60, 40, 60]),
}

// ---------------------------------------------------------------------------
// Easings + interpolation
// ---------------------------------------------------------------------------

export const ease = {
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  outElastic: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1,
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Rattrapage exponentiel indépendant du framerate (score count-up, caméra…). */
export const damp = (current: number, target: number, k: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-k * dt))

// ---------------------------------------------------------------------------
// Particules — pool fixe (zéro allocation en boucle), rendu fillRect
// ---------------------------------------------------------------------------

export interface Particle {
  alive: boolean
  x: number; y: number
  vx: number; vy: number
  life: number; max: number
  size: number; hue: number
  gravity: number
}

export interface ParticleSystem {
  burst: (x: number, y: number, opts?: { count?: number; hue?: number; speed?: number; gravity?: number; spread?: number }) => void
  confetti: (x: number, y: number, count?: number) => void
  step: (ctx: CanvasRenderingContext2D, dt: number) => void
  clear: () => void
}

export function createParticles(poolSize = 256): ParticleSystem {
  const pool: Particle[] = Array.from({ length: poolSize }, () => ({
    alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, hue: 40, gravity: 500,
  }))

  const spawn = (x: number, y: number, count: number, make: (p: Particle) => void) => {
    let n = 0
    for (const p of pool) {
      if (p.alive || n >= count) continue
      p.alive = true
      p.x = x; p.y = y; p.life = 0
      make(p)
      n++
    }
  }

  return {
    burst(x, y, { count = 12, hue = 40, speed = 240, gravity = 500, spread = Math.PI * 2 } = {}) {
      spawn(x, y, count, (p) => {
        const a = Math.random() * spread - spread / 2 - Math.PI / 2
        const sp = speed * (0.4 + Math.random() * 0.8)
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp
        p.max = 0.4 + Math.random() * 0.4
        p.size = 2 + Math.random() * 3
        p.hue = hue + Math.random() * 24 - 12
        p.gravity = gravity
      })
    },
    confetti(x, y, count = 48) {
      spawn(x, y, count, (p) => {
        const a = Math.random() * Math.PI * 2
        const sp = 160 + Math.random() * 320
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 260
        p.max = 0.9 + Math.random() * 0.9
        p.size = 3 + Math.random() * 4
        p.hue = Math.random() * 360
        p.gravity = 640
      })
    },
    step(ctx, dt) {
      for (const p of pool) {
        if (!p.alive) continue
        p.life += dt
        if (p.life >= p.max) { p.alive = false; continue }
        p.vy += p.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        ctx.globalAlpha = 1 - p.life / p.max
        ctx.fillStyle = `hsl(${p.hue} 90% 60%)`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }
      ctx.globalAlpha = 1
    },
    clear() { for (const p of pool) p.alive = false },
  }
}

// ---------------------------------------------------------------------------
// Screen-shake (trauma²) + hit-stop
// ---------------------------------------------------------------------------

export interface Shaker {
  add: (amount?: number) => void
  /** Applique un ctx.translate — appeler après ctx.save(), avant le rendu. */
  apply: (ctx: CanvasRenderingContext2D, dt: number) => void
  offset: (dt: number) => { x: number; y: number }
}

export function createShaker(maxPx = 8): Shaker {
  let trauma = 0
  const offset = (dt: number) => {
    trauma = Math.max(0, trauma - dt * 2.5)
    const s = trauma * trauma * maxPx
    return { x: (Math.random() * 2 - 1) * s, y: (Math.random() * 2 - 1) * s }
  }
  return {
    add(amount = 0.5) { trauma = Math.min(1, trauma + amount) },
    apply(ctx, dt) { const { x, y } = offset(dt); ctx.translate(x, y) },
    offset,
  }
}

export interface HitStopper {
  trigger: (ms?: number) => void
  /** Renvoie le dt effectif (0 pendant le gel). */
  filter: (dt: number) => number
}

export function createHitStop(): HitStopper {
  let remaining = 0
  return {
    trigger(ms = 70) { remaining = Math.max(remaining, ms / 1000) },
    filter(dt) {
      if (remaining <= 0) return dt
      remaining -= dt
      return 0
    },
  }
}

// ---------------------------------------------------------------------------
// Canvas net (devicePixelRatio) + boucle de jeu rAF avec pause auto
// ---------------------------------------------------------------------------

/** Backing store en pixels physiques, dessin en coordonnées logiques. DPR cap 2. */
export function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

const MAX_DT = 0.05

/**
 * Boucle rAF : dt clampé à 50 ms, pause automatique quand l'onglet est caché
 * (le plat arrive !), reprise sans dt géant. `running` coupe la boucle sans démonter.
 */
export function useGameLoop(update: (dt: number) => void, render: () => void, running = true) {
  const updateRef = useRef(update)
  const renderRef = useRef(render)
  updateRef.current = update
  renderRef.current = render

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    let active = true

    const frame = (now: number) => {
      if (!active) return
      const dt = Math.min((now - last) / 1000, MAX_DT)
      last = now
      updateRef.current(dt)
      renderRef.current()
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        active = false
        cancelAnimationFrame(raf)
      } else {
        active = true
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(frame)
    return () => {
      active = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [running])
}
