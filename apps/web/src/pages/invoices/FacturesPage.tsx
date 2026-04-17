import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Send, Clock, CheckCircle2, AlertTriangle, Plus,
  X, Trash2, Upload, Download, Mail, Save, Eye, Image,
  Repeat, QrCode, CreditCard, Link2, Scissors, FileMinus,
  Bell, Zap, Settings, Users, Hash, Percent, ShieldCheck,
  Search, Filter, MoreVertical, CheckSquare, Square
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Facture {
  id: number
  numero: string
  client: string
  clientType: 'B2B' | 'B2C'
  date: string
  echeance: string
  montant: number
  montantPaye: number
  statut: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE'
  recurring: boolean
  peppol: boolean
  proofUploaded: boolean
  lateFees?: number
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

interface InvoiceDesign {
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

const mockFactures: Facture[] = [
  { id: 1, numero: 'F-2026-0089', client: 'Restaurant Le Pavillon', clientType: 'B2B', date: '2026-04-10', echeance: '2026-05-10', montant: 2450.00, montantPaye: 2450.00, statut: 'PAID', recurring: true, peppol: true, proofUploaded: true },
  { id: 2, numero: 'F-2026-0088', client: 'Brasserie Mansfeld', clientType: 'B2B', date: '2026-04-08', echeance: '2026-05-08', montant: 1280.00, montantPaye: 0, statut: 'SENT', recurring: false, peppol: true, proofUploaded: false },
  { id: 3, numero: 'F-2026-0087', client: 'Caf\é des Artistes', clientType: 'B2C', date: '2026-04-05', echeance: '2026-05-05', montant: 890.00, montantPaye: 0, statut: 'DRAFT', recurring: false, peppol: false, proofUploaded: false },
  { id: 4, numero: 'F-2026-0086', client: 'Hotel Parc Belair', clientType: 'B2B', date: '2026-03-28', echeance: '2026-04-28', montant: 3200.00, montantPaye: 1600.00, statut: 'PARTIAL', recurring: true, peppol: true, proofUploaded: true },
  { id: 5, numero: 'F-2026-0085', client: 'Trattoria Roma', clientType: 'B2B', date: '2026-03-15', echeance: '2026-04-15', montant: 630.00, montantPaye: 0, statut: 'OVERDUE', recurring: false, peppol: false, proofUploaded: false, lateFees: 12.60 },
  { id: 6, numero: 'F-2026-0084', client: 'Wine Bar Clausen', clientType: 'B2C', date: '2026-03-10', echeance: '2026-04-10', montant: 1750.00, montantPaye: 1750.00, statut: 'PAID', recurring: false, peppol: false, proofUploaded: true },
  { id: 7, numero: 'F-2026-0083', client: 'Bistro Kirchberg', clientType: 'B2B', date: '2026-03-05', echeance: '2026-04-05', montant: 980.00, montantPaye: 0, statut: 'OVERDUE', recurring: false, peppol: true, proofUploaded: false, lateFees: 19.60 },
  { id: 8, numero: 'F-2026-0082', client: 'La Table du Chef', clientType: 'B2B', date: '2026-03-01', echeance: '2026-03-31', montant: 1540.00, montantPaye: 1540.00, statut: 'PAID', recurring: true, peppol: true, proofUploaded: true },
]

const statutConfig: Record<string, { label: string; color: string }> = {
  DRAFT:   { label: 'Brouillon', color: '#475569' },
  SENT:    { label: 'Envoy\ée', color: '#3b82f6' },
  PAID:    { label: 'Pay\ée', color: '#10b981' },
  PARTIAL: { label: 'Partiel', color: '#f59e0b' },
  OVERDUE: { label: 'En retard', color: '#ef4444' },
}

const TAUX_TVA = [3, 8, 14, 17]

const DESIGNS: InvoiceDesign[] = [
  { id: 'classique', nom: 'Classique', headerBg: '#ffffff', headerColor: '#1e293b', accentColor: '#1e293b', fontFamily: 'system-ui, sans-serif', borderStyle: '2px solid #1e293b', description: 'Noir et blanc, lignes nettes' },
  { id: 'moderne',   nom: 'Moderne',   headerBg: '#4338ca', headerColor: '#ffffff', accentColor: '#4338ca', fontFamily: 'system-ui, sans-serif', borderStyle: 'none', description: 'Accent indigo, contemporain' },
  { id: 'elegant',   nom: '\Él\égant', headerBg: '#1a1a2e', headerColor: '#d4af37', accentColor: '#d4af37', fontFamily: 'Georgia, serif', borderStyle: '1px solid #d4af37', description: 'Serif, accents dor\és' },
  { id: 'compact',   nom: 'Compact',   headerBg: '#f8fafc', headerColor: '#334155', accentColor: '#64748b', fontFamily: 'system-ui, sans-serif', borderStyle: '1px solid #e2e8f0', description: 'Minimal, dense, efficace' },
  { id: 'luxembourg', nom: 'Luxembourg', headerBg: '#00A1DE', headerColor: '#ffffff', accentColor: '#EF4135', fontFamily: 'system-ui, sans-serif', borderStyle: '3px solid #00A1DE', description: 'Couleurs du Luxembourg' },
]

const ENTREPRISE = {
  nom: 'Caf\é um Rond-Point',
  adresse: '12 Rue du Rond-Point, L-3750 Rumelange',
  tel: '+352 26 56 12 34',
  tva: 'LU12345678',
  iban: 'LU28 0019 4006 4475 0000',
  bic: 'BCEELULL',
}

// Luxembourg legal late payment interest rate (approx 2026)
const LUX_LATE_RATE = 0.08

const NUMBERING_FORMATS = [
  { id: 'std',   label: 'F-YYYY-NNNN',   example: 'F-2026-0089' },
  { id: 'month', label: 'F-YYYYMM-NNN',  example: 'F-202604-089' },
  { id: 'short', label: 'FA-NNNN',       example: 'FA-0089' },
  { id: 'custom', label: 'Personnalis\é', example: 'INV/2026/089' },
]

const chartRevenue = [
  { mois: 'Nov', ca: 12400 },
  { mois: 'D\éc', ca: 15200 },
  { mois: 'Jan', ca: 13800 },
  { mois: 'F\év', ca: 14500 },
  { mois: 'Mar', ca: 16300 },
  { mois: 'Avr', ca: 18120 },
]

const chartPie = [
  { name: 'Pay\ées', value: 12720, color: '#10b981' },
  { name: 'En attente', value: 4480,  color: '#3b82f6' },
  { name: 'En retard',  value: 1610,  color: '#ef4444' },
  { name: 'Partiel',    value: 1600,  color: '#f59e0b' },
]

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
  hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, transition: { duration: 0.15 } },
}
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }, exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.15 } },
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
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b',
  background: '#ffffff', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#475569',
  marginBottom: 6, display: 'block',
  textTransform: 'uppercase', letterSpacing: 0.5,
}
const smallBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 10,
  border: '1px solid #e2e8f0', background: '#ffffff',
  color: '#1e293b', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', gap: 6,
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
        position: 'fixed', bottom: 32, right: 32,
        background: '#1e293b', color: '#ffffff',
        padding: '14px 24px', borderRadius: 14,
        fontSize: 14, fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        zIndex: 10001, display: 'flex',
        alignItems: 'center', gap: 12,
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
/*  QR Code placeholder (SEPA)                                         */
/* ------------------------------------------------------------------ */

