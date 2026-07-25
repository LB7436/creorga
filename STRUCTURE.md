# STRUCTURE — Creorga OS

Cartographie technique du monorepo, générée pendant l'audit `audit/test-complet`.

## 1. Vue d'ensemble

Monorepo npm workspaces (`apps/web`, `apps/backend`, `apps/pos`, `apps/guest`), Node ≥ 20.

| App | Stack | Port dev | Rôle |
|---|---|---|---|
| `apps/backend` | Express 4 + Prisma 5 + PostgreSQL + Socket.io | 3002 | API REST, temps réel, jobs |
| `apps/web` | React 18 + Vite 5 + Zustand + React Query + Tailwind | 5174 | Application principale (22 modules) |
| `apps/pos` | React + Vite | — | Client POS dédié (16 écrans) |
| `apps/guest` | React + Vite | — | Portail client autonome (9 écrans) |
| `apps/superadmin` | — | — | Console super-admin |

Le frontend proxy `/api` et `/socket.io` vers `localhost:3002` (`apps/web/vite.config.ts`).

## 2. Modules et écrans

177 écrans dans `apps/web/src/pages`. Registre des modules : `apps/web/src/stores/moduleStore.ts`.

| Module | id | Route d'entrée | Écrans |
|---|---|---|---|
| Caisse POS | `pos` | `/pos/dashboard` | 8 |
| Gestion RH & Formation | `hr` | `/hr/planning` | 6 |
| Inventaire & Cuisine Centrale | `inventory` | `/inventory` | 6 |
| Factures & Devis | `invoices` | `/invoices` | 5 |
| CRM, Marketing & Réputation | `marketing` | `/crm` | 5 + 4 (reputation) + 4 (marketing) |
| Comptabilité | `accounting` | `/accounting` | 6 |
| HACCP | `haccp` | `/haccp` | 5 |
| Ventes externes | `sales` | `/sales/delivery` | 1 |
| Assistant IA | `ai` | `/ai` | 2 |
| Menu QR | `qrmenu` | `/qrmenu` | 1 |
| Affichage TV & Ambiance | `ads` | `/ads/regie` | 3 |
| Accès Clients | `clients` | `/clients` | — |
| Rapport Patron & Programme | `owner` | `/owner/rapport` | 4 |
| Multi-établissements | `sites` | `/sites` | 1 |
| RGPD / Conformité | `rgpd` | `/rgpd` | 1 |
| Sauvegarde | `backup` | `/backup` | — |
| API & Intégrations | `api` | `/api` | 2 |
| Maintenance | `maintenance` | `/maintenance` | 1 |
| Réservations | — | `/reservations` | 4 |
| Événements | — | `/events` | 4 |
| Portail invité (jeux, menu, chat, avis) | — | `/c` | 53 (dont 41 jeux) |
| Admin / Réglages | — | `/admin`, `/settings` | 5 + 9 |

## 3. Routes API par module

Montées dans `apps/backend/src/index.ts`. Nombre d'endpoints entre parenthèses.

| Préfixe | Fichier | Auth | Endpoints |
|---|---|---|---|
| `/api/auth` | `auth.ts` | rate-limit `authLimiter` | 5 |
| `/api/tables` | `tables.ts` | `authenticate` | 5 |
| `/api/categories` | `categories.ts` | `authenticate` | 5 |
| `/api/products` | `products.ts` | `authenticate` | 4 |
| `/api/orders` | `orders.ts` | `deviceOrUserAuth` | 8 |
| `/api/stats` | `stats.ts` | `authenticate` | 3 |
| `/api/companies` | `companies.ts` | `authenticate` | 2 |
| `/api/modules` | `modules.ts` | `authenticate` + `requireCompany` | 2 |
| `/api/crm` | `crm.ts` | `authenticate` + `requireCompany` | 10 |
| `/api/invoices` | `invoices.ts` | `authenticate` + `requireCompany` | 10 |
| `/api/reservations` | `reservations.ts` | `authenticate` + `requireCompany` | 5 |
| `/api/inventory` | `inventory.ts` | `authenticate` + `requireCompany` | 12 |
| `/api/hr` | `hr.ts` | `authenticate` + `requireCompany` | 11 |
| `/api/haccp` | `haccp.ts` | `authenticate` + `requireCompany` | 7 |
| `/api/marketing` | `marketing.ts` | `authenticate` + `requireCompany` | 8 |
| `/api/accounting` | `accounting.ts` | `authenticate` + `requireCompany` | 8 |
| `/api/reputation` | `reputation.ts` | `authenticate` + `requireCompany` | 4 |
| `/api/events` | `events.ts` | `authenticate` + `requireCompany` | 6 |
| `/api/stripe` | `stripe.ts` | signature Stripe | 7 |
| `/api/email` | `email.ts` | `authenticate` | 6 |
| `/api/payments` | `payments.ts` | `deviceOrUserAuth` | 3 |
| `/api/portal-config` | `portalConfig.ts` | **public** (`publicLimiter`) | 8 |
| `/api/game-scores` | `gameScores.ts` | **public** (`publicLimiter`) | 3 |
| `/api/guest` | `guest.ts` | **public** (`publicLimiter`) | 7 |
| `/api/floor-state` | `floorState.ts` | `deviceOrUserAuth` | 27 |
| `/api/module-config` | `moduleConfig.ts` | `deviceOrUserAuth` | 5 |
| `/api/inventory-ocr` | `inventory-ai.ts` | `authenticate` | 12 |
| `/api/ads` | `ads.ts` | `authenticate` | 7 |
| `/api/ai` | `ai-actions.ts` | `authenticate` + `aiLimiter` | 2 |
| `/api/agent` | `agent.ts`, `assistant.ts`, `assistant-advanced.ts` | `authenticate` + `aiLimiter` | 23 + 4 + 19 |
| `/api/help/feedback` | `help-feedback.ts` | — | 3 |
| `/api/owner` | `owner.ts` | `authenticate` | 6 |
| `/api/backup` | `backup.ts` | `authenticate` | 5 |

