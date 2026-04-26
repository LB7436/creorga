import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, X } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface AIAction {
  id: string
  module: string
  label: string
  description: string
  format: 'json' | 'text'
}

interface Props {
  module: string
  context: any
  label?: string
  inline?: boolean
}

/**
 * Reusable AI action menu — drop into any module.
 *
 *   <AIActionMenu module="crm" context={{ name, daysAbsent }} />
 *
 * Shows a sparkle button → opens dropdown of actions for that module.
 * Click action → shows result modal with text or JSON.
 */
export default function AIActionMenu({ module, context, label, inline }: Props) {
  const [open, setOpen] = useState(false)
  const [actions, setActions] = useState<AIAction[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [result, setResult] = useState<{ action: AIAction; text?: string; data?: any } | null>(null)

  useEffect(() => {
    fetch(`${BACKEND}/api/ai/catalogue`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.actions) setActions(data.actions.filter((a: AIAction) => a.module === module))
      })
      .catch(() => { /* offline */ })
  }, [module])

  const run = async (action: AIAction) => {
    setOpen(false)
    setBusy(action.id)
    setResult({ action })
    try {
      const r = await fetch(`${BACKEND}/api/ai/run-action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: action.id, context }),
      })
      const data = await r.json()
      setResult({ action, ...data })
    } catch (e: any) {
      setResult({ action, text: '❌ ' + (e.message || 'Erreur') })
    } finally { setBusy(null) }
  }

  if (actions.length === 0) return null

  return (
    <div style={{ position: 'relative', display: inline ? 'inline-block' : 'block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
          border: '1px solid rgba(139,92,246,0.3)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
          color: '#7c3aed', fontWeight: 700, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
        <Sparkles size={14} /> {label || 'IA'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: '#fff', borderRadius: 12, minWidth: 280,
              boxShadow: '0 12px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,92,246,0.15)',
              zIndex: 100, padding: 6,
            }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
              ✨ Actions IA · {module}
            </div>
            {actions.map((a) => (
              <button key={a.id} onClick={() => run(a)} disabled={!!busy}
                style={{
                  display: 'block', width: '100%', padding: '10px 12px',
                  borderRadius: 8, border: 'none', background: 'transparent',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.description}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal */}
      <AnimatePresence>
        {result && (
          <motion.div onClick={() => setResult(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              backdropFilter: 'blur(4px)',
            }}>
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              style={{
                background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
                maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
              <header style={{
                padding: 16, borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                    ✨ Résultat IA
                  </div>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>{result.action.label}</h2>
                </div>
                <button onClick={() => setResult(null)} style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: 'pointer',
                }}><X size={16} /></button>
              </header>

              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                {busy === result.action.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40, color: '#64748b' }}>
                    <Loader2 size={20} className="spin" /> Gemma 2B réfléchit…
                  </div>
                ) : result.text ? (
                  <div style={{
                    padding: 16, background: '#f8fafc', borderRadius: 10,
                    fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1e293b',
                  }}>{result.text}</div>
                ) : result.data ? (
                  <pre style={{
                    margin: 0, padding: 16, background: '#0f172a', color: '#e2e8f0',
                    borderRadius: 10, fontSize: 12, fontFamily: 'monospace',
                    overflow: 'auto', maxHeight: 400,
                  }}>{JSON.stringify(result.data, null, 2)}</pre>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: 30 }}>
                    Pas de résultat
                  </div>
                )}
              </div>

              <footer style={{ padding: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {result.text && (
                  <button onClick={() => navigator.clipboard.writeText(result.text || '')} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}>📋 Copier</button>
                )}
                <button onClick={() => setResult(null)} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Fermer</button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} } .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
