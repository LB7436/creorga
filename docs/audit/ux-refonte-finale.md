# Refonte UX/UI Creorga — rapport final (v4.7 → v5.0)

**Date** : 18 août 2026 · **Branche** : `qa/pc-2026-07-27` · **Rien n'est poussé sur GitHub** (règle de la mission : validation complète d'abord). Aucun `git reset --hard`, aucun `push --force`, aucun fichier protégé modifié (`apps/guest/*`, `routes/portalConfig.ts`, `routes/crm.ts`, `stores/moduleStore.ts` — vérifié par `git diff --stat`). Les quatre fichiers en vol de l'exploitant sont intacts et non commités : `apps/backend/package.json`, `apps/backend/src/routes/backup.ts`, `apps/web/src/pages/guest/games/MenschGame.tsx`, `package-lock.json`.

Documents liés : `ux-refonte-initiale.md` (+ annexe, 118 constats), `ux-refonte-avancement.md` (détail vague par vague, pièges opérationnels), `test-matrice.md` (verdicts PASS/FAIL/BLOQUÉ), captures `captures/v4.9/`.

## 1. Ce qui a été livré, vague par vague

| Vague | Commits | Résumé |
|---|---|---|
| Phase 0 | `dd238fa` | Audit 118 constats (15 critiques confirmés par vérification adverse), harnais e2e réparé (`networkidle` borné) |
| v4.7 modules & navigation | `30c2b18`, `8f2c60c`, `ca188c7` | 6 espaces, `modulePreferencesStore` serveur avec annulation sur refus, `RequireRole`, 13 fichiers morts supprimés, écrans d'erreur honnêtes (Sauvegardes, CRM) |
| v4.8 caisse & stock | `66a251b`, `e695d89`, `eb70e66`, `77895d3` | Remises/règlements mixtes comptabilisés, table impayée infermable, stock décrémenté à la vente (rupture masque la carte, patron notifié, replay idempotent), maquettes POS supprimées, caisse mobile 44 px + raccourcis |
| v4.9 jeux | `bcd2762` | Registre central honnête (43 entrées), recommandés famille, casino séparé, lanceur fidèle, invitations factices supprimées, Bêta motivés |
| v5.0 sécurité | (commit v5.0) | Portail client : prix serveur, paiement serveur + preuve Stripe liée à la table, statut staff-only ; Stripe : IDOR fermé, webhook brut signé ; commandes : PAYÉE via encaissement seulement, annulation responsable ; jeton d'appareil lié à la société ; toggles portail : serveur = vérité, annulation sur refus ; restauration de sauvegarde **testée** |

## 2. État de référence final

Builds 4/4 · backend **114** unit · API **59** · POS **31** · web **24** · e2e **18/18** (voir sortie du run dans `test-matrice.md` §1 ; les 3 « écrans blancs » signalés par le balayage sont la page TV `/ads/tv` sans programmation, comportement attendu).

## 3. Fichiers livrés en v5.0 (non encore commités au moment de ce rapport, voir §9)

