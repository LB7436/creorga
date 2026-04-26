import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  type: 'page' | 'action' | 'client' | 'product' | 'quick'
  title: string
  subtitle?: string
  emoji: string
  path?: string
  onRun?: () => void
  keywords?: string
}

const RECENT_KEY = 'creorga-cmdk-recent'

const PAGES: Omit<CommandItem, 'type'>[] = [
  { id: 'p-dash', title: 'Tableau de bord', subtitle: 'Vue d\'ensemble', emoji: '\u{1F4CA}', path: '/' },
  { id: 'p-modules', title: 'Modules', subtitle: 'Sélecteur de modules', emoji: '\u{1F9F1}', path: '/modules' },
  { id: 'p-pos', title: 'Caisse POS', subtitle: 'Prendre une commande', emoji: '\u{1F4B3}', path: '/pos' },
  { id: 'p-pos-floor', title: 'Plan de salle', subtitle: 'Tables et serveurs', emoji: '\u{1FA91}', path: '/pos/floor' },
  { id: 'p-pos-kitchen', title: 'Cuisine', subtitle: 'Kitchen display', emoji: '\u{1F373}', path: '/pos/kitchen' },
  { id: 'p-crm', title: 'CRM & Clients', subtitle: 'Fichier clients', emoji: '\u{1F465}', path: '/crm/clients' },
  { id: 'p-fidelite', title: 'Fidélité', subtitle: 'Programme de fidélité', emoji: '\u{1F381}', path: '/crm/fidelite' },
  { id: 'p-invoices', title: 'Factures', subtitle: 'Factures émises', emoji: '\u{1F4C4}', path: '/invoices/factures' },
  { id: 'p-devis', title: 'Devis', subtitle: 'Devis et propositions', emoji: '\u{1F4DD}', path: '/invoices/devis' },
  { id: 'p-inventory', title: 'Stock', subtitle: 'Inventaire', emoji: '\u{1F4E6}', path: '/inventory/stock' },
  { id: 'p-recettes', title: 'Recettes', subtitle: 'Fiches techniques', emoji: '\u{1F4D6}', path: '/inventory/recettes' },
  { id: 'p-fournisseurs', title: 'Fournisseurs', subtitle: 'Contacts fournisseurs', emoji: '\u{1F69A}', path: '/inventory/fournisseurs' },
  { id: 'p-hr-planning', title: 'Planning RH', subtitle: 'Horaires de l\'équipe', emoji: '\u{1F4C5}', path: '/hr/planning' },
  { id: 'p-hr-equipe', title: 'Équipe', subtitle: 'Gestion du personnel', emoji: '\u{1F46A}', path: '/hr/equipe' },
  { id: 'p-haccp', title: 'HACCP', subtitle: 'Hygiène et sécurité', emoji: '\u{1F9EA}', path: '/haccp/journee' },
  { id: 'p-acc-caisse', title: 'Caisse comptable', subtitle: 'Fond de caisse', emoji: '\u{1F4B0}', path: '/accounting/caisse' },
  { id: 'p-acc-tva', title: 'TVA', subtitle: 'Déclarations TVA', emoji: '\u{1F4B6}', path: '/accounting/tva' },
  { id: 'p-acc-rapports', title: 'Rapports', subtitle: 'Rapports financiers', emoji: '\u{1F4C8}', path: '/accounting/rapports' },
  { id: 'p-marketing', title: 'Campagnes marketing', subtitle: 'Emailing et SMS', emoji: '\u{1F4E3}', path: '/crm/campagnes' },
  { id: 'p-agenda', title: 'Agenda', subtitle: 'Calendrier global', emoji: '\u{1F5D3}️', path: '/agenda/calendrier' },
  { id: 'p-reputation', title: 'Réputation', subtitle: 'Avis clients', emoji: '⭐', path: '/reputation/avis' },
  { id: 'p-formation', title: 'Formation', subtitle: 'Tutoriels et guides', emoji: '\u{1F393}', path: '/formation' },
  { id: 'p-maintenance', title: 'Maintenance', subtitle: 'Équipements', emoji: '\u{1F527}', path: '/maintenance' },
  { id: 'p-licences', title: 'Licences', subtitle: 'Assurances et licences', emoji: '\u{1F4DC}', path: '/licences' },
  { id: 'p-rgpd', title: 'RGPD', subtitle: 'Conformité et données', emoji: '\u{1F512}', path: '/rgpd' },
  { id: 'p-sites', title: 'Multi-établissements', subtitle: 'Vos sites', emoji: '\u{1F3E2}', path: '/sites' },
  { id: 'p-api', title: 'API & Intégrations', subtitle: 'Connexions tierces', emoji: '\u{1F517}', path: '/api' },
  { id: 'p-ai', title: 'Assistant IA', subtitle: 'Votre copilote', emoji: '\u{1F916}', path: '/ai' },
  { id: 'p-backup', title: 'Sauvegarde', subtitle: 'Backup & sécurité', emoji: '\u{1F4BE}', path: '/backup' },
  { id: 'p-owner', title: 'Rapport Patron', subtitle: 'Résumé direction', emoji: '\u{1F4CB}', path: '/owner' },
  { id: 'p-delivery', title: 'Livraison', subtitle: 'Courses et delivery', emoji: '\u{1F6F5}', path: '/delivery' },
  { id: 'p-clickcollect', title: 'Click & Collect', subtitle: 'Commandes à emporter', emoji: '\u{1F6CD}️', path: '/clickcollect' },
  { id: 'p-catering', title: 'Traiteur', subtitle: 'Service traiteur', emoji: '\u{1F371}', path: '/catering' },
  { id: 'p-centralkitchen', title: 'Cuisine centrale', subtitle: 'Production groupée', emoji: '\u{1F3ED}', path: '/centralkitchen' },
  { id: 'p-qrmenu', title: 'Menu QR', subtitle: 'Carte numérique', emoji: '\u{1F4F1}', path: '/qrmenu' },
]

