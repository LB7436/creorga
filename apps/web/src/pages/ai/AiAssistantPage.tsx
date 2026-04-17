import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Mic,
  Paperclip,
  Bot,
  User,
  Zap,
  TrendingUp,
  Clock,
  Target,
  MessageSquare,
  Bell,
  Mail,
  Star,
  BookOpen,
  Globe,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  Plus,
  Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  purple: '#8b5cf6',
  purpleSoft: '#ede9fe',
  purpleDark: '#6d28d9',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
  green: '#10b981',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  pink: '#ec4899',
  pinkSoft: '#fce7f3',
}

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    text: 'Quel est mon meilleur produit ce mois?',
    time: '10:42',
  },
  {
    id: '2',
    role: 'ai',
    text:
      "Votre meilleur produit est le Cappuccino avec 342 ventes (+18% vs mois dernier). Il représente 12% de votre CA et sa marge est excellente (72%). Je vous recommande de mettre en avant une variante premium (Cappuccino vanille caramel) pour augmenter le panier moyen de ~1,50€.",
    time: '10:42',
  },
  {
    id: '3',
    role: 'user',
    text: 'Quels sont les plats qui ne se vendent pas?',
    time: '10:45',
  },
  {
    id: '4',
    role: 'ai',
    text:
      "3 plats sous-performent : Salade Niçoise (4 ventes/mois), Risotto Champignons (6 ventes), Tarte Poireaux (2 ventes). Ensemble ils immobilisent ~240€ de stock. Je suggère de les retirer temporairement ou de tester un repositionnement sur l'ardoise du jour.",
    time: '10:46',
  },
]

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: 'Résumé de la journée', color: C.blue },
  { icon: Target, text: 'Prévisions ventes semaine prochaine', color: C.purple },
  { icon: Star, text: 'Analyser mes avis négatifs', color: C.amber },
  { icon: BookOpen, text: 'Optimiser mon menu', color: C.green },
  { icon: User, text: 'Identifier clients à risque', color: C.pink },
  { icon: Mail, text: 'Générer newsletter', color: C.blue },
]

const AUTOMATIONS = [
  {
    id: 'a1',
    name: 'Résumé quotidien par email',
    desc: 'Envoi chaque soir à 20h00',
    icon: Mail,
    active: true,
  },
  {
    id: 'a2',
    name: 'Alerte CA bas',
    desc: 'Si CA < moyenne de 20%',
    icon: Bell,
    active: true,
  },
  {
    id: 'a3',
    name: 'Réponses auto avis 5 étoiles',
    desc: 'Réponse personnalisée instantanée',
    icon: Star,
    active: true,
  },
  {
    id: 'a4',
    name: 'Relance clients inactifs',
    desc: 'SMS après 60j sans visite',
    icon: MessageSquare,
    active: false,
  },
]

const INSIGHTS = [
  {
    id: 'i1',
    icon: TrendingUp,
    color: C.green,
    title: 'Pic de ventes détecté',
    text: 'Le jeudi soir affiche +23% vs autres jours. Opportunité marketing.',
    time: 'Il y a 2h',
  },
  {
    id: 'i2',
    icon: Target,
    color: C.amber,
    title: 'Stock critique prévu',
    text: 'Farine T55 en rupture probable dans 3 jours au rythme actuel.',
    time: 'Il y a 5h',
  },
  {
    id: 'i3',
    icon: Lightbulb,
    color: C.purple,
    title: 'Opportunité pricing',
    text: 'La marge cocktails pourrait augmenter de 8% (+340€/mois).',
    time: 'Hier',
  },
  {
    id: 'i4',
    icon: Star,
    color: C.blue,
    title: 'Avis en hausse',
    text: 'Moyenne Google passée de 4,3 à 4,6 sur 30 jours. Bravo !',
    time: 'Hier',
  },
]

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  soft,
}: {
  label: string
  value: string
  icon: any
  color: string
  soft: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: soft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </motion.div>
  )
}

