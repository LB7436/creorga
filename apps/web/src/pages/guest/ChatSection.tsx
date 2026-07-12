import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Paperclip, Check, CheckCheck, Image as ImageIcon,
  Coffee, MessageCircle, Table2, UserRound, Users,
} from 'lucide-react'
import { loadGuestClient, recordGuestEvent } from './guestClient'

// Palette — dark guest theme
const BG = '#05050f'
const SURFACE = 'rgba(255,255,255,0.04)'
const SURFACE2 = 'rgba(255,255,255,0.07)'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#f8fafc'
const MUTED = '#94a3b8'
const INDIGO = '#6366f1'
const STAFF_BUBBLE = 'rgba(148,163,184,0.16)'
const STAFF_TEXT = TEXT

type MsgStatus = 'sent' | 'delivered' | 'read'
type MsgKind = 'text' | 'quick' | 'image' | 'system'
type ChannelId = 'staff' | 'cafe' | 'tables' | 'players' | 'owner'

type Message = {
  id: string
  from: 'me' | 'staff' | 'system'
  staffName?: string
  text: string
  kind: MsgKind
  time: number
  status?: MsgStatus
  reaction?: string
  imageUrl?: string
}

const QUICK_ACTIONS = [
  { emoji: '🍞', label: 'Plus de pain' },
  { emoji: '🥛', label: "Plus d'eau" },
  { emoji: '🍴', label: 'Couverts supplémentaires' },
  { emoji: '💡', label: 'Ambiance musicale' },
  { emoji: '🧾', label: "Demander l'addition" },
  { emoji: '🚶', label: 'Appeler le serveur' },
  { emoji: '❄️', label: 'Baisser le chauffage' },
]

const CHANNELS: { id: ChannelId; label: string; desc: string; icon: typeof Users }[] = [
  { id: 'staff', label: 'Personnel', desc: 'Serveur/serveuse', icon: MessageCircle },
  { id: 'cafe', label: 'Café', desc: 'Groupe public', icon: Coffee },
  { id: 'tables', label: 'Tables', desc: 'Table a table', icon: Table2 },
  { id: 'players', label: 'Joueurs', desc: 'Defis individuels', icon: Users },
  { id: 'owner', label: 'Patron', desc: 'Message plus tard', icon: UserRound },
]

const CHANNEL_QUICK_ACTIONS: Partial<Record<ChannelId, { emoji: string; label: string }[]>> = {
  cafe: [
    { emoji: '📸', label: 'Partager une photo' },
    { emoji: '🎲', label: 'Qui veut jouer ?' },
    { emoji: '🎶', label: 'Bonne ambiance ici' },
  ],
  tables: [
    { emoji: '🎯', label: 'Table 2, une partie ?' },
    { emoji: '🤝', label: 'On cherche deux joueurs' },
    { emoji: '🏆', label: 'Mini tournoi ?' },
  ],
  players: [
    { emoji: '🎮', label: 'Défi individuel' },
    { emoji: '🏅', label: 'Revanche ?' },
    { emoji: '👋', label: 'Salut, tu joues ?' },
  ],
  owner: [
    { emoji: '✍️', label: 'Message au patron' },
    { emoji: '⭐', label: 'Suggestion' },
    { emoji: '🧾', label: 'Question facture' },
  ],
}

function quickActionsFor(channel: ChannelId) {
  const actions = CHANNEL_QUICK_ACTIONS[channel] ?? QUICK_ACTIONS
  return actions.filter((item) => !item.label.toLowerCase().includes('appeler'))
}

const STAFF_REPLIES = [
  "Bien reçu, j'arrive tout de suite !",
  'Parfait, je transmets en cuisine.',
  'Avec plaisir, un instant.',
  "Merci pour votre message, c'est noté !",
  'Je vous apporte ça dans un moment.',
]

