/**
 * Help Center content — articles, videos, agent commands per module.
 *
 * Path matching : longest-prefix wins. /clients (portal config) is distinct
 * from /crm/clients (CRM database).
 *
 * Articles can declare `demo.targets[]` — selectors to highlight in real time
 * when the user clicks "▶ Démo" — the InteractiveTutorial overlay walks
 * through them, encircling each element with a pulsing ring + tooltip.
 */

export interface DemoStep {
  selector?: string         // CSS selector to highlight (data-tour attribute preferred)
  text: string              // tooltip text
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: 'click' | 'hover' | 'observe'
}

export interface HelpArticle {
  id: string
  title: string
  body: string
  steps?: string[]          // textual numbered steps
  demo?: DemoStep[]         // optional interactive walk-through
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface HelpVideo {
  id: string
  title: string
  duration: string
  youtubeId?: string
  description: string
  /** Si fourni, le bouton Play lance un tutoriel interactif sur la page courante */
  interactiveDemo?: DemoStep[]
}

export interface AgentCommand {
  id: string
  label: string
  description: string
  example?: string
  needsInput?: { field: string; label: string; placeholder?: string }
  icon?: string
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

  // ═══ HOME / MODULES ════════════════════════════════════════════════════
  {
    module: 'home', pathPrefix: '/modules',
    title: 'Accueil & navigation', emoji: '🏠',
    description: 'Sélecteur de modules, recherche globale, raccourcis.',
    articles: [
      {
        id: 'home.first-steps', level: 'beginner',
        title: 'Premiers pas dans Creorga OS',
        body: 'Le sélecteur affiche les 35 modules. Cliquez sur une carte pour ouvrir un module ; utilisez la barre de recherche (Cmd+K) pour le trouver instantanément. Les modules se filtrent par catégorie : Core, Business, Digital, Admin.',
        steps: [
          'Identifiez la catégorie du module recherché (Core / Business / Digital / Admin)',
          'Cliquez sur le filtre correspondant en haut',
          'Ou tapez Cmd+K (Ctrl+K) et écrivez le nom directement',
          'Cliquez sur la carte du module pour l\'ouvrir',
        ],
        demo: [
          { selector: '[data-tour="search"]', text: 'Cherchez un module en tapant son nom', position: 'bottom' },
          { selector: '[data-tour="filters"]', text: 'Ou filtrez par catégorie', position: 'bottom' },
          { selector: '[data-tour="module-card"]', text: 'Cliquez sur une carte pour ouvrir le module', position: 'right' },
        ],
      },
      {
        id: 'home.theme', level: 'beginner',
        title: 'Activer le mode sombre',
        body: 'Cliquez sur l\'icône 🌙 dans le header. Trois modes : ☀️ Clair · 🌙 Sombre · 💻 Système (suit l\'OS).',
        steps: ['Allez dans le header en haut à droite', 'Cliquez sur l\'icône 🌙', 'Le thème bascule immédiatement (overlay CSS auto-darken)'],
      },
      {
        id: 'home.shortcuts', level: 'intermediate',
        title: 'Raccourcis clavier',
        body: 'Cmd/Ctrl+K : recherche · Cmd/Ctrl+/: aide · Cmd/Ctrl+Shift+M : changer module · Échap : ferme tout. Toutes les pages POS supportent les flèches du clavier pour naviguer.',
      },
    ],
    videos: [
      { id: 'v.home.tour', title: 'Tour complet de Creorga OS', duration: '3:20', description: 'Découvrez les 35 modules et l\'interface principale.' },
      { id: 'v.home.cmdk',  title: 'La recherche universelle Cmd+K', duration: '0:45', description: 'Trouver n\'importe quoi en 2 secondes.' },
    ],
    commands: [
      { id: 'home.day-summary',     label: 'Résumé du jour',         description: 'Tables occupées + CA en cours',                icon: '📊' },
      { id: 'home.module-suggest',  label: 'Suggérer un module',     description: 'IA recommande un module selon votre besoin',  needsInput: { field: 'need', label: 'Décrivez votre besoin', placeholder: 'ex : envoyer une newsletter' }, icon: '✨' },
    ],
  },

  // ═══ PORTAL CLIENT CONFIG (/clients) ═══════════════════════════════════
  {
    module: 'portal', pathPrefix: '/clients',
    title: 'Portail Client (config)', emoji: '📱',
    description: 'Configuration de l\'expérience guest : menu, commande, jeux, avis.',
    articles: [
      {
        id: 'portal.toggles', level: 'beginner',
        title: 'Activer/désactiver une fonctionnalité',
        body: 'Chaque toggle ON/OFF active la section côté guest. Les changements sont reflétés en moins de 3 secondes sur le portail mobile (port 5176/5178). Pas de redémarrage nécessaire.',
        steps: [
          'Identifiez la fonctionnalité à activer (Menu, Commande, Jeux, Chat, Avis, Annonces)',
          'Cliquez sur le toggle correspondant à droite',
          'Le toggle bascule en violet (ON)',
          'Vérifiez sur le portail (5178/5176) — la section apparaît/disparaît en 3 s',
        ],
        demo: [
          { selector: '[data-tour="portal-toggle"]', text: 'Cliquez ici pour activer/désactiver', position: 'left' },
        ],
      },
      {
        id: 'portal.games', level: 'beginner',
        title: 'Choisir les jeux disponibles',
        body: 'Section "Jeux disponibles" : 28 jeux, cochez ceux que vous voulez exposer. Boutons "Tout activer / Tout désactiver" en haut. Sync per-jeu (correctif v3.4) : chaque toggle est indépendant.',
      },
      {
        id: 'portal.qr', level: 'beginner',
        title: 'Imprimer les QR codes par table',
        body: 'Allez dans /qrmenu → bouton "Générer QR par table". Un PDF avec un QR par table est téléchargé. Collez-les sur les tables — le client scanne et arrive directement sur le portail (sans saisir le code table).',
      },
      {
        id: 'portal.theme', level: 'intermediate',
        title: 'Thème côté client (Clair / Sombre / Mauve)',
        body: 'Le portail propose 3 thèmes en haut. Le client choisit, persisté dans son localStorage. Le thème admin (côté gérant) est indépendant.',
      },
    ],
    videos: [
      { id: 'v.portal.toggles', title: 'Configurer le portail en 1 minute', duration: '1:10', description: 'Toggles + jeux + thème.' },
    ],
    commands: [
      { id: 'home.day-summary', label: 'Activité guest aujourd\'hui', description: 'Combien de scans QR + commandes',  icon: '📈' },
    ],
  },

