# Recette intensive — couverture factuelle par établissement et rôle

## Consolidation technique après la coupure UI de 21:30

**PARTIEL — CAMPAGNE NON LIVRÉE.** Les [preuves finales v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json) sont relues sans nouvelle exécution : **861 unitaires (391/349/121), 295 PG, 47 fixtures locales**, tous réussis, et deux builds finaux business/full **5 applications chacun**. Les anciennes défaillances et observations RED restent conservées. La correction v3 ne fait que lire la bonne clé du diagnostic des pointages historiques ; ce n'est pas une nouvelle recette ou une suppression de données.

Restauration réellement achevée à **21:31:36.908 Luxembourg** : **81 tables / 10 083 lignes / 14 fichiers / 26 PDF**, zéro différence et mêmes empreintes ; **X02 devient PASS ciblé**. Le registre reste à **32 critères**, désormais **25 PASS ciblés / 2 FAIL historiques / 5 BLOCKED**. Aucun statut global T100 ou rôle entier n'est promu. Les blocs ci-dessous restent vrais à leur ancienne coupure, y compris « restauration à fournir » avant cette nouvelle preuve.

Le [journal public 21:32](preuves/intensive-journal-2026-10-17-2132.json) rapporte **1 119 tentatives UI / 1 096 retours / 23 erreurs**, **731 clics d'outil retournés / 368 champs remplis**, selon ses conventions, pas des clics physiques certains ou des contrôles uniques. Cinq heures actives non attestées. **CSV non inspectés, PNG non attesté, ACL fines absentes, Robi métier 503 et essais matériels/bancaires non qualifiés** restent visibles ; aucune certification de production.

## Complément de progression — 17 octobre 2026, 21:30 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Coupure **19:30:00 UTC**, relevés RED antérieurs conservés plus bas. Le [registre de traçabilité complété](TRACABILITE-UI-API-PG-2026-10-17.md) distingue désormais **32 critères : 24 PASS ciblés / 2 FAIL historiques / 6 BLOCKED**. B08 (frontière QR) et C04 (date de fin MIME) ont un GREEN effectif ; les deux RED historiques ne sont pas effacés. Ce n'est ni un total T100 ni un rôle complet.

| Établissement / rôle | Nouveaux parcours réellement observés | Limites maintenues |
| --- | --- | --- |
| Café | Relecture PG finale : finances inchangées, caisse historique conservée. | Pas nouveau tour UI ; **deux pointages ouverts historiques** toujours préservés, pas deux nouvelles entrées. |
| Restaurant / MANAGER | Solde des 6,50 QR conservés, double clic → une vente ; fin du parcours sans sortie papier. | Banque/terminal réels non testés ; effets matériels inexistants. |
| Restaurant / QR | Après paiement final : bill **403**, tentative de commande **403**. | GREEN ciblé ; pas toutes les combinaisons intergroupes/permissions. Ancien RED conservé. |
| Restaurant / OWNER | Refus de clôture sans motif, justification, comptage/clôture puis rechargement/historique. | CSV cliqué mais fichier non inspecté ; pas comptage physique. |
| Bar / MANAGER | KDS QR #2/#3 Commencer→Prêt→Servi ; acompte 5 cash au double clic, QR actif à 8,20 ; solde 8,20 mixte (4 cash + 4,20 carte déclarée), double clic, fin du parcours. | Les états de service ne sont pas une preuve de préparation physique ; paiements déclarés uniquement. |
| Bar / QR et OWNER | Ancien accès révoqué après solde ; nouvelle visite via UI, nouveau contexte addition zéro, ancien toujours 403 ; planning nuit republié et MIME conforme sur les champs contrôlés. | Date/heure de fin explicitée, mais libellé de fuseau non imprimé ; pas réception Zoho. |
| Bar / OWNER et EMPLOYEE demandeur | Congé unique approuvé par OWNER, même statut après reload employé ; clôture Bar justifiée puis reload. | Pas recette RH intégrale, ni CSV contrôlé. |
| Bar / EMPLOYEE dit « sans finances » | Huit suggestions Robi métier sans jeux réellement vues ; caisse refusée par UI et HTTP 403. | **CA 38,04 EUR visible au dashboard POS** : ACL “aucune finance” absente. Robi métier toujours 503, non rejoué ; suggestions ≠ réponse fonctionnelle. |

Bilan de données : **restaurant 4 Sale / 5 Order, 84,50 TTC = 81,42 HT + 3,08 TVA**, cash 82,20 + carte déclarée 2,30, avoir/remboursement 6,10 inchangés ; caisse **276,10 attendu / 276,05 compté / −0,05 motivé**. **Bar 3 Sale / 3 Order, 38,04 TTC = 34,17 HT + 3,87 TVA**, cash 19,00 + carte déclarée 19,04 ; stock **96/79/58/19**, caisse **119,00 / 118,90 / −0,10 motivé**. Café inchangé.

Compteurs de journal à la coupure : **1 807 lignes** ; UI café **529**, restaurant **352**, Bar **238** ; retours/erreurs **518/11, 347/5, 231/7**. Ce ne sont pas des contrôles T100 uniques ou des clics physiques reconstitués. Une tentative de capture reste **INSTRUMENTATION_NOT_VERIFIED** : aucun PNG réussi attesté et aucun contournement.

**295/295 PG** après annotations et **47/47 fixtures locales** relus ; builds finaux business/full **cinq applications chacun** réussis, durées 90,289 / 79,006 secondes, pas temps actif UI. La relance finale des **861 unitaires** est en cours au signalement, pas anticipée réussie. **Restauration finale encore à fournir**, la copie de 21:00 précédant ces rejoués ; X02 reste BLOCKED. Matériel, banque, CSV, droits fins et recette exhaustive restent non qualifiés. T100 partiel, cinq heures actives non attestées, aucune livraison de production.

## Point de progression — 17 octobre 2026, 21:00 Europe/Luxembourg

**PARTIEL — CAMPAGNE NON LIVRÉE — aucun rôle intégralement qualifié.** Coupure des actions : **19:00:00 UTC** ; dernier événement retenu fini à **18:58:43.212**. Les anciens relevés de 13:32/14:05 ci-dessous sont conservés à leur date et ne constituent pas l'état courant des trois établissements. **C est désormais BAR DES AMIS** ; les préparatifs boulangerie restent intacts et hors recette actuelle.

La [traçabilité UI → HTTP → PostgreSQL](TRACABILITE-UI-API-PG-2026-10-17.md) associe 22 critères étroits à leurs preuves : **14 PASS / 2 FAIL / 6 BLOCKED**, sans promotion de T100 ou d'un rôle entier. Les lectures rétrospectives de requêtes déjà enregistrées, publiées à 21:08, complètent la preuve de certaines actions antérieures ; elles ne sont ni de nouveaux clics ni de nouvelles écritures avant la coupure. Aucune exécution UI/API/SQL, test, runtime, nettoyage ou Git n'est réalisée pour cette consolidation.

