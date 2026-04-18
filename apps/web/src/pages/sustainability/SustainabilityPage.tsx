import { useState } from 'react'
import { motion } from 'framer-motion'

interface Certif {
  id: string
  nom: string
  organisme: string
  obtenu: string
  expire: string
  statut: 'valide' | 'expire_bientot' | 'expire'
}

interface Action {
  id: string
  titre: string
  description: string
  impact: string
  difficulte: 'facile' | 'moyen' | 'complexe'
  roi: number
  done: boolean
}

const colors = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#16a34a',
  primaryLight: '#dcfce7',
  primaryDark: '#14532d',
  info: '#0284c7',
  infoLight: '#e0f2fe',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  earth: '#a16207',
  earthLight: '#fef3c7',
}

const INITIAL_CERTIFS: Certif[] = [
  { id: 'C1', nom: 'Ecolabel EU', organisme: 'Commission Européenne', obtenu: '2024-03', expire: '2027-03', statut: 'valide' },
  { id: 'C2', nom: 'Bio Luxembourg', organisme: 'IBLA', obtenu: '2023-06', expire: '2026-06', statut: 'expire_bientot' },
  { id: 'C3', nom: 'Fair-trade', organisme: 'Max Havelaar', obtenu: '2024-09', expire: '2027-09', statut: 'valide' },
  { id: 'C4', nom: 'ISO 14001', organisme: 'Bureau Veritas', obtenu: '2022-11', expire: '2025-11', statut: 'expire_bientot' },
]

const INITIAL_ACTIONS: Action[] = [
  { id: 'A1', titre: 'Passer aux LED', description: 'Remplacer les 42 ampoules halogènes par des LED', impact: '−340 €/an', difficulte: 'facile', roi: 14, done: false },
  { id: 'A2', titre: 'Composter biodéchets', description: 'Installer composteur et trier biodéchets cuisine', impact: '−18% déchets', difficulte: 'moyen', roi: 8, done: false },
  { id: 'A3', titre: 'Fournisseur local viande', description: 'Boucherie Moselle à 32 km au lieu de Belgique', impact: '−210 kg CO2/mois', difficulte: 'facile', roi: 3, done: true },
  { id: 'A4', titre: 'Récupération eau de pluie', description: 'Cuves 2000 L pour nettoyage terrasse', impact: '−8 m³ eau/mois', difficulte: 'complexe', roi: 24, done: false },
  { id: 'A5', titre: 'Menu végétarien du jour', description: 'Proposer option veggie chaque jour', impact: '−15% CO2/couvert', difficulte: 'moyen', roi: 6, done: true },
  { id: 'A6', titre: 'Isolation cuisine', description: 'Porte frigo avec joints thermiques', impact: '−90 €/an', difficulte: 'facile', roi: 11, done: false },
]

const MOIS_CO2 = [
  { mois: 'Mai', val: 1.45 }, { mois: 'Juin', val: 1.52 },
  { mois: 'Juil', val: 1.8 }, { mois: 'Août', val: 1.75 },
  { mois: 'Sept', val: 1.48 }, { mois: 'Oct', val: 1.35 },
  { mois: 'Nov', val: 1.42 }, { mois: 'Déc', val: 1.68 },
  { mois: 'Jan', val: 1.38 }, { mois: 'Fév', val: 1.28 },
  { mois: 'Mar', val: 1.22 }, { mois: 'Avr', val: 1.2 },
]