  // ═══ POS / CAISSE ══════════════════════════════════════════════════════
  {
    module: 'pos', pathPrefix: '/pos',
    title: 'Caisse POS', emoji: '💳',
    description: 'Tickets, plan de salle, encaissements, remises, transferts.',
    articles: [
      {
        id: 'pos.offert', level: 'beginner',
        title: 'Offrir un plat ou une boisson (article offert)',
        body: 'Le bouton 🎁 Offert exclut le montant des revenus tout en le traçant en comptabilité (champ freeAmount séparé). Idéal pour les gestes commerciaux clients VIP ou correction d\'erreur cuisine.',
        steps: [
          'Ouvrez le ticket de la table concernée',
          'Cliquez sur le bouton "Remise" en bas du panier',
          'Choisissez l\'onglet 🎁 Offert',
          'Sélectionnez les articles à offrir',
          'Validez — le montant est ajouté en comptabilité comme "geste commercial"',
        ],
        demo: [
          { selector: '[data-tour="discount-btn"]', text: 'Cliquez ici pour ouvrir le panneau remise', position: 'top' },
          { selector: '[data-tour="discount-free"]', text: 'Choisissez l\'onglet 🎁 Offert', position: 'top' },
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
        body: 'Drag & drop d\'une chaise sur une autre table. Les items suivent la chaise. Ou utilisez le bouton "Transfert" pour ne déplacer qu\'une partie des items.',
      },
      {
        id: 'pos.split', level: 'intermediate',
        title: 'Scinder l\'addition (split bill)',
        body: 'Sur la page Checkout, bouton "Scinder" → choisissez "Par chaise" (1 client = 1 ticket) ou "Par parts" (n parts égales). Encaissez chaque ticket séparément.',
      },
      {
        id: 'pos.kiosk', level: 'advanced',
        title: 'Mode kiosque takeaway',
        body: 'Route /pos/kiosk affiche un sélecteur plein écran sans authentification. Le client commande lui-même, paie en CB. Idéal pour borne d\'entrée ou comptoir takeaway.',
      },
    ],
    videos: [
      { id: 'v.pos.demo',  title: 'Démo POS : prendre une commande', duration: '2:14', description: 'De l\'ouverture de table jusqu\'à l\'encaissement.' },
      { id: 'v.pos.floor', title: 'Configurer un plan de salle',     duration: '4:08', description: 'Multi-zones, drag & drop, fusion.' },
      { id: 'v.pos.split', title: 'Scinder une addition',            duration: '1:25', description: 'Par chaise ou par parts égales.' },
    ],
    commands: [
      { id: 'pos.day-stats',      label: 'Stats du jour',     description: 'CA, ticket moyen, tables servies', icon: '📊' },
      { id: 'pos.open-tables',    label: 'Tables ouvertes',   description: 'Liste des tables OCCUPEE',         icon: '🪑' },
      { id: 'pos.stale-sessions', label: 'Sessions anciennes', description: 'Tables ouvertes > 4h sans paiement', icon: '⏱️' },
    ],
  },

  // ═══ INVOICES / FACTURES ═══════════════════════════════════════════════
  {
    module: 'invoices', pathPrefix: '/invoices',
    title: 'Factures & Devis', emoji: '📋',
    description: 'Facturation B2B, relances automatiques, export FAIA Luxembourg.',
    articles: [
      {
        id: 'inv.create', level: 'beginner',
        title: 'Créer une facture en 30 secondes',
        body: 'Bouton "+ Nouvelle facture". Sélectionnez le client (autocomplétion), ajoutez des lignes (ou importez depuis un ticket POS), choisissez la date d\'échéance, validez. PDF généré automatiquement avec votre logo + envoyé par email.',
        steps: [
          'Cliquez sur "+ Nouvelle facture" en haut à droite',
          'Tapez les premières lettres du nom client → autocomplétion',
          'Ajoutez les lignes : description + qté + prix HT + TVA',
          'Choisissez la date d\'échéance (par défaut J+30)',
          'Cliquez "Valider et envoyer" → PDF généré + email envoyé',
          'La facture passe en statut "Envoyée"',
        ],
        demo: [
          { selector: '[data-tour="new-invoice"]', text: 'Cliquez ici pour créer une facture', position: 'left' },
          { selector: '[data-tour="invoice-client"]', text: 'Tapez le nom du client', position: 'right' },
          { selector: '[data-tour="invoice-validate"]', text: 'Validez pour envoyer', position: 'top' },
        ],
      },
      {
        id: 'inv.relance', level: 'intermediate',
        title: 'Relances automatiques (J+7 / J+15 / J+30)',
        body: 'Templates configurables dans /invoices/relances. À 7 j de retard → email cordial. 15 j → ferme. 30 j → mise en demeure + option recouvrement. Désactivable par client.',
      },
      {
        id: 'inv.faia', level: 'advanced',
        title: 'Export FAIA pour l\'AED Luxembourg',
        body: 'Page /accounting/rapports → bouton "Export FAIA". Génère un ZIP XML conforme XSD 2.0.0. À transmettre à votre comptable pour la déclaration TVA annuelle. Différenciateur Creorga vs Toast/Lightspeed.',
      },
    ],
    videos: [
      { id: 'v.inv.create',  title: 'Créer une facture pas-à-pas', duration: '1:48', description: 'Démo complète depuis le POS.' },
      { id: 'v.inv.relance', title: 'Configurer les relances',    duration: '3:02', description: 'Templates + escalade.' },
      { id: 'v.inv.faia',    title: 'Export FAIA expliqué',       duration: '2:50', description: 'Comment exporter pour l\'ACD.' },
    ],
    commands: [
      { id: 'inv.find-by-number', label: 'Trouver une facture',     description: 'Cherche par numéro + propose download', needsInput: { field: 'number', label: 'Numéro de facture', placeholder: 'ex : F-2026-0142' }, example: 'F-2026-0142', icon: '🔍' },
      { id: 'inv.find-by-client', label: 'Factures d\'un client',    description: 'Liste les factures d\'un client',       needsInput: { field: 'name',   label: 'Nom du client',   placeholder: 'ex : Brasserie' }, icon: '👤' },
      { id: 'inv.overdue',        label: 'Factures en retard',       description: 'Impayés > 30 jours',                    icon: '⏰' },
      { id: 'inv.unpaid-total',   label: 'Total impayé',             description: 'Somme des factures non réglées',         icon: '💶' },
    ],
  },

  // ═══ INVENTORY / STOCKS ═══════════════════════════════════════════════
  {
    module: 'inventory', pathPrefix: '/inventory',
    title: 'Stocks & Inventaire', emoji: '📦',
    description: 'Gestion stocks, OCR factures, prévisions IA, HACCP.',
    articles: [
      {
        id: 'inv.ocr', level: 'beginner',
        title: 'Scanner un ticket fournisseur (OCR)',
        body: 'Bouton 📸 OCR Scanner. Tesseract.js extrait le texte localement (browser), Gemma 2B le parse en JSON structuré (fournisseur, articles, qté, prix, TVA Luxembourg). Validez la table éditable, le stock est mis à jour automatiquement.',
        steps: [
          'Cliquez sur "📸 Scanner OCR" en haut',
          'Glissez la photo ou prenez-la avec la webcam',
          'Tesseract.js + Gemma analysent (~3 secondes)',
          'Vérifiez la table proposée, modifiez si nécessaire',
          'Cliquez "Valider" → stock mis à jour',
        ],
        demo: [
          { selector: '[data-tour="ocr-btn"]', text: 'Cliquez ici pour scanner un ticket', position: 'bottom' },
        ],
      },
      {
        id: 'inv.forecast', level: 'intermediate',
        title: 'Prévisions IA de consommation',
        body: 'Cron quotidien 06h00 : Gemma analyse 90 j d\'historique + météo locale + calendrier événements. Bandeau orange si conso prévue > stock disponible J+1. Précision +/- 15 % attestée 30 jours après mise en route.',
      },
      {
        id: 'inv.recipes', level: 'intermediate',
        title: 'Recettes & déstockage automatique',
        body: 'Page /inventory/recettes : créez chaque plat avec ses ingrédients (e.g. burger = 1 pain + 150 g bœuf + 30 g cheddar). À chaque vente POS, le stock se décrémente automatiquement.',
      },
      {
        id: 'inv.haccp', level: 'advanced',
        title: 'Liaison HACCP & sondes Bluetooth',
        body: 'Connectez une sonde Govee H5101 (~25 €) → backend reçoit température toutes les 5 min. Si T > 5 °C plus de 30 min → alerte push + ticket maintenance auto-créé.',
      },
    ],
    videos: [
      { id: 'v.inv.ocr',     title: 'OCR ticket en 30 secondes',      duration: '0:45', description: 'Démo Gemma + Tesseract.' },
      { id: 'v.inv.forecast', title: 'Prévisions IA expliquées',       duration: '2:30', description: 'Comment Gemma anticipe les ruptures.' },
      { id: 'v.inv.recipes',  title: 'Configurer les recettes',         duration: '1:40', description: 'Liaison vente → stock.' },
    ],
    commands: [
      { id: 'inv.low-stock',     label: 'Articles en rupture',  description: 'Stock < seuil minimum',          icon: '⚠️' },
      { id: 'inv.find-product',  label: 'Trouver un produit',   description: 'Recherche dans le stock',         needsInput: { field: 'name', label: 'Nom produit', placeholder: 'ex : tomate' }, icon: '🔍' },
      { id: 'inv.value',         label: 'Valeur totale stock',  description: 'Somme prix × quantité',           icon: '💶' },
      { id: 'inv.expiring',      label: 'Bientôt périmé',       description: 'Articles à consommer dans 7 j',   icon: '📅' },
    ],
  },

  // ═══ CRM ═══════════════════════════════════════════════════════════════
  {
    module: 'crm', pathPrefix: '/crm',
    title: 'CRM Clients', emoji: '👥',
    description: 'Base clients, fidélité, segmentation, RGPD, campagnes.',
    articles: [
      {
        id: 'crm.score', level: 'intermediate',
        title: 'Score VIP automatique',
        body: 'Score = log(visites_30j) × ticketMoyen / médiane_restaurant. Top 10 % = badge ⭐ VIP visible dans le POS quand le serveur ouvre la table. Permet upsell ciblé (champagne, dessert offert).',
      },
      {
        id: 'crm.relance', level: 'beginner',
        title: 'Relancer un client perdu (60+ jours)',
        body: 'Bouton "IA Clients" en haut → "Message de relance". Gemma rédige un message personnalisé (nom + plat préféré + ton brasserie LU). Vous validez puis envoyez. Jamais auto-send pour conformité CNPD.',
        steps: [
          'Allez dans /crm/clients',
          'Filtrez sur "lastVisit > 60 jours" (ou sur le tier "Perdu")',
          'Sélectionnez un client',
          'Cliquez "IA Clients" → "Message de relance"',
          'Validez le texte généré → SMS/email envoyé',
        ],
        demo: [
          { selector: '[data-tour="ai-menu"]', text: 'Bouton IA Clients ici', position: 'left' },
        ],
      },
      {
        id: 'crm.rgpd', level: 'advanced',
        title: 'Conformité CNPD Luxembourg',
        body: 'Export client (droit d\'accès), suppression définitive (droit à l\'oubli), consentement traçable. Bouton 🛡️ RGPD sur chaque fiche client. Conforme art. 15-22 RGPD européen.',
      },
      {
        id: 'crm.fidelite', level: 'intermediate',
        title: 'Programme de fidélité (points)',
        body: 'Chaque euro dépensé = 1 point. Seuils configurables : 100 pts = boisson offerte, 500 pts = repas offert. Code QR fidélité scannable au POS.',
      },
    ],
    videos: [
      { id: 'v.crm.intro',    title: 'Tour CRM 360°',          duration: '4:12', description: 'Timeline, dépenses, allergies, notes.' },
      { id: 'v.crm.relance',  title: 'Relance IA en 1 minute', duration: '1:15', description: 'Détecter perdus + message Gemma.' },
    ],
    commands: [
      { id: 'crm.find-customer',    label: 'Trouver un client',      description: 'Recherche nom/email/téléphone',  needsInput: { field: 'query', label: 'Nom ou email', placeholder: 'ex : Bryan' }, icon: '🔍' },
      { id: 'crm.vip-list',         label: 'Liste VIP',              description: 'Top 10 % clients par score',     icon: '⭐' },
      { id: 'crm.lost-customers',   label: 'Clients perdus',          description: 'Pas vu depuis 60+ jours',        icon: '🥺' },
      { id: 'crm.birthdays',        label: 'Anniversaires du mois',  description: 'Clients à fêter ce mois',         icon: '🎂' },
    ],
  },

  // ═══ HR / PLANNING ════════════════════════════════════════════════════
  {
    module: 'hr', pathPrefix: '/hr',
    title: 'RH & Planning', emoji: '🗓️',
    description: 'Planning équipe, congés, pointages, droit luxembourgeois.',
    articles: [
      {
        id: 'hr.auto-plan', level: 'intermediate',
        title: 'Auto-planifier la semaine (IA)',
        body: 'Bouton "Auto-planifier (IA)" en haut → Gemma propose une affectation respectant 35h/semaine max, 2 jours OFF consécutifs, couverture midi (12-14h) + soir (19-23h), weekend renforcé. Vous validez ou ajustez.',
        demo: [
          { selector: '[data-tour="auto-plan"]', text: 'Cliquez ici pour lancer l\'IA', position: 'bottom' },
        ],
      },
      {
        id: 'hr.ocr-import', level: 'beginner',
        title: 'Importer un planning manuscrit (OCR)',
        body: 'Bouton "📸 Importer planning OCR". Photo → Tesseract → Gemma extrait shifts {employé, jour, début, fin}. Format reconnu : "Lundi 8h-16h Marie". Si le résultat est incomplet, basculer sur Gemma 9B (param qualité=best).',
        steps: [
          'Cliquez sur "📸 Importer planning OCR"',
          'Glissez la photo du tableau (ou prenez-la avec la webcam)',
          'Tesseract OCR en français (~5 s)',
          'Gemma parse le texte en JSON structuré',
          'Vérifiez la table éditable proposée',
          'Cliquez "Importer N shift(s)" → ajoutés au planning',
        ],
        demo: [
          { selector: '[data-tour="ocr-import"]', text: 'Bouton OCR ici', position: 'bottom' },
        ],
      },
      {
        id: 'hr.conges', level: 'beginner',
        title: 'Demandes de congés employés',
        body: 'L\'employé soumet sa demande via /hr/conges. Vous validez/refusez avec commentaire. Si validation déclenche un sous-effectif sur la période → bandeau alerte rouge.',
      },
      {
        id: 'hr.pointage', level: 'intermediate',
        title: 'Pointages & feuilles de paie',
        body: 'Page /hr/pointages : chaque employé pointe à l\'arrivée et au départ. Calcul automatique des heures sup (>40h/semaine au Luxembourg). Export CSV vers logiciel paie.',
      },
    ],
    videos: [
      { id: 'v.hr.ocr',  title: 'OCR planning manuscrit',   duration: '1:12', description: 'De la photo aux shifts.' },
      { id: 'v.hr.auto', title: 'Auto-planification IA',    duration: '2:30', description: 'Gemma optimise la semaine.' },
    ],
    commands: [
      { id: 'hr.who-today',       label: 'Qui travaille aujourd\'hui ?', description: 'Liste des shifts du jour',     icon: '🕐' },
      { id: 'hr.overtime-alerts', label: 'Heures sup',                 description: 'Employés > 40h cette semaine', icon: '⚠️' },
      { id: 'hr.coverage-check',  label: 'Vérifier sous-effectif',     description: 'Croise prévis CA × shifts',    icon: '🛡️' },
    ],
  },

  // ═══ ACCOUNTING ═══════════════════════════════════════════════════════
  {
    module: 'accounting', pathPrefix: '/accounting',
    title: 'Comptabilité', emoji: '💶',
    description: 'TVA, dépenses, clôture, export FAIA Luxembourg.',
    articles: [
      {
        id: 'acc.categorize', level: 'beginner',
        title: 'Catégoriser une dépense automatiquement',
        body: 'Bouton "IA Compta" en haut → "Catégoriser dépense". Gemma applique le PCN (Plan Comptable Normalisé) luxembourgeois et détecte le taux TVA correct (3 / 8 / 14 / 17 %). Conforme ACD.',
      },
      {
        id: 'acc.cloture', level: 'advanced',
        title: 'Clôture mensuelle / trimestrielle',
        body: 'Page /accounting/cloture : vérifie cohérence revenus/dépenses, bloque les modifications sur la période, génère le compte de résultat PDF. Réversible 7 jours.',
      },
      {
        id: 'acc.tva', level: 'intermediate',
        title: 'Déclaration TVA trimestrielle',
        body: 'Page /accounting/tva : calcul auto TVA collectée − TVA déductible. Bouton "Préparer déclaration" → PDF prêt à envoyer à l\'ACD. FAIA téléchargeable depuis /accounting/rapports.',
      },
    ],
    videos: [
      { id: 'v.acc.faia',    title: 'Export FAIA expliqué',  duration: '2:50', description: 'Conforme XSD 2.0.0.' },
      { id: 'v.acc.tva',     title: 'Déclaration TVA en 5 min', duration: '4:20', description: 'Du calcul auto à l\'envoi.' },
    ],
    commands: [
      { id: 'acc.month-summary',  label: 'Résumé du mois',           description: 'CA, dépenses, marge, TVA',        icon: '📊' },
      { id: 'acc.tva-current',    label: 'TVA en cours',              description: 'À déclarer ce trimestre',         icon: '📑' },
      { id: 'acc.expense-by-cat', label: 'Dépenses par catégorie',   description: 'Pie chart top catégories',         icon: '🥧' },
    ],
  },

  // ═══ REPUTATION ═══════════════════════════════════════════════════════
  {
    module: 'reputation', pathPrefix: '/reputation',
    title: 'Avis & e-réputation', emoji: '⭐',
    description: 'Google, TripAdvisor, Facebook, réponses IA multilingues.',
    articles: [
      {
        id: 'rep.respond', level: 'beginner',
        title: 'Répondre à un avis avec l\'IA',
        body: 'Bouton "IA Avis" en haut → "Réponds avis". Gemma rédige une réponse polie en 4 langues (FR/DE/EN/PT). Vous éditez puis postez. Réponse < 24 h booste le SEO local de +30 % attesté Google 2025.',
      },
      {
        id: 'rep.alert', level: 'intermediate',
        title: 'Alertes avis négatifs',
        body: 'Tout avis < 3/5 déclenche une notification push admin + email. Bouton "Répondre vite" pré-charge un template "courtoisie + geste commercial". Désamorce les escalades.',
      },
    ],
    videos: [
      { id: 'v.rep.respond', title: 'Réponse IA aux avis', duration: '1:35', description: 'Multi-langue + ton sincère.' },
    ],
    commands: [
      { id: 'rep.recent',      label: 'Avis récents',  description: '7 derniers avis toutes plateformes', icon: '🆕' },
      { id: 'rep.negative',    label: 'Avis négatifs', description: 'Notes < 3/5 non répondus',           icon: '😞' },
      { id: 'rep.avg-rating',  label: 'Note moyenne',  description: 'Score actuel toutes plateformes',    icon: '⭐' },
    ],
  },

  // ═══ MARKETING ═════════════════════════════════════════════════════════
  {
    module: 'marketing', pathPrefix: '/marketing',
    title: 'Marketing', emoji: '📣',
    description: 'Campagnes email/SMS, audiences, codes promo, parrainage.',
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
      { id: 'mkt.last-campaign',    label: 'Dernière campagne',  description: 'Stats ouverture / clics',          icon: '📈' },
      { id: 'mkt.audience-suggest', label: 'Suggérer audience',  description: 'IA propose un segment cible',       needsInput: { field: 'goal', label: 'Objectif', placeholder: 'ex : remplir mardis midi' }, icon: '✨' },
    ],
  },

