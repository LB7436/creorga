# Creorga — guide de contribution

SaaS modulaire de gestion pour l'horeca luxembourgeois. Monorepo npm workspaces.

## Démarrage

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres 5433, Redis 6380
npm install
npm run db:migrate --workspace=apps/backend      # 36 tables
npm run db:seed --workspace=apps/backend
npm run dev                                      # backend + web
```

## Ports — vérifiés dans les `vite.config.*` et `apps/backend/src/index.ts`

| Application | Port | Rôle |
|---|---|---|
| `apps/web` | 5174 | back-office |
| `apps/pos` | 5175 | caisse |
| `apps/marketing` | 5176 | site vitrine |
| `apps/superadmin` | 5177 | administration |
| `apps/guest` | 5178 | portail client (`/c`, mobile-first) |
| `apps/backend` | 3002 | API Express |
| PostgreSQL | 5433 | Docker |
| Redis | 6380 | Docker |

⚠️ Toute documentation mentionnant `5173` ou `3001` est périmée.

## Attention : `workspaces` est incomplet

`package.json` ne déclare que `apps/web`, `apps/backend`, `apps/pos`,
`apps/guest`. **`apps/marketing` et `apps/superadmin` existent mais ne sont pas
des workspaces** : `npm install` à la racine n'installe pas leurs dépendances.
Il faut y faire un `npm install` séparé.

## Tests

```bash
npm run test --workspace=apps/backend        # unitaires (src/**/*.test.ts)
npm run test:api --workspace=apps/backend    # API — exige le backend démarré
```

- Les tests API tapent un backend réel sur `3002`. Démarre-le avec
  `RATE_LIMIT_DISABLED=true`, sinon la limite de 10 req/5 min les fait échouer.
- **Les 5 applications front n'ont aucun lanceur de tests.** Seul le backend est
  couvert. Une régression d'interface n'est détectée par rien hors Playwright.

## Pièges à connaître

**Métier**
- `taxRate` est un **pourcentage** (`17`), jamais une fraction (`0.17`).
- `GET /crm/customers` filtre `isGuest: true` par défaut.
- `GET /hr/team` renvoie des adhésions (`UserCompany`) : utiliser `.userId`.
- La fermeture de caisse est un **PUT**, pas un POST.
- `POST /api/invoices` recalcule les totaux depuis les lignes : ne pas les
  envoyer.
- Le rôle est porté par `UserCompany`, **pas** par `User`.

**Numérotation séquentielle**
Commandes et factures s'appuient sur une contrainte d'unicité en base
(`Order_companyId_orderNumber_key`, `Invoice_companyId_number_key`) et
réessaient sur `P2002`. **Le délai aléatoire entre deux tentatives est
indispensable** : sans lui, les requêtes concurrentes se resynchronisent et
rejouent la même collision (mesuré : 2 requêtes sur 8 perdues). Toute
réécriture doit conserver ce back-off — cf. `routes/invoices.ts`
(`createAvecNumero`) et `routes/orders.ts`.

**Persistance fichier**
`data/*.json` passe par `safeWriteJson` (`src/lib/safe-json.ts`) : écriture
`.tmp` puis `rename` atomique, avec `.bak`. Ne jamais écrire ces fichiers
directement. Aucun `fsync` n'est fait : résistant au crash de processus, non
prouvé sur coupure d'alimentation.

**Exports CSV**
Toujours passer par `apps/web/src/lib/csv.ts`. Excel FR exige un BOM UTF-8, le
séparateur `;` et la virgule décimale — sans quoi les accents cassent, tout
atterrit en colonne A et les montants ne sont pas sommables.

**Sauvegardes**
`backup-worker` produit un ZIP de `data/` 60 s après le démarrage puis toutes
les 6 h, dump PostgreSQL inclus (`jobs/pg-dump.ts`). `pg_dump` n'étant pas
toujours installé sur l'hôte, le job bascule automatiquement sur un
`docker exec` dans le conteneur. Un échec de dump est journalisé en `error` :
ne jamais le rendre silencieux.

**Windows**
- `core.autocrlf=true` sans `.gitattributes` : les scripts shell peuvent hériter
  de CRLF.
- PowerShell 5.1 ne sait pas transporter de flux binaire — utiliser `-f` puis
  `docker cp` plutôt qu'un tube.
- Git Bash réécrit les chemins `/tmp/...` : `export MSYS_NO_PATHCONV=1` avant
  tout `docker exec` prenant un chemin absolu.

## Comptes de test

| Compte | Mot de passe | Usage |
|---|---|---|
| `bryanl1994.bl@gmail.com` | *(hors dépôt)* | propriétaire de `Café um Rond-Point` (ex-`bryan@cafe-rondpoint.lu`, renommé le 11 août 2026) |
| `admin@creorga.local` | `Admin1234!` | admin de repli — **désactivé en production**, jamais valable en ligne |

⚠️ **Aucun mot de passe de production ne doit figurer ici.** `Demo1234!` y était
écrit et se retrouvait dans le bundle du site public (page de connexion
pré-remplie + auto-login `/m/demo`) : n'importe quel visiteur pouvait entrer.
Le compte a été réinitialisé le 11 août 2026 et le nouveau mot de passe n'existe
que chez l'exploitant. Le seul mot de passe encore cité ci-dessus est celui d'un
compte de développement refusé en production (`assertProductionSecrets`).

Le seed attend 141 produits, 50 clients, 100 commandes, 20 factures,
24 ingrédients pour `seed-rich-company`.

## Conventions

- Français dans les commentaires, les messages d'erreur et les commits.
- Un correctif = un commit atomique + un test qui le prouve.
- Ne jamais avaler une erreur : un `catch {}` silencieux sur une sauvegarde, une
  écriture ou une numérotation est un défaut, pas une simplification.
- Ne jamais accorder de rôle par défaut dans une branche d'erreur
  (cf. `middleware/requireCompany.ts` : en production, base injoignable → 503).
