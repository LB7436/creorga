import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Shield,
  Award,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Plus,
  Search,
  Download,
  Eye,
  X,
  RefreshCw,
  Euro,
  Building2,
  FileCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── palette ── */
const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  amber: '#ca8a04',
  amberSoft: '#fef3c7',
  green: '#10b981',
  greenSoft: '#d1fae5',
  red: '#ef4444',
  redSoft: '#fee2e2',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
  violet: '#7C3AED',
  violetSoft: '#ede9fe',
}

type DocStatus = 'actif' | 'expire-bientot' | 'expire'
type DocCategory = 'Licences commerciales' | 'Assurances' | 'Certifications' | 'Contrats récurrents' | 'Permis'

interface DocItem {
  id: string
  name: string
  category: DocCategory
  number: string
  supplier: string
  startDate: string
  expiryDate: string
  annualCost: number
  file: string
  autoRenew: boolean
  status: DocStatus
}

const DOCS: DocItem[] = [
  // Licences commerciales
  { id: 'd1', name: 'Licence restaurant', category: 'Licences commerciales', number: 'LU-REST-2023-4521', supplier: 'Ministère de l\'Économie', startDate: '2023-01-10', expiryDate: '2028-01-10', annualCost: 120, file: 'licence_restau.pdf', autoRenew: false, status: 'actif' },
  { id: 'd2', name: 'Licence IV débit de boissons', category: 'Licences commerciales', number: 'LU-DB-IV-8842', supplier: 'Administration communale Rumelange', startDate: '2023-01-10', expiryDate: '2028-01-10', annualCost: 85, file: 'licence_iv.pdf', autoRenew: false, status: 'actif' },
  { id: 'd3', name: 'Enregistrement TVA', category: 'Licences commerciales', number: 'LU24567890', supplier: 'AED Luxembourg', startDate: '2022-11-01', expiryDate: '2099-12-31', annualCost: 0, file: 'tva.pdf', autoRenew: true, status: 'actif' },
  // Assurances
  { id: 'd4', name: 'RC Professionnelle', category: 'Assurances', number: 'FOY-RC-2024-77812', supplier: 'Foyer Assurances LU', startDate: '2024-06-01', expiryDate: '2026-06-01', annualCost: 980, file: 'rc_pro.pdf', autoRenew: true, status: 'expire-bientot' },
  { id: 'd5', name: 'Multirisque établissement', category: 'Assurances', number: 'AXA-MR-4412-2025', supplier: 'AXA Luxembourg', startDate: '2025-01-01', expiryDate: '2027-01-01', annualCost: 1420, file: 'multirisque.pdf', autoRenew: true, status: 'actif' },
  { id: 'd6', name: 'Protection juridique', category: 'Assurances', number: 'DKV-PJ-2024-9921', supplier: 'DKV Luxembourg', startDate: '2024-09-01', expiryDate: '2026-09-01', annualCost: 310, file: 'protection_juridique.pdf', autoRenew: true, status: 'actif' },
  // Certifications
  { id: 'd7', name: 'HACCP', category: 'Certifications', number: 'HACCP-LU-2025-3381', supplier: 'SECOLUX', startDate: '2025-03-15', expiryDate: '2027-03-15', annualCost: 450, file: 'haccp.pdf', autoRenew: false, status: 'actif' },
  { id: 'd8', name: 'Bio Label', category: 'Certifications', number: 'BIO-LU-1144', supplier: 'Bioconsult', startDate: '2024-06-01', expiryDate: '2026-06-01', annualCost: 380, file: 'bio.pdf', autoRenew: false, status: 'expire-bientot' },
  { id: 'd9', name: 'Fair-trade', category: 'Certifications', number: 'FT-9981', supplier: 'Fairtrade International', startDate: '2024-01-01', expiryDate: '2027-01-01', annualCost: 240, file: 'fairtrade.pdf', autoRenew: true, status: 'actif' },
  // Contrats récurrents
  { id: 'd10', name: 'Bail commercial', category: 'Contrats récurrents', number: 'BAIL-RUM-2020-078', supplier: 'SCI Rue du Parc', startDate: '2020-09-01', expiryDate: '2029-09-01', annualCost: 28800, file: 'bail.pdf', autoRenew: false, status: 'actif' },
  { id: 'd11', name: 'Internet pro', category: 'Contrats récurrents', number: 'POST-FIB-22199', supplier: 'POST Luxembourg', startDate: '2023-05-10', expiryDate: '2026-05-10', annualCost: 720, file: 'post.pdf', autoRenew: true, status: 'expire-bientot' },
  { id: 'd12', name: 'Électricité', category: 'Contrats récurrents', number: 'ENO-PRO-44812', supplier: 'Enovos', startDate: '2024-01-01', expiryDate: '2027-01-01', annualCost: 4800, file: 'enovos.pdf', autoRenew: true, status: 'actif' },
  { id: 'd13', name: 'Déchets', category: 'Contrats récurrents', number: 'SIDOR-2024-711', supplier: 'SIDOR', startDate: '2024-01-01', expiryDate: '2026-12-31', annualCost: 1680, file: 'sidor.pdf', autoRenew: true, status: 'actif' },
  // Permis
  { id: 'd14', name: 'Autorisation terrasse', category: 'Permis', number: 'RUM-TERR-2026-045', supplier: 'Ville de Rumelange', startDate: '2026-04-01', expiryDate: '2026-10-31', annualCost: 180, file: 'terrasse.pdf', autoRenew: false, status: 'actif' },
  { id: 'd15', name: 'Autorisation musique SACEM', category: 'Permis', number: 'SACEM-LU-8821', supplier: 'SACEM Luxembourg', startDate: '2025-01-01', expiryDate: '2026-12-31', annualCost: 620, file: 'sacem.pdf', autoRenew: true, status: 'actif' },
  { id: 'd16', name: 'Licence alcool à emporter', category: 'Permis', number: 'LU-ALC-EM-2245', supplier: 'Administration communale', startDate: '2024-01-01', expiryDate: '2027-01-01', annualCost: 95, file: 'alcool.pdf', autoRenew: false, status: 'actif' },
  { id: 'd17', name: 'Affiche allergènes', category: 'Licences commerciales', number: 'AL-2025-001', supplier: 'Ministère Santé LU', startDate: '2025-01-01', expiryDate: '2026-12-31', annualCost: 0, file: 'allergenes.pdf', autoRenew: false, status: 'actif' },
  { id: 'd18', name: 'Extincteurs — contrôle annuel', category: 'Certifications', number: 'EXT-2025-LUX', supplier: 'Securitas LU', startDate: '2025-06-01', expiryDate: '2026-06-01', annualCost: 240, file: 'extincteurs.pdf', autoRenew: true, status: 'expire-bientot' },
]