  // ═══ HACCP ═════════════════════════════════════════════════════════════
  {
    module: 'haccp', pathPrefix: '/haccp',
    title: 'HACCP & Conformité', emoji: '🛡️',
    description: 'Températures, traçabilité, audits, conformité Luxembourg.',
    articles: [
      {
        id: 'haccp.daily', level: 'beginner',
        title: 'Pointage HACCP du jour',
        body: 'Page /haccp/journee : checkliste à valider chaque matin (températures frigos, congélateurs, réception marchandises, nettoyage). Saisie en 2 minutes, signature numérique horodatée.',
      },
      {
        id: 'haccp.temp', level: 'intermediate',
        title: 'Surveillance températures (sondes Bluetooth)',
        body: 'Page /haccp/temperatures : graph 24h des 3-10 sondes connectées. Alerte automatique si T > 5 °C plus de 30 min. Traçable pour audit AED.',
      },
      {
        id: 'haccp.audit', level: 'advanced',
        title: 'Préparer un audit AED Luxembourg',
        body: 'Bouton "Export audit" → ZIP contenant 30 derniers jours de pointages + relevés température + tickets fournisseurs OCR + formations HACCP employés. Conforme règlement (CE) 852/2004.',
      },
    ],
    videos: [
      { id: 'v.haccp.daily', title: 'Pointage HACCP en 2 min', duration: '2:00', description: 'Routine quotidienne.' },
    ],
    commands: [
      { id: 'home.day-summary', label: 'État HACCP du jour', description: 'Pointages effectués / restants', icon: '✅' },
    ],
  },