### Établissements, argent et stockage observés

| Établissement | État courant étayé | Limite |
| --- | --- | --- |
| A — Café du Centre | Cinq membres ; 4 ventes **21,10 TTC / 20,03 HT / 1,07 TVA** ; facture 10,25, avoirs et remboursements déclarés 10,25 ; clôture historique 106,85 théoriques / 106,80 comptés / −0,05 motivé. Réception matière **1,5 + 3,5 = 5 kg** rapprochée UI/HTTP/PG. | Ces parcours sont historiques à leur date, pas rejoués sur le dernier binaire. Rôles/écrans et incidents encore partiels. |
| B — Restaurant des Jardins | 5 membres ; **3 Sale / 4 Order payées**, **78,00 TTC / 75,11 HT / 2,89 TVA**. Facture de ticket **31,50** liée à la vente existante, avoir **6,10**, remboursement CASH déclaré **6,10** lié à son tender. Caisse PG théorique **269,60**, non comptée/non clôturée. | L'ancien QR soldé a accepté une **nouvelle commande 6,50 OPEN** : défaut reproduit, pas nouvelle vente. Correction source/17 tests PG, **pas encore GREEN Chrome** à la coupure. |
| C — Bar des Amis | 5 membres, 3 tables, 3 catégories/4 produits ; une vente POS **24,84 TTC / 22,46 HT / 2,38 TVA**, CASH 10 + CARD 14,84 déclarés. Deux commandes QR **9,60 + 3,60 = 13,20 OPEN**, pas débit anticipé du stock ; caisse théorique **110,00**, non clôturée. Congé unique, nuit confirmée et nettoyage manuel persistés. | Capture planning nocturne sans date de fin explicite ; source corrigée, **republication UI/MIME non qualifiée**. Rôles fins, paiements réels et matériel restent non qualifiés. |

Les factures et règlements ne sont pas ajoutés au chiffre d'affaires. Les valeurs d'argent et de stock sont fictives, pas des contrôles physiques, une validation comptable ou une certification de sécurité. Les preuves ne permettent pas de déclarer les 3 697 contrôles exécutés.

### Rôles réellement parcourus à cette coupure

Chaque établissement possède **1 OWNER / 1 MANAGER / 3 EMPLOYEE**. Les noms de recette « serveur », « limité » et « sans finances » ne sont pas trois niveaux d'ACL. **ADMIN métier distinct et droits fins demandés : NOT IMPLEMENTED / décision utilisateur manquante.**

| Société / rôle réel | Nouveaux écrans/actions étayés, en plus des relevés historiques | Lacunes conservées |
| --- | --- | --- |
| Café / OWNER | Stock, fournisseur, réception avec double clic/401→refresh→reprise, documents, avoirs, remboursements déclarés et clôture déjà rapprochés. | Pas nouveau tour complet après les dernières corrections ; tous les exports/menus/incidents non qualifiés. |
| Café / MANAGER | Planning/congés, publication locale et parcours d'administration ciblés historiques. | Pas toutes les autorisations/remises/incidents/rapports. |
| Café / trois EMPLOYEE | Service/POS, refus ciblés, dossier personnel, congés et pointages selon les preuves historiques. | Deux pointages fautifs préservés ; aucune ACL « sans finances » distincte ni couverture exhaustive. |
| Café / QR | Commandes, convives/groupes, révocation/transfert/séparation et vues ciblées historiques. | Pas toute la suite de fusions/fin de visites sur le binaire final. |
| Restaurant / OWNER | Installation, équipe/catalogue, QR renouvelé et client société fictif pour facturation. | Paramètres complets, sauvegardes UI, rapports et restrictions non exhaustifs. |
| Restaurant / MANAGER | Deux caisses, séparation avec acompte, fusion refusée puis cas compatible distinct ; préparation QR Commencer→Prêt→Servi ; paiement final POS–QR ; facture depuis ticket, émission, avoir, remboursement déclaré et PDF. | Caisse non clôturée ; téléchargements Chrome non comparés octet à octet ; pas banque ni impression. |
| Restaurant / EMPLOYEE caissier | Couverts/lignes/notes/tournées, acomptes et solde de C1 ; nouvelle table et fusion compatible, relecture après redémarrage. | Pas toute la caisse sous ce rôle ni toutes les annulations/offerts ; sélecteur corrigé rejoué surtout au bar. |
| Restaurant / autres EMPLOYEE | Connexions/RH et droits ciblés historiques, notamment congés. | Pas tous les écrans/actions ni rôle fin « limité/sans finances ». |
| Restaurant / QR | Nouveau contexte après renouvellement ne voit que sa part, ancien accès refusé après fusion ; addition à zéro après paiement puis **nouvelle commande depuis l'ancien QR reproduite RED**. | Frontière après fin de visite bloquante jusqu'au rejeu Chrome corrigé. |
| Bar / OWNER | Onboarding, 5 comptes, catalogue, salles, ouverture de caisse, nuit 23→03/publish local, visite QR et Robi réel. | Robi renvoie honnêtement **503**, réponse métier BLOCKED ; MIME nuit RED, pas tous les réglages/rapports/documents. |
| Bar / MANAGER | Deuxième caisse, reprise des tournées/note, remise/offert avec motif exigé au paiement, double clic mixte unique, ticket numérique ; refresh naturel **200** observé. | Pas autorisation bancaire, validation fiscale des gestes, clôture ou recette de toutes les permissions. |
| Bar / EMPLOYEE caissier | Connexion POS, moins/plus au clavier et ouverture à un couvert, deux tournées/note, observation de la remise partagée. | Logout d'inactivité distinct du refresh ; pas tous les cas d'erreur/concurrence. |
| Bar / autre EMPLOYEE « limité » | Connexion ERP, Comptabilité refusée et lecture de caisse **403** ; planning autorisé, congé du 24/10 **double clic → un PENDING**, reload. | Le refus ciblé ne crée pas une ACL fine ; pas de décision de congé ou révocation complète testée. |
| Bar / cinquième EMPLOYEE « sans finances » | Connexion indépendante, HACCP, **CLEANING / MANUAL / value NULL**, rechargement et auteur de la bonne société. | Aucun droit « sans finances » distinct ; aucun capteur, mesure ou audit intégral des données personnelles. |
| Bar / QR | Visite Table 2, contexte mobile indépendant ; 2 pils/double clic → une commande **9,60**, deuxième tournée tonic **3,60**, deux commandes OPEN persistées. | Pas règlement de ces QR, fin de visite/revocation corrigée ou tous les écrans/largeurs testés. |

### Volume du journal et preuves techniques