const INITIAL_MESSAGES: Message[] = [
  { id: 'm1', from: 'system', text: 'Marie a rejoint la conversation', kind: 'system', time: Date.now() - 1000 * 60 * 18 },
  { id: 'm2', from: 'staff', staffName: 'Marie', text: "Bonjour et bienvenue au Bistrot du Lac ! Comment puis-je vous aider ?", kind: 'text', time: Date.now() - 1000 * 60 * 17 },
  { id: 'm3', from: 'me', text: 'Bonjour, est-ce que je peux avoir la carte des vins ?', kind: 'text', time: Date.now() - 1000 * 60 * 16, status: 'read' },
  { id: 'm4', from: 'staff', staffName: 'Marie', text: 'Bien sûr, je vous apporte ça immédiatement.', kind: 'text', time: Date.now() - 1000 * 60 * 15 },
  { id: 'm5', from: 'staff', staffName: 'Marie', text: 'Souhaitez-vous aussi un conseil sur les accords mets-vins ?', kind: 'text', time: Date.now() - 1000 * 60 * 15, reaction: '👍' },
  { id: 'm6', from: 'me', text: 'Oui avec plaisir !', kind: 'text', time: Date.now() - 1000 * 60 * 14, status: 'read' },
  { id: 'm7', from: 'staff', staffName: 'Marie', text: '', imageUrl: 'placeholder', kind: 'image', time: Date.now() - 1000 * 60 * 12 },
  { id: 'm8', from: 'staff', staffName: 'Marie', text: 'Voici notre sélection du moment — coup de cœur sur le Pinot Noir.', kind: 'text', time: Date.now() - 1000 * 60 * 12 },
  { id: 'm9', from: 'me', text: "Plus de pain", kind: 'quick', time: Date.now() - 1000 * 60 * 8, status: 'read' },
  { id: 'm10', from: 'staff', staffName: 'Marie', text: "C'est noté, j'arrive tout de suite.", kind: 'text', time: Date.now() - 1000 * 60 * 7 },
  { id: 'm11', from: 'me', text: 'Merci beaucoup !', kind: 'text', time: Date.now() - 1000 * 60 * 6, status: 'read' },
  { id: 'm12', from: 'staff', staffName: 'Marie', text: 'Je reste à votre disposition 😊', kind: 'text', time: Date.now() - 1000 * 60 * 5 },
]

function initialMessagesFor(channel: ChannelId): Message[] {
  void INITIAL_MESSAGES
  const now = Date.now()
  if (channel === 'cafe') {
    return [
      { id: 'c1', from: 'system', text: 'Groupe café: messages visibles par les clients connectés.', kind: 'system', time: now - 60000 },
      { id: 'c2', from: 'staff', staffName: 'Creorga', text: 'Bienvenue dans le groupe du café. Vous pouvez discuter et partager une photo du moment.', kind: 'text', time: now - 45000 },
    ]
  }
  if (channel === 'tables') {
    return [
      { id: 't1', from: 'system', text: 'Table à table: proposez une partie ou un tournoi local.', kind: 'system', time: now - 60000 },
      { id: 't2', from: 'staff', staffName: 'Table 2', text: 'On cherche une autre table pour Petits Chevaux 3D.', kind: 'text', time: now - 42000 },
    ]
  }
  if (channel === 'players') {
    return [
      { id: 'p1', from: 'system', text: 'Joueurs: défis individuels et invitations avec code.', kind: 'system', time: now - 60000 },
      { id: 'p2', from: 'staff', staffName: 'Joueur local', text: 'Disponible pour un duel rapide.', kind: 'text', time: now - 43000 },
    ]
  }
  if (channel === 'owner') {
    return [
      { id: 'o1', from: 'system', text: 'Message au patron: il pourra le consulter plus tard dans Creorga.', kind: 'system', time: now - 60000 },
    ]
  }
  return [
    { id: 's1', from: 'system', text: 'Conversation avec le personnel de service.', kind: 'system', time: now - 1000 * 60 * 3 },
    { id: 's2', from: 'staff', staffName: 'Marie', text: 'Bonjour, écrivez ici pour demander du pain, de l eau, l addition ou une aide à table.', kind: 'text', time: now - 1000 * 60 * 2 },
  ]
}

