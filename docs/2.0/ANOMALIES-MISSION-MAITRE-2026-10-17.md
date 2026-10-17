# CréOrga 2.0 — anomalies et preuves de la mission maître

## Consolidation technique après la coupure UI de 21:30

**PARTIEL — NON LIVRÉ.** La [preuve finale v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json), SHA `0a7b52ba69f28bb77d9b38bbfe0704a291d61641c5206c4aab7424dc1056674b`, confirme **861 unitaires, 295 PG, 47 fixtures locales**, deux builds finaux business/full **5 applications chacun**. Les échecs antérieurs et RED ne sont pas effacés. La correction d'extraction de clé des pointages ne constitue pas une nouvelle exécution ni une modification des deux lignes historiques.

Restauration réalisée à **21:31:36.908 Luxembourg**, **81 tables / 10 083 lignes / 14 fichiers / 26 PDF**, zéro différence et empreintes égales. **X02 passe à PASS ciblé** après lecture du résultat ; le registre cumulatif devient **32 critères : 25 PASS / 2 FAIL historiques / 5 BLOCKED**, sans promotion de T100. Les deux FAIL historiques ont leurs GREEN ciblés, pas leur suppression. Les refus **serveur** de clôture sans motif (**295/422**) et après justification (**299/200**) restent correctement distingués.

