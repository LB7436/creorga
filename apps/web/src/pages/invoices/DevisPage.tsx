import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts'
import {
  FileText, Clock, CheckCircle2, Euro, Plus, X, Trash2, Download, Mail,
  Save, Eye, Copy, PenTool, RefreshCw, History, GitCompare, BookOpen,
  Bell, Send, Search, FileCheck2, Sparkles, Image as ImageIcon,
  ArrowRight, CalendarClock, ScrollText, XCircle, FileClock,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Statut = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

interface Devis {
  id: number
  numero: string
  client: string
  date: string
  validite: string
  montant: number
  statut: Statut
  opened?: boolean
  openedAt?: string
  signed?: boolean
  signedAt?: string
  version?: number
  reminderScheduled?: boolean
}

interface LigneArticle {
  id: number
  description: string
  quantite: number
  prixHT: number
  tauxTVA: number
}

interface QuoteDesign {
  id: string
  nom: string
  headerBg: string
  headerColor: string
  accentColor: string
  fontFamily: string
  description: string
}

interface Template {
  id: string
  nom: string
  description: string
  articles: number
  montant: number
}

interface CGVItem {
  id: string
  nom: string
  texte: string
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const mockDevis: Devis[] = [
  { id: 1, numero: 'DEV-2026-042', client: 'Restaurant Le Pavillon', date: '2026-04-12', validite: '2026-05-12', montant: 2450, statut: 'ACCEPTED', opened: true, openedAt: '2026-04-13 10:24', signed: true, signedAt: '2026-04-14 15:02', version: 2 },
  { id: 2, numero: 'DEV-2026-041', client: 'Brasserie Mansfeld', date: '2026-04-10', validite: '2026-04-25', montant: 1280, statut: 'SENT', opened: true, openedAt: '2026-04-11 08:45', reminderScheduled: true },
  { id: 3, numero: 'DEV-2026-040', client: 'Caf\u00e9 des Artistes', date: '2026-04-08', validite: '2026-05-08', montant: 890, statut: 'DRAFT' },
  { id: 4, numero: 'DEV-2026-039', client: 'Hotel Parc Belair', date: '2026-04-05', validite: '2026-05-05', montant: 3200, statut: 'ACCEPTED', opened: true, openedAt: '2026-04-06 14:12', signed: true, signedAt: '2026-04-08 09:30' },
  { id: 5, numero: 'DEV-2026-038', client: 'Trattoria Roma', date: '2026-04-02', validite: '2026-05-02', montant: 630, statut: 'REJECTED', opened: true, openedAt: '2026-04-03 11:08' },
  { id: 6, numero: 'DEV-2026-037', client: 'Wine Bar Clausen', date: '2026-03-28', validite: '2026-04-11', montant: 1750, statut: 'EXPIRED', opened: false },
  { id: 7, numero: 'DEV-2026-036', client: 'Bistro Neumunster', date: '2026-03-20', validite: '2026-04-20', montant: 980, statut: 'SENT', opened: false },
]

const statutConfig: Record<Statut, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: '#64748b' },
  SENT: { label: 'Envoy\u00e9', color: '#3b82f6' },
  ACCEPTED: { label: 'Accept\u00e9', color: '#10b981' },
  REJECTED: { label: 'Refus\u00e9', color: '#ef4444' },
  EXPIRED: { label: 'Expir\u00e9', color: '#f59e0b' },
}

const TAUX_TVA = [3, 8, 14, 17]