  // ═══ AGENDA / RÉSERVATIONS ═════════════════════════════════════════════
  {
    module: 'agenda', pathPrefix: '/agenda',
    title: 'Agenda & Réservations', emoji: '📅',
    description: 'Calendrier, événements privés, devis B2B, no-show prediction.',
    articles: [
      {
        id: 'agenda.book', level: 'beginner',
        title: 'Prendre une réservation',
        body: 'Page /agenda/calendrier : cliquez sur un créneau libre → modal client. Si table proposée non dispo, l\'IA suggère 3 alternatives (15 min plus tard, mardi vs lundi, terrasse vs intérieur).',
      },
      {
        id: 'agenda.event', level: 'intermediate',
        title: 'Organiser un événement privé',
        body: 'Page /agenda/devis : créez un événement (mariage, anniversaire, séminaire). Bouton "IA Estimation" → Gemma calcule budget + plan logistique selon nombre invités et menu.',
      },
      {
        id: 'agenda.confirm', level: 'advanced',
        title: 'Confirmation J-1 multilingue auto',
        body: 'Cron 18h00 J-1 : envoie WhatsApp/SMS multilingue selon préférence client. Lien magique 1-clic "Je viens / Je décale / J\'annule". Réduit no-show de 25-40 %.',
      },
    ],
    videos: [
      { id: 'v.agenda.book', title: 'Prendre une réservation', duration: '1:00', description: 'Calendrier interactif.' },
    ],
    commands: [
      { id: 'home.day-summary', label: 'Réservations du jour', description: 'Liste + couverts', icon: '📅' },
    ],
  },