const ACTIONS: Omit<CommandItem, 'type'>[] = [
  { id: 'a-new-order', title: 'Nouvelle commande', subtitle: 'Ouvrir la caisse', emoji: '\u{1F4B3}', path: '/pos/floor' },
  { id: 'a-new-client', title: 'Ajouter un client', subtitle: 'Créer une fiche client', emoji: '\u{1F465}', path: '/crm/clients' },
  { id: 'a-new-product', title: 'Ajouter un produit', subtitle: 'Nouveau produit au menu', emoji: '\u{1F354}', path: '/admin/catalog' },
  { id: 'a-view-reviews', title: 'Voir les avis', subtitle: 'Avis clients récents', emoji: '\u{1F4AC}', path: '/reputation/avis' },
  { id: 'a-reports', title: 'Voir rapports', subtitle: 'Rapports financiers', emoji: '\u{1F4C8}', path: '/accounting/rapports' },
  { id: 'a-new-reservation', title: 'Nouvelle réservation', subtitle: 'Bloquer une table', emoji: '\u{1F4C5}', path: '/agenda/calendrier' },
  { id: 'a-support', title: 'Contacter le support', subtitle: 'Aide et assistance', emoji: '\u{1F4DE}' },
  { id: 'a-cloture', title: 'Clôture de caisse', subtitle: 'Fermer la journée', emoji: '\u{1F512}', path: '/accounting/cloture' },
  { id: 'a-invite-staff', title: 'Inviter un collaborateur', subtitle: 'Ajouter un membre', emoji: '\u{1F4E7}', path: '/hr/equipe' },
  { id: 'a-install-app', title: 'Installer l\'application', subtitle: 'PWA sur mobile/tablette', emoji: '\u{1F4F2}' },
]

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Marie Dubois', email: 'marie.dubois@example.com' },
  { id: 'c2', name: 'Jean Weber', email: 'j.weber@example.lu' },
  { id: 'c3', name: 'Sophie Thill', email: 'sthill@example.com' },
  { id: 'c4', name: 'Claude Reuter', email: 'creuter@example.lu' },
  { id: 'c5', name: 'Anne Kohn', email: 'a.kohn@example.com' },
  { id: 'c6', name: 'Luc Schmit', email: 'luc.schmit@example.lu' },
  { id: 'c7', name: 'Isabelle Hoffmann', email: 'ihoffmann@example.com' },
  { id: 'c8', name: 'Pierre Muller', email: 'pmuller@example.lu' },
]

