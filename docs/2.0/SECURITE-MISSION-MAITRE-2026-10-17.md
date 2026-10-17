# Mission maître — sécurité, durabilité et exigences non fonctionnelles

Date : 17 octobre 2026. **Audit de code et consolidation de preuves, pas nouvelle recette exécutée. Campagne NON LIVRÉE ; aucune qualification de production.**

## Périmètre et vocabulaire de preuve

Cette revue couvre le code local de `creorga-2.0`, avec les corrections non publiées présentes lors de sa lecture. La référence de départ communiquée est `475f67ac1357e07af478f4f237a1f6bb001bb93a`, branche `codex/creorga-2-0-2026-10-08`. Aucun contrôle Git distant ou local n'a été exécuté par cette revue : ce SHA n'est pas une attestation du contenu actuel du worktree. Les repères de lignes ci-dessous concernent le code local évolutif, pas nécessairement le contenu déjà publié de ce commit.

Seul ce nouveau document est produit. Aucun code, autre document, compte, permission, donnée, profil Chrome, archive ou processus n'est modifié. Aucun test, build, clic, appel API, SQL, envoi ou paiement n'est exécuté par cet audit. Les comptes et capacités sont décrits sans publier de secret, URL privée, jeton ou identité de campagne.

La mission actuelle remplace le troisième établissement par **BAR DES AMIS**. La préparation BOULANGERIE & SNACK doit être préservée à part ; ses anciens scénarios ne deviennent pas des preuves de recette du bar.

Statuts utilisés :

- **PROUVÉ — code** : garde, traitement ou absence de garde directement constaté dans le chemin monté. Ce n'est ni une réussite de clic, ni une tentative d'exploitation effectuée.
- **PROUVÉ — historique** : résultat documenté dans un artefact antérieur identifié. Aucune nouvelle exécution n'est attribuée à ce document.
- **RISQUE À TESTER** : hypothèse ou garantie insuffisamment démontrée ; aucune promotion automatique en FAIL, PASS ou vulnérabilité exploitée.
- **ABSENT** : capacité spécifique non proposée par le modèle ou le chemin examiné. L'absence d'une capacité ne prouve pas un contournement.

Le skill `system-architect` a guidé la séparation exigences/capacités/preuves et la matrice NFR. Les objectifs génériques de ses références ne sont pas des performances de CréOrga. Les scripts de checklist/validation ne sont pas exécutés dans ce périmètre documentaire. Aucune affirmation nouvelle de conformité légale ou de support d'une version de prestataire n'est faite ; ces qualifications nécessitent leurs sources officielles et essais séparés.

## 1. Base de preuve existante — ne pas recompter

Source principale : [validation agrégée du 17 octobre, générée à 14:03:06 UTC](preuves/intensive-validation-2026-10-17-1405.json).

| Élément | Ce que l'artefact établit historiquement | Limite |
| --- | --- | --- |
| Unités | 348 backend + 336 web + 117 POS = **801**, exécutées vers 13:46 UTC ; zéro échec/ignoré | Pas 801 parcours UI ; les empreintes sont celles de ce passage, pas une garantie sur tout changement ultérieur |
| PostgreSQL | **277** intégrations, 13:53:56–13:54:46 UTC ; zéro échec/ignoré | Scénarios automatisés de laboratoire ; ni paiement réel ni tous les rôles/écrans |
| Tests locaux | **41** fixtures locales dont **7** nouvelles de drainage des serveurs statiques | Pas 41 parcours Chrome ; le redémarrage opérationnel du runtime n'était pas vérifié dans cet artefact |
| Compilations | Cinq applications métier compilées | Ne valide pas un bouton ni une écriture métier après redémarrage |
| Restauration | À 14:00:46 UTC : **81 tables, 12 fichiers, 24 PDF**, zéro différence ; copie AES-GCM vérifiée, clé séparée | API arrêtée et scheduling figé ; processus statique pas entièrement terminé. 4 083 ms sur cache chaud, pas un RTO |
| Navigateur | 713 tentatives, 700 retours d'outil, 466 clics retournés, 255 champs remplis | Ni 700 scénarios PASS ni 466 contrôles T100 uniques ; cinq heures actives non attestées |

Le [checkpoint](CHECKPOINT.md), le [rapport de campagne](RECETTE-INTENSIVE-2026-10-17.md) et la [couverture par rôle](INTENSIVE-COUVERTURE-PAR-ROLE.md) sont des sources datées : leurs anciennes sections ne doivent pas être projetées sur une observation postérieure. La matrice historique indiquée reste **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN**, T100 partiel ; cette revue ne la modifie pas.

Le pilote signale que l'ancien PID 21664 a disparu sans arrêt forcé de sa part. Cette information de reprise ne démontre pas à elle seule un arrêt coordonné ou l'intégrité des opérations précédemment admises. Aucun nouveau contrôle de processus n'est effectué ici.

## 2. Rôles réellement disponibles

### 2.1 Pas de rôle ADMIN distinct d'établissement

