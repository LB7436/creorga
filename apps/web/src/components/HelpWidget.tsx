import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useThemeColors } from '@/lib/theme'
import { trackEvent } from '@/lib/analytics'

/* ------------------------------------------------------------------ */
/* Données                                                            */
/* ------------------------------------------------------------------ */

type HelpTab = 'faq' | 'docs' | 'videos' | 'contact' | 'bug' | 'feature'

interface FAQ {
  q: string
  a: string
  module?: string
}

const FAQS: FAQ[] = [
  // POS
  { module: 'pos', q: 'Comment créer une commande au POS ?', a: 'Depuis le module POS, sélectionnez les produits puis cliquez sur "Valider".' },
  { module: 'pos', q: 'Comment appliquer une remise ?', a: 'Cliquez sur une ligne de commande puis "Remise" pour saisir un pourcentage ou un montant.' },
  { module: 'pos', q: 'Comment annuler une commande ?', a: 'Ouvrez la commande, puis utilisez l\'action "Annuler" ou raccourci Esc.' },
  { module: 'pos', q: 'Raccourci pour nouvelle commande ?', a: 'Utilisez Cmd+N (ou Ctrl+N sur Windows).' },
  { module: 'pos', q: 'Comment imprimer un ticket ?', a: 'Cliquez sur "Imprimer" après validation, ou activez l\'impression automatique dans les réglages.' },
  // Invoices
  { module: 'invoices', q: 'Comment générer une facture ?', a: 'Depuis Factures, cliquez sur "Nouvelle facture" et renseignez client + lignes.' },
  { module: 'invoices', q: 'Comment envoyer une facture par email ?', a: 'Ouvrez la facture puis "Envoyer par email" — un PDF sera joint automatiquement.' },
  { module: 'invoices', q: 'Comment marquer une facture comme payée ?', a: 'Cliquez sur la facture puis "Marquer payée".' },
  { module: 'invoices', q: 'Puis-je programmer des factures récurrentes ?', a: 'Oui, activez "Récurrent" lors de la création et définissez la fréquence.' },
  { module: 'invoices', q: 'Comment exporter la comptabilité ?', a: 'Menu Factures → Export → choisissez la période et le format (CSV/PDF).' },
  // Clients
  { module: 'clients', q: 'Comment ajouter un nouveau client ?', a: 'Module Clients → "Ajouter un client" → remplissez les informations.' },
  { module: 'clients', q: 'Puis-je importer mes clients ?', a: 'Oui, depuis Clients → Importer → fichier CSV.' },
  { module: 'clients', q: 'Comment voir l\'historique d\'un client ?', a: 'Cliquez sur le client pour voir toutes ses commandes et factures.' },
  { module: 'clients', q: 'Comment gérer les contacts RGPD ?', a: 'Chaque fiche client a un onglet "RGPD" pour gérer les consentements.' },
  { module: 'clients', q: 'Fusionner deux fiches clients ?', a: 'Sélectionnez deux clients puis "Fusionner" dans les actions groupées.' },
  // General
  { q: 'Comment changer la langue ?', a: 'Depuis le header, cliquez sur le sélecteur de langue (FR/EN/DE/LU).' },
  { q: 'Comment activer le mode sombre ?', a: 'Cliquez sur l\'icône lune/soleil dans le header.' },
  { q: 'Où voir mes raccourcis clavier ?', a: 'Appuyez sur Cmd+/ (ou Ctrl+/) pour afficher la liste complète.' },
  { q: 'Comment contacter le support ?', a: 'Utilisez ce widget, onglet "Contact support", ou écrivez à support@creorga.lu.' },
  { q: 'Où télécharger l\'application mobile ?', a: 'Disponible bientôt sur iOS et Android. Suivez l\'actualité sur creorga.lu.' },
]

const DOCS = [
  { title: 'Guide de démarrage', url: 'https://docs.creorga.lu/start' },
  { title: 'Documentation POS', url: 'https://docs.creorga.lu/pos' },
  { title: 'Gestion des factures', url: 'https://docs.creorga.lu/invoices' },
  { title: 'Module Clients (CRM)', url: 'https://docs.creorga.lu/clients' },
  { title: 'API développeurs', url: 'https://docs.creorga.lu/api' },
  { title: 'FAQ complète', url: 'https://docs.creorga.lu/faq' },
]

const VIDEOS = [
  { title: 'Premiers pas avec Creorga', duration: '3:24' },
  { title: 'Créer votre première commande', duration: '2:10' },
  { title: 'Générer et envoyer une facture', duration: '4:15' },
  { title: 'Gérer vos clients et contacts', duration: '3:48' },
  { title: 'Personnaliser votre dashboard', duration: '2:55' },
  { title: 'Astuces et raccourcis clavier', duration: '5:02' },
]

/* ------------------------------------------------------------------ */
/* Composant                                                          */
/* ------------------------------------------------------------------ */

