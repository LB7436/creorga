# Matrice de tests — refonte UX/UI Creorga (v4.7 → v5.0)

**Date** : 18 août 2026 · **Branche** : `qa/pc-2026-07-27` · **Environnement** : Windows 11, Docker Desktop (Postgres 16 `creorga-db` :5433, Redis :6380), backend `tsx watch` :3002 avec `RATE_LIMIT_DISABLED=true`, web Vite :5174, caisse :5175, seed riche (`seed-rich-company`).

Chaque ligne porte un verdict **PASS / FAIL / BLOQUÉ / NON FAIT** avec sa preuve. Rien n'est marqué PASS sans exécution réelle.

## 1. Suites automatisées (état de référence final)

| Suite | Commande | Résultat | Preuve |
|---|---|---|---|
| Backend unitaire | `npm run test --workspace=apps/backend` | **PASS 114/114** (95 initiaux + 10 stock v4.8 + 5 deviceAuth/requireCompany v5.0 + 4 restauration v5.0) | vitest 18/08 21:23 |
| Backend API (serveur réel) | `RATE_LIMIT_DISABLED=true npm run test:api --workspace=apps/backend` | **PASS 59/59** (50 + 8 GUEST + 1 SAUV) | vitest 18/08 21:23 |
| Caisse (POS) | `npm run test --workspace=apps/pos` | **PASS 31/31** (17 + 14 v4.8) | inchangé depuis v4.8 |
| Web | `npm run test --workspace=apps/web` | **PASS 24/24** (5 + 19 registre des jeux v4.9) | vitest 18/08 20:54 |
| E2E Playwright (4 specs) | `npx playwright test` | voir `ux-refonte-finale.md` §2 (18 tests : 15 + GST-8, GST-9, TOG-1) | run 18/08 après v5.0 |
| Builds | `npm run build` (web, pos, backend, guest) | **PASS 4/4** | web rebâti 18/08 21:24 |
| Typecheck | `tsc --noEmit` web + backend | **PASS** | 18/08 |

## 2. Matrice fonctionnelle demandée par la mission

### Modules, espaces, préférences (v4.7)

| # | Cas | Verdict | Preuve / cause |
|---|---|---|---|
| M-1 | 6 espaces (Pilotage / Service & Caisse / Stock & Achats / Équipe & Qualité / Clients & Marketing / Finance & Administration) | PASS | `config/espaces.ts`, `ModuleSelector` ; e2e `all-pages` charge toutes les routes |
| M-2 | Anciennes routes toujours servies | PASS | `App.tsx` redirections ; e2e `all-pages` 0 route en 4xx/5xx |
| M-3 | Préférences de modules persistées serveur, écriture optimiste annulée sur refus | PASS | `modulePreferencesStore.ts` (`regler` restaure l'ancien état et relance l'erreur) |
| M-4 | Un toggle refusé par l'API n'est jamais affiché activé | PASS (modules, portail client) / **PARTIEL** ailleurs | `SettingsModules` (v4.7), `ClientsConfig` (v5.0, e2e TOG-1) ; ~60 autres interrupteurs (HACCP, RH, KDS, QrMenu…) restent en localStorage — listés au rapport final §5 |
| M-5 | Rôles : routes propriétaire gardées | PASS | `RequireRole` sur /rgpd /backup /sites /api /maintenance /owner |

### Caisse et stock (v4.8)

| # | Cas | Verdict | Preuve |
|---|---|---|---|
| C-1 | Remises / carte cadeau / points / mixte comptabilisés comme affichés | PASS | posStore 14 tests (remises, règlement mixte incohérent refusé, migration v1→v2) |
| C-2 | Impossible de « fermer » une table impayée | PASS | posStore `setTableStatus` + test |
| C-3 | Vente décrémente le stock, rupture masque la carte, patron notifié, replay idempotent | PASS | stockStore 10 tests + scénario Coca-Cola 33 cl vérifié en API (v4.8) |
| C-4 | Caisse lisible au téléphone, cibles ≥ 44 px, raccourcis N/P/K/T/Échap | PASS | `useEcranEtroit`, `index.html` `@media (pointer: coarse)`, `App.tsx` |
| C-5 | Produit créé / prix / stock zéro / réappro / masqué / visible / vendu / QR sync | **PARTIEL** | création/prix/vendu/rupture/réappro couverts (API + unit) ; « QR sync » = la carte du portail lit `/portal-config/menu` (protégé) qui masque les ruptures — vérifié à la main v4.8, pas de test automatisé dédié |

### Jeux (v4.9)