const DESIGNS: QuoteDesign[] = [
  { id: 'classique', nom: 'Classique', headerBg: '#ffffff', headerColor: '#1e293b', accentColor: '#1e293b', fontFamily: 'system-ui, sans-serif', description: 'Noir et blanc, lignes nettes' },
  { id: 'moderne', nom: 'Moderne', headerBg: '#4338ca', headerColor: '#ffffff', accentColor: '#4338ca', fontFamily: 'system-ui, sans-serif', description: 'Accent indigo, contemporain' },
  { id: 'elegant', nom: '\u00c9l\u00e9gant', headerBg: '#1a1a2e', headerColor: '#d4af37', accentColor: '#d4af37', fontFamily: 'Georgia, serif', description: 'Serif, accents dor\u00e9s' },
  { id: 'compact', nom: 'Compact', headerBg: '#f8fafc', headerColor: '#334155', accentColor: '#64748b', fontFamily: 'system-ui, sans-serif', description: 'Minimal, dense, efficace' },
  { id: 'luxembourg', nom: 'Luxembourg', headerBg: '#00A1DE', headerColor: '#ffffff', accentColor: '#EF4135', fontFamily: 'system-ui, sans-serif', description: 'Couleurs du Luxembourg' },
]

const TEMPLATES: Template[] = [
  { id: 't1', nom: 'Traiteur \u00e9v\u00e9nement', description: 'Menu complet pour 50 pers.', articles: 8, montant: 2200 },
  { id: 't2', nom: 'Buffet mariage', description: 'Buffet + vin + service', articles: 12, montant: 4800 },
  { id: 't3', nom: 'Coffee break entreprise', description: 'Caf\u00e9, viennoiseries, jus', articles: 5, montant: 350 },
  { id: 't4', nom: 'Menu d\u00e9gustation', description: '5 plats + accord mets/vins', articles: 10, montant: 1650 },
]

const CGV_LIBRARY: CGVItem[] = [
  { id: 'std', nom: 'Standard Luxembourg', texte: 'Devis valable 30 jours. Paiement \u00e0 30 jours date de facture. TVA luxembourgeoise applicable. Retard : int\u00e9r\u00eats l\u00e9gaux + 40\u20ac forfait recouvrement (loi du 18/04/2004).' },
  { id: 'event', nom: '\u00c9v\u00e9nementiel', texte: 'Acompte 30% \u00e0 la commande, solde J-7. Annulation : 50% si < 15j, 100% si < 72h. Force majeure : report sans frais.' },
  { id: 'catering', nom: 'Traiteur', texte: 'Confirmation d\u00e9finitive J-7. Nombre de couverts ajustable \u00b110% jusque J-3. Vaisselle cass\u00e9e factur\u00e9e au prix catalogue.' },
  { id: 'corporate', nom: 'Corporate B2B', texte: 'Paiement 60 jours fin de mois. Bon de commande requis. Facturation \u00e9lectronique via Peppol accept\u00e9e.' },
]

const ENTREPRISE = {
  nom: 'Caf\u00e9 um Rond-Point',
  adresse: '12 Rue du Rond-Point, L-3750 Rumelange',
  tel: '+352 26 56 12 34',
  tva: 'LU12345678',
}

const acceptanceMonths = [
  { mois: 'Nov', envoyes: 12, acceptes: 7, refuses: 3, expires: 2 },
  { mois: 'D\u00e9c', envoyes: 18, acceptes: 11, refuses: 4, expires: 3 },
  { mois: 'Jan', envoyes: 15, acceptes: 10, refuses: 3, expires: 2 },
  { mois: 'F\u00e9v', envoyes: 22, acceptes: 15, refuses: 4, expires: 3 },
  { mois: 'Mar', envoyes: 19, acceptes: 13, refuses: 4, expires: 2 },
  { mois: 'Avr', envoyes: 14, acceptes: 9, refuses: 3, expires: 2 },
]

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 20,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 13,
  color: '#1e293b',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 24,
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: 32, right: 32, background: '#1e293b', color: '#fff',
        padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 500,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)', zIndex: 10001,
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <CheckCircle2 size={15} style={{ color: '#34d399' }} />
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, marginLeft: 6 }}>
        <X size={13} />
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mini Quote Preview                                                 */
/* ------------------------------------------------------------------ */