  // ═══ AI ASSISTANT ═════════════════════════════════════════════════════
  {
    module: 'ai', pathPrefix: '/ai',
    title: 'Assistant IA', emoji: '🤖',
    description: 'Gemma 2B local + Claude cloud. Provider switch persisté.',
    articles: [
      {
        id: 'ai.provider', level: 'beginner',
        title: 'Local Gemma vs Cloud Claude — lequel choisir ?',
        body: 'Local Gemma 2B → 100 % privé (CNPD), gratuit, ~2 s/réponse. Cloud Claude → meilleure qualité, ~3 s, payant. Mode "Auto" : routage automatique selon sensibilité (privacy → local, qualité → cloud).',
      },
      {
        id: 'ai.gemma9b', level: 'advanced',
        title: 'Passer à Gemma 9B (qualité supérieure)',
        body: 'Pour des tâches complexes (parse OCR planning, analyse longue), passez le paramètre quality: "best" — le backend route vers gemma2:9b. Nécessite 8+ GB RAM disponible. ~10 s vs 2 s mais réponse beaucoup plus fine.',
      },
    ],
    videos: [
      { id: 'v.ai.intro',    title: 'Démo Assistant IA',  duration: '3:30', description: 'Toutes les actions disponibles.' },
      { id: 'v.ai.provider', title: 'Provider switch',    duration: '0:50', description: 'Local / Cloud / Auto.' },
    ],
    commands: [
      { id: 'ai.list-actions', label: '15 actions IA disponibles', description: 'Catalogue complet',  icon: '📚' },
      { id: 'ai.test-gemma',   label: 'Tester Gemma',              description: 'Ping Ollama + modèles', icon: '🩺' },
    ],
  },

