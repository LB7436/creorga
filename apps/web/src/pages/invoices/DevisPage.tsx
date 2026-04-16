import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Clock, CheckCircle2, Euro, Plus,
  X, Trash2, Upload, Download, Mail, Save, Eye, Image, XCircle
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Devis {
  id: number
  numero: string
  client: string
  date: string
  validite: string
  montant: number
  statut: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
}

interface LigneArticle {
  id: number
  description: string
  quantite: number
  prixHT: number
  tauxTVA: number
}

interface ClientInfo {
  nom: string
  adresse: string
  email: string
}

interface QuoteDesign {
  id: string
  nom: string
  headerBg: string
  headerColor: string
  accentColor: string
  fontFamily: string
  borderStyle: string
  description: string
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const mockDevis: Devis[] = [
  { id: 1, numero: 'DEV-2026-042', client: 'Restaurant Le Pavillon', date: '2026-04-12', validite: '2026-05-12', montant: 2450.00, statut: 'ACCEPTED' },
  { id: 2, numero: 'DEV-2026-041', client: 'Brasserie Mansfeld', date: '2026-04-10', validite: '2026-05-10', montant: 1280.00, statut: 'SENT' },
  { id: 3, numero: 'DEV-2026-040', client: 'Caf\u00e9 des Artistes', date: '2026-04-08', validite: '2026-05-08', montant: 890.00, statut: 'DRAFT' },
  { id: 4, numero: 'DEV-2026-039', client: 'Hotel Parc Belair', date: '2026-04-05', validite: '2026-05-05', montant: 3200.00, statut: 'ACCEPTED' },
  { id: 5, numero: 'DEV-2026-038', client: 'Trattoria Roma', date: '2026-04-02', validite: '2026-05-02', montant: 630.00, statut: 'REJECTED' },
  { id: 6, numero: 'DEV-2026-037', client: 'Wine Bar Clausen', date: '2026-03-28', validite: '2026-04-28', montant: 1750.00, statut: 'SENT' },
]

const statutConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: '#475569' },
  SENT: { label: 'Envoy\u00e9', color: '#3b82f6' },
  ACCEPTED: { label: 'Accept\u00e9', color: '#10b981' },
  REJECTED: { label: 'Refus\u00e9', color: '#ef4444' },
}

const TAUX_TVA = [3, 8, 14, 17]

const DESIGNS: QuoteDesign[] = [
  { id: 'classique', nom: 'Classique', headerBg: '#ffffff', headerColor: '#1e293b', accentColor: '#1e293b', fontFamily: 'system-ui, sans-serif', borderStyle: '2px solid #1e293b', description: 'Noir et blanc, lignes nettes' },
  { id: 'moderne', nom: 'Moderne', headerBg: '#4338ca', headerColor: '#ffffff', accentColor: '#4338ca', fontFamily: 'system-ui, sans-serif', borderStyle: 'none', description: 'Accent indigo, style contemporain' },
  { id: 'elegant', nom: '\u00c9l\u00e9gant', headerBg: '#1a1a2e', headerColor: '#d4af37', accentColor: '#d4af37', fontFamily: 'Georgia, serif', borderStyle: '1px solid #d4af37', description: 'Serif, accents dor\u00e9s' },
  { id: 'compact', nom: 'Compact', headerBg: '#f8fafc', headerColor: '#334155', accentColor: '#64748b', fontFamily: 'system-ui, sans-serif', borderStyle: '1px solid #e2e8f0', description: 'Minimal, dense, efficace' },
  { id: 'luxembourg', nom: 'Luxembourg', headerBg: '#00A1DE', headerColor: '#ffffff', accentColor: '#EF4135', fontFamily: 'system-ui, sans-serif', borderStyle: '3px solid #00A1DE', description: 'Couleurs du Luxembourg' },
]

const ENTREPRISE = {
  nom: 'Caf\u00e9 um Rond-Point',
  adresse: '12 Rue du Rond-Point, L-3750 Rumelange',
  tel: '+352 26 56 12 34',
  tva: 'LU12345678',
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.15 } },
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: '24px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 14,
  color: '#1e293b',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
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
        position: 'fixed',
        bottom: 32,
        right: 32,
        background: '#1e293b',
        color: '#ffffff',
        padding: '14px 24px',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quote Preview                                                      */
/* ------------------------------------------------------------------ */

