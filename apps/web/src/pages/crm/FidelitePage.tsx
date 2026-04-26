import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import {
  Users, Star, TrendingUp, Gift, QrCode, Upload, Cake, UserPlus, Calculator,
  Plus, X, Edit3, Trash2, CheckCircle2, Coffee, Tag, Sparkles, Crown, Award,
  Clock, Coins, Mail, ChevronRight, Save, Medal,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════ */
/*  Types & styles                                                   */
/* ═══════════════════════════════════════════════════════════════ */

interface Tier {
  id: string
  name: string
  minPoints: number
  discount: number
  color: string
  gradient: string
  perks: string[]
}

interface PointRule {
  id: string
  label: string
  description: string
  enabled: boolean
  icon: typeof Coins
}

interface Reward {
  id: string
  name: string
  description: string
  cost: number
  stock: number
  category: 'Boisson' | 'Remise' | 'Expérience' | 'Goodie'
  icon: string
}

interface Member {
  id: string
  name: string
  email: string
  points: number
  tier: string
  lifetimeValue: number
  joined: string
  birthday: string
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  padding: 22,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6,
  display: 'block', textTransform: 'uppercase', letterSpacing: 0.5,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
  background: '#ffffff', color: '#1e293b', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 24,
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Mock data                                                        */
/* ═══════════════════════════════════════════════════════════════ */

const INITIAL_TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze',   minPoints: 0,    discount: 5,  color: '#d97706', gradient: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)', perks: ['5% remise'] },
  { id: 'silver', name: 'Silver',   minPoints: 100,  discount: 10, color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)', perks: ['10% remise', 'Boisson offerte'] },
  { id: 'gold',   name: 'Gold',     minPoints: 500,  discount: 15, color: '#d97706', gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', perks: ['15% remise', 'Dessert offert', 'Priorité réservation'] },
  { id: 'platinum', name: 'Platine', minPoints: 1500, discount: 20, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)', perks: ['20% remise', 'Menu dégustation offert', 'Accès VIP', 'Ligne prioritaire'] },
]

const INITIAL_REWARDS: Reward[] = [
  { id: 'r1', name: 'Café offert',       description: 'Un café au choix',           cost: 50,  stock: 999, category: 'Boisson',       icon: 'coffee' },
  { id: 'r2', name: 'Dessert maison',        description: 'Dessert du jour offert',         cost: 120, stock: 50,  category: 'Boisson',       icon: 'cake' },
  { id: 'r3', name: 'Remise 10€',       description: 'Réduction immédiate',    cost: 200, stock: 999, category: 'Remise',        icon: 'tag' },
  { id: 'r4', name: 'Bouteille Moselle',     description: 'Vin de Moselle offert',          cost: 400, stock: 12,  category: 'Boisson',       icon: 'gift' },
  { id: 'r5', name: 'Menu dégustation', description: 'Men 5 plats pour 2 pers.',        cost: 800, stock: 5,   category: 'Expérience', icon: 'star' },
  { id: 'r6', name: 'Atelier cuisine',       description: 'Cours avec le chef',             cost: 1200, stock: 3,  category: 'Expérience', icon: 'award' },
  { id: 'r7', name: 'Mug Café',         description: 'Mug en céramique',            cost: 150, stock: 25,  category: 'Goodie',        icon: 'coffee' },
  { id: 'r8', name: 'Soirée privée', description: 'Privatisation salon +10 invités', cost: 2500, stock: 1, category: 'Expérience', icon: 'crown' },
]

const MEMBERS_MOCK: Member[] = [
  { id: '1', name: 'Jean Dupont',      email: 'j.dupont@email.lu',    points: 340,  tier: 'silver',  lifetimeValue: 1240, joined: '2025-02-14', birthday: '1985-06-15' },
  { id: '2', name: 'Marie Martin',     email: 'm.martin@email.lu',    points: 680,  tier: 'gold',    lifetimeValue: 2850, joined: '2024-11-02', birthday: '1990-04-22' },
  { id: '3', name: 'Paul Schmit',      email: 'p.schmit@email.lu',    points: 1820, tier: 'platinum', lifetimeValue: 6420, joined: '2023-08-10', birthday: '1978-12-03' },
  { id: '4', name: 'Sophie Kieffer',   email: 's.kieffer@email.lu',   points: 45,   tier: 'bronze',  lifetimeValue: 180,  joined: '2026-03-20', birthday: '1995-04-18' },
  { id: '5', name: 'Marc Welter',      email: 'm.welter@email.lu',    points: 520,  tier: 'gold',    lifetimeValue: 2100, joined: '2025-05-08', birthday: '1982-07-29' },
]

const analyticsMonthly = [
  { mois: 'Nov', earned: 3200, redeemed: 1800, active: 148 },
  { mois: 'Déc', earned: 4800, redeemed: 2400, active: 172 },
  { mois: 'Jan', earned: 3900, redeemed: 2100, active: 186 },
  { mois: 'Fév', earned: 4200, redeemed: 2600, active: 198 },
  { mois: 'Mar', earned: 5100, redeemed: 3200, active: 221 },
  { mois: 'Avr', earned: 4650, redeemed: 2850, active: 248 },
]

/* ═══════════════════════════════════════════════════════════════ */
/*  Toast                                                            */
/* ═══════════════════════════════════════════════════════════════ */

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
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

/* ═══════════════════════════════════════════════════════════════ */
/*  QR Modal                                                          */
/* ═══════════════════════════════════════════════════════════════ */

function QRModal({ member, onClose }: { member: Member; onClose: () => void }) {
  // Generate a simple visual mock QR code using a grid of cells
  const cells = useMemo(() => {
    const seed = member.id.charCodeAt(0) + member.name.length
    return Array.from({ length: 21 * 21 }, (_, i) => (((i * 7 + seed) ^ (i * 13)) & 1) === 1)
  }, [member])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, maxWidth: 440, width: '100%', padding: 32 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>QR Code fidélité</h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{member.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ID : FID-{member.id.padStart(6, '0')}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '22px 0' }}>
          <div style={{
            width: 210, height: 210, background: '#fff', padding: 10, borderRadius: 14,
            border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(21, 1fr)', gap: 0,
          }}>
            {cells.map((on, i) => (
              <div key={i} style={{ background: on ? '#0f172a' : '#fff', width: '100%', aspectRatio: '1' }} />
            ))}
          </div>
        </div>
        <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569', textAlign: 'center' }}>
          Scannez à la caisse pour cumuler ou dépenser les points
        </div>
        <button style={{ marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Télécharger le QR
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Tier editor modal                                                */
/* ═══════════════════════════════════════════════════════════════ */

function TierEditor({ tier, onClose, onSave }: { tier: Tier | null; onClose: () => void; onSave: (t: Tier) => void }) {
  const [draft, setDraft] = useState<Tier>(tier || {
    id: `tier-${Date.now()}`, name: '', minPoints: 0, discount: 0,
    color: '#4338ca', gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', perks: [],
  })
  const [perkInput, setPerkInput] = useState('')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, maxWidth: 520, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{tier ? 'Modifier' : 'Créer'} un palier</h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>

        <div style={{
          padding: 20, borderRadius: 14, marginBottom: 18, background: draft.gradient,
          color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{draft.name || 'Palier'}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{draft.minPoints}+ pts</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Nom</label>
            <input style={inputStyle} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Diamant" />
          </div>
          <div>
            <label style={labelStyle}>Points minimum</label>
            <input style={inputStyle} type="number" value={draft.minPoints} onChange={e => setDraft({ ...draft, minPoints: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={labelStyle}>Remise (%)</label>
            <input style={inputStyle} type="number" value={draft.discount} onChange={e => setDraft({ ...draft, discount: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label style={labelStyle}>Couleur</label>
            <input style={{ ...inputStyle, height: 38, padding: 4 }} type="color" value={draft.color} onChange={e => setDraft({
              ...draft, color: e.target.value,
              gradient: `linear-gradient(135deg, ${e.target.value} 0%, ${e.target.value}cc 100%)`,
            })} />
          </div>
        </div>

        <label style={labelStyle}>Avantages</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input style={inputStyle} value={perkInput} onChange={e => setPerkInput(e.target.value)} placeholder="Ajouter un avantage..."
            onKeyDown={e => { if (e.key === 'Enter' && perkInput) { setDraft({ ...draft, perks: [...draft.perks, perkInput] }); setPerkInput('') } }}
          />
          <button onClick={() => { if (perkInput) { setDraft({ ...draft, perks: [...draft.perks, perkInput] }); setPerkInput('') } }} style={{ ...smallBtnStyle, padding: '8px 12px' }}>
            <Plus size={13} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {draft.perks.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569' }}>
              <span>{p}</span>
              <button onClick={() => setDraft({ ...draft, perks: draft.perks.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => { onSave(draft); onClose() }} style={{
          width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
          background: '#065F46', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Save size={14} /> Enregistrer
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Import CSV Modal                                                 */
/* ═══════════════════════════════════════════════════════════════ */

function ImportModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [imported, setImported] = useState(0)

  const handleImport = () => {
    const count = Math.floor(Math.random() * 80) + 50
    setImported(count)
    setTimeout(() => {
      onToast(`${count} clients importés avec succès`)
      onClose()
    }, 1500)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, maxWidth: 500, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={17} /> Importer clients (CSV)
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => { e.preventDefault(); setDragActive(false); setFileName('clients_legacy.csv') }}
          onClick={() => setFileName('clients_legacy.csv')}
          style={{
            border: `2px dashed ${dragActive ? '#4338ca' : '#cbd5e1'}`,
            background: dragActive ? '#eef2ff' : '#f8fafc',
            borderRadius: 14, padding: 30, textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Upload size={32} style={{ color: dragActive ? '#4338ca' : '#94a3b8', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
            {fileName || 'Glissez votre fichier ici ou cliquez'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            CSV : nom, email, points, tier
          </div>
        </div>
        {fileName && imported === 0 && (
          <button onClick={handleImport} style={{
            width: '100%', marginTop: 16, padding: '12px 18px', borderRadius: 12, border: 'none',
            background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Lancer l'import
          </button>
        )}
        {imported > 0 && (
          <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 12, fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} /> {imported} clients importés
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Main Page                                                        */
/* ═══════════════════════════════════════════════════════════════ */

export default function FidelitePage() {
  const [tiers, setTiers] = useState<Tier[]>(INITIAL_TIERS)
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS)
  const [members] = useState<Member[]>(MEMBERS_MOCK)
  const [rules, setRules] = useState<PointRule[]>([
    { id: 'euro', label: '1 point par euro dépensé', description: 'Chaque euro dépensé rapporte 1 point', enabled: true, icon: Coins },
    { id: 'birthday', label: 'Bonus anniversaire', description: '+100 points le jour de l\'anniversaire', enabled: true, icon: Cake },
    { id: 'referral', label: 'Parrainage', description: '+50 pts parrain, +50 pts filleul', enabled: false, icon: UserPlus },
    { id: 'upgrade', label: 'Notification upgrade', description: 'Email auto lors d\'un changement de palier', enabled: true, icon: Mail },
  ])

  const [pointsPerEuro, setPointsPerEuro] = useState(1)
  const [expiration, setExpiration] = useState<'never' | '6m' | '1y' | '2y'>('1y')

  const [showQR, setShowQR] = useState<Member | null>(null)
  const [tierToEdit, setTierToEdit] = useState<Tier | null>(null)
  const [showTierEditor, setShowTierEditor] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [simulateMember, setSimulateMember] = useState<Member>(MEMBERS_MOCK[0])
  const [simulateSpend, setSimulateSpend] = useState('50')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2800)
  }

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const saveTier = (t: Tier) => {
    setTiers(prev => {
      const idx = prev.findIndex(x => x.id === t.id)
      if (idx >= 0) return prev.map(x => x.id === t.id ? t : x)
      return [...prev, t].sort((a, b) => a.minPoints - b.minPoints)
    })
    showToast(`Palier "${t.name}" enregistré`)
  }

  const deleteTier = (id: string) => {
    setTiers(prev => prev.filter(t => t.id !== id))
    showToast('Palier supprimé')
  }

  const analytics = useMemo(() => {
    const totalPoints = members.reduce((s, m) => s + m.points, 0)
    const totalLTV = members.reduce((s, m) => s + m.lifetimeValue, 0)
    const avgLTV = totalLTV / members.length
    const totalEarned = analyticsMonthly.reduce((s, m) => s + m.earned, 0)
    const totalRedeemed = analyticsMonthly.reduce((s, m) => s + m.redeemed, 0)
    const redemptionRate = Math.round((totalRedeemed / totalEarned) * 100)
    return { totalPoints, avgLTV, totalEarned, totalRedeemed, redemptionRate }
  }, [members])

  const simulation = useMemo(() => {
    const spend = parseFloat(simulateSpend) || 0
    const currentPoints = simulateMember.points
    const newPoints = currentPoints + spend * pointsPerEuro
    const currentTier = tiers.find(t => t.id === simulateMember.tier) || tiers[0]
    const nextTier = tiers.find(t => t.minPoints > currentPoints)
    const pointsToNext = nextTier ? nextTier.minPoints - currentPoints : 0
    const spendNeeded = Math.ceil(pointsToNext / pointsPerEuro)
    const willUpgrade = nextTier && newPoints >= nextTier.minPoints
    return { currentPoints, newPoints, currentTier, nextTier, spendNeeded, willUpgrade }
  }, [simulateMember, simulateSpend, tiers, pointsPerEuro])

  const rewardCatColors: Record<Reward['category'], { bg: string; fg: string }> = {
    'Boisson': { bg: '#dbeafe', fg: '#1d4ed8' },
    'Remise': { bg: '#fef3c7', fg: '#92400e' },
    'Expérience': { bg: '#ede9fe', fg: '#6d28d9' },
    'Goodie': { bg: '#dcfce7', fg: '#166534' },
  }

  const tierPie = tiers.map(t => ({
    name: t.name,
    value: members.filter(m => m.tier === t.id).length,
    color: t.color,
  })).filter(x => x.value > 0)

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>Programme de fidélité</h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>Paliers personnalisés, catalogue de récompenses et analytics avancés</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowImport(true)} style={smallBtnStyle}>
              <Upload size={13} /> Importer CSV
            </button>
            <button onClick={() => { setTierToEdit(null); setShowTierEditor(true) }} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none' }}>
              <Plus size={13} /> Nouveau palier
            </button>
          </div>
        </motion.div>

        {/* Analytics stats */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Membres actifs', value: members.length + 243, icon: Users, color: '#4338ca' },
            { label: 'Points gagnés', value: analytics.totalEarned.toLocaleString('fr-FR'), icon: Star, color: '#f59e0b' },
            { label: 'Points redeemés', value: analytics.totalRedeemed.toLocaleString('fr-FR'), icon: Gift, color: '#10b981' },
            { label: 'Taux redemption', value: `${analytics.redemptionRate}%`, icon: TrendingUp, color: '#8b5cf6' },
            { label: 'LTV moyen', value: `${Math.round(analytics.avgLTV).toLocaleString('fr-FR')} €`, icon: Award, color: '#ec4899' },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Charts row */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>Évolution points &amp; membres actifs</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analyticsMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="earned" stroke="#f59e0b" strokeWidth={2} name="Gagnés" />
                <Line type="monotone" dataKey="redeemed" stroke="#10b981" strokeWidth={2} name="Redeemés" />
                <Line type="monotone" dataKey="active" stroke="#4338ca" strokeWidth={2} name="Actifs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>Répartition par palier</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tierPie} cx="50%" cy="50%" innerRadius={45} outerRadius={82} paddingAngle={3} dataKey="value">
                  {tierPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tiers customizable */}
        <motion.div variants={item} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown size={16} /> Paliers de fidélité
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Conversion :</span>
              <input
                type="number"
                value={pointsPerEuro}
                onChange={e => setPointsPerEuro(parseInt(e.target.value) || 1)}
                style={{ ...inputStyle, width: 60, padding: '6px 10px', textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>pt / €</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 14 }}>
            {tiers.map(t => (
              <motion.div
                key={t.id} whileHover={{ y: -3 }}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}
              >
                <div style={{ background: t.gradient, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{t.minPoints}+ pts</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{t.discount}%</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>de remise</div>
                  {t.perks.map(p => (
                    <div key={p} style={{ fontSize: 12, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>+</span> {p}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => { setTierToEdit(t); setShowTierEditor(true) }} style={{ ...smallBtnStyle, padding: '5px 10px', flex: 1, justifyContent: 'center' }}>
                      <Edit3 size={11} /> Éditer
                    </button>
                    <button onClick={() => deleteTier(t.id)} style={{ ...smallBtnStyle, padding: '5px 8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Two column: simulation + expiration */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calculator size={15} /> Simulation de progression
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Client</label>
                <select style={inputStyle} value={simulateMember.id} onChange={e => setSimulateMember(members.find(m => m.id === e.target.value) || members[0])}>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.points} pts)</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Dépense additionnelle</label>
                <input style={inputStyle} type="number" value={simulateSpend} onChange={e => setSimulateSpend(e.target.value)} />
              </div>
            </div>
            <div style={{ padding: 14, background: simulation.willUpgrade ? '#f0fdf4' : '#eef2ff', borderRadius: 12, border: `1px solid ${simulation.willUpgrade ? '#bbf7d0' : '#c7d2fe'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Points actuels</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{simulation.currentPoints}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Après cette dépense</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: simulation.willUpgrade ? '#10b981' : '#4338ca' }}>{simulation.newPoints}</span>
              </div>
              {simulation.nextTier && (
                <>
                  <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden', marginTop: 10 }}>
                    <div style={{
                      width: `${Math.min(100, (simulation.newPoints / simulation.nextTier.minPoints) * 100)}%`,
                      height: '100%', background: simulation.nextTier.gradient, transition: 'width 0.4s',
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>
                    {simulation.willUpgrade ? (
                      <><Sparkles size={11} style={{ display: 'inline', color: '#10b981' }} /> <strong>Passe à {simulation.nextTier.name}</strong> avec cette dépense</>
                    ) : (
                      <>Encore <strong>{simulation.spendNeeded} €</strong> pour atteindre <strong>{simulation.nextTier.name}</strong></>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} /> Expiration des points
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'never', label: 'Jamais', desc: 'Les points ne s\'expirent jamais' },
                { id: '6m', label: '6 mois', desc: 'Expiration après 6 mois d\'inactivité' },
                { id: '1y', label: '1 an', desc: 'Expiration après 1 an d\'inactivité' },
                { id: '2y', label: '2 ans', desc: 'Expiration après 2 ans d\'inactivité' },
              ].map(opt => (
                <div
                  key={opt.id} onClick={() => setExpiration(opt.id as 'never' | '6m' | '1y' | '2y')}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: expiration === opt.id ? '2px solid #4338ca' : '1px solid #e2e8f0',
                    background: expiration === opt.id ? '#eef2ff' : '#fff',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {expiration === opt.id && <CheckCircle2 size={16} style={{ color: '#4338ca' }} />}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Rewards catalog */}
        <motion.div variants={item} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={16} /> Catalogue des récompenses
            </h2>
            <button onClick={() => showToast('Création de récompense...')} style={smallBtnStyle}>
              <Plus size={13} /> Ajouter
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {rewards.map(r => {
              const cat = rewardCatColors[r.category]
              return (
                <motion.div
                  key={r.id} whileHover={{ y: -3 }}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.fg, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {r.category}
                    </span>
                    <span style={{ fontSize: 10, color: r.stock < 5 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                      Stock : {r.stock}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, minHeight: 32 }}>{r.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={14} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{r.cost}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>pts</span>
                    </div>
                    <button onClick={() => showToast(`Récompense "${r.name}" modifiée`)} style={{ ...smallBtnStyle, padding: '4px 8px' }}>
                      <Edit3 size={11} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Members + rules */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 22 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} /> Membres actifs
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Nom', 'Palier', 'Points', 'LTV', 'QR'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const tier = tiers.find(t => t.id === m.tier) || tiers[0]
                    return (
                      <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#fff', background: tier.color }}>
                            {tier.name}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 700 }}>{m.points}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{m.lifetimeValue.toLocaleString('fr-FR')} €</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => setShowQR(m)} style={{ ...smallBtnStyle, padding: '5px 8px' }}>
                            <QrCode size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>Règles &amp; automatisations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rules.map(rule => {
                const Icon = rule.icon
                return (
                  <div key={rule.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: 12, borderRadius: 10, background: rule.enabled ? '#eef2ff' : '#f8fafc',
                    border: `1px solid ${rule.enabled ? '#c7d2fe' : '#e2e8f0'}`,
                  }}>
                    <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: rule.enabled ? '#4338ca' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} style={{ color: '#fff' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{rule.label}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{rule.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      style={{
                        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                        background: rule.enabled ? '#4338ca' : '#cbd5e1', position: 'relative', flexShrink: 0,
                      }}
                    >
                      <motion.div
                        animate={{ left: rule.enabled ? 20 : 2 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2 }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showQR && <QRModal member={showQR} onClose={() => setShowQR(null)} />}
        {showTierEditor && <TierEditor tier={tierToEdit} onClose={() => setShowTierEditor(false)} onSave={saveTier} />}
        {showImport && <ImportModal onClose={() => setShowImport(false)} onToast={showToast} />}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}