function SepaQR({ size = 70, color = '#1e293b' }: { size?: number; color?: string }) {
  // Simple deterministic QR-like grid
  const cells = 13
  const s = size / cells
  const pattern: number[][] = []
  for (let r = 0; r < cells; r++) {
    const row: number[] = []
    for (let c = 0; c < cells; c++) {
      row.push(((r * 31 + c * 17 + r * c) % 3 === 0) ? 1 : 0)
    }
    pattern.push(row)
  }
  return (
    <svg width={size} height={size} style={{ background: '#fff', borderRadius: 4 }}>
      {pattern.map((row, r) =>
        row.map((v, c) =>
          v === 1 ? <rect key={`${r}-${c}`} x={c * s} y={r * s} width={s} height={s} fill={color} /> : null
        )
      )}
      {/* Corner markers */}
      {[[0, 0], [cells - 3, 0], [0, cells - 3]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x * s} y={y * s} width={s * 3} height={s * 3} fill="none" stroke={color} strokeWidth={s * 0.6} />
        </g>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Invoice Preview                                                    */
/* ------------------------------------------------------------------ */

function InvoicePreview({
  design, entreprise, client, articles, date, echeance, notes, numero, showQR, peppol,
}: {
  design: InvoiceDesign
  entreprise: typeof ENTREPRISE
  client: ClientInfo
  articles: LigneArticle[]
  date: string
  echeance: string
  notes: string
  numero: string
  showQR: boolean
  peppol: boolean
}) {
  const sousTotal = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
  const tvaParTaux: Record<number, number> = {}
  articles.forEach(a => {
    const montantTVA = a.quantite * a.prixHT * (a.tauxTVA / 100)
    tvaParTaux[a.tauxTVA] = (tvaParTaux[a.tauxTVA] || 0) + montantTVA
  })
  const totalTVA = Object.values(tvaParTaux).reduce((s, v) => s + v, 0)
  const totalTTC = sousTotal + totalTVA

  const isLuxembourg = design.id === 'luxembourg'

  return (
    <div
      style={{
        width: '100%', maxWidth: 500, minHeight: 720,
        background: '#ffffff', borderRadius: 8, overflow: 'hidden',
        fontFamily: design.fontFamily, fontSize: 11, color: '#1e293b',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        border: design.id === 'classique' ? design.borderStyle : '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <div style={{
        background: design.headerBg, color: design.headerColor,
        padding: '24px 28px',
        borderBottom: design.id === 'compact' ? '1px solid #e2e8f0' : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
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
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: design.id === 'classique' ? '#f1f5f9' : design.id === 'elegant' ? '#d4af3730' : design.id === 'compact' ? '#f1f5f9' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
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
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: design.id === 'elegant' ? 2 : 0 }}>FACTURE</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{numero}</div>
            {peppol && (
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, background: design.id === 'moderne' || isLuxembourg ? 'rgba(255,255,255,0.2)' : '#e0f2fe', color: design.id === 'moderne' || isLuxembourg ? '#fff' : '#0369a1', fontSize: 9, fontWeight: 700 }}>
                <ShieldCheck size={9} /> PEPPOL
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Facturer \à</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{client.nom || 'Client'}</div>
            {client.adresse && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{client.adresse}</div>}
            {client.email && <div style={{ fontSize: 10, color: '#64748b' }}>{client.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>Date: <strong>{date || '\—'}</strong></div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>\Éch\éance: <strong>{echeance || '\—'}</strong></div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${design.accentColor}` }}>
              {['Description', 'Qt\é', 'Prix HT', 'TVA', 'Total HT'].map(h => (
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
                  Aucun article ajout\é
                </td>
              </tr>
            )}
            {articles.map((a, i) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                <td style={{ padding: '8px 6px', fontSize: 11 }}>{a.description || 'Article'}</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{a.quantite}</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{fmt(a.prixHT)} \€</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right' }}>{a.tauxTVA}%</td>
                <td style={{ padding: '8px 6px', fontSize: 11, textAlign: 'right', fontWeight: 600 }}>{fmt(a.quantite * a.prixHT)} \€</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          {showQR && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'flex', gap: 10, alignItems: 'center', maxWidth: 230 }}>
              <SepaQR size={70} color={design.accentColor} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: design.accentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>Virement SEPA Instant</div>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>Scanner pour payer<br />{entreprise.iban}</div>
              </div>
            </div>
          )}
          <div style={{ width: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, color: '#64748b' }}>
              <span>Sous-total HT</span>
              <span style={{ fontWeight: 600 }}>{fmt(sousTotal)} \€</span>
            </div>
            {Object.entries(tvaParTaux).map(([taux, montant]) => (
              <div key={taux} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10, color: '#94a3b8' }}>
                <span>TVA {taux}%</span>
                <span>{fmt(montant)} \€</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0 4px', fontSize: 14, fontWeight: 800,
              color: design.accentColor, borderTop: `2px solid ${design.accentColor}`,
              marginTop: 6,
            }}>
              <span>Total TTC</span>
              <span>{fmt(totalTTC)} \€</span>
            </div>
          </div>
        </div>

        {notes && (
          <div style={{ marginTop: 20, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
            <strong>Notes :</strong> {notes}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 28px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 9, color: '#94a3b8' }}>
        {entreprise.nom} \• {entreprise.adresse} \• TVA {entreprise.tva}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Invoice Builder Modal                                              */
/* ------------------------------------------------------------------ */

function InvoiceModal({ onClose }: { onClose: () => void }) {
  const [client, setClient] = useState<ClientInfo>({ nom: '', adresse: '', email: '' })
  const [articles, setArticles] = useState<LigneArticle[]>([
    { id: 1, description: '', quantite: 1, prixHT: 0, tauxTVA: 17 },
  ])
  const [notes, setNotes] = useState('')
  const [selectedDesign, setSelectedDesign] = useState('moderne')
  const [date] = useState(() => new Date().toISOString().slice(0, 10))
  const [echeance, setEcheance] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
  })
  const [entreprise, setEntreprise] = useState({ ...ENTREPRISE })
  const [toast, setToast] = useState<string | null>(null)
  const [nextId, setNextId] = useState(2)
  const [peppolEnabled, setPeppolEnabled] = useState(true)
  const [showQR, setShowQR] = useState(true)
  const [recurring, setRecurring] = useState(false)
  const [recurrenceFreq, setRecurrenceFreq] = useState('monthly')
  const [numberingFormat, setNumberingFormat] = useState('std')

  const numero = useMemo(() => {
    const y = new Date().getFullYear()
    const m = String(new Date().getMonth() + 1).padStart(2, '0')
    const n = '0090'
    switch (numberingFormat) {
      case 'month': return `F-${y}${m}-${n.slice(1)}`
      case 'short': return `FA-${n}`
      case 'custom': return `INV/${y}/${n.slice(1)}`
      default: return `F-${y}-${n}`
    }
  }, [numberingFormat])

  const design = DESIGNS.find(d => d.id === selectedDesign) || DESIGNS[1]
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
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

  const { sousTotal, totalTVA, totalTTC } = useMemo(() => {
    const st = articles.reduce((s, a) => s + a.quantite * a.prixHT, 0)
    const tv = articles.reduce((s, a) => s + a.quantite * a.prixHT * (a.tauxTVA / 100), 0)
    return { sousTotal: st, totalTVA: tv, totalTTC: st + tv }
  }, [articles])

  return (
    <>
      <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }} />
      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        style={{
          position: 'fixed', inset: 20, background: '#f8fafc', borderRadius: 24,
          zIndex: 10000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 28px', borderBottom: '1px solid #e2e8f0', background: '#ffffff',
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>Nouvelle facture</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
              {numero} {peppolEnabled && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700 }}>PEPPOL</span>}
              {recurring && <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 8, background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 700 }}>R\écurrente</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => showToast('Brouillon enregistr\é')} style={{ ...smallBtnStyle, background: '#f1f5f9' }}>
              <Save size={14} /> Enregistrer
            </button>
            <button onClick={() => showToast('Email envoy\é au client')} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none' }}>
              <Mail size={14} /> Envoyer
            </button>
            <button onClick={() => showToast('T\él\échargement du PDF...')} style={{ ...smallBtnStyle, background: '#4338ca', color: '#fff', border: 'none' }}>
              <Download size={14} /> PDF
            </button>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <X size={16} style={{ color: '#64748b' }} />
            </button>
          </div>
        </div>

        {/* Body: form left, preview right */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* E-invoicing & numbering */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={14} style={{ color: '#0369a1' }} /> Facturation \électronique & num\érotation
              </h3>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: peppolEnabled ? '#e0f2fe' : '#f8fafc',
                border: `1px solid ${peppolEnabled ? '#7dd3fc' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Activer facturation \électronique (Peppol)</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Conforme Luxembourg - obligatoire B2G</div>
                </div>
                <input type="checkbox" checked={peppolEnabled} onChange={e => setPeppolEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              </label>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Format de num\érotation</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {NUMBERING_FORMATS.map(f => (
                    <button key={f.id}
                      onClick={() => setNumberingFormat(f.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                        border: numberingFormat === f.id ? '2px solid #4338ca' : '1px solid #e2e8f0',
                        background: numberingFormat === f.id ? '#eef2ff' : '#ffffff',
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{f.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Ex: {f.example}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: recurring ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${recurring ? '#86efac' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', marginTop: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Repeat size={16} style={{ color: recurring ? '#15803d' : '#94a3b8' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Facturation r\écurrente</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Pour contrats B2B mensuels</div>
                  </div>
                </div>
                <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} style={{ width: 18, height: 18 }} />
              </label>
              {recurring && (
                <select value={recurrenceFreq} onChange={e => setRecurrenceFreq(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="yearly">Annuelle</option>
                </select>
              )}

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: showQR ? '#fef3c7' : '#f8fafc',
                border: `1px solid ${showQR ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', marginTop: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <QrCode size={16} style={{ color: showQR ? '#b45309' : '#94a3b8' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>QR code SEPA Instant</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Affich\é sur la facture PDF</div>
                  </div>
                </div>
                <input type="checkbox" checked={showQR} onChange={e => setShowQR(e.target.checked)} style={{ width: 18, height: 18 }} />
              </label>
            </div>

            {/* Entreprise */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>En-t\ête entreprise</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={entreprise.nom} onChange={e => setEntreprise({ ...entreprise, nom: e.target.value })} /></div>
                <div><label style={labelStyle}>T\él\éphone</label><input style={inputStyle} value={entreprise.tel} onChange={e => setEntreprise({ ...entreprise, tel: e.target.value })} /></div>
                <div><label style={labelStyle}>Adresse</label><input style={inputStyle} value={entreprise.adresse} onChange={e => setEntreprise({ ...entreprise, adresse: e.target.value })} /></div>
                <div><label style={labelStyle}>N\° TVA</label><input style={inputStyle} value={entreprise.tva} onChange={e => setEntreprise({ ...entreprise, tva: e.target.value })} /></div>
                <div><label style={labelStyle}>IBAN</label><input style={inputStyle} value={entreprise.iban} onChange={e => setEntreprise({ ...entreprise, iban: e.target.value })} /></div>
                <div><label style={labelStyle}>BIC</label><input style={inputStyle} value={entreprise.bic} onChange={e => setEntreprise({ ...entreprise, bic: e.target.value })} /></div>
              </div>
            </div>

            {/* Client */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Client</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nom / Soci\ét\é</label>
                  <input style={inputStyle} placeholder="Rechercher ou saisir..." value={client.nom} onChange={e => setClient({ ...client, nom: e.target.value })} />
                </div>
                <div><label style={labelStyle}>Adresse</label><input style={inputStyle} value={client.adresse} onChange={e => setClient({ ...client, adresse: e.target.value })} /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} /></div>
              </div>
            </div>

            {/* Dates */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Dates</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Date de facture</label><input style={inputStyle} type="date" value={date} readOnly /></div>
                <div><label style={labelStyle}>\Éch\éance</label><input style={inputStyle} type="date" value={echeance} onChange={e => setEcheance(e.target.value)} /></div>
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
                  <motion.div key={art.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 70px 100px 90px 32px', gap: 8, alignItems: 'end' }}>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Description</label>}
                      <input style={inputStyle} placeholder="Article" value={art.description} onChange={e => updateArticle(art.id, 'description', e.target.value)} />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Qt\é</label>}
                      <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min={1} value={art.quantite} onChange={e => updateArticle(art.id, 'quantite', Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>Prix HT</label>}
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" min={0} step={0.01} value={art.prixHT || ''} onChange={e => updateArticle(art.id, 'prixHT', parseFloat(e.target.value) || 0)} placeholder="0,00" />
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={labelStyle}>TVA</label>}
                      <select style={{ ...inputStyle, padding: '10px 8px' }} value={art.tauxTVA} onChange={e => updateArticle(art.id, 'tauxTVA', parseInt(e.target.value))}>
                        {TAUX_TVA.map(t => <option key={t} value={t}>{t}%</option>)}
                      </select>
                    </div>
                    <div>
                      {art.id === articles[0]?.id && <label style={{ ...labelStyle, visibility: 'hidden' }}>X</label>}
                      <button onClick={() => removeArticle(art.id)}
                        style={{ width: 32, height: 40, borderRadius: 8, border: 'none', background: articles.length <= 1 ? '#f1f5f9' : '#fef2f2', cursor: articles.length <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} style={{ color: articles.length <= 1 ? '#cbd5e1' : '#ef4444' }} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  <span>Sous-total HT</span><span style={{ fontWeight: 600 }}>{fmt(sousTotal)} \€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  <span>TVA</span><span style={{ fontWeight: 600 }}>{fmt(totalTVA)} \€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1e293b', paddingTop: 8, borderTop: '2px solid #1e293b' }}>
                  <span>Total TTC</span><span>{fmt(totalTTC)} \€</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>Notes</h3>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Conditions..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {/* Designs */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Design</h3>
                <button onClick={() => showToast('Import de design bient\ôt disponible')} style={{ ...smallBtnStyle, fontSize: 12, padding: '6px 12px' }}>
                  <Upload size={13} /> Importer
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DESIGNS.map(d => (
                  <motion.button key={d.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDesign(d.id)}
                    style={{
                      width: 100, padding: 0, borderRadius: 12,
                      border: selectedDesign === d.id ? `2px solid ${d.accentColor}` : '2px solid #e2e8f0',
                      background: '#ffffff', cursor: 'pointer', overflow: 'hidden',
                      boxShadow: selectedDesign === d.id ? `0 0 0 2px ${d.accentColor}30` : 'none',
                    }}>
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

          {/* RIGHT — Preview */}
          <div style={{
            width: 520, minWidth: 420, background: '#eef1f6',
            borderLeft: '1px solid #e2e8f0', overflow: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '28px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Aper\çu en direct</div>
            <InvoicePreview
              design={design} entreprise={entreprise} client={client}
              articles={articles} date={date} echeance={echeance}
              notes={notes} numero={numero} showQR={showQR} peppol={peppolEnabled}
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
/*  Action row modal (split / credit / proof / portal)                */
/* ------------------------------------------------------------------ */

function ActionModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }} />
      <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: '#fff', borderRadius: 20, padding: 24, width: 520, maxWidth: '90vw',
          zIndex: 10000, boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FacturesPage() {
  const [filter, setFilter] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<null | 'split' | 'credit' | 'proof' | 'portal' | 'reminder'>(null)
  const [actionInvoice, setActionInvoice] = useState<Facture | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const aEnvoyer = mockFactures.filter(f => f.statut === 'DRAFT').length
  const enAttente = mockFactures.filter(f => f.statut === 'SENT').length
  const payees = mockFactures.filter(f => f.statut === 'PAID').length
  const overdues = mockFactures.filter(f => f.statut === 'OVERDUE')
  const totalCA = mockFactures.filter(f => f.statut === 'PAID').reduce((s, f) => s + f.montant, 0)
  const totalLateFees = overdues.reduce((s, f) => s + (f.lateFees || 0), 0)

  const filtered = useMemo(() => {
    let list = mockFactures
    if (filter) list = list.filter(f => f.statut === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => f.numero.toLowerCase().includes(q) || f.client.toLowerCase().includes(q))
    }
    return list
  }, [filter, search])

  const stats = [
    { label: 'Brouillons', value: String(aEnvoyer), icon: Send, color: '#475569' },
    { label: 'En attente', value: String(enAttente), icon: Clock, color: '#3b82f6' },
    { label: 'Pay\ées', value: String(payees), icon: CheckCircle2, color: '#10b981' },
    { label: 'CA encaiss\é', value: `${fmt(totalCA)} \€`, icon: CreditCard, color: '#4338ca' },
  ]

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([])
    else setSelected(filtered.map(f => f.id))
  }

  const handleBatchEmail = () => {
    if (selected.length === 0) { showToast('Aucune facture s\électionn\ée'); return }
    showToast(`${selected.length} facture(s) envoy\ée(s) par email`)
    setSelected([])
  }
  const handleBatchPDF = () => {
    if (selected.length === 0) { showToast('Aucune facture s\électionn\ée'); return }
    showToast(`Export PDF de ${selected.length} facture(s) lanc\é`)
    setSelected([])
  }
  const handleBankWebhook = () => {
    showToast('Webhook bancaire simul\é : 2 factures marqu\ées pay\ées')
  }

  const openAction = (kind: 'split' | 'credit' | 'proof' | 'portal' | 'reminder', inv: Facture) => {
    setActionInvoice(inv); setActionModal(kind)
  }

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Factures</h1>
            <p style={{ fontSize: 14, color: '#475569' }}>Gestion, suivi & facturation \électronique Luxembourg</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleBankWebhook}
              style={{ ...smallBtnStyle, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <Zap size={14} style={{ color: '#f59e0b' }} /> Synchro banque
            </button>
            <button onClick={() => setShowModal(true)}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none',
                background: '#065F46', color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}>
              <Plus size={16} /> Nouvelle facture
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {stats.map(stat => (
            <div key={stat.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Charts */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>\Évolution du CA (6 mois)</h3>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>+11,2%</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" stroke="#94a3b8" style={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="ca" stroke="#4338ca" strokeWidth={2.5} dot={{ r: 4, fill: '#4338ca' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...cardStyle }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>R\épartition par statut</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                  {chartPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {chartPie.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                  <span style={{ width: 10, height: 10, background: p.color, borderRadius: 3 }} />{p.name}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Overdue banner */}
        {overdues.length > 0 && (
          <motion.div variants={itemVariants}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16,
              padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 16,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#7f1d1d' }}>
                  {overdues.length} facture(s) en retard \— {fmt(overdues.reduce((s, f) => s + f.montant, 0))} \€
                </div>
                <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>
                  Int\ér\êts l\égaux cumul\és (taux LU {(LUX_LATE_RATE * 100).toFixed(1)}%) : {fmt(totalLateFees)} \€
                </div>
              </div>
            </div>
            <button onClick={() => showToast('Relances automatiques envoy\ées')} style={{ ...smallBtnStyle, background: '#dc2626', color: '#fff', border: 'none', padding: '10px 18px' }}>
              <Bell size={14} /> Envoyer relances
            </button>
          </motion.div>
        )}

        {/* Search + Filters */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher num\éro ou client..."
              style={{ ...inputStyle, padding: '10px 14px 10px 36px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setFilter(null)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                background: filter === null ? '#1e293b' : '#fff',
                color: filter === null ? '#fff' : '#64748b',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              Toutes
            </button>
            {Object.entries(statutConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: filter === key ? cfg.color : '#fff',
                  color: filter === key ? '#fff' : '#64748b',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Batch actions */}
        {selected.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12,
              padding: 12, marginBottom: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca' }}>
              {selected.length} facture(s) s\électionn\ée(s)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleBatchEmail} style={{ ...smallBtnStyle, background: '#4338ca', color: '#fff', border: 'none' }}>
                <Mail size={13} /> Envoyer par email
              </button>
              <button onClick={handleBatchPDF} style={smallBtnStyle}>
                <Download size={13} /> Export PDF
              </button>
              <button onClick={() => setSelected([])} style={smallBtnStyle}>
                <X size={13} /> Annuler
              </button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <motion.div variants={itemVariants} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', width: 40 }}>
                  <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {selected.length === filtered.length && filtered.length > 0
                      ? <CheckSquare size={16} style={{ color: '#4338ca' }} />
                      : <Square size={16} style={{ color: '#cbd5e1' }} />}
                  </button>
                </th>
                {['Num\éro', 'Client', 'Date', '\Éch\éance', 'Montant', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600,
                    color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5,
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(facture => {
                const config = statutConfig[facture.statut]
                const isSel = selected.includes(facture.id)
                return (
                  <tr key={facture.id} style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: isSel ? '#eef2ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleSelect(facture.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {isSel
                          ? <CheckSquare size={16} style={{ color: '#4338ca' }} />
                          : <Square size={16} style={{ color: '#cbd5e1' }} />}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: '#475569' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{facture.numero}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                            {facture.peppol && <span style={{ padding: '1px 6px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700 }}>PEPPOL</span>}
                            {facture.recurring && <span style={{ padding: '1px 6px', borderRadius: 6, background: '#f0fdf4', color: '#15803d', fontSize: 9, fontWeight: 700 }}>R\ÉCURRENT</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                      {facture.client}
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{facture.clientType}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{formatDate(facture.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {facture.statut === 'OVERDUE' && <AlertTriangle size={13} style={{ color: '#ef4444' }} />}
                        {formatDate(facture.echeance)}
                      </div>
                      {facture.lateFees && (
                        <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
                          + {fmt(facture.lateFees)} \€ int\ér\êts
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      {fmt(facture.montant)} \€
                      {facture.statut === 'PARTIAL' && (
                        <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2, fontWeight: 600 }}>
                          Pay\é : {fmt(facture.montantPaye)} \€
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 8,
                        fontSize: 11, fontWeight: 700, color: config.color, background: `${config.color}15`,
                      }}>
                        {config.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openAction('reminder', facture)} title="Cr\éer relance"
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bell size={12} style={{ color: '#b45309' }} />
                        </button>
                        <button onClick={() => openAction('proof', facture)} title="Preuve paiement"
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#e0f2fe', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Upload size={12} style={{ color: '#0369a1' }} />
                        </button>
                        <button onClick={() => openAction('split', facture)} title="Scinder facture"
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Scissors size={12} style={{ color: '#dc2626' }} />
                        </button>
                        <button onClick={() => openAction('credit', facture)} title="Cr\éer avoir"
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#f3e8ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileMinus size={12} style={{ color: '#7c3aed' }} />
                        </button>
                        <button onClick={() => openAction('portal', facture)} title="Portail client"
                          style={{ width: 28, height: 28, borderRadius: 6, background: '#f0fdf4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Link2 size={12} style={{ color: '#15803d' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showModal && <InvoiceModal onClose={() => setShowModal(false)} />}
        {actionModal === 'split' && actionInvoice && (
          <ActionModal title={`Scinder ${actionInvoice.numero}`} onClose={() => setActionModal(null)}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Le client a pay\é partiellement. Cr\éer une seconde facture pour le solde restant.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Montant total</span>
                <strong>{fmt(actionInvoice.montant)} \€</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>D\éj\à pay\é</span>
                <strong style={{ color: '#10b981' }}>{fmt(actionInvoice.montantPaye)} \€</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700 }}>Nouvelle facture</span>
                <strong style={{ color: '#dc2626' }}>{fmt(actionInvoice.montant - actionInvoice.montantPaye)} \€</strong>
              </div>
            </div>
            <button onClick={() => { showToast('Facture compl\émentaire cr\é\ée'); setActionModal(null) }}
              style={{ ...smallBtnStyle, width: '100%', padding: '12px 16px', background: '#dc2626', color: '#fff', border: 'none', justifyContent: 'center' }}>
              <Scissors size={14} /> Cr\éer facture de solde
            </button>
          </ActionModal>
        )}
        {actionModal === 'credit' && actionInvoice && (
          <ActionModal title={`Avoir pour ${actionInvoice.numero}`} onClose={() => setActionModal(null)}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Cr\éer une note de cr\édit li\ée \à cette facture.
            </p>
            <label style={labelStyle}>Motif</label>
            <select style={{ ...inputStyle, marginBottom: 12 }}>
              <option>Remboursement commercial</option>
              <option>Erreur de facturation</option>
              <option>Retour produit</option>
              <option>Geste commercial</option>
            </select>
            <label style={labelStyle}>Montant de l'avoir</label>
            <input type="number" style={{ ...inputStyle, marginBottom: 16 }} defaultValue={actionInvoice.montant} />
            <button onClick={() => { showToast('Avoir cr\é\é et li\é \à la facture'); setActionModal(null) }}
              style={{ ...smallBtnStyle, width: '100%', padding: '12px 16px', background: '#7c3aed', color: '#fff', border: 'none', justifyContent: 'center' }}>
              <FileMinus size={14} /> Cr\éer l'avoir
            </button>
          </ActionModal>
        )}
        {actionModal === 'proof' && actionInvoice && (
          <ActionModal title={`Preuve de paiement - ${actionInvoice.numero}`} onClose={() => setActionModal(null)}>
            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: 12, padding: 32,
              textAlign: 'center', cursor: 'pointer', marginBottom: 16,
            }}>
              <Upload size={32} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                D\époser un fichier
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                PDF, PNG, JPG - max 10 Mo
              </div>
            </div>
            {actionInvoice.proofUploaded && (
              <div style={{
                padding: 12, background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: 10, fontSize: 13, color: '#15803d', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <CheckCircle2 size={14} /> Preuve d\éj\à t\él\évers\ée : recu_virement.pdf
              </div>
            )}
            <button onClick={() => { showToast('Preuve enregistr\ée'); setActionModal(null) }}
              style={{ ...smallBtnStyle, width: '100%', padding: '12px 16px', background: '#0369a1', color: '#fff', border: 'none', justifyContent: 'center' }}>
              <Upload size={14} /> T\él\éverser
            </button>
          </ActionModal>
        )}
        {actionModal === 'portal' && actionInvoice && (
          <ActionModal title="Acc\ès portail client" onClose={() => setActionModal(null)}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Envoyer un lien s\écuris\é au client pour consulter ses factures, t\él\écharger les PDF et payer en ligne.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              https://portal.creorga.lu/c/{actionInvoice.id}/k/9f2a8b1c...
            </div>
            <label style={labelStyle}>Mode d'envoi</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button style={{ ...smallBtnStyle, flex: 1, padding: '10px', justifyContent: 'center' }}>
                <Mail size={13} /> Email
              </button>
              <button style={{ ...smallBtnStyle, flex: 1, padding: '10px', justifyContent: 'center' }}>
                <Send size={13} /> SMS
              </button>
            </div>
            <button onClick={() => { showToast('Lien envoy\é au client'); setActionModal(null) }}
              style={{ ...smallBtnStyle, width: '100%', padding: '12px 16px', background: '#15803d', color: '#fff', border: 'none', justifyContent: 'center' }}>
              <Link2 size={14} /> Envoyer l'acc\ès
            </button>
          </ActionModal>
        )}
        {actionModal === 'reminder' && actionInvoice && (
          <ActionModal title={`Relance - ${actionInvoice.numero}`} onClose={() => setActionModal(null)}>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Cr\éer une relance li\ée \à cette facture.
            </p>
            <label style={labelStyle}>Niveau de relance</label>
            <select style={{ ...inputStyle, marginBottom: 12 }}>
              <option>1\ère relance - amicale</option>
              <option>2\ème relance - ferme</option>
              <option>Mise en demeure</option>
            </select>
            <label style={labelStyle}>Int\ér\êts l\égaux \à appliquer</label>
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Percent size={14} style={{ color: '#b45309' }} />
              <span>Taux l\égal Luxembourg {(LUX_LATE_RATE * 100).toFixed(1)}% : <strong>{fmt(actionInvoice.montant * LUX_LATE_RATE / 12)} \€ / mois</strong></span>
            </div>
            <button onClick={() => { showToast('Relance cr\é\ée et li\ée'); setActionModal(null) }}
              style={{ ...smallBtnStyle, width: '100%', padding: '12px 16px', background: '#b45309', color: '#fff', border: 'none', justifyContent: 'center' }}>
              <Bell size={14} /> Cr\éer la relance
            </button>
          </ActionModal>
        )}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}