Avant la coupure : **1 677 lignes**, dont café 785, restaurant 547, bar 344 et une observation initiale sans société. Événements de catégorie UI : **529 / 326 / 189** ; retours/erreurs d'outil respectifs **518/11, 321/5, 182/7**. Appels `click` tous résultats **337 / 208 / 118**, dont **328 / 204 / 112 retournés**. Ces compteurs ne sont ni des clics physiques certains, ni des contrôles source uniques ni des PASS. Les numéros historiques en collision ne sont pas renumérotés ; position+hash+heure/opération/page restent les repères.

Exécutions techniques relues à leur date : **391 backend + 349 web + 121 POS = 861 unitaires**, **295 PG**, réussis. Les premiers échecs sandbox sont conservés (287/391 backend ; 119/121 POS), avec nuance sur les onze messages backend ne mentionnant ni EACCES ni EPERM ; [détail et limites](TRACABILITE-UI-API-PG-2026-10-17.md). Ces résultats ne sont pas des nouveaux clics. Des builds ultérieurs rencontrent TS7006 dans quatre callbacks de test ; corrections de type/rebuild en cours au signalement, sans succès anticipé.

À **21:00:00**, la nouvelle restauration est en cours. La restauration ancienne **19:57** (81 tables / 9 609 lignes / 14 fichiers / 24 PDF) ne contient pas ces dernières écritures ; sa réussite ne peut pas les qualifier. Aucun nouveau verdict final de restauration n'est anticipé. T100 reste partiel, cinq heures actives non attestées, matériel et prestataires réels non qualifiés. **Aucun rôle complet, aucun déploiement ni livraison.**

## Relevés historiques conservés — coupure initiale 13:32 UTC puis compléments datés

**PARTIEL — CAMPAGNE NON LIVRÉE — aucun rôle intégralement qualifié.**

Cutoff des observations : **17 octobre 2026 à 13:32:47 UTC**, soit 15:32:47 Europe/Luxembourg. Les événements achevés après ce cutoff sont exclus, même si le journal continue d'évoluer pendant la rédaction. Le dernier événement privé retenu ci-dessous s'achève à 13:32:42.889 UTC. Ce document consolide des preuves existantes ; il n'exécute aucun nouveau clic, test, appel API, SQL ou paiement et n'attribue aucun nouveau PASS.

Profil `CREORGA_BUSINESS_ONLY`. Le plan relève la branche `codex/creorga-2-0-2026-10-08` et la base `475f67ac1357e07af478f4f237a1f6bb001bb93a` ; ce sont ses références de départ, pas l'annonce d'un nouveau HEAD publié.

## Sources et sens des statuts

- [Plan initial](preuves/intensive-plan-2026-10-17.json) : 222 scénarios préparés, 74 par établissement ; pas 222 scénarios exécutés. Ses zéros et NOT RUN initiaux ne décrivent pas l'état courant.
- [Résultats intermédiaires 11:50](preuves/intensive-resultats-2026-10-17-1150.json) : dernier relevé métier de ce fichier à 11:45:01.856 UTC ; 12 PASS ciblés et 2 BLOCKED. Ils ne couvrent ni les parcours ultérieurs ni un rôle entier. Les scénarios non listés gardent leur statut de ce relevé, sans promotion automatique ici.
- [Journal public nommé 13:15](preuves/intensive-journal-2026-10-17-1315.json), généré à 13:14:07.968 UTC : actions expurgées et compteurs d'outil, pas verdicts métier.
- [Rapport de campagne](RECETTE-INTENSIVE-2026-10-17.md) : ses sections successives sont datées ; les indications anciennes « B/C non créés » ou « QR NOT RUN » ne doivent pas être utilisées après les preuves ultérieures.
- Journal privé `actions.jsonl` et preuves privées nommées ci-dessous : consultation limitée aux événements antérieurs au cutoff et aux extractions nécessaires. Leur contenu brut, les adresses d'accès et les identités techniques ne sont pas reproduits. Les fichiers privés ne sont pas ajoutés à Git.

Dans ce document, **observé** signifie qu'une action ou un état possède une trace, non que toutes ses exigences sont validées. **PARTIEL** qualifie un périmètre de recette, pas une nouvelle valeur de la matrice. **NOT RUN**, **BLOCKED** et **NOT IMPLEMENTED** restent distincts.

La matrice historique T01–T100 reste inchangée : **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN**. T100 est partiel.

## État des trois établissements au cutoff

| Établissement | État factuellement étayé | Limite de qualification |
| --- | --- | --- |
| A — CAFÉ DU CENTRE | Cinq identités internes ; parcours de service, QR, facturation, avoirs, remboursements déclarés et comptage de clôture parcourus. Clôture persistée à 13:11:37.673 UTC, comparaison PostgreSQL à 13:11:44.594. | Le parcours financier décrit est abouti sur ces données fictives, pas l'audit intégral des écrans, rôles, incidents ou moyens de paiement. |
| B — RESTAURANT DES JARDINS | Création UI à 13:14:25.859 UTC ; cinq membres, six produits, quatre catégories, quatre tables configurées ; fond fictif de 200 EUR ouvert à 13:26:47.092. Accès des cinq identités et premières tentatives RH/service tracés. | Dernière comparaison PostgreSQL à 13:26:52.865 : zéro commande et zéro vente. Les clics ultérieurs jusqu'au cutoff ne prouvent pas une vente, réservation ou demande RH enregistrée. |
| C — BOULANGERIE & SNACK | Pas de création ni de parcours observé dans les sources retenues. | Tous les rôles et parcours de cet établissement : **NOT RUN**. Ne pas recycler les données A/B pour simuler sa création. |

Sources privées : `cafe-cloture-comptage-ui-1.json`, `restaurant-reference-creation-ui-1.json`, `restaurant-catalogue-reference-ui-1.json`, `restaurant-table-vide-disparue-1.json`. Ces preuves sont des lectures PostgreSQL complémentaires aux actions UI, pas un substitut aux clics.

## Rôles réellement disponibles

| Identité de recette | Rôle réellement enregistré | Ce qu'il ne faut pas en déduire |
| --- | --- | --- |
| Patron | OWNER | Ni tous les réglages ni tous les pouvoirs n'ont été qualifiés. |
| Responsable | MANAGER | Une connexion ou un menu visible ne valide pas chaque opération de gestion. |
| Serveur / caissier | EMPLOYEE | Le libellé de recette `cashier` n'ajoute pas un nouveau rôle CASHIER. |
| Employé « limité » | EMPLOYEE | L'ACL fine distincte demandée est **NOT IMPLEMENTED**. |
| Employé « sans finances » | EMPLOYEE | L'ACL sans accès financier distincte est **NOT IMPLEMENTED** ; le nom du compte n'applique pas une interdiction de lecture. |
| Client QR | Visite anonyme, sans compte interne | Une capacité de visite n'est pas un rôle salarié ni une identité client vérifiée. |

Les deux établissements créés possèdent chacun un OWNER, un MANAGER et trois EMPLOYEE dans leurs relevés privés. Il s'agit d'identités distinctes, pas de cinq profils de permissions distincts. Aucun contournement des droits serveur ne peut remplacer les ACL manquantes.