  // ═══ QR MENU ═══════════════════════════════════════════════════════════
  {
    module: 'qrmenu', pathPrefix: '/qrmenu',
    title: 'QR Menu', emoji: '📱',
    description: 'Carte digitale, QR par table, allergènes, multilingue.',
    articles: [
      {
        id: 'qr.generate', level: 'beginner',
        title: 'Générer les QR codes par table',
        body: 'Bouton "Générer QR par table" → PDF avec un QR par table. Chaque QR encode l\'ID de la table → le client scanne et arrive sur le portail (5176/5178) avec sa table déjà sélectionnée (pas de saisie manuelle).',
      },
      {
        id: 'qr.allergens', level: 'intermediate',
        title: 'Filtres allergènes mobile',
        body: 'Chaque plat peut être taggé : 🌱 végé · 🥜 sans noix · 🌾 sans gluten · 🐟 poisson · 🥛 lactose · 🥚 œuf. Le client filtre en 1 tap côté mobile.',
      },
    ],
    videos: [
      { id: 'v.qr.generate', title: 'Générer & imprimer les QR', duration: '1:00', description: 'PDF prêt à coller.' },
    ],
    commands: [],
  },

  // ═══ BACKUP ═══════════════════════════════════════════════════════════
  {
    module: 'backup', pathPrefix: '/backup',
    title: 'Sauvegardes', emoji: '💾',
    description: 'Backup inventaire, restauration, téléchargement.',
    articles: [
      {
        id: 'backup.create', level: 'beginner',
        title: 'Créer une sauvegarde manuelle',
        body: 'Bouton "Sauvegarder maintenant" → snapshot du stock complet en data/backups/inventory-{ISO_DATE}.bak.json. Téléchargeable. Restaurable en 1 clic.',
      },
      {
        id: 'backup.restore', level: 'advanced',
        title: 'Restaurer une sauvegarde',
        body: 'Cliquez sur une sauvegarde → bouton "Restaurer". Confirme → l\'état stock actuel est remplacé par celui de la sauvegarde. Action réversible (la sauvegarde reste intacte).',
      },
    ],
    videos: [
      { id: 'v.backup.demo', title: 'Backup & restore',  duration: '1:15', description: 'Sécurité de votre stock.' },
    ],
    commands: [],
  },

