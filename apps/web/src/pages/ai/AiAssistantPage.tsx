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
  Star,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  Plus,
  Settings,
  Share2,
  FileDown,
  Utensils,
  Newspaper,
  Calculator,
  LineChart,
  Search,
  Trash2,
  Pin,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
  Store,
  CalendarDays,
  Shield,
  FileSpreadsheet,
  FilePlus2,
  Cpu,
  X,
  Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'

const C = {
  text: '#0f172a',
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
  red: '#ef4444',
  redSoft: '#fee2e2',
  slate: '#475569',
  slateSoft: '#f1f5f9',
}

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
  followups?: string[]
  model?: string
}

interface Conversation {
  id: string
  title: string
  lastMsg: string
  time: string
  pinned?: boolean
  archived?: boolean
  messages: ChatMessage[]
}

const MODELS = [
  { id: 'creorga', name: 'Creorga AI', desc: 'Entraîné sur vos données', icon: Sparkles, color: '#8b5cf6' },
  { id: 'claude', name: 'Claude Sonnet 4', desc: 'Anthropic - Analyse poussée', icon: Bot, color: '#d97757' },
  { id: 'gpt4', name: 'GPT-4 Turbo', desc: 'OpenAI - Créativité', icon: Cpu, color: '#10a37f' },
]

