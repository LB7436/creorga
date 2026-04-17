import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────
type MouvementType =
  | 'Ouverture'
  | 'Vente'
  | 'Retrait'
  | 'Entrée espèces'
  | 'Dépôt'
  | 'Pourboire'
  | 'Fermeture'

interface Mouvement {
  id: string
  heure: string
  type: MouvementType
  montant: number
  operateur: string
  notes: string
}

const TYPE_COLORS: Record<MouvementType, { bg: string; border: string; text: string }> = {
  'Ouverture':       { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  'Vente':           { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  'Retrait':         { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  'Entrée espèces':  { bg: '#eef2ff', border: '#c7d2fe', text: '#4f46e5' },
  'Dépôt':           { bg: '#fef3c7', border: '#fde68a', text: '#b45309' },
  'Pourboire':       { bg: '#fdf4ff', border: '#f5d0fe', text: '#a21caf' },
  'Fermeture':       { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
}

const OPERATEURS = ['Marie Klein', 'Lucas Braun', 'Sophie Weber', 'Admin']

const TYPES_MOUVEMENT: MouvementType[] = [
  'Ouverture', 'Vente', 'Retrait', 'Entrée espèces', 'Dépôt', 'Pourboire', 'Fermeture',
]

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_MOUVEMENTS: Mouvement[] = [
  { id: 'm01', heure: '08:02', type: 'Ouverture',      montant: 200,    operateur: 'Marie Klein',  notes: 'Fond de caisse de départ' },
  { id: 'm02', heure: '09:14', type: 'Vente',          montant: 18.50,  operateur: 'Marie Klein',  notes: 'Table 3 — 2 cafés + croissants' },
  { id: 'm03', heure: '09:32', type: 'Vente',          montant: 27.00,  operateur: 'Marie Klein',  notes: 'Table 5 — Petit-déjeuner complet' },
  { id: 'm04', heure: '10:05', type: 'Pourboire',      montant: 5.00,   operateur: 'Marie Klein',  notes: 'Table 3' },
  { id: 'm05', heure: '10:18', type: 'Retrait',        montant: 40.00,  operateur: 'Marie Klein',  notes: 'Achat pain urgence boulangerie' },
  { id: 'm06', heure: '11:22', type: 'Vente',          montant: 54.50,  operateur: 'Lucas Braun',  notes: 'Table 7 — Apéritifs' },
  { id: 'm07', heure: '12:10', type: 'Vente',          montant: 112.80, operateur: 'Lucas Braun',  notes: 'Table 8 — Déjeuner 4 couverts' },
  { id: 'm08', heure: '12:45', type: 'Entrée espèces', montant: 100,    operateur: 'Admin',        notes: 'Apport fond supplémentaire' },
  { id: 'm09', heure: '13:02', type: 'Vente',          montant: 89.00,  operateur: 'Sophie Weber', notes: 'Table 2 — Déjeuner' },
  { id: 'm10', heure: '13:28', type: 'Vente',          montant: 45.60,  operateur: 'Sophie Weber', notes: 'Table 4 — Plats du jour' },
  { id: 'm11', heure: '13:55', type: 'Pourboire',      montant: 8.00,   operateur: 'Lucas Braun',  notes: 'Table 8' },
  { id: 'm12', heure: '14:20', type: 'Vente',          montant: 34.00,  operateur: 'Marie Klein',  notes: 'Bar — Cafés et desserts' },
  { id: 'm13', heure: '15:10', type: 'Retrait',        montant: 25.00,  operateur: 'Admin',        notes: 'Changement coupures' },
  { id: 'm14', heure: '16:15', type: 'Vente',          montant: 22.50,  operateur: 'Sophie Weber', notes: 'Table 1 — Goûter' },
  { id: 'm15', heure: '17:00', type: 'Dépôt',          montant: 300,    operateur: 'Admin',        notes: 'Dépôt banque mi-journée' },
  { id: 'm16', heure: '18:30', type: 'Vente',          montant: 67.00,  operateur: 'Lucas Braun',  notes: 'Terrasse 1 — Apéritifs' },
  { id: 'm17', heure: '19:12', type: 'Vente',          montant: 156.40, operateur: 'Lucas Braun',  notes: 'Table 6 — Dîner 3 couverts' },
  { id: 'm18', heure: '19:45', type: 'Pourboire',      montant: 12.00,  operateur: 'Sophie Weber', notes: 'Table 2' },
  { id: 'm19', heure: '20:20', type: 'Vente',          montant: 203.50, operateur: 'Sophie Weber', notes: 'Table 8 — Dîner groupe' },
  { id: 'm20', heure: '21:15', type: 'Vente',          montant: 89.30,  operateur: 'Lucas Braun',  notes: 'Bar — Cocktails' },
]

const MOCK_HISTORIQUE = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  const ventes = 1400 + Math.round(Math.random() * 900)
  const cashflow = Math.round(ventes * (0.3 + Math.random() * 0.15))
  return {
    date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    ventes,
    cashflow,
  }
})

const MOCK_VENTILATION = [
  { name: 'Espèces',      value: 34, color: '#10b981' },
  { name: 'Carte',        value: 52, color: '#6366f1' },
  { name: 'Sans contact', value: 14, color: '#f59e0b' },
  { name: 'Autre',        value: 0,  color: '#94a3b8' },
]

const MOCK_POURBOIRES_SERVEUR = [
  { nom: 'Marie Klein',  total: 18.50 },
  { nom: 'Lucas Braun',  total: 22.00 },
  { nom: 'Sophie Weber', total: 15.80 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Page ───────────────────────────────────────────────────────────────────
export default function CaissePage() {
  const [caisseOuverte, setCaisseOuverte] = useState(true)
  const [fondCaisse, setFondCaisse] = useState(200)
  const [mouvements, setMouvements] = useState<Mouvement[]>(MOCK_MOUVEMENTS)
  const [filterType, setFilterType] = useState<MouvementType | 'all'>('all')
  const [filterOp, setFilterOp] = useState<string>('all')

  const [showOuvrir, setShowOuvrir] = useState(false)
  const [showRetrait, setShowRetrait] = useState(false)
  const [showEntree, setShowEntree] = useState(false)

  // ── Derived values
  const ventesAujourdhui = useMemo(
    () => mouvements.filter(m => m.type === 'Vente').reduce((s, m) => s + m.montant, 0),
    [mouvements]
  )

  const totalPourboires = useMemo(
    () => mouvements.filter(m => m.type === 'Pourboire').reduce((s, m) => s + m.montant, 0),
    [mouvements]
  )

  const filteredMouvements = useMemo(() => {
    return mouvements.filter(m => {
      if (filterType !== 'all' && m.type !== filterType) return false
      if (filterOp !== 'all' && m.operateur !== filterOp) return false
      return true
    })
  }, [mouvements, filterType, filterOp])

  // ── Actions
  const handleOuvrir = (fond: number) => {
    setFondCaisse(fond)
    setCaisseOuverte(true)
    setMouvements(prev => [
      {
        id: `o${Date.now()}`,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        type: 'Ouverture',
        montant: fond,
        operateur: 'Admin',
        notes: 'Fond de caisse de départ',
      },
      ...prev,
    ])
    setShowOuvrir(false)
  }

  const handleAjoutMouvement = (type: MouvementType, montant: number, motif: string, justif: string) => {
    setMouvements(prev => [
      {
        id: `mv${Date.now()}`,
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        type,
        montant,
        operateur: 'Admin',
        notes: `${motif}${justif ? ' — ' + justif : ''}`,
      },
      ...prev,
    ])
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '24px 32px',
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#0f172a',
    }}>
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
            Comptabilité · Caisse
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
            Gestion de la caisse
          </h1>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowEntree(true)}
            disabled={!caisseOuverte}
            style={btnSecondary(!caisseOuverte)}
          >
            + Entrée d'argent
          </button>
          <button
            onClick={() => setShowRetrait(true)}
            disabled={!caisseOuverte}
            style={btnDanger(!caisseOuverte)}
          >
            − Sortie d'argent
          </button>
        </div>
      </motion.div>

      {/* ─── Stats cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="État caisse"
          value={caisseOuverte ? 'Ouverte' : 'Fermée'}
          badge={caisseOuverte ? { bg: '#dcfce7', fg: '#15803d' } : { bg: '#fee2e2', fg: '#991b1b' }}
          icon="🔒"
        />
        <StatCard label="Fond de caisse" value={`${fmt(fondCaisse)} €`} icon="💵" hint="Départ matin" />
        <StatCard label="Ventes aujourd'hui" value={`${fmt(ventesAujourdhui)} €`} icon="📈" hint={`${mouvements.filter(m => m.type === 'Vente').length} transactions`} accent="#16a34a" />
        <StatCard label="Écart dernière clôture" value="0,00 €" icon="✓" hint="Aucun écart" accent="#0ea5e9" />
      </div>

      {/* ─── Action principale ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {caisseOuverte ? 'La caisse est ouverte' : 'La caisse est fermée'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            {caisseOuverte
              ? 'Vous pouvez enregistrer des ventes, des retraits et des entrées. Pour clôturer la journée, procédez à la fermeture.'
              : 'Ouvrez la caisse pour démarrer votre journée. Un fond de départ vous sera demandé.'}
          </div>
        </div>
        {caisseOuverte ? (
          <button
            onClick={() => { alert('Redirection vers ClosurePage (clôture Z)'); setCaisseOuverte(false) }}
            style={{
              padding: '14px 28px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            Fermer la caisse →
          </button>
        ) : (
          <button
            onClick={() => setShowOuvrir(true)}
            style={{
              padding: '16px 36px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(5,150,105,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir la caisse
          </button>
        )}
      </motion.div>

      {/* ─── Row: historique 30j + ventilation ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card title="Historique 30 jours" subtitle="Ventes quotidiennes & flux de caisse">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={MOCK_HISTORIQUE}>
                <defs>
                  <linearGradient id="gradVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                    fontSize: 12, boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                  }}
                  formatter={(v: number) => `${fmt(v)} €`}
                />
                <Area type="monotone" dataKey="ventes"   stroke="#6366f1" strokeWidth={2} fill="url(#gradVentes)" name="Ventes" />
                <Area type="monotone" dataKey="cashflow" stroke="#10b981" strokeWidth={2} fill="url(#gradCash)"   name="Cash-flow" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Ventilation paiements" subtitle="Aujourd'hui">
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={MOCK_VENTILATION.filter(d => d.value > 0)}
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {MOCK_VENTILATION.filter(d => d.value > 0).map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 8 }}>
            {MOCK_VENTILATION.map(v => (
              <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, display: 'inline-block' }} />
                  {v.name}
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{v.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── Pourboires ─── */}
      <Card
        title="Pourboires"
        subtitle={`Total aujourd'hui : ${fmt(totalPourboires)} €`}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {MOCK_POURBOIRES_SERVEUR.map(p => (
            <div key={p.nom} style={{
              padding: '14px 16px',
              background: '#fdf4ff',
              border: '1px solid #f5d0fe',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#86198f', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>Serveur</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{p.nom}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#a21caf' }}>{fmt(p.total)} €</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Mouvements de caisse ─── */}
      <Card
        title="Mouvements de caisse"
        subtitle={`${filteredMouvements.length} mouvement(s) ${filterType !== 'all' || filterOp !== 'all' ? '(filtrés)' : 'aujourd\'hui'}`}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as MouvementType | 'all')}
              style={selectStyle}
            >
              <option value="all">Tous les types</option>
              {TYPES_MOUVEMENT.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterOp}
              onChange={e => setFilterOp(e.target.value)}
              style={selectStyle}
            >
              <option value="all">Tous les opérateurs</option>
              {OPERATEURS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={th}>Heure</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Montant</th>
                <th style={th}>Opérateur</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMouvements.map((m, idx) => {
                const c = TYPE_COLORS[m.type]
                const isNeg = m.type === 'Retrait' || m.type === 'Dépôt'
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9', background: idx % 2 ? '#fdfdfd' : '#fff' }}>
                    <td style={td}><span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b' }}>{m.heure}</span></td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                      }}>
                        {m.type}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: isNeg ? '#dc2626' : '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                      {isNeg ? '−' : '+'} {fmt(m.montant)} €
                    </td>
                    <td style={td}>{m.operateur}</td>
                    <td style={{ ...td, color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notes}</td>
                  </tr>
                )
              })}
              {filteredMouvements.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Aucun mouvement ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Z-report preview ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
            Prévisualisation Z-Report
          </div>
          <div style={{ fontSize: 13, color: '#3730a3' }}>
            Générez le rapport de clôture détaillé de la journée pour archivage comptable.
          </div>
        </div>
        <button
          onClick={() => alert('Redirection vers ClosurePage')}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Voir Z-Report →
        </button>
      </div>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showOuvrir && (
          <OuvrirModal onClose={() => setShowOuvrir(false)} onConfirm={handleOuvrir} />
        )}
        {showRetrait && (
          <MouvementModal
            title="Sortie d'argent (retrait)"
            color="#dc2626"
            motifs={['Achat urgent', 'Changement coupures', 'Autre']}
            onClose={() => setShowRetrait(false)}
            onConfirm={(montant, motif, justif) => {
              handleAjoutMouvement('Retrait', montant, motif, justif)
              setShowRetrait(false)
            }}
          />
        )}
        {showEntree && (
          <MouvementModal
            title="Entrée d'argent"
            color="#4f46e5"
            motifs={['Apport complémentaire', 'Remboursement', 'Autre']}
            onClose={() => setShowEntree(false)}
            onConfirm={(montant, motif, justif) => {
              handleAjoutMouvement('Entrée espèces', montant, motif, justif)
              setShowEntree(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, hint, icon, badge, accent,
}: {
  label: string
  value: string
  hint?: string
  icon?: string
  badge?: { bg: string; fg: string }
  accent?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      {badge ? (
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          borderRadius: 999,
          background: badge.bg,
          color: badge.fg,
          fontSize: 15,
          fontWeight: 800,
        }}>
          ● {value}
        </div>
      ) : (
        <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? '#0f172a', letterSpacing: -0.5 }}>
          {value}
        </div>
      )}
      {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{hint}</div>}
    </motion.div>
  )
}

// ─── Generic card ───────────────────────────────────────────────────────────
function Card({
  title, subtitle, extra, children, style,
}: {
  title: string
  subtitle?: string
  extra?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 18,
      boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {extra}
      </div>
      {children}
    </div>
  )
}

// ─── Ouvrir caisse modal ────────────────────────────────────────────────────
function OuvrirModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (fond: number) => void }) {
  const [fond, setFond] = useState('200')
  return (
    <ModalShell onClose={onClose} title="Ouvrir la caisse" icon="🔓" color="#059669">
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
        Saisissez le fond de caisse de départ (espèces disponibles dans le tiroir).
      </div>
      <label style={labelStyle}>Fond de caisse (€)</label>
      <input
        type="number"
        value={fond}
        onChange={e => setFond(e.target.value)}
        style={inputStyle}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnGhost}>Annuler</button>
        <button
          onClick={() => onConfirm(Number(fond) || 0)}
          style={{ ...btnPrimary, background: '#059669' }}
        >
          Ouvrir la caisse
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Mouvement modal (retrait / entrée) ─────────────────────────────────────
function MouvementModal({
  title, color, motifs, onClose, onConfirm,
}: {
  title: string
  color: string
  motifs: string[]
  onClose: () => void
  onConfirm: (montant: number, motif: string, justif: string) => void
}) {
  const [montant, setMontant] = useState('')
  const [motif, setMotif] = useState(motifs[0])
  const [justif, setJustif] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!montant || Number(montant) <= 0) { setError('Montant invalide'); return }
    if (pin !== '0000') { setError('PIN manager incorrect (indice : 0000)'); return }
    onConfirm(Number(montant), motif, justif)
  }

  return (
    <ModalShell onClose={onClose} title={title} icon="💼" color={color}>
      <label style={labelStyle}>Montant (€)</label>
      <input
        type="number"
        value={montant}
        onChange={e => { setMontant(e.target.value); setError('') }}
        style={inputStyle}
        autoFocus
      />

      <label style={labelStyle}>Motif</label>
      <select value={motif} onChange={e => setMotif(e.target.value)} style={inputStyle}>
        {motifs.map(m => <option key={m} value={m}>{m}</option>)}
      </select>

      <label style={labelStyle}>Justification</label>
      <textarea
        value={justif}
        onChange={e => setJustif(e.target.value)}
        rows={3}
        placeholder="Détails du mouvement..."
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
      />

      <label style={labelStyle}>Validation manager (PIN)</label>
      <input
        type="password"
        value={pin}
        onChange={e => { setPin(e.target.value); setError('') }}
        placeholder="••••"
        maxLength={4}
        style={{ ...inputStyle, letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
      />

      {error && (
        <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnGhost}>Annuler</button>
        <button onClick={submit} style={{ ...btnPrimary, background: color }}>
          Valider
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Modal shell ────────────────────────────────────────────────────────────
function ModalShell({
  onClose, title, icon, color, children,
}: {
  onClose: () => void
  title: string
  icon?: string
  color?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20, backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          width: 'min(460px, 100%)',
          boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
          {icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>{icon}</div>
          )}
          <div style={{ fontSize: 17, fontWeight: 800, flex: 1 }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer',
            color: '#94a3b8', width: 32, height: 32, borderRadius: 8,
          }}>×</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────
const th: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#0f172a' }

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  fontSize: 13,
  color: '#0f172a',
  cursor: 'pointer',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
  marginTop: 12,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 14,
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  background: '#f1f5f9',
  color: '#475569',
  fontWeight: 600,
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
}

const btnSecondary = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  borderRadius: 10,
  background: disabled ? '#f1f5f9' : '#eef2ff',
  color: disabled ? '#94a3b8' : '#4f46e5',
  fontWeight: 700,
  fontSize: 13,
  border: `1px solid ${disabled ? '#e2e8f0' : '#c7d2fe'}`,
  cursor: disabled ? 'not-allowed' : 'pointer',
})

const btnDanger = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  borderRadius: 10,
  background: disabled ? '#f1f5f9' : '#fef2f2',
  color: disabled ? '#94a3b8' : '#dc2626',
  fontWeight: 700,
  fontSize: 13,
  border: `1px solid ${disabled ? '#e2e8f0' : '#fecaca'}`,
  cursor: disabled ? 'not-allowed' : 'pointer',
})