**PROUVÉ — code.** `UserCompany.role` est une `String` avec défaut `EMPLOYEE`, et non un enum comprenant ADMIN ; `User` ne porte pas le rôle d'établissement ([schéma](../../apps/backend/prisma/schema.prisma#L160)). Les validations des créations/modifications de membres n'acceptent que `MANAGER` et `EMPLOYEE` ([companies.ts](../../apps/backend/src/routes/companies.ts#L30)). `OWNER` est créé à l'inscription dans la transaction utilisateur/société/paramètres/adhésion ([auth.ts](../../apps/backend/src/routes/auth.ts#L95)).

| Persona demandée | Réalité actuelle | Conséquence pour la recette |
| --- | --- | --- |
| Propriétaire/patron | `OWNER` ; compte créé lors de l'inscription | Tester ses véritables commandes et les limites entre sociétés |
| Administrateur de l'établissement | **ABSENT comme rôle distinct** | Ne pas créer un compte nommé « admin » et prétendre obtenir une quatrième politique. Réutiliser une identité OWNER/MANAGER seulement en annonçant son rôle réel, ou déclarer le scénario spécifique absent |
| Responsable | `MANAGER` | Droits de gestion partiels, pas toutes les commandes OWNER |
| Serveur / caissier | Adhésion `EMPLOYEE` ; projetée en `WAITER` dans le bootstrap POS | Tester la politique EMPLOYEE réelle ; ce n'est pas une ACL indépendante |
| Employé limité / sans finances | **ABSENT comme politique distincte** ; ce sont actuellement d'autres identités EMPLOYEE | Les noms des comptes ne constituent aucune restriction supplémentaire |
| Client QR | Capacité de visite, pas compte interne | Ne pas imposer de compte client artificiel pour acheter |
| Fondateur / superadministration | `CreatorAccount`, secrets/type de jeton et routes séparés | Ce n'est pas l'ADMIN d'un restaurant ; ne pas lui substituer un compte société |

L'interface [Administration → Utilisateurs](../../apps/web/src/pages/admin/AdminUsers.tsx#L113) propose « Serveuse / employé » et « Responsable ». Elle ne promeut pas un salarié en OWNER ; l'API refuse également cette valeur. Les intitulés POS `WAITER`, `KITCHEN`, et les valeurs legacy admises par certaines routes ne prouvent pas que ces adhésions sont créables depuis l'UI. Le mapping réel EMPLOYEE → WAITER est dans [pos.ts](../../apps/backend/src/routes/pos.ts#L121). Le garde [creatorAuth](../../apps/backend/src/middleware/creatorAuth.ts#L16) exige un jeton de la console ; son modèle est séparé dans [CreatorAccount](../../apps/backend/prisma/schema.prisma#L1429).

### 2.2 Matrice de droits constatés côté serveur

Cette matrice décrit le code, pas de nouveaux essais HTTP. « Oui » suppose une adhésion active à la société courante. Elle ne constitue pas une politique idéale validée par le propriétaire.

| Action | OWNER | MANAGER | EMPLOYEE | Autorité observée |
| --- | --- | --- | --- | --- |
| Créer un membre, changer son rôle/activation | Oui | Non | Non | `companies.ts:91,143` ; auto-retrait/dernier propriétaire protégés |
| Lister tous les membres via Administration | Oui | Oui | Non | `companies.ts:57` |
| Modifier catalogue/prix produit | Oui | Oui | Non | `products.ts:12–14` |
| Créer/modifier/supprimer des ingrédients, modifier leur stock/coût | Oui | Oui | **Oui dans ce chemin** | `inventory.ts:40,71,105` ; montage `index.ts:293` sans restriction de rôle supplémentaire |
| Lire liste/détail/PDF ordinaires des factures | Oui | Oui | **Oui dans ce chemin** | `invoices.ts:18` laisse passer GET/HEAD ; `348,419,511` filtrent la société |
| Créer/émettre factures et avoirs | Oui | Oui | Non | Garde de toutes les mutations `invoices.ts:18–20` et contrôles métier |
| Lire rapports de caisse historiques | Oui | Non | Non | Montage `index.ts:304`, réservé OWNER |
| Lire rapprochement / versements | Oui | Oui | Non | `financialReconciliation.ts:7`, `bankPayouts.ts:12` |
| Lire/ouvrir/compter/clôturer la caisse v2 | Oui | Oui | Non | Routeur `cashLedger.ts:11` ; ne pas promettre cette capacité au caissier EMPLOYEE |
| Lire dépenses, statistiques, ventes/clôtures du bootstrap POS | Oui | Oui | **Oui dans ces chemins** | `accounting.ts:63`, `stats.ts:12–17`, `pos.ts:111–132` |
| Encaissement POS déclaré, acomptes/solde | Oui | Oui | Oui | `pos.ts:352,371` ; déclaration manuelle, pas validation bancaire |
| Remboursements déclarés ou prestataire | Oui | Oui | Non | `payments.ts:55–59` et domaine de remboursement |
| Lire planning/congés/pointages | Société | Société | Soi-même | `hr.ts:10–15,26,310,336` |
| Gérer planning, décider les congés | Oui | Oui | Non | `hr.ts:50,105,134,381` |
| Dossiers/documents RH | Gestion société | Gestion société | Propres documents seulement, pas notes/profil de gestion | `hr-access.ts`, `rh-dossier.ts:54,96,133,354` |
| Ouvrir/fermer une visite QR, afficher son lien | Oui | Oui | Oui | `guestVisits.ts:13–14`, vérifications de table/visite/solde |
| Télécharger une sauvegarde intégrale par UI société | Non disponible | Non disponible | Non disponible | Route entreprise fermée ; `backup.ts:18`, `index.ts:379` |

Une restriction de menu n'est pas équivalente à un refus API. En particulier, le scénario « employé sans finances » ne peut pas être déclaré validé par l'absence d'un bouton de rapport : d'autres routes retournent encore ces montants. Les limites du responsable vis-à-vis de l'OWNER sont réelles et doivent être testées, sans les confondre avec un rôle ADMIN absent.

## 3. Couverture NFR et garanties constatées

| NFR | État / décision observée | Preuve et qualification restante |
| --- | --- | --- |
| N01 — Identité et adhésion | **PROUVÉ — code** : JWT vérifié, adhésion active/société relue ; aucune adhésion inventée sur panne DB | `auth.ts`, `requireCompany.ts:32–124`. Une panne de base renvoie 503 ; `req.role=null` pour appareil, jamais OWNER implicite |
| N02 — Admission ERP sans société active | **PROUVÉ — code** : login, refresh et `/me` refusent l'absence d'adhésion ; Login garde le même contrat | `routes/auth.ts:26,201,296,395`, `Login.tsx`. Rejeux UI des comptes réactivés/révoqués à qualifier sur le build courant |
| N03 — Révocation de session | **PROUVÉ — code** : refresh supprimé à logout ; ancien JWT vérifié sans registre de révocation d'access token. **RISQUE À TESTER** pour les garanties attendues de révocation | `auth.ts:341`, `middleware/auth.ts:17–48`. Ne pas confondre arrêt local de session, suppression du refresh et invalidation immédiate de toute copie de JWT |
| N04 — Politique de moindre privilège | **ABSENT** : ACL différenciant caissier, employé limité et employé sans finance ; pas ADMIN ERP distinct | Matrice §2. Les gardes présentes OWNER/MANAGER restent à préserver, pas à désactiver pour satisfaire la recette |
| N05 — Isolation caches/mémoire UI | **PROUVÉ — code** : client Query neuf et composants remontés à chaque contexte ; intercepteurs rejettent les réponses d'un contexte retiré | `ScopedQueryProvider.tsx:8`, `scopedQueryClient.ts:27`, `authScope.ts`, `lib/api.ts`. Clics/back/refresh/cache HTTP restent des tests distincts ; annuler le cache n'annule pas une écriture déjà admise au serveur |
| N06 — QR / groupes | **PROUVÉ — code** : token aléatoire haché, société/table/expiration/fermeture vérifiées ; commandes idempotentes par référence | `guest-visits.ts:14`, `guest.ts:179–215`, `guestVisits.ts`. Les transferts/fusions doivent invalider les anciens accès sans effacer la créance ; recette des cas complexes non intégrale |
| N07 — Temps réel public | **PROUVÉ — code** : seuls canaux publics bornés `floor-*`/jeux actifs ; signal de plan réduit à société/révision | `live-channels.ts`, `index.ts:188–202`, `floorState.ts:291,348`. Ce n'est pas une authentification des abonnés ; vérifier qu'aucun futur payload financier/personnel n'utilise ces canaux |
| N08 — Documents RH | **PROUVÉ — code** : rôle/périmètre salarié, format décodé, chemin borné, écriture exclusive et fsync ; hash/tailles/symlinks contrôlés au téléchargement | `hr-access.ts`, `document-validation.ts`, `private-document-files.ts`, `rh-dossier.ts:280–390`. Les anciens fichiers sans hash restent explicitement `legacy-unverified`, pas validés par supposition |
| N09 — Liens PDF externes | **PROUVÉ — code** : original figé, HMAC, échéance, révocation sérialisée, émetteur encore habilité ; no-store/CSP et secret dans fragment puis corps POST | `invoice-document-links.ts:17,36,68,86`, `invoice-document-download.ts:8`. C'est une capacité au porteur ; un PDF déjà reçu n'est pas rappelé par révocation |
| N10 — Intégrité financière | **PROUVÉ — code**, **historique ciblé** : calcul du solde serveur, verrous société/commande, requestId/hash, unicités, réserves actives, sources de vente et stock gardées | `payments/ledger.ts:15–105`, schéma `PaymentAttempt`, `PaymentSettlement`, `SaleOrigin`, `pos.ts:371`. Aucune garantie de banque réelle ou de tous les conflits concurrents par simple présence de ces protections |
| N11 — Paiement/remboursement incertain | **PROUVÉ — code** : UNKNOWN/REVIEW restent réservés ; preuves montant/devise/marchand/capture requises ; distinction DECLARED/provider_verified | `payments/refunds.ts`, `manual-refunds.ts`, `payments.ts:129–176`. Retour navigateur, QR ou déclaration carte ne sont pas une capture vérifiée. Stripe Refunds n'a pas d'adaptateur complet et n'est pas activé |
| N12 — Exactitude du vocabulaire financier | **PROUVÉ — code local**, rejeu final restant : Journal/Rapports nomment les ventes avant avoirs et renvoient au rapprochement | `JournalPage.tsx:79–84,167`, `RapportsPage.tsx:95,129,313`. Ne pas calculer un net en retranchant arbitrairement des documents fiscaux à des flux de trésorerie |
| N13 — Sauvegardes non destructives | **PROUVÉ — code** : prune dump sans effet, rétention créateur gelée, ZIP/dump/partiels/extractions préservés | `runtime-profile.ts`, `jobs/pg-dump.ts:172`, `creator-retention.ts:27`, `backup-worker.ts`. Gel ne signifie pas stockage illimité ; surveiller l'espace sans purge d'urgence |
| N14 — Cohérence/restauration | **PROUVÉ — historique** pour copies à écrivains arrêtés ; **RISQUE À TESTER** pour copie automatique sous mutations | Artefact 14:03, §1 ; manifeste `backup-worker.ts:100–104` indique snapshot DB et scan fichiers séparés, pas point commun automatiquement garanti |
| N15 — Chiffrement / clés / sauvegardes | **PROUVÉ — historique** pour copie AES-GCM à clé séparée ; **ABSENT** pour chiffrement du ZIP/dump produit par le worker examiné | `backup-worker.ts:43–44,98–115` crée un ZIP ordinaire ; protections ACL Windows et chiffrement du support non mesurés ici. Ne pas publier ni fournir au client une archive globale |
| N16 — Arrêt / reprise locale | **PROUVÉ — code et historique de fixtures**, **RISQUE À TESTER** opérationnellement | `backend-lifecycle.ts`, `runtime.mjs`, `static-host.mjs:107`. Attente des requêtes/tâches/audit avant Prisma ; pas de kill. Les 41 fixtures ne remplacent pas le redémarrage et la lecture métier du runtime installé |
| N17 — Profil léger | **PROUVÉ — code** : alias jeux absent, scores non montés, anciens workers non essentiels désactivés, files métier maintenues | `runtime-profile.ts`, `entertainment.business.tsx`, `runtime.mjs:21–27`, `index.ts:341–343`. Code des jeux conservé ; absence de GPU ou de jeu chargé doit aussi être mesurée après lancement |
| N18 — Robi, données/outils | **PROUVÉ — code** : société via contexte serveur, mémoire société+utilisateur, allowlists bloquant les anciens mutateurs ; fonctionnalités avancées non migrées renvoient 503 | `agent.ts:38,503,672,1133`, `assistant.ts:488`, `assistant-advanced.ts:21`. Le texte de prompt n'est pas une permission. Chemin de délégation et réponses fiables encore à qualifier (§4) |
| N19 — Audit / confidentialité des erreurs | **PROUVÉ — code** : corps résumé, champs sensibles masqués, messages publics de production génériques | `audit-log.ts:63–89`, `errorHandler.ts:45`. JSON limité aux 1 000 dernières entrées et GET échantillonnés : pas un journal exhaustif immuable. Vérifier champs libres, logs applicatifs et événements métier indépendamment |
| N20 — Charge / disponibilité / sobriété | **RISQUE À TESTER** : aucune charge active multiétablissements prolongée ni SLA démontré | §5, mesures historiques courtes seulement. Pas de watts/kWh/coût énergétique déduits de CPU/RAM. RPO/RTO et limites de charge doivent être fixés et mesurés |
| N21 — Prestataires / matériel / dépendances | **ABSENT de cette qualification** : vraie banque, thermique/tiroir physique, réception Internet, audit dépendances fraîchement exécuté | Ne pas réutiliser un ancien nombre de vulnérabilités ou une version d'API comme preuve actuelle. Aucun test externe lancé ici |

## 4. Candidats prioritaires étayés et limites

### SEC-01 — P1 candidat : droits stock non différenciés

**PROUVÉ — code**, pas nouvelle exploitation : le montage `/api/inventory` exige une adhésion, mais `POST /ingredients`, `PUT /ingredients/:id` et `DELETE` n'exigent pas de rôle de gestion. Le PUT accepte notamment `currentStock` et `costPerUnit` ([inventory.ts:71](../../apps/backend/src/routes/inventory.ts#L71)). Un EMPLOYEE n'est donc pas techniquement limité à consulter ou vendre par cette route.

Le test prioritaire est une action UI réelle de salarié, puis refus API complémentaire selon la politique explicitement retenue ; comparer PostgreSQL et piste d'audit. Tant que cette politique n'existe pas, ne pas promettre une ACL fine « limité ». Ne pas corriger en masquant seulement le menu.

### SEC-02 — P1 candidat : confidentialité financière non uniforme

**PROUVÉ — code** : GET/HEAD factures/PDF ordinaires, dépenses, statistiques et bootstrap POS retournent des montants de société à EMPLOYEE ; les rapports de caisse OWNER et rapprochements OWNER/MANAGER ont une politique plus stricte. `agent.ts:1514–1563` ajoute un autre chemin : `/mobile-summary` lit factures en retard et plannings de l'ensemble de la société, sans restriction de rôle propre à cette route.

Ce n'est pas une fuite intersociétés établie : `requireCompany` cloisonne la société. C'est un écart concret avec une promesse « employé sans finances » ou « tous les plannings uniquement personnels ». À trancher en une politique cohérente par ressource ; tester tous les chemins, pas seulement l'écran Rapports. Les rôles fictifs limités restent ABSENTS en attendant.

### SEC-03 — P1 candidat : chemin de lecture Robi perdant l'identité

**PROUVÉ — code pour le chemin**, résultat d'exécution **RISQUE À TESTER** : après une intention non reconnue, [assistant.ts:1886](../../apps/backend/src/routes/assistant.ts#L1886) rappelle `/api/agent/smart-query` avec le token de service interne, sans transmettre le JWT et la société de l'appelant. `authenticate` pose alors `internal-service`, et `requireCompany` exige toujours son adhésion active. Il n'invente pas d'OWNER : l'appel interne peut être refusé et sa réponse n'est pas validée comme réponse métier par le déléguant.

Tester une vraie question de lecture via la même UI, les statuts des deux requêtes et le délai. La correction éventuelle doit propager une identité/contexte autorisé ou utiliser un service de lecture explicite, **pas** ouvrir `requireCompany` aux appels internes globaux. Ce constat ne démontre pas la cause de tout incident de navigateur ou de connexion inactive.

Les anciens `switch` comportant des écritures fictives ne sont pas à déclarer exploités : `safeIntents` et `SAFE_EXECUTE_COMMANDS` les rendent actuellement inaccessibles. Maintenir ce refus tant que les vrais services, permissions et confirmations ne sont pas raccordés.

### SEC-04 — P1 de qualification : cohérence des sauvegardes actives et confidentialité des copies

Le worker fait d'abord le dump PostgreSQL puis scanne fichiers/médias ; son propre manifeste reconnaît l'absence de point commun sans arrêt des écrivains. Ses validations de taille/hash et publication exclusive sont réelles, mais ne garantissent pas qu'une métadonnée SQL et son fichier proviennent du même instant. Exemple à tester sur copie : retrait d'un document entre le dump et le scan. Ne pas en déduire que la restauration historique à écrivains arrêtés était invalide.

Les dumps et ZIP automatiques restent des copies privées globales non chiffrées par ce worker ; la copie AES-GCM prouvée ne chiffre pas rétroactivement ces fichiers. Qualifier droits NTFS, support, clés, copie externe et restauration ; aucune inspection de secrets n'est nécessaire pour ces contrôles. Le gel de rétention ne doit pas être levé pour obtenir de l'espace.

### SEC-05 — P1 à décider/tester : sens de la révocation et opérations déjà admises

`POST /auth/logout` retire le refresh présenté ; `authenticate` vérifie la signature/expiration du JWT sans état serveur de révocation de l'access token. Une copie de JWT n'est donc pas invalidée immédiatement par ce seul logout si l'adhésion reste active. La désactivation d'une adhésion est différente : les routes derrière `requireCompany` la relisent et refusent les appels suivants.

Tester séparément logout confirmé, logout réseau incertain, membre désactivé, rôle abaissé, autre société encore active et vieille session POS. Définir l'instant d'admission d'une mutation déjà en attente de verrou : ne jamais annuler silencieusement un paiement effectivement capturé parce que l'UI a changé d'utilisateur. Certaines opérations relisent les droits sous verrou (`hr.ts:263`, `invoice-document-links.ts:18`), pas de garantie globale supposée pour tout domaine.

### SEC-06 — P1 métier à qualifier : stocks produits et ingrédients ne sont pas une source unique

**PROUVÉ — code** : le [débit après confirmation](../../apps/backend/src/lib/order-inventory.ts#L4) modifie `Product.stock` une fois grâce à `Order.inventoryDebitedAt`. Les achats/réceptions de `/inventory` modifient des `Ingredient.currentStock`, avec des recettes dans un autre modèle. Le débit examiné n'applique pas ces recettes aux ingrédients.

Ne pas fusionner ces chiffres dans un « stock réconcilié » sans recette réelle. Choisir un produit avec recette configurée, recevoir fictivement ses ingrédients, vendre et annuler/rembourser suivant les règles métier ; comparer les deux modèles. Un remboursement ne remet pas automatiquement une marchandise physiquement réintégrable en stock. Aucun débit inventé ici.

### SEC-07 — P2 connu : congés sans idempotence serveur

Les deux demandes produites au double clic restent les preuves historiques, non supprimées. Le correctif local [HrTimePage](../../apps/web/src/pages/hr/HrTimePage.tsx#L12) protège le submit immédiat, les réponses tardives et l'issue incertaine ; [hr.ts:354](../../apps/backend/src/routes/hr.ts#L354) crée néanmoins une nouvelle ligne pour chaque POST admis, sans référence idempotente.

Le verrou mémoire ne couvre pas le rechargement ou deux onglets. Ne pas convertir le blocage conservateur en renvoi automatique. Un futur chantier serveur devra vérifier identité/société, même référence/même contenu, rejeu, concurrence, révocation et reprise sans détruire les demandes historiques. Les tests React existants ne constituent pas le rejeu Chrome du build installé.

### SEC-08 — Autres risques à tester, sans faux diagnostic P0

- Le JSON d'audit est une fenêtre de 1 000 entrées, pas l'archive complète des événements ; le sink SQL, les journaux financiers et leurs reprises doivent être contrôlés séparément. Des notes ou messages libres peuvent contenir des données sensibles même si les clés usuelles sont masquées.
- L'access token est conservé par le store navigateur ; une validation XSS/CSP et la protection du profil Windows restent nécessaires. Aucun secret réel n'a été inspecté ou exposé par cette revue.
- Une permission client ne remplace pas le serveur ; un refus serveur ne doit pas réafficher d'anciennes données de cache. Les protections Query/API existantes ne prouvent pas tous les caches applicatifs, HTTP, images, service workers et historiques.
- Arrêt coordonné et panne brutale sont deux événements distincts. La nouvelle logique de drainage est présente et testée par fixtures historiques ; ne pas la promouvoir en protection contre coupure électrique ou en RTO mesuré.

**Aucune nouvelle exploitation P0 n'a été démontrée dans cette revue de lecture. Cela n'établit pas l'absence de P0.** Toute fuite intersociétés, double capture, vente perdue, restauration divergente ou suppression d'archive découverte par les tests reste immédiatement bloquante.

## 5. Ressources et performance — uniquement données historiques

[Mesures du 17 octobre à 08:35 UTC](preuves/performance-fiabilite-2026-10-17.json) : jeu de 737 produits, 275 tables, 645 couverts et 1 225 lignes, empreinte de jeu enregistrée.

- Sauvegarde HTTP de salle : dix observations après échauffement ; p95 de série **2 267,32 → 2 208,57 ms**. Nombre de requêtes SQL cumulé de la série **1 341 → 503**, pas un nombre de requêtes garanti par action utilisateur. Ces séries courtes ne constituent pas un test de charge multi-clients.
- Ressources des processus suivis : 11 échantillons par relevé ; somme working sets **1 956,38 → 1 719,52 MiB**. Pages partagées non dédupliquées ; CPU/GPU mesurés à zéro peuvent être sous la résolution. Autres logiciels laissés actifs.
- Démarrage **2 190 → 2 142 ms** : l'artefact déclare lui-même les séries non causalement comparables. **Aucun gain causal de démarrage revendiqué.**
- Aucun wattmètre ni conversion en watts, énergie ou euros ; aucun relevé nouveau dans cet audit.

Le profil métier conserve les sauvegardes, la reprise des webhooks et les e-mails transactionnels ; ce sont des tâches nécessaires, pas des « processus inutiles » à supprimer par principe. Les copies conservées, bases restaurées et fichiers partiels croissent : prévoir surveillance et alerte disque, puis décision humaine, jamais une purge automatique de secours. Les liens `.partial`/`.zip` d'un même inode ne doivent pas être comptés comme deux copies physiques par simple addition de tailles logiques.

N'optimiser qu'après mesures appariées sur un code/jeu/conditions identifiés ; conserver fsync, transactions, unicités, réserves et verrous. Ne pas choisir Rust/Go, Redis, réplication ou microservices pour un gain supposé alors que la campagne métier et les goulets observés restent à qualifier.

## 6. Tests prioritaires à confier à la campagne — tous non exécutés ici

| ID | Contrôle et preuve attendue | Priorité / limite |
| --- | --- | --- |
| NFR-T01 | Trois sociétés fictives A/B/Bar, contextes officiels distincts ; UI interdite, requête refusée, lecture SQL prouvant zéro écriture intersociétés | P0 ; pas de données/profils historiques |
| NFR-T02 | OWNER/MANAGER/EMPLOYEE réels : prix, stock, finances, membres et RH en autorisé/interdit, puis URLs directes et requêtes API complémentaires | P1 ; ADMIN et ACL fines marqués ABSENT, pas simulés |
| NFR-T03 | Désactivation/abaissement en session ; ancien JWT/POS, logout confirmé et incertain, changement A→B→A ; refus serveur et absence d'ancien contenu | P1 ; distinguer copie JWT et refresh, ne pas contourner l'autorité |
| NFR-T04 | Réponse lente pendant changement de société/user/session ; formulaire neuf et ancien callback sans effet/toast ; reload/back avec erreurs 403/500 | P0 si fuite ; UI réelle, pas test React seul |
| NFR-T05 | Ancien QR après fermeture, transfert, fusion/séparation et nouveau groupe ; aucun accès à une autre addition, créances/réserves préservées | P0 ; ne publier aucune capacité |
| NFR-T06 | Même paiement fictif au double clic/deux appareils, réponse perdue puis même référence ; total/TVA/tenders/stock/audit inchangés au rejeu | P0 ; prestataire simulé explicitement, pas transaction bancaire |
| NFR-T07 | UNKNOWN/REVIEW/refus de remboursement, réservations conservées ; mauvaise devise/marchand/montant ; signature falsifiée refusée | P0 ; jamais vrai remboursement, Stripe Refunds reste désactivé |
| NFR-T08 | Documents RH fictifs : propre/autre employé/autre société, altération, taille, contenu trompeur ; téléchargement identique et refus sans fuite | P0 ; aucune pièce personnelle réelle consultée |
| NFR-T09 | Lien original PDF : émission, expiration/révocation/concurrence, émetteur révoqué, hash restauré ; aucune session/permission acquise par le lien | P0 ; un téléchargement déjà effectué n'est pas rappelable |
| NFR-T10 | Sauvegarde après arrêt officiel, restauration nouvelle base et nouveaux fichiers ; comparer tables/totaux/PDF/hashes ; copies existantes intactes | P0 ; résultat distinct d'un essai concurrent de sauvegarde en activité |
| NFR-T11 | Copie jetable avec fichier modifié/retiré entre snapshot DB et scan ; manifeste et détection d'incomplétude, sans toucher aux originaux | P1 ; ne pas déclarer cohérence automatique par simple ZIP valide |
| NFR-T12 | Reprise du runtime par lanceur officiel, petite mutation UI fictive et lecture PG, arrêt avec requête admise/préconnexion inactive, relance | P1 ; aucun arrêt forcé sans autorisation précise ; 41 fixtures ≠ cet essai |
| NFR-T13 | Question Robi de lecture OWNER puis EMPLOYEE, mémoire entre sociétés, tentative d'action sensible refusée ; identité propagée sans rôle inventé | P1 ; pas d'autorisation par texte de prompt ni assouplissement du token interne |
| NFR-T14 | Commande avec recette, réception partielle, vente, retour/perte ; réconcilier Product/Ingredient et mouvements attendus | P1 ; tenir compte des fonctions absentes plutôt que simuler un débit |
| NFR-T15 | Rejouer double clic congé sur build corrigé, HTTP incertain, reload/multi-onglet ; garder les deux anciennes demandes | P2 ; idempotence serveur encore absente |
| NFR-T16 | Charge progressive, minuit/nuit pour le bar, mêmes jeux/version/échantillons ; latences p50/p95/p99 seulement si volume suffisant, RAM/CPU/disque | P1/P2 ; aucun objectif chiffré présenté comme acquis, aucun arrêt de logiciels tiers |

Chaque test doit relier **action UI → requête → rôle/société → écriture attendue → lecture PostgreSQL/fichier → attendu/observé → preuve horodatée → statut**. Les tests API/SQL complètent les clics, pas l'inverse. Un problème d'origine computer-use reste BLOCKED sans contournement. Les tests matériels, réception Internet et prestataires réels demeurent séparés et bloqués sans accès/équipement autorisé.

## 7. Décision et prochaine action

La base dispose de protections significatives ; la sécurité professionnelle complète n'est pas démontrée. Priorité à une politique de droits cohérente et à sa recette, au rejeu des corrections locales, aux garanties de reprise et aux parcours financiers/stock. Aucun besoin de réécriture générale n'est établi par cette revue.

Prochaine action du pilote : vérifier le runtime officiellement relancé, reprendre les données fictives existantes du restaurant sans reset et terminer ses parcours ; créer ensuite **BAR DES AMIS** avec ses propres identités et jeux de données. Rejouer les limites par rôle réel, réconcilier argent/stock/documents et restaurer une nouvelle copie de fin de campagne. Les préparations boulangerie, archives, demandes et pointages historiques de preuve restent conservés.

Ce rapport NFR est un livrable documentaire, **pas la livraison de la campagne**. Aucun nouveau PASS, nouvelle durée active, nouvelle mesure, certification ou état « prêt pour la production » n'est revendiqué.

## 8. Complément du pilote — 17 octobre, 21:15 Luxembourg

Les paragraphes précédents décrivent la revue de lecture à son heure ; ils ne remplacent pas les essais exécutés ensuite.

- **Renouvellement de session réellement observé** : dans Chrome POS, requête 294 de la page 9, `POST /api/auth/refresh` à l'origine locale attendue, HTTP 200 ; présence du cookie de renouvellement et attributs Secure/HttpOnly/SameSite=Lax vérifiés sans publication de leur valeur. La page factures du restaurant a aussi repris une opération après 401 → refresh 200 → nouvelle tentative 201. La preuve publique bornée est [le relevé HTTP ciblé](preuves/intensive-http-cibles-2026-10-17-2108.json). Cela ne valide pas tous les cas de révocation/concurrence ou tous les navigateurs.
- **Dépendances npm de production** : `npm audit --omit=dev --json --ignore-scripts` a terminé avec code 0 et zéro avis connu dans [le relevé de 20:04](preuves/audit-dependances-2026-10-17-2004.json). Ce résultat concerne la base d'avis et le graphe de dépendances à cet instant, pas la sécurité du système d'exploitation ou du runtime.
- **Runtime à qualifier avant pilote** : le processus de compilation utilise Node **22.19.0**. Il précède des correctifs de sécurité publiés, notamment [22.22.0 du 13 janvier](https://nodejs.org/en/blog/release/v22.22.0) et [les versions de sécurité du 29 juillet, dont 22.23.2](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases). La version [22.23.3 du 23 septembre](https://nodejs.org/en/blog/release/v22.23.3) est publiée au jour de cette vérification. Il reste à qualifier une version corrigée dans un environnement isolé, avec les mêmes tests ; aucune mise à niveau globale Windows ni exploitabilité particulière de CréOrga n'est affirmée ici. L'[annonce d'octobre](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), actualisée le 14 octobre, prévoit une publication le **21 octobre 2026** : elle est encore future au 17 octobre, pas un correctif déjà installé.
- **Fermeture QR** : un ancien accès renouvelé restait utilisable après paiement final et a permis une nouvelle commande fictive de 6,50 €. Le correctif transactionnel conserve les visites, ferme celles de la session soldée et révoque leurs seuls accès encore actifs. Les intégrations ciblées et la suite PostgreSQL passent ; le rejeu graphique sur le nouveau build reste à terminer à cette heure. Ce défaut n'est donc pas encore marqué corrigé de bout en bout dans Chrome.
- **Reprise** : arrêts normaux vérifiés, dont celui du PID laboratoire 43260 à 20:59 Luxembourg, sans terminaison forcée. La restauration de 21:00 compare 81 tables, 14 fichiers et 26 PDF, sans différence, avec copie chiffrée vérifiée ; [preuve indépendante](preuves/sauvegardes-mission-maitre-avant-rejeu-2100-verifications-2026-10-17-v1.json). Elle précède les futurs rejoués et n'est pas une preuve de sauvegarde atomique sous écritures concurrentes.

Les rôles fins « limité »/« sans finances » et ADMIN d'établissement demeurent absents. Le défaut fonctionnel Robi de contexte métier reste bloquant malgré les budgets de temps et l'annulation corrigés. Aucun paiement bancaire, réception Zoho, essai physique d'imprimante ou qualification de production n'est ajouté par ce complément.

## 9. Après rejoués — preuves finales du 17 octobre

La [validation finale](preuves/intensive-validation-finale-2026-10-17-2135-v3.json)
et les [requêtes des rejoués](preuves/intensive-http-rejeux-2026-10-17-2130.json)
complètent, sans remplacer, les observations précédentes :

- **QR** : Jardins checkout 200, ancien bill 403 et nouvelle tentative d'ordre
  403 ; une seule vente de 650 cents et débit de stock unique. Bar acompte 500
  puis solde mixte 820 déclarés : visite ouverte à 820 dus, puis fermée et accès
  révoqué au solde ; nouveau groupe à zéro, ancien QR toujours 403. Ces cas sont
  GREEN ciblés. Ils ne prouvent pas tous les transferts, courses multi-processus
  ou cas d'un autre groupe avec addition positive.
- **Droits** : la cinquième identité Bar, réellement EMPLOYEE, est refusée sur
  `/accounting/caisse` avec messages UI et GET 230/235 HTTP 403, mais voit
  **38,04 € de CA** dans le dashboard POS. L'absence de permission fine est donc
  visible, pas neutralisée par un nom « SansFinance ». La politique reste à décider
  et à tester sur tous les chemins ; aucune fuite intersociétés déduite de ce cas.
- **Clôture** : Jardins retourne 422 sans motif d'écart, puis 200 avec motif ;
  B/C clos avec instantanés et montants attendus/comptés/écarts conservés en PG.
  Pas de comptage physique ou transaction bancaire. CSV cliqués, octets non vérifiés.
- **Reprise** : copie finale indépendante contrôlée par empreintes, 81 tables,
  10 083 lignes, 14 fichiers et 26 PDF égaux après arrêt normal du seul runtime.
  [Contre-vérification](preuves/sauvegardes-mission-maitre-final-2132-v1.json).
  Les archives et anciens pointages ambigus ne sont pas purgés.

La campagne reste **NON LIVRÉE** : cinq heures actives/T100/tous rôles non attestés,
Robi métier bloqué, droits fins absents et Node à qualifier en version corrigée.
La publication éventuelle du correctif ne change pas ce verdict.
