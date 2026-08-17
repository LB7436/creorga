# Audit initial — Refonte UX/UI Creorga (Phase 0)

**Date** : 17 août 2026, 22 h 30
**Méthode** : 8 audits parallèles par sous-système (routes web, POS, sécurité backend, jeux, flux stock/menu, toggles, apps périphériques, tests/outillage), chaque constat cité avec fichier et ligne, suivis d'une contre-vérification adversariale des constats critiques. Builds et tests exécutés avant toute modification.
**Périmètre protégé respecté** : `apps/guest/*`, `portalConfig.ts`, `crm.ts`, `moduleStore.ts` — lus, jamais modifiés.

---

## 0. État de départ : builds et tests

| Vérification | Résultat |
|---|---|
| Tests unitaires backend | **95/95 verts** (16 fichiers, vitest) |
| Tests POS (posStore) | **17/17 verts** |
| Build `apps/web` | ✅ 12,2 s |
| Build `apps/pos` | ✅ 3,1 s — ⚠ morceau unique de 603 Ko (aucun découpage) |
| Build `apps/guest` | ✅ 0,5 s |
| Build `apps/superadmin` | ✅ 8,8 s — ⚠ morceau unique de 789 Ko |
| Docker (Postgres 5433 / Redis 6380) | ✅ réparé — le moteur refusait de démarrer (500), résolu par arrêt propre de WSL + relance ; conteneurs actifs, `pg_isready` OK, Redis PONG |
| Migrations + seed | ✅ 6 migrations à jour, seed riche : 492 créations, 0 échec |
| Tests API (`test:api`, serveur réel + DB) | **50/50 verts** (3,15 s) |
| Tests e2e Playwright | **15/15 verts** (4,2 min) — après réparation d'un défaut du harnais, voir ci-dessous |
| Diff non commité préservé | 5 fichiers : sauvegardes backend + cadrage caméra Mensch 3D |