## A — Couverture observée par rôle

| Identité | Écrans et actions réellement parcourus | Preuves de rapprochement / repères UI | Ce qui reste partiel ou bloquant |
| --- | --- | --- | --- |
| Patron / OWNER | Inscription et installation ; paramètres société ; salle, tables et chaises ; utilisateurs ; catégories et produits ; clients société, fournisseurs et stock ; achats/réception ; devis ; facture depuis ticket et émission ; PDF/e-mail local ; avoirs ; déclarations de remboursement ; rapports et comptage de clôture, puis rechargement et historique. | `cafe-onboarding-1.json`, `cafe-membres-1.json`, `cafe-catalogue-1.json`, `cafe-stock-reception-1.json`, `cafe-facture-depuis-ticket-ui-1.json`, `cafe-avoirs-complement-ui-1.json`, `cafe-remboursements-declares-ui-1.json`, `cafe-cloture-comptage-ui-1.json`. Repère E-A-OWNER. | Pas « tous les menus testés ». Autorisations complètes, exports téléchargés dans Chrome, fiscalité validée, panne PostgreSQL et essais matériels/prestataires restent à distinguer et qualifier. |
| Responsable / MANAGER | Connexion indépendante ; menus d'administration et utilisateurs ; tarif catalogue modifié puis rechargé ; planning, créneau, demandes de congés et approbation ; publication du planning ; carte accessible après correction. | `cafe-pricing-rh-readonly-1.json`, `cafe-pointages-transfert-readonly-1.json`, `cafe-planning-section-capture-2.json`. Repère E-A-MANAGER ; décision de congé à 10:47:45.411 UTC, page 4, clic. | Publication et capture SMTP locale ne prouvent pas un envoi Internet. Parcours complets de remises, incidents, annulations, rapports et toutes les limites de gestion non qualifiés. |
| Serveur / caissier / EMPLOYEE | POS, salles et tables ; reprise manuelle d'un brouillon explicitement refusé ; articles et quantités ; notes ; transfert ; préparation KDS ; acompte ; paiement mixte déclaré, coupure réseau puis même demande reprise ; table soldée/fermée ; journal et refus de clôture. | `cafe-seat-reprise-green-1.json`, `cafe-pointages-transfert-readonly-1.json`, `cafe-acompte-ui-1.json`, `cafe-reglement-mixte-ui-1.json`, `cafe-closure-refusal-readonly-1.json`. Repère E-A-CASHIER. | Déclarations fictives, pas confirmation bancaire. L'ancien contexte Chrome 3 bloqué sur dialogue natif ne devient pas qualifié grâce à un autre onglet fonctionnel. Clôture propriétaire distincte de celle interdite au caissier. |
| Employé « limité » / EMPLOYEE | Connexion ; refus de configuration société ; navigation directe vers catalogue et comptabilité ; congés invalides puis valides ; tentative d'auto-approbation refusée ; décision MANAGER relue ; révocation, refus de connexion et réactivation ; entrée/sortie au double clic puis rechargement. | `cafe-service-refus-1.json`, `cafe-pricing-rh-readonly-1.json`, `cafe-pointages-transfert-readonly-1.json`. Repère E-A-LIMITED ; pointages à 11:33:56.846 et 11:34:10.074 UTC, page 5, clics. | Ces refus ciblés ne constituent pas une ACL « limité » indépendante. Tous les accès directs, données personnelles et scénarios concurrents ne sont pas intégralement qualifiés. |
| Employé « sans finances » / EMPLOYEE | Connexion ; permissions par accès direct ; module factures et tentative de création de devis refusée ; dossier personnel ; sortie sans entrée ; double entrée reproduite ; refus explicite du conflit historique après correction, sans clôture automatique. | `cafe-pointage-double-1.json`, `cafe-pointage-double-readonly-2.json`, `cafe-pointages-transfert-readonly-1.json`. Repère E-A-NOFIN. | Lecture de devis/factures possible dans le modèle observé : ne pas annoncer l'absence d'accès financier. Deux pointages ouverts fautifs sont préservés comme preuves ; aucune réparation historique silencieuse. ACL demandée **NOT IMPLEMENTED**. |
| Client QR anonyme | Contextes indépendants ; carte, catégories, panier, première et deuxième commandes ; deuxième convive autorisé ; rechargement de l'addition ; changement de langue ; ancienne visite révoquée, nouvelle visite ; transfert ; groupe séparé ; vues 375/390/768/1440 et navigation clavier ciblée. | `cafe-qr-premiere-commande-1.json`, `cafe-qr-deuxieme-commande-1.json`, `cafe-qr-revocation-1.json`, `cafe-qr-transfert-1.json`, `cafe-qr-separation-groupe-1.json`, `cafe-qr4-solde-ui-1.json`, `cafe-qr-solde-mixte-2.json`. Repères E-A-QR-ORDER et E-A-QR-REVOKE. | Paiement en ligne non configuré ; règlements effectués côté personnel en mode déclaré. Toutes les fusions, suppléments, consignes, groupes et exceptions ne sont pas qualifiés ; certains cas sont refusés par sécurité. Traduction/contrastes non exhaustifs. |

La réception fournisseur de 3,5 kg après comptage de 1,5 kg conduit à 5 kg ; le bon fictif de 63 EUR n'est pas une facture fournisseur ni un paiement. Les stocks de produits et d'ingrédients restent distincts : aucune recette ou consommation de grains non implémentée n'est inventée.

### Rapprochement financier A, distinct de la couverture des rôles

Le relevé privé `cafe-cloture-comptage-ui-1.json` à 13:11:44.594 UTC confirme :

| Objet | Valeur conservée | Interprétation limitée |
| --- | --- | --- |
| Ventes finalisées | 4 ; TTC 21,10 EUR, HT 20,03 EUR, TVA 1,07 EUR | Ventes brutes avant avoirs ; ne pas ajouter le total des factures comme nouvelle vente. |
| Facture émise liée au ticket | 10,25 EUR | Document de la vente, pas un nouvel encaissement. |
| Avoirs | 2 ; total 10,25 EUR | Corrections documentaires, pas remboursements automatiques. |
| Remboursements manuels déclarés | 4 ; total 10,25 EUR | Déclarations fictives ; aucune confirmation bancaire. |
| Commandes ouvertes / restant dû | 0 / 0 centime | Périmètre sélectionné de ce relevé, pas absence de défaut dans tout le logiciel. |
| Caisse | Fond 100 EUR + espèces 13,10 EUR − sorties déclarées 6,25 EUR = théorique 106,85 EUR | Aucun comptage physique réel attesté. |
| Comptage fictif / écart | 106,80 EUR / −0,05 EUR, clôture persistée | Écart explicitement motivé ; instant de clôture distinct du rechargement ultérieur. |
| Stocks produits finaux | 97 / 59 / 46 / 19 / 100, dans l'ordre du relevé | Ne prouve pas un inventaire physique. |
| Prestataires | 0 capture rapprochée et 0 remboursement prestataire | Ne pas présenter la déclaration carte comme transaction bancaire vérifiée. |

