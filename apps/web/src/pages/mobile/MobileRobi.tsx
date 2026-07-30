import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Send, Volume2, VolumeX, X, Check,
  Menu, Plus, Archive, Trash2, MessageSquare, ImageIcon, Paperclip, ScanLine, Camera, Video, Edit2,
} from 'lucide-react'
import AssistantMascot from '@/components/AssistantMascot'
import { useAssistant, type AssistantAttachment } from '@/stores/assistantStore'
import { useTheme } from '@/lib/theme'
import { fetchAuth } from '@/lib/fetchAuth'

function getBackend() {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

/**
 * v3.18 — Robi mobile, multi-conversations + multimodal.
 *
 * Features :
 *   - Drawer gauche : liste conversations actives + archives
 *   - "+ Nouvelle" : ouvre conversation vide
 *   - Archive / supprimer / renommer une conversation
 *   - Pièces jointes : image, scan OCR, fichier, vidéo
 *   - Si attachement = scan ticket → route vers vision-OCR + ajout stock
 *   - Si attachement = image planning → route vers planning-OCR
 *   - Sinon → joint à la requête Robi avec contexte
 */

export default function MobileRobi() {
  const a = useAssistant()
  const location = useLocation()
  const navigate = useNavigate()
  const themeStore = useTheme()
  const [input, setInput] = useState('')
  const [pendingPreview, setPendingPreview] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

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
    if (!SR) {
      alert('Reconnaissance vocale non disponible sur cet appareil. Utilise le clavier.')
      return
    }
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch { /* */ }
    const rec = new SR()
    rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = false
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
    try { recognitionRef.current?.stop() } catch { /* */ }
    a.setMode('idle')
  }

  // ─── ATTACHMENTS ──────────────────────────────────────────────────────
  async function handleAttach(file: File, kind: AssistantAttachment['kind']) {
    if (file.size > 20 * 1024 * 1024) {
      alert('Fichier trop gros (max 20 MB)')
      return
    }
    const dataUrl = file.type.startsWith('image') || file.type.startsWith('video')
      ? await fileToDataUrl(file)
      : undefined
    a.addAttachment({
      kind,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl,
    })
  }

  // ─── SEND ─────────────────────────────────────────────────────────────
  async function ask(text: string) {
    const attached = [...a.attachments]
    if (!text.trim() && attached.length === 0) return

    const finalText = text.trim() || `[${attached.length} fichier(s) joint(s)]`
    a.addMessage({ role: 'user', text: finalText, attachments: attached })
    setInput('')
    a.clearAttachments()
    a.setMode('thinking')

    // Si une seule pièce jointe = scan/image → router vers vision-OCR
    const onlyImage = attached.length === 1 && (attached[0].kind === 'scan' || attached[0].kind === 'image') && attached[0].dataUrl
    if (onlyImage) {
      try {
        const b64 = attached[0].dataUrl!.replace(/^data:image\/\w+;base64,/, '')
        // Si l'utilisateur a écrit "planning" → route planning-OCR ; sinon photo-magic
        const isPlanning = /planning|horaire|shift|emploi du temps/i.test(text)
        const endpoint = isPlanning
          ? `${getBackend()}/api/inventory-ocr/vision-parse-receipt` // TODO add /planning-ocr
          : `${getBackend()}/api/agent/photo-magic`
        const r = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64 }),
          signal: AbortSignal.timeout(180_000),
        })
        if (r.ok) {
          const d = await r.json()
          const summary = d.title
            ? `${d.emoji || '📋'} ${d.title}\n${d.summary}`
            : `📋 OCR : ${d.supplier || '?'} · ${d.items?.length || 0} articles · Total ${d.total || 0} €`
          a.addMessage({ role: 'bot', text: summary, ui: d })
          speak(summary)
          if (d.cta?.route) setTimeout(() => navigate(d.cta.route), 1500)
        } else {
          a.addMessage({ role: 'bot', text: '❌ OCR a échoué. Essaie une photo plus nette.' })
        }
      } catch (e: any) {
        a.addMessage({ role: 'bot', text: `❌ ${e?.message || 'erreur OCR'}` })
      } finally {
        a.setMode('idle')
      }
      return
    }

    // Sinon : appel Robi standard
    try {
      const r = await fetchAuth(`${getBackend()}/api/agent/workflow`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalText, currentPath: location.pathname, userId: 'default' }),
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
      } else if (data.kind === 'action') {
        a.addMessage({
          role: 'bot', text: data.summary, ui: data.details,
          action: { intent: data.intent, success: data.success, summary: data.summary },
        })
        speak(data.summary)
        if (data.uiAction?.type === 'preview') setPendingPreview(data.uiAction)
        else if (data.uiAction?.type === 'navigate') setTimeout(() => navigate(data.uiAction.to), 800)
        else if (data.uiAction?.type === 'theme') themeStore.setTheme(data.uiAction.value)
        else if (data.uiAction?.type === 'mode') localStorage.setItem('creorga.assistant.context-mode', data.uiAction.value)
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
      const r = await fetch(`${getBackend()}${pendingPreview.confirmEndpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPreview.confirmPayload),
      })
      const data = await r.json()
      a.addMessage({ role: 'bot', text: data.summary || '✅ Action validée.' })
      speak(data.summary || 'Action validée')
    } catch {
      a.addMessage({ role: 'bot', text: '❌ Erreur de validation.' })
    } finally { setPendingPreview(null) }
  }

  const activeConvs = a.conversations.filter((c) => !c.archived)
  const archivedConvs = a.conversations.filter((c) => c.archived)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Header bar with menu + new conversation buttons */}
      <div style={{
        flexShrink: 0, padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)',
      }}>
        <button onClick={() => setDrawerOpen(true)} style={iconBtn}>
          <Menu size={18} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 6px' }}>
          {a.conversations.find((c) => c.id === a.currentConversationId)?.title || 'Robi'}
        </div>
        <button onClick={() => a.newConversation()} style={iconBtn} title="Nouvelle conversation">
          <Plus size={18} />
        </button>
      </div>

      {/* Big mascot in centre */}
      <div style={{
        flexShrink: 0, padding: '8px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <AssistantMascot variant={a.mascot} size={100}
          listening={a.mode === 'listening'} speaking={a.mode === 'speaking'} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{a.name}</div>
        <div style={{ fontSize: 10, color: '#a78bfa' }}>
          {a.mode === 'listening' ? '🎤 J\'écoute…'
            : a.mode === 'thinking' ? '🤔 Je réfléchis…'
            : a.mode === 'speaking' ? '💬 Je parle…'
            : '😊 Tape, parle, ou joins une photo'}
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '4px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {a.messages.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
            <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>💡 Essaie :</div>
            "Mets 3 cafés sur la table 1" · "Qui travaille demain ?" ·
            "Crée une facture pour Brasserie de 850€" · "Active le mode sombre" ·
            "Prends cette photo et mets dans le stock" (avec une pièce jointe)
          </div>
        )}
        {a.messages.slice(-20).map((m) => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            {m.attachments && m.attachments.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.attachments.map((att) => (
                  <AttachThumb key={att.id} att={att} />
                ))}
              </div>
            )}
          </div>
        ))}
        {a.mode === 'thinking' && (
          <div style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: 11, color: '#a78bfa' }}>
            Robi réfléchit…
          </div>
        )}

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
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer' }}>
                  <X size={14} /> Annuler
                </button>
                <button onClick={confirmPreview}
                  style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  <Check size={14} /> Valider
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pending attachments */}
      {a.attachments.length > 0 && (
        <div style={{
          flexShrink: 0, padding: '8px 14px', display: 'flex', gap: 6, overflowX: 'auto',
          background: 'rgba(139,92,246,0.05)', borderTop: '1px solid rgba(139,92,246,0.2)',
        }}>
          {a.attachments.map((att) => (
            <div key={att.id} style={{ position: 'relative', flexShrink: 0 }}>
              <AttachThumb att={att} large />
              <button onClick={() => a.removeAttachment(att.id)} style={{
                position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999,
                background: '#ef4444', color: '#fff', border: '2px solid #0a0a14', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}><X size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {/* BIG mic + multimodal input bar */}
      <div style={{
        flexShrink: 0, padding: '8px 14px calc(10px + env(safe-area-inset-bottom, 0))',
        background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Multimodal toolbar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'space-between' }}>
          <button onClick={() => fileInputRef.current?.click()} style={modalityBtn} title="Image">
            <ImageIcon size={16} />
          </button>
          <button onClick={() => scanInputRef.current?.click()} style={modalityBtn} title="Scan / Caméra">
            <Camera size={16} />
          </button>
          <button onClick={() => docInputRef.current?.click()} style={modalityBtn} title="Document / fichier">
            <Paperclip size={16} />
          </button>
          <button onClick={() => navigate('/m/magic')} style={{ ...modalityBtn, color: '#a78bfa' }} title="Photo magique">
            <ScanLine size={16} />
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => a.mode === 'listening' ? stopListening() : startListening()}
            style={{
              flex: 1, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer',
              background: a.mode === 'listening'
                ? 'linear-gradient(135deg,#ef4444,#ec4899)'
                : 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: a.mode === 'listening'
                ? '0 0 20px rgba(236,72,153,0.6)'
                : '0 4px 12px rgba(139,92,246,0.4)',
              fontSize: 11, fontWeight: 800,
            }}>
            {a.mode === 'listening' ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Parle</>}
          </motion.button>
        </div>

        {/* Hidden file inputs */}
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

        {/* Text input + send */}
        <form onSubmit={(e) => { e.preventDefault(); ask(input) }} style={{ display: 'flex', gap: 6 }}>
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={
              a.mode === 'listening' ? '🎤 Parlez…'
                : a.attachments.length > 0 ? `${a.attachments.length} fichier(s) joint(s) — décrire l'action…`
                : 'Tape, ou colle une photo…'
            }
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" disabled={!input.trim() && a.attachments.length === 0}
            style={{
              width: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: (!input.trim() && a.attachments.length === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
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

      {/* DRAWER : conversations list */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed', top: 0, bottom: 0, left: 0, width: '85%', maxWidth: 320,
                background: '#0a0a14', borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', zIndex: 101,
              }}>
              <div style={{
                padding: 'env(safe-area-inset-top, 12px) 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>💬 Conversations</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Mes discussions Robi</div>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={iconBtn}><X size={16} /></button>
              </div>

              <button onClick={() => { a.newConversation(); setDrawerOpen(false) }}
                style={{
                  margin: 12, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 800, fontSize: 13,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Plus size={14} /> Nouvelle conversation
              </button>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                {/* Active conversations */}
                {activeConvs.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucune conversation</div>
                ) : (
                  activeConvs.map((c) => (
                    <ConvRow key={c.id} c={c} active={c.id === a.currentConversationId}
                      onSelect={() => { a.selectConversation(c.id); setDrawerOpen(false) }}
                      onArchive={() => a.archiveConversation(c.id)}
                      onDelete={() => a.deleteConversation(c.id)}
                      onRename={(t: string) => a.renameConversation(c.id, t)} />
                  ))
                )}

                {/* Archived */}
                {archivedConvs.length > 0 && (
                  <>
                    <button onClick={() => setShowArchived((v) => !v)}
                      style={{
                        width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 10,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                        textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      <Archive size={12} /> Archivés ({archivedConvs.length}) {showArchived ? '▼' : '▸'}
                    </button>
                    {showArchived && archivedConvs.map((c) => (
                      <ConvRow key={c.id} c={c} active={c.id === a.currentConversationId}
                        onSelect={() => { a.selectConversation(c.id); a.unarchiveConversation(c.id); setDrawerOpen(false) }}
                        onArchive={() => a.unarchiveConversation(c.id)}
                        onDelete={() => a.deleteConversation(c.id)}
                        onRename={(t: string) => a.renameConversation(c.id, t)}
                        archived />
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConvRow({ c, active, onSelect, onArchive, onDelete, onRename, archived }: any) {
  const [renaming, setRenaming] = useState(false)
  const [tmp, setTmp] = useState(c.title)
  const lastUserMsg = [...c.messages].reverse().find((m: any) => m.role === 'user')?.text || ''
  return (
    <div style={{
      padding: 10, borderRadius: 10, marginBottom: 4, cursor: 'pointer',
      background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
      border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
      opacity: archived ? 0.55 : 1,
      display: 'flex', alignItems: 'center', gap: 8,
    }} onClick={() => !renaming && onSelect()}>
      <MessageSquare size={14} style={{ flexShrink: 0, color: active ? '#a78bfa' : '#94a3b8' }} />
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
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.title}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lastUserMsg.slice(0, 60) || `${c.messages.length} messages`}
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

function AttachThumb({ att, large }: { att: AssistantAttachment; large?: boolean }) {
  const size = large ? 64 : 44
  if (att.dataUrl && att.kind !== 'video') {
    return (
      <img src={att.dataUrl} alt={att.name} style={{
        width: size, height: size, objectFit: 'cover', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
      }} />
    )
  }
  if (att.dataUrl && att.kind === 'video') {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, position: 'relative',
        background: '#000', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Video size={20} color="#a78bfa" />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#a5b4fc', padding: 4, textAlign: 'center',
    }}>
      <Paperclip size={16} />
      <div style={{ fontSize: 8, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {att.name.slice(0, 10)}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}
const modalityBtn: React.CSSProperties = {
  width: 38, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const miniBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}