function QuotePreview({ design, client, articles, numero, validite }: {
  design: QuoteDesign
  client: { nom: string; adresse: string; email: string }
  articles: LigneArticle[]
  numero: string
  validite: string
}) {
  const sousTotal = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
  const totalTVA = articles.reduce((s, a) => s + a.quantite * a.prixHT * (a.tauxTVA / 100), 0)
  const totalTTC = sousTotal + totalTVA
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{
      width: '100%', maxWidth: 440, background: '#fff', borderRadius: 10,
      overflow: 'hidden', fontFamily: design.fontFamily, color: '#1e293b',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
    }}>
      <div style={{ background: design.headerBg, color: design.headerColor, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{ENTREPRISE.nom}</div>
            <div style={{ fontSize: 9, opacity: 0.8, lineHeight: 1.5 }}>
              {ENTREPRISE.adresse}<br />TVA : {ENTREPRISE.tva}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>DEVIS</div>
            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{numero}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 10 }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Destin\u00e9 \u00e0</div>
            <div style={{ fontWeight: 700, fontSize: 12, marginTop: 3 }}>{client.nom || 'Client'}</div>
            {client.adresse && <div style={{ color: '#64748b', marginTop: 2 }}>{client.adresse}</div>}
          </div>
          <div style={{ textAlign: 'right', color: '#64748b' }}>
            Validit\u00e9 : <strong>{validite || '\u2014'}</strong>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${design.accentColor}` }}>
              <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: 9, color: design.accentColor }}>Description</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: 9, color: design.accentColor }}>Qt\u00e9</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: 9, color: design.accentColor }}>Prix</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: 9, color: design.accentColor }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>Aucun article</td></tr>
            )}
            {articles.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 4px' }}>{a.description || 'Article'}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{a.quantite}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{fmt(a.prixHT)}\u20ac</td>
                <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>{fmt(a.quantite * a.prixHT)}\u20ac</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', padding: '3px 0' }}>
              <span>Sous-total HT</span><span>{fmt(sousTotal)}\u20ac</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', padding: '3px 0' }}>
              <span>TVA</span><span>{fmt(totalTVA)}\u20ac</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800,
              color: design.accentColor, padding: '6px 0 2px', borderTop: `2px solid ${design.accentColor}`, marginTop: 4,
            }}>
              <span>Total TTC</span><span>{fmt(totalTTC)}\u20ac</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  New Devis Modal                                                    */
/* ------------------------------------------------------------------ */

function DevisModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const [client, setClient] = useState({ nom: '', adresse: '', email: '' })
  const [articles, setArticles] = useState<LigneArticle[]>([{ id: 1, description: '', quantite: 1, prixHT: 0, tauxTVA: 17 }])
  const [notes, setNotes] = useState('')
  const [selectedCGV, setSelectedCGV] = useState<string>('std')
  const [customCGV, setCustomCGV] = useState('')
  const [selectedDesign, setSelectedDesign] = useState('moderne')
  const [validityDays, setValidityDays] = useState<number>(30)
  const [customDate, setCustomDate] = useState('')
  const [autoRemind, setAutoRemind] = useState(true)
  const [nextId, setNextId] = useState(2)

  const numero = 'DEV-2026-043'
  const design = DESIGNS.find(d => d.id === selectedDesign) || DESIGNS[1]

  const validiteDate = useMemo(() => {
    if (validityDays === -1 && customDate) return customDate
    const d = new Date()
    d.setDate(d.getDate() + validityDays)
    return d.toISOString().slice(0, 10)
  }, [validityDays, customDate])

  const conditions = selectedCGV === 'custom'
    ? customCGV
    : (CGV_LIBRARY.find(c => c.id === selectedCGV)?.texte || '')

  const addArticle = () => {
    setArticles(prev => [...prev, { id: nextId, description: '', quantite: 1, prixHT: 0, tauxTVA: 17 }])
    setNextId(n => n + 1)
  }

  const removeArticle = (id: number) => {
    if (articles.length <= 1) return
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  const updateArticle = (id: number, field: keyof LigneArticle, value: string | number) => {
    setArticles(prev => prev.map(a => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const applyTemplate = (t: Template) => {
    const sample: LigneArticle[] = Array.from({ length: Math.min(t.articles, 4) }, (_, i) => ({
      id: i + 1,
      description: `${t.nom} \u2013 \u00e9l\u00e9ment ${i + 1}`,
      quantite: 1,
      prixHT: Math.round((t.montant / t.articles) * 100) / 100,
      tauxTVA: 17,
    }))
    setArticles(sample)
    setNextId(sample.length + 1)
    onToast(`Template "${t.nom}" appliqu\u00e9`)
  }

  const totals = useMemo(() => {
    const st = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
    const tv = articles.reduce((s, a) => s + a.quantite * a.prixHT * (a.tauxTVA / 100), 0)
    return { st, tv, tt: st + tv }
  }, [articles])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} style={overlay}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#f8fafc', borderRadius: 20, width: '100%', maxWidth: 1280,
          maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Nouveau devis</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{numero} \u2022 Validit\u00e9 : {validiteDate}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onToast('Brouillon enregistr\u00e9')} style={smallBtnStyle}><Save size={13} /> Brouillon</button>
            <button onClick={() => onToast('Devis envoy\u00e9 par email')} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none' }}><Send size={13} /> Envoyer</button>
            <button onClick={() => onToast('G\u00e9n\u00e9ration du PDF...')} style={{ ...smallBtnStyle, background: '#4338ca', color: '#fff', border: 'none' }}><Download size={13} /> PDF</button>
            <button onClick={onClose} style={{ ...smallBtnStyle, width: 34, padding: 0, justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>Client</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nom / Soci\u00e9t\u00e9</label>
                  <input style={inputStyle} value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} placeholder="Restaurant Le Pavillon" />
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} placeholder="Rue principale..." />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} placeholder="email@exemple.lu" />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarClock size={14} /> Validit\u00e9
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ d: 7, l: '7 jours' }, { d: 15, l: '15 jours' }, { d: 30, l: '30 jours' }, { d: 60, l: '60 jours' }, { d: -1, l: 'Personnalis\u00e9' }].map(opt => (
                  <button
                    key={opt.d}
                    onClick={() => setValidityDays(opt.d)}
                    style={{
                      padding: '6px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                      border: validityDays === opt.d ? '1px solid #4338ca' : '1px solid #e2e8f0',
                      background: validityDays === opt.d ? '#eef2ff' : '#ffffff',
                      color: validityDays === opt.d ? '#4338ca' : '#475569', cursor: 'pointer',
                    }}
                  >{opt.l}</button>
                ))}
              </div>
              {validityDays === -1 && (
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ ...inputStyle, marginTop: 10, maxWidth: 200 }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoRemind} onChange={e => setAutoRemind(e.target.checked)} />
                <Bell size={13} /> Relance auto 3 jours avant expiration
              </label>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1e293b' }}>Articles</h3>
                <button onClick={addArticle} style={{ ...smallBtnStyle, padding: '6px 10px' }}><Plus size={12} /> Ajouter</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {articles.map(art => (
                  <div key={art.id} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 90px 80px 30px', gap: 6 }}>
                    <input style={inputStyle} placeholder="Description" value={art.description} onChange={e => updateArticle(art.id, 'description', e.target.value)} />
                    <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min={1} value={art.quantite} onChange={e => updateArticle(art.id, 'quantite', Math.max(1, parseInt(e.target.value) || 1))} />
                    <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step={0.01} value={art.prixHT || ''} onChange={e => updateArticle(art.id, 'prixHT', parseFloat(e.target.value) || 0)} placeholder="0,00" />
                    <select style={{ ...inputStyle, padding: '10px 6px' }} value={art.tauxTVA} onChange={e => updateArticle(art.id, 'tauxTVA', parseInt(e.target.value))}>
                      {TAUX_TVA.map(t => <option key={t} value={t}>{t}%</option>)}
                    </select>
                    <button onClick={() => removeArticle(art.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} style={{ color: articles.length <= 1 ? '#cbd5e1' : '#ef4444' }} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                  <span>Sous-total HT</span><span style={{ fontWeight: 600 }}>{fmt(totals.st)} \u20ac</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  <span>TVA</span><span style={{ fontWeight: 600 }}>{fmt(totals.tv)} \u20ac</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#1e293b', marginTop: 8, paddingTop: 8, borderTop: '2px solid #1e293b' }}>
                  <span>Total TTC</span><span>{fmt(totals.tt)} \u20ac</span>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} /> Conditions g\u00e9n\u00e9rales
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {CGV_LIBRARY.map(c => (
                  <button key={c.id} onClick={() => setSelectedCGV(c.id)} style={{
                    padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    border: selectedCGV === c.id ? '1px solid #4338ca' : '1px solid #e2e8f0',
                    background: selectedCGV === c.id ? '#eef2ff' : '#fff',
                    color: selectedCGV === c.id ? '#4338ca' : '#475569', cursor: 'pointer',
                  }}>{c.nom}</button>
                ))}
                <button onClick={() => setSelectedCGV('custom')} style={{
                  padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                  border: selectedCGV === 'custom' ? '1px solid #4338ca' : '1px solid #e2e8f0',
                  background: selectedCGV === 'custom' ? '#eef2ff' : '#fff',
                  color: selectedCGV === 'custom' ? '#4338ca' : '#475569', cursor: 'pointer',
                }}>Personnalis\u00e9</button>
              </div>
              {selectedCGV === 'custom' ? (
                <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }} value={customCGV} onChange={e => setCustomCGV(e.target.value)} />
              ) : (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                  {conditions}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#1e293b' }}>Notes internes</h3>
              <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarques..." />
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#1e293b' }}>Design</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DESIGNS.map(d => (
                  <motion.button
                    key={d.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDesign(d.id)}
                    style={{
                      width: 95, padding: 0, borderRadius: 10, overflow: 'hidden',
                      border: selectedDesign === d.id ? `2px solid ${d.accentColor}` : '2px solid #e2e8f0',
                      background: '#fff', cursor: 'pointer',
                      boxShadow: selectedDesign === d.id ? `0 0 0 2px ${d.accentColor}30` : 'none',
                    }}
                  >
                    <div style={{ height: 40, background: d.headerBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Eye size={14} style={{ color: d.headerColor, opacity: 0.7 }} />
                    </div>
                    <div style={{ padding: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#1e293b' }}>{d.nom}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: 500, minWidth: 420, background: '#eef1f6', borderLeft: '1px solid #e2e8f0', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Aper\u00e7u en direct</div>
            <QuotePreview design={design} client={client} articles={articles} numero={numero} validite={validiteDate} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Comparison Modal                                                   */
/* ------------------------------------------------------------------ */

function CompareModal({ devis, onClose }: { devis: Devis[]; onClose: () => void }) {
  const [a, setA] = useState<number | null>(devis[0]?.id ?? null)
  const [b, setB] = useState<number | null>(devis[1]?.id ?? null)
  const devisA = devis.find(d => d.id === a)
  const devisB = devis.find(d => d.id === b)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 900, width: '100%', maxHeight: '86vh', overflow: 'auto', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCompare size={18} /> Comparaison c\u00f4te \u00e0 c\u00f4te
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[{ val: a, set: setA, d: devisA, tag: 'A' }, { val: b, set: setB, d: devisB, tag: 'B' }].map(({ val, set, d, tag }) => (
            <div key={tag} style={{ background: '#f8fafc', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: '#4338ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{tag}</div>
                <select value={val ?? ''} onChange={e => set(Number(e.target.value))} style={{ ...inputStyle, flex: 1 }}>
                  {devis.map(x => <option key={x.id} value={x.id}>{x.numero} \u2013 {x.client}</option>)}
                </select>
              </div>
              {d && (
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.9 }}>
                  <div><strong>Client :</strong> {d.client}</div>
                  <div><strong>Date :</strong> {d.date}</div>
                  <div><strong>Validit\u00e9 :</strong> {d.validite}</div>
                  <div><strong>Statut :</strong> <span style={{ color: statutConfig[d.statut].color, fontWeight: 600 }}>{statutConfig[d.statut].label}</span></div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Montant TTC</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                      {d.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {devisA && devisB && (
          <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 700, marginBottom: 4 }}>\u00c9cart</div>
            <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>
              {Math.abs(devisA.montant - devisB.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
              ({(devisA.montant > devisB.montant ? 'A' : 'B')} est plus cher de {Math.round(Math.abs(devisA.montant - devisB.montant) / Math.min(devisA.montant, devisB.montant) * 100)}%)
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  History Modal                                                      */
/* ------------------------------------------------------------------ */

function HistoryModal({ devis, onClose }: { devis: Devis; onClose: () => void }) {
  const versions = [
    { v: devis.version || 1, date: devis.date, montant: devis.montant, note: 'Version actuelle' },
    { v: (devis.version || 1) - 1, date: '2026-04-10', montant: devis.montant - 120, note: 'R\u00e9vision prix' },
    { v: (devis.version || 1) - 2, date: '2026-04-08', montant: devis.montant - 300, note: 'Version initiale' },
  ].filter(v => v.v > 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 560, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={17} /> Historique {devis.numero}
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: '#e2e8f0' }} />
          {versions.map((v, i) => (
            <div key={v.v} style={{ position: 'relative', marginBottom: i < versions.length - 1 ? 18 : 0 }}>
              <div style={{ position: 'absolute', left: -21, top: 4, width: 14, height: 14, borderRadius: '50%', background: i === 0 ? '#4338ca' : '#cbd5e1', border: '3px solid #fff', boxShadow: '0 0 0 2px ' + (i === 0 ? '#4338ca' : '#cbd5e1') }} />
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#1e293b' }}>Version {v.v}</strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{v.date}</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{v.note}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginTop: 6 }}>
                  {v.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Signature Modal                                                    */
/* ------------------------------------------------------------------ */

function SignatureModal({ devis, onClose, onSign }: { devis: Devis; onClose: () => void; onSign: () => void }) {
  const [signed, setSigned] = useState(false)
  const [name, setName] = useState('')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 540, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PenTool size={17} /> Signature \u00e9lectronique
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ padding: 14, background: '#eef2ff', borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#3730a3' }}>
          <strong>{devis.numero}</strong> \u2022 {devis.client} \u2022 {devis.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
        </div>
        <label style={labelStyle}>Nom du signataire</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" />
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Zone de signature</label>
          <div
            onClick={() => setSigned(true)}
            style={{
              height: 140, border: '2px dashed ' + (signed ? '#10b981' : '#cbd5e1'),
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: signed ? '#f0fdf4' : '#f8fafc', transition: 'all 0.2s',
            }}
          >
            {signed ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'cursive', fontSize: 28, color: '#065f46' }}>{name || 'Sign\u00e9'}</div>
                <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Sign\u00e9 le {new Date().toLocaleString('fr-FR')}</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                <PenTool size={24} style={{ marginBottom: 6, color: '#94a3b8' }} /><br />
                Cliquez ici pour signer
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => { onSign(); onClose() }}
          disabled={!signed || !name}
          style={{
            width: '100%', marginTop: 16, padding: '12px 18px', borderRadius: 12, border: 'none',
            background: signed && name ? '#10b981' : '#cbd5e1', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: signed && name ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <FileCheck2 size={15} /> Valider la signature
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Templates Modal                                                    */
/* ------------------------------------------------------------------ */

function TemplatesModal({ onClose, onApply }: { onClose: () => void; onApply: (t: Template) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 640, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={17} /> Templates de devis
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {TEMPLATES.map(t => (
            <motion.div
              key={t.id} whileHover={{ y: -2 }}
              style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 14, cursor: 'pointer', background: '#f8fafc' }}
              onClick={() => { onApply(t); onClose() }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{t.nom}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{t.articles} articles</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{t.montant.toLocaleString('fr-FR')} \u20ac</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DevisPage() {
  const [devisList, setDevisList] = useState<Devis[]>(mockDevis)
  const [filter, setFilter] = useState<Statut | null>(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [historyDevis, setHistoryDevis] = useState<Devis | null>(null)
  const [signDevis, setSignDevis] = useState<Devis | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2800)
  }

  const stats = useMemo(() => {
    const total = devisList.length
    const acceptes = devisList.filter(d => d.statut === 'ACCEPTED').length
    const refuses = devisList.filter(d => d.statut === 'REJECTED').length
    const expires = devisList.filter(d => d.statut === 'EXPIRED').length
    const encours = devisList.filter(d => d.statut === 'SENT').length
    const montant = devisList.reduce((s, d) => s + (d.statut === 'ACCEPTED' ? d.montant : 0), 0)
    const tauxAcceptation = total > 0 ? Math.round((acceptes / total) * 100) : 0
    return { total, acceptes, refuses, expires, encours, montant, tauxAcceptation }
  }, [devisList])

  const filtered = useMemo(() => {
    return devisList.filter(d => {
      if (filter && d.statut !== filter) return false
      if (search && !d.numero.toLowerCase().includes(search.toLowerCase()) && !d.client.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [devisList, filter, search])

  const convertToInvoice = (d: Devis) => {
    showToast(`Devis ${d.numero} converti en facture FAC-2026-${String(d.id + 100).padStart(3, '0')}`)
  }

  const duplicate = (d: Devis) => {
    const copy: Devis = {
      ...d,
      id: Math.max(...devisList.map(x => x.id)) + 1,
      numero: `DEV-2026-${String(Math.max(...devisList.map(x => parseInt(x.numero.slice(-3)))) + 1).padStart(3, '0')}`,
      statut: 'DRAFT',
      date: new Date().toISOString().slice(0, 10),
      opened: false,
      signed: false,
    }
    setDevisList([copy, ...devisList])
    showToast(`Devis dupliqu\u00e9 : ${copy.numero}`)
  }

  const signDevisHandler = (d: Devis) => {
    setDevisList(prev => prev.map(x => x.id === d.id ? { ...x, signed: true, statut: 'ACCEPTED', signedAt: new Date().toLocaleString('fr-FR') } : x))
    showToast(`${d.numero} sign\u00e9 et accept\u00e9`)
  }

  const pieData = [
    { name: 'Accept\u00e9s', value: stats.acceptes, color: '#10b981' },
    { name: 'En cours', value: stats.encours, color: '#3b82f6' },
    { name: 'Refus\u00e9s', value: stats.refuses, color: '#ef4444' },
    { name: 'Expir\u00e9s', value: stats.expires, color: '#f59e0b' },
  ].filter(p => p.value > 0)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>Devis</h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>Gestion, suivi et signature \u00e9lectronique des devis clients</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowTemplates(true)} style={smallBtnStyle}><Sparkles size={13} /> Templates</button>
            <button onClick={() => setShowCompare(true)} style={smallBtnStyle}><GitCompare size={13} /> Comparer</button>
            <button onClick={() => setShowModal(true)} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none', padding: '10px 18px', fontSize: 13 }}>
              <Plus size={14} /> Nouveau devis
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: '#64748b' },
            { label: 'En cours', value: stats.encours, icon: Clock, color: '#3b82f6' },
            { label: 'Accept\u00e9s', value: stats.acceptes, icon: CheckCircle2, color: '#10b981' },
            { label: 'Taux acceptation', value: `${stats.tauxAcceptation}%`, icon: FileCheck2, color: '#8b5cf6' },
            { label: 'CA devis accept\u00e9s', value: `${Math.round(stats.montant).toLocaleString('fr-FR')} \u20ac`, icon: Euro, color: '#4338ca' },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>\u00c9volution envoy\u00e9s / accept\u00e9s</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={acceptanceMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="envoyes" fill="#3b82f6" name="Envoy\u00e9s" radius={[4, 4, 0, 0]} />
                <Bar dataKey="acceptes" fill="#10b981" name="Accept\u00e9s" radius={[4, 4, 0, 0]} />
                <Bar dataKey="refuses" fill="#ef4444" name="Refus\u00e9s" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expires" fill="#f59e0b" name="Expir\u00e9s" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>R\u00e9partition des statuts</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder="Rechercher num\u00e9ro ou client..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilter(null)} style={{
                padding: '8px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                border: 'none', background: filter === null ? '#1e293b' : '#f1f5f9', color: filter === null ? '#fff' : '#475569', cursor: 'pointer',
              }}>Tous ({devisList.length})</button>
              {(Object.entries(statutConfig) as [Statut, typeof statutConfig.DRAFT][]).map(([key, cfg]) => {
                const count = devisList.filter(d => d.statut === key).length
                return (
                  <button key={key} onClick={() => setFilter(key)} style={{
                    padding: '8px 14px', borderRadius: 18, fontSize: 12, fontWeight: 600, border: 'none',
                    background: filter === key ? cfg.color : '#f1f5f9', color: filter === key ? '#fff' : '#475569', cursor: 'pointer',
                  }}>{cfg.label} ({count})</button>
                )
              })}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Num\u00e9ro', 'Client', 'Date', 'Validit\u00e9', 'Montant', 'Tracking', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(devis => {
                    const cfg = statutConfig[devis.statut]
                    return (
                      <motion.tr
                        key={devis.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={13} style={{ color: '#475569' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{devis.numero}</span>
                            {devis.version && devis.version > 1 && (
                              <span style={{ fontSize: 10, padding: '2px 6px', background: '#eef2ff', color: '#4338ca', borderRadius: 6, fontWeight: 700 }}>v{devis.version}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{devis.client}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{formatDate(devis.date)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {formatDate(devis.validite)}
                          {devis.reminderScheduled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#f59e0b', marginTop: 2 }}>
                              <Bell size={9} /> Relance J-3
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                          {devis.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {devis.opened ? (
                              <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Eye size={10} /> Ouvert {devis.openedAt?.split(' ')[0]}
                              </span>
                            ) : devis.statut === 'SENT' ? (
                              <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Eye size={10} /> Non ouvert
                              </span>
                            ) : null}
                            {devis.signed && (
                              <span style={{ fontSize: 11, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <PenTool size={10} /> Sign\u00e9
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: cfg.color, background: `${cfg.color}15` }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {devis.statut === 'ACCEPTED' && (
                              <button onClick={() => convertToInvoice(devis)} title="Convertir en facture" style={{ ...smallBtnStyle, padding: '6px 8px', background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                                <ArrowRight size={12} /> Facture
                              </button>
                            )}
                            {devis.statut === 'SENT' && !devis.signed && (
                              <button onClick={() => setSignDevis(devis)} title="Signer" style={{ ...smallBtnStyle, padding: '6px 8px', background: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0' }}>
                                <PenTool size={12} />
                              </button>
                            )}
                            <button onClick={() => duplicate(devis)} title="Dupliquer" style={{ ...smallBtnStyle, padding: '6px 8px' }}>
                              <Copy size={12} />
                            </button>
                            <button onClick={() => setHistoryDevis(devis)} title="Historique" style={{ ...smallBtnStyle, padding: '6px 8px' }}>
                              <History size={12} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && <DevisModal onClose={() => setShowModal(false)} onToast={showToast} />}
        {showCompare && <CompareModal devis={devisList} onClose={() => setShowCompare(false)} />}
        {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} onApply={(t) => showToast(`Template "${t.nom}" pr\u00eat`)} />}
        {historyDevis && <HistoryModal devis={historyDevis} onClose={() => setHistoryDevis(null)} />}
        {signDevis && <SignatureModal devis={signDevis} onClose={() => setSignDevis(null)} onSign={() => signDevisHandler(signDevis)} />}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}