La nouvelle synthèse ne recalcule pas un chiffre d'affaires net légalement validé et ne certifie pas un export comptable.

## B — Couverture observée par rôle

Les relevés privés de référence de B sont distincts de ceux de A. À 13:19:47.152 UTC, cinq membres et aucun produit/vente ; à 13:23:13.722, six produits et quatre catégories, toujours aucune vente ; à 13:26:52.865, une caisse ouverte à 200 EUR, zéro commande et zéro vente. Ces instants ne sont pas remplacés par l'intention décrite dans un clic ultérieur.

| Identité | Écrans/actions observés avant cutoff | Preuves / repères | Limites au cutoff |
| --- | --- | --- | --- |
| Patron / OWNER | Création et installation ; identité et paramètres société ; salle/terrasse et quatre tables ; gestion de quatre employés supplémentaires ; quatre catégories/six produits ; rechargement catalogue ; ouverture du fond de caisse fictif de 200 EUR au double clic. | `restaurant-reference-creation-ui-1.json`, `restaurant-catalogue-reference-ui-1.json`, `restaurant-table-vide-disparue-1.json`. E-B-CREATE et E-B-DRAWER. | Aucun service financier terminé. Pas de facture, avoir, remboursement, clôture ou recette stock/RH complète qualifiés pour B. |
| Responsable / MANAGER | Connexion distincte ; sortie de l'assistant et de la visite guidée ; ouverture du planning d'équipe puis des réservations. | E-B-MANAGER ; clic de navigation vers réservations commencé à 13:28:57.625 UTC, page 14. | L'ouverture d'un module ne prouve ni réservation créée ni concurrence de réservations, approbation de congé ou gestion d'un service. |
| Serveur / caissier / EMPLOYEE | Connexion POS distincte ; sélection puis ouverture d'une table avec deux couverts. Tentative d'ajout d'une soupe, retournée comme erreur d'outil. | E-B-CASHIER ; ajout tenté à 13:25:30.031 UTC, page 15, `TOOL_ERROR`. `restaurant-table-vide-disparue-1.json`. | Incident de table vide à examiner ; aucun article/commande/vente n'est prouvé enregistré. Ne pas transformer une erreur d'outil en vente perdue ou en succès. |
| Employé « limité » / EMPLOYEE | Connexion ; tentative d'enregistrement de configuration refusée selon la trace de navigation ; accès direct au catalogue ; planning ; formulaire de congés, soumission puis nombreuses corrections des champs date au clavier. | E-B-LIMITED et E-B-DATE ; accès catalogue à 13:27:28.653 UTC, page 16, navigation. | Résultat durable de la demande RH non consolidé avant cutoff ; ne pas inférer son enregistrement du clic de soumission. ACL spécialisée **NOT IMPLEMENTED**. |
| Employé « sans finances » / EMPLOYEE | Connexion distincte ; sortie de la configuration ; tentative d'accès financier depuis le menu puis au rapport réservé. | E-B-NOFIN ; premier accès financier commencé à 13:29:57.740 UTC, page 17, clic. | Résultat visible/HTTP durable de ces dernières tentatives non consolidé ici. Le nom de l'identité n'établit pas une interdiction. ACL spécialisée **NOT IMPLEMENTED**. |
| Client QR | Aucun parcours QR de B observé dans les sources retenues. | Pas de preuve retenue pour ce rôle. | **NOT RUN** ; ne pas réutiliser les validations QR de A. |

## C — Rôles et écrans non parcourus

Patron OWNER, responsable MANAGER, serveur/caissier EMPLOYEE, employé « limité » EMPLOYEE, employé « sans finances » EMPLOYEE et client QR : **NOT RUN pour C**, établissement non créé dans les sources au cutoff. Le parcours boulangerie — achats, réceptions partielles, rupture, prix, pertes, inventaire, OCR, vente rapide et clôture — n'est pas exécuté par l'existence d'un scénario dans le plan.

## Repères de preuve sans contenu d'accès

Les repères E-* ci-dessus renvoient au journal privé `actions.jsonl`. Le numéro historique n'est qu'un indice : l'identification repose sur **date de début UTC + opération + page + SHA-256 de la ligne JSON UTF-8, sans fin de ligne**. Les empreintes ci-dessous ont été calculées en lecture seule ; aucune observation brute n'est publiée. Un retour d'outil n'est pas un verdict métier.

| Repère | Indice historique ; début UTC ; opération ; page | SHA-256 de la ligne privée |
| --- | --- | --- |
| E-A-OWNER | 763 ; 13:11:30.278 ; click ; 7 | `25512a11903a29c8ef0e0cd977352aad1d6b1447eddf4d832b04bc34ebcf1352` |
| E-A-MANAGER | 441 ; 11:35:13.643 ; click ; 4 | `20470653684707a52d3c285cb1c3f8224a84a7a81718c868b882dd41d249a68f` |
| E-A-CASHIER | 479 ; 11:39:10.943 ; click ; 3 | `c668ec8e162172f23665b84795b148e25f1421885da00844f7c86bbc4b716d72` |
| E-A-LIMITED | 231 ; 10:47:26.290 ; click ; 5 | `df611dccfc2af138bec4b42ed591cabdd2f5f9d17ec3d537ce579caefd19c21f` |
| E-A-NOFIN | 256 ; 10:51:14.623 ; click ; 6 | `94325e6acb679147d157cce45553e926fd2738a99efa55225cd65e08631c3193` |
| E-A-QR-ORDER | 565 ; 12:21:17.408 ; click ; 8 | `7b889eb0cb89f22b2dc2a798960ccb0790cd93ecd2b67118d651f6d0ee24c795` |
| E-A-QR-REVOKE | 601 ; 12:27:01.704 ; navigate_page ; 9 | `feb9247ececfe7f4a4cfa3f9804abc1c83e60f21b35085d90d90c45113617fe6` |
| E-B-CREATE | 776 ; 13:14:23.463 ; click ; 13 | `9033b43086f202b4ae892d11437480b3178593a10a2e5115c88c7c790b21bf7e` |
| E-B-DRAWER | 900 ; 13:26:45.214 ; click ; 13 | `efebe3d9d6c53b278b1b3a0cad625dd794ff3017081fff4b55f3adb11402a84d` |
| E-B-MANAGER | 911 ; 13:28:31.085 ; click ; 14 | `726c556dc42f259a1a144ce075366ca6a957b9cabf8a28ab709e876a135aa856` |
| E-B-CASHIER | 888 ; 13:25:11.693 ; click ; 15 | `82ea218794eaf5652f59575973800ea47d34bd2785a398c4325ae7d1bd1b1fc0` |
| E-B-LIMITED | 918 ; 13:29:21.900 ; click ; 16 | `993fdb220ccf083e073b19b1794be4bd2f354470656eb44a165f5fd34333c60a` |
| E-B-NOFIN | 946 ; 13:32:00.082 ; click ; 17 | `c01f6ff6f5c39a765f5c8a8eb900df65807c8f0adc9993518c64ccdc443c8cba` |
| E-B-DATE | 948 ; 13:32:40.128 ; press_key ; 16 | `b3b2b8c8f7840f494cdf4c16def927e453e59699bebd8c00b47f745eed7ef806` |