const statusMap = {
  'actif': { label: 'Actif', bg: C.greenSoft, fg: C.green, icon: CheckCircle2 },
  'expire-bientot': { label: 'Expire bientôt', bg: C.amberSoft, fg: C.amber, icon: AlertTriangle },
  'expire': { label: 'Expiré', bg: C.redSoft, fg: C.red, icon: AlertTriangle },
}

const categoryIcon: Record<DocCategory, any> = {
  'Licences commerciales': FileText,
  'Assurances': Shield,
  'Certifications': Award,
  'Contrats récurrents': Building2,
  'Permis': FileCheck,
}

function LicencesPage() {
  const [tab, setTab] = useState<'list' | 'timeline' | 'budget'>('list')
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<DocCategory | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewDoc, setViewDoc] = useState<DocItem | null>(null)

  const stats = useMemo(() => {
    const expSoon = DOCS.filter(d => d.status === 'expire-bientot').length
    const budget = DOCS.reduce((s, d) => s + d.annualCost, 0)
    const renewalsMonth = DOCS.filter(d => d.expiryDate.startsWith('2026-04') || d.expiryDate.startsWith('2026-05')).length
    return {
      active: DOCS.filter(d => d.status !== 'expire').length,
      expSoon,
      renewalsMonth,
      budget,
    }
  }, [])

  const filtered = DOCS.filter(d =>
    (catFilter === 'all' || d.category === catFilter) &&
    (d.name.toLowerCase().includes(query.toLowerCase()) || d.supplier.toLowerCase().includes(query.toLowerCase()))
  )

  const grouped: Record<DocCategory, DocItem[]> = {
    'Licences commerciales': [], 'Assurances': [], 'Certifications': [], 'Contrats récurrents': [], 'Permis': [],
  }
  filtered.forEach(d => grouped[d.category].push(d))

  // Budget by category
  const budgetByCat: { cat: string; value: number }[] = Object.keys(grouped).map(c => ({
    cat: c,
    value: DOCS.filter(d => d.category === c).reduce((s, d) => s + d.annualCost, 0),
  }))
  const maxBudget = Math.max(...budgetByCat.map(b => b.value))

  // Timeline — 12 months from now
  const months = ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar']
  const expiriesByMonth: Record<number, DocItem[]> = {}
  DOCS.forEach(d => {
    const date = new Date(d.expiryDate)
    const now = new Date('2026-04-17')
    const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth()
    if (monthsDiff >= 0 && monthsDiff < 12) {
      expiriesByMonth[monthsDiff] = expiriesByMonth[monthsDiff] || []
      expiriesByMonth[monthsDiff].push(d)
    }
  })

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={28} color={C.amber} /> Licences & Assurances
          </h1>
          <p style={{ margin: '4px 0 0', color: C.muted }}>Documents légaux, échéances et renouvellements</p>
        </div>
        <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.amber, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Ajouter un document
        </button>
      </motion.div>

      {/* Expiration banner */}
      {stats.expSoon > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.amberSoft, color: C.amber, padding: '12px 16px', borderRadius: 10, marginBottom: 18, fontWeight: 600 }}>
          <AlertTriangle size={18} /> {stats.expSoon} documents expirent dans les 90 prochains jours — pensez au renouvellement.
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Documents actifs', value: stats.active, icon: FileText, color: C.blue, bg: C.blueSoft },
          { label: 'Expirations < 90j', value: stats.expSoon, icon: AlertTriangle, color: C.amber, bg: C.amberSoft },
          { label: 'Renouvellements ce mois', value: stats.renewalsMonth, icon: RefreshCw, color: C.violet, bg: C.violetSoft },
          { label: 'Budget annuel', value: `${stats.budget.toLocaleString('fr-FR')} €`, icon: Euro, color: C.green, bg: C.greenSoft },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: C.card, padding: 18, borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: 'list', label: 'Documents', icon: FileText },
          { id: 'timeline', label: 'Échéances 12 mois', icon: Calendar },
          { id: 'budget', label: 'Budget', icon: Euro },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            background: 'transparent', border: 'none', padding: '10px 14px', cursor: 'pointer',
            color: tab === t.id ? C.amber : C.muted, fontWeight: 600, fontSize: 14,
            borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'list' && (
          <motion.div key="ls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search size={16} color={C.muted} style={{ position: 'absolute', left: 12, top: 12 }} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.card, fontSize: 14 }} />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value as any)} style={{ padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.card, fontSize: 14 }}>
                <option value="all">Toutes catégories</option>
                {Object.keys(grouped).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {Object.entries(grouped).map(([cat, docs]) => {
              if (docs.length === 0) return null
              const Icon = categoryIcon[cat as DocCategory]
              return (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: '0 0 10px', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <Icon size={16} /> {cat} <span style={{ color: C.muted, fontWeight: 400 }}>({docs.length})</span>
                  </h3>
                  <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    {docs.map((d, idx) => {
                      const st = statusMap[d.status]
                      return (
                        <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr auto', gap: 12, padding: 14, borderTop: idx > 0 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{d.name}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>N° {d.number}</div>
                          </div>
                          <div style={{ fontSize: 13 }}>{d.supplier}</div>
                          <div style={{ fontSize: 13, color: C.muted }}>Exp. {d.expiryDate}</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.annualCost > 0 ? `${d.annualCost} €/an` : '—'}</div>
                          <div>
                            <span style={{ background: st.bg, color: st.fg, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <st.icon size={12} /> {st.label}
                            </span>
                            {d.autoRenew && <span style={{ marginLeft: 6, fontSize: 11, color: C.violet }}><RefreshCw size={10} style={{ display: 'inline' }} /> auto</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setViewDoc(d)} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 6, borderRadius: 6, cursor: 'pointer' }} title="Voir"><Eye size={14} /></button>
                            <button onClick={() => toast.success('Téléchargement…')} style={{ background: C.bg, border: `1px solid ${C.border}`, padding: 6, borderRadius: 6, cursor: 'pointer' }} title="Télécharger"><Download size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {tab === 'timeline' && (
          <motion.div key="tl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
              <h3 style={{ margin: '0 0 18px' }}>Calendrier des échéances — 12 prochains mois</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                {months.map((m, i) => {
                  const list = expiriesByMonth[i] || []
                  return (
                    <div key={i} style={{ background: list.length ? C.amberSoft : C.bg, borderRadius: 8, padding: 10, minHeight: 140, border: `1px solid ${C.border}` }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: list.length ? C.amber : C.muted, marginBottom: 8 }}>{m}</div>
                      {list.map(d => (
                        <div key={d.id} style={{ fontSize: 10, background: C.amber, color: '#fff', padding: '3px 5px', borderRadius: 4, marginBottom: 3, lineHeight: 1.2 }} title={d.name}>
                          {d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'budget' && (
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <h3 style={{ margin: '0 0 20px' }}>Budget annuel par catégorie</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {budgetByCat.map(b => (
                  <div key={b.cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{b.cat}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{b.value.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div style={{ background: C.bg, height: 14, borderRadius: 7, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(b.value / maxBudget) * 100}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: `linear-gradient(90deg, ${C.amber}, #eab308)`, borderRadius: 7 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: 16, background: C.amberSoft, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: C.amber }}>Total annuel</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.amber }}>{stats.budget.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doc viewer */}
      <AnimatePresence>
        {viewDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewDoc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ background: C.card, padding: 24, borderRadius: 16, width: 640, maxWidth: '92%', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{viewDoc.name}</h3>
                <button onClick={() => setViewDoc(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div><div style={{ fontSize: 11, color: C.muted }}>Catégorie</div><div style={{ fontWeight: 600 }}>{viewDoc.category}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted }}>Numéro</div><div style={{ fontWeight: 600 }}>{viewDoc.number}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted }}>Fournisseur</div><div style={{ fontWeight: 600 }}>{viewDoc.supplier}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted }}>Montant annuel</div><div style={{ fontWeight: 600 }}>{viewDoc.annualCost} €</div></div>
                <div><div style={{ fontSize: 11, color: C.muted }}>Début</div><div style={{ fontWeight: 600 }}>{viewDoc.startDate}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted }}>Expiration</div><div style={{ fontWeight: 600 }}>{viewDoc.expiryDate}</div></div>
              </div>
              <div style={{ background: C.bg, border: `2px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 16 }}>
                <FileText size={48} color={C.muted} />
                <div style={{ marginTop: 10, fontWeight: 600 }}>{viewDoc.file}</div>
                <div style={{ fontSize: 12, color: C.muted }}>Aperçu PDF (mock)</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, background: C.amber, color: '#fff', border: 'none', padding: 10, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}><Download size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Télécharger</button>
                <button style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, padding: 10, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}><RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Renouveler</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ background: C.card, padding: 24, borderRadius: 16, width: 520, maxWidth: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Ajouter un document</h3>
                <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input placeholder="Nom du document" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <select style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  {Object.keys(grouped).map(c => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Numéro / Référence" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <input placeholder="Fournisseur" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="date" style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                  <input type="date" style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                </div>
                <input placeholder="Montant annuel (€)" type="number" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: 24, textAlign: 'center', color: C.muted, cursor: 'pointer' }}>
                  <Upload size={24} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 13 }}>Glissez le fichier PDF ou cliquez pour sélectionner</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" /> Renouvellement automatique
                </label>
                <button onClick={() => { toast.success('Document ajouté'); setModalOpen(false) }} style={{ background: C.amber, color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LicencesPage
