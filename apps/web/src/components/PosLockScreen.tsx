import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Delete } from 'lucide-react'

/**
 * v4.7 — Verrouillage PIN du POS.
 *
 * PIN hashé (SHA-256) stocké dans localStorage — jamais en clair.
 * Premier lancement : définition du PIN. Auto-lock après 5 min d'inactivité
 * sur les routes /pos uniquement (contrôlé par le parent via `active`).
 */

const PIN_KEY = 'creorga.pos.pin'
const LOCK_KEY = 'creorga.pos.locked'
const AUTO_LOCK_MS = 5 * 60 * 1000

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function usePosAutoLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    let timer: number

    const rearm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        try { localStorage.setItem(LOCK_KEY, '1') } catch { /* */ }
        window.dispatchEvent(new Event('creorga:pos-lock'))
      }, AUTO_LOCK_MS)
    }

    rearm()
    window.addEventListener('pointerdown', rearm)
    window.addEventListener('keydown', rearm)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', rearm)
      window.removeEventListener('keydown', rearm)
    }
  }, [active])
}

export function lockPos() {
  try { localStorage.setItem(LOCK_KEY, '1') } catch { /* */ }
  window.dispatchEvent(new Event('creorga:pos-lock'))
}

export default function PosLockScreen({ active }: { active: boolean }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [locked, setLocked] = useState(false)
  const [entry, setEntry] = useState('')
  const [setupEntry, setSetupEntry] = useState('')
  const [error, setError] = useState(false)
  const shakeTimeout = useRef<number>()

  usePosAutoLock(active)

  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem(PIN_KEY) } catch { /* */ }
    setHasPin(!!stored)
  }, [])

  useEffect(() => {
    const check = () => {
      let isLocked = false
      try { isLocked = localStorage.getItem(LOCK_KEY) === '1' } catch { /* */ }
      setLocked(isLocked)
    }
    check()
    window.addEventListener('creorga:pos-lock', check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener('creorga:pos-lock', check)
      window.removeEventListener('storage', check)
    }
  }, [])

  useEffect(() => {
    if (!hasPin && setupEntry.length === 4) {
      sha256(setupEntry).then((hash) => {
        try { localStorage.setItem(PIN_KEY, hash) } catch { /* */ }
        setHasPin(true)
        setSetupEntry('')
        try { localStorage.removeItem(LOCK_KEY) } catch { /* */ }
        setLocked(false)
      })
    }
  }, [setupEntry, hasPin])

  useEffect(() => {
    if (hasPin && entry.length === 4) {
      (async () => {
        let stored: string | null = null
        try { stored = localStorage.getItem(PIN_KEY) } catch { /* */ }
        const hash = await sha256(entry)
        if (hash === stored) {
          try { localStorage.removeItem(LOCK_KEY) } catch { /* */ }
          setLocked(false)
          setEntry('')
        } else {
          setError(true)
          window.clearTimeout(shakeTimeout.current)
          shakeTimeout.current = window.setTimeout(() => { setError(false); setEntry('') }, 500)
        }
      })()
    }
  }, [entry, hasPin])

  if (!active || hasPin === null) return null
  if (!locked && hasPin) return null

  const digit = (d: string) => {
    if (!hasPin) {
      if (setupEntry.length < 4) setSetupEntry((v) => v + d)
      return
    }
    if (entry.length < 4) setEntry((v) => v + d)
  }

  const backspace = () => {
    if (!hasPin) setSetupEntry((v) => v.slice(0, -1))
    else setEntry((v) => v.slice(0, -1))
  }

  const currentEntry = hasPin ? entry : setupEntry
  const title = hasPin ? 'POS verrouillé' : 'Définir un PIN (4 chiffres)'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9500,
          background: 'rgba(2,6,23,0.94)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
        <motion.div
          animate={error ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
          style={{
            background: '#0f172a', border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 22, padding: 32, maxWidth: 360, width: '100%',
            color: '#f8fafc', textAlign: 'center',
          }}>
          <Lock size={36} color="#a78bfa" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>{title}</h2>
          {!hasPin && (
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 16px' }}>
              Ce PIN protégera l'accès au POS après 5 minutes d'inactivité.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '18px 0' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: currentEntry.length > i ? (error ? '#ef4444' : '#a78bfa') : 'rgba(148,163,184,0.25)',
                transition: 'background 0.15s ease',
              }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} onClick={() => digit(d)} style={keyStyle}>{d}</button>
            ))}
            <div />
            <button onClick={() => digit('0')} style={keyStyle}>0</button>
            <button onClick={backspace} style={keyStyle}><Delete size={18} /></button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const keyStyle: React.CSSProperties = {
  height: 56, borderRadius: 14, border: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(255,255,255,0.04)', color: '#f8fafc', fontSize: 20, fontWeight: 800,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