### Numérotation historique et chaîne SHA : deux preuves distinctes

Les compteurs 509, 510, 517, 518, 723, 724 et 725 désignent chacun plusieurs événements distincts dans le journal consulté. Par exemple, l'indice 517 correspond à deux clics débutant à 12:05:21.508 et 12:06:27.932 UTC. Aucune ligne n'est renumérotée, supprimée ou fusionnée par ce document ; il serait incorrect d'en déduire des contrôles supplémentaires ou une identité unique à partir du numéro seul.

La chaîne enregistrée `priorHash`/`hash` est une autre propriété. L'export public généré à 13:14:07.968 déclare `chainVerified: true` pour ses 781 événements et le dernier hash `00a0faa5eb1e3272eb15d0d92bcdc7975a54969061e049fbbf001d4bf4452b7c`. Cette déclaration d'export n'est pas une nouvelle vérification de toute la chaîne privée jusqu'au cutoff. Les SHA des lignes ci-dessus ne sont pas présentés comme les champs `hash` de cette chaîne. Ni une chaîne cohérente ni une empreinte ne prouvent à elles seules un résultat métier ou un stockage externe infalsifiable.

## Ce qui est UI, PostgreSQL, simulation ou prestataire

| Preuve | Ce qu'elle établit | Ce qu'elle n'établit pas |
| --- | --- | --- |
| Clic, clavier, formulaire, rechargement Chrome | Action/état visible observé dans un contexte identifié. | Persistance, unicité, somme ou permission correcte sans assertions complémentaires. |
| Requête HTTP de la page | Route et réponse de l'appel observé. | Paiement bancaire, papier imprimé ou réception par un humain. |
| Relevé PostgreSQL privé en lecture seule | Données, relations et montants persistés au moment précis du relevé. | Action UI non exécutée, vérité du stock physique ou qualification exhaustive des droits. |
| Test React / transport fictif / intégration de laboratoire | Non-régression dans son périmètre et ses conditions documentées. | Nouveau parcours Chrome, banque réelle ou matériel testé. |
| Capture SMTP locale et PDF/MIME comparés | Message accepté dans la boîte de test et pièce jointe contrôlée pour les cas documentés. | Réception Zoho/Internet, distribution finale ou lecture du destinataire. |
| Restauration de copie documentée dans le rapport de campagne | Comparaison des tables, fichiers et PDF de cette copie à son instant. | Parcours d'un rôle dans l'écran de sauvegarde, panne physique ou RTO de production. |

Aucun essai bancaire, terminal, imprimante thermique ou tiroir réel n'est qualifié par ce document. Les validations externes restent **BLOCKED** lorsqu'il manque matériel, configuration sandbox ou accès autorisé. La vidéo demeure hors de ce périmètre métier.

## Limites Chrome et lacunes prioritaires

- Ancien contexte POS 3 : dialogue natif et sa gestion officielle restés bloqués ; aucun contournement. Le refus serveur EMPLOYEE 403 a une preuve ActivityEvent séparée à 11:53:25 UTC (`cafe-closure-refusal-readonly-1.json`). Un nouvel onglet autorisé ou la clôture OWNER ne rend pas l'ancien contrôle Chrome réussi.
- Identifiants accessibles périmés et contrôles ayant retourné une erreur d'outil : tentatives seulement, pas clics réussis ni défauts applicatifs automatiques. L'ajout restaurant en est un exemple à rapprocher.
- Champs date natifs et remplissage générique : une saisie d'outil peut ne pas devenir une valeur valide du formulaire. Les frappes répétées restaurant jusqu'à E-B-DATE ne prouvent pas une demande enregistrée.
- Changement de bundle : certains anciens onglets ont eu un import dynamique introuvable ; rechargement/reconnexion manuels documentés, pas reprise automatique universelle.
- Portail mobile : interception d'un bouton par la barre basse reproduite puis corrigée/rejouée dans un cas ciblé ; contrastes, langues, tous les formulaires et tous les formats restent partiels. Les résultats QR de A ne qualifient pas B/C.
- Captures visibles dans la conversation et export de fichiers sont deux preuves différentes. Les restrictions d'export/capture n'ont pas été contournées ; pas d'attestation d'impression physique ni de comparaison de tous les fichiers téléchargés Chrome.
- Poursuivre le service complet B, les réservations concurrentes, cuisine/bar, groupes, paiements et clôture ; consolider ses droits et demandes RH par réponses et persistance. Puis créer C avec ses propres identités et données.
- Traiter les ACL réellement absentes avant d'annoncer un profil « sans finances ». Qualifier les changements de société, révocations, accès directs et données personnelles écran par écran ; ne pas déduire une isolation exhaustive de quelques refus.
- Terminer les contrôles source reliés aux scénarios T100, les incidents réseau/serveur et les limites encore non rejouées dans Chrome. Aucun rôle n'a une recette exhaustive à ce cutoff.

## Compteurs : pas cinq heures actives, pas 3 697 PASS

Le journal public nommé 13:15 rapporte **523 tentatives UI, 512 retours d'outil, 11 erreurs d'outil, 353 clics retournés et 169 champs renseignés**. Ce sont les compteurs de cet export ; ils ne sont ni le total final de campagne, ni des contrôles source uniques, ni des scénarios PASS. Un double clic, une saisie multichamp, une observation, un rejet attendu et une erreur d'outil ne partagent pas la même unité de mesure.

Son temps d'outils UI confirmés est 1 665 064 ms ; sa fenêtre murale 11 358 040 ms. **Ces durées n'établissent pas cinq heures de tests actifs.** Attentes, préparation, corrections, compilation, tests automatisés et temps mural ne sont pas ajoutés arbitrairement à un compteur d'activité utilisateur.

Les **3 697 contrôles** viennent d'un inventaire statique de sources, pas de 3 697 clics exécutés. Leur rattachement à des écrans réellement montés, rôles, sociétés et résultats persistés reste à compléter. Ce document ne modifie ni cet inventaire, ni la matrice T01–T100, ni le checkpoint, ni les journaux existants.

**Conclusion au cutoff : campagne partielle et non livrée ; aucun rôle ni établissement intégralement qualifié, aucune qualification de production.** Les observations financières abouties du café sont conservées ; elles n'effacent pas les lacunes des autres rôles, établissements et essais externes.

