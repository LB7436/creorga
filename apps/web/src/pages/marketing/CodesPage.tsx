import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Ticket,
  TrendingUp,
  Euro,
  Percent,
  Plus,
  Search,
  X,
  Download,
  Power,
  Shuffle,
  Eye,
  Gift,
  Truck,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type CodeType = 'Pourcentage' | 'Montant fixe' | 'Livraison gratuite' | 'Produit offert'
type CodeStatus = 'Actif' | 'Expiré' | 'Suspendu'

interface PromoCode {
  id: string
  code: string
  type: CodeType
  value: number
  uses: number
  limit: number
  startDate: string
  endDate: string
  status: CodeStatus
  active: boolean
}

const MOCK_CODES: PromoCode[] = [
  { id: 'p1', code: 'BIENVENUE10', type: 'Pourcentage', value: 10, uses: 142, limit: 500, startDate: '2026-01-01', endDate: '2026-12-31', status: 'Actif', active: true },
  { id: 'p2', code: 'ETE2026', type: 'Pourcentage', value: 15, uses: 68, limit: 200, startDate: '2026-06-01', endDate: '2026-08-31', status: 'Actif', active: true },
  { id: 'p3', code: 'LIVRAISONGRATUITE', type: 'Livraison gratuite', value: 0, uses: 312, limit: 1000, startDate: '2026-01-15', endDate: '2026-06-30', status: 'Actif', active: true },
  { id: 'p4', code: 'FIDELITE20', type: 'Pourcentage', value: 20, uses: 89, limit: 150, startDate: '2026-03-01', endDate: '2026-05-31', status: 'Actif', active: true },
  { id: 'p5', code: 'NOEL2025', type: 'Montant fixe', value: 15, uses: 456, limit: 500, startDate: '2025-12-01', endDate: '2025-12-31', status: 'Expiré', active: false },
  { id: 'p6', code: 'CAFEGRATUIT', type: 'Produit offert', value: 0, uses: 234, limit: 500, startDate: '2026-02-01', endDate: '2026-04-30', status: 'Actif', active: true },
  { id: 'p7', code: 'VIP50', type: 'Pourcentage', value: 50, uses: 12, limit: 50, startDate: '2026-04-01', endDate: '2026-04-30', status: 'Actif', active: true },
  { id: 'p8', code: 'WEEKEND5', type: 'Montant fixe', value: 5, uses: 178, limit: 400, startDate: '2026-01-01', endDate: '2026-12-31', status: 'Actif', active: true },
  { id: 'p9', code: 'NEWCLIENT', type: 'Pourcentage', value: 15, uses: 97, limit: 300, startDate: '2026-01-01', endDate: '2026-12-31', status: 'Actif', active: true },
  { id: 'p10', code: 'BLACKFRIDAY', type: 'Pourcentage', value: 25, uses: 612, limit: 800, startDate: '2025-11-25', endDate: '2025-11-30', status: 'Expiré', active: false },
  { id: 'p11', code: 'ETUDIANTS', type: 'Pourcentage', value: 10, uses: 45, limit: 200, startDate: '2026-03-15', endDate: '2026-07-15', status: 'Actif', active: true },
  { id: 'p12', code: 'HAPPYHOUR', type: 'Pourcentage', value: 30, uses: 389, limit: 500, startDate: '2026-01-01', endDate: '2026-12-31', status: 'Actif', active: true },
  { id: 'p13', code: 'BRUNCH20', type: 'Pourcentage', value: 20, uses: 156, limit: 300, startDate: '2026-02-01', endDate: '2026-12-31', status: 'Actif', active: true },
  { id: 'p14', code: 'COCKTAILSOFFERT', type: 'Produit offert', value: 0, uses: 67, limit: 150, startDate: '2026-03-01', endDate: '2026-06-30', status: 'Suspendu', active: false },
  { id: 'p15', code: 'ANNIV2026', type: 'Montant fixe', value: 10, uses: 28, limit: 100, startDate: '2026-04-01', endDate: '2026-12-31', status: 'Actif', active: true },
]

const TYPE_ICONS: Record<CodeType, any> = {
  'Pourcentage': Percent,
  'Montant fixe': Euro,
  'Livraison gratuite': Truck,
  'Produit offert': Gift,
}

