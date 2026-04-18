import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ChangeCategory = 'feature' | 'improvement' | 'fix' | 'security' | 'docs'

interface ChangeItem {
  category: ChangeCategory
  text: string
}

interface Release {
  version: string
  date: string
  dateSort: string
  title: string
  author: string
  highlight?: boolean
  hero?: string
  changes: ChangeItem[]
}

const PALETTE = {
  bg: '#fafafa',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  feature: '#8b5cf6',
  featureBg: '#ede9fe',
  improvement: '#3b82f6',
  improvementBg: '#dbeafe',
  fix: '#ef4444',
  fixBg: '#fee2e2',
  security: '#059669',
  securityBg: '#d1fae5',
  docs: '#f59e0b',
  docsBg: '#fef3c7',
}

const CATEGORY_META: Record<ChangeCategory, { label: string; emoji: string; color: string; bg: string }> = {
  feature: { label: 'Nouveautés', emoji: '🚀', color: PALETTE.feature, bg: PALETTE.featureBg },
  improvement: { label: 'Améliorations', emoji: '✨', color: PALETTE.improvement, bg: PALETTE.improvementBg },
  fix: { label: 'Corrections', emoji: '🐛', color: PALETTE.fix, bg: PALETTE.fixBg },
  security: { label: 'Sécurité', emoji: '🔒', color: PALETTE.security, bg: PALETTE.securityBg },
  docs: { label: 'Documentation', emoji: '📚', color: PALETTE.docs, bg: PALETTE.docsBg },
}

