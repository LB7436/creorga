import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Confidence = number

interface Suggestion {
  id: string
  produit: string
  fournisseur: string
  fournisseursAlt: { nom: string; prix: number; delai: string; qualite: number }[]
  qteActuelle: number
  qteCommander: number
  unite: string
  prixTotal: number
  dateLivraison: string
  confiance: Confidence
  raison: string
  urgence: 'haute' | 'moyenne' | 'basse'
  consommationPrev: number[]
  stockPrev: number[]
}

interface Rule {
  id: string
  nom: string
  description: string
  actif: boolean
  impact: string
}

const INITIAL_SUGGESTIONS: Suggestion[] = [
  {
    id: 'S-001',
    produit: 'Tomates cerises',
    fournisseur: 'Marché Central LU',
    fournisseursAlt: [
      { nom: 'Marché Central LU', prix: 82.5, delai: '24h', qualite: 92 },
      { nom: 'Bio Moselle', prix: 95.0, delai: '48h', qualite: 98 },
      { nom: 'Luxfruits SA', prix: 78.0, delai: '72h', qualite: 85 },
    ],
    qteActuelle: 3.2,
    qteCommander: 25,
    unite: 'kg',
    prixTotal: 82.5,
    dateLivraison: '2026-04-20',
    confiance: 96,
    raison: 'Consommation moyenne 4.2 kg/jour × 6 jours. Week-end +18%. Stock actuel couvre moins d\'un jour.',
    urgence: 'haute',
    consommationPrev: [4, 4.5, 5, 5.2, 4.8, 5.5, 6],
    stockPrev: [3.2, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'S-002',
    produit: 'Vin rouge Moselle',
    fournisseur: 'Caves Bernard',
    fournisseursAlt: [
      { nom: 'Caves Bernard', prix: 312, delai: '48h', qualite: 95 },
      { nom: 'Vignoble Schengen', prix: 340, delai: '24h', qualite: 97 },
    ],
    qteActuelle: 12,
    qteCommander: 48,
    unite: 'btl',
    prixTotal: 312.0,
    dateLivraison: '2026-04-21',
    confiance: 89,
    raison: 'Événement prévu samedi (25 couverts). Historique: 0.8 btl/couvert en soirée.',
    urgence: 'moyenne',
    consommationPrev: [6, 8, 10, 12, 20, 18, 5],
    stockPrev: [12, 6, 0, 0, 0, 0, 0],
  },
  {
    id: 'S-003',
    produit: 'Huile olive extra',
    fournisseur: 'Méditerranée Import',
    fournisseursAlt: [
      { nom: 'Méditerranée Import', prix: 145, delai: '72h', qualite: 94 },
      { nom: 'Oléa LU', prix: 168, delai: '24h', qualite: 96 },
    ],
    qteActuelle: 4.5,
    qteCommander: 15,
    unite: 'L',
    prixTotal: 145.0,
    dateLivraison: '2026-04-23',
    confiance: 92,
    raison: 'Consommation régulière 1.2 L/jour. Pas d\'événement exceptionnel détecté.',
    urgence: 'basse',
    consommationPrev: [1.2, 1.1, 1.3, 1.2, 1.4, 1.5, 1.2],
    stockPrev: [4.5, 3.3, 2.2, 0.9, 0, 0, 0],
  },
  {
    id: 'S-004',
    produit: 'Farine T45',
    fournisseur: 'Moulin Luxembourg',
    fournisseursAlt: [
      { nom: 'Moulin Luxembourg', prix: 58, delai: '24h', qualite: 90 },
      { nom: 'Biofarine SA', prix: 72, delai: '48h', qualite: 95 },
    ],
    qteActuelle: 8,
    qteCommander: 50,
    unite: 'kg',
    prixTotal: 58.0,
    dateLivraison: '2026-04-20',
    confiance: 94,
    raison: 'Pain fait maison quotidien. Météo humide prévue = +8% production.',
    urgence: 'haute',
    consommationPrev: [7, 8, 8.5, 9, 9.5, 10, 8],
    stockPrev: [8, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'S-005',
    produit: 'Saumon frais',
    fournisseur: 'Océan Nord',
    fournisseursAlt: [
      { nom: 'Océan Nord', prix: 285, delai: '24h', qualite: 96 },
      { nom: 'Marée LU', prix: 310, delai: '24h', qualite: 94 },
    ],
    qteActuelle: 2.1,
    qteCommander: 12,
    unite: 'kg',
    prixTotal: 285.0,
    dateLivraison: '2026-04-20',
    confiance: 91,
    raison: 'Plat signature de la carte. Vendredi = jour poisson traditionnel (+35%).',
    urgence: 'haute',
    consommationPrev: [1.8, 2, 2.2, 2.5, 3.2, 2.8, 1.5],
    stockPrev: [2.1, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'S-006',
    produit: 'Café grains Arabica',
    fournisseur: 'Torréfaction Ville',
    fournisseursAlt: [
      { nom: 'Torréfaction Ville', prix: 96, delai: '24h', qualite: 93 },
      { nom: 'Café Équitable LU', prix: 108, delai: '48h', qualite: 98 },
    ],
    qteActuelle: 5,
    qteCommander: 10,
    unite: 'kg',
    prixTotal: 96.0,
    dateLivraison: '2026-04-22',
    confiance: 88,
    raison: 'Consommation stable 0.6 kg/jour. Marge de sécurité 7 jours.',
    urgence: 'basse',
    consommationPrev: [0.6, 0.65, 0.55, 0.7, 0.8, 0.75, 0.5],
    stockPrev: [5, 4.4, 3.7, 3, 2.2, 1.4, 0.9],
  },
]

const INITIAL_RULES: Rule[] = [
  { id: 'R1', nom: 'Seuil minimum produit', description: 'Commander dès que stock < 20% de consommation hebdo', actif: true, impact: 'Évite 92% des ruptures' },
  { id: 'R2', nom: 'Ajustement saisonnier', description: 'Détection auto des saisons et ajustement volumes', actif: true, impact: '+14% précision' },
  { id: 'R3', nom: 'Événements spéciaux', description: 'Festivals, fête nationale, matchs sportifs', actif: true, impact: 'Couvre 98% des pics' },
  { id: 'R4', nom: 'Moyenne jour de semaine', description: 'Apprentissage patterns lundi→dimanche', actif: true, impact: 'Base du modèle' },
  { id: 'R5', nom: 'Impact météo', description: 'Pluie=+12% comfort food, chaleur=+25% salades', actif: true, impact: '+7% précision' },
  { id: 'R6', nom: 'Réservations futures', description: 'Intègre les réservations confirmées', actif: false, impact: '+11% précision' },
]

const colors = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#d97706',
  primaryLight: '#fef3c7',
  primaryDark: '#b45309',
  success: '#16a34a',
  successLight: '#dcfce7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#0284c7',
  infoLight: '#e0f2fe',
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export default function AutoOrderPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL_SUGGESTIONS)
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [autoMode, setAutoMode] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'suggestions' | 'dashboard' | 'rules' | 'historique'>('dashboard')
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState<string | null>(null)

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const selectAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set())
    else setSelected(new Set(suggestions.map((s) => s.id)))
  }

  const totalSelected = useMemo(
    () => suggestions.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.prixTotal, 0),
    [suggestions, selected]
  )

  const confirm = () => {
    setSuggestions(suggestions.filter((s) => !selected.has(s.id)))
    setSelected(new Set())
  }

  const reject = (id: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== id))
  }

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, actif: !r.actif } : r)))
  }

  const stats = [
    { label: 'Commandes IA ce mois', value: '18', color: colors.primary, sub: '+6 vs mois dernier' },
    { label: 'Économies réalisées', value: '420 €', color: colors.success, sub: 'Grâce comparaison' },
    { label: 'Ruptures évitées', value: '7', color: colors.info, sub: 'Stock toujours OK' },
    { label: 'Précision IA', value: '94 %', color: colors.warning, sub: 'Sur 6 mois' },
  ]

  const urgencyColor = (u: string) =>
    u === 'haute' ? colors.danger : u === 'moyenne' ? colors.warning : colors.success
  const urgencyBg = (u: string) =>
    u === 'haute' ? colors.dangerLight : u === 'moyenne' ? colors.warningLight : colors.successLight

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: colors.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <motion.div {...fadeIn} style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: colors.text }}>
              Auto-Réapprovisionnement IA
            </h1>
            <p style={{ color: colors.textMuted, margin: '4px 0 0 0', fontSize: 14 }}>
              Commandes intelligentes basées sur consommation, saisonnalité et événements
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: colors.textMuted }}>Mode automatique</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: autoMode ? colors.primary : '#cbd5e1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <motion.div
                animate={{ x: autoMode ? 26 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  position: 'absolute',
                  top: 2,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                }}
              />
            </button>
          </div>
        </div>

        {autoMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: colors.primaryLight,
              border: `1px solid ${colors.primary}`,
              borderRadius: 10,
              padding: 12,
              margin: '16px 0',
              fontSize: 13,
              color: colors.primaryDark,
            }}
          >
            Mode automatique activé — les commandes seront passées sans validation manuelle lorsque la confiance IA dépasse 90%.
          </motion.div>
        )}

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
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border}`, marginBottom: 20 }}>
          {(['dashboard', 'suggestions', 'rules', 'historique'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px',
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
              {t === 'dashboard' ? 'Tableau de bord' : t === 'suggestions' ? 'Suggestions' : t === 'rules' ? 'Règles IA' : 'Historique'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Prévisions de consommation — 7 jours</h2>
                <div style={{ fontSize: 13, color: colors.primary, fontWeight: 600 }}>
                  {suggestions.length} produits nécessitent une commande dans les 3 prochains jours
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {suggestions.slice(0, 4).map((s) => {
                  const max = Math.max(...s.consommationPrev, ...s.stockPrev, 1)
                  return (
                    <div key={s.id} style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      padding: 16,
                      background: '#fafafa',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.produit}</div>
                        <div style={{
                          padding: '2px 8px',
                          background: urgencyBg(s.urgence),
                          color: urgencyColor(s.urgence),
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {s.urgence}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
                        {s.consommationPrev.map((v, i) => (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{
                              background: colors.primary,
                              height: `${(v / max) * 100}%`,
                              borderRadius: 3,
                            }} />
                            <div style={{
                              background: colors.info,
                              height: `${(s.stockPrev[i] / max) * 60}%`,
                              borderRadius: 3,
                              opacity: 0.6,
                            }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: colors.textMuted }}>
                        <div><span style={{ display: 'inline-block', width: 8, height: 8, background: colors.primary, borderRadius: 2, marginRight: 4 }} /> Conso prévue</div>
                        <div><span style={{ display: 'inline-block', width: 8, height: 8, background: colors.info, borderRadius: 2, marginRight: 4, opacity: 0.6 }} /> Stock projeté</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 24,
            }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>Insights du modèle</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ padding: 14, background: colors.primaryLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: colors.primaryDark, fontWeight: 600, marginBottom: 4 }}>FÊTE NATIONALE DÉTECTÉE</div>
                  <div style={{ fontSize: 13 }}>23 juin — ajustement +35% sur boissons et grillades</div>
                </div>
                <div style={{ padding: 14, background: colors.infoLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: colors.info, fontWeight: 600, marginBottom: 4 }}>MÉTÉO</div>
                  <div style={{ fontSize: 13 }}>Pluie samedi → +12% plats chauds anticipés</div>
                </div>
                <div style={{ padding: 14, background: colors.successLight, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: colors.success, fontWeight: 600, marginBottom: 4 }}>APPRENTISSAGE</div>
                  <div style={{ fontSize: 13 }}>Mardi = jour calme (-18%) — stock allégé</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'suggestions' && (
          <motion.div {...fadeIn} style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: 16,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafafa',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selected.size === suggestions.length && suggestions.length > 0}
                  onChange={selectAll}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {selected.size} sélectionnée(s) — Total: <strong style={{ color: colors.primary }}>{totalSelected.toFixed(2)} €</strong>
                </span>
              </div>
              <button
                onClick={confirm}
                disabled={selected.size === 0}
                style={{
                  padding: '8px 16px',
                  background: selected.size === 0 ? '#cbd5e1' : colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                Commander tout ({selected.size})
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: 12, textAlign: 'left', width: 40 }}></th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: colors.textMuted }}>Produit</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: colors.textMuted }}>Fournisseur</th>
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: colors.textMuted }}>Stock</th>
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: colors.textMuted }}>Qté</th>
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: colors.textMuted }}>Prix</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: colors.textMuted }}>Livraison</th>
                    <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: colors.textMuted }}>Confiance</th>
                    <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: colors.textMuted }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => (
                    <>
                      <tr key={s.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: 12 }}>
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ padding: 12 }}>
                          <div style={{ fontWeight: 600 }}>{s.produit}</div>
                          <div style={{
                            display: 'inline-block',
                            marginTop: 2,
                            padding: '1px 6px',
                            background: urgencyBg(s.urgence),
                            color: urgencyColor(s.urgence),
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {s.urgence}
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div>{s.fournisseur}</div>
                          {s.fournisseursAlt.length > 1 && (
                            <button
                              onClick={() => setShowCompare(showCompare === s.id ? null : s.id)}
                              style={{
                                fontSize: 11,
                                color: colors.info,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                marginTop: 2,
                              }}
                            >
                              Comparer {s.fournisseursAlt.length} fournisseurs
                            </button>
                          )}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', color: colors.danger }}>
                          {s.qteActuelle} {s.unite}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                          {s.qteCommander} {s.unite}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>{s.prixTotal.toFixed(2)} €</td>
                        <td style={{ padding: 12, fontSize: 12, color: colors.textMuted }}>{s.dateLivraison}</td>
                        <td style={{ padding: 12, textAlign: 'center', position: 'relative' }}>
                          <div
                            onMouseEnter={() => setShowTooltip(s.id)}
                            onMouseLeave={() => setShowTooltip(null)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 10px',
                              borderRadius: 12,
                              background: s.confiance >= 90 ? colors.successLight : colors.warningLight,
                              color: s.confiance >= 90 ? colors.success : colors.warning,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'help',
                            }}
                          >
                            {s.confiance}%
                          </div>
                          {showTooltip === s.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 4,
                                padding: 10,
                                background: '#0f172a',
                                color: '#fff',
                                borderRadius: 8,
                                fontSize: 11,
                                width: 260,
                                textAlign: 'left',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Pourquoi cette suggestion ?</div>
                              <div style={{ lineHeight: 1.5 }}>{s.raison}</div>
                            </motion.div>
                          )}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            style={{
                              padding: '4px 8px',
                              background: 'transparent',
                              border: `1px solid ${colors.border}`,
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 11,
                              marginRight: 4,
                            }}
                          >
                            Ajuster
                          </button>
                          <button
                            onClick={() => reject(s.id)}
                            style={{
                              padding: '4px 8px',
                              background: 'transparent',
                              border: `1px solid ${colors.danger}`,
                              color: colors.danger,
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 11,
                            }}
                          >
                            Rejeter
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {showCompare === s.id && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div style={{ padding: 16, background: '#f8fafc', borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Comparaison fournisseurs — IA recommande: <span style={{ color: colors.primary }}>{s.fournisseur}</span></div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                  {s.fournisseursAlt.map((f) => (
                                    <div key={f.nom} style={{
                                      padding: 12,
                                      background: f.nom === s.fournisseur ? colors.primaryLight : '#fff',
                                      border: `1px solid ${f.nom === s.fournisseur ? colors.primary : colors.border}`,
                                      borderRadius: 8,
                                    }}>
                                      <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nom}</div>
                                      <div style={{ fontSize: 12, marginTop: 4, color: colors.textMuted }}>
                                        Prix: <strong style={{ color: colors.text }}>{f.prix.toFixed(2)} €</strong>
                                      </div>
                                      <div style={{ fontSize: 12, color: colors.textMuted }}>Délai: {f.delai}</div>
                                      <div style={{ fontSize: 12, color: colors.textMuted }}>Qualité: {f.qualite}%</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {expanded === s.id && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={9} style={{ padding: 16, background: '#f8fafc', borderBottom: `1px solid ${colors.border}` }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <label style={{ fontSize: 13 }}>Ajuster quantité:</label>
                                <input
                                  type="number"
                                  defaultValue={s.qteCommander}
                                  onChange={(e) => {
                                    const q = parseFloat(e.target.value) || 0
                                    setSuggestions(suggestions.map((x) =>
                                      x.id === s.id ? { ...x, qteCommander: q, prixTotal: (s.prixTotal / s.qteCommander) * q } : x
                                    ))
                                  }}
                                  style={{
                                    width: 100,
                                    padding: 6,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 6,
                                    fontSize: 13,
                                  }}
                                />
                                <span style={{ fontSize: 13, color: colors.textMuted }}>{s.unite}</span>
                                <button
                                  onClick={() => setExpanded(null)}
                                  style={{
                                    padding: '6px 12px',
                                    background: colors.primary,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                  }}
                                >
                                  Valider
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'rules' && (
          <motion.div {...fadeIn} style={{ display: 'grid', gap: 12 }}>
            {rules.map((r) => (
              <div key={r.id} style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{r.nom}</div>
                  <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>{r.description}</div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: colors.infoLight,
                    color: colors.info,
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {r.impact}
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(r.id)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    background: r.actif ? colors.primary : '#cbd5e1',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <motion.div
                    animate={{ x: r.actif ? 24 : 2 }}
                    style={{
                      position: 'absolute',
                      top: 2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                    }}
                  />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'historique' && (
          <motion.div {...fadeIn} style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 24,
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Précision IA — 6 derniers mois</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, marginBottom: 12 }}>
              {[
                { mois: 'Nov', p: 87 },
                { mois: 'Déc', p: 89 },
                { mois: 'Jan', p: 91 },
                { mois: 'Fév', p: 92 },
                { mois: 'Mar', p: 93 },
                { mois: 'Avr', p: 94 },
              ].map((m, i) => (
                <div key={m.mois} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${m.p}%` }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    style={{
                      width: '100%',
                      background: `linear-gradient(to top, ${colors.primary}, ${colors.warning})`,
                      borderRadius: '6px 6px 0 0',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: -22,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.primary,
                    }}>{m.p}%</div>
                  </motion.div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>{m.mois}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, background: colors.successLight, borderRadius: 8, fontSize: 13, color: colors.success }}>
              Progression constante — l'IA apprend de vos patterns. +7 points en 6 mois.
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