const STATUS_COLORS: Record<CodeStatus, { bg: string; text: string; border: string }> = {
  'Actif': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Expiré': { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  'Suspendu': { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
}

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

export default function CodesPage() {
  const [codes, setCodes] = useState(MOCK_CODES)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)

  const filtered = useMemo(() => {
    return codes.filter((c) => !search || c.code.toLowerCase().includes(search.toLowerCase()))
  }, [codes, search])

  const chartData = useMemo(() => {
    return [...codes].sort((a, b) => b.uses - a.uses).slice(0, 8).map((c) => ({
      code: c.code.length > 11 ? `${c.code.slice(0, 9)}...` : c.code,
      uses: c.uses,
    }))
  }, [codes])

  const toggleActive = (id: string) => {
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c))
  }

  const stats = [
    { label: 'Codes actifs', value: '12', icon: Ticket, color: '#3b82f6' },
    { label: 'Utilisations ce mois', value: '89', icon: TrendingUp, color: '#10b981' },
    { label: 'Économies clients', value: fmtEUR(1240), icon: Euro, color: '#8b5cf6' },
    { label: 'ROI campagnes', value: '+18%', icon: Percent, color: '#f59e0b' },
  ]

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Codes promo</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gérez vos codes de réduction et mesurez l'impact des campagnes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Exporter codes
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Power size={14} /> Désactiver en masse
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', background: '#1e293b', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Créer un code
          </motion.button>
        </div>
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

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Utilisations par code</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Top 8 codes les plus utilisés</div>
          </div>
          <Eye size={16} style={{ color: '#94a3b8' }} />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="uses" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher un code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36 }}
          />
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Code', 'Type', 'Valeur', 'Utilisations', 'Période', 'Statut', 'Activer'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const Icon = TYPE_ICONS[c.type]
              const sc = STATUS_COLORS[c.status]
              const pct = Math.min(100, (c.uses / c.limit) * 100)
              const valueDisplay =
                c.type === 'Pourcentage' ? `${c.value}%` :
                c.type === 'Montant fixe' ? fmtEUR(c.value) :
                c.type === 'Livraison gratuite' ? '—' : '1 produit'
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1e293b',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      display: 'inline-block', padding: '4px 10px',
                      background: '#f1f5f9', borderRadius: 6, border: '1px dashed #cbd5e1',
                    }}>
                      {c.code}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
                      <Icon size={14} style={{ color: '#64748b' }} />
                      {c.type}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{valueDisplay}</td>
                  <td style={{ padding: '14px 16px', minWidth: 180 }}>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, fontWeight: 600 }}>
                      {c.uses} / {c.limit}
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                        borderRadius: 999,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#475569' }}>
                    {new Date(c.startDate).toLocaleDateString('fr-LU', { day: '2-digit', month: 'short' })}
                    {' → '}
                    {new Date(c.endDate).toLocaleDateString('fr-LU', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Toggle on={c.active} onChange={() => toggleActive(c.id)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && <NewCodeModal onClose={() => setModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 38, height: 22, borderRadius: 999,
        background: on ? '#10b981' : '#cbd5e1',
        border: 'none', cursor: 'pointer', padding: 0,
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  New Code Modal                                                     */
/* ------------------------------------------------------------------ */

function NewCodeModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('')
  const [type, setType] = useState<CodeType>('Pourcentage')
  const [value, setValue] = useState(10)
  const [minCart, setMinCart] = useState(0)
  const [cumulable, setCumulable] = useState(false)
  const [usageMode, setUsageMode] = useState<'Unique' | 'Multiple'>('Multiple')
  const [totalLimit, setTotalLimit] = useState(200)
  const [perClientLimit, setPerClientLimit] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [weekdays, setWeekdays] = useState<Record<string, boolean>>({
    lun: true, mar: true, mer: true, jeu: true, ven: true, sam: true, dim: true,
  })
  const [hourFrom, setHourFrom] = useState('')
  const [hourTo, setHourTo] = useState('')
  const [target, setTarget] = useState<'Tous' | 'Fidèles' | 'Nouveaux' | 'Segment'>('Tous')

  const generateRandom = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let c = ''
    for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)]
    setCode(c)
  }

  const valueDisplay =
    type === 'Pourcentage' ? `${value}%` :
    type === 'Montant fixe' ? fmtEUR(value) :
    type === 'Livraison gratuite' ? 'Livraison gratuite' : '1 produit offert'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Créer un code promo</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Code promo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...input, fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EX. ETE2026"
                />
                <button onClick={generateRandom} style={{ padding: '0 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shuffle size={14} /> Générer
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <Field label="Type">
                <select style={input} value={type} onChange={(e) => setType(e.target.value as CodeType)}>
                  <option>Pourcentage</option>
                  <option>Montant fixe</option>
                  <option>Livraison gratuite</option>
                  <option>Produit offert</option>
                </select>
              </Field>
              <Field label={type === 'Pourcentage' ? 'Valeur (%)' : type === 'Montant fixe' ? 'Valeur (€)' : 'Valeur'}>
                <input
                  type="number"
                  style={input}
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  disabled={type === 'Livraison gratuite' || type === 'Produit offert'}
                />
              </Field>
            </div>

            <SectionTitle>Conditions</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Field label="Minimum panier (€)">
                <input type="number" style={input} value={minCart} onChange={(e) => setMinCart(parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Produits éligibles">
                <select style={input}>
                  <option>Tous les produits</option>
                  <option>Sélectionner...</option>
                </select>
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Catégories éligibles">
                  <select style={input}>
                    <option>Toutes les catégories</option>
                    <option>Boissons</option><option>Plats</option><option>Desserts</option>
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Toggle on={cumulable} onChange={() => setCumulable(!cumulable)} />
              <div style={{ fontSize: 13, color: '#1e293b' }}>Cumulable avec d'autres promos</div>
            </div>

            <SectionTitle>Utilisation</SectionTitle>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['Unique', 'Multiple'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setUsageMode(m)}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: `2px solid ${usageMode === m ? '#1e293b' : '#e2e8f0'}`,
                    background: usageMode === m ? '#f8fafc' : '#fff',
                    fontSize: 13, fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                  }}
                >
                  Usage {m.toLowerCase()}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <Field label="Limite totale">
                <input type="number" style={input} value={totalLimit} onChange={(e) => setTotalLimit(parseInt(e.target.value) || 0)} />
              </Field>
              <Field label="Limite par client">
                <input type="number" style={input} value={perClientLimit} onChange={(e) => setPerClientLimit(parseInt(e.target.value) || 0)} />
              </Field>
            </div>

            <SectionTitle>Période de validité</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Field label="Date début">
                <input type="date" style={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Date fin">
                <input type="date" style={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Jours de la semaine</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setWeekdays((prev) => ({ ...prev, [d]: !prev[d] }))}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      border: `1px solid ${weekdays[d] ? '#1e293b' : '#e2e8f0'}`,
                      background: weekdays[d] ? '#1e293b' : '#fff',
                      color: weekdays[d] ? '#fff' : '#64748b',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <Field label="Heure de">
                <input type="time" style={input} value={hourFrom} onChange={(e) => setHourFrom(e.target.value)} />
              </Field>
              <Field label="Heure à">
                <input type="time" style={input} value={hourTo} onChange={(e) => setHourTo(e.target.value)} />
              </Field>
            </div>

            <SectionTitle>Clients ciblés</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['Tous', 'Fidèles', 'Nouveaux', 'Segment'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    padding: '10px 8px', borderRadius: 10,
                    border: `2px solid ${target === t ? '#1e293b' : '#e2e8f0'}`,
                    background: target === t ? '#f8fafc' : '#fff',
                    fontSize: 12, fontWeight: 600, color: '#1e293b', cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: 16, padding: 20, color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
              }}>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aperçu du code</div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: 1.5,
                  padding: '12px 14px', margin: '10px 0',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  border: '2px dashed rgba(255,255,255,0.5)',
                  textAlign: 'center',
                }}>
                  {code || '—'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{valueDisplay}</div>
                <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>
                  {minCart > 0 && <div>• Panier min. {fmtEUR(minCart)}</div>}
                  <div>• Usage {usageMode.toLowerCase()} · {totalLimit} utilisations max</div>
                  <div>• {perClientLimit} par client</div>
                  {startDate && endDate && <div>• {startDate} → {endDate}</div>}
                  {cumulable && <div>• Cumulable</div>}
                  <div>• Clients : {target}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                <button style={{ padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  Créer le code
                </button>
                <button onClick={onClose} style={{ padding: '10px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '6px 0 12px' }}>
      {children}
    </div>
  )
}