const MOCK_PRODUCTS = [
  { id: 'pr1', name: 'Espresso', price: 2.5, cat: 'Boisson' },
  { id: 'pr2', name: 'Cappuccino', price: 3.8, cat: 'Boisson' },
  { id: 'pr3', name: 'Croissant', price: 1.8, cat: 'Pâtisserie' },
  { id: 'pr4', name: 'Tarte du jour', price: 5.0, cat: 'Pâtisserie' },
  { id: 'pr5', name: 'Salade César', price: 13.5, cat: 'Plat' },
  { id: 'pr6', name: 'Burger maison', price: 16.0, cat: 'Plat' },
  { id: 'pr7', name: 'Pasta truffe', price: 22.0, cat: 'Plat' },
  { id: 'pr8', name: 'Mojito classique', price: 11.0, cat: 'Cocktail' },
  { id: 'pr9', name: 'Vin blanc (verre)', price: 6.5, cat: 'Boisson' },
]

function fuzzyMatch(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return 10 - (t.indexOf(q) / t.length)
  let qi = 0
  let score = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 1
      qi++
    }
  }
  return qi === q.length ? score / t.length : 0
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Bon matin, voici votre résumé journalier'
  if (h < 14) return 'Bon midi, prêt pour le service de midi ?'
  if (h < 18) return 'Bon après-midi, comment s\'est passé le midi ?'
  if (h < 23) return 'Bonne soirée, service du soir en cours'
  return 'Bonne nuit, pensez à clôturer votre journée'
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  /* ── load recents ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw))
    } catch {}
  }, [])

  /* ── focus on open ── */
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  /* ── build items ── */
  const allItems: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = []
    ACTIONS.forEach((a) => list.push({ ...a, type: 'action' }))
    PAGES.forEach((p) => list.push({ ...p, type: 'page' }))
    MOCK_CLIENTS.forEach((c) =>
      list.push({
        id: c.id,
        type: 'client',
        title: c.name,
        subtitle: c.email,
        emoji: '\u{1F464}',
        path: '/crm/clients',
      })
    )
    MOCK_PRODUCTS.forEach((p) =>
      list.push({
        id: p.id,
        type: 'product',
        title: p.name,
        subtitle: `${p.cat} · ${p.price.toFixed(2)} €`,
        emoji: '\u{1F37D}️',
        path: '/admin/catalog',
      })
    )
    return list
  }, [])

  const quickItems: CommandItem[] = [
    { id: 'q1', type: 'quick', title: 'Nouvelle commande', emoji: '\u{1F4B3}', subtitle: 'Sauter à la caisse', path: '/pos/floor' },
    { id: 'q2', type: 'quick', title: 'Voir rapports', emoji: '\u{1F4C8}', subtitle: 'Analyses financières', path: '/accounting/rapports' },
    { id: 'q3', type: 'quick', title: 'Ajouter un produit', emoji: '\u{1F354}', subtitle: 'Catalogue', path: '/admin/catalog' },
    { id: 'q4', type: 'quick', title: 'Contacter support', emoji: '\u{1F4DE}', subtitle: 'Aide Creorga' },
  ]

  /* ── filter & group ── */
  const results = useMemo(() => {
    if (!query.trim()) return []
    const scored = allItems
      .map((it) => ({
        it,
        score: Math.max(
          fuzzyMatch(query, it.title),
          fuzzyMatch(query, it.subtitle || '') * 0.7
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
    return scored.map((s) => s.it)
  }, [query, allItems])

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      action: [],
      page: [],
      client: [],
      product: [],
    }
    for (const r of results) {
      if (groups[r.type]) groups[r.type].push(r)
    }
    return groups
  }, [results])

  const flatList: CommandItem[] = useMemo(() => {
    if (!query.trim()) {
      const recentItems = recent
        .map((id) => allItems.find((x) => x.id === id))
        .filter(Boolean) as CommandItem[]
      return [...quickItems, ...recentItems]
    }
    return [
      ...grouped.action,
      ...grouped.page,
      ...grouped.client,
      ...grouped.product,
    ]
  }, [query, grouped, recent, allItems])

  /* ── reset active on list change ── */
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  /* ── keyboard nav ── */
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, flatList.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatList[activeIndex]
        if (item) runItem(item)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, flatList, activeIndex, onClose])

  /* ── scroll active into view ── */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`
    )
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const runItem = (item: CommandItem) => {
    /* store recent */
    try {
      const next = [item.id, ...recent.filter((r) => r !== item.id)].slice(0, 5)
      setRecent(next)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {}
    onClose()
    if (item.onRun) item.onRun()
    else if (item.path) navigate(item.path)
  }

  const typeLabels: Record<string, string> = {
    action: 'Actions rapides',
    page: 'Pages & Modules',
    client: 'Clients',
    product: 'Produits',
  }

  const typeColors: Record<string, string> = {
    action: '#6366f1',
    page: '#8b5cf6',
    client: '#10b981',
    product: '#f59e0b',
    quick: '#ec4899',
  }

  /* ── render helpers ── */
  let runningIndex = -1
  const renderRow = (item: CommandItem) => {
    runningIndex++
    const isActive = runningIndex === activeIndex
    const idx = runningIndex
    return (
      <button
        key={item.id}
        data-cmd-index={idx}
        onMouseEnter={() => setActiveIndex(idx)}
        onClick={() => runItem(item)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 10,
          border: 'none',
          background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
          color: '#0f172a',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.1s',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: isActive ? '#eef2ff' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {item.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </div>
          {item.subtitle && (
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.subtitle}
            </div>
          )}
        </div>
        {isActive && (
          <span
            style={{
              fontSize: 11,
              color: '#94a3b8',
              padding: '3px 7px',
              borderRadius: 5,
              background: '#fff',
              border: '1px solid #e2e8f0',
              fontWeight: 600,
            }}
          >
            {'↵ Ouvrir'}
          </span>
        )}
      </button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
            padding: '12vh 16px 16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 640,
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 30px 80px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '70vh',
            }}
          >
            {/* Search input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span style={{ fontSize: 18, color: '#94a3b8' }}>{'\u{1F50D}'}</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher pages, actions, clients, produits..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 16,
                  color: '#0f172a',
                  fontWeight: 500,
                }}
              />
              <kbd
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 5,
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {!query.trim() ? (
                <>
                  {/* Smart greeting */}
                  <div
                    style={{
                      padding: '10px 14px 14px',
                      fontSize: 13,
                      color: '#6366f1',
                      fontWeight: 600,
                    }}
                  >
                    {'✨ '} {getTimeGreeting()}
                  </div>

                  {/* Quick actions */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '6px 14px 4px',
                    }}
                  >
                    Actions rapides
                  </div>
                  {quickItems.map((it) => renderRow(it))}

                  {/* Recents */}
                  {recent.length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '14px 14px 4px',
                        }}
                      >
                        {'Récent'}
                      </div>
                      {recent
                        .map((id) => allItems.find((x) => x.id === id))
                        .filter(Boolean)
                        .map((it) => renderRow(it as CommandItem))}
                    </>
                  )}
                </>
              ) : flatList.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F50D}'}</div>
                  <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                    {'Aucun résultat pour'}
                    <span style={{ color: '#0f172a', marginLeft: 6 }}>"{query}"</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Essayez un autre terme ou une action
                  </div>
                </div>
              ) : (
                (['action', 'page', 'client', 'product'] as const).map((k) =>
                  grouped[k].length > 0 ? (
                    <div key={k}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '10px 14px 4px',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: typeColors[k],
                          }}
                        />
                        {typeLabels[k]}
                        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                          {grouped[k].length}
                        </span>
                      </div>
                      {grouped[k].map((it) => renderRow(it))}
                    </div>
                  ) : null
                )
              )}
            </div>

            {/* Footer hints */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderTop: '1px solid #f1f5f9',
                background: '#fafbfc',
                fontSize: 11,
                color: '#94a3b8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <kbd style={kbdStyle}>{'↑'}</kbd>
                  <kbd style={kbdStyle}>{'↓'}</kbd>
                  Naviguer
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <kbd style={kbdStyle}>{'↵'}</kbd>
                  {'Sélectionner'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <kbd style={kbdStyle}>Esc</kbd>
                  Fermer
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <kbd style={kbdStyle}>{'⌘K'}</kbd>
                <span>Creorga</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 4,
  background: '#fff',
  border: '1px solid #e2e8f0',
  color: '#64748b',
  fontWeight: 600,
  minWidth: 18,
  textAlign: 'center',
  fontFamily: 'inherit',
}
