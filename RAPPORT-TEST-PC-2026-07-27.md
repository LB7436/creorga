# RAPPORT DE TEST — CREORGA SUR PC (Bryan)

**Date de session :** 2026-07-27
**Machine :** Windows 11 Pro 10.0.26200 · Node v22.19.0 (win32) · Docker 28.3.3 · Git 2.51.0 · npm 10.9.3 · Chrome 150.0.7871.182
**Dépôt local :** `C:\Users\Bryan\Desktop\claude code\creorga`
**Verdict :** *(en attente — session en cours)*

> Journal incrémental. Écrit après chaque module. Ce qui n'est pas ici n'existe pas.
> Règle : **si ça n'a pas été testé, c'est marqué NON TESTÉ.** Aucune hypothèse présentée comme un résultat.

---

## ÉTAPE 0 — Vérification d'environnement ✅ VALIDÉE

| Contrôle | Attendu | Constaté | État |
|---|---|---|---|
| Plateforme | Windows | `win32` | ✅ |
| Node | ≥ 20 (`engines`) | `v22.19.0` | ✅ |
| Docker | présent | `docker OK` — v28.3.3 build 980b856 | ✅ |
| Git | présent | 2.51.0.windows.1 | ✅ |
| npm | présent | 10.9.3 | ✅ |
| Google Chrome | présent (`channel: 'chrome'`) | `C:\Program Files\Google\Chrome\Application\chrome.exe` — 150.0.7871.182 | ✅ |

**Conclusion :** l'environnement réel est conforme aux prérequis du prompt. La session tourne bien sur le PC Windows de Bryan, avec Docker et Chrome. La suite peut être déroulée.

---

## ÉTAT DU CODE — vérifié par `git`, pas par confiance

`git fetch origin --prune` exécuté le 2026-07-27.

| Réf | Commit | Écart |
|---|---|---|
| `master` **local** | `a3d9728` | 3 commits **en retard** sur `origin/master` (fast-forward possible, aucune divergence) |
| `origin/master` | `20f19ab` | conforme au prompt — `fix(theme): appliquer réellement le thème sombre… (#12)` |
| `origin/audit/test-complet` | `55148a9` | **14 commits d'avance** sur `origin/master` — `chore: ignorer les fichiers tsbuildinfo` |
| Diff `master…audit` | — | **32 fichiers, +3031 / −134** — conforme au prompt |

✅ Les chiffres annoncés dans le prompt (`20f19ab`, `55148a9`, 14 commits, +3031/−134) sont **exacts**.

**Modifications locales non commitées :** 1 seul fichier — ` M .claude/launch.json`. Aucun stash. Aucun travail non poussé à risque.