**Défaut de harnais e2e trouvé et corrigé (seule modification de code de la Phase 0, hors application)** : 4 tests échouaient par timeout. La trace Playwright a montré que `waitForLoadState('networkidle')` consommait 59 s sur 60 : le back-office interroge le serveur toutes les 1,5 à 2 s (polling config modules / plan de salle — lui-même un constat de l'audit), le réseau n'est donc **jamais** inactif et cette attente ne pouvait structurellement pas aboutir. Les pages se chargeaient bien (vérifié au navigateur : POS 7 s, facturation 5 s). Correctif : attente bornée à 3 s dans `tests-e2e/parcours-critiques.spec.ts` — les 15 tests passent. Fausse piste écartée au passage : ce n'était ni une compilation Vite à froid ni une régression produit.

**Chiffres de l'audit : 118 problèmes recensés — 15 critiques, 52 majeurs, 51 mineurs.**

**Contre-vérification adversariale : 15/15 constats critiques CONFIRMÉS** par des vérificateurs indépendants chargés de les réfuter. Aucun faux positif. Ajustements de gravité : la 2FA cosmétique de `SettingsCompany` est requalifiée *mineure* (la page est du code mort inaccessible) ; `OrderPage` T4, l'absence de garde de rôle, la persistance `SettingsModules`, le non-décrément de stock et l'absence de test de restauration sont requalifiés *majeurs* ; les 9 autres restent *critiques*, plusieurs « confirmés avec aggravation » (le dashboard POS n'a **aucun** appel réseau sur 529 lignes ; le menu POS en dur compte **199** produits, pas ~180).

---

## 1. Synthèse : les cinq constats qui commandent tout le reste

1. **Il existe deux caisses, et la mauvaise est la vitrine.** La vraie caisse (`apps/pos`, 15 800 lignes) a un noyau solide et testé (journal, ticket Z, paiement par couvert, PIN, TVA). Mais le module POS du back-office (`apps/web/src/pages/pos/*`) est **entièrement factice** : `OrderPage` ignore le `:tableId` de l'URL (table « T4 » en dur, 20 produits mock, panier pré-rempli), le dashboard POS invente un CA de 2 430 €. C'est la première chose qu'un utilisateur voit en ouvrant « Caisse POS ».

2. **Ce qui est affiché au client n'est pas ce qui est comptabilisé.** Dans la vraie caisse, remises, promos, cartes cadeaux, points fidélité et arrondi caritatif sont soustraits **à l'écran** puis ignorés par `processPayment`, qui enregistre le prix plein au journal (`PaymentPage.tsx:546`). Le ticket Z surévalue l'encaissé. Même famille : paiement mixte enregistré sur une seule méthode, kiosque qui ne persiste rien, « Fermer la table » qui contourne la protection anti-perte (`FloorPlanPage.tsx:603`).

3. **Sur ~70 toggles de configuration, 2 atteignent le serveur.** Le reste : localStorage (une dizaine), ou purement cosmétique — souvent avec un faux bouton « Enregistrer » qui affiche un toast de succès sans rien sauvegarder (2FA, horaires, paramètres de paie, checklist HACCP perdue au rechargement). Le pire : les toggles du portail client (jeux, chat, menu…) partent en PATCH **sans en-tête Authorization** vers une route qui exige Bearer + OWNER → 401 systématique, avalé deux fois (`usePortalConfig.ts:39`).

4. **Le produit est défini à trois endroits, le stock à trois autres, et rien ne les relie.** Le menu du POS : ~180 produits **codés en dur** dans `posStore.ts:155`. Le back-office : Prisma `Product`. La carte client : Prisma via `/api/portal-config/menu` + superposition de stock par **correspondance de nom** (`includes()` — « Cola » matche « Cola Zero »). Aucune vente ne décrémente aucun stock (grep `decrement` : 0 occurrence liée aux ventes). Un Coca-Cola à zéro : rien au POS, rien en notification (l'alerte lit des champs qui n'existent pas — `proactive-worker.ts:76`).

5. **Aucune garde de rôle dans le routeur, et des écrans qui mentent en cas de panne.** `RequireAuth` ne vérifie que l'authentification ; un employé accède à `/rgpd`, `/backup`, `/sites`, `/api`, `/owner` en tapant l'URL (seul `/admin` a une garde). Sur ~10 hooks `useQuery`, **2 pages** consomment `isError` : partout ailleurs, une API en panne produit un écran vide indistinguable d'un état réellement vide — y compris la page Sauvegardes.

---

## 2. Modules existants et correspondance vers les 6 espaces

18 modules actifs dans `moduleStore.ts` (28 → 18 après fusions v4.1). Routeur unique `App.tsx`, ~80 routes en lazy. Correspondance validée vers les six espaces cibles :

| Espace cible | Modules actuels |
|---|---|
| **1. Pilotage** | `owner` (rapport, activité, macros), `sites`, `ai`, Dashboard `/` |
| **2. Service & Caisse** | `pos`, `sales` (livraison/click&collect/traiteur), `qrmenu` |
| **3. Stock & Achats** | `inventory` (stock, recettes, fournisseurs, commandes, OCR, auto-réappro, cuisine centrale) |
| **4. Équipe & Qualité** | `hr` (planning, pointages, congés, équipe, formation), `haccp`, `maintenance` |
| **5. Clients & Marketing** | `marketing` (id trompeur : chemin `/crm` — clients, fidélité, campagnes, avis), `clients` (portail), `ads` (TV & musique) |
| **6. Finance & Administration** | `invoices`, `accounting`, `rgpd`, `backup`, `api` + `owner/abonnement` et `owner/parrainage` (le module `owner` se scinde entre Pilotage et Finance) |

Anciennes routes : ~20 redirections rétro-compat déjà en place dans `App.tsx` — le mécanisme existe, il suffira de l'étendre.

**Persistance des modules — le défaut structurel** : deux sources concurrentes. `SettingsModules` écrit dans un store zustand local (`creorga-module-config`) et **n'appelle jamais** le backend ; `ModuleSelector` fusionne local + distant avec « remote gagne » → tout réglage local peut être écrasé en silence, rien n'est partagé entre navigateurs. Le canal distant (`useSharedModuleConfig.ts`) est un fetch nu sans jeton, avec repli `localhost:3002` mort en production, erreurs avalées. → **Création prévue de `modulePreferencesStore.ts`** (moduleStore.ts étant protégé) avec synchronisation serveur et rollback.

---

## 3. Pages sur données inventées (mock)

Recensement exhaustif — chaque écran affiche des chiffres faux à un utilisateur réel :

| Zone | Pages |
|---|---|
| POS back-office | `OrderPage` (critique), `DashboardPage` (critique), `Checkout` (« Sophie Keller ») |
| Comptabilité | `CaissePage`, `CloturePage`, `DepensesPage` |
| Factures | `FacturesPage` (KPIs calculés sur mock alors que `useInvoices` existe), `RelancesPage`, `AvoirsPage` |
| RH / HACCP | `EquipePage` (employés, documents, congés), `HistoriquePage`, `JourneePage`, `TachesPage`, `FormationPage` |
| CRM / Marketing | `FidelitePage`, `CodesPage` |
| Inventaire | `StockPage` (mouvements/gaspillage constants), `CommandesPage`, `FournisseursPage` (historique), `RecettesPage` (100 % mock alors que l'API Recipe existe) |
| Catalogue | `SettingsCatalog`, `AdminCatalog` (« Coca-Cola 33cl stock 120 » fictif) |
| POS caisse | `ConfigPage` (critique — édite des mocks, le vrai menu n'est modifiable nulle part), `KitchenDisplay` (critique — simulateur), `KioskPage` (critique — commande jamais écrite + **allergènes fabriqués par hash**, dangereux) |

## 4. Code mort et navigation incohérente

- **Layout legacy mort** : `AppLayout` + `Sidebar` (15 entrées vers des routes inexistantes, badges en dur 3/5/2).
- **Imports lazy morts** : ReservListe/ReservConfig, EventsDevis/ClientsB2B, Sustainability/Community/Status ; 6 layouts jamais routés ; 4 pages `Settings*` orphelines (600-1100 lignes chacune).
- **Sous-menu POS** : 3 entrées sur 6 sont des redirections vers le dashboard ; « Cuisine KDS » fait perdre l'AppShell.
- **apps/pos** : `ReceiptPreview` (756 l.), `RoomsPager`, `TableSummary`, `LoyaltyScanner`, `lib/payments.ts` (client de paiement complet !) jamais importés ; 12 actions store sans appelant (fusion/séparation/transfert de tables, gestion du menu, du personnel…).
- **apps/guest** : 8 fichiers morts (ancienne maquette) — app réelle = un iframe vers `/c`. *(Protégé : signalé, non supprimé.)*

## 5. Sécurité (état des lieux — corrections en v5.0)

**Sain** : `orders.ts` recalcule prix et TVA depuis la base ; les 6 routeurs du commit `607307a` passent bien par `requireCompany` ; journal d'audit avec masquage des champs sensibles ; console créateur correctement isolée.

**À corriger** :
| Gravité | Constat |
|---|---|
| Majeur | `POST /api/guest/pay` facture via Stripe le `total` envoyé par le navigateur, sans recalcul ni liaison à une commande (`guest.ts:130`) |
| Majeur | `POST /api/guest/orders` calcule le total sur les prix du client (`guest.ts:55`) |
| Majeur | `/api/stripe` : IDOR inter-sociétés — tout authentifié peut annuler/lire l'abonnement d'un autre locataire (`stripe.ts:155`) |
| Majeur | Webhook Stripe invérifiable : corps déjà parsé par `express.json`, monté derrière `authenticate` (Stripe ne peut pas l'atteindre), repli sur payload non signé (`stripe.ts:48`) |
| Majeur | Changement de statut/encaissement de commande sans contrôle de rôle (`orders.ts:224`) ; statut guest totalement public (`guest.ts:85`) |
| Majeur | Jeton d'appareil POS : `x-company-id` non lié à l'appareil → traverse les sociétés (`requireCompany.ts:32`) |
| Majeur | **Tous** les champs monétaires du schéma Prisma sont des `Float` (aucun Decimal/centimes) |
| Mineur | `/api/help/feedback` sans aucun middleware (lecture publique + spam) ; `/api/email` sans rôle ; fidélité par téléphone sans filtre société ; `floor-state`/`module-config`/`ads` = singletons mono-locataires ; guest et floor-state exclus du journal d'audit |

## 6. Jeux (état des lieux — refonte en v4.9)

- **43 entrées** dans `catalog.ts`, **40 jouables**, 3 désactivées (tetris, slots, roulette).
- **Miniatures** : aucune image — vignettes CSS procédurales + emoji, avec collisions (🎱 pour bingo ET billard ; 🃏 partagé par 4 jeux ; fonds partagés → cartes indistinguables).
- **Modes menteurs** : « Ensemble / Individuel / Tournoi » et la difficulté sont ignorés par **37 jeux sur 40** ; le code d'invitation duel/tournoi est cosmétique (aucun socket, « Rejoindre » accepte n'importe quoi).
- **« 3D » trompeur** : seuls Petits Chevaux (Mensch) et Tower Defense utilisent three.js (tous deux avec portrait géré) ; Scoopa/Rami/Rummikub/Mahjong « 3D » = CSS perspective. « Mahjong Bamboo 3D » est en réalité un memory.
- **Casino sans cadre** : blackjack, poker, farkle, bingo visibles de tous sans mention « mises fictives », alors que slots/roulette ont été désactivés pour raison légale.
- **Notes 4,0–4,9 inventées** affichées comme de vraies notes.
- Recommandé du jour : rotation sur 9 ids famille — base saine à étendre.
- Triche : SpotError révèle les réponses au survol (`title=`).

## 7. Responsive et accessibilité

- **apps/pos : zéro media query dans toute l'application.** Colonnes fixes (30/70, panneau 40 %, SeatPanel 460 px > écran 375 px), interactions souris-seulement (hover, Shift+clic, Alt+drag, clic droit) sans équivalent tactile.
- Cibles tactiles sous 44 px recensées : qtyBtn 26×26, chipRemove 22×22, MiniBtn ~23 px, pastilles sièges 22 px, counterBtn 36×36…
- PIN non saisissable au clavier physique ; compteur « 3 tentatives » décoratif (vrai blocage à 5/10/15).
- `ModuleSelector` : `alert()` natif bloquant pour « Bientôt disponible » ; responsive par sélecteur CSS sur style inline (fragile).

## 8. Tests et outillage

- 27 fichiers de test : 95 unitaires backend + 52 API (nécessitent serveur + DB seedée) + 17 POS + 5 web + 16 e2e Playwright.
- **Sans aucun test** : produits (création/prix/masquage), toggles de modules, logique des jeux, Stripe/paiements en ligne, **restauration de sauvegarde** (endpoint destructif — critique).
- Aucun lint nulle part ; `apps/web` en vitest `node` (aucun test de composant possible) ; vitest non déclaré dans `apps/pos` (hoisting fragile) ; tests compilés livrés dans `dist/` backend.
- Vulnérabilités : esbuild 0.21.5 (GHSA-67mh-4wv8-2f99, dev only), vite 5.x fin de vie, stripe SDK 14.x, bcryptjs 2.4.3.

## 9. Apps périphériques

- **apps/guest** = iframe vers `/c` d'apps/web + polling config 2,5 s (double polling avec l'iframe — gaspillage du quota public). **Bug port** : `npm run dev` lance 5176 (collision marketing) au lieu de 5178. Replis `localhost:3002`/`:5174` morts derrière Caddy en production.
- **apps/superadmin** = Console créateur (5177), auth TOTP, routes `/api/creator/*` conditionnelles — propre.
- **apps/marketing** = vitrine 6 pages FR, hors workspaces car déployée sur Vercel séparément (voulu) ; thème sombre par hack CSS fragile.
- **Caddyfile absent du dépôt** alors que le code en dépend — à versionner.
- `CLAUDE.md` périmé sur les workspaces (superadmin y est désormais).

---

## 10. Plan de correction par vagues

| Vague | Contenu | Sources audit |
|---|---|---|
| **v4.7** | 6 espaces + navigation ; `modulePreferencesStore` avec sync serveur + rollback ; purge du code mort ; états loading/erreur/vide partout ; suppression des mocks des pages où l'API existe (Factures, Recettes, Stock…) ; honnêteté des écrans restants | §2, §3, §4 |
| **v4.8** | POS : brancher OrderPage/Dashboard sur les vraies données ; remises/paiements mixtes comptabilisés ; fermer le contournement closeTable ; ConfigPage réelle ; source de vérité produit unique + décrément stock + alertes rupture réparées ; responsive + cibles 44 px ; raccourcis clavier | §1.1, §1.2, §1.4, §7 |
| **v4.9** | Registre central des jeux enrichi (statuts honnêtes, Bêta, miniatures cohérentes) ; recommandés = famille uniquement ; retrait des promesses fausses (tournoi/invitation) ou implémentation minimale ; casino séparé avec mention | §6 |
| **v5.0** | Guest pay/orders recalculés serveur ; webhook Stripe (express.raw + signature + montage public) ; IDOR stripe ; rôles sur statut commande ; montants en centimes ; toggles → persistance serveur + rollback (les ~68 restants) ; tests produits/toggles/paiement/restauration ; matrice de tests | §3, §5, §8 |

**Blocage Docker levé** : moteur réparé, Postgres et Redis actifs, migrations et seed appliqués, 50/50 tests API verts. Les parcours complets du §10 de la mission sont désormais exécutables en local.

---

*Annexe : détail des 118 constats (fichier, ligne, gravité, preuve) dans `docs/audit/ux-refonte-initiale-annexe.md`, générée depuis les audits bruts.*
