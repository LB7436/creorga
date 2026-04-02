import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CameraOff, MessageCircle, Users, Send } from 'lucide-react'

const IS_DEV = import.meta.env.DEV

const ACCENT = '#a855f7'
const ACCENT2 = '#06b6d4'
const SURFACE = '#0e0d20'
const SURFACE2 = '#16153a'
const BORDER = 'rgba(168,85,247,0.18)'
const TEXT = '#f8fafc'
const MUTED = '#94a3b8'

const CHANNEL_NAME = 'creorga-chat'
const STORAGE_KEY = 'creorga-chat-msgs'
const MAX_MSGS = 100

type Message = { id: string; from: string; text: string; time: number }
type Peer = { id: string; name: string }

function randomName() {
  const adj = ['Joyeux', 'Sympa', 'Cool', 'Zen', 'Fun']
  const n = Math.floor(Math.random() * 900 + 100)
  return adj[Math.floor(Math.random() * adj.length)] + n
}

function loadMsgs(): Message[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveMsgs(msgs: Message[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_MSGS)))
}

// ─── Join Screen ─────────────────────────────────────────

function JoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const defaultName = useRef(IS_DEV ? randomName() : '')

  const handle = () => {
    const n = IS_DEV ? defaultName.current : name.trim()
    if (!n) return
    onJoin(n)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] gap-6 px-4">
      <div className="text-5xl">💬</div>
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold" style={{ color: TEXT }}>Chat du groupe</h2>
        <p className="text-sm" style={{ color: MUTED }}>
          {IS_DEV
            ? <>Mode dev — nom auto : <span style={{ color: ACCENT }}>{defaultName.current}</span></>
            : 'Entrez votre prénom pour rejoindre'}
        </p>
      </div>

      {!IS_DEV && (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder="Votre prénom…"
          maxLength={24}
          className="w-full max-w-xs rounded-xl border px-4 py-3 text-sm text-center focus:outline-none"
          style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
        />
      )}

      <button
        onClick={handle}
        disabled={!IS_DEV && !name.trim()}
        className="px-10 py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-40"
        style={{ background: ACCENT, color: '#fff' }}
      >
        OK
      </button>
    </div>
  )
}

// ─── Main Chat ────────────────────────────────────────────

