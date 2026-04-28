import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Mic, MicOff, Send, X, Volume2, VolumeX, Sparkles, Settings, Maximize2, Minimize2, RotateCcw,
  Plus, Menu, Archive, Trash2, MessageSquare, Image as ImageIcon, Paperclip, Camera, Edit2, Video,
} from 'lucide-react'
import AssistantMascot from './AssistantMascot'
import { useAssistant, type AssistantAttachment } from '@/stores/assistantStore'
import { useTheme } from '@/lib/theme'

// v3.18 — backend dynamique (localStorage > env > localhost)
function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

/**
 * AssistantPanel — full personal robot assistant with voice + actions.
 *
 * Modes :
 *   - overlay : floating right panel
 *   - dock    : pinned right column (resizable)
 *   - full    : fullscreen
 *
 * Voice : Web Speech API listen + Web Speech Synthesis speak.
 */

export default function AssistantPanel() {
  const a = useAssistant()
  const navigate = useNavigate()
  const location = useLocation()
  const themeStore = useTheme()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [pendingPreview, setPendingPreview] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  // v3.18 — handle file attachment
  async function handleAttach(file: File, kind: AssistantAttachment['kind']) {
    if (file.size > 20 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 20 MB)')
      return
    }
    const dataUrl = file.type.startsWith('image') || file.type.startsWith('video')
      ? await fileToDataUrl(file)
      : undefined
    a.addAttachment({ kind, name: file.name, mimeType: file.type, size: file.size, dataUrl })
  }

  const activeConvs = a.conversations.filter((c) => !c.archived)
  const archivedConvs = a.conversations.filter((c) => c.archived)
  const currentConv = a.conversations.find((c) => c.id === a.currentConversationId)

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

  // Auto-listen on open if enabled
  useEffect(() => {
    if (a.open && a.autoListen && a.mode === 'idle') startListening()
    if (!a.open && a.mode === 'listening') stopListening()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.open, a.autoListen])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [a.messages])

  // Global hotkey Ctrl+Shift+A
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        a.setOpen(!a.open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [a])

  function speak(text: string) {
    if (!a.voiceEnabled) return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const cleanText = text.replace(/[*_`#✅❌🚪🌙☀️🎓🔍📅✨🤖💬🎤]/g, '').replace(/\[Sources?:.*?\]/g, '').trim()
    const u = new SpeechSynthesisUtterance(cleanText)
    u.lang = 'fr-FR'
    u.rate = a.voiceSpeed
    u.pitch = 1.05
    a.setMode('speaking')
    u.onend = () => a.setMode('idle')
    u.onerror = () => a.setMode('idle')
    synth.speak(u)
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      a.addMessage({ role: 'bot', text: '🎤 Reconnaissance vocale non disponible (Chrome / Edge requis).' })
      return
    }
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* ignore */ }
    const rec = new SR()
    rec.lang = navigator.language?.startsWith('de') ? 'de-DE'
              : navigator.language?.startsWith('en') ? 'en-US'
              : navigator.language?.startsWith('pt') ? 'pt-PT'
              : 'fr-FR'
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
    recognitionRef.current = null
    a.setMode('idle')
  }

  async function ask(text: string) {
    if (!text.trim()) return
    a.addMessage({ role: 'user', text })
    setInput('')
    a.setMode('thinking')
    try {
      // v3.11 : workflow endpoint auto-detects multi-step ("X et Y et Z")
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
          role: 'bot',
          text: data.summary,
          ui: data.details,
          action: { intent: data.intent, success: data.success, summary: data.summary },
        })
        speak(data.summary)
        if (data.uiAction?.type === 'preview') {
          setPendingPreview(data.uiAction)
        } else if (data.uiAction?.type === 'navigate') {
          setTimeout(() => navigate(data.uiAction.to), 800)
        } else if (data.uiAction?.type === 'theme') {
          themeStore.setTheme(data.uiAction.value)
        }
      } else {
        const txt = data.text || 'Pas de réponse.'
        a.addMessage({ role: 'bot', text: txt })
        speak(txt)
      }
    } catch (e: any) {
      a.addMessage({ role: 'bot', text: `❌ Erreur : ${e?.message || 'inconnue'}` })
      a.setMode('idle')
    } finally {
      if (a.mode === 'thinking') a.setMode('idle')
    }
  }

  if (!a.open) return null

  const panelStyle: React.CSSProperties = a.panelMode === 'full'
    ? { position: 'fixed', inset: 0, zIndex: 9999 }
    : a.panelMode === 'dock'
    ? { position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 9999 }
    : { position: 'fixed', bottom: 96, right: 24, width: 420, height: 600, zIndex: 9999, borderRadius: 18 }

  const SUGGESTIONS = [
    'Mets 3 cafés sur la table 1',
    'Qui travaille aujourd\'hui ?',
    'Crée une facture pour Brasserie du Centre de 850€',
    'Active le mode sombre',
    'Va au planning',
    'Cherche sur internet le prix moyen d\'un café à Luxembourg',
    'Sauvegarde le stock maintenant',
    'Ferme la table 3',
  ]

  return (
    <AnimatePresence>
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{
          ...panelStyle,
          background: 'linear-gradient(180deg, #0a0a14 0%, #1a0a2e 100%)',
          color: '#f1f5f9',
          boxShadow: '0 32px 80px rgba(139,92,246,0.4), 0 0 0 1px rgba(167,139,250,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header style={{
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* v3.18 — bouton menu (drawer conversations) */}
          <button onClick={() => setShowDrawer(true)} title="Mes conversations" style={iconBtn}>
            <Menu size={14} />
          </button>
          <div style={{ width: 40, flexShrink: 0 }}>
            <AssistantMascot variant={a.mascot} size={40} listening={a.mode === 'listening'} speaking={a.mode === 'speaking'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentConv?.title || a.name}
            </div>
            <div style={{ fontSize: 10, color: '#a78bfa' }}>
              {a.mode === 'listening' ? '🎤 J\'écoute…'
                : a.mode === 'thinking' ? '🤔 Je réfléchis…'
                : a.mode === 'speaking' ? '💬 Je parle…'
                : `${a.name} · Prêt`}
            </div>
          </div>
          {/* v3.18 — bouton + nouvelle conversation */}
          <button onClick={() => a.newConversation()} title="Nouvelle conversation"
            style={{ ...iconBtn, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff' }}>
            <Plus size={14} />
          </button>
          <button onClick={() => setShowSettings((s) => !s)} title="Paramètres"
            style={iconBtn}><Settings size={14} /></button>
          <button onClick={() => a.setVoiceEnabled(!a.voiceEnabled)} title={a.voiceEnabled ? 'Désactiver voix' : 'Activer voix'}
            style={iconBtn}>{a.voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
          <button onClick={() => a.setPanelMode(a.panelMode === 'full' ? 'overlay' : 'full')} title="Plein écran"
            style={iconBtn}>{a.panelMode === 'full' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          <button onClick={() => a.setOpen(false)} title="Fermer (Ctrl+Shift+A)" style={iconBtn}><X size={14} /></button>
        </header>

        {/* Settings drawer */}
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>Nom de l'assistant</span>
                  <input value={a.name} onChange={(e) => a.setName(e.target.value)} maxLength={20}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', width: 120 }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={a.autoListen} onChange={(e) => a.setAutoListen(e.target.checked)} />
                  Écoute automatique à l'ouverture
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1 }}>Vitesse voix · {a.voiceSpeed.toFixed(1)}</span>
                  <input type="range" min="0.7" max="1.5" step="0.1" value={a.voiceSpeed}
                    onChange={(e) => a.setVoiceSpeed(parseFloat(e.target.value))} style={{ width: 100 }} />
                </label>
                <button onClick={() => navigate('/setup/assistant')}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(167,139,250,0.15)', color: '#fff', cursor: 'pointer' }}>
                  Changer la mascotte
                </button>
                <button onClick={a.clearMessages}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={12} /> Effacer la conversation
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {a.messages.length === 0 && (
            <>
              <div style={{
                padding: 16, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.05))',
                border: '1px solid rgba(167,139,250,0.2)', textAlign: 'center',
              }}>
                <AssistantMascot variant={a.mascot} size={80} animated />
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>Bonjour, je suis {a.name} !</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                  Donnez-moi un ordre à la voix ou écrit. Je peux <b>vraiment agir</b> sur l'app.
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6 }}>
                💡 Exemples
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)}
                    style={{
                      padding: '6px 10px', borderRadius: 999, fontSize: 11,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#cbd5e1', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.15)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {a.messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 14,
                background: m.role === 'user'
                  ? 'linear-gradient(135deg,#8b5cf6,#ec4899)'
                  : m.action?.success ? 'rgba(16,185,129,0.15)'
                  : m.action ? 'rgba(239,68,68,0.15)'
                  : 'rgba(255,255,255,0.06)',
                color: '#f1f5f9', fontSize: 13, lineHeight: 1.5,
                border: m.action?.success ? '1px solid rgba(16,185,129,0.4)' : 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {m.text}
                {m.action && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
                    Intent : <code>{m.action.intent}</code>
                  </div>
                )}
              </div>
            </div>
          ))}

          {a.mode === 'thinking' && (
            <div style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 12, color: '#a78bfa' }}>
              <Sparkles size={12} style={{ verticalAlign: -1 }} /> {a.name} réfléchit…
            </div>
          )}

          {/* Preview confirmation card */}
          <AnimatePresence>
            {pendingPreview && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                  padding: 14, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(236,72,153,0.05))',
                  border: '1px solid rgba(251,191,36,0.4)', marginTop: 10,
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
                      flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                      background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer',
                    }}>
                    ❌ Annuler
                  </button>
                  <button onClick={confirmPreview}
                    style={{
                      flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer',
                    }}>
                    ✅ Valider
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* v3.18 — Pending attachments preview row */}
        {a.attachments.length > 0 && (
          <div style={{
            padding: '8px 12px', display: 'flex', gap: 6, overflowX: 'auto',
            background: 'rgba(139,92,246,0.08)', borderTop: '1px solid rgba(139,92,246,0.2)',
          }}>
            {a.attachments.map((att) => (
              <div key={att.id} style={{ position: 'relative', flexShrink: 0 }}>
                <AttachThumb att={att} />
                <button onClick={() => a.removeAttachment(att.id)} style={{
                  position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 999,
                  background: '#ef4444', color: '#fff', border: '2px solid #0a0a14', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Voice + input bar */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>
          {/* v3.18 — multimodal toolbar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={modalityBtn} title="Ajouter image / vidéo">
              <ImageIcon size={14} />
            </button>
            <button type="button" onClick={() => scanInputRef.current?.click()} style={modalityBtn} title="Scanner / Photo via caméra">
              <Camera size={14} />
            </button>
            <button type="button" onClick={() => docInputRef.current?.click()} style={modalityBtn} title="Joindre un fichier (PDF/doc/csv/xlsx)">
              <Paperclip size={14} />
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={a.clearMessages}
              title="Effacer cette conversation"
              style={{ ...modalityBtn, color: '#fca5a5' }}>
              <RotateCcw size={14} />
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              for (const f of files) await handleAttach(f, f.type.startsWith('video') ? 'video' : 'image')
              e.target.value = ''
            }} />
          <input ref={scanInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) await handleAttach(f, 'scan')
              e.target.value = ''
            }} />
          <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) await handleAttach(f, 'file')
              e.target.value = ''
            }} />

          <form onSubmit={(e) => { e.preventDefault(); ask(input) }} style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => a.mode === 'listening' ? stopListening() : startListening()}
              title={a.mode === 'listening' ? 'Stop' : 'Dictée vocale'}
              style={{
                width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: a.mode === 'listening'
                  ? 'linear-gradient(135deg,#ef4444,#ec4899)'
                  : 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: a.mode === 'listening' ? '0 0 16px rgba(236,72,153,0.6)' : 'none',
              }}>
              {a.mode === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={
                a.mode === 'listening' ? '🎤 Parlez…'
                  : a.attachments.length > 0 ? `${a.attachments.length} pièce(s) jointe(s) — décrire l'action…`
                  : `Dites un ordre à ${a.name}…`
              }
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button type="submit" disabled={(!input.trim() && a.attachments.length === 0) || a.mode === 'thinking'}
              style={{
                padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: (!input.trim() && a.attachments.length === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Send size={16} />
            </button>
          </form>
          <div style={{ marginTop: 6, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
            Ctrl+Shift+A pour ouvrir/fermer · Voix {a.voiceEnabled ? 'ON' : 'OFF'} · {a.conversations.length} conversation{a.conversations.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* v3.18 — DRAWER conversations (slide from left) */}
        <AnimatePresence>
          {showDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowDrawer(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
              />
              <motion.div
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0, width: 280, zIndex: 41,
                  background: '#0a0a14', borderRight: '1px solid rgba(167,139,250,0.2)',
                  display: 'flex', flexDirection: 'column',
                }}>
                <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>💬 Conversations</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 2 }}>{a.conversations.length} discussions</div>
                  </div>
                  <button onClick={() => setShowDrawer(false)} style={iconBtn}><X size={14} /></button>
                </div>
                <button onClick={() => { a.newConversation(); setShowDrawer(false) }}
                  style={{
                    margin: 12, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 800, fontSize: 12,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Plus size={14} /> Nouvelle conversation
                </button>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
                  {activeConvs.length === 0 ? (
                    <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>Aucune conversation active</div>
                  ) : (
                    activeConvs.map((c) => (
                      <ConvRow key={c.id} c={c} active={c.id === a.currentConversationId}
                        onSelect={() => { a.selectConversation(c.id); setShowDrawer(false) }}
                        onArchive={() => a.archiveConversation(c.id)}
                        onDelete={() => a.deleteConversation(c.id)}
                        onRename={(t) => a.renameConversation(c.id, t)} />
                    ))
                  )}
                  {archivedConvs.length > 0 && (
                    <>
                      <button onClick={() => setShowArchived((v) => !v)}
                        style={{
                          width: '100%', marginTop: 10, padding: '8px 10px', borderRadius: 8,
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                          textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                        <Archive size={11} /> Archivées ({archivedConvs.length}) {showArchived ? '▼' : '▸'}
                      </button>
                      {showArchived && archivedConvs.map((c) => (
                        <ConvRow key={c.id} c={c} active={c.id === a.currentConversationId}
                          onSelect={() => { a.selectConversation(c.id); a.unarchiveConversation(c.id); setShowDrawer(false) }}
                          onArchive={() => a.unarchiveConversation(c.id)}
                          onDelete={() => a.deleteConversation(c.id)}
                          onRename={(t) => a.renameConversation(c.id, t)}
                          archived />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

// v3.18 — sub-components
function ConvRow({ c, active, onSelect, onArchive, onDelete, onRename, archived }: any) {
  const [renaming, setRenaming] = useState(false)
  const [tmp, setTmp] = useState(c.title)
  const lastUserMsg = [...c.messages].reverse().find((m: any) => m.role === 'user')?.text || ''
  return (
    <div onClick={() => !renaming && onSelect()} style={{
      padding: 10, borderRadius: 10, marginBottom: 4, cursor: 'pointer',
      background: active ? 'rgba(139,92,246,0.18)' : 'transparent',
      border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
      opacity: archived ? 0.55 : 1,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <MessageSquare size={12} style={{ flexShrink: 0, color: active ? '#a78bfa' : '#94a3b8' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <input autoFocus value={tmp} onChange={(e) => setTmp(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => { onRename(tmp); setRenaming(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRename(tmp); setRenaming(false) } }}
            style={{
              width: '100%', padding: '4px 6px', fontSize: 12, color: '#fff',
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 6, outline: 'none',
            }} />
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.title}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lastUserMsg.slice(0, 50) || `${c.messages.length} message(s)`}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setRenaming(true)} style={miniBtn} title="Renommer"><Edit2 size={11} /></button>
        <button onClick={onArchive} style={miniBtn} title={archived ? 'Désarchiver' : 'Archiver'}><Archive size={11} /></button>
        <button onClick={() => { if (confirm('Supprimer cette conversation ?')) onDelete() }} style={{ ...miniBtn, color: '#fca5a5' }} title="Supprimer">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

function AttachThumb({ att }: { att: AssistantAttachment }) {
  const size = 48
  if (att.dataUrl && att.kind !== 'video') {
    return <img src={att.dataUrl} alt={att.name} style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
  }
  if (att.dataUrl && att.kind === 'video') {
    return (
      <div style={{ width: size, height: size, borderRadius: 6, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Video size={18} color="#a78bfa" />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, padding: 4,
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#a5b4fc', textAlign: 'center',
    }}>
      <Paperclip size={14} />
      <div style={{ fontSize: 7, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {att.name.slice(0, 8)}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)', color: '#cbd5e1',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modalityBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const miniBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}