- `apps/backend/src/routes/guest.ts` (réécrit) : `POST /orders` recalcule depuis Prisma (503 sans base, 400 produit inconnu / multi-enseignes / table absente), `GET /bill/:tableId` (nouveau), `POST /pay` (montant serveur, `total` client ignoré, `success_url` avec `session_id`), `POST /paid-confirm` (métadonnée `tableId` vérifiée, idempotent par session, marque les commandes payées), `PATCH /orders/:id/status` sous `deviceOrUserAuth`.
- `apps/backend/src/routes/stripe.ts` (réécrit) : `create-checkout` étiquette `companyId` ; `/portal`, `/session/:id`, `/subscriptions/:customerId`, `DELETE|PATCH /subscription/:id` = OWNER + appartenance ; `stripeWebhook` exporté.
- `apps/backend/src/index.ts` : `app.post('/api/stripe/webhook', express.raw(...), stripeWebhook)` avant `express.json()`.
- `apps/backend/src/routes/orders.ts` : règles PUT `/:id/status`.
- `apps/backend/src/middleware/deviceAuth.ts` (réécrit) + `requireCompany.ts` : `POS_DEVICE_TOKENS="societe:jeton,…"`, `POS_DEVICE_COMPANY_ID`, comparaison à temps constant, 403 sur société étrangère.
- `apps/backend/src/jobs/verifier-restauration.ts` (nouveau) + tests : restauration en base jetable.
- `apps/web/src/hooks/usePortalConfig.ts` : `update()` authentifié, rejette sur refus (`PortalConfigError`).
- `apps/web/src/pages/clients/ClientsConfig.tsx` : valeur serveur au chargement, écriture optimiste annulée + toast, interrupteurs désactivés pendant l'enregistrement.
- `apps/web/src/pages/guest/GuestHome.tsx`, `GuestCallButtons.tsx` : refus serveur affiché (plus de faux « commande envoyée »), addition serveur, `/pay` sans montant.
- Tests : `__audit__/guest.api-test.ts` (8), `__audit__/restauration.api-test.ts` (1), `middleware/deviceAuth.test.ts` (3), `requireCompany.test.ts` (+2), `jobs/verifier-restauration.test.ts` (4), e2e `TOG-1`.

## 4. Routes vérifiées

- Back-office : toutes les routes de `App.tsx` chargées par e2e `all-pages` (0 route en 4xx/5xx, 0 exception) ; anciennes URL redirigées (`/order/:tableId`, `/checkout*` → `/pos/floor`, etc.).
- Portail : `/c?table=…`, `/c/paid?table=…&session_id=…`.
- API touchées : `/api/guest/*`, `/api/stripe/*` + `/api/stripe/webhook` (raw), `/api/orders/:id/status`, `/api/portal-config` (PATCH authentifié depuis le back-office), `/api/module-config`, `/api/stock-ventes`.

## 5. Problèmes restants (honnêtement)

