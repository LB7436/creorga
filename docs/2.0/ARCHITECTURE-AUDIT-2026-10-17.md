# CréOrga 2.0 — audit architectural fonctionnel du 17 octobre 2026

## Consolidation après les rejoués et restauration finale

Les points intermédiaires ci-dessous restent historiques. Les nouveaux contrats
sont maintenant éprouvés sur des cas ciblés, pas sur toute l'architecture :

- Le règlement final ferme la visite QR dans la même transaction, sans fermer
  pendant un acompte ni laisser un rejeu terminer la visite d'un nouveau groupe.
  Ancien QR refusé 403 dans Chrome après paiement Jardins/Bar ; Bar reste accessible
  avec 8,20 € dus après acompte, puis nouveau groupe à zéro. Concurrence couverte
  en intégrations, pas un essai réel de deux processus backend indépendants.
- Autorité PostgreSQL, provenances, réserves et identités financières conservées.
  Les ventes A/B/C sont réconciliées à 21,10 / 84,50 / 38,04 € TTC ; documents et
  mouvements de trésorerie ne sont pas une seconde vente. Prix/taux fictifs ne
  constituent pas une validation fiscale des catégories.
- Budget/annulation Robi et exemples métier sont corrigés, mais le contexte métier
  reste 503 : absence de résultat ne devient pas une réponse supposée correcte.
  Les huit exemples sans jeux ont été réellement vus dans Chrome.
- Restauration finale 19:31:36.908 UTC : 81 tables/10 083 lignes/14 fichiers/26 PDF
  égaux, copie chiffrée vérifiée après arrêt normal. 861 unités, 295 PG et 47 fixtures
  finales ; deux profils compilés cinq applications, pas autant de parcours UI.

[Preuves finales](preuves/intensive-validation-finale-2026-10-17-2135-v3.json),
[traçabilité](TRACABILITE-UI-API-PG-2026-10-17.md),
[mesures et limites de comparaison](PERFORMANCES-MISSION-MAITRE-2026-10-17.md).

Décision maintenue : conserver le cœur TypeScript/Node/PostgreSQL et corriger ses
contrats transactionnels ; aucun prototype Go/Rust/Python n'a démontré ici de gain
justifiant une migration. La qualification d'une version Node corrigée est une
priorité distincte d'un changement de langage. ACL fines/ADMIN métier absents,
Robi, charge prolongée, matériel et prestataires restent des barrières au pilote.
Cette consolidation ne vaut ni nouvel audit exhaustif ni livraison de la campagne.

## Complément de preuve — 20:33:54 Europe/Luxembourg

**17 octobre 2026, 18:33:54 UTC — intermédiaire, NON LIVRÉ.** Après le point 20:29:27 ci-dessous, le restaurant solde réellement dans Chrome la fusion **POS 6,10 + QR 25,40 = 31,50 EUR**. Le collecteur de **18:30:26.747 UTC** confirme désormais **3 Sale pour 4 Order PAID**, **78,00 TTC = 75,11 HT + 2,89 TVA**, dû 0, et stocks 27 / 23 / 18 / 39 / 59 / 25. L'agrégation d'un règlement ne duplique pas les deux commandes en deux nouvelles ventes dans ce relevé ciblé. Il s'agit toujours d'espèces/carte déclarées, pas de banque qualifiée.

Le QR rechargé affiche l'addition à zéro avec menu encore visible ; **la politique de visite après paiement reste à qualifier**, sans déduire révocation ou fuite. Robi réel renvoie **503** avec message explicite d'absence de réponse métier vérifiée ; cette fonction reste bloquée malgré les tests de résilience. Voir les [preuves restaurant](RECETTE-RESTAURANT-2026-10-17.md) et le [registre de progression](ANOMALIES-MISSION-MAITRE-2026-10-17.md).

La restauration de **19:57:26** précède ces nouveaux règlements : le plan de reprise doit inclure une copie plus récente et sa comparaison. Ce complément n'est ni un nouvel audit complet de code, ni un benchmark, ni une livraison ; aucun rôle ou T100 intégral n'est qualifié.

## Point de reprise documentaire — 20:29:27 Europe/Luxembourg

**17 octobre 2026, 18:29:27 UTC — intermédiaire, pas livraison ni nouveau benchmark architectural.** L'audit de sources et ses empreintes historiques restent conservés ci-dessous ; elles ne sont pas présentées comme un nouvel instantané du working tree. Aucun test, build, processus, API, SQL ou Git n'est exécuté pour cette actualisation.

Les preuves métier nouvelles confirment l'intérêt de séparer les objets de domaine sans réécrire le produit :

| Contrat architectural | Observation réelle disponible | Ce qui ne peut pas être conclu |
| --- | --- | --- |
| Vente / commande / provenance / règlement distincts | Bar : **1 Sale, 1 Order POS, 4 origines LINE + 1 ORDER**, 2 tenders **10 EUR CASH + 14,84 CARD**, vente **24,84 TTC / 22,46 HT / 2,38 TVA**. Un double clic Chrome produit un POST checkout unique 200, puis une observation PG concordante. | Pas une garantie de tous les conflits ni une confirmation bancaire : les deux tenders sont `manual_declaration`. |
| Caisse et chiffre d'affaires séparés | Fond bar **100 EUR**, encaissement espèces fictif **10 EUR**, théorique **110 EUR** après rechargement ; carte déclarée séparée. Stocks 98 / 79 / 59 / 19. | 110 EUR n'est ni le chiffre d'affaires ni un comptage physique ; aucune clôture bar qualifiée. |
| Projection de table et groupes financiers séparés | Restaurant, après redémarrage : **31,50 EUR** visibles, groupes **6,10 / 0,00 / 25,40** préservés ; modale ouverte, pas de validation retenue à la coupure. | Le montant d'une table n'est pas une nouvelle vente. Ne pas effacer le groupe vide ou rejouer les acomptes historiques pour aligner l'écran. |
| Sémantique des sessions explicite | Logout 200 de la caisse bar après dix minutes inactives conforme au [verrouillage POS](../../apps/pos/src/App.tsx). Origine locale corrigée et logins effectués. | Ce logout n'est pas une panne refresh ; **refresh naturel 200 avec cookie non encore prouvé**. |
| Autorisations d'adhésion, pas rôle inventé | EMPLOYEE du bar : refus Comptabilité/caisse visible et **403** serveur ciblé. | Pas de nouvel ADMIN métier ni d'ACL fine « limité/sans finances ». La décision utilisateur manque encore ; le nom d'un compte n'accorde ni ne retire une permission. |
| Assistant borné, non autorité financière | Robi réel signale contexte autorisé indisponible et absence de réponse métier vérifiée, sans inventer de montant ; suggestions ludiques encore reproduites. | Les budgets 20/25 s et tests de scope ne prouvent pas que le contexte et le modèle autorisé fonctionnent. Correction des suggestions en cours, non qualifiée. |
| Artefact métier réversible | Deux profils compilés, cinq applications chacun selon les outils du coordinateur ; démarrage normal du profil métier PID 43260 vers **20:06 Luxembourg**. **47/47 fixtures locales** à 18:05:29 UTC. | Une compilation n'est pas un parcours métier, une certification sans jeux chargés sur tous les écrans ou un benchmark de consommation. Aucun prototype Go/Rust/Python lancé. |