const SOURCES_CO2 = [
  { nom: 'Énergie', val: 420, pct: 35, color: '#dc2626' },
  { nom: 'Alimentation', val: 480, pct: 40, color: '#ea580c' },
  { nom: 'Transport', val: 180, pct: 15, color: '#eab308' },
  { nom: 'Déchets', val: 120, pct: 10, color: '#a855f7' },
]

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export default function SustainabilityPage() {
  const [tab, setTab] = useState<'dashboard' | 'consommation' | 'dechets' | 'sourcing' | 'certifs' | 'actions'>('dashboard')
  const [actions, setActions] = useState<Action[]>(INITIAL_ACTIONS)
  const [greenMenu, setGreenMenu] = useState(true)

  const toggleAction = (id: string) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, done: !a.done } : a)))
  }

  const stats = [
    { label: 'CO2 émis ce mois', value: '1.2 t', delta: '−12% vs moyenne HORECA', color: colors.primary },
    { label: 'Énergie', value: '450 kWh', delta: '−8% vs mois dernier', color: colors.warning },
    { label: 'Eau', value: '18 m³', delta: 'Stable', color: colors.info },
    { label: 'Déchets', value: '85 kg', delta: '72% triés', color: colors.earth },
  ]

  const maxCO2 = Math.max(...MOIS_CO2.map((m) => m.val))

  const certifColor = (s: string) =>
    s === 'valide' ? colors.primary : s === 'expire_bientot' ? colors.warning : colors.danger
  const certifBg = (s: string) =>
    s === 'valide' ? colors.primaryLight : s === 'expire_bientot' ? colors.warningLight : colors.dangerLight

  const sourcing = [
    { label: 'Produits locaux (< 50km)', pct: 62, color: colors.primary },
    { label: 'Produits bio', pct: 45, color: colors.earth },
    { label: 'Produits de saison', pct: 78, color: colors.info },
  ]

  const wasteData = [
    { label: 'Verre', kg: 28, color: '#059669' },
    { label: 'Plastique', kg: 12, color: '#dc2626' },
    { label: 'Papier/Carton', kg: 18, color: '#ca8a04' },
    { label: 'Biodéchets', kg: 22, color: '#a16207' },
    { label: 'Résiduel', kg: 5, color: '#64748b' },
  ]
  const totalWaste = wasteData.reduce((a, w) => a + w.kg, 0)

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24, color: colors.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <motion.div {...fadeIn} style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Durabilité & Impact Environnemental</h1>
            <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>
              Suivi RSE & empreinte carbone — conforme CSRD 2026
            </p>
          </div>
          <button
            style={{
              padding: '10px 16px',
              background: colors.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Exporter rapport RSE (CSRD)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '24px 0' }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: 500 }}>{s.delta}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border}`, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['dashboard', 'consommation', 'dechets', 'sourcing', 'certifs', 'actions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${colors.primary}` : '2px solid transparent',
                color: tab === t ? colors.primary : colors.textMuted,
                fontWeight: tab === t ? 600 : 500,
                cursor: 'pointer',
                fontSize: 14,
                textTransform: 'capitalize',
              }}
            >
              {t === 'dashboard' ? 'Empreinte carbone' : t === 'consommation' ? 'Consommations' : t === 'dechets' ? 'Déchets' : t === 'sourcing' ? 'Approvisionnement' : t === 'certifs' ? 'Certifications' : 'Actions recommandées'}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <motion.div {...fadeIn}>
            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Évolution CO2 — 12 mois (tonnes)</h2>
                <div style={{ fontSize: 13, color: colors.textMuted }}>Objectif annuel: <strong style={{ color: colors.primary }}>15 t</strong> — Réalisé: <strong>17.5 t</strong></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220, padding: '0 10px' }}>
                {MOIS_CO2.map((m, i) => (
                  <div key={m.mois} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.val / maxCO2) * 100}%` }}
                      transition={{ delay: i * 0.04, duration: 0.5 }}
                      style={{
                        width: '100%',
                        background: `linear-gradient(to top, ${colors.primary}, #4ade80)`,
                        borderRadius: '6px 6px 0 0',
                        position: 'relative',
                        minHeight: 4,
                      }}
                    >
                      <div style={{ position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: colors.textMuted }}>
                        {m.val.toFixed(1)}
                      </div>
                    </motion.div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>{m.mois}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 24,
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Sources d'émissions (kg CO2)</h3>
                {SOURCES_CO2.map((s) => (
                  <div key={s.nom} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{s.nom}</span>
                      <span style={{ fontWeight: 600 }}>{s.val} kg ({s.pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.6 }}
                        style={{ height: '100%', background: s.color, borderRadius: 4 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 24,
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Comparaison HORECA Luxembourg</h3>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Votre restaurant</div>
                  <div style={{ height: 30, background: '#f1f5f9', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 0.8 }}
                      style={{ height: '100%', background: colors.primary, borderRadius: 6 }}
                    />
                    <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 13, color: '#fff', fontWeight: 600 }}>1.2 t</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Moyenne secteur</div>
                  <div style={{ height: 30, background: '#f1f5f9', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      style={{ height: '100%', background: '#94a3b8', borderRadius: 6 }}
                    />
                    <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 13, color: '#fff', fontWeight: 600 }}>1.5 t</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: colors.primaryLight, borderRadius: 8, fontSize: 13, color: colors.primaryDark }}>
                  Vous êtes <strong>20% sous la moyenne</strong> du secteur HORECA LU.
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 20,
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>CO2 par plat & badge "Plat vert"</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13 }}>Afficher badges sur menu</span>
                  <button
                    onClick={() => setGreenMenu(!greenMenu)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: greenMenu ? colors.primary : '#cbd5e1',
                      border: 'none', position: 'relative', cursor: 'pointer',
                    }}
                  >
                    <motion.div animate={{ x: greenMenu ? 22 : 2 }} style={{ position: 'absolute', top: 2, width: 20, height: 20, background: '#fff', borderRadius: '50%' }} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { plat: 'Salade de chèvre chaud', co2: 0.8, green: true },
                  { plat: 'Risotto aux légumes', co2: 1.1, green: true },
                  { plat: 'Entrecôte frites', co2: 4.2, green: false },
                  { plat: 'Saumon grillé', co2: 2.1, green: false },
                  { plat: 'Burger végé', co2: 0.9, green: true },
                  { plat: 'Escalope milanaise', co2: 2.8, green: false },
                ].map((p) => (
                  <div key={p.plat} style={{
                    padding: 12,
                    background: '#fafafa',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.plat}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{p.co2} kg CO2</div>
                    </div>
                    {greenMenu && p.green && (
                      <div style={{
                        padding: '3px 8px',
                        background: colors.primaryLight,
                        color: colors.primary,
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        PLAT VERT
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'consommation' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Électricité', val: '450 kWh', trend: '−8%', source: 'EnergieCom', color: colors.warning, detail: '0.12€/kWh — 54€ mois' },
              { label: 'Gaz naturel', val: '128 m³', trend: '+3%', source: 'Sudgaz', color: colors.danger, detail: 'Chauffage + cuisson' },
              { label: 'Eau potable', val: '18 m³', trend: 'Stable', source: 'Ville', color: colors.info, detail: '32€ mois' },
            ].map((c) => (
              <div key={c.label} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ fontSize: 13, color: colors.textMuted }}>{c.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: c.color, margin: '8px 0' }}>{c.val}</div>
                <div style={{ fontSize: 12, color: colors.primary, marginBottom: 8 }}>{c.trend} vs mois dernier</div>
                <div style={{ padding: 10, background: '#fafafa', borderRadius: 8, fontSize: 12, color: colors.textMuted }}>
                  <div style={{ fontWeight: 600, color: colors.text, marginBottom: 2 }}>Source: {c.source}</div>
                  <div>Mise à jour automatique via facture</div>
                  <div style={{ marginTop: 6 }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'dechets' && (
          <motion.div {...fadeIn}>
            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Répartition des déchets (kg/mois)</h3>
                <div style={{ fontSize: 13, color: colors.primary, fontWeight: 600 }}>
                  Taux de tri: {Math.round(((totalWaste - 5) / totalWaste) * 100)}%
                </div>
              </div>
              <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {wasteData.map((w) => (
                  <motion.div
                    key={w.label}
                    initial={{ width: 0 }}
                    animate={{ width: `${(w.kg / totalWaste) * 100}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ background: w.color, height: '100%' }}
                    title={`${w.label}: ${w.kg} kg`}
                  />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {wasteData.map((w) => (
                  <div key={w.label} style={{ padding: 10, background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ width: 10, height: 10, background: w.color, borderRadius: 2, marginBottom: 6 }} />
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{w.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{w.kg} kg</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Food waste cuisine</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ padding: 16, background: colors.dangerLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: colors.danger, fontWeight: 600 }}>GASPILLAGE ACTUEL</div>
                  <div style={{ fontSize: 28, fontWeight: 700, margin: '6px 0' }}>2.8 kg/jour</div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>Soit ~240€/mois perdus</div>
                </div>
                <div style={{ padding: 16, background: colors.primaryLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: colors.primary, fontWeight: 600 }}>OBJECTIF 2026</div>
                  <div style={{ fontSize: 28, fontWeight: 700, margin: '6px 0' }}>1.5 kg/jour</div>
                  <div style={{ fontSize: 12, color: colors.textMuted }}>−46% via portions ajustées</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'sourcing' && (
          <motion.div {...fadeIn}>
            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 16 }}>Approvisionnement durable</h3>
              {sourcing.map((s, i) => (
                <div key={s.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{s.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      style={{ height: '100%', background: s.color, borderRadius: 6 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Fournisseurs éco-responsables</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { nom: 'Ferme Bio Moselle', distance: '18 km', cert: 'Bio LU', note: '98/100' },
                  { nom: 'Boulangerie Artisanale Rumelange', distance: '5 km', cert: 'Local', note: '95/100' },
                  { nom: 'Brasserie Diekirch', distance: '42 km', cert: 'Local', note: '92/100' },
                  { nom: 'Maraîcher Steinfort', distance: '28 km', cert: 'Bio + Saison', note: '96/100' },
                  { nom: 'Viandes Moselle', distance: '32 km', cert: 'Local + Label Rouge', note: '94/100' },
                ].map((f) => (
                  <div key={f.nom} style={{
                    padding: 14,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.nom}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {f.distance} • {f.cert}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: colors.primaryLight,
                      color: colors.primary,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 12,
                    }}>{f.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'certifs' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gap: 12 }}>
            {INITIAL_CERTIFS.map((c) => (
              <div key={c.id} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nom}</div>
                  <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Organisme: {c.organisme}</div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    Obtenu: {c.obtenu} — Expire: {c.expire}
                  </div>
                </div>
                <div style={{
                  padding: '6px 14px',
                  background: certifBg(c.statut),
                  color: certifColor(c.statut),
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {c.statut === 'valide' ? 'Valide' : c.statut === 'expire_bientot' ? 'Renouveler' : 'Expirée'}
                </div>
              </div>
            ))}
            <button style={{
              padding: 14,
              background: 'transparent',
              border: `2px dashed ${colors.border}`,
              borderRadius: 10,
              color: colors.textMuted,
              cursor: 'pointer',
              fontWeight: 500,
            }}>
              + Ajouter une certification
            </button>
          </motion.div>
        )}

        {tab === 'actions' && (
          <motion.div {...fadeIn}>
            <div style={{ display: 'grid', gap: 12 }}>
              {actions.map((a) => (
                <div key={a.id} style={{
                  background: colors.card,
                  border: `1px solid ${a.done ? colors.primary : colors.border}`,
                  borderRadius: 10,
                  padding: 18,
                  opacity: a.done ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, textDecoration: a.done ? 'line-through' : 'none' }}>{a.titre}</div>
                        <div style={{
                          padding: '2px 8px',
                          background: a.difficulte === 'facile' ? colors.primaryLight : a.difficulte === 'moyen' ? colors.warningLight : colors.dangerLight,
                          color: a.difficulte === 'facile' ? colors.primary : a.difficulte === 'moyen' ? colors.warning : colors.danger,
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>{a.difficulte}</div>
                      </div>
                      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{a.description}</div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                        <span style={{ color: colors.primary, fontWeight: 600 }}>Impact: {a.impact}</span>
                        <span style={{ color: colors.textMuted }}>ROI: {a.roi} mois</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAction(a.id)}
                      style={{
                        padding: '8px 14px',
                        background: a.done ? colors.primary : 'transparent',
                        color: a.done ? '#fff' : colors.primary,
                        border: `1px solid ${colors.primary}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {a.done ? 'Réalisée' : 'Marquer réalisée'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