### ⚠️ NON VÉRIFIÉ — état de la PR #13
`gh` est installé mais **non authentifié** (`gh auth login` requis). Impossible de confirmer par l'API
que la PR #13 est ouverte / verte / non fusionnée.
**Ce qui est prouvé par git en revanche :** `origin/audit/test-complet` n'est pas fusionnée dans
`origin/master` (14 commits d'avance, 0 en retard). Le fond de l'affirmation du prompt tient.

---

## SAUVEGARDE PRÉALABLE ✅ FAITE

Avant toute manipulation de branche, les fichiers non-versionnés ont été copiés.

**Destination :** `C:\Users\Bryan\Desktop\claude code\creorga-SAUVEGARDE-2026-07-27\`
**Contenu :** 24 fichiers · 148 479 octets

| Élément | État |
|---|---|
| `.env` (racine) | **ABSENT** du dépôt local (n'existe pas) |
| `.env.local` (racine) | ✅ sauvegardé (433 o) |
| `apps/backend/.env` | ✅ sauvegardé (433 o) — `DATABASE_URL` pointe déjà sur **5433** (bon port Docker) |
| `apps/backend/data/` | ✅ sauvegardé intégralement (22 fichiers, dont `audit-log.json` 118 ko, `customers.json`, `invoices.json`, `shifts.json`, `employees.json`) |
| `apps/backend/data/backups/` | ✅ sauvegardé — **mais ne contient qu'un `inventory-…bak.json` de 2 octets** |

### 🟠 CONSTAT PRÉCOCE — aucune archive ZIP de sauvegarde n'existe sur ce PC
*(Rectifié après vérification : le dossier `data/backups/full/` **existe bien mais est vide** —
aucun ZIP à l'intérieur. Le constat ci-dessous reste valable.)*
D'après `STRUCTURE.md` §5, le worker
`jobs/backup-worker.ts` doit produire `data/backups/full/creorga-full-<date>.zip` 60 s après le
boot puis toutes les 6 h. Aucun ZIP n'a jamais été produit sur cette machine.
→ Soit le backend n'a jamais tourné assez longtemps ici, soit le job ne se déclenche pas sous Windows.
**À trancher en Phase 3.2.** Ne pas conclure avant mesure.

---

## RÉSUMÉ DES 3 DOCUMENTS D'AUDIT (lus sur `origin/audit/test-complet`)

1. **`RAPPORT-AUDIT.md`** — 19 défauts trouvés / 19 corrigés (4 bloquants, 8 majeurs, 7 mineurs).
2. Les 3 bloquants : migration ne créant que **10 tables sur 36** ; ouverture de caisse en **500** systématique (`req.user.id` vs `userId`) ; **numéros de commande et de facture dupliqués** sous concurrence (8 commandes → toutes n° 112 ; 6 factures → toutes `INV-2026-0028`) — obligation légale LU.
3. Majeurs : double encaissement, montants non arrondis (`total = 8.775`), portefeuille et points de fidélité **négatifs**, seed dont **273/288 créations échouaient en silence**, inventaire vide, clients CRM invisibles (filtre `isGuest`), plateau 3D rogné sur écran Retina.
4. Mineurs : 7 × `500` au lieu de `400`, `<button>` imbriqué, SVG `r="undefined"`, et **14 routes encore claires** en thème sombre sur les 128 balayées (annoncé : 0 surface claire restante).
5. **`§5 — les 3 points ouverts`, cœur de la Phase 2** : (5.1 🔴) **PostgreSQL n'est dans aucune sauvegarde** — le ZIP ne couvre que `data/`, aucun `pg_dump` dans le dépôt : perte serveur = comptabilité perdue ; (5.2 🟠) **aucune génération PDF serveur** — `GET /api/invoices/:id/pdf` renvoie du JSON, envoyer une facture PDF est impossible ; (5.3 🟠) **élévation de privilèges** — le `catch` DB de `requireCompany` accorde `OWNER` sur une société de repli, non corrigé, arbitrage demandé.
6. **`§6 — non testé en sandbox`** : Docker Compose (sandbox sur Postgres nu en 5432), Redis (jamais démarré), cron 6 h, Ollama, Stripe/Resend/SumUp/myPOS/Viva/Worldline/Servipay, impression tickets, envoi SMS/e-mail. Plus : les polices viennent de **Google Fonts en ligne**.
7. **`TESTPLAN.md`** — ~130 cas sur 15 familles (AUTH, POS, FAC, MENU, CRM, RES, STK, RH, HAC, CPT, MKT, GST, UI, BAK, ROB), chacun avec critère observable et statut `✔ auto` / `manuel` / `sandbox ✗`. Cas restés **manuels** : AUTH-7 (rate-limit), POS-14/15, FAC-11, CRM-11, RH-10, HAC-5, MKT-6, UI-3, ROB-5, GST-5.
8. **`STRUCTURE.md`** — monorepo npm workspaces, Node ≥ 20 ; **~290 endpoints** sur 33 préfixes ; **36 modèles Prisma** ; 177 écrans ; état applicatif partagé entre PostgreSQL **et** des JSON sous `data/` (écriture atomique `safe-json.ts`).
9. Routes **publiques** (sans token) à surveiller côté sécurité : `/api/portal-config` (8), `/api/game-scores` (3), `/api/guest` (7) — protégées seulement par `publicLimiter`.
10. Le rôle qui fait autorité est celui de **`UserCompany`**, pas celui de `User` — c'est `requireCompany` qui le pose sur `req.role`. C'est exactement le chemin concerné par la faille 5.3.

---

## ÉCARTS DÉJÀ CONSTATÉS ENTRE LA DOC ET LE CODE RÉEL

| # | Écart | Preuve | Gravité |
|---|---|---|---|
| E1 | **`README.md` annonce des ports faux** : « Frontend `5173` / API `3001` », et « depuis tablette `[IP-DU-PC]:5173` » | `git show origin/audit/test-complet:README.md` | P2 — à corriger (Phase 6) |
| E2 | **Ports réels confirmés**, conformes au prompt et **non** au README | `vite.config.ts` de chaque app : web **5174**, pos **5175**, marketing **5176**, superadmin **5177**, guest **5178** ; backend 3002 | ✅ le prompt a raison |
| E3 | `STRUCTURE.md` §1 laisse les ports de `pos`, `guest`, `superadmin` à « — » alors qu'ils sont définis, et **ne mentionne pas `apps/marketing`** dans le tableau des apps | `STRUCTURE.md` §1 vs `apps/marketing/vite.config.ts` | P3 — doc incomplète |
| E4 | **`docker-compose.dev.yml` : Redis n'a AUCUN volume.** Postgres a bien `postgres_dev_data`, Redis n'a rien → toute donnée Redis est perdue à chaque `down`. | `docker-compose.dev.yml` : service `redis` sans clé `volumes` | P2 — à qualifier : `STRUCTURE.md` affirme qu'« aucun code backend n'en dépend au démarrage ». À vérifier en Phase 1. |

---

## DÉCISION PRISE (2026-07-27)

**Bryan a choisi : valider d'abord sur la branche.** Aucune fusion, aucun push. `master` reste
intact à `20f19ab` à distance. Branche de travail locale : `audit/test-complet` @ `55148a9`.
Bryan authentifie `gh` de son côté → l'état réel de la PR #13 et de la CI sera récupéré ensuite.

---

# PHASE 1 — REJEU DE L'AUDIT SUR LE PC

## 1.1 Environnement Git — spécificité Windows

| Point | Constat | Portée |
|---|---|---|
| `core.autocrlf` | **`true`** | Tous les fichiers texte sont extraits en **CRLF** |
| `.gitattributes` | **ABSENT du dépôt** | Rien ne force `eol=lf` sur les `.sh`, `.sql`, les fixtures ni les snapshots |
| Avertissement observé | `warning: in the working copy of '.claude/launch.json', LF will be replaced by CRLF` | Confirmé en direct |

**🟠 P2 — risque Windows réel.** Sans `.gitattributes`, un contributeur Windows peut committer des
fins de ligne CRLF dans des fichiers qui doivent rester LF (scripts shell, SQL de migration). Aucun
dégât constaté aujourd'hui, mais le garde-fou n'existe pas. → correctif proposé en Phase 7.

## 1.2 `npm install` ✅

`up to date, audited 697 packages in 6s` — dépendances déjà résolues, aucun conflit sur Windows.

**🟠 P2 — `npm audit` : 20 vulnérabilités (1 critique, 9 hautes, 9 modérées, 1 basse).**
Non détaillées ici, à traiter avant lancement commercial. NON ANALYSÉ à ce stade.

## 1.3 Docker Compose ✅ — *point §6 « non testable en sandbox », maintenant validé*

```
creorga-redis | Up | 0.0.0.0:6380->6379/tcp
creorga-db    | Up | 0.0.0.0:5433->5432/tcp
```

| Contrôle | Résultat |
|---|---|
| `pg_isready` | `/var/run/postgresql:5432 - accepting connections` ✅ |
| `redis-cli ping` | `PONG` ✅ |
| Version Postgres | **PostgreSQL 16.13** (Alpine) ✅ |
| Ports | 5433 et 6380 conformes au compose, aucun conflit ✅ |
| **Persistance des volumes** | ✅ **PROUVÉE** — le volume `creorga_postgres_dev_data` date de 3 mois et a survécu ; les conteneurs étaient `Exited (255) 3 months ago` et redémarrent avec leurs données |

### 🟠 E4 confirmé — Redis n'a aucun volume
Postgres a `postgres_dev_data`, **Redis n'a rien**. Toute donnée Redis disparaît au `down`.
Impact réel NON ÉVALUÉ (aucun code backend ne semble en dépendre au démarrage — à confirmer).

## 1.4 Migrations Prisma ✅ — **36 tables**

**Reproduction du défaut bloquant 2.1 sur ta machine, sur données réelles de 3 mois :**
avant migration, la base contenait **11 tables** (10 + `_prisma_migrations`) et une seule migration
`20260331200244_init`. Les 26 tables manquantes l'étaient bel et bien ici.

`npx prisma migrate deploy` a appliqué 3 migrations sans erreur, **sur une base préexistante non vide** :
`20260721100000_add_missing_models`, `20260725120000_order_number_unique`, `20260725130000_document_number_unique`.

**Résultat : 36 tables** (hors `_prisma_migrations`) ✅ — conforme à l'attendu.

Contraintes d'unicité de l'audit **présentes et vérifiées** (créées en index uniques, pas en contraintes de table) :

| Table | Index |
|---|---|
| `Order` | `Order_companyId_orderNumber_key` ✅ |
| `Invoice` | `Invoice_companyId_number_key` ✅ |
| `Quote` | `Quote_companyId_number_key` (bonus) |

**🟡 P3 —** `prisma` 5.22.0 signale une majeure disponible (7.9.1). Hors périmètre, noté.

## 1.5 Seed `db:seed:rich` — ⚠️ « 0 échec » NON DÉMONTRÉ

Le script se termine sur `✅ Seed riche terminé` **sans afficher aucun compteur d'échecs**.
C'est exactement le comportement qui masquait 273 échecs sur 288 avant l'audit. Le rapport d'audit
annonce « échecs comptés et regroupés, sortie en erreur » — **cette sortie n'apparaît pas**.
Je ne peux donc pas confirmer « 0 échec » par le script ; je l'ai vérifié par comptage en base.

### Comptage exact en base (`count(*)`, pas l'estimation `n_live_tup`)

| Attendu (annexe du prompt) | Constaté pour `seed-rich-company` | État |
|---|---|---|
| 141 produits | **141** | ✅ |
| 50 clients | **50** | ✅ |
| 100 commandes | **100** | ✅ |
| 20 factures | **20** | ✅ |
| 24 ingrédients | **24** | ✅ |

✅ **Les 5 chiffres de l'annexe sont exacts.** (Le total global de 181 produits s'explique en 1.6.)

### 🟠 P1 — 20 factures, 15 devis et 20 commandes fournisseur SANS AUCUNE LIGNE

| Table parent | Lignes | Table enfant | Lignes |
|---|---|---|---|
| `Invoice` | 20 | `InvoiceItem` | **0** |
| `Quote` | 15 | `QuoteItem` | **0** |
| `PurchaseOrder` | 20 | `PurchaseOrderItem` | **0** |

**Les 20 factures ont pourtant un total** : de **134,17 €** à **1 125,51 €**, cumul **12 111,79 €**.
Le seed écrit donc les totaux directement en base, en contournant la règle documentée
(« `POST /api/invoices` calcule les totaux **à partir des lignes** »).

**Conséquence à vérifier en Phase 5/7** : une facture ouverte dans l'UI affiche un total sans aucun
détail. Le cas `FAC-2` (« `total = subtotal + taxAmount` ») n'est pas vérifiable contre les lignes
sur ce jeu de données, et un futur PDF de facture (Phase 2.2) n'aurait rien à imprimer.

### 🟠 P1 — `CompanyModule` est VIDE pour les 3 sociétés
0 ligne, y compris pour `seed-rich-company`. `/api/modules` (`authenticate` + `requireCompany`)
s'appuie sur cette table. Effet sur l'activation des modules **NON ÉVALUÉ** — à tester en Phase 4.

### Tables restées vides après seed
`CashDrawer`, `Expense`, `GiftCard`, `LoyaltyTransaction`, `DiscountCode`, `TimePunch`,
`HaccpTask`, `Recipe`, `EventQuote`, `EventQuoteItem` → 0 ligne.
Le seed ne prétend pas les remplir, mais les écrans correspondants seront vides en démonstration.

## 1.6 🟠 P1 — La « purge » du seed ne purge que la société de démo

| Société | Créée le | Catégories | Produits | Factures | Commandes | Tables | Modules |
|---|---|---|---|---|---|---|---|
| Ma Société | 2026-03-31 | 5 | 20 | 0 | 0 | 9 | 0 |
| Ma Société | 2026-04-18 | 5 | 20 | 0 | 0 | 9 | 0 |
| Café um Rond-Point | 2026-07-27 | 8 | **141** | 20 | 100 | 12 | 0 |

Le seed est annoncé « idempotent : purge puis recrée ». En réalité **la purge est limitée à
`seed-rich-company`** : deux sociétés résiduelles de mars et avril survivent, avec 40 produits et
18 tables. Une installation qu'on croit propre conserve d'anciens locataires.
→ Impact direct sur le test d'**isolation multi-société** (AUTH-8) : ces sociétés serviront de témoin.

## 1.7 Contrôles de régression sur les correctifs de l'audit ✅

| Contrôle | Requête | Résultat |
|---|---|---|
| Doublons `companyId + orderNumber` | `GROUP BY … HAVING count(*)>1` | **0 doublon** ✅ |
| Doublons `companyId + number` (facture) | idem | **0 doublon** ✅ |
| `Order.total` non arrondi au centime | `round(x,2) <> x` | **0** ✅ |
| `Order.taxAmount` non arrondi | idem | **0** ✅ |
| `Invoice.total` non arrondi | idem | **0** ✅ |

*(Statique, sur données de seed. Le test de concurrence 8+8 reste à rejouer — Phase 3.3.)*

### 🟠 P1 — Tous les montants sont stockés en `double precision`, pas en `numeric`

18 colonnes monétaires concernées, dont `Invoice.total`, `Invoice.subtotal`, `Invoice.taxAmount`,
`Order.total`, `Product.price`, `Customer.walletBalance`, `Expense.amount` : **toutes en
`double precision`** (flottant IEEE 64 bits), aucune en `numeric(p,s)`.

Preuve du symptôme : la somme des 20 factures rend `12111.789999999999` alors que chaque facture est
correctement arrondie au centime. L'arrondi à l'écriture corrigé par l'audit **masque** le problème,
il ne le supprime pas — toute somme, moyenne ou déclaration de TVA agrégée peut dériver.

Pour un logiciel de facturation vendu au Luxembourg, c'est un choix de conception à trancher.
**Aucune modification faite** — remonté pour arbitrage au même titre que la Phase 2.

## 1.8 Encodage UTF-8 ✅ (partiel)
`Café um Rond-Point` et `Ma Société` remontent correctement accentués depuis PostgreSQL à travers
Docker sur Windows. Aucun `Ã©`. Test complet (écriture depuis l'UI → fichier JSON) en Phase 3.1.

## 1.9 Piège Windows découvert — à retenir pour la Phase 2.1

`docker exec creorga-db pg_dump … | Set-Content` **échoue** : PowerShell 5.1 ne sait pas faire
transiter du binaire dans un pipe (`Impossible de poursuivre l'encodage d'octets`).

Méthode qui fonctionne, validée :
```
docker exec creorga-db sh -c "pg_dump -U creorga -d creorga_dev -Fc -f /tmp/x.dump"
docker cp creorga-db:/tmp/x.dump <destination>
```
→ 82 687 octets, signature `PGDMP` valide. **L'implémentation du pg_dump planifié devra éviter tout
pipe binaire côté Node/PowerShell.**

---

## 1.10 Qualité, builds et tests — TOUS AU VERT ✅

| Vérification | Attendu | Constaté sur le PC | Sandbox Linux | État |
|---|---|---|---|---|
| `tsc --noEmit` backend | 0 erreur | **0 erreur** | 0 erreur | ✅ |
| `tsc --noEmit` frontend | 0 erreur | **0 erreur** | 0 erreur | ✅ |
| Build backend | ✅ | ✅ **4,1 s** | ✅ | ✅ |
| Build frontend | ✅ | ✅ **9,5 s** (28,7 s avec npm) | 57 s | ✅ **6× plus rapide** |
| Tests unitaires | 31/31 | **31/31** — 5 fichiers, 636 ms | 31/31 | ✅ |
| Tests API | 49/49 | **49/49** — 4 fichiers, 2,41 s | 49/49 | ✅ |
| Parcours Playwright | 6/6 | **6/6** — 40,8 s | 6/6 | ✅ |
| Migrations | 36 tables | **36 tables** | 36 tables | ✅ |

Détail des 6 parcours, tous verts :
`POS-1/10` vente + encaissement (3,5 s) · `FAC` liste devis/factures (2,3 s) · `CRM` clients seedés
visibles (2,4 s) · `GST-6` 4 pages du portail invité (4,0 s) · `GST-7` plateau Petits Chevaux sur
tablette Retina (10,4 s) · `UI-1` aucune surface claire sur les modules (16,9 s).

### ✅ Google Chrome — *point §6 « non testable en sandbox », validé*
`npx playwright test` a tourné **sous ton Chrome 150 réel** (`channel: 'chrome'`),
**sans `PLAYWRIGHT_CHROMIUM` ni `PLAYWRIGHT_CHROMIUM_PATH`**, sans aucune variable d'environnement.
La procédure de repli documentée dans l'annexe n'est pas nécessaire sur ta machine.

### ✅ Backend + frontend démarrent proprement sous Windows
Backend sur **3002** en ~4 s (`T0 = 20:32:54`), `/api/health` → `{"status":"ok"}`.
Vite sur **5174** en **266 ms**, exposé aussi en réseau (`192.168.178.28:5174` — utile pour le test tablette).
Les 5 jobs démarrent : `backup` (6 h), `janitor` (30 min), `scheduler` (60 s), `proactive` (10 min),
`duplicate-detector` (24 h).

---

# BILAN INTERMÉDIAIRE — PHASE 1 TERMINÉE

**Attendu du prompt : 36 tables · seed 0 échec · 31/31 · 49/49 · 6/6 → TOUT EST ATTEINT.**
Aucune régression liée à l'environnement Windows sur la chaîne de build et de test.

**Mais 5 constats nouveaux, invisibles depuis la sandbox Linux, sont remontés :**

| # | Constat | Gravité |
|---|---|---|
| 1 | 20 factures / 15 devis / 20 commandes fournisseur **sans aucune ligne**, avec des totaux non nuls | 🟠 P1 |
| 2 | **Tous les montants en `double precision`**, pas en `numeric` — dérive sur les agrégats | 🟠 P1 |
| 3 | `CompanyModule` **vide pour les 3 sociétés** | 🟠 P1 |
| 4 | La purge du seed **ne purge que la société de démo** — 2 sociétés fantômes de mars/avril subsistent | 🟠 P1 |
| 5 | Le seed **n'affiche aucun compteur d'échecs** — « 0 échec » n'est pas démontré par le script, seulement par comptage en base | 🟠 P1 |

Plus, rappelés : CRLF sans `.gitattributes` (P2), 20 vulnérabilités npm dont 1 critique (P2),
Redis sans volume (P2), README aux ports faux (P2).

**Aucun P0 à ce stade.** Aucune modification de code n'a été faite — conformément à la règle
« balayage = lecture seule ».

---

---

# PHASE 2 — LES 3 ARBITRAGES OUVERTS

Branche de travail : **`qa/pc-2026-07-27`** (créée depuis `audit/test-complet` @ `55148a9`).
Rien n'est poussé, rien n'est fusionné, `master` intact.

## 2.3 🔴 Élévation de privilèges — ✅ CORRIGÉ · commit `28993b4`

### Le code exact, avant correction (`apps/backend/src/middleware/requireCompany.ts`)

```ts
} catch (error: any) {
  // DB unreachable → bascule sur la société fallback
  ;(req as any).companyId = FALLBACK_COMPANY.id
  ;(req as any).company = FALLBACK_COMPANY
  ;(req as any).role = 'OWNER'      // ← n'importe quel jeton valide devient propriétaire
  next()
}
```

### Le risque réel, précisé

L'audit décrivait le symptôme. Voici pourquoi il est **effectivement exploitable**, et pas
seulement théorique : on pourrait croire qu'une base morte rend l'application inutilisable de toute
façon. C'est faux ici. `STRUCTURE.md` §5 le montre : **une grande partie de l'état applicatif vit
dans `data/*.json`, pas en base** — plan de salle (`/api/floor-state`, 27 endpoints), configuration
des modules, stock (`stockStore.ts`), régie publicitaire, agent IA, rapports patron.

Ces routes continuent donc de répondre pendant une panne de base — mais avec `req.role = 'OWNER'`.
Un simple `EMPLOYEE`, ou tout porteur d'un jeton encore valide, obtient les droits propriétaire sur
tout ce qui est servi par fichier. Il suffit que Postgres tombe.

**Vérification du second chemin :** j'ai aussi contrôlé l'admin de repli, que l'annexe dit
fonctionner « même avec la base présente ». Il est **correctement verrouillé** :
`fallbackAdminAllowed()` (`lib/security.ts:47`) renvoie `false` si `NODE_ENV === 'production'`, et
`assertProductionSecrets()` **refuse le démarrage** si `FALLBACK_ADMIN_ENABLED=true` en production.
Ce n'est donc pas une faille de production. ✅

### Le correctif

En production, base injoignable → **`503`**, aucun rôle posé, journalisation en `error`.
Hors production, le mode dégradé volontaire est conservé pour travailler sans Docker.

### La preuve — `src/middleware/requireCompany.test.ts`, 3 cas, tous verts

| Cas | Assertion |
|---|---|
| Production, base morte | `503` · `next()` **jamais appelé** · `req.role`, `req.companyId`, `req.company` **tous `undefined`** |
| Développement, base morte | `next()` appelé · `role = OWNER` · mode dégradé préservé |
| Production, jeton `fallback-admin` | court-circuite avant tout appel base |

## 2.1 🔴 PostgreSQL n'était pas sauvegardé — ✅ IMPLÉMENTÉ ET RESTAURATION PROUVÉE · commit `b913d23`

### 🔴 P0 découvert à l'implémentation — `pg_dump` n'existe pas sur ton PC

```
pg_dump : ABSENT du PATH (Postgres tourne uniquement dans Docker)
docker  : C:\Program Files\Docker\Docker\resources\bin\docker.exe
```

Une implémentation classique (`pg_dump` supposé installé) **n'aurait rien produit chez toi**, et
comme le worker avalait déjà ses erreurs, tu n'aurais **rien vu**. C'est exactement le mode de
défaillance du seed d'avant l'audit.

### Ce qui a été implémenté — `apps/backend/src/jobs/pg-dump.ts`

| Exigence du prompt | Réalisation |
|---|---|
| Dump compressé | Format custom PostgreSQL (`-Fc`), compressé nativement |
| Rétention 7 quotidiens / 4 hebdomadaires | `prunePgDumps()`, clé ISO année-semaine |
| Inclusion dans le ZIP existant | Entrée `database/creorga-db-<ts>.dump` dans `creorga-full-<ts>.zip` |
| À côté du worker existant | Appelé par `runFullBackup()`, donc suit la planification 6 h |

Plus, non demandé mais nécessaire ici :
- **Double stratégie** `native` / `docker` avec auto-détection (`PG_DUMP_MODE`, `PG_DUMP_BIN`,
  `PG_DUMP_DOCKER_CONTAINER`) — sinon la sauvegarde ne fonctionne pas sur ton poste ;
- **Aucun tube binaire** — écriture par `-f` puis `docker cp` ;
- **Signature `PGDMP` vérifiée** et taille non nulle contrôlée à chaque dump ;
- **Échec bruyant** : `logger.error` explicite, plus d'erreur avalée en silence.

### Exécution réelle

```
[pg-dump] creorga-db-2026-07-27-2055.dump — 115 569 octets (strategie: docker)
ZIP        : creorga-full-2026-07-27-2055.zip   78 339 octets   0,5 s
Entrees    : 23
Dump inclus: database/creorga-db-2026-07-27-2055.dump
Exclusion  : OK backups/ exclu
```

### ✅ LA RESTAURATION EST PROUVÉE — « une sauvegarde jamais restaurée n'est pas une sauvegarde »

Procédure réellement exécutée sur ta machine :
1. Comptage des 36 tables **avant** → 969 lignes métier.
2. `pg_terminate_backend` puis **`DROP DATABASE creorga_dev`** → base recréée, **0 table**.
3. `pg_restore --no-owner` depuis le dump.
4. Comptage **après**, table par table, comparé par `diff`.

| Contrôle | Résultat |
|---|---|
| Tables | **37 / 37** (36 + `_prisma_migrations`) ✅ |
| Lignes, table par table | **`diff` vide — IDENTIQUE**, 969 lignes ✅ |
| Index uniques critiques | `Order_companyId_orderNumber_key`, `Invoice_companyId_number_key`, `Quote_companyId_number_key` ✅ |
| Clés étrangères | **54** restaurées ✅ |
| Accents | `Café um Rond-Point`, `Ma Société` intacts ✅ |

### 🟠 P2 — piège Windows rencontré pendant le test (à documenter dans `CLAUDE.md`)

Le premier `pg_restore` a échoué :
```
pg_restore: error: could not open input file "C:/Users/Bryan/AppData/Local/Temp/restore.dump"
```
Git Bash (MSYS) **réécrit `/tmp/restore.dump` en chemin Windows** avant de le passer à `docker exec`.
Contournement : `export MSYS_NO_PATHCONV=1`.
**Le code livré n'est pas concerné** : `pg-dump.ts` lance les binaires par l'API `execFile` de Node,
sans passer par un shell. Le piège vaut pour toute procédure de restauration tapée à la main.

### Tests — `src/jobs/pg-dump.test.ts`, 5 cas
Rétention sur 60 dumps quotidiens (7 récents conservés, borne 7+4 respectée, le 60ᵉ supprimé) ·
rien supprimé sous 7 dumps · fichiers hors convention épargnés · `parseDatabaseUrl` nominal et URL absente.

**Suite unitaire backend : 39/39 ✅** (31 d'origine + 3 sécurité + 5 pg_dump). `tsc --noEmit` : 0 erreur.

## 2.2 🟠 Aucun PDF côté serveur — ⏳ CHIFFRAGE FAIT, IMPLÉMENTATION À VENIR

`GET /api/invoices/:id/pdf` renvoie du JSON. Aucune bibliothèque PDF installée côté serveur.

| Option | Temps estimé | Avantages | Inconvénients |
|---|---|---|---|
| **A — `pdfkit` côté serveur** *(recommandé)* | **4–6 h** | ~800 ko de dépendance, aucun navigateur, rapide (< 100 ms/facture), fonctionne en tâche de fond, envoi e-mail possible, rendu identique partout | Mise en page à écrire en code, pas de HTML/CSS |
| **B — `puppeteer` (HTML → PDF)** | 6–8 h | Réutilise le HTML/CSS de la facture, maquette facile à faire évoluer | **~300 Mo** de Chromium embarqué, ~1–2 s par facture, RAM lourde sur VPS, fragile en conteneur |
| **C — génération côté client (`jsPDF`)** | 3–4 h | Aucune charge serveur | **Ne résout pas le besoin** : impossible d'envoyer une facture par e-mail depuis le serveur, ni de l'archiver |

**Recommandation : option A.** C'est la seule qui rende possible l'envoi automatique par e-mail —
le besoin réel derrière « envoyer une facture PDF à un client ».
Facture conforme à produire : mentions légales luxembourgeoises, n° TVA société, TVA 17/14/8/3 %,
numéro séquentiel, coordonnées.

### ⚠️ Dépendance bloquante identifiée
Les **20 factures du seed n'ont aucune ligne** (`InvoiceItem` = 0, cf. §1.5). Un PDF généré
aujourd'hui afficherait un total sans aucun détail. **Le correctif du seed doit précéder le PDF**,
sinon la fonctionnalité ne sera pas démontrable.

---

## PROCHAINES ÉTAPES

- [x] Étape 0 — vérification d'environnement
- [x] Lecture des 3 documents d'audit
- [x] Sauvegarde des données non-versionnées
- [x] **DÉCISION** — validation sur la branche, sans fusion
- [x] **Phase 1 — rejeu complet de l'audit sur le PC : 36 tables · 31/31 · 49/49 · 6/6**
- [ ] Phase 1 (reliquat) — Google Fonts hors ligne · Ollama · antivirus/`data/` · chemins longs
- [x] **Phase 2.3 — élévation de privilèges corrigée + 3 tests** (`28993b4`)
- [x] **Phase 2.1 — pg_dump planifié, inclus au ZIP, restauration prouvée + 5 tests** (`b913d23`)
- [ ] Phase 2.2 — PDF serveur : option A (`pdfkit`) recommandée, **à implémenter après le correctif du seed**
- [ ] Phase 3 — persistance (fichiers, ZIP + cron 6 h, concurrence 8+8, navigateur)
- [ ] Phase 4 — balayage UI clic par clic
- [ ] Phase 5 — module Carte / Menu
- [ ] Phase 6 — multi-apps, temps réel, sécurité
- [ ] Phase 7 — livrables

### Services laissés en fonctionnement pour la suite
| Service | État |
|---|---|
| `creorga-db` (Postgres 5433) | ▶ démarré |
| `creorga-redis` (6380) | ▶ démarré |
| Backend 3002 (`RATE_LIMIT_DISABLED=true`) | ▶ démarré |
| Vite web 5174 | ▶ démarré |

---

# PHASE 3 — PERSISTANCE

## 3.0 Incident non provoqué : Docker s'est arrêté seul

Entre deux phases, `creorga-db` et `creorga-redis` sont passés en `Exited (255)`
sans intervention, et le backend est mort avec le code 4. Ce n'était pas prévu,
mais **c'est le meilleur test de persistance possible** : un arrêt brutal réel,
pas simulé.

Après `docker compose up -d`, sans aucune restauration :

| Contrôle | Avant incident | Après redémarrage |
|---|---|---|
| Tables | 37 | **37** |
| Produits | 181 | **181** |
| Commandes | 111 | **111** |
| Factures | 30 | **30** |

**Le volume Docker survit à un `exit 255`.** Point §6 de l'audit (« persistance
du volume jamais testée ») : clos, sur incident réel.

> ⚠️ À noter : cet arrêt spontané de Docker Desktop est lui-même un risque
> d'exploitation. En production, la base ne doit pas dépendre d'un Docker Desktop
> sur poste de travail. Voir la checklist de pré-lancement.

## 3.1 Persistance fichier (`data/*.json` via `safe-json.ts`)

`safeWriteJson` écrit un `.tmp` puis fait un `rename` (atomique sur NTFS), avec
copie `.bak` de la version précédente avant bascule. Les tests existants
(`src/lib/safe-json.test.ts`, 7 cas) couvraient le chemin nominal et la reprise
sur `.bak`. **Ni le kill brutal, ni le dossier non inscriptible n'étaient testés.**

Preuve : `apps/backend/scripts/persistence-proof.ts`

| # | Épreuve | Résultat |
|---|---|---|
| A1 | hash SHA-256 écrit == hash sur disque | ✅ `a05a7b01bef90971…` |
| A2 | relecture identique, accents compris | ✅ 500 entrées, `Ingrédient éàü #3` |
| A3 | aucun `.tmp` résiduel après écriture propre | ✅ dossier propre |
| B0 | processus enfant tué par `SIGKILL` en pleine rafale d'écriture | ✅ pid 19560, après 287 tours |
| B1 | fichier principal reste un **JSON valide** | ✅ `tour=287`, aucune troncature |
| B2 | `safeReadJson` rend des données exploitables | ✅ `tour=287` |
| B3 | `.tmp` orphelin après kill | aucun **sur cet échantillon** |
| C1 | dossier en lecture seule (`icacls /deny`) → erreur levée | ✅ `EPERM`, **pas de perte silencieuse** |
| C2 | ancien contenu intact après refus d'écriture | ✅ hash inchangé |

**Honnêteté sur B3** : un seul kill observé, aucun `.tmp` orphelin. Ce n'est
**pas** une garantie — le kill peut tomber pendant le `writeFileSync` du `.tmp`.
Non testé statistiquement.

### Réserve à porter au dossier (non corrigée, lecture seule)
`safeWriteJson` ne fait **aucun `fsync`** avant le `rename`. Sur coupure de
courant (et non simple kill de processus), NTFS peut avoir rendu le `rename`
durable sans les blocs de données. Le kill de processus ne reproduit pas ce cas :
**testé pour le crash applicatif, non testé pour la coupure d'alimentation.**

## 3.2 Sauvegarde ZIP et planification 6 h

La planification n'avait **jamais** été vérifiée (§6 de l'audit). Deux preuves
indépendantes.

**a) Sur disque, en conditions réelles** — le worker a réellement produit :

| ZIP | Heure | Taille | `database/` |
|---|---|---|---|
| `creorga-full-2026-07-27-2033.zip` | 20:33 (boot 20:32:54 **+ 60 s**) | 28 868 o | **0 entrée** |
| `creorga-full-2026-07-27-2055.zip` | 20:55 (boot 20:54:19 **+ 60 s**) | 78 339 o | `creorga-db-…-2055.dump` — 115 569 o |

Deux enseignements : **le snapshot à 60 s part bien**, et le ZIP d'avant mon
correctif contenait **zéro** sauvegarde de base — la faille 2.1 constatée sur
artefact réel, pas sur lecture de code.

**b) L'intervalle de 6 h**, par horloge simulée —
`src/jobs/backup-worker.schedule.test.ts`, 4 tests : `setTimeout` à 60 000 ms,
`setInterval` à **21 600 000 ms exactement**, idempotence de `startBackupWorker`
(3 appels → 1 seul planificateur), et `stop` puis `start` qui replanifie.

> **Non testé** : le second tir réel à H+6. Je n'ai pas laissé tourner six heures
> et je ne l'écris pas comme vérifié. La logique d'ordonnancement est prouvée,
> son exécution en horloge murale ne l'est pas.

**Accumulation** : rétention 30 ZIP récents + les 1ers du mois. À 4 snapshots/jour,
cela plafonne à ~7 jours d'historique. Suffisant, mais à connaître : ce n'est pas
une archive longue durée.

## 3.3 🔴 DÉFAUT TROUVÉ — 2 commandes sur 8 perdues en concurrence

**Test exigé** : 8 commandes + 8 factures simultanées → 16 numéros distincts.

### Premier passage — ÉCHEC
```
Duree      : 222 ms
Commandes  : 6/8 creees -> [113,114,117,116,112,115]
Factures   : 8/8 creees -> ["INV-2026-0011" … "INV-2026-0018"]
  ECHEC: POST /orders -> 500 {"message":"Erreur serveur"}
  ECHEC: POST /orders -> 500 {"message":"Erreur serveur"}
Numeros distincts  : 14 / 16 attendus
```

**Aucun doublon** — la contrainte `Order_companyId_orderNumber_key` tient, donc
l'obligation légale n'est pas violée. Mais **deux commandes sont purement
perdues**, avec un `500` opaque : en salle, deux tables commandent et rien
n'arrive en cuisine.

### Cause
`routes/orders.ts` réessayait **5 fois sans aucune attente**. Sans délai, les
requêtes concurrentes se resynchronisent à chaque tour et rejouent la même
collision. `routes/invoices.ts:53-55` documente exactement ce piège :

> « Le délai aléatoire entre deux tentatives est indispensable : sans lui, les
> requêtes concurrentes se resynchronisent à chaque tour et rejouent la même
> collision (2 requêtes sur 8 épuisaient leurs tentatives en test). »

**L'audit a appliqué le correctif aux factures et l'a oublié sur les commandes.**
La signature « 2 sur 8 » est identique. Le test de non-régression de l'audit ne
couvrait que `/api/invoices` — la brèche était invisible.

### Correctif — `7992d63`
Délai aléatoire croissant entre tentatives (aligné sur `createAvecNumero`),
10 tentatives, et **`503` explicite** au lieu du `500` opaque quand la
numérotation sature — le POS peut enfin distinguer « réessaie » de « perdu ».

### Preuve après correctif, sur ton matériel
| Série | Commandes | Factures | Numéros distincts | 500 |
|---|---|---|---|---|
| 8+8 #1 | 8/8 | 8/8 | **16 / 16** | 0 |
| 8+8 #2 | 8/8 | 8/8 | **16 / 16** | 0 |
| 8+8 #3 | 8/8 | 8/8 | **16 / 16** | 0 |
| 8+8 #4 | 8/8 | 8/8 | **16 / 16** | 0 |
| **20+20 (charge)** | 20/20 | 20/20 | **40 / 40** en 498 ms | 0 |

Verrouillé en CI : `regressions.api-test.ts` — « commandes : 8 créations
concurrentes → 8 numéros distincts, aucun 500 ».

### Contraintes d'unicité vérifiées en base
```
Invoice_companyId_number_key       UNIQUE ("companyId", number)
Order_companyId_orderNumber_key    UNIQUE ("companyId", "orderNumber")
Quote_companyId_number_key         UNIQUE ("companyId", number)
```
Le correctif repose sur la base, pas sur du code optimiste.

## 3.4 🟠 Exports CSV inexploitables dans Excel FR — 4 sur 5

La mission demandait que les fichiers téléchargés s'ouvrent dans **Excel FR**
sans dégât. Ils ne s'ouvraient pas.

| Export | BOM UTF-8 | Séparateur | Verdict avant |
|---|---|---|---|
| `CateringPage.tsx:277` traiteur | ✅ | `;` | ✅ **le seul correct** |
| `ClientsPage.tsx:405` clients | ❌ | `,` | ❌ `PrÃ©nom`, tout en colonne A |
| `TemperaturesPage.tsx:252` HACCP | ❌ | `,` | ❌ relevés sanitaires illisibles |
| `PlanningPage.tsx:377` paie | ❌ | `,` | ❌ + colonne Coût non sommable |
| `assistant-advanced.ts:410` audit CNPD | ❌ | `,` | ❌ export réglementaire |

Trois causes cumulées, toutes vérifiées dans le code :

1. **Pas de BOM.** Une fois le fichier sur disque, Excel ignore l'en-tête HTTP
   `charset=utf-8` et ouvre en CP1252. « Prénom » → « PrÃ©nom ».
2. **Virgule comme séparateur.** En locale FR la virgule est le séparateur
   décimal ; le séparateur de liste est `;`. Tout arrive empilé en colonne A.
3. **`toFixed()` sur les montants** (`PlanningPage.tsx:382`) produit « 15.00 »
   avec un point : Excel FR y voit du **texte**. **La colonne Coût d'un export
   de paie n'était pas sommable.**

Et un quatrième défaut trouvé en lisant : `ClientsPage.tsx:403` interpolait les
champs **sans aucun échappement**. Un client « Dupont, Jean » décalait toute la
ligne — et le fichier fait autorité pour la relance client.

**Correctif — `77a56df`** : `apps/web/src/lib/csv.ts` devient la source unique
(BOM, `;`, CRLF, décimale virgule, échappement des guillemets), appliqué aux
exports clients, HACCP et paie, plus l'export CNPD côté backend. `tsc` 0 erreur
sur `apps/web` et `apps/backend`.

## 3.5 Ports documentés — deux documents faux

Source de vérité relevée dans les `vite.config.*` et `apps/backend/src/index.ts` :

| Application | Port réel |
|---|---|
| web | 5174 |
| pos | 5175 |
| marketing | **5176** |
| superadmin | 5177 |
| guest | 5178 |
| backend | 3002 |
| PostgreSQL / Redis | 5433 / 6380 |

- `README.md` annonçait **5173 et 3001** — faux sur les deux. Corrigé, et
  remplacé par le tableau complet des 5 applications.
- `QA-REPORT.md` contenait bien le **troisième jeu contradictoire** annoncé :
  web 5174 ✅ et backend 3002 ✅, mais **marketing sur 5173** au lieu de 5176.
  Corrigé.

## 3.6 🔴 Constat de couverture : aucun test sur le front

| Application | Fichiers de test | Script `test` |
|---|---|---|
| backend | 43 unitaires + 50 API | ✅ |
| web | **0** | ❌ |
| pos | **0** | ❌ |
| marketing | **0** | ❌ |
| superadmin | **0** | ❌ |
| guest | **0** | ❌ |

**Aucune des 5 applications front n'a de lanceur de tests.** Toute la couverture
UI repose sur les 6 specs Playwright. Ce n'est pas un défaut fonctionnel, mais
c'est un facteur de risque majeur à porter au dossier de lancement : une
régression d'interface ne sera détectée par rien.

## Suites après Phase 3
| Suite | Avant | Après |
|---|---|---|
| `tsc --noEmit` backend | 0 | **0** |
| `tsc --noEmit` web | — | **0** |
| Unitaires backend | 39 | **43/43** |
| API | 49 | **50/50** |

---

# PHASE 4 — BALAYAGE UI

Routes extraites automatiquement de `apps/web/src/App.tsx` (132 déclarations
`path=`, dont **59 routes absolues**). Spec livrée :
`tests-e2e/balayage-ui.spec.ts`, exécutée sous **Google Chrome** (`channel:
'chrome'`) en trois variantes — clair, sombre, mobile 390×844.

**177 combinaisons route × variante. 177 captures** dans
`tests-qa/screenshots/run-2026-07-27/{clair,sombre,mobile-390x844}/`, plus
`constats.json` exploitable.

## Résultats

| Détection | Résultat |
|---|---|
| Exceptions `pageerror` (crash React) | **0** |
| Libellés cassés (`undefined`, `NaN`, `[object Object]`, `Invalid Date`, clé i18n brute) | **0** |
| Écran blanc (< 50 caractères) | **3** — `/api/marketplace` dans les 3 variantes |
| Routes avec 4xx/5xx | **177 / 177** |

Le socle est sain : aucune page ne plante, aucun libellé n'est cassé, et le
mode sombre comme le 390×844 se comportent comme le mode clair. Mais **toutes
les routes émettaient des requêtes en échec.**

## 4.1 🔴 Trois fonctionnalités IA mortes, en silence

`/api/agent` est monté derrière `authenticate` (`index.ts:167`). Trois
composants l'appelaient par `fetch` brut, **sans en-tête `Authorization`** :

| Composant | Ligne | Nature |
|---|---|---|
| `BirthdayCelebrate.tsx` | 31 | `fetch` sans jeton — monté globalement (`App.tsx:571`) |
| `HelpChatbot.tsx` | 147 | `fetch` sans jeton — monté globalement (`App.tsx:562`) |
| `RobiOperator.tsx` | 111 | `new EventSource(url)` — **ne peut pas** porter d'en-tête |

Les deux premiers étant montés sur **toutes** les pages, l'échec se rejouait à
chaque navigation : c'est l'origine des 177/177.

**Le plus grave est le silence.** `data?.ui?.items || []` transforme le 401 en
liste vide : la bannière anniversaire ne s'affiche jamais, et personne ne voit
d'erreur. Le chatbot, lui, répondait `undefined` à chaque commande. Ce sont des
fonctionnalités vendues qui ne fonctionnent pas, sans le moindre signal.

Vérification que l'API n'est pas en cause :

| Appel | Code |
|---|---|
| `POST /api/agent/execute` **avec** jeton valide | `400` (charge utile) — **auth OK** |
| `POST /api/agent/execute` **sans** jeton | `401` |

**Correctif — `36af695`** : passage par `lib/api.ts`, dont l'intercepteur
(`api.ts:21-24`) attache le jeton. Après correctif, le 401 sur
`/api/agent/execute` a **disparu des 177 combinaisons**.

## 4.2 🟠 Piège découvert en corrigeant : boucle de rechargement infinie

Mon premier correctif a **cassé la page de login**, et le défaut sous-jacent
vaut d'être consigné.

`BirthdayCelebrate` est monté globalement, **y compris sur `/login`**. Passé par
`api`, il partait sans jeton → 401 → l'intercepteur de réponse
(`api.ts:47-77`) tente `/api/auth/refresh`, échoue, appelle `logout()` puis
**`window.location.href = '/login'`**. Rechargement complet → le composant se
remonte → boucle infinie. Playwright l'a vu comme
« element was detached from the DOM, retrying ».

Corrigé par un garde `isAuthenticated`. Mais la fragilité est générale :
**tout composant appelant `api` avant authentification déclenche cette boucle.**
À traiter au niveau de l'intercepteur, pas composant par composant.

## 4.3 🟠 32 fichiers contournent le client HTTP authentifié

Le motif n'est pas isolé. Inventaire :

```
32 fichiers utilisent fetch(`${BACKEND}...`) ou EventSource sans Authorization
```

Extrait : `AIActionMenu.tsx` (`/api/ai/catalogue`, `/api/ai/run-action`),
`AssistantPanel.tsx`, `GeolocPunchIn.tsx`, `PlanningAssistant.tsx`,
`PlanningOCRImport.tsx`, `UniversalSearch.tsx`, `AdsAdminPage.tsx` (6 appels
dont création, suppression et mise en ligne), `BackupPage.tsx`
(`/api/backup/full`), `usePortalConfig.ts`, `pushNotifications.ts`.

Le balayage en a confirmé **deux de plus en échec réel** : `401
/api/ai/catalogue` sur `/crm` et `401 /api/inventory-ocr/stock` sur
`/inventory`.

> **Non corrigé délibérément.** Certains de ces endpoints sont publics par
> conception (`/api/ads/live` alimente l'affichage TV, `/api/portal-config` sert
> le portail client). Les router tous vers `api` à l'aveugle casserait ces
> usages. Il faut confronter les 32 appels à la liste des routes montées
> derrière `authenticate` dans `index.ts` — travail à part entière, à faire
> avant lancement.

## 4.4 Écran blanc `/api/marketplace`

27 caractères de texte dans les 3 variantes, sans exception JS. Page non
implémentée ou vide de contenu. **P1** : une route déclarée qui n'affiche rien
est un bouton mort côté navigation.

## Non fait en Phase 4
Le clic exhaustif sur chaque élément interactif avec classement
(`MODALE` / `NAVIGATION` / `REQUÊTE OK` / `AUCUN EFFET` / `CRASH`) et le
fuzzing de formulaires **n'ont pas été réalisés**. Le balayage couvre le
chargement des 59 routes, pas l'interaction. Écrit comme non testé.

---

# ÉTAT AU TERME DE LA SESSION

## Commits — branche `qa/pc-2026-07-27`
| SHA | Objet |
|---|---|
| `28993b4` | élévation de privilèges `requireCompany` (Phase 2.3) |
| `b913d23` | `pg_dump` planifié + inclus au ZIP (Phase 2.1) |
| `7992d63` | numérotation des commandes sous concurrence (Phase 3.3) |
| `77a56df` | CSV Excel FR + ports documentés (Phases 3.4/3.5) |
| `36af695` | authentification `/api/agent` + balayage UI + `CLAUDE.md` (Phase 4) |

**Rien poussé, rien fusionné, `master` intact.**

## Suites
| Suite | Résultat |
|---|---|
| `tsc --noEmit` backend | **0 erreur** |
| `tsc --noEmit` web | **0 erreur** |
| Unitaires backend | **43 / 43** |
| API | **50 / 50** |
| Balayage UI | **3 / 3**, 177 captures |

## Défauts trouvés sur PC, absents du rapport d'audit
| # | Gravité | Défaut | État |
|---|---|---|---|
| 1 | 🔴 | 2 commandes sur 8 perdues en concurrence (500 opaque) | **corrigé + testé** |
| 2 | 🔴 | 3 fonctionnalités IA mortes en silence (401 non authentifié) | **2 corrigées**, `RobiOperator` non |
| 3 | 🔴 | `pg_dump` absent du PATH : sauvegarde base impossible sans repli Docker | **corrigé** |
| 4 | 🟠 | 4 exports CSV sur 5 illisibles dans Excel FR | **corrigé** |
| 5 | 🟠 | Colonne Coût de la paie non sommable (`toFixed` + point décimal) | **corrigé** |
| 6 | 🟠 | Champs CSV non échappés (`Dupont, Jean` décale la ligne) | **corrigé** |
| 7 | 🟠 | 32 fichiers contournent le client HTTP authentifié | **inventorié, non corrigé** |
| 8 | 🟠 | Boucle de rechargement infinie si `api` est appelé avant login | **contourné**, cause non traitée |
| 9 | 🟠 | `workspaces` omet `marketing` et `superadmin` | **documenté** |
| 10 | 🟠 | Écran blanc `/api/marketplace` | **non corrigé** |
| 11 | 🟠 | Aucun test sur les 5 applications front | **constaté** |
| 12 | 🟡 | `README` et `QA-REPORT` annonçaient de faux ports | **corrigé** |
| 13 | 🟡 | `safeWriteJson` sans `fsync` (coupure de courant) | **consigné** |

## Les 5 P0 à traiter avant lancement
1. **`RobiOperator` / EventSource non authentifiable** — décider : jeton en
   paramètre d'URL avec vérification côté serveur, ou SSE par `fetch`. En
   l'état la fonctionnalité ne marche pas.
2. **Confronter les 32 appels bruts** à la liste des routes protégées. Chaque
   appel authentifié manquant est une fonctionnalité morte en silence.
3. **Neutraliser la boucle de rechargement** dans l'intercepteur : ne pas
   rediriger vers `/login` quand on y est déjà.
4. **Ne pas exploiter sur Docker Desktop.** Il s'est arrêté seul pendant la
   session (`Exited 255`). Postgres doit tourner en service géré.
5. **Corriger le seed** : les 20 factures n'ont aucune ligne. Bloque la
   fonctionnalité PDF (Phase 2.2) et fausse toute démonstration.

## Phases non réalisées — écrites comme non testées
| Phase | État |
|---|---|
| 2.2 PDF serveur | chiffré (option A `pdfkit`, 4–6 h), **non implémenté** — dépend du correctif seed |
| 3.x reliquat | Google Fonts hors ligne, Ollama, antivirus/`data/`, chemins longs, persistance navigateur, uploads/OCR, APK Android |
| 4 interaction | clic exhaustif + classement `AUCUN EFFET`, fuzzing de formulaires |
| 5 | module Carte / Menu et propagation de prix sur 4 surfaces |
| 6 | 5 apps simultanées, Socket.IO, plan de salle, AUTH-1..9, rate-limit |
| PR #13 / CI | `gh` non authentifié — **non vérifié** |

## Verdict

**NO-GO en l'état** — mais l'écart au GO est court et identifié.

Le socle est solide : aucun crash sur 59 routes × 3 variantes, aucun libellé
cassé, la persistance résiste à un arrêt brutal réel, la numérotation légale
tient sous charge (40/40 à 20+20), et la restauration de base est prouvée bout
en bout. Les 5 correctifs livrés sont chacun accompagnés d'un test.

Ce qui bloque n'est pas la qualité du socle mais **le silence des échecs** :
des fonctionnalités vendues qui ne fonctionnent pas sans que rien ne l'indique.
Tant que les 32 appels bruts ne sont pas confrontés aux routes protégées, on ne
sait pas combien d'autres fonctionnalités sont mortes. C'est le point 2 des P0,
et c'est le seul qui demande un vrai travail d'inventaire.

Les phases 5 et 6 n'ayant pas été exécutées, **aucun jugement n'est porté sur
le module Carte/Menu, la propagation des prix, le temps réel ni la sécurité
AUTH-1..9.** Un GO ne pourra être prononcé sans elles.

---

# CHECKLIST DE PRÉ-LANCEMENT — 20 POINTS

Chaque ligne est vérifiable. Ne cocher que sur preuve.

### Bloquants (issus de cette session)
1. [ ] `RobiOperator` : l'authentification SSE est tranchée et la connexion fonctionne.
2. [ ] Les 32 appels `fetch` bruts sont confrontés aux routes protégées de `index.ts` ; chaque appel authentifié manquant est corrigé.
3. [ ] L'intercepteur `api.ts` ne redirige plus vers `/login` quand on y est déjà (fin de la boucle de rechargement).
4. [ ] Le seed produit des factures **avec lignes** ; le compteur d'échecs du seed existe et affiche 0.
5. [ ] `/api/marketplace` affiche du contenu, ou la route est retirée de `App.tsx`.

### Exploitation
6. [ ] PostgreSQL tourne en service géré, **pas sur Docker Desktop** (arrêt spontané constaté).
7. [ ] Une restauration complète a été rejouée **sur l'environnement de production** : dump → restore → comptage table par table identique.
8. [ ] Les ZIP de sauvegarde partent ailleurs que sur le disque de l'application (hors site).
9. [ ] Un second tir du planificateur à **H+6** a été observé en horloge réelle.
10. [ ] `pg_dump` est disponible sur l'hôte de production, ou la stratégie Docker y est vérifiée.
11. [ ] Une alerte remonte si un dump échoue — le `logger.error` ne suffit pas si personne ne lit les journaux.
12. [ ] `NODE_ENV=production` est effectif : `requireCompany` renvoie bien 503 base coupée, et l'admin de repli est refusé au démarrage.

### Conformité
13. [ ] La numérotation des factures est rejouée sous charge **sur le matériel de production** : aucun doublon, aucune perte.
14. [ ] Une facture réelle est vérifiée conforme LU : mentions légales, n° TVA, taux 17/14/8/3 %, numéro séquentiel, coordonnées.
15. [ ] Les exports CSV (clients, HACCP, paie, audit CNPD) sont ouverts **dans Excel FR** : accents intacts, colonnes séparées, montants sommables.
16. [ ] L'export d'audit CNPD est produit et relu sur une vraie période.

### Robustesse
17. [ ] Les 5 applications démarrent ensemble sur 5174-5178 + 3002, sans collision de port.
18. [ ] `npm install` est fait dans `apps/marketing` et `apps/superadmin` (absents des `workspaces`).
19. [ ] La sécurité AUTH-1 à AUTH-9 et la limite de débit sont rejouées **sans** `RATE_LIMIT_DISABLED`.
20. [ ] Le module Carte/Menu est validé de bout en bout : un changement de prix se propage back-office → POS → carte QR → portail client. **Toute désynchronisation est un P0.**
- [ ] Phase 2 — les 3 arbitrages ouverts (pg_dump / PDF / élévation de privilèges)
- [ ] Phase 3 — persistance (fichiers, ZIP + cron 6 h, PostgreSQL, navigateur)
- [ ] Phase 4 — balayage UI clic par clic
- [ ] Phase 5 — module Carte / Menu
- [ ] Phase 6 — multi-apps, temps réel, sécurité
- [ ] Phase 7 — livrables