  // ═══ ADS / TV ═════════════════════════════════════════════════════════
  {
    module: 'ads', pathPrefix: '/ads',
    title: 'Publicité TV', emoji: '📺',
    description: 'Pubs TV/écran, génération texte IA, audience ciblée.',
    articles: [
      {
        id: 'ads.create', level: 'beginner',
        title: 'Créer une pub pour la TV du resto',
        body: 'Bouton "+ Nouvelle pub". Upload image + titre + prix + durée d\'affichage + CTA. Toggle "Sur TV" → affichée immédiatement sur la route /ads/tv (à mettre en plein écran sur la TV).',
      },
      {
        id: 'ads.ai', level: 'intermediate',
        title: 'Générer le texte de pub avec l\'IA',
        body: 'Bouton "✨ Générer texte pub" → Gemma propose titre + accroche selon produit + prix + ambiance. Vous éditez puis sauvegardez.',
      },
    ],
    videos: [
      { id: 'v.ads.create', title: 'Créer une pub TV',   duration: '1:30', description: 'Du upload à l\'affichage.' },
    ],
    commands: [],
  },

  // ═══ MUSIC ════════════════════════════════════════════════════════════
  {
    module: 'music', pathPrefix: '/music',
    title: 'Musique d\'ambiance', emoji: '🎵',
    description: '30+ radios, Spotify, YouTube, Apple Music embeds.',
    articles: [
      {
        id: 'music.radio', level: 'beginner',
        title: 'Lancer une radio en arrière-plan',
        body: 'Onglet 📻 Radio. 30+ stations curées par pays/langue (France, Luxembourg, Belgique, Brésil, Allemagne, Espagne, Anglais). Cliquez Play, le stream HTML5 démarre. Volume ajustable.',
      },
      {
        id: 'music.spotify', level: 'intermediate',
        title: 'Brancher une playlist Spotify',
        body: 'Onglet 🎵 Spotify. Collez l\'URL d\'une playlist publique → iframe embed officielle. Pas de clé API requise.',
      },
    ],
    videos: [
      { id: 'v.music.demo', title: 'Démo musique',   duration: '0:50', description: '4 sources en 1 module.' },
    ],
    commands: [],
  },