const TEMPLATES = [
  { id: 't1', icon: LineChart, color: '#3b82f6', soft: '#dbeafe', title: 'Analyse de ma semaine', desc: 'Résumé complet CA, trafic, marges, alertes' },
  { id: 't2', icon: Utensils, color: '#f59e0b', soft: '#fef3c7', title: 'Optimiser mon menu', desc: 'Identifier les plats à pousser ou retirer' },
  { id: 't3', icon: Newspaper, color: '#ec4899', soft: '#fce7f3', title: 'Générer une newsletter', desc: 'Newsletter clients personnalisée' },
  { id: 't4', icon: Calculator, color: '#10b981', soft: '#d1fae5', title: 'Résumé comptable', desc: 'TVA, charges, marge, trésorerie' },
  { id: 't5', icon: TrendingUp, color: '#8b5cf6', soft: '#ede9fe', title: 'Prévisions du mois', desc: 'Projections CA, stocks, équipe' },
  { id: 't6', icon: Star, color: '#f97316', soft: '#ffedd5', title: 'Réponses aux avis', desc: 'Réponses personnalisées aux avis Google' },
]

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'Analyse ventes de la semaine',
    lastMsg: 'Cappuccino +18%, lasagnes -12%...',
    time: '10:42',
    pinned: true,
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Quel est mon meilleur produit ce mois et pourquoi ?',
        time: '10:42',
      },
      {
        id: 'm2',
        role: 'ai',
        model: 'creorga',
        text:
          "**Votre meilleur produit est le Cappuccino** avec 342 ventes ce mois (+18% vs mois dernier).\n\n### Pourquoi il cartonne :\n- Prix psychologique à 3,50€ parfaitement calibré\n- Marge *excellente* (72%)\n- Représente **12% de votre CA** total\n- Taux de rachat clients fidèles : 68%\n\n### Recommandations :\n1. Tester une variante premium (Cappuccino vanille caramel à 4,80€)\n2. Créer un combo matinal (Cappuccino + viennoiserie) pour +1,50€ de panier\n3. Mettre en avant sur votre QR Menu en page d'accueil",
        time: '10:42',
        followups: [
          'Quels sont les plats qui ne se vendent pas ?',
          'Combien je pourrais gagner avec le combo matinal ?',
          'Crée-moi le visuel pour la promo Cappuccino premium',
        ],
      },
      {
        id: 'm3',
        role: 'user',
        text: 'Quels sont les plats qui ne se vendent pas ?',
        time: '10:45',
      },
      {
        id: 'm4',
        role: 'ai',
        model: 'creorga',
        text:
          "3 plats sous-performent significativement :\n\n| Plat | Ventes/mois | Stock immobilisé |\n|---|---|---|\n| Salade Niçoise | 4 | ~80€ |\n| Risotto Champignons | 6 | ~95€ |\n| Tarte Poireaux | 2 | ~65€ |\n\n**Total immobilisé : ~240€ de stock**\n\nJe suggère de :\n- Retirer temporairement la Tarte Poireaux de la carte\n- Tester le Risotto en *plat du jour* 2x/semaine\n- Remplacer la Salade Niçoise par une version burrata plus tendance",
        time: '10:46',
        followups: [
          "Montre-moi l'évolution sur 6 mois",
          'Crée une automatisation pour surveiller ces plats',
          'Quelle marge je perds avec ces plats ?',
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Newsletter Saint-Valentin',
    lastMsg: 'Voici 3 versions au ton différent...',
    time: 'Hier',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Rédige-moi une newsletter pour la Saint-Valentin 2026',
        time: 'Hier 16:30',
      },
      {
        id: 'm2',
        role: 'ai',
        model: 'creorga',
        text: "Voici une proposition de newsletter pour vos 1 247 clients fidèles :\n\n### Objet : *Un 14 février qui vous ressemble*\n\nChère Marie,\n\nLa Saint-Valentin approche et nous avons imaginé une soirée à votre image...\n\n**Notre menu signature :**\n- Entrée : Tartare de saumon, agrumes & wasabi\n- Plat : Filet de bœuf Rossini ou Saint-Jacques snackées\n- Dessert : Cœur chocolat coulant, glace vanille bourbon\n\n**Prix : 68€ par personne** (vins en supplément)\n\nRéservation limitée à 24 couverts — *premiers arrivés, premiers servis*.",
        time: 'Hier 16:31',
        followups: ['Version plus courte pour SMS', 'Ajoute une offre early bird', 'Traduis en anglais'],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Prévisions weekend prolongé',
    lastMsg: 'Surcharge prévue +42% samedi soir',
    time: 'Lundi',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Prévisions pour le weekend du 8 mai ?',
        time: 'Lun 09:15',
      },
      {
        id: 'm2',
        role: 'ai',
        model: 'creorga',
        text: "Analyse prédictive basée sur 3 ans d'historique, météo et événements locaux :\n\n**Vendredi 8 mai** (férié)\n- Midi : 80 couverts estimés (+25%)\n- Soir : 120 couverts (+42%)\n\n**Samedi 9 mai**\n- Midi : 65 couverts (normal)\n- Soir : 95 couverts (+15%)\n\n### Actions recommandées :\n- Prévoir 2 serveurs supplémentaires vendredi soir\n- Commander +30% de produits frais (bœuf, saumon, légumes)\n- Ouvrir la terrasse (météo favorable : 22°C, ensoleillé)",
        time: 'Lun 09:16',
      },
    ],
  },
  {
    id: 'c4',
    title: 'Réponse avis négatif Google',
    lastMsg: 'Voici une réponse empathique...',
    time: 'Lundi',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Comment répondre à cet avis 2 étoiles sur Google ?',
        time: 'Lun 14:20',
      },
      {
        id: 'm2',
        role: 'ai',
        model: 'claude',
        text: "Voici une réponse professionnelle qui reconnaît le problème sans se rabaisser :\n\n> Bonjour Thomas,\n> \n> Merci d'avoir pris le temps de nous partager votre expérience. Nous sommes sincèrement désolés que votre visite du 3 avril n'ait pas été à la hauteur.\n> \n> L'attente de 40 minutes entre l'entrée et le plat est inacceptable, et nous avons depuis renforcé notre équipe en cuisine le samedi soir.\n> \n> N'hésitez pas à revenir nous voir — votre prochain apéritif maison est offert.\n> \n> *L'équipe du Comptoir Luxembourgeois*",
        time: 'Lun 14:21',
      },
    ],
  },
  {
    id: 'c5',
    title: 'Optimisation coûts matières',
    lastMsg: 'Économies potentielles : 480€/mois',
    time: 'Mar dernier',
    archived: true,
    messages: [],
  },
]

const INSIGHTS = [
  {
    id: 'i1',
    icon: TrendingUp,
    color: C.green,
    title: 'Pic de ventes détecté',
    text: 'Le jeudi soir affiche +23% vs autres jours. Opportunité marketing à saisir.',
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

// Safe inline markdown → React nodes (no dangerouslySetInnerHTML)
function renderInline(text: string, keyBase: string): (JSX.Element | string)[] {
  const nodes: (JSX.Element | string)[] = []
  // Tokenize **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  const parts = text.split(regex).filter(Boolean)
  parts.forEach((part, i) => {
    const k = `${keyBase}-${i}`
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={k}>{part.slice(2, -2)}</strong>)
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={k}>{part.slice(1, -1)}</em>)
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code
          key={k}
          style={{ background: C.slateSoft, padding: '1px 5px', borderRadius: 4, fontSize: 12 }}
        >
          {part.slice(1, -1)}
        </code>
      )
    } else {
      nodes.push(part)
    }
  })
  return nodes
}

