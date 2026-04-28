import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, Volume2, VolumeX, X, Check } from 'lucide-react'
import AssistantMascot from '@/components/AssistantMascot'
import { useAssistant } from '@/stores/assistantStore'
import { useTheme } from '@/lib/theme'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Mobile fullscreen Robi — voice-first, large mascot, BIG mic button.
 * Idéal sur smartphone : 1 main, 1 doigt sur le micro.
 *
 * + Preview / Confirm pour les actions destructrices (planning, etc.)
 */

export default function MobileRobi() {
  const a = useAssistant()
  const location = useLocation()
  const navigate = useNavigate()
  const themeStore = useTheme()
  const [input, setInput] = useState('')
  const [pendingPreview, setPendingPreview] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [a.messages])

  function speak(text: string) {
    if (!a.voiceEnabled) return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const cleanText = text.replace(/[*_`#✅❌🚪🌙☀️🎓🔍📅✨🤖💬🎤📋📑🚨📊]/g, '').replace(/\[Sources?:.*?\]/g, '').trim()
    const u = new SpeechSynthesisUtterance(cleanText)
    u.lang = 'fr-FR'
    u.rate = a.voiceSpeed
    a.setMode('speaking')
    u.onend = () => a.setMode('idle')
    u.onerror = () => a.setMode('idle')
    synth.speak(u)
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ignore */ }
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e: any) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      setInput(txt)
      if (e.results[0]?.isFinal) {
        recognitionRef.current = null
        a.setMode('idle')
        if (txt.trim()) ask(txt)
      }
    }
    rec.onerror = () => a.setMode('idle')
    rec.onend = () => { if (a.mode === 'listening') a.setMode('idle') }
    recognitionRef.current = rec
    a.setMode('listening')
    rec.start()
  }

  function stopListening() {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    a.setMode('idle')
  }

  async function ask(text: string) {
    if (!text.trim()) return
    a.addMessage({ role: 'user', text })
    setInput('')
    a.setMode('thinking')
    try {
      const r = await fetch(`${BACKEND}/api/agent/workflow`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, currentPath: location.pathname, userId: 'default' }),
      })
      const data = await r.json()
      if (data.kind === 'workflow') {
        const stepCount = data.steps?.length || 0
        a.addMessage({
          role: 'bot',
          text: `🔗 Workflow ${stepCount} étapes :\n` + (data.steps || []).map((s: any, i: number) => `${i+1}. ${s.summary || s.text || '?'}`).join('\n'),
          action: { intent: 'workflow', success: data.success, summary: data.summary },
        })
        speak(data.summary)
        return
      }
      if (data.kind === 'action') {
        a.addMessage({
          role: 'bot', text: data.summary, ui: data.details,
          action: { intent: data.intent, success: data.success, summary: data.summary },
        })
        speak(data.summary)
        if (data.uiAction?.type === 'preview') {
          setPendingPreview(data.uiAction)
        } else if (data.uiAction?.type === 'navigate') {
          setTimeout(() => navigate(data.uiAction.to), 800)
        } else if (data.uiAction?.type === 'theme') {
          themeStore.setTheme(data.uiAction.value)
        } else if (data.uiAction?.type === 'mode') {
          // mode change : just remember, no ui change yet
          localStorage.setItem('creorga.assistant.context-mode', data.uiAction.value)
        }
      } else {
        const txt = data.text || 'Pas de réponse.'
        a.addMessage({ role: 'bot', text: txt })
        speak(txt)
      }
    } catch (e: any) {
      a.addMessage({ role: 'bot', text: `❌ ${e?.message || 'erreur'}` })
    } finally {
      if (a.mode === 'thinking') a.setMode('idle')
    }
  }

  async function confirmPreview() {
    if (!pendingPreview) return
    try {
      const r = await fetch(`${BACKEND}${pendingPreview.confirmEndpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPreview.confirmPayload),
      })
      const data = await r.json()
      a.addMessage({ role: 'bot', text: data.summary || '✅ Action validée.' })
      speak(data.summary || 'Action validée')
    } catch {
      a.addMessage({ role: 'bot', text: '❌ Erreur de validation.' })
    } finally {
      setPendingPreview(null)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Big mascot in centre */}
      <div style={{
        flexShrink: 0, padding: '12px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <AssistantMascot variant={a.mascot} size={140}
          listening={a.mode === 'listening'} speaking={a.mode === 'speaking'} />
        <div style={{ fontSize: 18, fontWeight: 800 }}>{a.name}</div>
        <div style={{ fontSize: 11, color: '#a78bfa' }}>
          {a.mode === 'listening' ? '🎤 J\'écoute…'
            : a.mode === 'thinking' ? '🤔 Je réfléchis…'
            : a.mode === 'speaking' ? '💬 Je parle…'
            : '😊 Tap le micro pour parler'}
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '4px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {a.messages.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            Essayez : "Mets 3 cafés sur la table 1" · "Qui travaille demain ?" ·
            "Crée une facture pour Brasserie de 850€" · "Active le mode sombre" ·
            "Cherche le prix d'un café à Luxembourg"
          </div>
        )}
        {a.messages.slice(-12).map((m) => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: m.role === 'user'
                ? 'linear-gradient(135deg,#8b5cf6,#ec4899)'
                : m.action?.success ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
              color: '#f1f5f9', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              border: m.action?.success ? '1px solid rgba(16,185,129,0.4)' : 'none',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {a.mode === 'thinking' && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 11, color: '#a78bfa' }}>
            Robi réfléchit…
          </div>
        )}

        {/* Preview confirmation card */}
        <AnimatePresence>
          {pendingPreview && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(236,72,153,0.05))',
                border: '1px solid rgba(251,191,36,0.4)',
              }}>
              <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                ⚡ Aperçu — confirmer pour appliquer
              </div>
              <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                {pendingPreview.confirmText || 'Action proposée'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPendingPreview(null)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)',
                    background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <X size={14} /> Annuler
                </button>
                <button onClick={confirmPreview}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Check size={14} /> Valider
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BIG mic button + input */}
      <div style={{
        flexShrink: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0))',
        background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Mic giant button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => a.mode === 'listening' ? stopListening() : startListening()}
            style={{
              width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: a.mode === 'listening'
                ? 'linear-gradient(135deg,#ef4444,#ec4899)'
                : 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: a.mode === 'listening'
                ? '0 0 32px rgba(236,72,153,0.7), 0 0 0 6px rgba(236,72,153,0.2)'
                : '0 8px 24px rgba(139,92,246,0.5)',
            }}>
            {a.mode === 'listening' ? <MicOff size={32} /> : <Mic size={32} />}
          </motion.button>
        </div>

        {/* Text fallback */}
        <form onSubmit={(e) => { e.preventDefault(); ask(input) }} style={{ display: 'flex', gap: 6 }}>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={a.mode === 'listening' ? '🎤 Parlez…' : 'Ou tapez votre demande…'}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" disabled={!input.trim()}
            style={{
              width: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Send size={16} />
          </button>
          <button type="button" onClick={() => a.setVoiceEnabled(!a.voiceEnabled)}
            style={{
              width: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: a.voiceEnabled ? '#10b981' : '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {a.voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