1. **Float → centimes non fait** : 57 colonnes `Float` (36 monétaires). Décision de l'exploitant requise (plan §6).
2. **Sauvegardes non chiffrées** : le ZIP est en clair sur le disque du VPS ; `routes/backup.ts` est en cours de modification par l'exploitant, non touché.
3. **~60 interrupteurs encore en localStorage** (audit annexe §toggles) : checklist HACCP, `ParamsPage` RH, `AdminCompany` horaires, réglages KDS, QrMenu, notifications… À convertir sur le modèle `modulePreferencesStore` / `ClientsConfig.persist` (optimiste + annulation + serveur = vérité).
4. **`portalConfig.ts` (protégé)** : `/menu` sans `companyId` retombe sur la plus ancienne société ; le QR de table doit porter `companyId` — TODO follow-up : fonctionnalité bloquée par fichier protégé. Idem `apps/guest` : port dev 5176 au lieu de 5178, replis `localhost` en prod.
5. **Vulnérabilités npm (prod)** : 7 high (axios, brace-expansion, engine.io, form-data, js-cookie, socket.io-parser, ws), 9 moderate (@remix-run/router, body-parser, engine.io-client, express, follow-redirects, qs, react-router, react-router-dom, socket.io-adapter). Toutes ont un correctif ; `npm audit fix` réécrit `package-lock.json` (en vol chez l'exploitant) → à faire hors de cette branche, sans montée de version majeure (react-router).
6. **Stripe non joué de bout en bout** (aucune clé de test locale) : logique testée, parcours réel BLOQUÉ.
7. **Marques déposées** dans les noms de jeux (Yahtzee, Mastermind, Simon, Puissance 4, Rummikub, Motus, Tetris) : risque juridique à arbitrer.
8. **`KitchenDisplay`** (simulateur) et **`KioskPage`** (allergènes fabriqués par hash) : maquettes toujours en place — à ne pas montrer à un client.
9. **`Dominos`** demandé pour les recommandés : n'existe pas.
10. `deviceOrUserAuth` laisse passer sans jeton **hors production** (compat dev historique) : ne jamais déployer avec `NODE_ENV≠production`.

## 6. Risques de sécurité et plans

- **Montants en Float** : arrondis déjà appliqués partout (`money()`), mais une migration `Decimal(12,2)`/centimes reste souhaitable. Plan : (1) dump de production restauré en local (`verifier-restauration.ts` prouve la mécanique), (2) migration Prisma additive `*_cents Int` + double écriture, (3) bascule des lectures route par route avec tests API, (4) suppression des colonnes Float. Une journée par module, à ne pas faire « en masse ».
- **Chiffrement des sauvegardes** : AES-256-GCM du ZIP par `BACKUP_ENCRYPTION_KEY` dans `backup-worker.ts`, déchiffrement dans `verifier-restauration.ts` ; à faire après la fusion des travaux en vol de l'exploitant sur `backup.ts`.
- **Multi-enseigne du portail** : tant que le QR ne porte pas `companyId`, une installation à plusieurs sociétés sert la carte de la plus ancienne (fichier protégé).
- **`x-company-id` cru par les routes JWT** : `requireCompany` vérifie l'adhésion (Phase 0 sécurité) — OK ; les terminaux avec jeton **global** restent multi-sociétés tant que `POS_DEVICE_TOKENS` n'est pas déployé (variables à poser sur le VPS).

## 7. Changements de base de données

**Aucune migration Prisma** dans cette mission. Données fichiers : `data/inventory-mouvements.json` (v4.8, journal des ventes de stock), `data/guest-orders.json` (v5.0 : `companyId`, `paid`, `paidAt`, `stripeSessionId` ; anciennes entrées jamais facturées), `data/module-config.json` (v4.7, préférences serveur — route existante). Variables d'environnement nouvelles (optionnelles) : `POS_DEVICE_TOKENS`, `POS_DEVICE_COMPANY_ID`, `STRIPE_WEBHOOK_SECRET` (désormais obligatoire pour recevoir un webhook).

## 8. Lancer en local

```bash
docker compose -f docker-compose.dev.yml up -d          # Postgres 5433, Redis 6380
npm install
npm run db:migrate --workspace=apps/backend && npm run db:seed:rich --workspace=apps/backend
RATE_LIMIT_DISABLED=true npm run dev --workspace=apps/backend   # :3002
npm run dev --workspace=apps/web                                # :5174 (portail /c inclus)
npm run dev --workspace=apps/pos                                # :5175
# Tests
npm run test --workspace=apps/backend ; npm run test:api --workspace=apps/backend
npm run test --workspace=apps/pos ; npm run test --workspace=apps/web ; npx playwright test
npx tsx apps/backend/src/jobs/verifier-restauration.ts          # restauration réelle en base jetable
```
Compte seed local : `bryan@cafe-rondpoint.lu` / `Demo1234!` (jamais valable en production). Sur Windows : tuer les processus `tsx` par PID avant de relancer le backend (voir `ux-refonte-avancement.md`, pièges).

## 9. Avant tout push (checklist §12 de la mission)

- Résumé des fichiers : ci-dessus §3 et `git log dd238fa..HEAD --stat`.
- Tests passés / bloqués : `test-matrice.md`.
- Risques : §5–6.
- Captures : `docs/audit/captures/v4.9/` (desktop 1280 et mobile 390 : hub, lanceurs, casino, back-office).
- Confirmation : aucun fichier protégé modifié — `git diff --stat dd238fa..HEAD -- apps/guest apps/backend/src/routes/portalConfig.ts apps/backend/src/routes/crm.ts apps/web/src/stores/moduleStore.ts` renvoie vide (le `tsconfig.tsbuildinfo` de `apps/guest` est un artefact de build local, non commité).
- **Décision de l'exploitant attendue** sur : Float→centimes, chiffrement des sauvegardes, montée des dépendances vulnérables, renommage des marques déposées.
