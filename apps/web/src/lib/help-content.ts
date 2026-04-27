/**
 * Help Center content — articles, videos, agent commands per module.
 *
 * Used by <HelpCenter> to display module-aware guidance.
 * The path matching is prefix-based (e.g. '/inventory' matches '/inventory/stock').
 */

export interface HelpArticle {
  id: string
  title: string
  body: string         // markdown supported
  steps?: string[]     // numbered demo steps if it's a how-to
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface HelpVideo {
  id: string
  title: string
  duration: string     // e.g. "2:14"
  youtubeId?: string   // optional
  description: string
}

/** Commande "agent" cliquable — exécutée par /api/agent/execute */
export interface AgentCommand {
  id: string
  label: string
  description: string
  example?: string     // example value the user can fill in
  needsInput?: { field: string; label: string; placeholder?: string }
  icon?: string        // emoji
}

export interface ModuleHelp {
  module: string
  pathPrefix: string
  title: string
  emoji: string
  description: string
  articles: HelpArticle[]
  videos: HelpVideo[]
  commands: AgentCommand[]
}

export const HELP_CONTENT: ModuleHelp[] = [
  // ─── HOME / MODULES ─────────────────────────────────────────────────────
  {
    module: 'home', pathPrefix: '/modules',
    title: 'Accueil & navigation', emoji: '🏠',
    description: 'Sélecteur de modules, recherche, raccourcis.',
    articles: [
      {
        id: 'home.first-steps', level: 'beginner',
        title: 'Premiers pas dans Creorga OS',
        body: 'Le sélecteur affiche les 35 modules. Cliquez sur une carte pour ouvrir un module ; utilisez la barre de recherche (Cmd+K) pour le trouver instantanément. Les modules se filtrent par catégorie : Core, Business, Digital, Admin.',
      },
      {
        id: 'home.theme', level: 'beginner',
        title: 'Activer le mode sombre',
        body: 'Cliquez sur l\'icône 🌙 dans le header. Trois modes : ☀️ Clair · 🌙 Sombre · 💻 Système (suit l\'OS). L\'app re-thème immédiatement (overlay CSS).',
        steps: ['Allez dans le header en haut à droite', 'Cliquez sur 🌙', 'L\'interface bascule en sombre'],
      },
    ],
    videos: [
      { id: 'v.home.tour', title: 'Tour complet de Creorga OS', duration: '3:20', description: 'Découvrez les 35 modules et l\'interface principale.' },
    ],
    commands: [
      { id: 'home.day-summary', label: 'Résumé du jour', description: 'CA, couverts, top 3 plats, alertes', icon: '📊' },
      { id: 'home.module-suggest', label: 'Suggérer un module', description: 'IA recommande un module selon votre besoin', needsInput: { field: 'need', label: 'Décrivez votre besoin', placeholder: 'ex : envoyer une newsletter aux clients' }, icon: '✨' },
    ],
  },

  // ─── POS / CAISSE ───────────────────────────────────────────────────────
  {
    module: 'pos', pathPrefix: '/pos',
    title: 'Caisse POS', emoji: '💳',
    description: 'Tickets, plan de salle, encaissements, remises.',
    articles: [
      {
        id: 'pos.offert', level: 'beginner',
        title: 'Offrir un plat ou une boisson',
        body: 'Le bouton 🎁 Offert exclut le montant des revenus tout en le traçant en comptabilité. Idéal pour les gestes commerciaux.',
        steps: [
          'Ouvrez le ticket de la table',
          'Cliquez sur le bouton "Remise" en bas du panier',
          'Choisissez l\'onglet 🎁 Offert',
          'Sélectionnez les articles à offrir',
          'Validez — le montant est ajouté au champ comptable freeAmount',
        ],
      },
      {
        id: 'pos.fullscreen', level: 'beginner',
        title: 'Mode plein écran de l\'éditeur',
        body: 'Pour configurer un grand plan de salle (>10 tables), basculez l\'éditeur en plein écran : bouton ⛶ en haut à droite. Touche Esc pour quitter.',
      },
      {
        id: 'pos.transfer', level: 'intermediate',
        title: 'Transférer une commande entre tables',
        body: 'Drag & drop d\'une chaise sur une autre table. Les items suivent la chaise. Ou utilisez l\'API /transfer/items pour ne déplacer qu\'une partie.',
      },
    ],
    videos: [
      { id: 'v.pos.demo', title: 'Démo POS : prendre une commande', duration: '2:14', description: 'De l\'ouverture de table jusqu\'à l\'encaissement.' },
      { id: 'v.pos.floor', title: 'Configurer un plan de salle', duration: '4:08', description: 'Multi-zones (Salle/Bar/Terrasse), tables drag & drop, fusion.' },
    ],
    commands: [
      { id: 'pos.day-stats', label: 'Stats du jour', description: 'CA, ticket moyen, tables servies', icon: '📊' },
      { id: 'pos.open-tables', label: 'Tables ouvertes', description: 'Liste des tables OCCUPEE actuellement', icon: '🪑' },
      { id: 'pos.stale-sessions', label: 'Sessions anciennes', description: 'Tables ouvertes > 4h sans paiement', icon: '⏱️' },
    ],
  },

  // ─── INVOICES / FACTURES ────────────────────────────────────────────────
  {
    module: 'invoices', pathPrefix: '/invoices',
    title: 'Factures & Devis', emoji: '📋',
    description: 'Facturation B2B, relances automatiques, export FAIA.',
    articles: [
      {
        id: 'inv.create', level: 'beginner',
        title: 'Créer une facture en 30 secondes',
        body: 'Bouton "+ Nouvelle facture". Sélectionnez le client, ajoutez des lignes (ou importez depuis un ticket POS), choisissez la date d\'échéance, validez. PDF généré automatiquement avec votre logo.',
        steps: [
          'Cliquez sur "+ Nouvelle facture"',
          'Tapez les premières lettres du nom client → autocomplétion',
          'Ajoutez les lignes (description, qté, prix HT, TVA)',
          'Choisissez la date d\'échéance (par défaut : J+30)',
          'Validez → PDF + email envoyé',
        ],
      },
      {
        id: 'inv.relance', level: 'intermediate',
        title: 'Relances automatiques',
        body: 'Une facture en retard de 7/15/30 jours déclenche un email de relance progressive. Configurez les templates dans /invoices/relances. La 3e relance peut basculer en recouvrement.',
      },
      {
        id: 'inv.faia', level: 'advanced',
        title: 'Export FAIA (Luxembourg)',
        body: 'Le Fichier d\'Audit Informatisé de l\'AED est exporté en 1 clic depuis /accounting/rapports. Conforme XSD 2.0.0. Donné à votre comptable pour la déclaration TVA annuelle.',
      },
    ],
    videos: [
      { id: 'v.inv.create', title: 'Créer une facture pas-à-pas', duration: '1:48', description: 'Démo complète depuis le POS jusqu\'à l\'envoi email.' },
      { id: 'v.inv.relance', title: 'Configurer les relances', duration: '3:02', description: 'Templates, calendrier, escalade.' },
    ],
    commands: [
      { id: 'inv.find-by-number', label: 'Trouver une facture', description: 'Cherche par numéro et propose download', needsInput: { field: 'number', label: 'Numéro de facture', placeholder: 'ex : F-2026-0142' }, example: 'F-2026-0142', icon: '🔍' },
      { id: 'inv.find-by-client', label: 'Factures d\'un client', description: 'Liste les factures d\'un client', needsInput: { field: 'name', label: 'Nom du client', placeholder: 'ex : Brasserie du Centre' }, icon: '👤' },
      { id: 'inv.overdue', label: 'Factures en retard', description: 'Liste les impayés > 30 jours', icon: '⏰' },
      { id: 'inv.unpaid-total', label: 'Total impayé', description: 'Somme des factures non réglées', icon: '💶' },
    ],
  },

  // ─── INVENTORY / STOCKS ─────────────────────────────────────────────────
  {
    module: 'inventory', pathPrefix: '/inventory',
    title: 'Stocks & Inventaire', emoji: '📦',
    description: 'Gestion des stocks, OCR factures, prévisions IA.',
    articles: [
      {
        id: 'inv.ocr', level: 'beginner',
        title: 'Scanner un ticket fournisseur',
        body: 'Bouton 📸 OCR Scanner. Tesseract.js extrait le texte localement, Gemma 2B le parse en JSON structuré (fournisseur, articles, qté, prix, TVA). Validez la table éditable, le stock est mis à jour automatiquement.',
        steps: [
          'Cliquez sur "📸 Scanner OCR" en haut',
          'Glissez la photo ou prenez-la avec la webcam',
          'Tesseract.js + Gemma analysent (~3 secondes)',
          'Vérifiez la table proposée, modifiez si nécessaire',
          'Cliquez "Valider" → stock mis à jour',
        ],
      },
      {
        id: 'inv.forecast', level: 'intermediate',
        title: 'Prévisions IA de consommation',
        body: 'Cron quotidien 06h00 : Gemma analyse 90 j d\'historique + météo + calendrier événements. Bandeau orange si conso prévue > stock disponible J+1.',
      },
      {
        id: 'inv.haccp', level: 'advanced',
        title: 'Liaison HACCP & sondes Bluetooth',
        body: 'Connectez une sonde Govee H5101 (~25 €) → backend reçoit la température toutes les 5 min. Si T > 5 °C plus de 30 min, alerte push + ticket maintenance auto-créé.',
      },
    ],
    videos: [
      { id: 'v.inv.ocr', title: 'OCR ticket en 30 secondes', duration: '0:45', description: 'Démo Gemma + Tesseract.' },
      { id: 'v.inv.forecast', title: 'Prévisions IA expliquées', duration: '2:30', description: 'Comment Gemma anticipe les ruptures.' },
    ],
    commands: [
      { id: 'inv.low-stock', label: 'Articles en rupture', description: 'Liste stock < seuil minimum', icon: '⚠️' },
      { id: 'inv.find-product', label: 'Trouver un produit', description: 'Cherche par nom dans le stock', needsInput: { field: 'name', label: 'Nom produit', placeholder: 'ex : tomate' }, icon: '🔍' },
      { id: 'inv.value', label: 'Valeur totale stock', description: 'Somme prix unitaire × quantité', icon: '💶' },
      { id: 'inv.expiring', label: 'Bientôt périmé', description: 'Articles à consommer dans 7 j', icon: '📅' },
    ],
  },

  // ─── CRM / CLIENTS ──────────────────────────────────────────────────────
  {
    module: 'crm', pathPrefix: '/crm',
    title: 'CRM Clients', emoji: '👥',
    description: 'Base clients, fidélité, segmentation, RGPD.',
    articles: [
      {
        id: 'crm.score', level: 'intermediate',
        title: 'Comprendre le score VIP',
        body: 'Score = log(visites_30j) × ticketMoyen / médiane_restaurant. Top 10 % = badge ⭐ VIP visible dans le POS. Permet upsell ciblé par les serveurs.',
      },
      {
        id: 'crm.relance', level: 'beginner',
        title: 'Relancer un client perdu',
        body: 'Bouton "IA Clients" → "Message de relance". Gemma rédige un message personnalisé (nom + plat préféré + ton brasserie) que vous approuvez avant envoi. Jamais auto-send pour conformité CNPD.',
        steps: [
          'Allez dans /crm/clients',
          'Filtrez sur "lastVisit > 60 jours"',
          'Sélectionnez un client',
          'Cliquez "IA Clients" → "Message de relance"',
          'Validez le texte généré → SMS/email envoyé',
        ],
      },
      {
        id: 'crm.rgpd', level: 'advanced',
        title: 'Conformité CNPD Luxembourg',
        body: 'Export client (droit d\'accès), suppression définitive (droit à l\'oubli), consentement traçable. Tous les modules respectent le RGPD luxembourgeois.',
      },
    ],
    videos: [
      { id: 'v.crm.intro', title: 'Tour CRM 360°', duration: '4:12', description: 'Timeline, dépenses, allergies, notes.' },
    ],
    commands: [
      { id: 'crm.find-customer', label: 'Trouver un client', description: 'Recherche nom/email/téléphone', needsInput: { field: 'query', label: 'Nom ou email', placeholder: 'ex : Bryan ou bryan@…' }, icon: '🔍' },
      { id: 'crm.vip-list', label: 'Liste VIP', description: 'Top 10 % clients par score', icon: '⭐' },
      { id: 'crm.lost-customers', label: 'Clients perdus', description: 'Pas vu depuis 60+ jours', icon: '🥺' },
      { id: 'crm.birthdays', label: 'Anniversaires du mois', description: 'Clients à fêter ce mois', icon: '🎂' },
    ],
  },

  // ─── HR / PLANNING ──────────────────────────────────────────────────────
  {
    module: 'hr', pathPrefix: '/hr',
    title: 'RH & Planning', emoji: '🗓️',
    description: 'Planning équipe, congés, pointages, droit luxembourgeois.',
    articles: [
      {
        id: 'hr.auto-plan', level: 'intermediate',
        title: 'Auto-planifier la semaine (IA)',
        body: 'Bouton "Auto-planifier (IA)" → Gemma propose une affectation respectant 35h max, 2 jours OFF consécutifs, couverture midi/soir. Vous validez ou ajustez.',
      },
      {
        id: 'hr.ocr-import', level: 'beginner',
        title: 'Importer un planning manuscrit (OCR)',
        body: 'Bouton "📸 Importer planning OCR". Photo → Tesseract → Gemma extrait shifts {employé, jour, début, fin}. Format reconnu : "Lundi 8h-16h Marie".',
        steps: [
          'Cliquez sur "📸 Importer planning OCR"',
          'Glissez la photo du tableau',
          'Tesseract OCR (~5 s) puis Gemma parse en JSON',
          'Vérifiez la table éditable',
          'Cliquez "Importer" → shifts ajoutés au planning',
        ],
      },
    ],
    videos: [
      { id: 'v.hr.ocr', title: 'OCR planning manuscrit', duration: '1:12', description: 'De la photo aux shifts.' },
    ],
    commands: [
      { id: 'hr.who-today', label: 'Qui travaille aujourd\'hui ?', description: 'Liste des shifts du jour', icon: '🕐' },
      { id: 'hr.overtime-alerts', label: 'Heures sup', description: 'Employés > 40h cette semaine', icon: '⚠️' },
      { id: 'hr.coverage-check', label: 'Vérifier sous-effectif', description: 'Croise prévis CA × effectif planifié', icon: '🛡️' },
    ],
  },

  // ─── ACCOUNTING / COMPTABILITÉ ─────────────────────────────────────────
  {
    module: 'accounting', pathPrefix: '/accounting',
    title: 'Comptabilité', emoji: '💶',
    description: 'TVA, dépenses, clôture, export FAIA.',
    articles: [
      {
        id: 'acc.categorize', level: 'beginner',
        title: 'Catégoriser une dépense automatiquement',
        body: 'Bouton "IA Compta" → "Catégoriser dépense". Gemma applique le PCN luxembourgeois et détecte le taux TVA correct (3 / 8 / 14 / 17 %).',
      },
      {
        id: 'acc.cloture', level: 'advanced',
        title: 'Clôture mensuelle',
        body: 'Page /accounting/cloture. Vérifie cohérence revenus/dépenses, bloque les modifications, génère le compte de résultat. Réversible 7 jours.',
      },
    ],
    videos: [
      { id: 'v.acc.faia', title: 'Export FAIA expliqué', duration: '2:50', description: 'Comment exporter pour l\'ACD.' },
    ],
    commands: [
      { id: 'acc.month-summary', label: 'Résumé du mois', description: 'CA, dépenses, marge, TVA', icon: '📊' },
      { id: 'acc.tva-current', label: 'TVA en cours', description: 'À déclarer ce trimestre', icon: '📑' },
      { id: 'acc.expense-by-cat', label: 'Dépenses par catégorie', description: 'Pie chart top catégories', icon: '🥧' },
    ],
  },

  // ─── REPUTATION ────────────────────────────────────────────────────────
  {
    module: 'reputation', pathPrefix: '/reputation',
    title: 'Avis & e-réputation', emoji: '⭐',
    description: 'Google, TripAdvisor, Facebook, réponses IA.',
    articles: [
      {
        id: 'rep.respond', level: 'beginner',
        title: 'Répondre à un avis avec l\'IA',
        body: 'Bouton "IA Avis" → "Réponds avis". Gemma rédige une réponse polie en 4 langues (FR/DE/EN/PT). Vous éditez puis postez. Réponse < 24 h booste votre SEO local.',
      },
    ],
    videos: [
      { id: 'v.rep.respond', title: 'Réponse IA aux avis', duration: '1:35', description: 'Multi-langue + ton sincère.' },
    ],
    commands: [
      { id: 'rep.recent', label: 'Avis récents', description: '7 derniers avis toutes plateformes', icon: '🆕' },
      { id: 'rep.negative', label: 'Avis négatifs', description: 'Notes < 3/5 non répondus', icon: '😞' },
      { id: 'rep.avg-rating', label: 'Note moyenne', description: 'Score actuel toutes plateformes', icon: '⭐' },
    ],
  },

  // ─── MARKETING ─────────────────────────────────────────────────────────
  {
    module: 'marketing', pathPrefix: '/marketing',
    title: 'Marketing', emoji: '📣',
    description: 'Campagnes email/SMS, audiences, codes promo.',
    articles: [
      {
        id: 'mkt.campaign', level: 'beginner',
        title: 'Créer une campagne en 1 minute',
        body: 'Bouton "IA Marketing" → "Rédiger une campagne". Vous indiquez objectif + audience + canal. Gemma génère subject + body + post Insta + hashtags. Validez puis envoyez.',
      },
    ],
    videos: [
      { id: 'v.mkt.demo', title: 'Campagne IA en direct', duration: '2:00', description: 'De l\'idée à l\'envoi.' },
    ],
    commands: [
      { id: 'mkt.last-campaign', label: 'Dernière campagne', description: 'Stats ouverture / clics', icon: '📈' },
      { id: 'mkt.audience-suggest', label: 'Suggérer audience', description: 'IA propose un segment cible', needsInput: { field: 'goal', label: 'Objectif', placeholder: 'ex : remplir mardis midi' }, icon: '✨' },
    ],
  },

  // ─── AI ASSISTANT ──────────────────────────────────────────────────────
  {
    module: 'ai', pathPrefix: '/ai',
    title: 'Assistant IA', emoji: '🤖',
    description: 'Gemma 2B local + Claude cloud. Provider switch.',
    articles: [
      {
        id: 'ai.provider', level: 'beginner',
        title: 'Local Gemma vs Cloud Claude',
        body: 'Local Gemma 2B → 100 % privé (CNPD), gratuit, ~2 s. Cloud Claude → meilleure qualité, ~3 s, payant. Mode "Auto" : routage automatique selon sensibilité (privacy → local, qualité → cloud).',
      },
      {
        id: 'ai.gemma-9b', level: 'advanced',
        title: 'Passer à Gemma 9B (qualité)',
        body: 'Pour des tâches complexes (parse OCR planning, analyse longue), passez le paramètre quality: "best" — le backend utilise gemma2:9b. Nécessite 8+ GB RAM disponible.',
      },
    ],
    videos: [
      { id: 'v.ai.intro', title: 'Démo Assistant IA', duration: '3:30', description: 'Toutes les actions disponibles.' },
    ],
    commands: [
      { id: 'ai.list-actions', label: '15 actions IA disponibles', description: 'Catalogue complet', icon: '📚' },
      { id: 'ai.test-gemma', label: 'Tester Gemma', description: 'Ping rapide pour vérifier qu\'Ollama répond', icon: '🩺' },
    ],
  },
]

export function getHelpForPath(path: string): ModuleHelp {
  // Match longest prefix
  const match = HELP_CONTENT
    .filter((h) => path.startsWith(h.pathPrefix))
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0]
  return match || HELP_CONTENT[0]
}
