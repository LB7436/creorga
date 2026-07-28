import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import {
  MessageCircle, X, Send, Sparkles, Loader2,
  BookOpen, Video, Bot, Download, ChevronRight,
  Play, Zap, ArrowRight, Search, ThumbsUp, ThumbsDown,
  Mic, MicOff,
} from 'lucide-react'
import { getHelpForPath, HELP_CONTENT, type AgentCommand, type DemoStep, type ModuleHelp } from '@/lib/help-content'
import api from '@/lib/api'
import InteractiveTutorial from './InteractiveTutorial'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Help Center — 3 onglets module-aware :
 *   - 🤖 Agent IA  (chat libre Gemma + commandes prédéfinies cliquables)
 *   - 📚 Articles  (guides, démos pas-à-pas, niveau)
 *   - 🎬 Vidéos    (tutos par module)
 *
 * Le contenu s'adapte automatiquement au pathname courant.
 * Les commandes appellent /api/agent/execute (vraies actions sur les data).
 */

type Tab = 'agent' | 'articles' | 'videos'

interface ChatMsg {
  role: 'user' | 'bot'
  text?: string
  ui?: any            // { type, items, href, label } depuis backend
  ts: number
}

export default function HelpChatbot() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('agent')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingCommand, setPendingCommand] = useState<AgentCommand | null>(null)
  const [pendingInput, setPendingInput] = useState('')
  const [activeDemo, setActiveDemo] = useState<DemoStep[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [globalSearch, setGlobalSearch] = useState(false) // search across all modules
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const help = getHelpForPath(location.pathname)

  // Phase 2A.2 — Full-text search in articles (current module by default,
  // or globally if user toggles "Toutes pages")
  const filteredArticles = useMemo(() => {
    const corpus = globalSearch
      ? HELP_CONTENT.flatMap((m) => m.articles.map((a) => ({ ...a, _module: m.title, _emoji: m.emoji })))
      : help.articles.map((a) => ({ ...a, _module: help.title, _emoji: help.emoji }))
    if (!searchQuery.trim()) return corpus
    const q = searchQuery.toLowerCase()
    return corpus.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      (a.steps || []).some((s: string) => s.toLowerCase().includes(q))
    )
  }, [searchQuery, globalSearch, help])

  // Phase 2A.3 — Deep link ?help=articleId&autoplay=demo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetArticle = params.get('help')
    if (!targetArticle) return
    setOpen(true)
    setTab('articles')
    if (params.get('autoplay') === 'demo') {
      // Find article + launch demo
      for (const m of HELP_CONTENT) {
        const a = m.articles.find((x) => x.id === targetArticle)
        if (a?.demo) { setActiveDemo(a.demo); setOpen(false); break }
      }
    }
  }, [location.pathname])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Reset pending command when changing tab
  useEffect(() => { setPendingCommand(null); setPendingInput('') }, [tab])

  const askGemma = async (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', text, ts: Date.now() }])
    setInput('')
    try {
      const r = await fetch(`${BACKEND}/api/agent/smart-query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, currentPath: location.pathname }),
      })
      const data = await r.json()
      setMessages((m) => [...m, { role: 'bot', text: data?.text || 'Je n\'ai pas trouvé de réponse claire.', ts: Date.now() }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: '⚠️ Backend hors-ligne. Consultez les Articles ou Vidéos.', ts: Date.now() }])
    } finally { setBusy(false) }
  }

  // Phase 2C — Voice input (Web Speech API native, gratuit)
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setMessages((m) => [...m, { role: 'bot', text: '🎤 Reconnaissance vocale non disponible dans ce navigateur (essayez Chrome ou Edge).', ts: Date.now() }])
      return
    }
    if (listening) {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      setListening(false)
      return
    }
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
      if (e.results[0].isFinal) {
        setListening(false)
        if (txt.trim()) askGemma(txt)
      }
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const runCommand = async (cmd: AgentCommand, input: any = {}) => {
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', text: `▶ ${cmd.label}`, ts: Date.now() }])
    setPendingCommand(null); setPendingInput('')
    try {
      // `/api/agent` exige un jeton : le fetch brut prenait un 401 et le
      // chatbot répondait `undefined` sur chaque commande. `api` attache le
      // jeton par intercepteur (lib/api.ts).
      const r = await api.post('/agent/execute', { commandId: cmd.id, input })
      const data = r.data
      setMessages((m) => [...m, { role: 'bot', text: data?.text, ui: data?.ui, ts: Date.now() }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: '⚠️ Erreur serveur agent.', ts: Date.now() }])
    } finally { setBusy(false) }
  }

  const handleCommandClick = (cmd: AgentCommand) => {
    if (cmd.needsInput) {
      setPendingCommand(cmd)
      setPendingInput(cmd.example || '')
    } else {
      runCommand(cmd)
    }
  }

  const submitPending = () => {
    if (!pendingCommand) return
    runCommand(pendingCommand, { [pendingCommand.needsInput!.field]: pendingInput })
  }

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'rgba(15,23,42,0.95)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Centre d'aide Creorga"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}><X size={22} /></motion.span>
            : <motion.span key="msg" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }}><MessageCircle size={22} /></motion.span>}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 96, right: 24, zIndex: 9997,
              width: 420, maxWidth: 'calc(100vw - 48px)',
              height: 600, maxHeight: 'calc(100vh - 140px)',
              background: '#fff', borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(15,23,42,0.06)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <header style={{
              padding: '12px 16px', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Sparkles size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Centre d'aide Creorga</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  {help.emoji} {help.title} <span style={{ opacity: 0.6 }}>· {location.pathname}</span>
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {([
                { id: 'agent',    label: 'Agent IA', icon: Bot,      count: help.commands.length },
                { id: 'articles', label: 'Articles', icon: BookOpen, count: help.articles.length },
                { id: 'videos',   label: 'Vidéos',   icon: Video,    count: help.videos.length },
              ] as const).map((t) => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{
                      flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer',
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#7c3aed' : '#64748b',
                      borderBottom: active ? '2px solid #8b5cf6' : '2px solid transparent',
                      fontWeight: active ? 800 : 600, fontSize: 12,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all .15s',
                    }}
                  >
                    <Icon size={14} /> {t.label}
                    {t.count > 0 && (
                      <span style={{
                        padding: '0 5px', borderRadius: 999,
                        background: active ? '#ede9fe' : '#e2e8f0', color: active ? '#7c3aed' : '#64748b',
                        fontSize: 10, fontWeight: 800,
                      }}>{t.count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div ref={scrollRef} style={{ flex: 1, padding: 14, overflowY: 'auto', background: '#f8fafc' }}>

              {/* ─── AGENT TAB ─── */}
              {tab === 'agent' && (
                <>
                  {messages.length === 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ padding: 12, background: '#fff', borderRadius: 12, fontSize: 13, color: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        Bonjour 👋 Je suis l'agent IA Creorga. Sur cette page <b>{help.emoji} {help.title}</b>, je peux exécuter ces commandes :
                      </div>
                    </div>
                  )}

                  {/* Commands grid */}
                  {messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {help.commands.map((cmd) => (
                        <button key={cmd.id} onClick={() => handleCommandClick(cmd)}
                          disabled={busy}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10,
                            background: '#fff', border: '1px solid #e2e8f0',
                            fontSize: 12, color: '#1e293b',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            textAlign: 'left', transition: 'all .15s', opacity: busy ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#faf5ff' } }}
                          onMouseLeave={(e) => { if (!busy) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' } }}>
                          <div style={{ fontSize: 18 }}>{cmd.icon || '⚡'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{cmd.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{cmd.description}</div>
                          </div>
                          <ChevronRight size={14} color="#94a3b8" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pending command (needs input) */}
                  {pendingCommand && (
                    <div style={{ padding: 12, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 10, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#5b21b6', marginBottom: 6 }}>
                        {pendingCommand.icon} {pendingCommand.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#7c3aed', marginBottom: 8 }}>
                        {pendingCommand.needsInput?.label}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          autoFocus
                          value={pendingInput}
                          onChange={(e) => setPendingInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitPending()}
                          placeholder={pendingCommand.needsInput?.placeholder}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #c4b5fd', fontSize: 12, outline: 'none' }}
                        />
                        <button onClick={submitPending} disabled={!pendingInput.trim()}
                          style={{
                            padding: '0 14px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                            color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                          }}>
                          Exécuter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Conversation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                        <div style={{
                          padding: '10px 14px', borderRadius: 14,
                          background: m.role === 'user' ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : '#fff',
                          color: m.role === 'user' ? '#fff' : '#1e293b',
                          fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                          boxShadow: m.role === 'bot' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                        }}>
                          {m.text}
                        </div>
                        {m.ui && <UIRenderer ui={m.ui} />}
                      </div>
                    ))}
                    {busy && (
                      <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                        <Loader2 size={14} className="ai-spin" /> L'agent réfléchit…
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── ARTICLES TAB ─── */}
              {tab === 'articles' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Phase 2A.2 — Recherche full-text */}
                  <div style={{ position: 'relative', marginBottom: 4 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher dans les articles…"
                      style={{
                        width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
                        border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={globalSearch} onChange={(e) => setGlobalSearch(e.target.checked)} />
                      Toutes les pages
                    </label>
                    <span>· {filteredArticles.length} article(s)</span>
                  </div>
                  {filteredArticles.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Aucun article ne correspond.
                    </div>
                  )}
                  {filteredArticles.map((a: any) => (
                    <ArticleCard
                      key={a.id}
                      article={a}
                      moduleLabel={globalSearch ? `${a._emoji} ${a._module}` : undefined}
                      onPlayDemo={(steps) => { setActiveDemo(steps); setOpen(false) }}
                    />
                  ))}
                </div>
              )}

              {/* ─── VIDEOS TAB ─── */}
              {tab === 'videos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {help.videos.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Aucune vidéo pour ce module pour le moment.
                    </div>
                  )}
                  {/* Bonus : démos interactives extraites des articles */}
                  {help.articles.filter((a) => a.demo && a.demo.length > 0).map((a) => (
                    <button key={`demo-${a.id}`} onClick={() => { setActiveDemo(a.demo!); setOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                        borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05))',
                        color: '#1e293b', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                      }}>
                      <Zap size={16} color="#8b5cf6" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>▶ Démo interactive</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{a.title} · {a.demo!.length} étapes guidées sur la page courante</div>
                      </div>
                      <ArrowRight size={14} color="#8b5cf6" />
                    </button>
                  ))}
                  {help.videos.map((v) => <VideoCard key={v.id} video={v} />)}
                </div>
              )}
            </div>

            {/* Input bar (agent only) */}
            {tab === 'agent' && (
              <form onSubmit={(e) => { e.preventDefault(); askGemma(input) }}
                style={{ padding: 10, borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 6 }}>
                <button type="button" onClick={toggleVoice}
                  title={listening ? 'Arrêter l\'écoute' : 'Dictée vocale (FR/DE/EN/PT auto)'}
                  style={{
                    width: 38, borderRadius: 10, border: '1px solid #e2e8f0',
                    background: listening ? 'linear-gradient(135deg,#ef4444,#ec4899)' : '#fff',
                    color: listening ? '#fff' : '#64748b', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? '🎤 Parlez…' : 'Posez une question à Gemma…'}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#8b5cf6' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0' }}
                />
                <button type="submit" disabled={busy || !input.trim()}
                  style={{
                    padding: '0 14px', borderRadius: 10, border: 'none',
                    background: busy || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                    color: '#fff', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Send size={16} />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes ai-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } } .ai-spin { animation: ai-spin 1s linear infinite }`}</style>

      {/* Interactive tutorial overlay */}
      {activeDemo && (
        <InteractiveTutorial steps={activeDemo} onClose={() => setActiveDemo(null)} />
      )}
    </>
  )
}