const RELEASES: Release[] = [
  {
    version: 'v2.4.0',
    date: '18 avril 2026',
    dateSort: '2026-04-18',
    title: 'Assistant IA — Maintenant avec Claude',
    author: 'Bryan L.',
    highlight: true,
    hero: '🤖',
    changes: [
      { category: 'feature', text: 'Assistant IA intégré propulsé par Claude Opus 4.7 pour générer rapports, analyses et recommandations.' },
      { category: 'feature', text: 'Génération automatique de descriptions produit multilingues (FR/EN/DE/LU).' },
      { category: 'improvement', text: 'Dashboard refondu avec widgets personnalisables et graphiques en temps réel.' },
      { category: 'fix', text: 'Correction du calcul de TVA sur les commandes à emporter mixtes.' },
    ],
  },
  {
    version: 'v2.3.5',
    date: '11 avril 2026',
    dateSort: '2026-04-11',
    title: 'Module Durabilité + conformité CSRD',
    author: 'équipe Creorga',
    hero: '🌱',
    changes: [
      { category: 'feature', text: 'Nouveau module Durabilité : suivi consommation énergie, eau, déchets alimentaires.' },
      { category: 'feature', text: 'Génération automatique de rapports CSRD pour les établissements de plus de 250 employés.' },
      { category: 'improvement', text: 'Exports PDF optimisés — 3x plus rapides.' },
      { category: 'security', text: 'Renforcement de l\'authentification 2FA par défaut pour les rôles OWNER/ADMIN.' },
    ],
  },
  {
    version: 'v2.3.4',
    date: '04 avril 2026',
    dateSort: '2026-04-04',
    title: 'Corrections HACCP et exports',
    author: 'équipe Creorga',
    changes: [
      { category: 'fix', text: 'Température des frigos — alertes seuil maintenant fiables à 100%.' },
      { category: 'fix', text: 'Export PDF HACCP : signature électronique correctement positionnée.' },
      { category: 'improvement', text: 'Page liste commandes : pagination virtualisée (gère 10 000+ lignes sans ralentissement).' },
      { category: 'docs', text: 'Nouvelle section d\'aide « Gérer une chaîne multi-établissements ».' },
    ],
  },
  {
    version: 'v2.3.3',
    date: '28 mars 2026',
    dateSort: '2026-03-28',
    title: 'Performances POS -35% latence',
    author: 'équipe Creorga',
    changes: [
      { category: 'improvement', text: 'Checkout POS : -35% de latence grâce aux requêtes optimisées et au cache Redis.' },
      { category: 'improvement', text: 'Mode hors-ligne amélioré : synchronisation 2x plus rapide à la reconnexion.' },
      { category: 'fix', text: 'Scroll de la grille produits iPad : plus de saccades sur iOS 17.' },
    ],
  },
  {
    version: 'v2.3.2',
    date: '21 mars 2026',
    dateSort: '2026-03-21',
    title: 'Payconiq stable + webhooks v2',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Intégration Payconiq sortie de beta — paiement mobile BE/LU.' },
      { category: 'improvement', text: 'Webhooks v2 : retry automatique avec back-off exponentiel.' },
      { category: 'security', text: 'Rotation automatique des clés API toutes les 90 jours.' },
    ],
  },
  {
    version: 'v2.3.1',
    date: '14 mars 2026',
    dateSort: '2026-03-14',
    title: 'Multi-TVA 3/8/14/17%',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Gestion fine multi-TVA Luxembourg (3% / 8% / 14% / 17%) par ligne de produit.' },
      { category: 'improvement', text: 'Rapport TVA exportable en format FIRE CAE-101 pour l\'administration.' },
      { category: 'fix', text: 'Correctif arrondi comptable sur factures avec remises en cascade.' },
    ],
  },
  {
    version: 'v2.3.0',
    date: '07 mars 2026',
    dateSort: '2026-03-07',
    title: 'Multi-établissements — chaînes de restaurants',
    author: 'Bryan L.',
    highlight: true,
    hero: '🏢',
    changes: [
      { category: 'feature', text: 'Mode chaîne : gérez plusieurs établissements depuis un compte unique.' },
      { category: 'feature', text: 'Tableau de bord consolidé avec comparatifs inter-établissements.' },
      { category: 'feature', text: 'Transferts de stock entre sites avec traçabilité.' },
      { category: 'improvement', text: 'Rôles avancés : manager régional, superviseur, employé mutualisé.' },
    ],
  },
  {
    version: 'v2.2.9',
    date: '28 février 2026',
    dateSort: '2026-02-28',
    title: 'Réputation — Google & Tripadvisor',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Synchronisation bi-directionnelle des avis Google Business et Tripadvisor.' },
      { category: 'feature', text: 'Réponses IA suggérées selon le ton choisi (formel, amical, empathique).' },
      { category: 'improvement', text: 'Alerting Slack/Discord sur avis négatifs (<3 étoiles).' },
    ],
  },
  {
    version: 'v2.2.8',
    date: '21 février 2026',
    dateSort: '2026-02-21',
    title: 'Rapports financiers + export Excel',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Nouveau générateur de rapports : P&L, trésorerie, marge brute par catégorie.' },
      { category: 'improvement', text: 'Exports Excel (.xlsx) avec formules conservées et mise en forme conditionnelle.' },
      { category: 'docs', text: 'Guide complet « Lire son rapport patron » en vidéo (12 min).' },
    ],
  },
  {
    version: 'v2.2.7',
    date: '14 février 2026',
    dateSort: '2026-02-14',
    title: 'Stabilité & UX',
    author: 'équipe Creorga',
    changes: [
      { category: 'fix', text: '17 correctifs mineurs issus des retours utilisateurs.' },
      { category: 'improvement', text: 'Tooltips partout — plus aucune icône sans explication au survol.' },
      { category: 'improvement', text: 'Clavier numérique POS : touches plus grandes sur tablettes 10".' },
    ],
  },
  {
    version: 'v2.2.6',
    date: '07 février 2026',
    dateSort: '2026-02-07',
    title: 'Click & Collect + SMS',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Notifications SMS aux clients : commande prête, en retard, annulée.' },
      { category: 'feature', text: 'Créneaux de retrait paramétrables par quart d\'heure.' },
      { category: 'fix', text: 'Fuseau horaire correct pour les commandes programmées à J+1.' },
    ],
  },
  {
    version: 'v2.2.5',
    date: '31 janvier 2026',
    dateSort: '2026-01-31',
    title: 'Sécurité renforcée',
    author: 'équipe Creorga',
    changes: [
      { category: 'security', text: 'Audit OWASP Top 10 passé — aucune vulnérabilité critique.' },
      { category: 'security', text: 'Chiffrement au repos AES-256 pour toutes les bases de données.' },
      { category: 'security', text: 'Journalisation complète des accès admin (audit log immuable).' },
    ],
  },
  {
    version: 'v2.2.0',
    date: '17 janvier 2026',
    dateSort: '2026-01-17',
    title: 'Refonte interface — le nouveau Creorga',
    author: 'Bryan L.',
    highlight: true,
    hero: '🎨',
    changes: [
      { category: 'feature', text: 'Nouvelle interface épurée inspirée de Linear et Stripe.' },
      { category: 'feature', text: 'Mode sombre natif sur toutes les pages.' },
      { category: 'improvement', text: 'Navigation 40% plus rapide : sidebar réorganisée par catégorie métier.' },
      { category: 'docs', text: 'Tous les modules documentés avec captures d\'écran.' },
    ],
  },
  {
    version: 'v2.1.0',
    date: '10 décembre 2025',
    dateSort: '2025-12-10',
    title: 'Module Events & Traiteur',
    author: 'équipe Creorga',
    changes: [
      { category: 'feature', text: 'Module Événements : devis, buffets, mariages, séminaires.' },
      { category: 'feature', text: 'Module Traiteur : commandes groupées, livraisons programmées.' },
      { category: 'improvement', text: 'Agenda unifié entre réservations de table et événements privatisés.' },
    ],
  },
  {
    version: 'v2.0.0',
    date: '01 novembre 2025',
    dateSort: '2025-11-01',
    title: 'Creorga 2.0 — Architecture nouvelle génération',
    author: 'Bryan L.',
    highlight: true,
    hero: '🎉',
    changes: [
      { category: 'feature', text: 'Migration complète vers une architecture SaaS multi-tenant.' },
      { category: 'feature', text: 'API publique documentée (OpenAPI 3.1) pour intégrations tierces.' },
      { category: 'improvement', text: 'Scalabilité horizontale : plus de limite au nombre d\'établissements.' },
      { category: 'security', text: 'Conformité RGPD, PCI-DSS niveau 2, ISO 27001 en cours.' },
    ],
  },
]