function QuotePreview({
  design,
  entreprise,
  client,
  articles,
  date,
  validite,
  notes,
  conditions,
  numero,
}: {
  design: QuoteDesign
  entreprise: typeof ENTREPRISE
  client: ClientInfo
  articles: LigneArticle[]
  date: string
  validite: string
  notes: string
  conditions: string
  numero: string
}) {
  const sousTotal = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
  const tvaParTaux: Record<number, number> = {}
  articles.forEach(a => {
    const montantTVA = a.quantite * a.prixHT * (a.tauxTVA / 100)
    tvaParTaux[a.tauxTVA] = (tvaParTaux[a.tauxTVA] || 0) + montantTVA
  })
  const totalTVA = Object.values(tvaParTaux).reduce((s, v) => s + v, 0)
  const totalTTC = sousTotal + totalTVA

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const isLuxembourg = design.id === 'luxembourg'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 500,
        minHeight: 680,
        background: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: design.fontFamily,
        fontSize: 11,
        color: '#1e293b',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        border: design.id === 'classique' ? design.borderStyle : '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: design.headerBg,
          color: design.headerColor,
          padding: '24px 28px',
          borderBottom: design.id === 'compact' ? '1px solid #e2e8f0' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isLuxembourg && (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#EF4135' }} />
            <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 4, background: '#ffffff' }} />
            <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 4, background: '#00A1DE' }} />
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: design.id === 'elegant' ? 'center' : 'flex-start', paddingTop: isLuxembourg ? 12 : 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: design.id === 'classique' ? '#f1f5f9' : design.id === 'elegant' ? '#d4af3730' : design.id === 'compact' ? '#f1f5f9' : 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image size={16} style={{ color: design.id === 'classique' || design.id === 'compact' ? '#475569' : design.headerColor, opacity: 0.7 }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{entreprise.nom}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.6 }}>
              {entreprise.adresse}<br />
              Tel: {entreprise.tel}<br />
              TVA: {entreprise.tva}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: design.id === 'elegant' ? 2 : 0 }}>DEVIS</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{numero}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 28px' }}>
        {/* Client + Dates */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Destin\u00e9 \u00e0</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{client.nom || 'Client'}</div>
            {client.adresse && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{client.adresse}</div>}
            {client.email && <div style={{ fontSize: 10, color: '#64748b' }}>{client.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>Date: <strong>{date || '\u2014'}</strong></div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Valide jusqu'au: <strong>{validite || '\u2014'}</strong></div>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${design.accentColor}` }}>
              {['Description', 'Qt\u00e9', 'Prix HT', 'TVA', 'Total HT'].map(h => (
                <th key={h} style={{ textAlign: h === 'Description' ? 'left' : 'right', padding: '8px 6px', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: design.accentColor, fontWeight: 700 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '20px 6px', textAlign: 'center', color: '#94a3b8', fontSize: 10 }}>
                  Aucun article ajout\u00e9
                </td>
              </tr>
            )}
            {articles.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                <td style={{ padding: '8px 6px', fontSize: 11 }}>{a.description || 'Article'}</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{a.quantite}</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{fmt(a.prixHT)} \u20ac</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{a.tauxTVA}%</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right', fontWeight: 600 }}>{fmt(a.quantite * a.prixHT)} \u20ac</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, color: '#64748b' }}>
              <span>Sous-total HT</span>
              <span style={{ fontWeight: 600 }}>{fmt(sousTotal)} \u20ac</span>
            </div>
            {Object.entries(tvaParTaux).map(([taux, montant]) => (
              <div key={taux} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10, color: '#94a3b8' }}>
                <span>TVA {taux}%</span>
                <span>{fmt(montant)} \u20ac</span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0 4px',
                fontSize: 14,
                fontWeight: 800,
                color: design.accentColor,
                borderTop: `2px solid ${design.accentColor}`,
                marginTop: 6,
              }}
            >
              <span>Total TTC</span>
              <span>{fmt(totalTTC)} \u20ac</span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {conditions && (
          <div style={{ marginTop: 20, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 10, color: '#166534', lineHeight: 1.5 }}>
            <strong>Conditions :</strong> {conditions}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ marginTop: 10, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
            <strong>Notes :</strong> {notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 28px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>
        {entreprise.nom} \u2022 {entreprise.adresse} \u2022 TVA {entreprise.tva}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quote Builder Modal                                                */
/* ------------------------------------------------------------------ */

function DevisModal({ onClose }: { onClose: () => void }) {
  const [client, setClient] = useState<ClientInfo>({ nom: '', adresse: '', email: '' })
  const [articles, setArticles] = useState<LigneArticle[]>([
    { id: 1, description: '', quantite: 1, prixHT: 0, tauxTVA: 17 },
  ])
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState('Devis valable 30 jours. Paiement \u00e0 la commande. TVA luxembourgeoise applicable.')
  const [selectedDesign, setSelectedDesign] = useState('moderne')
  const [date] = useState(() => new Date().toISOString().slice(0, 10))
  const [validite, setValidite] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [entreprise, setEntreprise] = useState({ ...ENTREPRISE })
  const [toast, setToast] = useState<string | null>(null)
  const [nextId, setNextId] = useState(2)

  const numero = 'DEV-2026-043'
  const design = DESIGNS.find(d => d.id === selectedDesign) || DESIGNS[1]

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const addArticle = () => {
    setArticles(prev => [...prev, { id: nextId, description: '', quantite: 1, prixHT: 0, tauxTVA: 17 }])
    setNextId(n => n + 1)
  }

  const removeArticle = (id: number) => {
    if (articles.length <= 1) return
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  const updateArticle = (id: number, field: keyof LigneArticle, value: string | number) => {
    setArticles(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const { sousTotal, totalTVA, totalTTC } = useMemo(() => {
    const st = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
    const tv = articles.reduce((s, a) => s + a.quantite * a.prixHT * (a.tauxTVA / 100), 0)
    return { sousTotal: st, totalTVA: tv, totalTTC: st + tv }
  }, [articles])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        }}
      />
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          position: 'fixed',
          inset: 20,
          background: '#f8fafc',
          borderRadius: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 28px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>Nouveau devis</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>{numero}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => showToast('Brouillon enregistr\u00e9 avec succ\u00e8s')} style={{ ...smallBtnStyle, background: '#f1f5f9' }}>
              <Save size={14} /> Enregistrer
            </button>
            <button onClick={() => showToast('Devis envoy\u00e9 par email au client')} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none' }}>
              <Mail size={14} /> Envoyer
            </button>
            <button onClick={() => showToast('T\u00e9l\u00e9chargement du PDF en cours...')} style={{ ...smallBtnStyle, background: '#4338ca', color: '#fff', border: 'none' }}>
              <Download size={14} /> PDF
            </button>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}
            >
              <X size={16} style={{ color: '#64748b' }} />
            </button>
          </div>
        </div>

        {/* Body: form left, preview right */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT -- Form */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Entreprise */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image size={13} style={{ color: '#64748b' }} />
                </div>
                En-t\u00eate entreprise
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input style={inputStyle} value={entreprise.nom} onChange={e => setEntreprise({ ...entreprise, nom: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>T\u00e9l\u00e9phone</label>
                  <input style={inputStyle} value={entreprise.tel} onChange={e => setEntreprise({ ...entreprise, tel: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} value={entreprise.adresse} onChange={e => setEntreprise({ ...entreprise, adresse: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>N\u00b0 TVA</label>
                  <input style={inputStyle} value={entreprise.tva} onChange={e => setEntreprise({ ...entreprise, tva: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Client */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Client</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nom / Soci\u00e9t\u00e9</label>
                  <input style={inputStyle} placeholder="Rechercher ou saisir un nom..." value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} placeholder="Adresse compl\u00e8te" value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} placeholder="email@exemple.lu" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Dates</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date du devis</label>
                  <input style={inputStyle} type="date" value={date} readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Validit\u00e9</label>
                  <input style={inputStyle} type="date" value={validite} onChange={e => setValidite(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Articles */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Articles</h3>
                <button onClick={addArticle} style={{ ...smallBtnStyle, fontSize: 12, padding: '6px 12px' }}>
                  <Plus size={13} /> Ajouter
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {articles.map((art) => (
                  <motion.div
                    key={art.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 70px 100px 90px 32px',
                      gap: 8,
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Description</label>}
                      <input
                        style={inputStyle}
                        placeholder="Description de l'article"
                        value={art.description}
                        onChange={e => updateArticle(art.id, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Qt\u00e9</label>}
                      <input
                        style={{ ...inputStyle, textAlign: 'center' }}
                        type="number"
                        min={1}
                        value={art.quantite}
                        onChange={e => updateArticle(art.id, 'quantite', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Prix HT</label>}
                      <input
                        style={{ ...inputStyle, textAlign: 'right' }}
                        type="number"
                        min={0}
                        step={0.01}
                        value={art.prixHT || ''}
                        onChange={e => updateArticle(art.id, 'prixHT', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>TVA</label>}
                      <select
                        style={{ ...inputStyle, padding: '10px 8px' }}
                        value={art.tauxTVA}
                        onChange={e => updateArticle(art.id, 'tauxTVA', parseInt(e.target.value))}
                      >
                        {TAUX_TVA.map(t => (
                          <option key={t} value={t}>{t}%</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={{ ...labelStyle, visibility: 'hidden' }}>X</label>}
                      <button
                        onClick={() => removeArticle(art.id)}
                        style={{
                          width: 32,
                          height: 40,
                          borderRadius: 8,
                          border: 'none',
                          background: articles.length <= 1 ? '#f1f5f9' : '#fef2f2',
                          cursor: articles.length <= 1 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} style={{ color: articles.length <= 1 ? '#cbd5e1' : '#ef4444' }} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  <span>Sous-total HT</span>
                  <span style={{ fontWeight: 600 }}>{fmt(sousTotal)} \u20ac</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  <span>TVA</span>
                  <span style={{ fontWeight: 600 }}>{fmt(totalTVA)} \u20ac</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1e293b', paddingTop: 8, borderTop: '2px solid #1e293b' }}>
                  <span>Total TTC</span>
                  <span>{fmt(totalTTC)} \u20ac</span>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Conditions</h3>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Conditions g\u00e9n\u00e9rales, modalit\u00e9s de paiement..."
                value={conditions}
                onChange={e => setConditions(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Notes</h3>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Remarques suppl\u00e9mentaires..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Designs */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Design</h3>
                <button
                  onClick={() => showToast('Importation de designs personnalis\u00e9s bient\u00f4t disponible')}
                  style={{ ...smallBtnStyle, fontSize: 12, padding: '6px 12px' }}
                >
                  <Upload size={13} /> Importer un design
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DESIGNS.map(d => (
                  <motion.button
                    key={d.id}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDesign(d.id)}
                    style={{
                      width: 100,
                      padding: 0,
                      borderRadius: 12,
                      border: selectedDesign === d.id ? `2px solid ${d.accentColor}` : '2px solid #e2e8f0',
                      background: '#ffffff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: selectedDesign === d.id ? `0 0 0 2px ${d.accentColor}30` : 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <div style={{ height: 48, background: d.headerBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Eye size={16} style={{ color: d.headerColor, opacity: 0.6 }} />
                    </div>
                    <div style={{ padding: '8px 6px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{d.nom}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>{d.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT -- Preview */}
          <div
            style={{
              width: 520,
              minWidth: 420,
              background: '#eef1f6',
              borderLeft: '1px solid #e2e8f0',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '28px 20px',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Aper\u00e7u en direct</div>
            <QuotePreview
              design={design}
              entreprise={entreprise}
              client={client}
              articles={articles}
              date={date}
              validite={validite}
              notes={notes}
              conditions={conditions}
              numero={numero}
            />
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DevisPage() {
  const [filter, setFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const enCours = mockDevis.filter(d => d.statut === 'SENT').length
  const acceptes = mockDevis.filter(d => d.statut === 'ACCEPTED').length
  const montantTotal = mockDevis.reduce((s, d) => s + d.montant, 0)

  const filtered = filter ? mockDevis.filter(d => d.statut === filter) : mockDevis

  const stats = [
    { label: 'En cours', value: String(enCours), icon: Clock, color: '#3b82f6' },
    { label: 'Accept\u00e9s', value: String(acceptes), icon: CheckCircle2, color: '#10b981' },
    { label: 'Montant total', value: `${montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac`, icon: Euro, color: '#8b5cf6' },
  ]

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Devis</h1>
            <p style={{ fontSize: 14, color: '#475569' }}>Gestion et suivi des devis clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#065F46',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={16} />
            Nouveau devis
          </button>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
          {stats.map(stat => (
            <div key={stat.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: 'none',
              background: filter === null ? '#1e293b' : 'rgba(255,255,255,0.03)',
              color: filter === null ? '#fff' : '#64748b',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tous
          </button>
          {Object.entries(statutConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                background: filter === key ? cfg.color : 'rgba(255,255,255,0.03)',
                color: filter === key ? '#fff' : '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {cfg.label}
            </button>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Num\u00e9ro', 'Client', 'Date', 'Validit\u00e9', 'Montant', 'Statut'].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(devis => {
                const config = statutConfig[devis.statut]
                return (
                  <tr key={devis.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: '#475569' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{devis.numero}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#475569' }}>{devis.client}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(devis.date)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{formatDate(devis.validite)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                      {devis.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} \u20ac
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: config.color,
                          background: `${config.color}15`,
                        }}
                      >
                        {config.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showModal && <DevisModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  )
}
