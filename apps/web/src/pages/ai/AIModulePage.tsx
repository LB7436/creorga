import { useState, useEffect, useRef } from 'react'

/**
 * AI module — local LLM (Gemma) via Ollama.
 *
 * Target: Raspberry Pi 5 / 16 GB RAM.
 *   Best trade-off model: `gemma2:2b` (quantized ~1.6 GB, fast inference on ARM).
 *   For more quality: `gemma2:9b` (5.4 GB, slower but still runs on 16 GB RPi).
 *
 * How it works:
 *   - The browser talks to a local Ollama server at http://localhost:11434
 *     (or VITE_OLLAMA_URL). No API key. 100% local.
 *   - "Télécharger" triggers `POST /api/pull` to download the model.
 *   - "Chat" streams `POST /api/generate` responses token-by-token.
 *
 * If Ollama isn't installed, we show clear OS-specific install instructions.
 */

const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434'

const MODELS = [
  {
    id: 'gemma2:2b',
    label: 'Gemma 2 — 2B',
    size: '1.6 GB',
    description: 'Recommandé Raspberry Pi 5 — rapide, faible empreinte mémoire',
    recommended: true,
  },
  {
    id: 'gemma2:9b',
    label: 'Gemma 2 — 9B',
    size: '5.4 GB',
    description: 'Meilleure qualité — nécessite 16 GB de RAM',
    recommended: false,
  },
  {
    id: 'phi3:mini',
    label: 'Phi-3 Mini',
    size: '2.3 GB',
    description: 'Alternative Microsoft — bon raisonnement',
    recommended: false,
  },
]