  // ═══ BILLING ══════════════════════════════════════════════════════════
  {
    module: 'billing', pathPrefix: '/billing',
    title: 'Abonnement Creorga', emoji: '💳',
    description: 'Plan, facturation Creorga, mode de paiement.',
    articles: [
      {
        id: 'billing.plan', level: 'beginner',
        title: 'Changer de plan',
        body: 'Trial → Pro (29 €/mois) → Enterprise (99 €/mois). Facturation mensuelle, sans engagement. Bouton "Mettre à niveau" en haut.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ FORMATION ════════════════════════════════════════════════════════
  {
    module: 'formation', pathPrefix: '/formation',
    title: 'Formation employés', emoji: '🎓',
    description: 'Quiz HACCP, plats, vins, traçable.',
    articles: [
      {
        id: 'form.quiz', level: 'beginner',
        title: 'Lancer un quiz HACCP IA',
        body: 'Bouton "✨ Générer quiz". Gemma crée 10 questions HACCP adaptées au niveau. Score gardé, certificat PDF si > 80 %.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ SITES ════════════════════════════════════════════════════════════
  {
    module: 'sites', pathPrefix: '/sites',
    title: 'Multi-établissements', emoji: '🏢',
    description: 'Gérer plusieurs restos sous une même licence.',
    articles: [
      {
        id: 'sites.add', level: 'intermediate',
        title: 'Ajouter un site',
        body: 'Bouton "+ Nouveau site". Nom + adresse + horaires. Chaque site a sa propre base POS / clients / stock. Vous switchez via le sélecteur en haut à droite.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ SETTINGS ═════════════════════════════════════════════════════════
  {
    module: 'settings', pathPrefix: '/settings',
    title: 'Paramètres', emoji: '⚙️',
    description: 'Modules, thème, langue, mode env.',
    articles: [
      {
        id: 'set.modules', level: 'beginner',
        title: 'Activer/désactiver des modules',
        body: 'Page /settings/modules : toggle chaque module pour l\'afficher/masquer dans le sélecteur. Permet de simplifier l\'UI selon vos besoins.',
      },
      {
        id: 'set.lang', level: 'beginner',
        title: 'Changer la langue',
        body: 'Page /settings/language : 5 langues (FR, DE, EN, PT, LU). Persisté localStorage. Tous les modules basculent.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ OWNER REPORT ═════════════════════════════════════════════════════
  {
    module: 'owner', pathPrefix: '/owner',
    title: 'Rapport Patron', emoji: '👔',
    description: 'Vision stratégique : KPI, alertes, recommandations IA.',
    articles: [
      {
        id: 'owner.daily', level: 'beginner',
        title: 'Rapport quotidien automatique',
        body: 'Cron 07h00 : envoie email au patron avec CA hier vs N-1, top 3 plats, tables non encaissées, stock critique, 1 phrase Gemma de synthèse. PDF joint.',
      },
    ],
    videos: [],
    commands: [
      { id: 'home.day-summary',  label: 'Tableau de bord aujourd\'hui', description: 'KPI live',                  icon: '📊' },
      { id: 'acc.month-summary', label: 'Mois en cours',                description: 'CA / dépenses / marge',     icon: '📈' },
    ],
  },

  // ═══ DELIVERY ═════════════════════════════════════════════════════════
  {
    module: 'delivery', pathPrefix: '/delivery',
    title: 'Livraison', emoji: '🛵',
    description: 'Uber Eats, Wedely, livreurs internes.',
    articles: [
      {
        id: 'del.connect', level: 'intermediate',
        title: 'Connecter Uber Eats / Wedely',
        body: 'Settings → "Connecteurs delivery". Collez l\'API key de votre compte Uber Eats Manager. Les commandes arrivent automatiquement dans le POS avec le tag 🛵.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ CLICK & COLLECT ══════════════════════════════════════════════════
  {
    module: 'clickcollect', pathPrefix: '/clickcollect',
    title: 'Click & Collect', emoji: '🛒',
    description: 'Commandes à emporter, créneaux, paiement en ligne.',
    articles: [
      {
        id: 'cc.setup', level: 'beginner',
        title: 'Activer le Click & Collect',
        body: 'Configurez les créneaux disponibles (toutes les 15 min de 11h à 21h). Le client commande sur /c → choisit créneau → paie CB → reçoit confirmation. Vous voyez la commande dans le POS avec horaire prévu.',
      },
    ],
    videos: [],
    commands: [],
  },

  // ═══ COMMUNITY / DURABILITÉ / CHANGELOG / STATUS / API / MAINTENANCE / REFERRAL
  // (default fallback content for these — concise)
  {
    module: 'community', pathPrefix: '/community',
    title: 'Communauté Creorga', emoji: '🤝',
    description: 'Réseau & benchmarks restaurants.',
    articles: [{ id: 'com.intro', level: 'beginner', title: 'Comparez-vous au réseau', body: 'Voyez où vous vous situez sur le CA, ticket moyen, satisfaction par rapport aux autres restos Creorga (anonymisé).' }],
    videos: [], commands: [],
  },
  {
    module: 'sustainability', pathPrefix: '/sustainability',
    title: 'Durabilité & RSE', emoji: '🌱',
    description: 'Empreinte carbone, gaspillage alimentaire.',
    articles: [{ id: 'sus.intro', level: 'beginner', title: 'Suivre votre empreinte', body: 'Calcul auto basé sur vos achats fournisseurs + déchets. Bouton "Plan de réduction" → suggestions IA.' }],
    videos: [], commands: [],
  },
  {
    module: 'changelog', pathPrefix: '/changelog',
    title: 'Changelog', emoji: '📜',
    description: 'Nouveautés & versions Creorga.',
    articles: [{ id: 'cl.intro', level: 'beginner', title: 'Quoi de neuf', body: 'Toutes les versions livrées. v3.6 actuelle. Filtrer par module pour voir l\'historique d\'un module précis.' }],
    videos: [], commands: [],
  },
  {
    module: 'status', pathPrefix: '/status',
    title: 'Statut système', emoji: '🟢',
    description: 'Uptime, incidents en temps réel.',
    articles: [{ id: 'st.intro', level: 'beginner', title: 'Surveiller la santé', body: 'Uptime backend + Ollama + sondes HACCP. Incidents en cours en bandeau rouge.' }],
    videos: [], commands: [{ id: 'ai.test-gemma', label: 'Tester Gemma', description: 'Ping Ollama', icon: '🩺' }],
  },
  {
    module: 'api', pathPrefix: '/api',
    title: 'API & intégrations', emoji: '🔌',
    description: 'Webhooks, REST API, intégrations tierces.',
    articles: [{ id: 'api.intro', level: 'advanced', title: 'Documentation API', body: 'Token JWT requis. Voir docs.creorga.lu pour la référence complète.' }],
    videos: [], commands: [],
  },
  {
    module: 'admin', pathPrefix: '/admin',
    title: 'Admin', emoji: '🔐',
    description: 'Société, utilisateurs, catalogue.',
    articles: [{ id: 'adm.users', level: 'intermediate', title: 'Inviter un utilisateur', body: 'Page /admin/users → bouton "+ Inviter". Email + rôle (admin/manager/serveur/cuisine). Email d\'invitation envoyé avec lien magique.' }],
    videos: [], commands: [],
  },
]

/**
 * Best-match path resolution (longest prefix wins).
 * Returns Home content if no specific match.
 */
export function getHelpForPath(path: string): ModuleHelp {
  const matches = HELP_CONTENT
    .filter((h) => path === h.pathPrefix || path.startsWith(h.pathPrefix + '/') || path === h.pathPrefix)
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)
  if (matches.length > 0) return matches[0]
  // Special handling for module-list (homepage)
  if (path === '/' || path === '/welcome' || path.startsWith('/modules')) return HELP_CONTENT[0]
  return HELP_CONTENT[0]
}