La règle de calcul observée au bar est **31,60 brut − 3,16 remise − 3,60 offert = 24,84 EUR** ; le motif commercial est exigé dans le paiement et ne se déduit pas de la note de préparation. La provenance agrégée de ces gestes et la ventilation de TVA au prorata nécessitent une qualification métier/comptable distincte. Aucune réallocation historique par article n'est inventée à partir du total.

Sources de preuve et limites : [bar](RECETTE-BAR-2026-10-17.md), [restaurant](RECETTE-RESTAURANT-2026-10-17.md), [café inchangé à ce point](RECETTE-CAFE-2026-10-17.md), [registre d'anomalies](ANOMALIES-MISSION-MAITRE-2026-10-17.md). Le relevé bar de 18:26:06 est `OBSERVATION_ONLY_NOT_UI_PASS`. Les **838 unitaires / 278 PG de 17:47–17:48** précèdent la dernière modification de politique d'origine ; les **47 fixtures locales** ne les remplacent pas. La restauration de **17:57:26**, **81 tables / 9 609 lignes / 14 fichiers / 24 PDF**, précède cette nouvelle vente bar et ne prouve donc pas sa restauration.

Le choix du monolithe modulaire Node/TypeScript/PostgreSQL reste une proposition étayée, pas une réécriture, une mesure nouvelle de performance ou une déclaration « prêt pour production ». Aucun rôle intégralement qualifié, aucun nouveau PASS T100, aucune preuve de cinq heures actives ; **campagne et travaux locaux toujours en cours, NON LIVRÉ**.

## Relevé architectural historique conservé

**Lecture de sources et proposition d'architecture — pas une recette ni une livraison.**

Relevé réalisé le 17 octobre, à partir de 16:52 UTC, sur le working tree Windows de `creorga-2.0`. Référence de départ communiquée par le coordinateur : dépôt `LB7436/creorga`, branche `codex/creorga-2-0-2026-10-08`, HEAD publié `475f67a`, avec corrections locales non commitées. Ce volet ne relance pas Git et ne présente pas ces corrections comme publiées. Les empreintes de sources ci-dessous identifient quelques points d'ancrage, pas un nouvel instantané intégral du dépôt.

Périmètre : exigences fonctionnelles de la nouvelle mission maître, composants, contrats, dépendances, stockage et tests existants. L'analyse NFR/sécurité complémentaire doit être consolidée par le coordinateur. **Aucun test, build, accès Chrome, requête API/SQL, arrêt de processus, migration, archive ou prototype n'est exécuté pour produire ce document.** Un fichier de test existant n'est pas une preuve de réussite.

La nouvelle campagne vise **CAFÉ DU CENTRE → RESTAURANT DES JARDINS → BAR DES AMIS**. La boulangerie préparée/prévue par l'ancien cadrage reste préservée à part ; elle ne remplace pas le bar. Les rapports datés antérieurs qui appellent C « Boulangerie » restent historiques. Le coordinateur rapporte la disparition de l'ancien PID 21664 sans forçage constaté vers 18:48 Europe/Luxembourg et un nouveau démarrage normal en cours : ce volet documentaire ne vérifie ni ce processus ni la reprise métier.

## 1. Résultat de l'audit et choix directeur

Le choix raisonnable reste **un backend Node/TypeScript/Express à modulariser progressivement, avec PostgreSQL comme autorité financière, et les interfaces React existantes**. Le dépôt n'est pas un système de microservices : les routes, projections et jobs partagent le processus et la base. Le laboratoire regroupe même l'API et les quatre serveurs statiques dans un seul processus Node ; PostgreSQL est séparé.

Ce choix conserve les garanties déjà codées : références idempotentes, réservations de paiements incertains, transactions PostgreSQL, provenance des lignes, documents figés et restauration. Une réécriture en Go/Rust/Python ne remplace aucune de ces garanties et ne résout pas, par elle-même, une mauvaise projection ou un contrat utilisateur incomplet.

Le risque principal visible n'est pas « le mauvais langage », mais **la transition encore incomplète entre plusieurs représentations métier** : plan et couverts, commandes, visites QR, reçus POS, documents et règlements. Les adaptateurs de lecture évitent déjà certaines doubles écritures ; leurs contrats et limites doivent rester explicites. Le découpage proposé est un monolithe modulaire, non une affirmation que les modules sont aujourd'hui indépendants.

## 2. Stack réellement déclarée et verrouillée

Les versions ci-dessous viennent des manifestes et des deux lockfiles lus, pas d'une interrogation des processus ni d'une installation effectuée pendant cet audit.

| Composant | Déclaration / résolution observée | Portée et réserve |
| --- | --- | --- |
| Monorepo | npm workspaces, version produit `4.0.0` | Cinq workspaces : web, backend, pos, guest, superadmin. `apps/marketing` reste séparé. « CréOrga 2.0 » est le cadrage de livraison, pas le champ version des paquets. |
| Langage | TypeScript **5.9.3** verrouillé ; scripts d'exploitation JavaScript `.mjs` et PowerShell | Les contraintes manifestes sont parfois plus anciennes, par exemple `^5.4.5` ; ne pas les confondre avec la résolution. |
| API | Express **4.22.2**, Prisma et client **5.22.0**, Zod **3.25.76** | Un schéma PostgreSQL partagé ; pas de migration de framework exécutée. |
| ERP/POS/guest/superadmin | React/ReactDOM **18.3.1**, Vite **6.4.4** | React Router **7.18.3** là où déclaré ; l'enveloppe guest n'en dépend pas. |
| État ERP | TanStack Query **5.96.0**, Zustand **4.5.7**, Axios **1.20.0** pour web | Le POS utilise aussi son propre client fetch et sa génération de session. |
| Temps réel | Socket.IO et client **4.8.3** | Socket.IO n'est pas un journal financier durable. Les canaux publics autorisés sont distincts du stockage métier. |
| Documents / envoi | pdf-lib **1.17.1**, pdf-parse **2.4.5**, Nodemailer **10.0.16** | Le générateur PDF existe ; ce n'est ni une validation fiscale ni une preuve de réception Internet. |
| Paiement | SDK Stripe **23.0.0**, connecteur PayPal HTTP dédié | Abonnement SaaS et encaissement du commerçant restent des périmètres distincts. |
| Image / OCR | Sharp **0.35.5**, Tesseract.js **7.0.0** | Présence de dépendance ≠ OCR fournisseur activé ou qualifié. |
| Tests | Vitest **4.1.11**, Playwright **1.61.1**, React test renderer **18.3.1** | Suites frontend désormais présentes ; aucun nouveau lancement ici. |
| Site vitrine séparé | React **18.3.1**, Router **6.30.6**, Vite **5.4.21**, TS **5.9.3** dans son lockfile | Hors compilation locale métier actuelle ; sa ligne de dépendances diverge du back-office. |
| Moteur Node | Racine `engines.node >=20.0.0` | Version du runtime actuel **non vérifiée par ce volet**. L'ancienne mesure de performance indique Node 22.19.0, à son instant seulement. |
| Bases / services déclarés en dev | Compose : PostgreSQL `16-alpine`, Redis `7-alpine` | Ne prouve pas la version du laboratoire actif. Aucun client Redis n'a été repéré dans les dépendances backend lues ; le runtime métier ne lance pas Redis. |

Sources : [racine](../../package.json), [lock principal](../../package-lock.json), [backend](../../apps/backend/package.json), [web](../../apps/web/package.json), [POS](../../apps/pos/package.json), [guest](../../apps/guest/package.json), [superadmin](../../apps/superadmin/package.json), [marketing](../../apps/marketing/package.json), [lock marketing](../../apps/marketing/package-lock.json), [Compose dev](../../docker-compose.dev.yml).

Point de compatibilité concret : `>=20` n'exprime pas toutes les bornes du lock. Sharp demande au moins 20.9 ; pdf-parse indique `>=20.16 <21 || >=22.3` ; Vitest indique les lignes 20, 22 ou 24+. Il faut retenir une version Node précisément qualifiée et encore maintenue avant toute nouvelle installation, et tester son lock complet. Cela ne justifie ni une mise à niveau aveugle ni une conclusion sur la version aujourd'hui chargée. Aucun scan de vulnérabilités nouveau n'est revendiqué ici.

## 3. Topologie et frontières

```text
ERP web 5174 ─┐
POS 5175 ────┼─ HTTP /api + Socket.IO ─ API Express ─ Prisma ─ PostgreSQL
superadmin ──┤                           │
guest 5178 ──┘                           ├─ JSON / pièces / médias locaux
   └─ iframe vers web /c                 ├─ SMTP de test / fournisseurs selon config
                                         └─ connecteurs IA et prestataires

Profil local : un processus Node sert API + 4 fronts compilés ; PG est séparé.
Site marketing : application distincte, non démarrée par ce profil.
```

Ce schéma décrit le code du lanceur, pas des ports nouvellement vérifiés. [runtime.mjs](../../scripts/local/runtime.mjs) exige un répertoire privé explicite, une base loopback et le mode e-mail de test ; il désactive les clés d'encaissement réel, la démonstration et les tâches non essentielles. Il ne lance ni seed, installation, reset ni migration au boot. [build-local-profile.mjs](../../scripts/build-local-profile.mjs) compile quatre fronts et le backend ; le `build` racine ordinaire n'a pas ce même périmètre.

Le profil métier et le profil complet utilisent le code 2.0 courant ; revenir au complet ne signifie pas relancer un ancien écrivain financier. Le [plugin de profil](../../scripts/local/business-build-plugin.mjs) refuse certains modules de jeux/Three dans le graphe métier. Côté serveur, `/api/game-scores` est un refus 404 métier et l'import des scores est conditionnel. Les jeux restent dans le dépôt ; aucun retrait local/Git n'est effectué ici.

## 4. Cartographie fonctionnelle

Dans la colonne tests, les noms sont des **sources de non-régression repérées**, pas des exécutions nouvelles. Les tables sont les modèles principalement concernés, non une liste exhaustive de toutes les lectures d'audit. Les API sont les points d'entrée montés, pas une spécification exhaustive de chaque champ.

| Module | Langage / framework | Dépendances métier / techniques | API principale | Tables / stockage | Fonction réellement codée | Tests existants repérés | Risque / limite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Identité, société, adhésions | TS / Express / Prisma | JWT, bcrypt, validation, middleware société | `/api/auth`, `/api/companies` | User, UserCompany, RefreshToken, Company, CompanySettings, CompanyModule | Inscription, session/refresh, choix société, membres et rôles | `auth.refresh`, `auth.availability`, `auth-admission.integration`, middleware de société | ADMIN métier distinct absent du contrat de création ; ACL fines demandées absentes. |
| ERP et navigation | TS / React / Router / TanStack / Zustand | Client HTTP scoped, authentification, modules | Routes web, `/api/modules`, statistiques | Caches mémoire, préférences navigateur ; données métier API | Espaces de gestion et vues mobile ; fonctions indisponibles signalées | `scopedQueryClient`, `authScope`, `logoutEntrypoints`, contrôles navigateur historiques | Modules déclarés actifs ≠ parcours disponibles ; toutes les routes/rôles non qualifiés. |
| Salle / sessions natives | TS / Express / Prisma ; React ERP/POS | Pricing serveur, CAS, verrou société, projections | `/api/floor-state`, `/api/pos/bootstrap`, `/api/pos/draft` | FloorWorkspace, FloorChange, ServiceSession, ServiceCover ; miroir JSON société | Tables, chaises, couverts, révision, reprise et adoption initiale | `floorState.*`, `service-sessions.integration`, `pos-projection.integration`, `floorStateClient` | Snapshot complet ; autorité PG dépend du profil. Ancien mode fichier ne doit pas contourner une panne PG. |
| Vente POS et préparation | TS / React / Zustand ; services TS | Prix/TVA gelés, soldes, cuisine, provenance | `/api/pos/payments`, `/checkout`, `/kitchen`, `/api/orders` | Order, OrderItem, PosSale, SaleOrigin, OrderTender, PosCoverPayment ; tickets différentiels dans le plan | Acompte/partiel/solde, reçu unique, préparation différentielle | `pos.integration`, `orders.integration`, `kitchen-tickets`, `OrderPage.bootstrap`, `PartialPaymentPanel.result` | Préparation native/QR encore représentée différemment ; correction après préparation refusée dans certains chemins. |
| QR, groupes, transferts | TS / React web ; Express / Prisma | Visites/capacités révocables, société/table, allocation monétaire | `/api/guest`, `/api/guest-visits`, `/api/pos/table-movements`, `/service-separations`, `/financial-allocations` | GuestVisit, GuestVisitAccess, TableMovement, ServiceAllocation, ServiceShare, ServiceShareTender, Order | Visites indépendantes, révocation/renouvellement, provenance, groupes et allocation explicite | `guest-visits.integration`, `table-movements.integration`, `financial-allocations.integration`, `qr-movements.spec` | Cas financiers ambigus refusés ; toutes les fusions/variantes et le paiement en ligne des portions non qualifiés. |
| Enveloppe portail guest | TS / React 18, iframe | Config portail et URL web `/c` | `/api/portal-config`, iframe ERP | PortalConfiguration ; ancien store local non monté par App | Affiche le vrai portail web, pas une seconde autorité de commande | Sources `App.tsx`, `usePortalConfig.ts` ; parcours QR web distincts | Anciennes pages guest conservées ne doivent pas être remises en service sans audit. |
| Catalogue et stock produit | TS / Express / Prisma | Produit société, catégories, calcul serveur, débit final | `/api/products`, `/api/categories`, `/api/pos/catalog` | Product, Category, Order.inventoryDebitedAt | CRUD catalogue et débit Product.stock une seule fois à finalisation | `catalog-import`, `business-extended.integration`, `orders.integration`, `pos.integration` | Stock produit distinct des ingrédients ; prix catalogue courant ne remplace pas le prix historique. |
| Achats / ingrédients / recettes | TS / Express / Prisma | Fournisseurs et ingrédients de la même société | `/api/inventory/ingredients`, `/suppliers`, `/purchase-orders`, `/recipes` | Ingredient, Supplier, PurchaseOrder, PurchaseOrderItem, Recipe | Réception complète atomique, recettes configurables | `business-extended.integration` et validations d'inventaire | Réception partielle explicitement 409 ; consommation automatique d'ingrédients par recette non établie dans le débit vente actuel. |
| Facturation / devis / avoirs | TS / Express / pdf-lib | Moteur monétaire pur, numérotation, original figé, reçu source | `/api/invoices`, `/quotes`, `/from-pos`, `/:id/credit-notes`, `/pdf` | Invoice, InvoiceItem, Quote, QuoteItem, CreditNote, PosSale | PDF A4/58/80, devis converti, facture depuis ticket, avoir lié et TVA historique | `invoices.integration`, `receipt-invoices.integration`, `credit-notes*`, `invoice-pdf` ; panneaux React | Rendu PDF ≠ imprimante ; écran global « Avoirs » indisponible ne signifie pas absence du panneau d'avoir dans une facture. |
| Envoi / accès documentaires | TS / Express / Nodemailer | PDF original, destinataire, hash et référence d'envoi | `/:id/email`, `/deliveries`, `/document-links`, `/api/document-download` | InvoiceDelivery, InvoiceDocumentLink, InvoiceDocumentLinkEvent, PDF en base | Envoi durable, suivi d'incertitude, liens révocables/limités | `invoice-email.integration`, `invoice-document-links.integration`, `invoice-delivery.lifecycle` | Acceptation SMTP ≠ distribution/lecture ; téléchargement déjà fait non rappelable. |
| Paiements / remboursements | TS / Express, HTTP PayPal, SDK Stripe | Solde serveur, marchand, devise, clés idempotentes et réservations | `/api/payments`, webhooks spécifiques | PaymentAttempt, PaymentSettlement, PaymentAllocation, PaymentWebhook, RefundAttempt, RefundAllocation, RefundReviewEvent, ManualRefund | Paiement vérifiable ou déclaration manuelle distincte ; réserve UNKNOWN/REVIEW conservée | `payments.integration`, `refunds.integration`, `manual-refund-rejection.integration`, `paypal`, `stripe` | Banque réelle non qualifiée ; déclaration carte ≠ capture ; Stripe Refunds non activé par la présence du SDK. |
| Caisse / comptabilité / versements | TS / Express / Prisma | Tenders, mouvements, pièces, arrondis et rapprochement | `/api/accounting/cash-drawers`, `/reconciliation`, `/payouts`, `/payout-statements`, `/api/rapports-caisse` | CashDrawer, CashMovement, PosClosure, Expense, PayoutStatement, BankPayout, PayoutLine, PayoutDecision | Comptage/écart figé, CSV opérationnel, import/validation de relevés fictifs | `cash-drawers.integration`, `financial-reconciliation`, `bank-payouts.integration`, `JournalPage.behavior` | CSV non grand livre validé ; requêtes par ligne de versement ; pagination de gros journaux non qualifiée. |
| RH et documents salariés | TS / React / Express / Prisma | Adhésion active, droits manager/soi-même, verrou créneau/pointage | `/api/hr`, `/api/hr-dossier` | Shift, TimePunch, LeaveRequest, EmployeeProfile, EmployeeNote, EmployeeDocument ; fichiers privés | Planning, publication, congés, pointages et dossier selon rôle | `shift-slot`, `hr-punch-concurrency.integration`, `hr-documents.integration`, `hr-planning-section`, tests React planning/RH | Garde de double clic congé UI ≠ idempotence serveur multi-onglet ; anciens conflits conservés. |
| HACCP | TS / React / Express / Prisma | Utilisateur/société, validation type/valeur | `/api/haccp/logs`, `/tasks`, `/daily-report` | HaccpLog, HaccpTask | Déclarations manuelles et historique, mesures numériques contrôlées | `business-extended.integration`, tests formulaires HACCP | Aucun capteur réel qualifié ; `MANUAL` n'est pas une mesure automatique. |
| CRM / fidélité / communication | TS / React / Express / Prisma | Clients société, consentements, autorisations | `/api/crm`, `/marketing`, `/reputation`, `/events` | Customer, LoyaltyTransaction, GiftCard, Campaign, DiscountCode, Review, EventQuote | Fiches, bons/fidélité, campagnes et devis événementiels présents | `crm-financial.integration`, `business-extended.integration` | Couverture UI et concurrence non exhaustive ; audiences/plusieurs services externes indisponibles. |
| Robi / assistants / OCR | TS / React / Express ; OCR navigateur | Trois routeurs agent, intentions, catalogue d'actions, mémoire société/acteur, services IA configurés | `/api/agent`, `/api/ai`, outils OCR planning ; ancien `/inventory-ocr` fermé | Fichiers assistant par société et utilisateur ; lectures PG selon commande | Lecture/action proposée selon contrats ; OCR planning présent en composant | `assistantConfirmation`, `assistantScope`, `t100-assistant.spec` et tests de disponibilité | Réponse Robi réellement bloquée dans B ; chaque commande doit être qualifiée, fichiers JSON ne sont pas des copies fiables du journal financier. |
| Affichage professionnel | TS / React / Express, médias locaux | Programmation, médias et canaux publics prévus | `/api/ads`, `/api/affichage`, `/api/media-affichage` | Fichiers de configuration et médias d'affichage | Écrans TV, musique et programmation, distincts des jeux | Tests/clics ciblés seulement dans l'inventaire existant | Diffusion média publique volontaire : ne pas y ranger de documents privés ; matériel et codecs non qualifiés ici. |
| Superadministration / SaaS | TS / React / Express | Auth créateur disjointe, OTP, facturation SaaS | `/api/creator`, `/api/stripe`, `/api/owner` | CreatorAccount, CreatorRefreshToken, ActivityEvent, LoginEvent, ErrorLog, TenantMetricDaily, Opportunity ; fichiers owner | Console séparée, audit et abonnements | `creatorAuth`, `creator/regles`, `owner`, jobs créateur | Superadmin technique ≠ rôle administrateur d'établissement ; pas qualification complète de la console ni de l'onboarding marchand. |
| Sauvegarde / restauration / arrêt | TS et JS / Node, PowerShell | pg_dump natif/Docker, ZIP streamé, manifestes, canal local privé | Jobs internes ; `/api/backup` société explicitement 503 | Dump PG, data, médias, manifestes et clés séparées | Sauvegarde inspectée, conservation, arrêt attendant travaux admis | `backup-worker.*`, `pg-dump*`, `verifier-restauration`, tests locaux lifecycle/static-host | Point commun PG/fichiers exige arrêt des écrivains ; aucune purge automatique autorisée. UI société non implémentée. |

Points d'entrée vérifiés : [index API](../../apps/backend/src/index.ts), [routes web](../../apps/web/src/App.tsx), [App POS](../../apps/pos/src/App.tsx), [App guest](../../apps/guest/src/App.tsx), [schéma Prisma](../../apps/backend/prisma/schema.prisma). Les sous-routeurs caisse/rapprochement/versements sont montés depuis [accounting.ts](../../apps/backend/src/routes/accounting.ts), et non des API indépendantes.

## 5. Données et invariants à préserver

Le schéma lu contient **80 modèles Prisma et 36 dossiers de migrations**. Ce compteur n'est pas celui des **81 tables** d'une restauration historique : ne pas confondre modèles, tables physiques et métadonnées de migration. Aucune base active n'est introspectée dans cet audit.

| Objet métier | Autorité / représentation observée | Conséquence architecturale |
| --- | --- | --- |
| Société, rôle et salarié | UserCompany, avec adhésion active ; OWNER/MANAGER/EMPLOYEE dans les contrats de création | Un nom de compte « administrateur » ou « sans finances » ne crée pas une permission. Le front n'est pas l'autorité du rôle. |
| Plan de salle et identités natives | FloorWorkspace JSONB + révision/empreinte, FloorChange, ServiceSession/ServiceCover en mode PG | Conserver l'adoption initiale ; aucune réinterprétation des anciennes ventes navigateur. Le fichier par société est alors un miroir, pas un second maître. |
| Table historique / physique | Table et identifiants externes du workspace coexistent | Ne pas recréer une vente ni recopier les tables pour satisfaire une ancienne vue. Les projections doivent dédupliquer par identité. |
| Commande / reçu / document | Order/OrderItem, PosSale/SaleOrigin, Invoice/CreditNote séparés | Une facture depuis ticket n'est pas une nouvelle vente ; une copie d'une ligne QR n'est pas une ligne native à revendre. |
| Règlements | OrderTender et affectations ; tentatives/settlements prestataires distincts | Le solde est recalculé serveur. Autorisé, pending, inconnu et payé ne sont pas interchangeables. |
| Documents émis | Snapshot historique et binaire/hash PDF en PG ; accès et envois journalisés | Changer le logo/prix courant ne réécrit pas l'original. Avoir et remboursement restent deux opérations. |
| Stock | Product.stock pour ventes ; Ingredient.currentStock/Recipe pour achats et fiches techniques ; ancien stock JSON à part | Ne pas sommer/répliquer ces sources comme si elles décrivaient la même unité. Aucun double débit, recette automatique ou inventaire physique supposé. |
| Brouillons, préférences et reprises | Stores navigateur, référence d'opération incertaine, quarantaine de données non attribuables | Le navigateur n'a pas l'autorité de confirmer un encaissement. Ne jamais effacer un pending après un timeout sans preuve. |

[floor-workspace.ts](../../apps/backend/src/lib/floor-workspace.ts) compare révision et hash, conserve `initialSnapshot`, refuse une corruption PG sans repli fichier silencieux, synchronise les couverts dans la transaction et journalise les deltas. Le contexte courant utilise `AsyncLocalStorage` dans [floorState.ts](../../apps/backend/src/routes/floorState.ts), pas une unique société globale implicite. Les verrous financiers par société et commande sont volontairement conservés.

Le moteur [money.ts](../../apps/backend/src/lib/money.ts) utilise des fractions `bigint`, des centimes sûrs et une allocation déterministe des résidus. Le [front web le réexporte](../../apps/web/src/lib/money.ts), ce qui évite une deuxième règle d'arrondi mais crée un import inter-applications à documenter. Le schéma conserve aussi des champs historiques `Float` (catalogue/totaux) : cela n'est pas une preuve d'écart actuel, mais impose de contrôler tous les chemins de conversion au lieu d'annoncer que toute la base est déjà en décimal exact. Aucun changement rétrospectif n'est proposé.

Le [client TanStack scoped](../../apps/web/src/lib/scopedQueryClient.ts) remplace le QueryClient à chaque changement de contexte session/société/rôle et retire l'ancien cache. Des clés courtes comme `['products']` ne prouvent donc pas, seules, une fuite actuelle. Les clients HTTP et stores disposent aussi de gardes de réponses tardives. Toute nouvelle page doit utiliser ces contrats, pas un client global indépendant.

## 6. Contrats critiques et chaînes de responsabilité

| Contrat | Chaîne observée | Garde à ne pas supprimer |
| --- | --- | --- |
| Vente native / acompte | POS → référence stable → `/api/pos/payments` → commande matérialisée/tenders → solde → reçu/finalisation/stock | Transaction avec salle ; aucun « payé » sur simple notification ou réponse perdue. |
| Paiement en ligne | Réservation durable → appel prestataire hors transaction → preuve montant/devise/marchand/référence → affectation | UNKNOWN/REVIEW et réservations conservés ; ne pas changer la clé pour relancer un débit ambigu. |
| Transfert / fusion / séparation | Identité de couvert/visite → vérification solde/préparation → mouvement/allocations → QR révoqué ou réassocié explicitement | Aucun ancien QR ne doit obtenir l'addition d'un autre groupe. Certaines ambiguïtés restent refusées. |
| Avoir | Facture émise vérifiable → verrou/numérotation → TVA historique → PDF/écriture liée | Original immuable ; refus définitif typé limité et action explicite pour corriger la demande. |
| Remboursement déclaré | Avoir + tender d'origine + motif/justificatif → plafonds réservés → mouvement espèces éventuel et déclaration atomiques | `NOT_RECORDED` ne prouve pas que de l'argent n'a pas été remis hors logiciel ; aucun abandon d'une réserve incertaine. |
| Clôture | Tenders + mouvements + fond → théorique → compté/motif → snapshot figé | Écart documenté, pas modification silencieuse après clôture. |
| Document envoyé | Original PDF/hash → InvoiceDelivery → essai SMTP → état connu ou incertain | Acceptation SMTP et réception Internet séparées ; résultat ambigu non rejoué aveuglément. |
| Reprise | Écrivains arrêtés → copie cohérente → restauration base neuve → comparaison → reprise des mêmes identités | Aucun reset/seed/purge ; compilation et démarrage seuls ne valident pas les anciennes opérations en attente. |

Sources : [ledger paiements](../../apps/backend/src/lib/payments/ledger.ts), [tenders](../../apps/backend/src/lib/order-tenders.ts), [stock commande](../../apps/backend/src/lib/order-inventory.ts), [avoirs](../../apps/backend/src/lib/credit-notes.ts), [remboursements manuels](../../apps/backend/src/lib/payments/manual-refunds.ts), [envoi](../../apps/backend/src/lib/invoice-delivery.ts), [reprise](MIGRATION-REPRISE-ROLLBACK.md).

Le système possède des journaux/provenances ciblés, **pas une preuve d'event sourcing intégral**. Socket.IO et les notifications ne remplacent ni l'état PostgreSQL ni un journal de sortie transactionnel. Aucun broker durable Redis/Kafka n'est démontré par le simple Compose de développement.

## 7. Exigences fonctionnelles de la nouvelle mission et lacunes

Ces identifiants FR sont propres à cet audit ; ils ne changent ni T01–T100 ni le registre de campagne.

| FR | Exigence | Prise en charge / écart observé | Validation encore nécessaire |
| --- | --- | --- | --- |
| FR-01 | Préserver puis reprendre le travail non publié | Coordination reprise/sauvegarde existante ; aucune opération Git/processus ici | Reprise normale et transaction fictive du code final par le coordinateur ; ne pas recycler le vieux statut PID comme contrôle actuel. |
| FR-02 | Trois établissements indépendants | Structure société et catalogues présents ; A/B partiellement parcourus historiquement | Nouveau C = BAR DES AMIS, comptes/données distincts ; boulangerie conservée hors campagne. |
| FR-03 | Six catégories d'utilisateur | OWNER/MANAGER/EMPLOYEE + visite QR ; créateur séparé | **Administrateur d'établissement distinct et ACL employé limité non implémentés** ; décision métier sur permissions avant ajout, pas alias OWNER silencieux. |
| FR-04 | Service complet café/restaurant/bar | Caisse, salle, tournées, partages/allocations et clôture présents | Service B complet, bar tardif/minuit, plusieurs caissiers et toutes les exceptions ; aucune qualification par présence de boutons. |
| FR-05 | QR multi-groupes confidentiel | Visites, révocation, provenance, transferts/groupes présents | Toutes les fusions, cas avec préparation/paiements en cours, expiration et reprises aux cinq largeurs demandées. |
| FR-06 | Préparation et corrections traçables | Tickets différentiels et statuts présents | Routage physique bar/cuisine et correction après préparation non qualifiés ; certains changements de commandes explicitement refusés. |
| FR-07 | Calculs et historique financier exacts | Moteur partagé, centimes et snapshots | Matrice de tous les chemins/remises/consignes/variantes ; règles fiscales du catalogue à faire valider séparément. |
| FR-08 | Encaissements partiels/mixtes fiables | Tenders, acomptes, soldes et reprise incertaine présents | Banque/sandbox réel selon accès ; pas d'autonomie complète de caisse hors serveur. |
| FR-09 | Factures, reçus, avoirs et envoi | Générateur et documents figés réellement présents | Impression physique 58/80, modèles légaux, exports/mails de chaque société et liens expirés en UI. |
| FR-10 | Remboursement et rapprochement | Déclaré et prestataire séparés, réservations prudentes, relevés fictifs | Prestataires externes et Stripe Refunds non activé ; aucun déblocage arbitraire. |
| FR-11 | Clôture / comptabilité | Fond, mouvements, comptage/écart et CSV opérationnel présents | Export comptable convenu/validé, volumes supérieurs aux limites actuelles et rapprochement bancaire réel. |
| FR-12 | Stock complet | Catalogue et réception complète protégés ; recettes configurables | **Réception partielle, stock multi-dépôts, pertes et consommation recette unifiés/OCR fournisseur non livrés par ces routes.** |
| FR-13 | RH jour/nuit | Créneaux, congés et pointages, autorisations serveur | Double demande congé : garde UI seulement ; idempotence serveur/multi-onglet absente, contrats minuit/fuseau et rôles à rejouer. |
| FR-14 | HACCP fiable | Manuel et historique typés | Capteur réel absent ; ne pas fabriquer de valeur manquante. |
| FR-15 | Robi utile sans risque | Intentions, outils et confirmation de certaines actions présents | Incident de question sans réponse ; audit commande par commande et contrats d'erreur/timeout ; aucune permission financière issue du seul modèle. |
| FR-16 | Sauvegarde/restauration et UI propriétaire | Jobs, dump/fichiers et preuves de restauration existants | **Sauvegarde/restauration société par interface indisponible** ; cohérence automatique PG/fichiers sous écritures non démontrée. |
| FR-17 | Reprise, incidents et durabilité | CAS, idempotence, fichiers flushés, canal d'arrêt privé | Coupure électrique, panne PG contrôlée et reprises UI finales ; pas garantie matérielle déduite d'un flush. |
| FR-18 | Recette intégrale et performance | Inventaire statique/T100 et traces existants | Tous rôles/écrans, charge progressive, temps actif et données réconciliées ; 3 697 contrôles source ≠ 3 697 contrôles validés. |

Les refus d'une opération dangereuse ne doivent pas devenir des faux succès, ni être supprimés pour faire passer une recette. Ils restent des limites fonctionnelles explicites jusqu'à une implémentation et une preuve appropriées.

## 8. Couplage et performance : faits séparés des hypothèses

| Point | Fait prouvé par lecture ou rapport daté | Statut / investigation proposée, non exécutée |
| --- | --- | --- |
| Snapshot de salle complet | `saveFloorWorkspace` calcule hashes/deltas et stocke le snapshot JSONB ; `safeWriteJson` assure encore les écritures de compatibilité flushées | Coûts potentiels de copies/sérialisation ; ne pas enlever CAS, transactions ou flush. Mesurer séparément JSON, SQL, miroir et réponse. |
| Requêtes par couvert modifié | `syncCovers` groupe plusieurs lectures, saute les couverts inchangés, mais effectue un upsert par couvert réellement modifié | Boucle SQL visible, pas preuve d'un défaut actuel. Toute mise en lot doit préserver les conflits et prix historiques. |
| N+1 de rapprochement des versements | GET payouts charge les versements puis `payoutDto` charge les lignes et recherche chaque capture/remboursement individuellement | **Structure N+1 prouvée**, latence/charge non mesurée. Candidat à lecture groupée par société/provider/marchand/devise, avec tests d'équivalence. |
| Rapport financier global | `financialReconciliation.ts` lit jusqu'à 5 001 éléments dans chacun de onze journaux par société, puis applique le rapprochement/période ; refuse au-delà de 5 000 | Limite de volume réelle et mémoire potentielle ; pagination/filtre SQL cohérent à concevoir, pas un export tronqué présenté comme complet. |
| Deux pollings de salle possibles | AppShell utilise `useFloorState(60_000)`, UnifiedFloorPlan `useFloorState(1500)` ; chaque hook crée son client | Chemins réseau distincts visibles ; coût exact et déduplication utile **à mesurer**, pas fuite mémoire démontrée. |
| Couplage route/domaines | POS/agent importent des fonctions de `routes/floorState.ts` ; `floor-workspace`, pricing, projections et finance collaborent étroitement | Dépendance source prouvée ; extraire progressivement une façade de domaine plutôt qu'un microservice sans besoin. Aucun cycle d'import général n'est affirmé. |
| Caches et états | Scope ERP, génération POS, brouillon persistant et mémoire assistant ont des contrats distincts | Protections présentes, pas assurance exhaustive. Nouveaux composants/clients hors scope à rechercher avec scénarios société/rôle/réponse tardive. |
| Fichiers métier | `safeWriteJson` fait maintenant un fsync de fichier et, hors Windows, de répertoire ; `readJsonStrict` refuse le repli silencieux pour les données critiques | Le vieux CLAUDE « aucun fsync » est dépassé. Coût synchrone réel à profiler ; résistance au renommage lors d'une coupure Windows non prouvée. |
| PDF dans transaction | Génération de PDF d'avoir attendue avant création finale dans la transaction de numérotation/verrou | Durée potentielle, pas contention mesurée. Toute préparation hors transaction exige un nouveau protocole numéro/snapshot/revalidation. |
| Héritage JSON / code dormant | Stocks/OCR globaux fermés ; workers scheduler/proactive/duplicate désactivés ; anciennes pages guest non montées par App | Ne pas appeler ces modules « actifs donc vulnérables » ni les effacer : cataloguer leurs appelants avant réactivation/remplacement. |

Sources ciblées : [workspace](../../apps/backend/src/lib/floor-workspace.ts), [plan](../../apps/backend/src/routes/floorState.ts), [versements](../../apps/backend/src/lib/bank-payouts.ts), [route versements](../../apps/backend/src/routes/bankPayouts.ts), [rapprochement](../../apps/backend/src/routes/financialReconciliation.ts), [hook](../../apps/web/src/hooks/useFloorState.ts), [flush](../../apps/backend/src/lib/safe-json.ts).

La [mesure existante du 17 octobre](PERFORMANCE-FIABILITE.md) utilise le même jeu de 737 produits, 275 tables, 645 couverts et 1 225 lignes : 1 341 → 503 requêtes observées, mais p95 HTTP+JSON **2 267,32 → 2 208,57 ms**, seulement dix essais et SQL cumulé non réduit. C'est un signal pour poursuivre le profilage, **pas** un gain robuste, un nouveau benchmark ou une limite de Node démontrée. Aucune fuite mémoire, consommation en watts ni supériorité d'un autre langage n'est établie par ces données.

## 9. Comparaison technologique et décision réversible

Sources primaires consultées le **17 octobre 2026**. Elles décrivent des capacités, pas un benchmark CréOrga ni des versions installées de Go/Rust/Python. Les coûts ci-dessous sont relatifs et qualitatifs ; compétences de l'équipe, budgets et effort chiffré restent à qualifier.

| Option | Capacité pertinente / gain à mesurer | Coût et risque de migration pour CréOrga | Compatibilité et réversibilité | Décision proposée |
| --- | --- | --- | --- | --- |
| Conserver TS/Node | I/O asynchrone existante ; worker threads possibles pour calcul JS lourd, pas un remède aux attentes SQL | Coût le plus faible pour corriger projections/contrats ; éviter blocage de boucle et gros JSON synchrones | Conserve React, Prisma, tests, REST et moteur monétaire ; changements internes réversibles par petits lots | **Option de référence.** Profiler et modulariser avant extraction. |
| Go ciblé | Goroutines/channels et runtime GC ; intérêt possible pour une passerelle ou un service autonome réellement chargé | Nouveau service, outillage, types, erreurs, driver PG, observabilité et duplication temporaire ; gain non mesuré | REST compatible côté POS, mais pas les imports TS ; préserver les migrations et ne jamais créer un second maître financier | Aucun prototype autorisé par ce seul audit ; réexaminer si un composant mesuré justifie l'extraction. |
| Rust ciblé | Ownership et contrôle mémoire ; intérêt possible pour un calcul/parseur borné CPU | Contrats FFI/IPC/WASM, gestion async et apprentissage ; traduire arrondis/hashes/erreurs est un risque métier | Un composant pur en lecture/calcul peut être shadow-testé ; sérialisation et diffusion Windows à mesurer | Pas de réécriture API/finance. N'envisager qu'un noyau isolé après profil comparatif. |
| Python ciblé | asyncio pour I/O ; pools de processus pour tâches parallèles ; candidat éventuel à traitement documentaire indépendant | Nouvel environnement, packaging, limites de ressources et échanges sérialisés ; aucune preuve que l'OCR actuel le nécessite | HTTP/file de travail possible, mais ne pas lui donner l'autorité d'encaissement ou de modifier les pièces originales | Conserver les contrats existants ; évaluer uniquement un besoin documentaire/IA qualifié. |

La documentation Node explique le risque des callbacks longs et des gros traitements JSON ; les workers conviennent surtout au CPU, pas aux I/O déjà asynchrones. [Boucle Node](https://nodejs.org/learn/asynchronous-work/dont-block-the-event-loop), [worker threads](https://nodejs.org/api/worker_threads.html).

Go distingue explicitement concurrence et accélération : davantage de CPU peut ne rien améliorer lorsque synchronisation/communications dominent. [FAQ officielle Go](https://go.dev/doc/faq#concurrency). Rust fournit les règles d'ownership et des mécanismes de concurrence sûre ; cela ne prouve pas l'intégrité d'un paiement ou une allocation financière correcte. [Ownership Rust](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html), [concurrence Rust](https://doc.rust-lang.org/book/ch16-00-concurrency.html).

Python expose asyncio pour les tâches I/O et ProcessPoolExecutor avec ses contraintes de sérialisation/import des tâches. Ces mécanismes impliquent des coûts et contrats à mesurer sur Windows. [asyncio](https://docs.python.org/3/library/asyncio.html), [concurrent.futures](https://docs.python.org/3/library/concurrent.futures.html).

Avant tout prototype partiel : fixer un goulot reproductible, comparer d'abord l'option TS optimisée, conserver les mêmes données/garanties et mesurer CPU/mémoire/latence/erreurs sur un échantillon suffisant. Exécuter le candidat sans écriture financière autoritaire, comparer résultats/arrondis/hashes, puis prévoir interruption et repli. Aucun seuil arbitraire de gain, date de migration, nouvelle base ou second maître n'est fixé ici. **Aucun prototype n'a été créé.**

## 10. Priorités proposées et dette documentaire

1. **Reprise et qualification du code final** : laisser le coordinateur confirmer le démarrage sûr, puis rejouer table native vide, congés, libellés et même commande QR de B ; pas de nouveau scénario déclaré réussi par cet audit.
2. **Contrat de rôles explicite** : décider ce qui distingue administrateur, responsable et employé limité ; implémentation future contrôlée serveur, sans réinterpréter les anciens rôles.
3. **Achever la recette financière B puis BAR DES AMIS** : nouvelles identités, tournées, nuit/minuit, remises et clôture ; pointer UI → HTTP → PG → invariants plutôt que compter les boutons.
4. **Corriger les lacunes prouvées, pas reconstruire les lots livrés** : idempotence congés inter-onglets/reload, contrats de correction de préparation et fonctionnalités de stock réellement manquantes ; conserver les refus prudents en attendant.
5. **Profilage avant optimisation/migration** : distinguer projection, sérialisation, miroir, SQL et verrou ; qualifier ensuite lecture groupée versements et rapport paginé sans retirer les protections.
6. **Frontières de code** : façade domaine salle/finance, DTO explicites et moteur monétaire pur partagé ; garder un déploiement simple. Impression ou traitement documentaire isolé seulement lorsqu'un besoin réel le justifie.

Documents à corriger ultérieurement, **non modifiés ici** :

- `CLAUDE.md` décrit encore quatre workspaces, aucun test frontend et aucun fsync : trois constats dépassés par les sources lues. Les consignes métier encore valables doivent être conservées.
- `ARCHITECTURE.md` et certaines sections « prochain lot » décrivent des fonctionnalités depuis ajoutées. Lire les mises à jour datées avant de refaire acomptes, avoirs, fusions ou rapprochement.
- Les rapports de campagne arrêtés à 14:05 ne décrivent pas la disparition ultérieure du PID ni le nouveau C. Préserver leur valeur historique, compléter avec des preuves datées, pas les réécrire en succès.
- Dépendances verrouillées, version binaire installée et services réellement actifs sont trois inventaires différents. Le présent rapport ne remplace pas leur contrôle de reprise.

Critères de sortie futurs : contrats FR reliés aux scénarios et preuves par rôle/société, non-régressions sur le code final, argent/stock/documents réconciliés, incidents et restauration rejoués, limites externes explicites. Aucun SLA, RPO/RTO, essai matériel ou qualification de production ne découle de cette lecture.

## Annexe — ancrages et preuves existantes

Empreintes SHA-256 recalculées en lecture seule vers **17:00 UTC**. Elles ne prouvent pas l'exécution ni la stabilité ultérieure de tout le working tree.

| Fichier | SHA-256 à la lecture |
| --- | --- |
| `package.json` | `150966f663a515079595fabcb4064d83a3f5e57f6524a8fdbe53b9266d64d2ef` |
| `package-lock.json` | `cc0cc64fe10b5a409143bbe1a3aea5c9bed7a964348c6683bb2f7334c6149e33` |
| `apps/backend/prisma/schema.prisma` | `0c5c8df7e324704ac38c2a3de3fc614316f50385ba4444b531bd06c01e75a4ae` |
| `apps/backend/src/index.ts` | `e544f18ce9b67ad77c8397a0187e77ebcf6010a4e1f916a787aefefaca0a9891` |
| `apps/backend/src/lib/floor-workspace.ts` | `5b58e8320af94a9254bc607984f244fac3643f1c98047738fed08d34ea9dfc1a` |
| `apps/backend/src/routes/pos.ts` | `f9ae562eda7634b00729350aaa8c93453e5ad71b4145117055109e2bf0d540b3` |
| `apps/web/src/lib/scopedQueryClient.ts` | `716ed9fbf31d15017746aae30c7d16742565a2ec7406b866524e5391cb02eac3` |
| `scripts/local/runtime.mjs` | `7cf7e81de25e4daa3aecbee902c40f75ea62ed402c235d0dc178a415763fd332` |

À relire avec [checkpoint](CHECKPOINT.md), [couverture par rôle datée](INTENSIVE-COUVERTURE-PAR-ROLE.md), [preuves de recette](RECETTE-ET-PREUVES.md), [reprise/rollback](MIGRATION-REPRISE-ROLLBACK.md), [performance existante](PERFORMANCE-FIABILITE.md) et [validation agrégée historique 14:05](preuves/intensive-validation-2026-10-17-1405.json).

Cette dernière rapporte **801 unités, 277 intégrations PostgreSQL et 41 tests locaux** (dont sept fixtures de drainage), cinq compilations et une restauration 81 tables/12 fichiers/24 PDF égaux. Ces chiffres gardent leurs dates et limites : ils ne sont pas des résultats nouveaux de l'audit architectural, ni une preuve que la campagne complète ou tous les rôles sont qualifiés. **Statut de ce volet : audit documentaire produit, campagne NON LIVRÉE.**
