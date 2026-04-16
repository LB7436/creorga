import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Unlock,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Heart,
  PercentCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Coins,
  Printer,
  FileDown,
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
} from 'lucide-react'

/* ─── Animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

/* ─── Shared styles ─── */
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: '24px',
}
const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: 20,
}
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: '1px solid rgba(0,0,0,0.06)',
}
const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: '#1e293b',
  borderBottom: '1px solid rgba(0,0,0,0.03)',
}

/* ─── Mock data ─── */
const mockPaiements = [
  { mode: 'Espèces', icon: Banknote, transactions: 34, montant: 987.5, color: '#10b981' },
  { mode: 'Carte bancaire', icon: CreditCard, transactions: 28, montant: 1456.0, color: '#3b82f6' },
  { mode: 'Sans contact', icon: Smartphone, transactions: 15, montant: 404.0, color: '#8b5cf6' },
]

const mockHistorique = [
  { date: '15/04/2026', heure: '22:15', operateur: 'Marie L.', ca: 3120.8, ecart: 0.0, statut: 'Validée' },
  { date: '14/04/2026', heure: '22:30', operateur: 'Bryan D.', ca: 2654.2, ecart: -2.5, statut: 'Écart' },
  { date: '13/04/2026', heure: '21:45', operateur: 'Marie L.', ca: 1987.0, ecart: 0.0, statut: 'Validée' },
  { date: '12/04/2026', heure: '22:00', operateur: 'Sophie R.', ca: 4215.6, ecart: 1.2, statut: 'Écart' },
  { date: '11/04/2026', heure: '21:30', operateur: 'Bryan D.', ca: 2890.4, ecart: 0.0, statut: 'Validée' },
]

/* ─── Cash denominations (EUR) ─── */
const billets = [
  { label: '500 €', value: 500 },
  { label: '200 €', value: 200 },
  { label: '100 €', value: 100 },
  { label: '50 €', value: 50 },
  { label: '20 €', value: 20 },
  { label: '10 €', value: 10 },
  { label: '5 €', value: 5 },
]
const pieces = [
  { label: '2 €', value: 2 },
  { label: '1 €', value: 1 },
  { label: '50 c', value: 0.5 },
  { label: '20 c', value: 0.2 },
  { label: '10 c', value: 0.1 },
  { label: '5 c', value: 0.05 },
  { label: '2 c', value: 0.02 },
  { label: '1 c', value: 0.01 },
]

/* ─── TVA breakdown (Luxembourg rates) ─── */
const tvaBreakdown = [
  { taux: '3%', ht: 820.39, tva: 24.61, ttc: 845.0 },
  { taux: '8%', ht: 648.15, tva: 51.85, ttc: 700.0 },
  { taux: '14%', ht: 500.0, tva: 70.0, ttc: 570.0 },
  { taux: '17%', ht: 625.64, tva: 106.86, ttc: 732.5 },
]

const categorieBreakdown = [
  { nom: 'Boissons', montant: 1124.0 },
  { nom: 'Cuisine', montant: 1389.5 },
  { nom: 'Desserts', montant: 334.0 },
]