function HelpWidget() {
  const colors = useThemeColors()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<HelpTab>('faq')
  const [search, setSearch] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [sent, setSent] = useState(false)

  // contexte : module courant
  const currentModule = useMemo(() => {
    const match = location.pathname.match(/\/modules?\/([a-z0-9-]+)/i)
    return match?.[1] ?? null
  }, [location.pathname])

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = FAQS
    if (currentModule) {
      list = [
        ...FAQS.filter((f) => f.module === currentModule),
        ...FAQS.filter((f) => !f.module),
      ]
    }
    if (!q) return list
    return list.filter(
      (f) =>
        f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    )
  }, [search, currentModule])

  const handleOpen = () => {
    setOpen(true)
    trackEvent('help_opened', { path: location.pathname, module: currentModule })
  }

  const handleSendContact = (type: 'contact' | 'bug' | 'feature') => {
    if (!contactMsg.trim()) return
    trackEvent('help_submitted', { type, hasEmail: !!contactEmail })
    setSent(true)
    setContactMsg('')
    setContactEmail('')
    setTimeout(() => setSent(false), 3000)
  }

  const TABS: Array<{ id: HelpTab; label: string; icon: string }> = [
    { id: 'faq', label: 'FAQ', icon: '\u2753' },
    { id: 'docs', label: 'Docs', icon: '\u{1F4D6}' },
    { id: 'videos', label: 'Vidéos', icon: '\u{1F3A5}' },
    { id: 'contact', label: 'Support', icon: '\u{1F4AC}' },
    { id: 'bug', label: 'Bug', icon: '\u{1F41E}' },
    { id: 'feature', label: 'Idée', icon: '\u{1F4A1}' },
  ]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label="Centre d'aide"
        title="Besoin d'aide ?"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(59,130,246,0.4)',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {'\u2753'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Centre d'aide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(6px)',
              zIndex: 950,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
              padding: 24,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, x: -40, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -40, y: 20 }}
              style={{
                width: 420,
                maxHeight: '85vh',
                background: colors.bgCard,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.text }}>
                    Centre d'aide
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textLight }}>
                    {currentModule
                      ? `Contexte : ${currentModule}`
                      : 'Comment pouvons-nous vous aider ?'}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans l'aide..."
                  aria-label="Rechercher"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.bg,
                    color: colors.text,
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '8px 8px 0',
                  borderBottom: `1px solid ${colors.border}`,
                  overflowX: 'auto',
                }}
              >
                {TABS.map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setTab(tb.id)}
                    aria-selected={tab === tb.id}
                    role="tab"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px 8px 0 0',
                      border: 'none',
                      background: tab === tb.id ? colors.bg : 'transparent',
                      color: tab === tb.id ? colors.accent : colors.textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      borderBottom: tab === tb.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{tb.icon}</span>
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {tab === 'faq' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredFaqs.length === 0 ? (
                      <p style={{ color: colors.textLight, fontSize: 13, textAlign: 'center', padding: 20 }}>
                        Aucun résultat pour "{search}"
                      </p>
                    ) : (
                      filteredFaqs.slice(0, 10).map((f, i) => (
                        <details
                          key={i}
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        >
                          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.text }}>
                            {f.q}
                          </summary>
                          <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.textMuted, lineHeight: 1.5 }}>
                            {f.a}
                          </p>
                        </details>
                      ))
                    )}
                  </div>
                )}

                {tab === 'docs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DOCS.map((d) => (
                      <a
                        key={d.url}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          fontSize: 13,
                          fontWeight: 500,
                          textDecoration: 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{d.title}</span>
                        <span style={{ color: colors.accent }}>{'\u2192'}</span>
                      </a>
                    ))}
                  </div>
                )}

                {tab === 'videos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {VIDEOS.map((v, i) => (
                      <button
                        key={i}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{'\u25B6\uFE0F'}</span>
                          {v.title}
                        </span>
                        <span style={{ fontSize: 11, color: colors.textLight }}>{v.duration}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(tab === 'contact' || tab === 'bug' || tab === 'feature') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
                      {tab === 'contact' && 'Décrivez votre demande, notre équipe vous répond sous 24 h.'}
                      {tab === 'bug' && 'Aidez-nous à améliorer Creorga en décrivant le problème rencontré.'}
                      {tab === 'feature' && 'Partagez votre idée pour une nouvelle fonctionnalité.'}
                    </p>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Votre email (optionnel)"
                      aria-label="Email"
                      style={{
                        padding: '9px 12px', borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        background: colors.bg, color: colors.text,
                        fontSize: 13, outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <textarea
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      placeholder={
                        tab === 'bug'
                          ? 'Décrivez le bug en détail (étapes pour reproduire, etc.)'
                          : tab === 'feature'
                          ? 'Décrivez votre idée...'
                          : 'Votre message...'
                      }
                      rows={5}
                      aria-label="Message"
                      style={{
                        padding: '10px 12px', borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        background: colors.bg, color: colors.text,
                        fontSize: 13, outline: 'none',
                        resize: 'vertical', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => handleSendContact(tab)}
                      disabled={!contactMsg.trim() || sent}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: 'none',
                        background: sent
                          ? '#10b981'
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: contactMsg.trim() && !sent ? 'pointer' : 'not-allowed',
                        opacity: contactMsg.trim() || sent ? 1 : 0.5,
                      }}
                    >
                      {sent ? 'Envoyé ! Merci' : 'Envoyer'}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  borderTop: `1px solid ${colors.border}`,
                  fontSize: 11,
                  color: colors.textLight,
                  textAlign: 'center',
                }}
              >
                support@creorga.lu · +352 20 33 44 55
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default HelpWidget
