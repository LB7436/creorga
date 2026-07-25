# Rapport d'audit — Creorga OS

Branche `audit/test-complet` · sandbox cloud, aucun accès au VPS ni à la production.

---

## 1. En bref

**19 défauts trouvés, 19 corrigés.** Trois d'entre eux empêchaient purement et simplement
le produit de fonctionner sur une installation neuve.

| Gravité | Trouvés | Corrigés |
|---|---|---|
| 🔴 Bloquant | 4 | 4 |
| 🟠 Majeur | 8 | 8 |
| 🟡 Mineur | 7 | 7 |

**Vérifications qui passent maintenant :** typecheck et build front + back (0 erreur),
31 tests unitaires, 49 tests API, 6 parcours UI, sauvegarde et **restauration réelle**
octet à octet, déploiement complet depuis une base vide.

**Avant la démonstration**, lisez le §5 : trois points ne sont pas des bugs mais des
manques qui peuvent se voir en présentation.

---

## 2. Les trois défauts bloquants

### 2.1 La base de données ne se créait qu'au tiers

La seule migration (`20260331200244_init`) créait **10 tables alors que le schéma en
déclare 36**. Sur une installation neuve, `prisma migrate deploy` produisait une base
sans `Customer`, `Invoice`, `Quote`, `Reservation`, `Ingredient`, `Supplier`,
`PurchaseOrder`, `Shift`, `TimePunch`, `LeaveRequest`, `HaccpLog`, `HaccpTask`,
`Campaign`, `DiscountCode`, `CashDrawer`, `Expense`, `Review`, `EventQuote`,
`GiftCard`, `LoyaltyTransaction` ni `CompanyModule`.

Concrètement : **CRM, facturation, réservations, stock, RH, HACCP, marketing,
comptabilité, réputation et événements étaient non fonctionnels** sur toute nouvelle
installation. Le développement local ne le voyait pas, la base ayant été construite
progressivement par `prisma db push` sans générer de migration.

→ Migration `20260721100000_add_missing_models` : 26 tables, index et clés étrangères.
Vérifié sur une base vierge : 36 tables créées.

### 2.2 L'ouverture de caisse renvoyait 500 à chaque appel

`req.user.id` n'existe pas — le jeton JWT expose `userId`. La clé étrangère échouait
systématiquement. **Impossible d'ouvrir la caisse**, donc impossible de tenir une
journée de vente. Même faute sur la création de dépense.

→ Corrigé, plus refus d'ouvrir une seconde caisse quand une autre est déjà ouverte
(deux caisses simultanées rendent la clôture ininterprétable).

### 2.3 Numéros de commande et de facture dupliqués

La numérotation lisait le dernier numéro puis ajoutait 1, sans verrou. Mesuré :
**8 commandes simultanées ont toutes reçu le n° 112**, et **6 factures simultanées le
n° INV-2026-0028**.

Pour les factures c'est un problème légal : la numérotation séquentielle et unique est
une obligation au Luxembourg.

→ Contrainte d'unicité en base (`companyId` + numéro) — les doublons préexistants sont
renumérotés par la migration pour rester applicable en production —, création en
transaction avec réessai et délai aléatoire. Le délai est nécessaire : sans lui les
requêtes concurrentes se resynchronisent et rejouent la même collision.
Vérifié : 8 commandes et 8 factures concurrentes → 16 numéros distincts.

---

## 3. Défauts majeurs