function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [language, setLanguage] = useState<'FR' | 'EN' | 'DE'>('FR')
  const [automations, setAutomations] = useState(AUTOMATIONS)
  const [recording, setRecording] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const send = (text: string) => {
    if (!text.trim()) return
    const time = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      time,
    }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text:
            "D'après vos données, voici mon analyse : les tendances sont globalement positives. Souhaitez-vous un rapport détaillé par email ?",
          time: new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ])
    }, 1600)
  }

  const toggleAutomation = (id: string) => {
    setAutomations((a) =>
      a.map((x) => (x.id === id ? { ...x, active: !x.active } : x))
    )
    toast.success('Automatisation mise à jour')
  }

  const toggleRecording = () => {
    setRecording((r) => !r)
    if (!recording) {
      toast('Enregistrement vocal...', { icon: '🎙️' })
      setTimeout(() => {
        setRecording(false)
        send('Combien de clients hier soir ?')
      }, 1500)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(139,92,246,0.25)',
            }}
          >
            <Sparkles size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
              Assistant IA
            </h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Votre copilote intelligent pour le restaurant
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: C.card,
              border: `1px solid ${C.border}`,
              padding: '8px 12px',
              borderRadius: 10,
            }}
          >
            <Globe size={16} color={C.muted} />
            {(['FR', 'EN', 'DE'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                style={{
                  border: 'none',
                  background: language === l ? C.purpleSoft : 'transparent',
                  color: language === l ? C.purpleDark : C.muted,
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => toast.success('Paramètres IA')}
            style={{
              border: `1px solid ${C.border}`,
              background: C.card,
              padding: '10px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: C.text,
              fontWeight: 500,
            }}
          >
            <Settings size={15} /> Paramètres
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Questions ce mois"
          value="234"
          icon={MessageSquare}
          color={C.purple}
          soft={C.purpleSoft}
        />
        <StatCard
          label="Tâches automatisées"
          value="12"
          icon={Zap}
          color={C.blue}
          soft={C.blueSoft}
        />
        <StatCard
          label="Temps économisé"
          value="18h"
          icon={Clock}
          color={C.green}
          soft={C.greenSoft}
        />
        <StatCard
          label="Précision"
          value="94%"
          icon={Target}
          color={C.amber}
          soft={C.amberSoft}
        />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Chat */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            height: 640,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: C.purpleSoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} color={C.purple} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Créa IA</div>
              <div
                style={{
                  fontSize: 12,
                  color: C.green,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: C.green,
                  }}
                />
                En ligne · répond en quelques secondes
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    maxWidth: '78%',
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: m.role === 'user' ? C.blueSoft : C.purpleSoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {m.role === 'user' ? (
                      <User size={16} color={C.blue} />
                    ) : (
                      <Bot size={16} color={C.purple} />
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        background: m.role === 'user' ? C.blue : C.bg,
                        color: m.role === 'user' ? '#fff' : C.text,
                        padding: '12px 14px',
                        borderRadius: 14,
                        fontSize: 14,
                        lineHeight: 1.55,
                        border:
                          m.role === 'ai' ? `1px solid ${C.border}` : 'none',
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        marginTop: 4,
                        textAlign: m.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: C.purpleSoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={16} color={C.purple} />
                  </div>
                  <div
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: '12px 16px',
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.9,
                          delay: i * 0.15,
                        }}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: C.purple,
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          <div
            style={{
              padding: 14,
              borderTop: `1px solid ${C.border}`,
              background: C.bg,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '6px 6px 6px 12px',
              }}
            >
              <button
                onClick={() => toast('Joindre fichier de données')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: C.muted,
                  padding: 6,
                  display: 'flex',
                }}
              >
                <Paperclip size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder="Posez une question à votre copilote..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  background: 'transparent',
                  color: C.text,
                }}
              />
              <button
                onClick={toggleRecording}
                style={{
                  border: 'none',
                  background: recording ? C.pinkSoft : 'transparent',
                  cursor: 'pointer',
                  color: recording ? C.pink : C.muted,
                  padding: 8,
                  borderRadius: 8,
                  display: 'flex',
                }}
              >
                <Mic size={18} />
              </button>
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                style={{
                  border: 'none',
                  background: input.trim() ? C.purple : C.border,
                  color: '#fff',
                  padding: '9px 12px',
                  borderRadius: 10,
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Suggested */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Lightbulb size={18} color={C.amber} />
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                Questions suggérées
              </h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {SUGGESTED_QUESTIONS.map((q, i) => {
                const Icon = q.icon
                return (
                  <button
                    key={i}
                    onClick={() => send(q.text)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      padding: 10,
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      fontSize: 12,
                      color: C.text,
                      fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = q.color
                      e.currentTarget.style.background = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.background = C.bg
                    }}
                  >
                    <Icon size={15} color={q.color} />
                    {q.text}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Automations */}
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color={C.blue} />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                  Automatisations actives
                </h3>
              </div>
              <button
                onClick={() => toast('Nouvelle automatisation')}
                style={{
                  border: 'none',
                  background: C.blueSoft,
                  color: C.blue,
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {automations.map((a) => {
                const Icon = a.icon
                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: a.active ? C.greenSoft : C.border,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} color={a.active ? C.green : C.muted} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {a.desc}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAutomation(a.id)}
                      style={{
                        width: 34,
                        height: 20,
                        borderRadius: 10,
                        border: 'none',
                        background: a.active ? C.green : C.border,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: a.active ? 16 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'all 0.2s',
                        }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Training */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.purpleSoft}, ${C.pinkSoft})`,
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={20} color={C.purple} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Le modèle apprend de vos données
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                1 247 interactions analysées ce mois
              </div>
            </div>
            <button
              onClick={() => toast('Ouvre les réglages IA')}
              style={{
                border: 'none',
                background: '#fff',
                padding: 8,
                borderRadius: 8,
                cursor: 'pointer',
                color: C.purple,
                display: 'flex',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Insights feed */}
      <div
        style={{
          marginTop: 22,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Sparkles size={20} color={C.purple} />
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            Insights IA récents
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {INSIGHTS.map((i) => {
            const Icon = i.icon
            return (
              <motion.div
                key={i.id}
                whileHover={{ y: -2 }}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 14,
                  background: C.bg,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#fff',
                      border: `1px solid ${C.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={15} color={i.color} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {i.title}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.muted,
                    lineHeight: 1.5,
                    marginBottom: 10,
                  }}
                >
                  {i.text}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    color: C.muted,
                  }}
                >
                  <span>{i.time}</span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: i.color,
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} /> Exploitable
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AiAssistantPage
