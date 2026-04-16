import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Search,
  Send,
  Save,
  X,
  Calendar,
  Users,
  MapPin,
  Euro,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Mail,
  Building2,
  User,
  Trash2,
  ChefHat,
  Music,
  Camera,
  Flower2,
  Sparkles,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type QuoteStatus = 'Brouillon' | 'Envoyé' | 'Dépôt payé' | 'Confirmé' | 'Réalisé' | 'Annulé'
type ClientType = 'B2B' | 'Particulier'

interface EventQuote {
  id: string
  number: string
  eventName: string
  eventDate: string
  client: string
  clientType: ClientType
  guests: number
  amount: number
  status: QuoteStatus
  depositPercent: number
  depositPaid: boolean
  venue: string
  eventType: string
}

const MOCK_QUOTES: EventQuote[] = [
  { id: 'q1', number: 'DEV-2026-042', eventName: 'Mariage Weber-Schmit', eventDate: '2026-05-18', client: 'Famille Weber', clientType: 'Particulier', guests: 85, amount: 6820, status: 'Confirmé', depositPercent: 30, depositPaid: true, venue: 'Salle principale', eventType: 'Mariage' },
  { id: 'q2', number: 'DEV-2026-041', eventName: 'Séminaire BGL', eventDate: '2026-04-28', client: 'BGL BNP Paribas', clientType: 'B2B', guests: 45, amount: 2880, status: 'Dépôt payé', depositPercent: 40, depositPaid: true, venue: 'Salle principale', eventType: 'Séminaire' },
  { id: 'q3', number: 'DEV-2026-040', eventName: 'Anniversaire 50 ans Marc', eventDate: '2026-05-04', client: 'Marc Thillen', clientType: 'Particulier', guests: 32, amount: 2240, status: 'Envoyé', depositPercent: 30, depositPaid: false, venue: 'Terrasse', eventType: 'Anniversaire' },
  { id: 'q4', number: 'DEV-2026-039', eventName: 'Cocktail KPMG', eventDate: '2026-04-22', client: 'KPMG Luxembourg', clientType: 'B2B', guests: 60, amount: 1800, status: 'Confirmé', depositPercent: 30, depositPaid: true, venue: 'Bar', eventType: 'Cocktail' },
  { id: 'q5', number: 'DEV-2026-038', eventName: 'Baptême Louise', eventDate: '2026-05-11', client: 'Famille Reding', clientType: 'Particulier', guests: 28, amount: 1540, status: 'Brouillon', depositPercent: 30, depositPaid: false, venue: 'Salle principale', eventType: 'Autre' },
  { id: 'q6', number: 'DEV-2026-037', eventName: 'Team Building Deloitte', eventDate: '2026-06-03', client: 'Deloitte', clientType: 'B2B', guests: 75, amount: 4125, status: 'Envoyé', depositPercent: 40, depositPaid: false, venue: 'Salle principale', eventType: 'Séminaire' },
  { id: 'q7', number: 'DEV-2026-036', eventName: 'Mariage Antoine & Sophie', eventDate: '2026-03-14', client: 'A. & S. Muller', clientType: 'Particulier', guests: 110, amount: 8690, status: 'Réalisé', depositPercent: 30, depositPaid: true, venue: 'Salle principale', eventType: 'Mariage' },
  { id: 'q8', number: 'DEV-2026-035', eventName: 'Inauguration ArcelorMittal', eventDate: '2026-03-02', client: 'ArcelorMittal', clientType: 'B2B', guests: 120, amount: 7200, status: 'Annulé', depositPercent: 30, depositPaid: false, venue: 'Location externe', eventType: 'Cocktail' },
]

const STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string; border: string }> = {
  'Brouillon':    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  'Envoyé':       { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  'Dépôt payé':   { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  'Confirmé':     { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Réalisé':      { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  'Annulé':       { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
}

const CATALOG_ITEMS = [
  { id: 'c1', name: 'Apéritif maison', price: 8 },
  { id: 'c2', name: 'Plateau fromages luxembourgeois', price: 18 },
  { id: 'c3', name: 'Filet de bœuf sauce Moselle', price: 32 },
  { id: 'c4', name: 'Saumon fumé', price: 22 },
  { id: 'c5', name: 'Dessert gourmand', price: 12 },
  { id: 'c6', name: 'Café & mignardises', price: 6 },
]

const FORMULAS = [
  { id: 'f1', name: 'Formule Cocktail', price: 25, desc: '8 pièces salées + boissons' },
  { id: 'f2', name: 'Formule Dîner', price: 65, desc: 'Entrée + Plat + Dessert' },
  { id: 'f3', name: 'Formule Buffet', price: 45, desc: 'Buffet complet à volonté' },
]

const EXTRAS = [
  { id: 'e1', name: 'Décoration florale', price: 250, icon: Flower2 },
  { id: 'e2', name: 'DJ professionnel', price: 650, icon: Music },
  { id: 'e3', name: 'Photographe', price: 480, icon: Camera },
  { id: 'e4', name: 'Pack lumières & effets', price: 320, icon: Sparkles },
]

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n)

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  color: '#1e293b',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function DevisPage() {
  const [filter, setFilter] = useState<QuoteStatus | 'Tous'>('Tous')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [detail, setDetail] = useState<EventQuote | null>(null)

  const filtered = useMemo(() => {
    return MOCK_QUOTES.filter((q) => {
      if (filter !== 'Tous' && q.status !== filter) return false
      if (search && !(`${q.eventName} ${q.client} ${q.number}`.toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
  }, [filter, search])

  const stats = [
    { label: 'En cours', value: '5', color: '#3b82f6', icon: FileText },
    { label: 'Confirmés', value: '3', color: '#10b981', icon: CheckCircle2 },
    { label: 'CA événements', value: fmtEUR(12500), color: '#8b5cf6', icon: Euro },
    { label: 'Taux conversion', value: '65%', color: '#f59e0b', icon: AlertCircle },
  ]

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Devis événements</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gérez vos propositions commerciales et suivez les conversions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: '#1e293b', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouveau devis événement
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={card}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{s.value}</div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${s.color}15`, color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div style={{ ...card, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher un devis, événement, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Tous', 'Brouillon', 'Envoyé', 'Dépôt payé', 'Confirmé', 'Réalisé', 'Annulé'] as const).map((s) => {
            const active = filter === s
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? '#1e293b' : '#e2e8f0'}`,
                  background: active ? '#1e293b' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['N° devis', 'Événement', 'Client', 'Couverts', 'Montant', 'Statut', 'Actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const c = STATUS_COLORS[q.status]
              return (
                <tr
                  key={q.id}
                  onClick={() => setDetail(q)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>{q.number}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{q.eventName}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {new Date(q.eventDate).toLocaleDateString('fr-LU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#1e293b' }}>{q.client}</span>
                      <span style={{
                        padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                        background: q.clientType === 'B2B' ? '#e0e7ff' : '#fef3c7',
                        color: q.clientType === 'B2B' ? '#4338ca' : '#b45309',
                      }}>
                        {q.clientType}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#1e293b' }}>{q.guests}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{fmtEUR(q.amount)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <IconBtn icon={Eye} label="Voir" onClick={() => setDetail(q)} />
                      <IconBtn icon={Send} label="Envoyer" onClick={() => {}} />
                      <IconBtn icon={Download} label="PDF" onClick={() => {}} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={32} style={{ marginBottom: 8 }} />
            <div>Aucun devis ne correspond aux critères</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <NewQuoteModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {detail && <DetailModal quote={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function IconBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
        color: '#475569', cursor: 'pointer',
      }}
    >
      <Icon size={14} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  New Quote Modal                                                    */
/* ------------------------------------------------------------------ */

function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [client, setClient] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [guests, setGuests] = useState(40)
  const [eventType, setEventType] = useState('Mariage')
  const [venue, setVenue] = useState('Salle principale')
  const [selectedFormula, setSelectedFormula] = useState<string | null>('f2')
  const [items, setItems] = useState<{ id: string; name: string; price: number; qty: number }[]>([])
  const [customItem, setCustomItem] = useState('')
  const [customPrice, setCustomPrice] = useState(0)
  const [extras, setExtras] = useState<Record<string, boolean>>({})
  const [depositPct, setDepositPct] = useState(30)
  const [conditions, setConditions] = useState('Dépôt de 30% à la signature. Solde à régler le jour de l\'événement. Annulation gratuite jusqu\'à 30 jours avant.')

  const formulaTotal = useMemo(() => {
    const f = FORMULAS.find((x) => x.id === selectedFormula)
    return f ? f.price * guests : 0
  }, [selectedFormula, guests])

  const itemsTotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const extrasTotal = EXTRAS.filter((e) => extras[e.id]).reduce((s, e) => s + e.price, 0)
  const ht = formulaTotal + itemsTotal + extrasTotal
  const tva = ht * 0.17
  const ttc = ht + tva
  const acompte = ttc * (depositPct / 100)

  const addCatalog = (c: typeof CATALOG_ITEMS[number]) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.id === c.id)
      if (ex) return prev.map((p) => (p.id === c.id ? { ...p, qty: p.qty + 1 } : p))
      return [...prev, { ...c, qty: 1 }]
    })
  }

  const addCustom = () => {
    if (!customItem || customPrice <= 0) return
    setItems((prev) => [...prev, { id: `custom-${Date.now()}`, name: customItem, price: customPrice, qty: 1 }])
    setCustomItem('')
    setCustomPrice(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 980,
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Nouveau devis événement</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>Configurez prestation, menu et extras</p>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#475569' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          <div>
            <Section icon={Calendar} title="Informations événement">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nom de l'événement">
                  <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Mariage Weber-Schmit" />
                </Field>
                <Field label="Type">
                  <select style={input} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                    <option>Mariage</option><option>Anniversaire</option><option>Séminaire</option><option>Cocktail</option><option>Autre</option>
                  </select>
                </Field>
                <Field label="Date">
                  <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Lieu">
                  <select style={input} value={venue} onChange={(e) => setVenue(e.target.value)}>
                    <option>Salle principale</option><option>Bar</option><option>Terrasse</option><option>Location externe</option>
                  </select>
                </Field>
                <Field label="Heure début">
                  <input type="time" style={input} value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                </Field>
                <Field label="Heure fin">
                  <input type="time" style={input} value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                </Field>
                <Field label="Nombre de couverts">
                  <input type="number" style={input} value={guests} onChange={(e) => setGuests(parseInt(e.target.value) || 0)} />
                </Field>
              </div>
            </Section>

            <Section icon={User} title="Client">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Nom / Raison sociale">
                  <input style={input} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom du client" />
                </Field>
                <Field label="Société (optionnel)">
                  <input style={input} value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Ex. BGL BNP Paribas" />
                </Field>
                <Field label="Email">
                  <input style={input} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@exemple.lu" />
                </Field>
                <Field label="Téléphone">
                  <input style={input} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+352 ..." />
                </Field>
              </div>
            </Section>

            <Section icon={ChefHat} title="Configuration du menu">
              <div style={{ marginBottom: 14 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Formules forfaitaires</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {FORMULAS.map((f) => {
                    const active = selectedFormula === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFormula(active ? null : f.id)}
                        style={{
                          padding: 14, borderRadius: 12, textAlign: 'left',
                          border: `2px solid ${active ? '#1e293b' : '#e2e8f0'}`,
                          background: active ? '#f8fafc' : '#fff', cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8px' }}>{f.desc}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                          {fmtEUR(f.price)}<span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>/pers</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Ajouter depuis le catalogue</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {CATALOG_ITEMS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addCatalog(c)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#1e293b',
                      }}
                    >
                      <span>{c.name}</span>
                      <span style={{ fontWeight: 600 }}>{fmtEUR(c.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Article personnalisé</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...input, flex: 2 }} value={customItem} onChange={(e) => setCustomItem(e.target.value)} placeholder="Nom de l'article" />
                  <input type="number" style={{ ...input, flex: 1 }} value={customPrice || ''} onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)} placeholder="Prix €" />
                  <button onClick={addCustom} style={{ padding: '0 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {items.length > 0 && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                  {items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <div style={{ fontSize: 13, color: '#1e293b' }}>{it.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="number" value={it.qty} onChange={(e) => {
                          const v = parseInt(e.target.value) || 1
                          setItems((prev) => prev.map((p) => p.id === it.id ? { ...p, qty: v } : p))
                        }} style={{ ...input, width: 60, padding: '4px 8px' }} />
                        <div style={{ width: 80, textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{fmtEUR(it.price * it.qty)}</div>
                        <button onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section icon={Sparkles} title="Extras & prestations">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {EXTRAS.map((e) => {
                  const Icon = e.icon
                  const on = !!extras[e.id]
                  return (
                    <label
                      key={e.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                        border: `2px solid ${on ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: 10, cursor: 'pointer',
                        background: on ? '#f8fafc' : '#fff',
                      }}
                    >
                      <input type="checkbox" checked={on} onChange={() => setExtras((prev) => ({ ...prev, [e.id]: !prev[e.id] }))} />
                      <Icon size={18} style={{ color: '#64748b' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{fmtEUR(e.price)}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </Section>

            <Section icon={FileText} title="Conditions générales">
              <textarea style={{ ...input, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} value={conditions} onChange={(e) => setConditions(e.target.value)} />
            </Section>
          </div>

          <div>
            <div style={{ ...card, position: 'sticky', top: 0, background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Récapitulatif</div>

              <SumLine label="Formule" value={formulaTotal} />
              <SumLine label="Articles" value={itemsTotal} />
              <SumLine label="Extras" value={extrasTotal} />

              <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />

              <SumLine label="Total HT" value={ht} bold />
              <SumLine label="TVA 17%" value={tva} />
              <SumLine label="Total TTC" value={ttc} bold big />

              <div style={{ margin: '14px 0 8px', ...labelStyle }}>Acompte demandé ({depositPct}%)</div>
              <input type="range" min={0} max={100} step={5} value={depositPct} onChange={(e) => setDepositPct(parseInt(e.target.value))} style={{ width: '100%' }} />
              <div style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: 18, marginTop: 6 }}>{fmtEUR(acompte)}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                <button style={{ padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Send size={15} /> Envoyer par email PDF
                </button>
                <button style={{ padding: '10px 14px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Save size={15} /> Enregistrer brouillon
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon size={16} style={{ color: '#1e293b' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function Field({ label: lb, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{lb}</label>
      {children}
    </div>
  )
}

function SumLine({ label: lb, value, bold, big }: { label: string; value: number; bold?: boolean; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: big ? 16 : 13, color: bold ? '#0f172a' : '#64748b', fontWeight: bold ? 700 : 500 }}>
      <span>{lb}</span>
      <span>{fmtEUR(value)}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                       */
/* ------------------------------------------------------------------ */

function DetailModal({ quote, onClose }: { quote: EventQuote; onClose: () => void }) {
  const c = STATUS_COLORS[quote.status]
  const deposit = quote.amount * (quote.depositPercent / 100)
  const balance = quote.amount - deposit
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{quote.number}</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{quote.eventName}</h2>
            <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
              {quote.status}
            </span>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
            <Info icon={Calendar} label="Date" value={new Date(quote.eventDate).toLocaleDateString('fr-LU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
            <Info icon={MapPin} label="Lieu" value={quote.venue} />
            <Info icon={Users} label="Couverts" value={`${quote.guests} personnes`} />
            <Info icon={Building2} label="Type" value={quote.eventType} />
            <Info icon={User} label="Client" value={`${quote.client} (${quote.clientType})`} />
            <Info icon={Euro} label="Montant total" value={fmtEUR(quote.amount)} />
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suivi paiements</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#1e293b' }}>
              <span>Acompte ({quote.depositPercent}%)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{fmtEUR(deposit)}</span>
                {quote.depositPaid
                  ? <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  : <AlertCircle size={16} style={{ color: '#f59e0b' }} />}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, color: '#1e293b' }}>
              <span>Solde à régler</span>
              <span style={{ fontWeight: 600 }}>{fmtEUR(balance)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={15} /> Relancer client
            </button>
            <button style={{ flex: 1, padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CreditCard size={15} /> Enregistrer paiement
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Icon size={16} style={{ color: '#64748b', marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}