| # | Cas | Verdict | Preuve |
|---|---|---|---|
| J-1 | Registre central (slug, nom FR, description, miniature, joueurs, modes, difficulté, durée, âge, statut, règles, connexion, mobile) | PASS | `games/catalog.ts` + 19 tests d'invariants |
| J-2 | Recommandés = famille uniquement, jamais casino/adulte/bêta | PASS | test `JEUX_RECOMMANDES` + e2e GST-8 |
| J-3 | Promesses fausses retirées (2 joueurs, difficulté, 3D, notes, invitation) | PASS | tests « promesses tenues par le code », GST-8/9 |
| J-4 | Casino séparé | PASS | section `data-section="casino"`, hors « Tous » (38/40) |
| J-5 | Jeux incomplets marqués Bêta | PASS | Rami Salon, Billard Lounge |
| J-6 | « Dominos » recommandé | **NON FAIT** | le jeu n'existe pas dans le code — non inventé |
| J-7 | Multijoueur en ligne (invitations entre appareils) | **NON FAIT** (jamais existé) | aucun socket de partie ; le registre porte `connexion: 'local'` |

### Sécurité (v5.0)

| # | Cas | Verdict | Preuve |
|---|---|---|---|
| S-1 | Prix du navigateur jamais accepté (portail client) | PASS | `guest.ts` recalcule depuis Prisma ; API GUEST-1..4 |
| S-2 | Paiement à table : montant serveur, preuve Stripe vérifiée, table de la session vérifiée, idempotent | PASS (logique) / **BLOQUÉ** (parcours Stripe réel) | GUEST-7/8 ; aucune clé Stripe de test disponible en local → le parcours Checkout complet n'a pas pu être joué |
| S-3 | Statut de commande client non modifiable publiquement | PASS | `deviceOrUserAuth` sur PATCH ; GUEST-5 (hors production la compat dev laisse passer sans jeton — comportement historique de `deviceOrUserAuth`) |
| S-4 | Webhook Stripe : corps brut + signature obligatoire, hors `authenticate` | PASS (code) / **BLOQUÉ** (événement réel) | `index.ts` `express.raw`, `stripeWebhook` refuse sans secret (503) ; pas de secret local |
| S-5 | IDOR Stripe inter-sociétés | PASS | `stripe.ts` : OWNER + étiquette `companyId` vérifiée sur session/abonnement/client |
| S-6 | Statut/encaissement des commandes : rôles | PASS | `orders.ts` : PAYÉE uniquement via checkout (409), annulation OWNER/MANAGER (403), commande close figée (409) |
| S-7 | Jeton d'appareil ↔ société | PASS | `deviceAuth.ts` (`POS_DEVICE_TOKENS`), `requireCompany` 403 sur autre société ; 5 tests unitaires |
| S-8 | « Première société trouvée » supprimée | **BLOQUÉ** | `portalConfig.ts` (`/menu` sans companyId → plus ancienne société) est **protégé** — TODO follow-up : fonctionnalité bloquée par fichier protégé (le QR doit porter `companyId`) |
| S-9 | Float → centimes | **NON FAIT** (décision) | 57 colonnes `Float` dont ~36 monétaires (Order, OrderItem, Invoice, Quote, Payment, Product…) : migration Prisma + reprise de toutes les routes = chantier à part, risqué sur données de production sans dump de répétition ; plan au rapport final §6 |
| S-10 | Sauvegardes chiffrées | **NON FAIT** | ZIP en clair ; `routes/backup.ts` est en cours de modification par l'exploitant (fichier en vol) — plan §6 |
| S-11 | Restauration testée | PASS | `jobs/verifier-restauration.ts` : 24 JSON relus, dump restauré en base jetable (47 tables, 3 sociétés), base et fichier temporaires supprimés ; SAUV-1 en API |
| S-12 | Vulnérabilités npm | **NON FAIT** (rapport) | `npm audit --omit=dev` : 7 high / 9 moderate, toutes avec correctif — `package-lock.json` est en vol chez l'exploitant, aucune montée de version faite ; liste au rapport final §5 |
| S-13 | Audit des actions sensibles | PASS (existant) | `auditLog` global + journal créateur (console) ; les refus v5.0 sont journalisés (`logger.warn/error`) |

### Parcours (client / serveur / patron)

| # | Parcours | Verdict | Preuve |
|---|---|---|---|
| P-1 | Client scanne, joue, commande, paie | PASS jusqu'à la commande ; paiement **BLOQUÉ** (Stripe) | e2e GST-6/7/8 ; API GUEST-1/6 ; `GuestHome` affiche le refus serveur au lieu d'un faux succès |
| P-2 | Serveur : encaisse en caisse, remises, table fermée seulement payée | PASS | posStore 31 tests, e2e POS-1/10 |
| P-3 | Patron : active/désactive modules et portail, notifié en rupture | PASS | modulePreferences, TOG-1, stock-out critique (v4.8) |
| P-4 | Deux onglets / reconnexion : préférences resynchronisées | PASS (modules) | `demarrerSyncPreferencesModules` (focus + 60 s) ; portail : `usePortalConfig` re-sonde toutes les 2,5 s |

## 3. Ce qui n'a pas pu être prouvé

- **Stripe** (paiement à table, webhook) : logique couverte par tests, mais aucun parcours réel faute de clés de test locales.
- **`apps/guest`** (portail dédié 5178) : protégé, non testé au-delà du chargement de son iframe `/c?embed=games`.
- **Toggles hors modules/portail** : non convertis (liste au rapport final §5).