type Status = 'checking' | 'online' | 'offline'
type PullState = 'idle' | 'downloading' | 'installed' | 'error'

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIModulePage() {
  const [status, setStatus] = useState<Status>('checking')
  const [installedModels, setInstalledModels] = useState<string[]>([])
  const [activeModel, setActiveModel] = useState<string>('gemma2:2b')
  const [pullState, setPullState] = useState<Record<string, PullState>>({})
  const [pullProgress, setPullProgress] = useState<Record<string, number>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Probe Ollama ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' })
        if (!r.ok) throw new Error('offline')
        const data = await r.json() as { models?: { name: string }[] }
        const names = data.models?.map((m) => m.name) ?? []
        setInstalledModels(names)
        setStatus('online')
        const found = MODELS.find((m) => names.includes(m.id))
        if (found) setActiveModel(found.id)
      } catch {
        setStatus('offline')
      }
    })()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // ── Download model ──────────────────────────────────────────────────────
  const pullModel = async (modelId: string) => {
    setPullState((s) => ({ ...s, [modelId]: 'downloading' }))
    setPullProgress((s) => ({ ...s, [modelId]: 0 }))
    try {
      const res = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelId, stream: true }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line) as { total?: number; completed?: number; status?: string }
            if (evt.total && evt.completed) {
              setPullProgress((s) => ({ ...s, [modelId]: Math.round((evt.completed! / evt.total!) * 100) }))
            }
          } catch { /* ignore */ }
        }
      }
      setPullState((s) => ({ ...s, [modelId]: 'installed' }))
      setInstalledModels((m) => Array.from(new Set([...m, modelId])))
      setActiveModel(modelId)
    } catch (e) {
      console.error(e)
      setPullState((s) => ({ ...s, [modelId]: 'error' }))
    }
  }

  // ── Chat ────────────────────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || thinking) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setThinking(true)
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: activeModel, prompt: userMsg.content, stream: true }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      setMessages((m) => [...m, { role: 'assistant', content: '' }])
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line) as { response?: string; done?: boolean }
            if (evt.response) {
              full += evt.response
              setMessages((m) => {
                const copy = [...m]
                copy[copy.length - 1] = { role: 'assistant', content: full }
                return copy
              })
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `❌ Erreur : ${e.message}` }])
    } finally {
      setThinking(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          🤖 Assistant IA <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>— local, 100 % privé</span>
        </h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Optimisé pour Raspberry Pi 5 16 GB via Ollama. Modèles Gemma de Google.
        </p>

        {/* Provider switcher (Local Ollama vs Cloud) */}
        <div style={{
          marginTop: 14, padding: 12, background: 'linear-gradient(135deg,#eef2ff,#faf5ff)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #c7d2fe',
        }}>
          <div style={{ fontSize: 22 }}>🔀</div>
          <div style={{ flex: 1, fontSize: 13 }}>
            <strong style={{ color: '#4338ca' }}>Provider IA actif : Ollama local</strong>
            <div style={{ color: '#64748b', marginTop: 2 }}>
              Pour utiliser Claude / GPT-4 cloud → ouvrez l'Assistant cloud ↗
            </div>
          </div>
          <a href="/ai" style={{
            padding: '8px 14px', borderRadius: 8, background: '#6366f1', color: '#fff',
            textDecoration: 'none', fontWeight: 700, fontSize: 12,
          }}>Cloud →</a>
        </div>
      </header>

      {status === 'checking' && (
        <div style={{ ...card, textAlign: 'center' }}>⏳ Vérification du serveur Ollama…</div>
      )}

      {status === 'offline' && <OllamaSetupCard />}

      {status === 'online' && (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: '#10b981' }} />
              <strong>Ollama connecté</strong>
              <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>{OLLAMA_URL}</span>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '14px 0 10px' }}>Modèles disponibles</h3>
            {MODELS.map((m) => {
              const installed = installedModels.includes(m.id)
              const state = pullState[m.id] || 'idle'
              const prog = pullProgress[m.id] || 0
              return (
                <div key={m.id} style={modelRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.label}
                      {m.recommended && <span style={badge}>Recommandé RPi 5</span>}
                      {installed && <span style={{ ...badge, background: '#dcfce7', color: '#166534' }}>Installé</span>}
                      {activeModel === m.id && <span style={{ ...badge, background: '#e0e7ff', color: '#3730a3' }}>Actif</span>}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{m.description} · {m.size}</div>
                    {state === 'downloading' && (
                      <div style={{ marginTop: 8, background: '#e2e8f0', height: 6, borderRadius: 999 }}>
                        <div style={{ width: `${prog}%`, height: 6, background: '#6366f1', borderRadius: 999, transition: 'width .3s' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {installed && activeModel !== m.id && (
                      <button onClick={() => setActiveModel(m.id)} style={btnSecondary}>Activer</button>
                    )}
                    {!installed && state !== 'downloading' && (
                      <button onClick={() => pullModel(m.id)} style={btnPrimary}>⬇ Télécharger</button>
                    )}
                    {state === 'downloading' && (
                      <button disabled style={{ ...btnPrimary, opacity: 0.6, cursor: 'wait' }}>{prog}%</button>
                    )}
                    {state === 'error' && (
                      <button onClick={() => pullModel(m.id)} style={{ ...btnPrimary, background: '#ef4444' }}>Réessayer</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chat */}
          <div style={{ ...card, padding: 0 }}>
            <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
              💬 Discussion · <span style={{ color: '#64748b', fontWeight: 500 }}>{activeModel}</span>
            </div>

            <div ref={scrollRef} style={{ height: 360, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 80 }}>
                  💡 Demandez à votre assistant : <br />
                  <em>« Rédige une description de plat », « Calcule les coûts matières », « Propose un menu du jour »…</em>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? '#6366f1' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  padding: '10px 14px', borderRadius: 14,
                  maxWidth: '78%', whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}>
                  {msg.content || (thinking && i === messages.length - 1 ? '…' : '')}
                </div>
              ))}
              {thinking && messages[messages.length - 1]?.role === 'user' && (
                <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontStyle: 'italic' }}>L'IA réfléchit…</div>
              )}
            </div>

            <div style={{ padding: 10, display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={installedModels.includes(activeModel) ? 'Votre message…' : 'Téléchargez un modèle d\'abord'}
                disabled={!installedModels.includes(activeModel) || thinking}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
                  fontSize: 14, outline: 'none',
                }}
              />
              <button onClick={send} disabled={!installedModels.includes(activeModel) || thinking || !input.trim()}
                style={{ ...btnPrimary, opacity: (!installedModels.includes(activeModel) || thinking || !input.trim()) ? 0.5 : 1 }}>
                {thinking ? '…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function OllamaSetupCard() {
  return (
    <div style={{ ...card, borderColor: '#fcd34d', background: '#fffbeb' }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>⚠️ Ollama non détecté</h3>
      <p style={{ color: '#713f12', margin: '10px 0', fontSize: 14 }}>
        Pour utiliser l'assistant IA en local, installez Ollama (gratuit, open-source, 100 % privé).
      </p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 12 }}>
        <InstallCard title="Raspberry Pi 5 / Linux" cmd="curl -fsSL https://ollama.com/install.sh | sh" />
        <InstallCard title="macOS" link="https://ollama.com/download/mac" note="Téléchargez le .dmg" />
        <InstallCard title="Windows" link="https://ollama.com/download/windows" note="Installer .exe" />
      </div>

      <p style={{ color: '#713f12', marginTop: 12, fontSize: 13 }}>
        Après installation, vérifiez avec <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>ollama serve</code>,
        puis rafraîchissez cette page.
      </p>
    </div>
  )
}

function InstallCard({ title, cmd, link, note }: { title: string; cmd?: string; link?: string; note?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
      {cmd && (
        <code style={{
          display: 'block', marginTop: 6, padding: 8, background: '#1e293b', color: '#e2e8f0',
          borderRadius: 6, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre',
        }}>{cmd}</code>
      )}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" style={{
          display: 'inline-block', marginTop: 6, color: '#6366f1', fontSize: 13, textDecoration: 'underline',
        }}>{note || link}</a>
      )}
    </div>
  )
}

// ─── Styles ──
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
  padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}
const modelRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 0', borderTop: '1px solid #f1f5f9',
}
const badge: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e',
  fontSize: 11, fontWeight: 700, marginLeft: 4,
}
const btnPrimary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer',
  background: '#fff', color: '#1e293b', fontSize: 13, fontWeight: 600,
}