const ROADMAP = [
  { title: 'Paiement par reconnaissance faciale', eta: 'Q3 2026', status: 'En développement' },
  { title: 'Application mobile native (iOS/Android)', eta: 'Q3 2026', status: 'Beta privée' },
  { title: 'Marketplace de modules tiers', eta: 'Q4 2026', status: 'Conception' },
  { title: 'Intégration native avec Odoo et Sage', eta: 'Q4 2026', status: 'Conception' },
  { title: 'Assistant vocal en cuisine', eta: '2027', status: 'Recherche' },
]

type FilterCategory = 'all' | ChangeCategory

export default function ChangelogPage() {
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [search, setSearch] = useState('')
  const [emailSub, setEmailSub] = useState('')
  const [subDone, setSubDone] = useState(false)

  const filtered = useMemo(() => {
    return RELEASES.map((rel) => {
      const matchSearch = !search || (
        rel.title.toLowerCase().includes(search.toLowerCase()) ||
        rel.version.toLowerCase().includes(search.toLowerCase()) ||
        rel.changes.some((c) => c.text.toLowerCase().includes(search.toLowerCase()))
      )
      if (!matchSearch) return null
      const visibleChanges = filter === 'all' ? rel.changes : rel.changes.filter((c) => c.category === filter)
      if (visibleChanges.length === 0) return null
      return { ...rel, changes: visibleChanges }
    }).filter(Boolean) as Release[]
  }, [filter, search])

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        {/* HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ fontSize: 13, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
            Journal des versions
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, margin: '0 0 12px', letterSpacing: -1 }}>Changelog</h1>
          <p style={{ fontSize: 17, color: PALETTE.muted, margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
            Suivez toutes les nouveautés, améliorations et corrections apportées à Creorga OS. Chaque semaine, nous livrons des mises à jour sans interruption de service.
          </p>
        </motion.header>

        {/* SEARCH + SUBSCRIBE ROW */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Rechercher dans le changelog…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 10,
                fontSize: 14,
                background: PALETTE.card,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: PALETTE.muted }}>🔍</span>
          </div>
          <a
            href="#subscribe"
            style={{
              padding: '12px 20px',
              background: PALETTE.card,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: PALETTE.text,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            📧 S'abonner
          </a>
          <a
            href="#rss"
            style={{
              padding: '12px 20px',
              background: PALETTE.card,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: PALETTE.text,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            📡 RSS
          </a>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {(['all', 'feature', 'improvement', 'fix', 'security', 'docs'] as FilterCategory[]).map((c) => {
            const active = filter === c
            const meta = c === 'all' ? { label: 'Toutes', emoji: '📋', color: PALETTE.text, bg: '#f3f4f6' } : CATEGORY_META[c]
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? meta.color : PALETTE.border}`,
                  background: active ? meta.bg : PALETTE.card,
                  color: active ? meta.color : PALETTE.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {meta.emoji} {meta.label}
              </button>
            )
          })}
        </div>

        {/* TIMELINE */}
        <div style={{ position: 'relative' }}>
          {/* vertical line */}
          <div style={{ position: 'absolute', left: 11, top: 10, bottom: 10, width: 2, background: PALETTE.border }} />

          <AnimatePresence mode="popLayout">
            {filtered.map((rel, i) => (
              <motion.article
                key={rel.version}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                style={{
                  position: 'relative',
                  paddingLeft: 44,
                  paddingBottom: 36,
                }}
              >
                {/* dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 10,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: rel.highlight ? PALETTE.feature : PALETTE.card,
                    border: `3px solid ${rel.highlight ? PALETTE.feature : PALETTE.border}`,
                    boxShadow: rel.highlight ? `0 0 0 6px ${PALETTE.featureBg}` : 'none',
                  }}
                />

                <div style={{
                  background: PALETTE.card,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 14,
                  padding: 24,
                  boxShadow: rel.highlight ? '0 4px 20px rgba(139, 92, 246, 0.08)' : '0 1px 2px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: 13,
                          fontWeight: 700,
                          color: rel.highlight ? PALETTE.feature : PALETTE.muted,
                          background: rel.highlight ? PALETTE.featureBg : '#f3f4f6',
                          padding: '3px 10px',
                          borderRadius: 6,
                        }}>
                          {rel.version}
                        </span>
                        {rel.highlight && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.feature, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            ★ Version majeure
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 }}>
                        {rel.hero && <span style={{ marginRight: 8 }}>{rel.hero}</span>}
                        {rel.title}
                      </h2>
                      <div style={{ fontSize: 13, color: PALETTE.muted }}>
                        {rel.date} · par {rel.author}
                      </div>
                    </div>
                  </div>

                  {/* Mock hero panel for highlighted releases */}
                  {rel.highlight && (
                    <div style={{
                      height: 140,
                      borderRadius: 10,
                      background: `linear-gradient(135deg, ${PALETTE.featureBg} 0%, #fce7f3 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 64,
                      marginBottom: 16,
                    }}>
                      {rel.hero}
                    </div>
                  )}

                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rel.changes.map((ch, ci) => {
                      const meta = CATEGORY_META[ch.category]
                      return (
                        <li
                          key={ci}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          <span style={{
                            flexShrink: 0,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: meta.bg,
                            color: meta.color,
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            marginTop: 1,
                          }}>
                            {meta.emoji} {meta.label}
                          </span>
                          <span style={{ color: PALETTE.text }}>{ch.text}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: PALETTE.muted }}>
              Aucun résultat. Essayez de modifier votre recherche ou votre filtre.
            </div>
          )}
        </div>

        {/* ROADMAP */}
        <section style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🗺️</span>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>À venir</h2>
          </div>
          <p style={{ color: PALETTE.muted, fontSize: 14, marginBottom: 20 }}>
            Un aperçu de ce sur quoi nous travaillons actuellement. Les dates sont indicatives.
          </p>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {ROADMAP.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 140px',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: i < ROADMAP.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                  alignItems: 'center',
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.title}</span>
                <span style={{ color: PALETTE.muted, fontSize: 13 }}>{item.eta}</span>
                <span style={{
                  padding: '4px 10px',
                  background: PALETTE.featureBg,
                  color: PALETTE.feature,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SUBSCRIBE */}
        <section id="subscribe" style={{ marginTop: 48 }}>
          <div style={{
            background: `linear-gradient(135deg, ${PALETTE.featureBg} 0%, ${PALETTE.improvementBg} 100%)`,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            padding: 40,
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Ne ratez aucune mise à jour</h3>
            <p style={{ fontSize: 14, color: PALETTE.muted, margin: '0 0 24px' }}>
              Recevez un email à chaque nouvelle version majeure (1 à 2 fois par mois maximum).
            </p>
            {subDone ? (
              <div style={{ padding: '12px 20px', background: PALETTE.securityBg, color: PALETTE.security, borderRadius: 12, display: 'inline-block', fontWeight: 600 }}>
                ✓ C'est noté ! Bienvenue.
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (emailSub.includes('@')) setSubDone(true) }}
                style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto', flexWrap: 'wrap' }}
              >
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={emailSub}
                  onChange={(e) => setEmailSub(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '12px 16px',
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    background: PALETTE.card,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: PALETTE.text,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  M'abonner
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