function UIRenderer({ ui }: { ui: any }) {
  if (!ui) return null
  if (ui.type === 'download') {
    return (
      <a href={ui.href} download
        style={{
          marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8, background: '#10b981', color: '#fff',
          textDecoration: 'none', fontSize: 12, fontWeight: 700,
        }}>
        <Download size={12} /> {ui.label || 'Télécharger'}
      </a>
    )
  }
  if (ui.type === 'list' && ui.items) {
    return (
      <div style={{ marginTop: 6, padding: 10, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ui.items.map((it: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: i === ui.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
            <span style={{ color: '#475569' }}>
              {it.href ? <a href={it.href} style={{ color: '#7c3aed', textDecoration: 'none' }}>{it.label}</a> : it.label}
            </span>
            <span style={{ color: '#1e293b', fontWeight: 700 }}>{it.value}</span>
          </div>
        ))}
      </div>
    )
  }
  if (ui.type === 'kpi' && ui.items) {
    return (
      <div style={{ marginTop: 6, padding: 12, background: 'linear-gradient(135deg,#ede9fe,#fce7f3)', borderRadius: 10 }}>
        {ui.items.map((it: any, i: number) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{it.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#5b21b6' }}>{it.value}</div>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function ArticleCard({ article, onPlayDemo, moduleLabel }: { article: any; onPlayDemo?: (steps: DemoStep[]) => void; moduleLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const levelColor = {
    beginner: { bg: '#d1fae5', fg: '#047857', label: 'Débutant' },
    intermediate: { bg: '#fef3c7', fg: '#92400e', label: 'Intermédiaire' },
    advanced: { bg: '#fee2e2', fg: '#991b1b', label: 'Avancé' },
  }[article.level as 'beginner' | 'intermediate' | 'advanced'] || { bg: '#e2e8f0', fg: '#475569', label: '?' }
  const hasDemo = Array.isArray(article.demo) && article.demo.length > 0

  const sendFeedback = (vote: 'up' | 'down') => {
    setVoted(vote)
    fetch(`${BACKEND}/api/help/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: article.id, vote, path: window.location.pathname }),
    }).catch(() => { /* silent */ })
  }

  // Phase 2A.3 — copy direct link
  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}${window.location.pathname}?help=${article.id}${hasDemo ? '&autoplay=demo' : ''}`
    navigator.clipboard.writeText(url).then(() => { /* could toast */ })
  }

  return (
    <div style={{ padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      {moduleLabel && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>
          {moduleLabel}
        </div>
      )}
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <BookOpen size={14} style={{ color: '#8b5cf6', marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{article.title}</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {hasDemo && (
                <span style={{ padding: '1px 6px', borderRadius: 999, background: '#ede9fe', color: '#7c3aed', fontSize: 9, fontWeight: 800 }}>
                  ▶ DÉMO
                </span>
              )}
              <span style={{ padding: '1px 6px', borderRadius: 999, background: levelColor.bg, color: levelColor.fg, fontSize: 9, fontWeight: 800 }}>
                {levelColor.label}
              </span>
            </div>
          </div>
          {!open && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{article.body.slice(0, 80)}…</div>}
        </div>
        <ChevronRight size={14} color="#94a3b8" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', marginTop: 2 }} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#334155', lineHeight: 1.55 }}>
              {article.body}
              {article.steps && (
                <ol style={{ marginTop: 10, paddingLeft: 18, color: '#1e293b' }}>
                  {article.steps.map((s: string, i: number) => (
                    <li key={i} style={{ marginBottom: 4, fontSize: 11.5 }}>{s}</li>
                  ))}
                </ol>
              )}
              {hasDemo && onPlayDemo && (
                <button onClick={(e) => { e.stopPropagation(); onPlayDemo(article.demo) }}
                  style={{
                    marginTop: 12, width: '100%',
                    padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Zap size={12} /> Lancer la démo guidée ({article.demo.length} étapes)
                </button>
              )}
              {/* Phase 2A.4 — Feedback + Phase 2A.3 — Copy link */}
              <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>Cet article vous a aidé ?</span>
                  <button onClick={(e) => { e.stopPropagation(); sendFeedback('up') }}
                    disabled={voted !== null}
                    style={{
                      padding: 4, borderRadius: 6, border: 'none', cursor: voted ? 'default' : 'pointer',
                      background: voted === 'up' ? '#10b981' : 'transparent',
                      color: voted === 'up' ? '#fff' : '#64748b',
                    }}><ThumbsUp size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); sendFeedback('down') }}
                    disabled={voted !== null}
                    style={{
                      padding: 4, borderRadius: 6, border: 'none', cursor: voted ? 'default' : 'pointer',
                      background: voted === 'down' ? '#ef4444' : 'transparent',
                      color: voted === 'down' ? '#fff' : '#64748b',
                    }}><ThumbsDown size={12} /></button>
                  {voted && <span style={{ fontSize: 10, color: '#10b981' }}>Merci !</span>}
                </div>
                <button onClick={copyLink}
                  title="Copier le lien direct vers cet article"
                  style={{
                    padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                    color: '#64748b', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                  }}>🔗 Lien</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function VideoCard({ video }: { video: any }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div style={{ padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      {playing && video.youtubeId ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; encrypted-media" allowFullScreen
          />
        </div>
      ) : (
        <div onClick={() => setPlaying(true)}
          style={{
            position: 'relative', height: 110, borderRadius: 8, overflow: 'hidden',
            background: 'linear-gradient(135deg,#1e293b,#0f172a)', cursor: video.youtubeId ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
          }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Play size={18} />
          </div>
          <div style={{ position: 'absolute', bottom: 6, right: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 700 }}>
            {video.duration}
          </div>
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{video.title}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{video.description}</div>
      {!video.youtubeId && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
          Vidéo bientôt disponible — l'équipe Creorga prépare le tournage.
        </div>
      )}
    </div>
  )
}