function fmtTime(t: number) {
  return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function shouldShowTimestamp(curr: Message, prev?: Message) {
  if (!prev) return true
  return curr.time - prev.time > 1000 * 60 * 3
}

export default function ChatSection({ onBack }: { onBack?: () => void }) {
  const [channel, setChannel] = useState<ChannelId>('staff')
  const [messages, setMessages] = useState<Message[]>(() => initialMessagesFor('staff'))
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    setMessages(initialMessagesFor(channel))
    setInput('')
    setUnread(0)
    setIsTyping(false)
  }, [channel])

  const pushStaffReply = (replyText?: string) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const text = replyText ?? STAFF_REPLIES[Math.floor(Math.random() * STAFF_REPLIES.length)]
      setMessages(prev => [
        ...prev,
        { id: `s-${Date.now()}`, from: 'staff', staffName: 'Marie', text, kind: 'text', time: Date.now() },
      ])
      setUnread(u => u + 1)
    }, 2000)
  }

  const sendMessage = (text: string, kind: MsgKind = 'text') => {
    const trimmed = text.trim()
    if (!trimmed) return
    const msg: Message = {
      id: `u-${Date.now()}`,
      from: 'me',
      text: trimmed,
      kind,
      time: Date.now(),
      status: 'sent',
    }
    setMessages(prev => [...prev, msg])
    setInput('')
    recordGuestEvent('chat', loadGuestClient(), { channel, text: trimmed, kind })
    // Progress status: sent → delivered → read
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m))
    }, 600)
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m))
    }, 1400)
    if (channel === 'staff') pushStaffReply()
    if (channel === 'owner') {
      setMessages(prev => [
        ...prev,
        { id: `o-${Date.now()}`, from: 'system', text: 'Message laisse au patron pour consultation plus tard.', kind: 'system', time: Date.now() },
      ])
    }
  }

  const handleSend = () => sendMessage(input, 'text')
  const handleQuick = (label: string) => sendMessage(label, 'quick')

  const clearUnread = () => setUnread(0)

  const statusIcon = (s?: MsgStatus) => {
    if (s === 'read') return <CheckCheck size={13} style={{ color: '#60a5fa' }} />
    if (s === 'delivered') return <CheckCheck size={13} style={{ color: MUTED }} />
    return <Check size={13} style={{ color: MUTED }} />
  }

  const statusLabel = (s?: MsgStatus) =>
    s === 'read' ? 'Lu' : s === 'delivered' ? 'Livré' : 'Envoyé'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      background: BG, color: TEXT, position: 'relative',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>
      {/* ─── HEADER ─── */}
      <div style={{
        height: 60, flexShrink: 0, display: 'flex', alignItems: 'center',
        gap: 12, padding: '0 14px',
        background: 'rgba(10,10,22,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <button
          style={iconBtn}
          aria-label="Retour"
          onClick={() => {
            if (channel !== 'staff') setChannel('staff')
            else onBack?.()
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 20,
            background: `linear-gradient(135deg, ${INDIGO}, #8b5cf6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff',
          }}>M</div>
          <span style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 12, height: 12, borderRadius: 6,
            background: '#22c55e', border: `2px solid ${BG}`,
            boxShadow: '0 0 0 0 rgba(34,197,94,0.6)',
            animation: 'creorga-pulse 1.8s infinite',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
            {CHANNELS.find((item) => item.id === channel)?.label ?? 'Personnel'}
          </div>
          <AnimatePresence mode="wait">
            {isTyping ? (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{ fontSize: 11, color: INDIGO, fontWeight: 500 }}
              >
                en train d'écrire…
              </motion.div>
            ) : (
              <motion.div
                key="online"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 11, color: MUTED }}
              >
                En ligne · répond généralement en &lt; 1 min
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ─── QUICK ACTIONS BAR ─── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 0 10px 14px',
        borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(10,10,22,0.6)',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingRight: 14,
          marginBottom: 9,
          scrollbarWidth: 'none',
        }}>
          {CHANNELS.map((item) => {
            const Icon = item.icon
            const active = item.id === channel
            return (
              <button
                key={item.id}
                onClick={() => setChannel(item.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  padding: '8px 11px',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.72)' : BORDER}`,
                  background: active ? 'rgba(99,102,241,0.22)' : SURFACE,
                  color: active ? TEXT : MUTED,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <Icon size={13} />
                {item.label}
              </button>
            )
          })}
        </div>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingRight: 14, scrollbarWidth: 'none',
        }}>
          {quickActionsFor(channel).map(q => (
            <button
              key={q.label}
              onClick={() => handleQuick(q.label)}
              style={{
                flexShrink: 0,
                padding: '7px 13px', borderRadius: 999,
                background: SURFACE2, border: `1px solid ${BORDER}`,
                color: TEXT, fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = SURFACE2; e.currentTarget.style.borderColor = BORDER }}
            >
              <span>{q.emoji}</span>
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <div
        ref={scrollRef}
        onScroll={clearUnread}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 14px 8px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}
      >
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const showTime = shouldShowTimestamp(m, prev)
          const groupedWithPrev = prev && prev.from === m.from && !showTime

          if (m.kind === 'system') {
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}
              >
                <span style={{
                  fontSize: 11, color: MUTED,
                  background: SURFACE, border: `1px solid ${BORDER}`,
                  padding: '4px 12px', borderRadius: 999,
                }}>{m.text}</span>
              </motion.div>
            )
          }

          const isMe = m.from === 'me'
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
              {showTime && (
                <div style={{
                  display: 'flex', justifyContent: 'center',
                  margin: '10px 0 6px', fontSize: 11, color: MUTED,
                }}>
                  {fmtTime(m.time)}
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, x: isMe ? 20 : -20, y: 4 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  marginTop: groupedWithPrev ? 2 : 6,
                }}
              >
                {!isMe && !groupedWithPrev && (
                  <div style={{ fontSize: 10.5, color: MUTED, marginLeft: 12, marginBottom: 3, fontWeight: 500 }}>
                    {m.staffName ?? 'Le Personnel'}
                  </div>
                )}

                <div style={{ maxWidth: '78%', position: 'relative' }}>
                  {m.kind === 'image' ? (
                    <div style={{
                      borderRadius: 20, overflow: 'hidden',
                      background: STAFF_BUBBLE, padding: 4,
                      border: `1px solid ${BORDER}`,
                    }}>
                      <div style={{
                        width: 220, height: 140, borderRadius: 16,
                        background: 'linear-gradient(135deg,#312e81,#6366f1,#a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.85)',
                      }}>
                        <ImageIcon size={36} />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: m.kind === 'quick' ? '9px 14px' : '9px 14px',
                      fontSize: 14, lineHeight: 1.4,
                      background: isMe ? INDIGO : STAFF_BUBBLE,
                      color: isMe ? '#fff' : STAFF_TEXT,
                      borderRadius: 20,
                      borderTopRightRadius: isMe ? 6 : 20,
                      borderTopLeftRadius: isMe ? 20 : 6,
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      border: m.kind === 'quick'
                        ? (isMe ? '1px solid rgba(255,255,255,0.25)' : `1px solid ${INDIGO}`)
                        : 'none',
                      fontWeight: m.kind === 'quick' ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {m.kind === 'quick' && <span style={{ fontSize: 15 }}>⚡</span>}
                      <span>{m.text}</span>
                    </div>
                  )}

                  {m.reaction && (
                    <div style={{
                      position: 'absolute', bottom: -10,
                      [isMe ? 'left' : 'right']: 8,
                      background: SURFACE2, border: `1px solid ${BORDER}`,
                      borderRadius: 999, padding: '2px 7px',
                      fontSize: 12,
                    } as React.CSSProperties}>
                      {m.reaction}
                    </div>
                  )}
                </div>

                {isMe && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    marginTop: 3, marginRight: 4,
                    fontSize: 10.5, color: MUTED,
                  }}>
                    <span>{statusLabel(m.status)}</span>
                    {statusIcon(m.status)}
                  </div>
                )}
              </motion.div>
            </div>
          )
        })}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 6 }}
            >
              <div style={{
                padding: '10px 14px',
                background: STAFF_BUBBLE, borderRadius: 20,
                borderTopLeftRadius: 6,
                display: 'flex', gap: 4, alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    style={{ width: 6, height: 6, borderRadius: 3, background: '#64748b', display: 'inline-block' }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Unread counter badge */}
      <AnimatePresence>
        {unread > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { clearUnread(); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            style={{
              position: 'absolute', right: 14, bottom: 96,
              background: INDIGO, color: '#fff',
              padding: '7px 13px', borderRadius: 999,
              border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              boxShadow: '0 6px 20px rgba(99,102,241,0.45)',
            }}
          >
            {unread} nouveau{unread > 1 ? 'x' : ''} message{unread > 1 ? 's' : ''} ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── INPUT AREA ─── */}
      <div style={{
        flexShrink: 0,
        minHeight: 80, padding: '14px 12px',
        background: 'rgba(10,10,22,0.92)',
        backdropFilter: 'blur(14px)',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {input.length > 200 && (
          <div style={{ fontSize: 10.5, color: input.length > 480 ? '#f87171' : MUTED, paddingLeft: 8 }}>
            {input.length} / 500 caractères
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {channel === 'cafe' && (
            <button style={iconBtn} aria-label="Partager une photo">
              <Paperclip size={18} />
            </button>
          )}

          <div style={{
            flex: 1,
            background: SURFACE2,
            border: `1px solid ${BORDER}`,
            borderRadius: 22,
            padding: '2px 4px 2px 14px',
            display: 'flex', alignItems: 'center',
            transition: 'all .15s',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder="Écrivez votre message…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: TEXT, fontSize: 14, padding: '8px 0',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: input.trim() ? INDIGO : SURFACE,
              color: '#fff',
              border: `1px solid ${input.trim() ? 'transparent' : BORDER}`,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: input.trim() ? 1 : 0.55,
              boxShadow: input.trim() ? '0 4px 14px rgba(99,102,241,0.5)' : 'none',
            }}
            aria-label="Envoyer"
          >
            <Send size={17} />
          </motion.button>
        </div>
      </div>

      <style>{`
        @keyframes creorga-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        div::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 19,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: SURFACE, border: `1px solid ${BORDER}`,
  color: TEXT, cursor: 'pointer', flexShrink: 0,
  transition: 'all .15s',
}