/* ─── Component ─── */
export default function CloturePage() {
  const [caisseOuverte, setCaisseOuverte] = useState(true)
  const [cashCounts, setCashCounts] = useState<Record<string, number>>({})
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)
  const [showZReport, setShowZReport] = useState(false)

  const fondDeCaisse = 200.0
  const esperees = 987.5
  const caJour = 2847.5
  const nbTransactions = 47
  const panierMoyen = 60.58
  const pourboires = 124.0
  const remises = -89.5
  const totalPaiements = mockPaiements.reduce((s, p) => s + p.montant, 0)
  const totalTransPaiements = mockPaiements.reduce((s, p) => s + p.transactions, 0)

  const totalCompte = useMemo(() => {
    let total = 0
    ;[...billets, ...pieces].forEach(d => {
      const qty = cashCounts[d.label] || 0
      total += qty * d.value
    })
    return Math.round(total * 100) / 100
  }, [cashCounts])

  const ecart = Math.round((totalCompte - fondDeCaisse - esperees) * 100) / 100

  const handleCountChange = (label: string, val: string) => {
    const n = parseInt(val, 10)
    setCashCounts(prev => ({ ...prev, [label]: isNaN(n) || n < 0 ? 0 : n }))
  }

  const statsCards = [
    { label: 'CA du jour', value: `${caJour.toFixed(2).replace('.', ',')} €`, icon: TrendingUp, color: '#3b82f6' },
    { label: 'Transactions', value: nbTransactions.toString(), icon: Receipt, color: '#8b5cf6' },
    { label: 'Panier moyen', value: `${panierMoyen.toFixed(2).replace('.', ',')} €`, icon: ShoppingCart, color: '#f59e0b' },
    { label: 'Pourboires', value: `${pourboires.toFixed(2).replace('.', ',')} €`, icon: Heart, color: '#10b981' },
    { label: 'Remises', value: `${remises.toFixed(2).replace('.', ',')} €`, icon: PercentCircle, color: '#ef4444' },
  ]

  const formatEur = (n: number) => n.toFixed(2).replace('.', ',') + ' €'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
            Clôture de caisse
          </h1>
          <p style={{ fontSize: 15, color: '#475569', marginBottom: 6 }}>
            Mercredi 16 avril 2026
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: caisseOuverte ? '#10b981' : '#ef4444',
            }} />
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
              {caisseOuverte ? 'Caisse ouverte depuis 08:00' : 'Caisse fermée'}
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setCaisseOuverte(!caisseOuverte)}
          style={{
            padding: '12px 28px',
            borderRadius: 14,
            border: 'none',
            background: caisseOuverte ? '#ef4444' : '#10b981',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: caisseOuverte
              ? '0 4px 14px rgba(239,68,68,0.3)'
              : '0 4px 14px rgba(16,185,129,0.3)',
          }}
        >
          {caisseOuverte ? <Lock size={18} /> : <Unlock size={18} />}
          {caisseOuverte ? 'Fermer la caisse' : 'Ouvrir la caisse'}
        </motion.button>
      </motion.div>

      {/* ═══════════════ SECTION 1: Résumé de la journée ═══════════════ */}
      <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
        <h2 style={sectionTitle}>Résumé de la journée</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {statsCards.map(stat => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
              style={{ ...cardStyle, transition: 'box-shadow 0.2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: `${stat.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{stat.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════ SECTION 2: Ventilation des paiements ═══════════════ */}
      <motion.div variants={itemVariants} style={{ ...cardStyle, marginBottom: 28 }}>
        <h2 style={sectionTitle}>Ventilation des paiements</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Mode de paiement', 'Transactions', 'Montant'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockPaiements.map(p => (
              <tr key={p.mode}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${p.color}14`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p.icon size={18} style={{ color: p.color }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{p.mode}</span>
                  </div>
                </td>
                <td style={tdStyle}>{p.transactions}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatEur(p.montant)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>Total</td>
              <td style={{ ...tdStyle, fontWeight: 700, fontSize: 15 }}>{totalTransPaiements}</td>
              <td style={{ ...tdStyle, fontWeight: 800, fontSize: 15, color: '#3b82f6' }}>
                {formatEur(totalPaiements)}
              </td>
            </tr>
          </tbody>
        </table>
      </motion.div>

      {/* ═══════════════ SECTION 3: Comptage des espèces ═══════════════ */}
      <motion.div variants={itemVariants} style={{ ...cardStyle, marginBottom: 28 }}>
        <h2 style={sectionTitle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Coins size={22} style={{ color: '#f59e0b' }} />
            Comptage des espèces
          </div>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Billets */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Billets
            </h3>
            {billets.map(b => {
              const qty = cashCounts[b.label] || 0
              const sub = qty * b.value
              return (
                <div key={b.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: 8, padding: '6px 0',
                }}>
                  <span style={{ width: 60, fontSize: 15, fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>
                    {b.label}
                  </span>
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>&times;</span>
                  <input
                    type="number"
                    min={0}
                    value={qty || ''}
                    onChange={e => handleCountChange(b.label, e.target.value)}
                    placeholder="0"
                    style={{
                      width: 80, height: 50, borderRadius: 12,
                      border: '2px solid #e2e8f0', textAlign: 'center',
                      fontSize: 18, fontWeight: 700, color: '#1e293b',
                      outline: 'none', background: '#f8fafc',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>=</span>
                  <span style={{ width: 90, fontSize: 15, fontWeight: 600, color: sub > 0 ? '#1e293b' : '#cbd5e1', textAlign: 'right' }}>
                    {formatEur(sub)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pièces */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Pièces
            </h3>
            {pieces.map(p => {
              const qty = cashCounts[p.label] || 0
              const sub = Math.round(qty * p.value * 100) / 100
              return (
                <div key={p.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: 8, padding: '6px 0',
                }}>
                  <span style={{ width: 60, fontSize: 15, fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>&times;</span>
                  <input
                    type="number"
                    min={0}
                    value={qty || ''}
                    onChange={e => handleCountChange(p.label, e.target.value)}
                    placeholder="0"
                    style={{
                      width: 80, height: 50, borderRadius: 12,
                      border: '2px solid #e2e8f0', textAlign: 'center',
                      fontSize: 18, fontWeight: 700, color: '#1e293b',
                      outline: 'none', background: '#f8fafc',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>=</span>
                  <span style={{ width: 90, fontSize: 15, fontWeight: 600, color: sub > 0 ? '#1e293b' : '#cbd5e1', textAlign: 'right' }}>
                    {formatEur(sub)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary row */}
        <div style={{
          marginTop: 28, padding: 24, borderRadius: 16,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>TOTAL COMPTÉ</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{formatEur(totalCompte)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>FOND DE CAISSE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#475569' }}>{formatEur(fondDeCaisse)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>ESPÈCES ATTENDUES</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#475569' }}>{formatEur(esperees)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>ÉCART</div>
            <div style={{
              fontSize: 28, fontWeight: 800,
              color: ecart === 0 ? '#10b981' : '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {ecart === 0 ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              {ecart >= 0 ? '+' : ''}{formatEur(ecart)}
            </div>
            <div style={{
              marginTop: 6, fontSize: 13, fontWeight: 600,
              color: ecart === 0 ? '#10b981' : '#ef4444',
            }}>
              {ecart === 0 ? 'Caisse équilibrée' : `L'écart est de ${Math.abs(ecart).toFixed(2).replace('.', ',')} €`}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ SECTION 4: Ticket Z ═══════════════ */}
      <motion.div variants={itemVariants} style={{ ...cardStyle, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Ticket Z (Z-Report)</h2>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowZReport(!showZReport)}
            style={{
              padding: '8px 20px', borderRadius: 10,
              border: '1px solid #e2e8f0', background: '#fff',
              fontSize: 13, fontWeight: 600, color: '#475569',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {showZReport ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showZReport ? 'Masquer' : 'Aperçu'}
          </motion.button>
        </div>

        <AnimatePresence>
          {showZReport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                maxWidth: 420, margin: '0 auto', padding: 32,
                background: '#fefefe', border: '2px dashed #d1d5db',
                borderRadius: 12, fontFamily: '"Courier New", Courier, monospace',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>TICKET Z</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>CLÔTURE DE CAISSE</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    {'='.repeat(40)}
                  </div>
                </div>

                <div style={{ fontSize: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date :</span><span>16/04/2026</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Heure :</span><span>22:00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Opérateur :</span><span>Bryan D.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Caisse :</span><span>CAISSE-01</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                  {'-'.repeat(40)}
                </div>

                {/* TVA */}
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>VENTILATION TVA</div>
                <div style={{ fontSize: 11, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#475569' }}>
                    <span style={{ width: 50 }}>Taux</span>
                    <span style={{ width: 80, textAlign: 'right' }}>HT</span>
                    <span style={{ width: 70, textAlign: 'right' }}>TVA</span>
                    <span style={{ width: 80, textAlign: 'right' }}>TTC</span>
                  </div>
                </div>
                {tvaBreakdown.map(t => (
                  <div key={t.taux} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ width: 50 }}>{t.taux}</span>
                    <span style={{ width: 80, textAlign: 'right' }}>{formatEur(t.ht)}</span>
                    <span style={{ width: 70, textAlign: 'right' }}>{formatEur(t.tva)}</span>
                    <span style={{ width: 80, textAlign: 'right' }}>{formatEur(t.ttc)}</span>
                  </div>
                ))}

                <div style={{ fontSize: 11, color: '#64748b', margin: '12px 0' }}>
                  {'-'.repeat(40)}
                </div>

                {/* Catégories */}
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>PAR CATÉGORIE</div>
                {categorieBreakdown.map(c => (
                  <div key={c.nom} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span>{c.nom}</span>
                    <span>{formatEur(c.montant)}</span>
                  </div>
                ))}

                <div style={{ fontSize: 11, color: '#64748b', margin: '12px 0' }}>
                  {'-'.repeat(40)}
                </div>

                {/* Paiements */}
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>PAIEMENTS</div>
                {mockPaiements.map(p => (
                  <div key={p.mode} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span>{p.mode} ({p.transactions})</span>
                    <span>{formatEur(p.montant)}</span>
                  </div>
                ))}

                <div style={{ fontSize: 11, color: '#64748b', margin: '12px 0' }}>
                  {'='.repeat(40)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                  <span>GRAND TOTAL</span>
                  <span>{formatEur(caJour)}</span>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#94a3b8' }}>
                  <div>Creorga POS</div>
                  <div style={{ marginTop: 2 }}>Merci et à demain !</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 24px', borderRadius: 12,
                    border: 'none', background: '#1e293b', color: '#fff',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Printer size={16} />
                  Imprimer le ticket Z
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 24px', borderRadius: 12,
                    border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <FileDown size={16} />
                  Exporter en PDF
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══════════════ SECTION 5: Historique des clôtures ═══════════════ */}
      <motion.div variants={itemVariants} style={{ ...cardStyle }}>
        <h2 style={sectionTitle}>Historique des clôtures</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Heure', 'Opérateur', 'Chiffre d\'affaires', 'Écart espèces', 'Statut', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockHistorique.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  background: expandedHistory === idx ? '#f8fafc' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onClick={() => setExpandedHistory(expandedHistory === idx ? null : idx)}
                onMouseEnter={e => { if (expandedHistory !== idx) (e.currentTarget as HTMLElement).style.background = '#fafbfc' }}
                onMouseLeave={e => { if (expandedHistory !== idx) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} style={{ color: '#94a3b8' }} />
                    {row.date}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} style={{ color: '#94a3b8' }} />
                    {row.heure}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} style={{ color: '#94a3b8' }} />
                    {row.operateur}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{formatEur(row.ca)}</td>
                <td style={tdStyle}>
                  <span style={{
                    fontWeight: 700,
                    color: row.ecart === 0 ? '#10b981' : '#ef4444',
                  }}>
                    {row.ecart === 0 ? '0,00 €' : `${row.ecart > 0 ? '+' : ''}${row.ecart.toFixed(2).replace('.', ',')} €`}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    color: row.statut === 'Validée' ? '#10b981' : '#f59e0b',
                    background: row.statut === 'Validée' ? '#10b98115' : '#f59e0b15',
                  }}>
                    {row.statut === 'Validée' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {row.statut}
                  </span>
                </td>
                <td style={tdStyle}>
                  <Eye size={16} style={{ color: '#94a3b8' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {expandedHistory !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16, padding: 20, borderRadius: 12,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                Détail de la clôture du {mockHistorique[expandedHistory].date}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setExpandedHistory(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: 13 }}>
              <div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>CA total</div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{formatEur(mockHistorique[expandedHistory].ca)}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>Opérateur</div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{mockHistorique[expandedHistory].operateur}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>Écart</div>
                <div style={{
                  fontWeight: 700,
                  color: mockHistorique[expandedHistory].ecart === 0 ? '#10b981' : '#ef4444',
                }}>
                  {formatEur(mockHistorique[expandedHistory].ecart)}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>Statut</div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{mockHistorique[expandedHistory].statut}</div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