| # | Défaut | Effet | État |
|---|---|---|---|
| 1 | **Double encaissement accepté** | La même commande pouvait être payée deux fois : `paidAt` écrasé et montant compté deux fois dans le chiffre d'affaires | ✅ 409 si déjà payée ou annulée, + refus si espèces reçues < total |
| 2 | **Montants stockés non arrondis** | 3 × 2,50 € à 17 % donnait `taxAmount = 1.275` et `total = 8.775` : ticket et caisse impossibles à faire tomber juste au centime | ✅ arrondi au centime à l'écriture, création et recalculs |
| 3 | **Portefeuille client négatif** | Un débit supérieur au solde le faisait passer à −9 999 € : crédit jamais encaissé | ✅ débit plafonné au solde, montant non numérique refusé (`parseFloat` écrivait `NaN` en base) |
| 4 | **Points de fidélité négatifs** | Dépenser plus de points qu'on n'en a passait le solde sous zéro | ✅ débit excédentaire refusé |
| 5 | **Le seed de démo n'écrivait presque rien** | 273 créations sur 288 échouaient en silence, le script affichait « ✅ Seed riche terminé ». Champs inexistants sur 9 modèles | ✅ corrigé, échecs comptés et regroupés, sortie en erreur, purge préalable (le seed empilait un jeu de données à chaque exécution) |
| 6 | **Module Inventaire vide** | Aucun ingrédient n'était créé : page Stock vide, aucune alerte de réappro | ✅ 24 ingrédients réalistes avec coûts, stocks et seuils (dont ~1/6 sous le seuil) |
| 7 | **Clients CRM invisibles** | La liste filtre `isGuest: true` ; les clients seedés ne l'étaient pas et n'apparaissaient nulle part | ✅ seed aligné sur ce que crée l'application elle-même |
| 8 | **Plateau Petits Chevaux rogné sur tablette** | `setSize(w, h, false)` empêchait la mise à jour de la taille CSS : sur écran Retina le canvas débordait, seul le quart haut-gauche de la scène était visible | ✅ vérifié sur tablette portrait, paysage et mobile |

---

## 4. Défauts mineurs

| # | Défaut | État |
|---|---|---|
| 1 | JSON malformé → 500 (et alerte Sentry) au lieu de 400 | ✅ |
| 2 | Produit inexistant dans une commande → 500 au lieu de 400 | ✅ + recherche restreinte à la société |
| 3 | Shift avec employé inconnu, dates invalides ou fin avant début → 500 | ✅ 400 avec message explicite |
| 4 | Dépense à montant négatif ou non numérique acceptée | ✅ refusée (un remboursement se saisit comme un avoir) |
| 5 | Facture à ligne négative acceptée | ✅ quantité, prix et TVA validés |
| 6 | `<button>` imbriqué dans un `<button>` sur les cartes de modules — HTML invalide, clic imprévisible | ✅ `div` avec `role="button"` et clavier |
| 7 | Attribut SVG `r="undefined"` rejeté par le navigateur (carte des livreurs) | ✅ valeur initiale d'animation |

**Thème sombre** — le correctif de la PR #12 ne couvrait que les 22 pages d'accueil de
module. Le balayage des **128 routes** a révélé 14 routes encore claires : classes
Tailwind teintées (navigation admin), couleurs maison hors palette (tableaux RH,
relances, chips CRM), blancs translucides, dégradés des cartes de tarifs, et le plan de
travail du concepteur de salle resté blanc. Toutes corrigées, **0 surface claire**
restante.

---

## 5. À savoir avant la démonstration

Ce ne sont pas des bugs, mais des manques visibles.

### 5.1 La sauvegarde ne couvre pas la base de données

Le système de sauvegarde archive `data/` (fichiers JSON : plan de salle, stock,
configuration) et fonctionne parfaitement — restauration vérifiée octet à octet.

**Mais PostgreSQL n'est pas sauvegardé.** Commandes, factures, clients, employés,
relevés HACCP vivent en base et ne sont dans aucune archive. Aucun `pg_dump` n'existe
dans le dépôt.

C'est le point le plus important du rapport : en cas de perte du serveur,
**l'intégralité des données comptables serait perdue**. Un `pg_dump` planifié à côté du
worker existant comblerait le manque.

### 5.2 Aucune génération de PDF côté serveur

`GET /api/invoices/:id/pdf` **renvoie du JSON**, pas un PDF, malgré son nom. Aucune
bibliothèque PDF n'est installée côté serveur.

Le seul export « PDF » est l'impression navigateur du rapport HACCP. Le bouton
« Télécharger PDF » n'avait aucun gestionnaire de clic — il ne produisait rien. Je l'ai
branché sur la boîte d'impression (qui propose « Enregistrer au format PDF ») et
désactivé le bouton « Envoyer par e-mail », lui aussi non branché, plutôt que de le
laisser silencieusement inopérant.