function renderMarkdown(text: string): JSX.Element[] {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let inTable = false
  let tableHeaders: string[] = []
  let tableRows: string[][] = []
  let listItems: string[] = []
  let numberedItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      const key = `ul-${elements.length}`
      elements.push(
        <ul key={key} style={{ margin: '6px 0', paddingLeft: 20, lineHeight: 1.65 }}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }
  const flushNumbered = () => {
    if (numberedItems.length > 0) {
      const key = `ol-${elements.length}`
      elements.push(
        <ol key={key} style={{ margin: '6px 0', paddingLeft: 22, lineHeight: 1.65 }}>
          {numberedItems.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </ol>
      )
      numberedItems = []
    }
  }
  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      const key = `t-${elements.length}`
      elements.push(
        <div key={key} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr style={{ background: C.slateSoft }}>
                {tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '7px 11px',
                      border: `1px solid ${C.border}`,
                      fontWeight: 600,
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{ padding: '7px 11px', border: `1px solid ${C.border}` }}
                    >
                      {renderInline(cell, `${key}-${i}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableHeaders = []
      tableRows = []
      inTable = false
    }
  }

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('|')) {
      flushList()
      flushNumbered()
      if (/^\|[\s\-:|]+\|?$/.test(line.trim())) return
      const cells = line.split('|').filter((c) => c.trim() !== '').map((c) => c.trim())
      if (!inTable) {
        tableHeaders = cells
        inTable = true
      } else {
        tableRows.push(cells)
      }
      return
    } else if (inTable) {
      flushTable()
    }

    if (line.startsWith('### ')) {
      flushList()
      flushNumbered()
      elements.push(
        <h4 key={idx} style={{ margin: '10px 0 6px', fontSize: 14, fontWeight: 700, color: C.text }}>
          {renderInline(line.slice(4), `h4-${idx}`)}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      flushNumbered()
      elements.push(
        <h3 key={idx} style={{ margin: '10px 0 6px', fontSize: 15, fontWeight: 700 }}>
          {renderInline(line.slice(3), `h3-${idx}`)}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      flushNumbered()
      listItems.push(line.slice(2))
    } else if (/^\d+\.\s/.test(line)) {
      flushList()
      numberedItems.push(line.replace(/^\d+\.\s/, ''))
    } else if (line.startsWith('> ')) {
      flushList()
      flushNumbered()
      elements.push(
        <blockquote
          key={idx}
          style={{
            margin: '8px 0',
            padding: '8px 14px',
            borderLeft: `3px solid ${C.purple}`,
            background: C.purpleSoft,
            borderRadius: 6,
            fontSize: 13,
            fontStyle: 'italic',
            color: C.text,
          }}
        >
          {renderInline(line.slice(2), `bq-${idx}`)}
        </blockquote>
      )
    } else if (line.trim() === '') {
      flushList()
      flushNumbered()
    } else {
      flushList()
      flushNumbered()
      elements.push(
        <p key={idx} style={{ margin: '4px 0', lineHeight: 1.6 }}>
          {renderInline(line, `p-${idx}`)}
        </p>
      )
    }
  })
  flushList()
  flushNumbered()
  flushTable()
  return elements
}

function AiAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [activeId, setActiveId] = useState<string>(INITIAL_CONVERSATIONS[0].id)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [recording, setRecording] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [currentModel, setCurrentModel] = useState('creorga')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<string[]>([])
  const [showInsights, setShowInsights] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const active = conversations.find((c) => c.id === activeId)!
  const messages = active.messages

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming, streamText])

  const filteredConversations = conversations.filter(
    (c) =>
      !c.archived &&
      (c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMsg.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  const pinnedConvs = filteredConversations.filter((c) => c.pinned)
  const otherConvs = filteredConversations.filter((c) => !c.pinned)

  const updateActiveMessages = (updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
    setConversations((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, messages: updater(c.messages) } : c))
    )
  }

  const simulateStream = (fullText: string, onDone: () => void) => {
    setStreamText('')
    setIsStreaming(true)
    let i = 0
    const tick = () => {
      if (i >= fullText.length) {
        setIsStreaming(false)
        setStreamText('')
        onDone()
        return
      }
      const jump = Math.min(fullText.length - i, 3 + Math.floor(Math.random() * 4))
      setStreamText(fullText.slice(0, i + jump))
      i += jump
      setTimeout(tick, 18)
    }
    tick()
  }

  const send = (text: string) => {
    if (!text.trim()) return
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      time,
    }
    updateActiveMessages((m) => [...m, userMsg])
    setInput('')
    setAttachedFiles([])

    const response =
      "D'après vos données des 30 derniers jours, voici mon analyse :\n\n" +
      '### Tendances détectées\n' +
      '- **CA moyen** : 4 850€/jour (+7,2% vs mois dernier)\n' +
      '- **Panier moyen** : 32,40€ (stable)\n' +
      '- **Taux de rotation** : 2,8 - *excellent*\n\n' +
      "### Points d'attention\n" +
      '1. Stock farine T55 à surveiller\n' +
      "2. Pic d'affluence jeudi soir non-staffé correctement\n\n" +
      'Souhaitez-vous que je génère un rapport PDF détaillé ?'

    setTimeout(() => {
      simulateStream(response, () => {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          model: currentModel,
          text: response,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          followups: [
            'Génère le rapport PDF',
            "Compare avec la même période l'an dernier",
            'Crée une automatisation pour surveiller ces KPIs',
          ],
        }
        updateActiveMessages((m) => [...m, aiMsg])
      })
    }, 500)
  }

  const newConversation = () => {
    const nc: Conversation = {
      id: `c-${Date.now()}`,
      title: 'Nouvelle conversation',
      lastMsg: '',
      time: 'Maintenant',
      messages: [],
    }
    setConversations((cs) => [nc, ...cs])
    setActiveId(nc.id)
    setShowTemplates(true)
  }

  const deleteConv = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id)
    setConversations(remaining)
    if (activeId === id && remaining.length > 0) setActiveId(remaining[0].id)
    toast.success('Conversation supprimée')
  }

  const togglePin = (id: string) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  const toggleRecording = () => {
    setRecording((r) => !r)
    if (!recording) {
      toast('Enregistrement vocal...', { icon: '🎙️' })
      setTimeout(() => {
        setRecording(false)
        send('Combien de clients hier soir ?')
      }, 2200)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles([...attachedFiles, ...files.map((f) => f.name)])
      toast.success(`${files.length} fichier(s) joint(s)`)
    }
  }

  const activeModel = MODELS.find((m) => m.id === currentModel)!

  return (
    <div
      style={{
        height: 'calc(100vh - 20px)',
        display: 'flex',
        background: C.bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
        overflow: 'hidden',
      }}
    >
      {/* LEFT SIDEBAR */}
      <aside
        style={{
          width: 280,
          background: C.card,
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Creorga AI</div>
              <div style={{ fontSize: 11, color: C.green, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                En ligne
              </div>
            </div>
          </div>
          <button
            onClick={newConversation}
            style={{
              width: '100%',
              padding: '10px',
              background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: `0 4px 12px ${C.purple}44`,
            }}
          >
            <Plus size={15} /> Nouvelle conversation
          </button>
        </div>

        <div style={{ padding: '10px 14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: '7px 10px',
            }}
          >
            <Search size={14} color={C.muted} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                flex: 1,
                color: C.text,
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
          {pinnedConvs.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 8px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.muted,
                  letterSpacing: 0.5,
                }}
              >
                ÉPINGLÉES
              </div>
              {pinnedConvs.map((c) => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                  onPin={() => togglePin(c.id)}
                  onDelete={() => deleteConv(c.id)}
                />
              ))}
            </>
          )}
          {otherConvs.length > 0 && (
            <>
              <div
                style={{
                  padding: '10px 8px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.muted,
                  letterSpacing: 0.5,
                }}
              >
                RÉCENTES
              </div>
              {otherConvs.map((c) => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  active={c.id === activeId}
                  onClick={() => setActiveId(c.id)}
                  onPin={() => togglePin(c.id)}
                  onDelete={() => deleteConv(c.id)}
                />
              ))}
            </>
          )}
        </div>

        <div style={{ padding: 14, borderTop: `1px solid ${C.border}` }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: C.muted,
              marginBottom: 5,
            }}
          >
            <span>Utilisation IA ce mois</span>
            <span style={{ fontWeight: 600, color: C.text }}>342 / 500</span>
          </div>
          <div style={{ height: 5, background: C.slateSoft, borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '68.4%' }}
              transition={{ duration: 0.9 }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${C.purple}, ${C.pink})` }}
            />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            Renouvellement dans 12 jours · Plan Pro
          </div>
        </div>
      </aside>

      {/* CENTER */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: `1px solid ${C.border}`,
            background: C.card,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <ContextPill icon={Store} label="Le Comptoir Luxembourgeois" color={C.blue} />
            <ContextPill icon={CalendarDays} label="18 avril 2026" color={C.green} />
            <ContextPill icon={Shield} label="Bryan · Propriétaire" color={C.amber} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 11px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                <activeModel.icon size={14} color={activeModel.color} />
                {activeModel.name}
                <ChevronDown size={13} color={C.muted} />
              </button>
              <AnimatePresence>
                {showModelMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      background: '#fff',
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      padding: 6,
                      minWidth: 240,
                      zIndex: 10,
                    }}
                  >
                    {MODELS.map((m) => {
                      const Icon = m.icon
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setCurrentModel(m.id)
                            setShowModelMenu(false)
                            toast.success(`Modèle : ${m.name}`)
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: 9,
                            background: currentModel === m.id ? C.purpleSoft : 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: `${m.color}22`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={15} color={m.color} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{m.desc}</div>
                          </div>
                          {currentModel === m.id && <CheckCircle2 size={15} color={C.purple} />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <IconBtn icon={Share2} tooltip="Partager" onClick={() => toast.success('Lien copié : creorga.ai/s/x82h9d')} />
            <IconBtn icon={FileDown} tooltip="Exporter" onClick={() => toast.success('Export PDF en cours...')} />
            <IconBtn icon={Zap} tooltip="Créer automatisation" onClick={() => toast.success('Automatisation créée')} />
            <IconBtn icon={Settings} tooltip="Paramètres" onClick={() => toast('Paramètres IA')} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {messages.length === 0 || showTemplates ? (
            <EmptyState
              onSelectTemplate={(t) => {
                setShowTemplates(false)
                send(t)
              }}
            />
          ) : (
            <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{active.title}</h2>
                <button
                  onClick={() => toast('Renommer')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}
                >
                  <Edit3 size={13} />
                </button>
              </div>

              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} onFollowup={send} />
              ))}

              {isStreaming && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={17} color="#fff" />
                  </div>
                  <div
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: '12px 16px',
                      fontSize: 14,
                      maxWidth: '85%',
                    }}
                  >
                    {streamText ? (
                      renderMarkdown(streamText)
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                            style={{ width: 7, height: 7, borderRadius: '50%', background: C.purple }}
                          />
                        ))}
                      </div>
                    )}
                    <span
                      style={{
                        display: 'inline-block',
                        width: 2,
                        height: 14,
                        background: C.purple,
                        marginLeft: 2,
                        verticalAlign: 'middle',
                        animation: 'blink 1s infinite',
                      }}
                    />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${C.border}`, background: C.card }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {attachedFiles.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: C.blueSoft,
                      color: C.blue,
                      padding: '5px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <FileSpreadsheet size={13} />
                    {f}
                    <X
                      size={13}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setAttachedFiles(attachedFiles.filter((_, j) => j !== i))}
                    />
                  </div>
                ))}
              </div>
            )}

            {recording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: C.pinkSoft,
                  border: `1px solid ${C.pink}44`,
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: C.pink,
                    animation: 'pulse 1s infinite',
                  }}
                />
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, flex: 1 }}>Écoute en cours...</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 24 }}>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [4, 8 + Math.random() * 18, 6 + Math.random() * 12, 4],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + Math.random() * 0.4,
                        delay: i * 0.02,
                      }}
                      style={{
                        width: 3,
                        borderRadius: 2,
                        background: C.pink,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '8px 10px',
              }}
            >
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={iconBtnStyle(C.muted)}
                title="Joindre CSV/PDF"
              >
                <Paperclip size={18} />
              </button>
              <button onClick={() => setShowTemplates(true)} style={iconBtnStyle(C.muted)} title="Templates">
                <FilePlus2 size={18} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                placeholder="Posez une question sur votre restaurant..."
                rows={1}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  background: 'transparent',
                  color: C.text,
                  resize: 'none',
                  padding: '9px 4px',
                  maxHeight: 140,
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />
              <button
                onClick={toggleRecording}
                style={{
                  ...iconBtnStyle(recording ? C.pink : C.muted),
                  background: recording ? C.pinkSoft : 'transparent',
                }}
              >
                <Mic size={18} />
              </button>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isStreaming}
                style={{
                  border: 'none',
                  background:
                    input.trim() && !isStreaming
                      ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`
                      : C.border,
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: 10,
                  cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: input.trim() && !isStreaming ? `0 3px 10px ${C.purple}55` : 'none',
                }}
              >
                <Send size={15} />
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' }}>
              Creorga AI peut faire des erreurs. Vérifiez les informations importantes.
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL */}
      {showInsights && (
        <aside
          style={{
            width: 300,
            background: C.card,
            borderLeft: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={17} color={C.amber} />
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Insights live</h3>
            </div>
            <button
              onClick={() => setShowInsights(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {INSIGHTS.map((i) => {
                const Icon = i.icon
                return (
                  <motion.div
                    key={i.id}
                    whileHover={{ y: -1 }}
                    style={{
                      padding: 12,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: '#fff',
                          border: `1px solid ${C.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={13} color={i.color} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>{i.title}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>{i.text}</div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 10,
                        color: C.muted,
                      }}
                    >
                      <span>{i.time}</span>
                      <button
                        style={{
                          background: '#fff',
                          border: `1px solid ${C.border}`,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          color: i.color,
                          cursor: 'pointer',
                        }}
                      >
                        Explorer
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, background: C.bg }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              CE MOIS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <MiniStat icon={MessageSquare} label="Questions" value="342" color={C.purple} />
              <MiniStat icon={Zap} label="Automatisations" value="12" color={C.blue} />
              <MiniStat icon={Clock} label="Temps gagné" value="18h" color={C.green} />
              <MiniStat icon={Target} label="Précision" value="94%" color={C.amber} />
            </div>
          </div>
        </aside>
      )}

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}

function ConvItem({
  conv,
  active,
  onClick,
  onPin,
  onDelete,
}: {
  conv: Conversation
  active: boolean
  onClick: () => void
  onPin: () => void
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 10,
        borderRadius: 9,
        cursor: 'pointer',
        background: active ? C.purpleSoft : hover ? C.bg : 'transparent',
        marginBottom: 3,
        border: `1px solid ${active ? C.purple + '33' : 'transparent'}`,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: active ? C.purpleDark : C.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            paddingRight: 6,
          }}
        >
          {conv.pinned && (
            <Pin size={10} style={{ display: 'inline', marginRight: 5, color: C.amber }} fill={C.amber} />
          )}
          {conv.title}
        </div>
        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{conv.time}</span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: C.muted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {conv.lastMsg}
      </div>
      {hover && (
        <div
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            display: 'flex',
            gap: 2,
            background: '#fff',
            padding: 2,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPin()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: conv.pinned ? C.amber : C.muted,
              display: 'flex',
            }}
            title={conv.pinned ? 'Désépingler' : 'Épingler'}
          >
            <Pin size={12} fill={conv.pinned ? C.amber : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: C.red,
              display: 'flex',
            }}
            title="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, onFollowup }: { msg: ChatMessage; onFollowup: (t: string) => void }) {
  const model = MODELS.find((m) => m.id === msg.model)
  const isUser = msg.role === 'user'

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: isUser
              ? `linear-gradient(135deg, ${C.blue}, ${C.blueSoft})`
              : `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
        </div>

        <div
          style={{
            maxWidth: '85%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          <div
            style={{
              background: isUser ? `linear-gradient(135deg, ${C.blue}, #2563eb)` : C.card,
              color: isUser ? '#fff' : C.text,
              border: isUser ? 'none' : `1px solid ${C.border}`,
              padding: '12px 16px',
              borderRadius: 14,
              fontSize: 14,
              lineHeight: 1.55,
              boxShadow: isUser ? '0 4px 14px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {isUser ? msg.text : renderMarkdown(msg.text)}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              fontSize: 11,
              color: C.muted,
            }}
          >
            {!isUser && model && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: `${model.color}18`,
                  color: model.color,
                  padding: '2px 7px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                <model.icon size={10} />
                {model.name}
              </span>
            )}
            <span>{msg.time}</span>
            {!isUser && (
              <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                <MsgAction icon={Copy} tooltip="Copier" onClick={() => toast.success('Copié')} />
                <MsgAction icon={ThumbsUp} tooltip="Utile" onClick={() => toast('Merci pour le retour !')} />
                <MsgAction icon={ThumbsDown} tooltip="Pas utile" onClick={() => toast('Merci pour le retour')} />
                <MsgAction icon={RefreshCw} tooltip="Régénérer" onClick={() => toast('Nouvelle réponse...')} />
              </div>
            )}
          </div>

          {!isUser && msg.followups && msg.followups.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, width: '100%' }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 0.3 }}>
                QUESTIONS SUGGÉRÉES
              </div>
              {msg.followups.map((f, i) => (
                <button
                  key={i}
                  onClick={() => onFollowup(f)}
                  style={{
                    textAlign: 'left',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: '9px 12px',
                    fontSize: 12.5,
                    color: C.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.purpleSoft
                    e.currentTarget.style.borderColor = C.purple + '66'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.bg
                    e.currentTarget.style.borderColor = C.border
                  }}
                >
                  <Sparkles size={12} color={C.purple} />
                  <span style={{ flex: 1 }}>{f}</span>
                  <ChevronRight size={13} color={C.muted} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function MsgAction({ icon: Icon, tooltip, onClick }: { icon: any; tooltip: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 3,
        color: C.muted,
        display: 'flex',
        borderRadius: 5,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.slateSoft)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={13} />
    </button>
  )
}

function EmptyState({ onSelectTemplate }: { onSelectTemplate: (t: string) => void }) {
  const userPrompts = [
    'Analyse de ma semaine écoulée',
    "Optimiser mon menu pour l'été",
    'Générer une newsletter pour mes clients fidèles',
    'Résumé comptable du mois dernier',
    'Prévisions de ventes pour mai',
    'Suggestions pour améliorer mes avis Google',
  ]
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 28 }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: `0 12px 30px ${C.purple}44`,
          }}
        >
          <Sparkles size={36} color="#fff" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>Comment puis-je vous aider ?</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          Je connais votre restaurant et j'analyse vos données en temps réel
        </p>
      </motion.div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.muted,
          marginBottom: 10,
          letterSpacing: 0.3,
        }}
      >
        TEMPLATES
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {TEMPLATES.map((t) => {
          const Icon = t.icon
          return (
            <motion.button
              key={t.id}
              whileHover={{ y: -2 }}
              onClick={() => onSelectTemplate(t.title)}
              style={{
                textAlign: 'left',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 13,
                padding: 14,
                cursor: 'pointer',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: t.soft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={t.color} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{t.desc}</div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.muted,
          marginBottom: 10,
          letterSpacing: 0.3,
        }}
      >
        SUGGESTIONS RAPIDES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {userPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelectTemplate(p)}
            style={{
              textAlign: 'left',
              padding: '10px 14px',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              fontSize: 13,
              color: C.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <MessageSquare size={14} color={C.purple} />
            {p}
            <ChevronRight size={13} color={C.muted} style={{ marginLeft: 'auto' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

function ContextPill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: C.bg,
        border: `1px solid ${C.border}`,
        padding: '5px 10px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 500,
        color: C.text,
      }}
    >
      <Icon size={12} color={color} />
      {label}
    </div>
  )
}

function IconBtn({ icon: Icon, tooltip, onClick }: { icon: any; tooltip: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        padding: 8,
        borderRadius: 9,
        cursor: 'pointer',
        color: C.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={15} />
    </button>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any
  label: string
  value: string
  color: string
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 10 }}>
      <Icon size={13} color={color} style={{ marginBottom: 4 }} />
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  )
}

const iconBtnStyle = (color: string): React.CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color,
  background: 'transparent',
})

export default AiAssistantPage