## Complément daté du 17 octobre 2026 — preuves nommées 14:05 UTC

**PARTIEL — NON LIVRÉ.** Le relevé historique arrêté à 13:32:47 UTC ci-dessus reste inchangé. Ce complément décrit uniquement les observations supplémentaires déjà collectées ; il n'ajoute aucun clic, test exécuté, scénario PASS ou rôle qualifié.

Sources : [journal expurgé nommé 14:05](preuves/intensive-journal-2026-10-17-1405.json), généré à **14:01:20.660 UTC**, et [validation agrégée nommée 14:05](preuves/intensive-validation-2026-10-17-1405.json), générée à **14:03:06.936 UTC**. Le nom des fichiers n'est pas leur heure d'exécution. Le dernier événement de cet export du journal s'achève à **13:50:33.024 UTC** ; le relevé métier privé le plus récent utilisé ici date de **13:58:46.676 UTC**. Le [checkpoint](CHECKPOINT.md) et le [rapport de campagne](RECETTE-INTENSIVE-2026-10-17.md) distinguent les correctifs source, les tests et les rejeux Chrome encore bloqués.

### B — Progrès observés par rôle, sans qualification intégrale

Les preuves privées `restaurant-rh-haccp-publish-ui-1.json` à 13:40:29.111 UTC puis `restaurant-qr-apres-arret-bloque-1.json` à 13:58:46.676 conservent **cinq membres, six produits et quatre catégories**. Les deux demandes de congé et leurs décisions restent présentes. L'état financier de B n'est plus « zéro commande » : une commande QR ouverte existe désormais, mais toujours aucune vente finalisée.

| Identité / rôle réel | Actions et résultats supplémentaires étayés | Limites et suite nécessaire |
| --- | --- | --- |
| Patron / OWNER | Robi ouvert ; question explicitement limitée à la lecture de l'état local, envoyée depuis l'interface. Puis création d'une visite QR propre à B, pour la table 2. | Robi reste sans réponse acquise ; requête observée en attente, aucune action financière ni réussite de diagnostic annoncée. Les exemples ludiques visibles dans Robi ne prouvent pas le chargement d'un moteur de jeu mais restent un défaut de présentation du profil métier. |
| Responsable / MANAGER | Une demande de congé approuvée et son doublon refusé explicitement, sans suppression. Créneau unique du **18 octobre, 18:00–22:00 Europe/Luxembourg**, section Terrasse dans la saisie UI ; publication vers la capture SMTP locale. PostgreSQL conserve une ligne `CONFIRMED`, 16:00–20:00 UTC. | La section n'est pas exposée en clair dans le relevé privé : la preuve UI/publication et l'état SQL sont distincts. Capture locale, pas réception Internet/Zoho ; nouveau MIME restaurant non encore vérifié. Réservations et service complet non qualifiés. |
| Serveur / caissier / EMPLOYEE | Aucun nouveau parcours financier terminé pour cette identité dans les preuves supplémentaires. | Le défaut de projection des couverts natifs vides a un correctif source et des tests ; son rejeu Chrome reste à faire après reprise. Ni paiement, facture, clôture ni préparation complète ne sont attribués à B par extrapolation depuis A. |
| Employé « limité » / EMPLOYEE | Soumission du formulaire de congé au double clic : **deux POST 201** observés. Rechargement après les décisions MANAGER : deux demandes conservées, l'une `APPROVED`, l'autre `REJECTED`. | Le doublon est une anomalie réelle, pas deux succès métier voulus. La garde UI single-flight est testée mais pas encore rejouée dans Chrome ; idempotence serveur/rechargement/multi-onglet non implémentée. Aucun nettoyage des deux lignes. ACL distincte toujours **NOT IMPLEMENTED**. |
| Employé « sans finances » / EMPLOYEE | Tentatives de caisse/rapport et de création de devis refusées dans les parcours rapportés ; zéro devis enregistré. Saisie HACCP et consultation de l'historique : une ligne `CLEANING`, `source=MANUAL`, `value=null`, déclarée conforme par l'utilisateur. | Ce nettoyage est une déclaration fictive, pas une température ou une mesure de sonde. Ces refus ciblés ne constituent pas une interdiction générale de lire les finances. ACL distincte toujours **NOT IMPLEMENTED**. |
| Client QR anonyme | Contexte indépendant en largeur 390 tactile ; entrée à 6,50 EUR et plat à 18,90 EUR ; panier puis envoi au double clic. Un POST 201 de commande est observé, et une seule commande de deux lignes est retrouvée. | Pas de seconde tournée, transfert/fusion, acompte ou paiement de B qualifié. Rechargement et reprise après redémarrage restent à exécuter ; aucune URL de visite n'est publiée. |

### B — Commande QR rapprochée, pas encaissement

Le relevé `restaurant-qr-apres-arret-bloque-1.json` confirme à **13:58:46.676 UTC** :

| Objet | État observé | Interprétation |
| --- | --- | --- |
| Commande | Une ; source `GUEST`, statut `OPEN`, créée à 13:45:17.446 UTC ; deux lignes | Commande enregistrée, pas vente finalisée. |
| Montants | TTC **25,40 EUR** = HT **24,66 EUR** + TVA **0,74 EUR** | Montants fictifs de recette ; pas validation comptable du catalogue. |
| Paiements | Payé **0,00 EUR**, restant dû **25,40 EUR** ; zéro règlement, zéro tentative prestataire | Aucun encaissement, même simulé, n'est déduit de l'envoi de commande. |
| Finalisation / stock | `finalized=false`, `paidAt=null`, `inventoryDebitedAt=null` ; zéro vente | Le stock n'a pas été débité ; stocks produits conservés à 30 / 25 / 20 / 40 / 60 / 25 dans l'ordre du relevé. |
| Caisse | Une caisse ; fond fictif **200 EUR**, aucune recette finalisée | Ouverture de caisse distincte d'une vente. |

Empreinte **canonique** du relevé privé, recalculée en lecture seule lors de cette consolidation : `3005cd3459023ec7f79f4acf3b8effa53f5295c76897746ed5467b18b1d463e0`. Canonicalisation : objets triés récursivement par clé, ordre des tableaux conservé, sérialisation JSON sans indentation. Cette empreinte n'est ni le hash des octets du fichier mis en forme ni une preuve UI en elle-même. Aucun identifiant de visite, lien privé ou contenu d'accès n'est reproduit.

### Repères supplémentaires non ambigus

Ces références utilisent **`journalPosition` + `sourceEventHash` dans l'export 14:05**, avec date UTC, opération et page. `sourceEventHash` est le champ de chaîne de l'événement privé, pas le SHA des octets complets de sa ligne ; les deux méthodes ne doivent pas être confondues. Les collisions des anciens IDs numériques restent préservées.