Limites encore ouvertes : **CSV non inspectés, PNG INSTRUMENTATION_NOT_VERIFIED, ACL fine “sans finances” absente malgré caisse 403, Robi métier 503/non rejoué**, matériel/prestataires réels et autres scénarios non qualifiés. Les compteurs publics (1 119 tentatives / 1 096 retours / 23 erreurs, 731 clics d'outil, 368 champs) ne sont pas une couverture unique ou cinq heures actives. Aucun rôle intégralement qualifié ; aucune livraison ou certification de production.

## Complément de progression — 17 octobre 2026, 21:30 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Les RED précédents sont intacts ; le [registre complété](TRACABILITE-UI-API-PG-2026-10-17.md) donne les nouveaux rejoués et leurs preuves. **32 critères distincts, 24 PASS ciblés / 2 FAIL historiques / 6 BLOCKED** : les deux FAIL sont les reproductions anciennes, désormais accompagnées de GREEN ciblés, pas effacées ou comptées comme nouveaux défauts actifs.

| Sujet | Nouveau constat | Limite |
| --- | --- | --- |
| MM-06 / B08, fin de visite QR | Après solde réel UI des 6,50 conservés : ancien bill **403**, nouvelle tentative **POST orders 403**, PG 4 ventes/5 commandes, aucune nouvelle commande parasite. Bar : acompte 5 conserve l'accès à 8,20 ; solde mixte révoque, groupe neuf à zéro, ancien toujours 403. | **GREEN Chrome ciblé attesté**, pas toute la sécurité intergroupes ou tous les moyens de paiement. B07 RED conservé. |
| MM-07 / C04, date de fin de nuit | Republication UI **405/200**, capture **3 478 octets**, fin **03:00 (18/10/2026)** ; tous checks MIME vrais, SHA EML `d58aab9d52d30a8afcc63a1bc2243ad295268485fe4e268d1633e6f3ca1195ef`. | **GREEN ciblé**, ancien EML/C03 RED conservé ; pas Zoho et zone horaire non imprimée. |
| MM-05, suggestions ludiques | Huit suggestions métier sans jeux vues réellement dans Chrome, page 13. | **GREEN de ce rendu** ; pas tous les écrans. Robi métier n'a pas de nouvelle réponse qualifiée, toujours 503/non rejoué. |
| Droits financiers fins | EMPLOYEE dit « sans finances » voit **38,04 EUR** au dashboard POS, mais caisse refusée par UI et **GET 230/403 / 235/403**. | ACL fine **ABSENTE** ; pas de nouveau rôle ADMIN, pas de qualification “aucune finance”. |
| Clôtures et CSV | Restaurant **276,10 attendu / 276,05 compté / −0,05 motivé** ; Bar **119,00 / 118,90 / −0,10 motivé**, deux clôtures durables UI/HTTP/PG. | CSV cliqués mais **fichiers non inspectés**, X03 BLOCKED. Pas comptage physique. |
| Instrumentation | Note 1795 **INSTRUMENTATION_NOT_VERIFIED**, capture non trouvée et première journalisation refusée par filtre lexical. | **Aucun PNG réussi attesté**, X04 BLOCKED ; pas contournement et pas fausse preuve d'image. |

Données restaurant : **84,50 TTC / 81,42 HT / 3,08 TVA**, cash 82,20 + carte déclarée 2,30, avoir/remboursement 6,10 inchangés. Bar : **38,04 / 34,17 / 3,87**, cash 19 + carte déclarée 19,04, stock 96/79/58/19. Café inchangé ; ses deux pointages ouverts sont des **preuves historiques préservées**, pas de nouvelles écritures ni un nettoyage.

Les builds finaux business et full sont **réellement réussis, cinq applications chacun**, **90,289 s / 79,006 s**, après les anciens échecs TS7006 conservés. **295/295 PG après annotations et 47/47 fixtures locales** relus. Le total **861 unitaires** reste le dernier confirmé, sa relance finale en cours au signalement n'est pas anticipée. Les durées ne sont pas du temps actif UI. **Restauration finale encore à fournir : X02 BLOCKED** ; la copie de 21:00 précède ces rejoués. T100 et rôles partiels, cinq heures actives non attestées, pas de banque réelle, déploiement ou qualification de production.

## Point de progression — 17 octobre 2026, 21:00 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Coupure des actions **19:00:00 UTC** ; preuves réseau rétrospectives de 21:04–21:08 identifiées à part, sans ajout de clics ou d'écritures à la période. Le [nouveau registre UI → HTTP → PG](TRACABILITE-UI-API-PG-2026-10-17.md) conserve les critères ciblés, leurs limites et les traces ; son bilan **14 PASS / 2 FAIL / 6 BLOCKED** n'est pas une mise à jour automatique de T100.

| Référence | État constaté à cette coupure | Correction / validation / suite |
| --- | --- | --- |
| **MM-06 — P1 proposé — ancien QR encore écrivain après paiement complet** | Après l'addition soldée, le client QR restaurant renvoie **6,50 EUR**, nouvelle commande OPEN persistée, paid 0 ; preuve RED `restaurant-qr-ancien-commande-apres-paiement-red-1.json`. Pas une nouvelle vente déjà encaissée. | Fermeture/révocation atomique dans [checkout-guest-visits.ts](../../apps/backend/src/lib/checkout-guest-visits.ts) ; **17 tests PG de clôture** réussis, dont courses, rejeux, réservations incertaines et rollback. **GREEN Chrome BLOCKED** tant que build et binaire corrigé non rejoués. Ne pas effacer les 6,50 de preuve. |
| **MM-07 — P2 proposé — message de nuit sans date de fin explicite** | Planning bar confirmé **17/10 23:00 → 18/10 03:00** ; publication HTTP 200 et capture locale réelle. Référence MIME corrigée : tous champs contrôlés concordent sauf `OVERNIGHT_END_DATE_NOT_EXPLICIT`. | Rendu [email.ts](../../apps/backend/src/lib/email.ts) corrigé/testé dans le lot source ; ancien EML RED conservé. **Nouvelle publication UI/MIME BLOCKED** à la coupure. Pas réception Internet déduite du 200. |
| **MM-03 — renouvellement naturel ciblé désormais observé** | Page 9 **POST auth/refresh 294/200**, après expiration, Cookie présent et même site constatés ; protections Secure/HttpOnly/Lax conservées. Logout ultérieur d'inactivité distinct. | **PASS ciblé** du registre C11 ; pas audit complet de cookies, rôles, MFA ou tous les changements de société. Les anciennes erreurs de l'origine incohérente restent historiques. |
| **MM-04 — Robi métier** | **503** réel et message honnête sans réponse métier fabriquée. | Toujours **BLOCKED** pour réponse métier autorisée ; tests de budget ≠ disponibilité du contexte/modèle. |
| **MM-05 — suggestions ludiques en métier** | Défaut UI historique conservé ; **2 tests de profil AssistantPanel réussis** dans la suite web relue. | Correction source sous test, pas nouveau rejeu Chrome final. Ne pas présenter cette preuve comme un moteur de jeu exécuté ni une correction livrée. |

Les premières analyses MIME reposaient sur des références de destinataire erronées : elles sont conservées mais **ne sont pas un constat de fuite intersociétés**. Les deux `*-mime-v2-confirmed-reference-1.json` et leurs EML/références sont contrôlés ; restaurant sans écart de contenu résiduel sur les champs examinés, bar seulement la date de fin. En-têtes, adresses et contenu libre restent privés.

Finance restaurant : facture liée de **31,50**, avoir **6,10 / HT 5,92 / TVA 0,18**, remboursement CASH déclaré **6,10** en un enregistrement/mouvement ; ventes originales toujours **78,00**. Caisse théorique **269,60 EUR**, non comptée/non clôturée. Ces parcours ont une chaîne UI/HTTP/PG ciblée, pas une certification fiscale, bancaire ou de sécurité. PDF original API/PG concordant ; comparaison fichier Chrome et sortie thermique physique restent bloquées.

Les suites relues sont **861 unitaires (391 + 349 + 121) et 295 PG** réussies. Les exécutions initiales **287/391 backend** et **119/121 POS** restent enregistrées, avec EACCES/EPERM et onze autres messages backend non généralisés. Pendant les lectures après coupure, le coordinateur rapporte **deux builds FAILED**, TS7006 sur quatre callbacks de tests QR ; annotations et rebuild/validations en cours. **Aucune compilation complète ni GREEN Chrome futur n'est anticipé.** Revue indépendante des frontières d'accès encore en cours.

À **21:00:00**, la nouvelle restauration est en cours ; l'ancienne copie 19:57 ne qualifie pas les nouvelles ventes/documents/RH/QR. Aucun rôle complet, T100 complet ou cinq heures actives attestées ; aucune clôture de campagne, livraison ou production.

## Complément de progression — 20:33:54 Europe/Luxembourg

**17 octobre 2026, 18:33:54 UTC — toujours NON LIVRÉ.** Le point de 20:29:27 reste plus bas, sans réécriture des états ouverts qu'il décrivait.

- **Restaurant :** le règlement fusionné est effectivement validé après cette ancienne coupure. Le relevé privé `restaurant-fusion-pos-qr-encaissee-1.json` à **18:30:26.747 UTC** donne **3 ventes, 4 commandes PAID, 78,00 TTC / 75,11 HT / 2,89 TVA**, reçus 78,00, dû 0 ; la nouvelle vente de 31,50 regroupe le QR 25,40 et la native 6,10. Stocks **27 / 23 / 18 / 39 / 59 / 25**. Espèces déclarées **75,70**, carte déclarée **2,30**, caisse PG théorique **275,70 EUR**, non comptée/non clôturée. L'UI a reçu fictivement **40 EUR**, rendu **8,50 EUR**, puis terminé le parcours sans imprimante. Les [preuves détaillées](RECETTE-RESTAURANT-2026-10-17.md) séparent bien **3 Sale de 4 Order**, sans double chiffre d'affaires.
- **QR après paiement :** le contexte renouvelé rechargé affiche **0,00 EUR**, mais le menu reste accessible. **Révocation/expiration post-paiement non qualifiée**, à analyser avant verdict ; ni succès de sécurité ni fuite affirmée à partir de ce seul affichage.
- **Robi MM-04 :** limite visible relue, réseau **req. 262 / page 7 / POST agent/super-ask / 503**, journal position **1527**, fin **18:31:15.373 UTC**, hash `7b555360ef1564ebb0d7ae2b0470924de295d97e1531060b392ce64b9230dd48`. **Métier BLOCKED**, sans réponse chiffrée fabriquée ni action financière.

Fichier restaurant : SHA-256 **octets** `050c3fcf15f937e913318e1050e4a541828d5e9a2b35a3d81314234edf784d48`, empreinte **canonique compacte** distincte `7285d32fe34b5643ccc065936201f291ee125e0df0280b94729b047cc26094b6`. La restauration 19:57:26 n'inclut pas ces écritures de 20:30 ; sa réussite passée ne qualifie pas leur restauration. Les tests/builds précédents gardent leur date et leur périmètre. **Point d'avancement seulement ; T100 et rôles toujours partiels, cinq heures actives non démontrées.**

## Point de reprise — 17 octobre 2026, 20:29:27 Europe/Luxembourg

**INTERMÉDIAIRE — NON LIVRÉ.** Coupure nouvelle : **18:29:27 UTC**. Le registre arrêté à 19:57 reste plus bas, avec ses preuves et ses limites exactes ; les informations suivantes en prolongent l'état sans réétiqueter les anciens essais. Aucune exécution n'est effectuée pour la rédaction.

| Sujet | Nouveau constat daté / preuve | État et limite à cette coupure |
| --- | --- | --- |
| Compilations / runtime | Le coordinateur confirme les deux profils compilés, **5 applications chacun**, puis démarrage normal du profil métier, PID 43260 vers **20:06 Luxembourg**. Les pages du bar et la caisse restaurant sont réellement rouvertes. | Plus « build en cours » à ce nouveau point ; cela ne qualifie pas tous les parcours. Aucun processus inspecté ou démarré pour cette synthèse. |
| Validation locale | `validation-local-1792260327936-pzpr8V/result.json`, **18:05:27.937 → 18:05:29.754 UTC**, exit 0, `CONFIRMED_FRESH_LOCAL_FIXTURES`, **47 réussis / 0 échec / 0 ignoré**. | Fixtures d'artefacts, rétention/reprise, origine, runtime, hôte statique ; pas 47 parcours Chrome et pas une suite financière PostgreSQL relancée. |
| Suites globales | **838 unitaires + 278 PG**, toujours les exécutions de **17:47–17:48 UTC** conservées dans le registre. | Exécutées **avant le dernier changement de politique d'origine** ; ne pas les rebaptiser validation de tout le dernier code. Les 47 ne sont pas ajoutés comme nouveaux contrôles T100. |
| MM-02 / couverts | Bar, page 8 : moins à 18:09:10, clavier/plus puis moins, ouverture à **1 couvert** à 18:10:13 ; un couvert persiste dans le collecteur. | **Rejeu Chrome ciblé réalisé**, après correction. Pas qualification des variantes tablette/tactile ni réparation des anciens deux couverts du restaurant. |
| MM-03 / origine et session | Login et navigations sur le nouveau profil réussis. Page 8 : **logout 200 après inactivité**, cohérent avec [le reverrouillage de dix minutes](../../apps/pos/src/App.tsx). | Ce logout n'est pas un nouvel échec refresh. **Refresh 200/cookie naturel non encore prouvé** ; MM-03 reste partiellement qualifié. Les protections de cookies/origine ne sont pas relâchées. |
| MM-04 / Robi | Requête réelle propriétaire bar, page 7, 18:28:54 : message d'indisponibilité du contexte autorisé et absence de réponse métier vérifiée ; pas de réponse chiffrée fabriquée. | L'erreur est visible et bornée ; **réponse métier non qualifiée**. Les tests de budget ne prouvent pas le fonctionnement du contexte/modèle autorisé. |
| MM-05 / P2 / suggestions ludiques | Les suggestions ludiques de Robi sont reproduites dans l'interface du profil métier. Correction en cours dans un périmètre isolé selon le coordinateur ; composant [AssistantPanel](../../apps/web/src/components/AssistantPanel.tsx). | **OUVERT / correction non qualifiée à la coupure**. Ne pas annoncer un nouveau binaire corrigé ni en déduire un moteur de jeu chargé. Aucun test/source futur de cette correction n'est anticipé. |
| Droits bar | Employé distinct connecté, Comptabilité ouverte puis refus visible ; lecture de caisse **HTTP 403**, journal position 1463/page 10. | Refus ciblé UI/serveur confirmé. Aucun nouveau rôle ADMIN ou ACL fine « limité / sans finances » ; décision utilisateur encore manquante. |
| Remise / offert | Brut 31,60 − remise de 10 % du brut 3,16 − offert 3,60 = **24,84 EUR**. La justification est réellement exigée au paiement, pas déduite de la note de service. | Contrat de saisie observé ; **provenance agrégée des gestes et ventilation fiscale au prorata non qualifiées par un comptable**. Ne pas reconstruire une affectation historique par article depuis le catalogue. |
| Double clic paiement bar | Motif vide refusé visiblement, puis justification et **double clic** mixte : **un POST checkout 200**, req. 237/page 9 ; 1 Sale/1 Order, 2 tenders et 5 origines dans le collecteur. | Cas de laboratoire rapproché, **pas une transaction bancaire**. Le succès ne prouve pas tous les rejeux/conflits ou une durée d'indisponibilité tolérée. |
| Reprise restaurant | Addition **31,50 EUR** rouverte après redémarrage ; groupes **6,10 / 0,00 / 25,40** visibles, modale de paiement ouverte à 18:29:10. | Aucun règlement de cette addition retenu à la coupure ; les événements suivants devront former un complément daté distinct. |

### Preuves complémentaires relues

- **Bar**, `bar-encaissement-mixte-doubleclic-1.json`, **18:26:06.736 UTC** : **24,84 TTC = 22,46 HT + 2,38 TVA**, CASH 10,00 + CARD 14,84, chacun `manual_declaration`, solde 0 ; stocks **98 / 79 / 59 / 19**, caisse ouverte **110,00 EUR**. Un justificatif numérique est ouvert, sans sortie papier. Les **4 origines LINE + 1 ORDER** sont les provenances de **la même vente**, pas cinq ventes. SHA des octets du fichier : `26be7ae01f7c68d7d7b4ba145d601062cde91e3ac40a2d5c1264a4b207443f83`. Empreinte canonique compacte distincte, confirmée par le coordinateur : `ea855e0e6c6d0b44f3e37101e3426304d7d0ae7cbac1835cc2f9025214507643`. Le statut reste `OBSERVATION_ONLY_NOT_UI_PASS`.
- **47 tests locaux** : fichier de résultat SHA-256 `3590f54efa2de7e6ffaa47b33a5de97b2f9f073ea9763f84b9a921c03a10cb71` ; `stdoutHash` enregistré `c2f3c6810acd341de1eb3a70722fcdb8b1018ddc32d552338ec64cee815533ff`, `stderrHash` du fichier vide `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Suites : inventaire de reprise, artefact métier, politique d'origine, profile-host, preuves/matrice de fiabilité, contrôle/gardes runtime et drain statique. **1 815 ms** est la durée de ces fixtures, pas du temps actif de recette.
- **Restauration** : toujours celle terminée à **17:57:26.591 UTC**, 81 tables / 9 609 lignes / 14 fichiers / 24 PDF, aucune différence. Elle **précède** le nouveau paiement du bar de 18:25 ; aucune restauration de cette vente n'est encore qualifiée par cette preuve.

Les ancrages UI/HTTP de ces parcours sont détaillés dans les rapports [bar](RECETTE-BAR-2026-10-17.md) et [restaurant](RECETTE-RESTAURANT-2026-10-17.md). Les preuves de compilation/démarrage proviennent des outils du coordinateur ; pas d'interrogation runtime/Git depuis ce volet. Le collecteur, les opérations `TOOL_ERROR` et les résultats non interprétés ne sont jamais promus automatiquement à PASS.

**Suite nécessaire :** confirmer le refresh naturel, terminer la recette du restaurant après relecture de son état, qualifier le troisième EMPLOYEE et le QR bar, contrôler les gestes commerciaux et restaurer une nouvelle copie incluant les ventes récentes. Pas de rôle complet, de T100 complet ou de cinq heures actives démontrés. **Point d'avancement seulement ; aucun commit, déploiement ou paiement bancaire réel exécuté pour ces documents.**

## Registre historique conservé — coupure du 17 octobre à 19:57 Luxembourg

**PARTIEL — NON LIVRÉ — aucune qualification de production.** État des parcours arrêté au **17 octobre 2026 à 19:57:00 Europe/Luxembourg / 17:57:00 UTC**. La restauration finissant à 19:57:26 est explicitement un complément technique postérieur à cette coupure UI. Les builds et nouveaux essais achevés ensuite ne sont pas anticipés.

Rédaction en lecture seule des preuves déjà collectées : aucun test, navigateur, API, SQL, runtime ou paiement n'est exécuté pour ce document. Les mentions de tests réussis ci-dessous renvoient à leurs véritables exécutions, pas à une relance documentaire. Les fichiers bruts, comptes, jetons, capacités QR, connexions et archives restent privés. Aucun nouveau PASS T01–T100 n'est attribué ici.

## 1. Périmètre et distinction des preuves

- **Source modifiée** : correction présente dans le travail local du lot, pas nécessairement compilée, chargée ou publiée à la coupure.
- **Test unitaire / React** : comportement du composant ou de la fonction exécuté sous test, pas clic dans Chrome.
- **Intégration PostgreSQL** : transaction réelle dans le laboratoire de test autorisé, pas vente d'un établissement réel ni paiement bancaire.
- **Parcours Chrome** : action avec contrôle officiel, complétée par un résultat visible/réseau et une observation de persistance quand disponible. Une description d'intention et un retour d'outil ne suffisent pas à prouver le résultat métier.
- **Simulation / déclaration** : espèces fictives, carte déclarée, capture SMTP locale ; jamais banque, terminal, impression physique ou réception Internet vérifiés.

Les rapports [café](RECETTE-CAFE-2026-10-17.md), [restaurant](RECETTE-RESTAURANT-2026-10-17.md) et [bar](RECETTE-BAR-2026-10-17.md) conservent leurs relevés historiques et apportent les nouvelles preuves datées. Aucun rôle n'y est intégralement qualifié. Les trois intitulés EMPLOYEE ne créent pas des ACL fines « limité » / « sans finances » : celles-ci restent **NOT IMPLEMENTED** dans le modèle observé.

## 2. Registre des anomalies de la reprise

Les niveaux P1 ci-dessous sont des priorités de recette proposées selon l'impact constaté, pas la preuve d'une classification exhaustive. L'absence d'autre anomalie dans un collecteur ne signifie pas absence de défaut P0.

| ID / priorité | Reproduction et impact constatés | Correction source / preuve ciblée | Unitaire ou PG réellement exécuté | Chrome après cette correction | État à la coupure |
| --- | --- | --- | --- | --- | --- |
| MM-01 — P1 — concurrence de numérotation AVO | Sous vingt demandes concurrentes, une ancienne allocation du numéro avant verrou produit une collision `P2002` et une réponse **503** au lieu des seules émissions/refus métier. Une exécution échouée est conservée : 11 réponses 201, 8 réponses 409, 1 réponse 503. | Choix de numéro dans la transaction verrouillée, via le client transactionnel ; contraintes et mécanisme existant de reprises conservés. [credit-notes.ts](../../apps/backend/src/lib/credit-notes.ts), [numerotation.ts](../../apps/backend/src/lib/numerotation.ts). | RED PG conservé, puis 7 tests numérotation, 9 PG avoirs et 13 PG refus ciblés réussis ; les tests de concurrence comportent mêmes demandes, demandes distinctes et deux factures. Suites finales 370 backend et 278 PG sans échec. | **NOT RUN** sur le binaire recompilé ; la reproduction concurrente est PG, pas vingt clics bancaires. | Correction locale testée ; pas de qualification bancaire, de publication ou de document réel modifié. |
| MM-02 — P1 — sélecteur de couverts remonté | Table de terrasse : interactions `−` / `+` et cible du bouton instables, deux erreurs d'outil ; la table est finalement ouverte avec **2 couverts affichés**, pas le choix initial de 1. Un couvert vide est conservé comme preuve. | Stabilisation du composant/sélection, bornes de 1 à la capacité conservées. [FloorPlanPage.tsx](../../apps/pos/src/pages/FloorPlanPage.tsx) et [tests de rendu](../../apps/pos/src/pages/FloorPlanPage.covers.test.ts). | Le coordinateur rapporte 2 tests RED puis 4 GREEN à 19:39 ; ces traces d'outil n'ont pas de fichier historique autonome fourni. Les **4 tests réussis sont vérifiés** dans la suite POS finale de 121 tests, source stable. | **NOT RUN** après build. Les clics historiques en erreur ne deviennent pas des clics réussis. | Correction source/React, rejeu officiel à réaliser ; aucune correction silencieuse des couverts historiques. |
| MM-03 — P1 — renouvellement local inter-origines | Frontend `localhost` et API `127.0.0.1` : requête de refresh sans cookie, en-tête `sec-fetch-site: cross-site` observé par le coordinateur, puis 401 et 429. Expiration de la caisse restaurant pendant l'ouverture du règlement de 31,50 EUR ; aucune validation financière lancée. | Politique d'origine locale homogène, API `localhost` ; cookies/protections non relâchés. [local-origin-policy.mjs](../../scripts/local/local-origin-policy.mjs). | 6 tests de policy annoncés par le coordinateur, preuve console d'outil uniquement à ce stade ; ne pas prétendre un fichier/hash autonome ni les ajouter aux 838. La suite web globale antérieure ne remplace pas le test de cette politique. | **NOT RUN** après nouvelle compilation et démarrage ; refus et restrictions ne sont pas contournés. | Correction locale à confirmer en Chrome, notamment cookie/refresh, rechargement et changement de rôle/société. |
| MM-04 — P1 — Robi sans réponse métier qualifiée | Question de lecture au restaurant initialement sans réponse acquise ; les pannes/délais peuvent immobiliser le parcours. Le contexte humain/tenant indisponible renvoie encore **503** dans les essais rapportés. | Budgets distincts 20/25 s, annulation, portée société/acteur et lecture des réponses contrôlées ; [route agent](../../apps/backend/src/routes/agent.ts), [AssistantPanel](../../apps/web/src/components/AssistantPanel.tsx). Aucune permission financière supplémentaire. | **20 tests agent-budget + 11 tests AssistantPanel = 31** ciblés ; ils sont inclus dans les suites globales, pas ajoutés encore une fois. Les autres tests de scope ne prouvent pas une réponse de modèle réelle. | Pas de réponse Robi métier nouvelle réussie retenue ; **BLOCKED / non qualifié fonctionnellement** tant que le contexte requis reste indisponible. | Résilience logicielle testée, capacité de service utilisateur non démontrée. Aucun diagnostic ou acte financier inventé. |

MM-01 : le coordinateur rapporte **125 occurrences `P2002`** dans les traces de reproduction. Ce compteur de traces n'est pas un nombre de ventes ou de documents persistés. La lecture documentaire a vérifié indépendamment le résultat RED avec `databaseCodes = [P2002]` et le 503, mais ne reconstruit pas ce total depuis un journal brut. Les cinq exécutions GREEN successives ne sont pas additionnées comme nouveaux tests uniques.

### Anomalies et limites historiques préservées

Les anomalies précédentes de pointage double, clôture interdite/alerte native, avoir et remboursement déclaratif refusés, états de cache et occupation sont décrites dans les rapports existants. Elles ne sont pas présentées comme de nouvelles découvertes ici. Les anciennes lignes fictives de pointage restent intactes ; une preuve typée `NOT_RECORDED` n'atteste jamais l'absence de remise d'argent hors logiciel. Les dialogues de contrôle officiel bloqués ne sont pas contournés ni transformés en PASS grâce à un test unitaire.

La première fusion restaurant refusée pour consignes cuisine différentes **n'est pas une anomalie de double vente corrigée par la seconde fusion**. Le second cas a des préconditions compatibles ; son succès et la révocation de l'ancien QR sont des observations distinctes, documentées sans effacer le premier refus.

## 3. Provenance des tests techniques

Quatre exécutions collectées, relues sans relance ; heure UTC de fin indiquée :

| Rapport privé `result.json` dans le dossier indiqué | Fin UTC | Tests / résultat | État enregistré |
| --- | --- | --- | --- |
| `validation-backend-unit-1792259225507-lW2ddx` | 17:47:27.566 | **370 / 370**, 0 échec, 0 ignoré | `CONFIRMED_FRESH`, exit 0, source stable, compteurs concordants. |
| `validation-web-unit-1792259227352-1JolJ1` | 17:47:31.296 | **347 / 347**, 0 échec, 0 ignoré | Même état. |
| `validation-pos-unit-1792259227105-TJ8uoE` | 17:47:17.215 | **121 / 121**, 0 échec, 0 ignoré | Même état. |
| `validation-integration-1792259227616-X9tvyd` | 17:48:32.720 | **278 / 278**, 0 échec, 0 ignoré | Même état ; laboratoire PostgreSQL, pas production. |

**Total : 838 unitaires + 278 intégrations.** Les durées 21 302 / 22 760 / 8 942 / 83 855 ms sont les temps de ces processus de validation, pas du temps de clic humain actif, de disponibilité ou un benchmark comparable. Les 31 tests Robi, 4 couverts et tests de crédit ne sont pas ajoutés une seconde fois à leur suite respective. Une modification ultérieure nécessite sa propre validation ; ces résultats ne certifient pas un futur binaire.

Empreintes des fichiers `vitest.json` enregistrées dans ces résultats :

| Suite | SHA-256 |
| --- | --- |
| Backend | `0f5ac7c19d22e5826e18160dd810c020601ef3542090fd3b0d3e5c5afae69c52` |
| Web | `bb95c5cc8760689f14c769db3531194dadcedb608c5c41a1194e74995e49b7c0` |
| POS | `68c7177707dc592aee5cdf87c06405785358db46ccf4318b34c944a8583b7711` |
| PostgreSQL | `7261e0f902219d86afc8f7d7085a5b17f8294cb22a089388979078e391ac350d` |

Les rapports ciblés suivants conservent leur granularité et leurs échecs :

- RED concurrence : `validation-credit-concurrency-1792258677677-63bT0A/result.json`, 7/8 tests, 1 échec, 11×201 / 8×409 / 1×503.
- GREEN numérotation : `validation-credit-concurrency-1792258995373-e0Oo4s/result.json`, 7/7.
- GREEN PG avoirs : `validation-credit-concurrency-1792258996935-j8LkaD/result.json`, 9/9, 11×201 / 9×409, aucun code PG capturé dans ce résultat.
- GREEN refus : `validation-credit-concurrency-1792259091500-iiLhzq/result.json`, 13/13, rollback et références incertaines conservés.
- Robi : `robi-route-fixture-locked-green-v2.json`, 20/20 ; `robi-web-fixture-locked-green.json`, 43/43 au total dont 11 AssistantPanel, les autres tests de scope/destination étant distingués. Ne pas dire « 63 nouveaux tests Robi ».

Les [tests numérotation](../../apps/backend/src/lib/numerotation.test.ts), [PG avoirs](../../apps/backend/src/routes/credit-notes.integration.test.ts), [PG refus](../../apps/backend/src/routes/credit-notes-rejection.integration.test.ts), [budgets agent](../../apps/backend/src/routes/agent-budget.test.ts) et [rendu AssistantPanel](../../apps/web/src/components/AssistantPanel.cancellation.test.ts) sont des liens vers leurs sources, **pas des preuves suffisantes d'exécution à eux seuls**.

## 4. Restauration, arrêt et état non publié

Complément technique achevé à **17:57:26.591 UTC / 19:57:26.591 Luxembourg**, donc 26,591 secondes après la coupure UI : `RESTORATION-2.0-mission-maitre-avant-build-20261017-1957.json`.

| Contrôle | Valeur réellement portée par la preuve |
| --- | --- |
| PostgreSQL source / copie restaurée | **81 / 81 tables ; 9 609 / 9 609 lignes**, statut `equal`, liste des différences vide. |
| Fichiers contrôlés | **14**, médias absents signalés comme tels, pas une vidéo restaurée. |
| PDF factures | `Invoice.issuedPdf` : **14 / 14**, 159 940 octets, même empreinte agrégée. |
| PDF avoirs | `CreditNote.issuedPdf` : **10 / 10**, 123 476 octets, même empreinte agrégée. |
| Anomalies PDF source / copie | `storedHashMismatches`, `nonPdfHeaders`, `missingBinaryWithHash` tous à **0** sur les deux types. |
| Copie externe de test | `encryptedCopyVerified = true`, `keyIncludedInArchive = false`. Cela ne vaut pas test d'un cloud réel. |
| Durée | **9 361 ms**, pas un engagement RPO/RTO ni une recette UI après restauration. |

SHA-256 des **octets du JSON de résultat** : `8f6bee8da00555bf5f948b427cb2abaf7d5c76161a02a0da344dd8991dc95a8f`. Le champ `archiveSha256` vaut `c6fedfe177d7ad3136981b360580ad96a2059ffac9caa3f41270b03815d4ac7d` : ce sont deux objets et deux empreintes différents. Les PDF ne sont pas attribués au bar, qui n'en a aucun émis. Les originaux et archives ne sont pas modifiés pour produire ce rapport.

Le coordinateur constate à **17:56:26 UTC** l'arrêt **normal** du runtime PID 40880 : commande d'arrêt exit 0, environ 685 ms, absence du PID et ports libres, **aucune terminaison forcée**. La vérification d'identité/processus et l'état `STOPPED` ont été observés dans les outils parent ; aucun journal privé complet de ces sorties n'est fourni à cette synthèse. Cela est une provenance explicite, pas un contrôle processus relancé ici.

Sauvegarde privée du travail annoncée : **100 fichiers**, manifeste SHA-256 `c2307d06d622dbabef30f2e15577c3206a958e36dced978718920034a4fd0464`, conservé sans publier son contenu ni en faire un commit. À la coupure, le **build métier est en cours** et le runtime corrigé n'a pas encore été rejoué : aucune compilation réussie, aucun redémarrage réussi et aucun SHA de livraison nouveau n'est inventé. Les fichiers source ne sont pas présentés comme publiés ; aucune modification de master ni déploiement n'est effectué pour cette documentation.

## 5. Couverture, journal et prochaine reprise

Au cutoff UI, le journal privé contient **1 361 événements retenus** : café 785, restaurant 479, bar 96 et une observation initiale sans société. Par établissement :

| Société fictive | Événements UI | Retours / erreurs d'outil UI | Observations | Appels `click` tous résultats |
| --- | --- | --- | --- | --- |
| Café | 529 | 518 / 11 | 256 | 337 |
| Restaurant | 285 | 281 / 4 | 194 | 182 |
| Bar | 49 | 49 / 0 | 47 | 35 |

Ces compteurs distinguent interactions, lectures et erreurs ; ils ne quantifient ni clics physiques certains, ni contrôles uniques exécutés, ni exigences validées. Les références reproductibles utilisent **position de ligne + hash d'événement enregistré + horodatage + opération + page**, pas le seul ancien ID numérique en collision. Cette lecture ne vérifie pas intégralement la chaîne cryptographique et ne renumérote aucun historique.

L'inventaire de **3 697 contrôles source** reste une base de travail, pas 3 697 PASS. La durée de **cinq heures actives n'est pas démontrée** : ni l'amplitude des horodatages, ni le temps de compilation/tests/attente ne valent activité UI. Les états historiques de la matrice ne sont pas modifiés dans ces quatre rapports.

Prochaines actions après contrôle du build et démarrage sûrs :

1. Rejouer réellement dans Chrome le sélecteur de couverts et le renouvellement de session sans changer les cookies de sécurité ; relire les mêmes groupes/données après reconnexion.
2. Reprendre le restaurant à **31,50 EUR ouverts**, distinguer le QR **25,40** du dessert **6,10** ; ne pas redéclarer les règlements des deux ventes soldées **46,50**.
3. Tester les quatre comptes bar nouvellement créés, les refus serveur/UI, une caisse et un service complets, puis documents/clôture/restauration ciblée.
4. Qualifier une véritable réponse Robi dans le contexte de laboratoire autorisé, sans action financière autonome ; garder le 503 et le blocage visibles jusque-là.
5. Compléter les écrans/rôles et T100 sur preuves, puis décider de la livraison seulement après les validations indispensables. Banque réelle, imprimantes/terminaux et recette complète restent séparés et non qualifiés.

**Conclusion : corrections locales et preuves techniques disponibles, recette multi-clients partielle, vérifications Chrome du code final encore nécessaires ; NON LIVRÉ.**
