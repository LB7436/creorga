import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertTriangle, MousePointer2, Type as TypeIcon, ArrowRight } from 'lucide-react'

/**
 * v3.19 F4 — Operator mode listener.
 *
 * Écoute le flux SSE `/api/agent/operator/stream` et exécute les actions DOM :
 *   - click(selector)       → simulate click
 *   - fill(selector, value) → set input value + dispatch input event
 *   - keypress(key)         → keyboard event
 *   - navigate(to)          → location.assign
 *   - highlight(selector)   → outline rouge clignotant
 *   - speak(text)           → speechSynthesis
 *
 * Actions `critical: true` → modal confirmation OBLIGATOIRE avant exec.
 * Acknowledge backend après chaque action via /api/agent/operator/ack.
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

interface OperatorAction {
  id: string
  type: 'click' | 'fill' | 'navigate' | 'keypress' | 'highlight' | 'speak' | 'connected'
  payload: any
  description: string
  critical?: boolean
  ts: number
}

async function ackAction(actionId: string, status: 'done' | 'cancelled' | 'error', result?: any) {
  try {
    await fetch(`${getBackend()}/api/agent/operator/ack`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, status, result }),
    })
  } catch { /* ignore */ }
}

function execAction(action: OperatorAction): { ok: boolean; result?: any } {
  try {
    switch (action.type) {
      case 'click': {
        const el = document.querySelector(action.payload?.selector) as HTMLElement | null
        if (!el) return { ok: false, result: 'selector not found' }
        el.click()
        return { ok: true }
      }
      case 'fill': {
        const el = document.querySelector(action.payload?.selector) as HTMLInputElement | null
        if (!el) return { ok: false, result: 'selector not found' }
        el.focus()
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        nativeSetter?.call(el, action.payload?.value || '')
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return { ok: true }
      }
      case 'keypress': {
        const ev = new KeyboardEvent('keydown', {
          key: action.payload?.key,
          code: action.payload?.key,
          bubbles: true,
        })
        document.activeElement?.dispatchEvent(ev)
        return { ok: true }
      }
      case 'navigate': {
        window.location.assign(action.payload?.to || '/')
        return { ok: true }
      }
      case 'highlight': {
        const el = document.querySelector(action.payload?.selector) as HTMLElement | null
        if (!el) return { ok: false, result: 'selector not found' }
        const prev = el.style.outline
        el.style.outline = '3px solid #ec4899'
        el.style.outlineOffset = '4px'
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { el.style.outline = prev }, 3000)
        return { ok: true }
      }
      case 'speak': {
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(action.payload?.text || '')
          u.lang = 'fr-FR'
          window.speechSynthesis.speak(u)
        }
        return { ok: true }
      }
    }
    return { ok: false, result: 'unknown action type' }
  } catch (e: any) {
    return { ok: false, result: e?.message || 'exec failed' }
  }
}

export default function RobiOperator() {
  const [pending, setPending] = useState<OperatorAction | null>(null)
  const [history, setHistory] = useState<OperatorAction[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const userId = 'default'  // future : real userId
    const url = `${getBackend()}/api/agent/operator/stream?userId=${userId}`
    let es: EventSource | null = null
    try {
      es = new EventSource(url)
    } catch { return }

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (ev) => {
      try {
        const action = JSON.parse(ev.data) as OperatorAction
        if (action.type === 'connected') { setConnected(true); return }
        if (action.critical) {
          // Bloque exec → demande confirmation
          setPending(action)
        } else {
          // Non-critique : exécute direct (avec petit délai pour visibilité)
          const result = execAction(action)
          setHistory((h) => [action, ...h.slice(0, 9)])
          ackAction(action.id, result.ok ? 'done' : 'error', result.result)
        }
      } catch { /* ignore parse errors */ }
    }

    return () => { try { es?.close() } catch { /* */ } }
  }, [])

  const confirmPending = () => {
    if (!pending) return
    const result = execAction(pending)
    setHistory((h) => [pending, ...h.slice(0, 9)])
    ackAction(pending.id, result.ok ? 'done' : 'error', result.result)
    setPending(null)
  }

  const cancelPending = () => {
    if (!pending) return
    ackAction(pending.id, 'cancelled')
    setPending(null)
  }

  // Pas de rendu si rien à afficher (économie DOM)
  if (!pending && history.length === 0 && !connected) return null

  return (
    <>
      {/* Status pill discret en bas droite quand connecté */}
      {connected && !pending && (
        <div style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 9998,
          padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
          background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
          border: '1px solid rgba(139,92,246,0.3)',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          pointerEvents: 'none',
        }}>
          <MousePointer2 size={10} /> Robi opérateur
        </div>
      )}

      {/* Modal confirmation pour actions critiques */}
      <AnimatePresence>
        {pending && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={cancelPending}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998 }}
            />
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 99999, width: 'min(440px, 92vw)',
                background: 'linear-gradient(180deg,#0a0a14,#1a0a2e)',
                border: '2px solid #ec4899',
                borderRadius: 18, padding: 22, color: '#f1f5f9',
                boxShadow: '0 30px 80px rgba(236,72,153,0.4)',
              }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(245,158,11,0.18)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
                <AlertTriangle size={11} /> Action critique
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 800 }}>Robi veut effectuer cette action</h3>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 14 }}>
                {pending.description}
              </div>
              <div style={{
                padding: 10, borderRadius: 10, fontSize: 11, fontFamily: 'ui-monospace,monospace',
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#a78bfa', marginBottom: 14, wordBreak: 'break-all',
              }}>
                {pending.type === 'click' && `click(${pending.payload?.selector})`}
                {pending.type === 'fill' && `fill(${pending.payload?.selector}, "${String(pending.payload?.value || '').slice(0, 60)}")`}
                {pending.type === 'navigate' && `→ ${pending.payload?.to}`}
                {pending.type === 'keypress' && `key: ${pending.payload?.key}`}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={cancelPending} style={{
                  flex: 1, padding: 12, borderRadius: 10, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 13,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <X size={14} /> Annuler
                </button>
                <button onClick={confirmPending} style={{
                  flex: 2, padding: 12, borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', color: '#fff',
                  fontWeight: 800, fontSize: 13,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Check size={14} /> Confirmer <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