| Observation | Position ; début UTC ; opération ; page | `sourceEventHash` |
| --- | --- | --- |
| Double clic du congé | 964 ; 13:33:34.083 ; click ; 16 | `244fad6db63fc38351f57ae512639506f5dc946d770be61487f892b7eb753a7b` |
| Relevé réseau des deux POST 201 | 968 ; 13:34:43.158 ; list_network_requests ; 16 | `1e17e51bf42a1844c5f5242012c86fa8ef27a93eec0064061b6906c08d7baf2b` |
| Approbation MANAGER | 971 ; 13:35:29.591 ; click ; 14 | `66a883906207d16b40923ef337f55ca626e080b2c24a9f683015c7cb0de74e4a` |
| Refus MANAGER du doublon | 974 ; 13:36:19.407 ; click ; 14 | `a1245e23635ec3edc6e21a192b8edbf123d643dc373eea25ffc3f8fd06726089` |
| Enregistrement du créneau | 986 ; 13:37:49.166 ; click ; 14 | `23e9df84740ac2c4b8d903f5cde9f7f2d3401613ef4e7ddef665f0a4e7acd7be` |
| Envoi de la question Robi | 995 ; 13:39:17.680 ; click ; 13 | `4c7da05efacb86ee3abcdc2161bbde87937a3794dd00d6b45d35eb73f57f9cd0` |
| Enregistrement HACCP manuel | 998 ; 13:39:28.934 ; click ; 17 | `aed9792e1f07c384cb81bcbfa3336f9ab1ce0d86b9c0b89ac5ee993c45e15f4c` |
| Observation réseau Robi en attente | 1000 ; 13:39:43.764 ; list_network_requests ; 13 | `30d15314bfe1efa163fdf3e5f46b256a43ff4f3dfedc230434d29b01d14cb751` |
| Publication du planning | 1002 ; 13:39:46.547 ; click ; 14 | `22f507e1e2ce21333ac45728fcf041b69ce656eab8a94567b045b5579c3ea1a2` |
| Envoi de la commande QR | 1025 ; 13:45:15.123 ; click ; 18 | `31a3838e1dc346eb6e2468968f6fe86ed8f80f229c302e115675e92fa6a005f7` |
| Relevé réseau du POST QR unique | 1027 ; 13:45:43.606 ; list_network_requests ; 18 | `c54f9fab88daec5299f65c9d0b53ce135dc676a1fdd2642eb66bd74e9bbb3482` |
| Dernière fermeture normale de page dans l'export | 1041 ; 13:50:31.090 ; close_page ; 18 | `a7acb91019592fbb208a3ddef0d859ffb174234c838987e4c88c3bddf8192866` |

L'export rapporte une chaîne vérifiée pour ses **1 041 événements**. Ce document vérifie ses références mais ne transforme ni l'intégrité de chaîne ni un retour d'outil en résultat métier.

### Arrêt local et reprise encore bloqués

Selon les relevés et le checkpoint vers 14:05, la demande d'arrêt propre vers **13:45 UTC** a fermé l'API et figé la planification, mais le runtime **21664** reste retenu par une connexion frontend **5174**. Les pages fictives ont été fermées normalement avec les outils officiels ; aucun arrêt forcé, aucune fermeture des profils historiques et aucun contournement du lanceur ne sont rapportés. Le lien causal entre Robi en attente et cette connexion n'est pas établi.

Le correctif de drainage est un **correctif source**, validé sur serveurs jetables par **sept nouvelles fixtures incluses dans 41 tests locaux réussis**. Il ne modifie pas le code déjà chargé dans l'ancien runtime. **Arrêt complet, redémarrage normal et rejeu Chrome de ce runtime : BLOCKED**, pas PASS. Les gardes de congé, la projection de table native vide et les nouveaux libellés doivent également être rejoués après une reprise autorisée ; ne pas recréer la commande QR de 25,40 EUR pour reprendre le service.

Note opérationnelle transmise par le coordinateur à **14:05:43 UTC** : la capture SMTP locale a été arrêtée proprement et les EML sont conservés ; **la relancer avant tout nouvel essai d'envoi local**. Cette information est postérieure à l'export du journal 14:01 ; elle n'est pas présentée comme un nouvel événement Chrome de cet export ni comme une vérification d'envoi effectuée par ce document.

### Validations collectées et restauration supplémentaire

Les résultats ci-dessous sont ceux du fichier de validation daté, **pas des tests relancés par cette consolidation documentaire** :

| Contrôle déjà exécuté | Résultat enregistré | Limite |
| --- | --- | --- |
| Unités à 13:46 UTC | **801** : 348 backend, 336 web, 117 POS ; zéro échec/ignoré | Références de sources aux instants d'exécution ; ne couvrent pas automatiquement les modifications lifecycle ultérieures. |
| Intégrations PostgreSQL à 13:53:56–13:54:46 UTC | **277** ; zéro échec/ignoré | Laboratoire, pas banque ou matériel réel. |
| Compilations métier | Cinq applications compilées | Derniers changements compilés non rejoués dans Chrome. |
| Drainage local | **41/41**, dont sept nouvelles fixtures | Pas le redémarrage réel du runtime 21664. |
| Restauration achevée à 14:00:46.896 UTC | **81 tables, 12 fichiers et 24 PDF identiques** : 14 factures et 10 avoirs ; zéro différence d'empreinte signalée | API arrêtée, scheduling figé, zéro autre client de la base source observé à 14:00:21 ; processus frontend non entièrement arrêté. |
| Copie chiffrée | Vérification enregistrée, clé hors archive | Les 4 083 ms mesurées sur cache chaud ne constituent pas un RTO. Archives conservées ; aucune purge revendiquée. |

La preuve agrégée référence l'archive par SHA-256 `1e2d7b41bfae4fa784d45538ae84b2997af78d6df736f2c82819542764ccf001`. Cette restauration inclut l'état B/QR ; elle ne rend pas sa reprise UI réussie et ne valide aucun rôle entier.

### Couverture et compteurs actualisés, sans nouveau PASS

L'export nommé 14:05 compte **713 tentatives UI, 700 retours d'outil, 13 erreurs d'outil, 466 clics retournés et 255 champs remplis**. Ces catégories ne sont pas additionnées pour fabriquer un nombre de contrôles uniques. Ses **2 253 335 ms** d'outils UI confirmés et **13 587 770 ms** de fenêtre murale n'attestent toujours pas cinq heures de tests actifs.

**A reste partiel ; B a une commande QR ouverte et des parcours RH/HACCP ciblés ; C reste NOT RUN et non créé.** Aucun rôle intégralement qualifié. T100 et ses 3 697 contrôles restent partiels ; la matrice historique **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN** n'est pas promue par ce complément. Les ACL fines « limité » et « sans finances » restent NOT IMPLEMENTED. Aucun paiement réel, SMTP externe, matériel physique, déploiement ou qualification de production n'est déduit de ces preuves. **Statut maintenu : NON LIVRÉ.**