export default function ChatSection() {
  const [joined, setJoined] = useState(false)
  const [nickname, setNickname] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [peers, setPeers] = useState<Peer[]>([])
  const [input, setInput] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [view, setView] = useState<'chat' | 'cameras'>('chat')
  const [myStream, setMyStream] = useState<MediaStream | null>(null)
  const [camError, setCamError] = useState('')

  const myId = useRef(Math.random().toString(36).slice(2, 10))
  const channelRef = useRef<BroadcastChannel | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ─── Join ─────────────────────────────────────────────

  const join = useCallback((name: string) => {
    setNickname(name)
    setJoined(true)
    setMessages(loadMsgs())

    const ch = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = ch

    ch.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data as { type: string; payload: any }

      if (type === 'msg') {
        setMessages(prev => {
          const updated = [...prev, payload as Message]
          saveMsgs(updated)
          return updated
        })
      } else if (type === 'join') {
        const peer = payload as Peer
        setPeers(prev => [...prev.filter(p => p.id !== peer.id), peer])
        // Announce back so they know about me
        ch.postMessage({ type: 'announce', payload: { id: myId.current, name } })
      } else if (type === 'announce') {
        const peer = payload as Peer
        setPeers(prev => [...prev.filter(p => p.id !== peer.id), peer])
      } else if (type === 'leave') {
        const { id } = payload as { id: string }
        setPeers(prev => prev.filter(p => p.id !== id))
      }
    }

    // Announce myself
    ch.postMessage({ type: 'join', payload: { id: myId.current, name } })

    // System message
    const sysMsg: Message = {
      id: Date.now().toString(),
      from: '__system__',
      text: `${name} a rejoint le chat`,
      time: Date.now(),
    }
    setMessages(prev => {
      const updated = [...prev, sysMsg]
      saveMsgs(updated)
      return updated
    })
    ch.postMessage({ type: 'msg', payload: sysMsg })
  }, [])

  // ─── Cleanup ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (channelRef.current && nickname) {
        channelRef.current.postMessage({ type: 'leave', payload: { id: myId.current } })
        channelRef.current.close()
      }
      myStream?.getTracks().forEach(t => t.stop())
    }
  }, [myStream, nickname])

  // ─── Auto-scroll ─────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Camera ──────────────────────────────────────────

  const toggleCamera = async () => {
    if (cameraOn && myStream) {
      myStream.getTracks().forEach(t => t.stop())
      setMyStream(null)
      setCameraOn(false)
      setCamError('')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      setMyStream(stream)
      setCameraOn(true)
      setCamError('')
    } catch {
      setCamError('Caméra non disponible ou accès refusé.')
    }
  }

  useEffect(() => {
    if (videoRef.current && myStream) {
      videoRef.current.srcObject = myStream
    }
  }, [myStream, view])

  // ─── Send ─────────────────────────────────────────────

  const send = () => {
    const text = input.trim()
    if (!text) return
    const msg: Message = { id: Date.now().toString(), from: nickname, text, time: Date.now() }
    setMessages(prev => {
      const updated = [...prev, msg]
      saveMsgs(updated)
      return updated
    })
    channelRef.current?.postMessage({ type: 'msg', payload: msg })
    setInput('')
  }

  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })

  // ─── Join screen ─────────────────────────────────────

  if (!joined) return <JoinScreen onJoin={join} />

  // ─── Chat interface ───────────────────────────────────

  const onlineCount = peers.length + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

      {/* Topbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm font-bold" style={{ color: TEXT }}>{nickname}</span>
          <span className="text-xs" style={{ color: MUTED }}>
            · {onlineCount} en ligne
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleCamera}
            className="p-2 rounded-xl transition-all"
            style={{
              background: cameraOn ? ACCENT : SURFACE2,
              color: cameraOn ? '#fff' : MUTED,
              border: `1px solid ${cameraOn ? 'transparent' : BORDER}`,
            }}
            title={cameraOn ? 'Couper la caméra' : 'Activer la caméra'}
          >
            {cameraOn ? <Camera size={15} /> : <CameraOff size={15} />}
          </button>
          <button
            onClick={() => setView(v => v === 'chat' ? 'cameras' : 'chat')}
            className="p-2 rounded-xl transition-all"
            style={{
              background: view === 'cameras' ? ACCENT2 : SURFACE2,
              color: view === 'cameras' ? '#fff' : MUTED,
              border: `1px solid ${view === 'cameras' ? 'transparent' : BORDER}`,
            }}
            title={view === 'cameras' ? 'Voir le chat' : 'Voir les caméras'}
          >
            {view === 'cameras' ? <MessageCircle size={15} /> : <Users size={15} />}
          </button>
        </div>
      </div>

      {camError && (
        <p className="text-xs text-red-400 mb-2 shrink-0">{camError}</p>
      )}

      {/* ── Cameras view ── */}
      {view === 'cameras' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {cameraOn ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-2xl"
                style={{ maxHeight: 260, objectFit: 'cover', display: 'block' }}
              />
              <div
                className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
              >
                Vous ({nickname})
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-3 py-12"
              style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}
            >
              <CameraOff size={30} style={{ color: MUTED }} />
              <p className="text-sm" style={{ color: MUTED }}>Votre caméra est désactivée</p>
              <button
                onClick={toggleCamera}
                className="px-5 py-2 rounded-xl font-bold text-sm"
                style={{ background: ACCENT, color: '#fff' }}
              >
                Activer
              </button>
            </div>
          )}

          {peers.length === 0 ? (
            <div className="text-center text-sm py-6" style={{ color: MUTED }}>
              Partagez le lien <span style={{ color: ACCENT }}>/c</span> pour inviter d'autres clients…
            </div>
          ) : (
            peers.map(p => (
              <div
                key={p.id}
                className="rounded-2xl flex items-center gap-4 px-5 py-8"
                style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ background: 'rgba(168,85,247,0.15)', color: ACCENT }}
                >
                  {p.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: TEXT }}>{p.name}</p>
                  <p className="text-xs" style={{ color: MUTED }}>Connecté</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Chat view ── */}
      {view === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {messages.length === 0 && (
              <p className="text-center text-sm py-10" style={{ color: MUTED }}>
                Soyez le premier à écrire ! 👋
              </p>
            )}

            {messages.map(m => {
              const isMe = m.from === nickname
              const isSys = m.from === '__system__'

              if (isSys) return (
                <div key={m.id} className="flex justify-center">
                  <span
                    className="text-[10px] px-3 py-0.5 rounded-full"
                    style={{ background: SURFACE2, color: MUTED }}
                  >
                    {m.text}
                  </span>
                </div>
              )

              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-[10px] mb-0.5 ml-1 font-medium" style={{ color: MUTED }}>
                      {m.from}
                    </p>
                  )}
                  <div style={{ maxWidth: '78%' }}>
                    <div
                      className="px-3.5 py-2 text-sm"
                      style={{
                        background: isMe ? ACCENT : SURFACE2,
                        color: isMe ? '#fff' : TEXT,
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.text}
                    </div>
                    <p
                      className="text-[10px] mt-0.5 mx-1"
                      style={{ color: MUTED, textAlign: isMe ? 'right' : 'left' }}
                    >
                      {fmtTime(m.time)}
                    </p>
                  </div>
                </div>
              )
            })}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="flex gap-2 pt-2 mt-1 shrink-0 border-t"
            style={{ borderColor: BORDER }}
          >
            {cameraOn && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="rounded-xl shrink-0 object-cover"
                style={{ width: 44, height: 44 }}
              />
            )}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Message…"
              maxLength={500}
              className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none"
              style={{ background: SURFACE2, borderColor: BORDER, color: TEXT }}
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="p-2.5 rounded-xl shrink-0 transition-all disabled:opacity-40"
              style={{ background: ACCENT, color: '#fff' }}
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