**Envoyer une facture en PDF à un client n'est pas possible aujourd'hui.**

Les exports CSV, eux, fonctionnent : testés en conditions réelles, fichiers produits et
contenus valides (clients 41 918 o, températures HACCP 2 006 o, paie 1 611 o).

### 5.3 Élévation de privilèges quand la base est injuguable

Dans `requireCompany`, le `catch` d'erreur base de données accorde le rôle `OWNER` sur
une société de repli. Une panne de base transforme donc n'importe quel porteur de jeton
en propriétaire. Le repli est utile en développement, mais devrait être conditionné à
`NODE_ENV !== 'production'`.

**Non corrigé** : ce garde-fou touche au modèle d'authentification et mérite votre
arbitrage — le mode dégradé sans base semble volontaire (`FALLBACK_ADMIN_ENABLED`).

---

## 6. Ce qui n'a pas pu être testé ici

| Élément | Raison |
|---|---|
| Docker Compose | Démon Docker indisponible dans la sandbox — PostgreSQL installé directement (port 5432 au lieu de 5433) |
| Stripe, Resend, SumUp, myPOS, Viva, Worldline, Servipay | Aucune clé, aucun accès réseau vers ces services |
| Ollama (assistant IA local) | Non installé ; les routes `/api/agent` en dépendent partiellement |
| Impression tickets, tiroir-caisse | Matériel |
| Cron 6 h et volumes du VPS | Hors sandbox — la logique de sauvegarde est validée, la planification reste à vérifier sur votre PC |
| Envoi réel SMS/e-mail | Idem |

À noter : l'application charge ses polices depuis Google Fonts. Hors ligne ou avec un
réseau filtré, la typographie retombe sur les polices système. Sur une tablette en salle
avec un wifi capricieux, cela se verra.

---

## 7. Reproduire l'audit

```bash
# Base
pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE ROLE creorga LOGIN PASSWORD 'password' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE creorga_dev OWNER creorga;"

npm install
cp apps/backend/.env.example apps/backend/.env
sed -i 's|localhost:5433|localhost:5432|' apps/backend/.env   # pas de Docker

cd apps/backend
npx prisma generate && npx prisma migrate deploy   # 36 tables
npm run db:seed:rich                               # démo, idempotent

# Qualité
npx tsc --noEmit                     # back : 0 erreur
cd ../web && npx tsc --noEmit        # front : 0 erreur
npm run build --workspace=apps/backend
npm run build --workspace=apps/web

# Tests
cd ../backend
npm test                             # 31 unitaires
RATE_LIMIT_DISABLED=true npm run dev # dans un autre terminal
npm run test:api                     # 49 tests API

cd ../.. && npx playwright test tests-e2e/parcours-critiques.spec.ts   # 6 parcours
```

Sur une machine sans Google Chrome :
`PLAYWRIGHT_CHROMIUM=1 PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chromium npx playwright test`

`RATE_LIMIT_DISABLED=true` neutralise les limiteurs **hors production uniquement** : la
suite d'audit enchaîne des tentatives de connexion volontairement fausses et épuiserait
sinon le quota anti-force-brute de 10 tentatives par 5 minutes.

---

## 8. Résultats

| Vérification | Résultat |
|---|---|
| Typecheck backend | ✅ 0 erreur |
| Typecheck frontend | ✅ 0 erreur |
| Build backend | ✅ |
| Build frontend | ✅ 57 s |
| Tests unitaires | ✅ 31/31 |
| Tests API | ✅ 49/49 |
| Parcours UI Playwright | ✅ 6/6 |
| Migrations sur base vierge | ✅ 36 tables |
| Seed de démo | ✅ 0 échec, idempotent |
| Sauvegarde → destruction → restauration | ✅ 6/6 fichiers identiques (SHA-256) |
| Balayage des 128 routes | ✅ 0 surface claire, 0 erreur produit |
| Exports de fichiers | ✅ 3/3 CSV valides |

Livrables : `STRUCTURE.md` (cartographie), `TESTPLAN.md` (~130 cas),
`apps/backend/src/__audit__/` (suite API), `tests-e2e/parcours-critiques.spec.ts`
(parcours UI). Les tests resserviront sur votre PC.