Total : **~290 endpoints**.

## 4. Modèles de données

36 modèles Prisma (`apps/backend/prisma/schema.prisma`), datasource PostgreSQL.

- **Société / accès** : `Company`, `CompanySettings`, `User`, `UserCompany` (rôle par société), `RefreshToken`, `CompanyModule`
- **POS** : `Table`, `Category`, `Product`, `Order`, `OrderItem`, `CashDrawer`
- **Clients / fidélité** : `Customer`, `LoyaltyTransaction`, `GiftCard`, `Review`
- **Facturation** : `Invoice`, `InvoiceItem`, `Quote`, `QuoteItem`, `Expense`
- **Réservations / événements** : `Reservation`, `EventQuote`, `EventQuoteItem`
- **Stock** : `Ingredient`, `Recipe`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`
- **RH** : `Shift`, `TimePunch`, `LeaveRequest`
- **HACCP** : `HaccpLog`, `HaccpTask`
- **Marketing** : `Campaign`, `DiscountCode`

Rôles : champ `role` sur `User` (défaut `EMPLOYEE`) et sur `UserCompany` — c'est ce dernier qui fait autorité (`requireCompany` le pose sur `req.role`). Valeurs rencontrées : `OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE`.

Une part de l'état applicatif vit **hors base**, en JSON sous `data/` (voir §5) : plan de salle, stock, configuration modules, feedback. C'est ce que sauvegarde le backup ZIP.

## 5. Chemins d'écriture de fichiers

Tout est relatif à `process.cwd()` du backend, donc `apps/backend/data/` en dev.

| Chemin | Producteur | Contenu |
|---|---|---|
| `data/backups/full/creorga-full-<date>.zip` | `jobs/backup-worker.ts` | Archive ZIP de tout `data/` (hors `backups/`), toutes les 6 h, rétention 30 + 1/mois |
| `data/inventory-stock.json` | `lib/stockStore.ts` | Stock centralisé |
| `data/*.json` (divers) | `lib/safe-json.ts` | Écriture atomique générique (tmp + rename) |
| `data/` (floor sessions) | `jobs/closeStaleFloorSessions.ts` | Clôture auto des sessions de salle > 8 h |
| `data/` (customers) | `jobs/duplicate-detector.ts` | Scan doublons clients (24 h) |
| `data/` (alertes) | `jobs/proactive-worker.ts` | Alertes proactives (10 min) |
| `data/` (rappels) | `jobs/scheduler.ts` | Rappels et tâches planifiées (60 s) |
| `data/` (audit) | `middleware/audit-log.ts` | Journal d'audit |
| `data/` (ads, agent, assistant, ocr, owner, feedback) | routes homonymes | Uploads et états applicatifs |

**PDF** : aucune génération PDF côté serveur (`GET /api/invoices/:id/pdf` renvoie du JSON malgré son nom — voir `RAPPORT-AUDIT.md` §5.2). Le seul export PDF est côté client dans `apps/web/src/pages/haccp/HistoriquePage.tsx` (impression navigateur). `pdf-parse` est une dépendance backend utilisée en **lecture** (OCR/import de factures fournisseurs), pas en écriture.

## 6. Scripts de sauvegarde présents

- `jobs/backup-worker.ts` — `runFullBackup()` (ZIP `archiver`), `listFullBackups()`, `pruneOldBackups()` (rétention).
- `routes/backup.ts` — `GET /api/backup/full` (liste), `POST /api/backup/full` (déclenche), `GET /api/backup/full/:filename/download`, restauration via `adm-zip`. Le nom de fichier est validé par `^creorga-full-[\d-]+\.zip$` (protection path traversal), testé dans `routes/backup.test.ts`.

Pas de script `pg_dump` : **la sauvegarde couvre `data/` (JSON), pas la base PostgreSQL.**
Commandes, factures, clients, employés et relevés HACCP ne sont donc dans aucune archive —
voir `RAPPORT-AUDIT.md` §5.1.

## 7. Variables d'environnement

Modèle : `apps/backend/.env.example`. Le backend s'auto-bootstrap (copie `.env.example` → `.env` si absent) et pose des valeurs par défaut sûres en dev.

**Requises** : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (obligatoires en production, valeurs de dev injectées sinon), `PORT` (3002), `NODE_ENV`, `FRONTEND_URL`.

**Optionnelles** : `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `ALLOWED_ORIGINS`, `APP_VERSION`, `INTERNAL_API_TOKEN`, `POS_DEVICE_TOKEN` (requis en prod), `STALE_TABLE_MAX_HOURS`, `SENTRY_DSN`, `RESEND_API_KEY`, `OLLAMA_URL`, `FALLBACK_ADMIN_EMAIL` / `FALLBACK_ADMIN_PASSWORD` / `FALLBACK_ADMIN_ENABLED`.

**Paiements** (tous optionnels) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER|PRO|BUSINESS`, `SUMUP_AFFILIATE_KEY`, `MYPOS_SID`, `MYPOS_WALLET`, `VIVA_MERCHANT_ID`, `VIVA_API_KEY`, `VIVA_ENV`, `WORLDLINE_API_USER|API_PASS|CUSTOMER_ID|TERMINAL_ID`, `SERVIPAY_MERCHANT_ID`, `SERVIPAY_API_KEY`.

## 8. Ce qui tourne (ou pas) dans la sandbox cloud

| Élément | État | Note |
|---|---|---|
| PostgreSQL 16 | ✅ | **Pas via Docker** — le démon Docker n'est pas disponible dans le conteneur. Cluster système `pg_ctlcluster 16 main start`, port **5432** (le compose vise 5433). |
| `docker compose -f docker-compose.dev.yml up` | ❌ | Démon indisponible. Contournement documenté en §9. |
| Redis | ❌ | Non démarré. Aucun code backend n'en dépend au démarrage. |
| Migrations Prisma | ✅ | `prisma migrate deploy` — 3 migrations, 36 tables (l'`init` seule n'en créait que 10, cf. `RAPPORT-AUDIT.md` §2.1). |
| Seed | ✅ | `db:seed` et `db:seed:rich`. |
| Backend (3002) | ✅ | Démarre, `/api/health` répond, jobs actifs (backup 6 h, scheduler 60 s, proactive 10 min, janitor 30 min, doublons 24 h). |
| Frontend Vite (5174) | ✅ | Démarre en ~250 ms. |
| Playwright / Chromium | ✅ | Chromium pré-installé (`/opt/pw-browsers/chromium`), lancer avec `--no-sandbox`. |
| Stripe / Resend / passerelles de paiement | ❌ | Pas de clés, pas de réseau sortant vers ces services. Non testables ici. |
| Ollama (IA locale) | ❌ | Non installé. Les routes `/api/agent` en dépendent partiellement. |
| Cron / volumes VPS | ❌ | Hors périmètre sandbox (à valider sur le PC/VPS). |

## 9. Démarrage sandbox (reproductible)

```bash
# 1. Base
pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE ROLE creorga LOGIN PASSWORD 'password' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE creorga_dev OWNER creorga;"

# 2. Dépendances + env (port 5432 au lieu de 5433 : pas de Docker)
npm install
cp apps/backend/.env.example apps/backend/.env
sed -i 's|localhost:5433|localhost:5432|' apps/backend/.env

# 3. Schéma + données
cd apps/backend
npx prisma generate && npx prisma migrate deploy
npm run db:seed:rich          # démo « Café um Rond-Point »

# 4. Lancement
npm run dev                    # backend  → http://localhost:3002
cd ../web && npm run dev       # frontend → http://localhost:5174
```

Comptes de démo : `bryan@cafe-rondpoint.lu` / `Demo1234!` (seed riche) — `admin@creorga.local` / `Admin1234!` (fallback sans base).
