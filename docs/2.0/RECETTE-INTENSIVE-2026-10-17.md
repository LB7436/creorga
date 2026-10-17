# Recette intensive multi-clients — 17 octobre 2026

**Campagne EN COURS — NON LIVRÉ. Plan initial et compte rendu intermédiaire daté.**
CréOrga n'est pas qualifié pour la production. Les résultats du lot précédent ne sont pas
présentés comme des tests de cette nouvelle campagne.

Dépôt `LB7436/creorga`, branche `codex/creorga-2-0-2026-10-08`, base
`475f67ac1357e07af478f4f237a1f6bb001bb93a` relevée par le coordinateur.
Profil `CREORGA_BUSINESS_ONLY` conservé ; jeux conservés dans Git.
Le [plan structuré initial](preuves/intensive-plan-2026-10-17.json) conserve les 222
scénarios préparés et l'agrégation lexicale de l'inventaire T100. Ses statuts initiaux
NOT RUN sont remplacés seulement pour les cas documentés dans le
[suivi intermédiaire](preuves/intensive-resultats-2026-10-17-1150.json) : **12 PASS
ciblés, 2 BLOCKED, 208 NOT RUN ou qualification incomplète** ; préparation séparée.
Aucune promotion automatique de la matrice T01–T100 et aucun parcours complet de rôle.

## Consolidation après les rejoués du 17 octobre — NON LIVRÉ

La mission maître conserve A Café, B Restaurant et remplace C par **BAR DES AMIS** ;
la préparation boulangerie reste conservée à part, pas comptée comme troisième client.
Les états datés plus anciens ci-dessous restent des preuves historiques.

- Régression finale confirmée : **861 unités (391/349/121), 295 PG, 47 fixtures locales**,
  deux profils compilés cinq applications. [Preuve finale v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json),
  source stable et même empreinte ; ne pas additionner les anciennes relances.
- Chrome réellement rejoué : règlement final Jardins, ancien QR refusé en lecture
  et à l'envoi ; Bar KDS, acompte puis solde mixte, visite conservée pendant acompte
  puis révoquée au solde, nouveau groupe sans ancienne addition ; planning nuit avec
  date de fin explicite, congé approuvé, rapports de clôture persistants, vrais refus
  EMPLOYEE des sessions de caisse. Les lectures de CA encore permises et ACL absentes
  sont signalées, pas qualifiées artificiellement.
- Rapprochement : Café **21,10 € TTC**, Restaurant **84,50 € TTC** et Bar **38,04 € TTC**.
  Factures, avoirs, remboursements et espèces de fond ne sont pas ajoutés au CA.
  Clôtures comptées A **106,80** / B **276,05** / C **118,90**, écarts fictifs motivés.
  Zéro anomalie financière détectée par les relectures bornées ; ce n'est pas une
  garantie sur tous les scénarios non exécutés. Deux anciens pointages ouverts Café
  sont préservés et restent à examiner, sans correction rétroactive.
- Arrêt normal du seul runtime 23808, ports libérés ; restauration finale dans une
  nouvelle base le **17 octobre à 19:31:36.908 UTC** : **81 tables, 10 083 lignes,
  14 fichiers et 26 PDF identiques**, copie chiffrée à clé séparée. Laboratoire arrêté
  à la consolidation, sans arrêt forcé ni purge. Raccourci inchangé, pas double-cliqué.
- [Journal 21:32](preuves/intensive-journal-2026-10-17-2132.json) : **1 119 tentatives UI,
  1 096 retours, 23 erreurs d'outil, 731 clics retournés, 368 champs**. Pas des contrôles
  uniques ni des scénarios PASS ; cinq heures actives non attestées. Tentative de
  capture fichier non vérifiée et refus lexical du journal documentés, sans invention
  de PNG. CSV réellement cliqués, octets téléchargés non inspectés.

Verdict : **pas prêt pour un premier pilote en exploitation**. Robi métier indisponible,
politique d'accès fin à définir/implémenter, nombreux parcours par rôle/écran à qualifier,
runtime Node à corriger isolément, matériel et prestataires externes non éprouvés.
Conserver les gardes, prix/TVA/provenances historiques et les jeux dans Git ; aucune
réécriture générale ni activation vidéo/Stripe Refunds décidée. La publication des
correctifs validés n'est pas la livraison complète de cette campagne.

[Checkpoint](CHECKPOINT.md), [traçabilité](TRACABILITE-UI-API-PG-2026-10-17.md),
[café](RECETTE-CAFE-2026-10-17.md), [restaurant](RECETTE-RESTAURANT-2026-10-17.md),
[bar](RECETTE-BAR-2026-10-17.md), [sécurité](SECURITE-MISSION-MAITRE-2026-10-17.md),
[architecture et comparaison](ARCHITECTURE-AUDIT-2026-10-17.md),
[sauvegardes](SAUVEGARDES-MISSION-MAITRE-2026-10-17.md).

## Relevé intermédiaire du 17 octobre vers 14:05 UTC

**NON LIVRÉ.** A partiel, B créé et en cours, C non créé ; aucun rôle ni les3697
contrôles entièrement qualifiés. Les sections datées plus anciennes ne sont pas
l'état courant. [Reprise précise](CHECKPOINT.md), [couverture par rôle](INTENSIVE-COUVERTURE-PAR-ROLE.md),
[validation exécutée](preuves/intensive-validation-2026-10-17-1405.json).

Le [journal expurgé nommé14:05](preuves/intensive-journal-2026-10-17-1405.json)
est généré à14:01:20UTC, dernière action à13:50:33. **713tentatives UI,700retours,
13erreurs d'outil,466clics retournés et255champs remplis.** Un retour d'outil n'est
pas un verdict métier. Les2253335ms d'outils UI confirmés et13587770ms muraux ne
prouvent pas cinq heures actives. Sept anciens IDs numériques répétés sont conservés ;
position+hash d'événement du nouvel export permettent une référence non ambiguë.

### Résultats supplémentaires réellement observés

| Établissement / action | UI et HTTP observés | PostgreSQL / preuve privée complémentaire | Limite |
| --- | --- | --- | --- |
| Café, reprise remboursement refusé | Même demande409 typée, décision explicite Modifier, puis déclarations valides | Quatre remboursements10,25€ au total, dont6,25espèces/4carte ; `cafe-remboursements-declares-ui-1.json` | Aucun remboursement bancaire ; originaux non réécrits |
| Café, clôture et rechargement | Deux422 sans motif, frappe clavier du motif puis200 ; historique rouvert | Théorique106,85€, compté106,80€, écart-0,05€, instantané figé ; `cafe-cloture-comptage-ui-1.json` | Comptage fictif ; CSV cliqué mais fichier non rapproché |
| Restaurant, création/catalogue | Inscription201, quatre comptes employés201, six produits, quatre catégories, quatre tables | Cinq membres, six produits et prix/stocks rapprochés ; `restaurant-catalogue-reference-ui-1.json` | OWNER/MANAGER/3EMPLOYEE, pas cinq ACL distinctes |
| Restaurant, caisse | Double clic ouverture :201/200 | Une caisse, fond fictif200€, zéro recette ; `restaurant-table-vide-disparue-1.json` | Table native vide disparaît de la projection ; fix testé, UI GREEN restant |
| Restaurant, congés | Double clic → deux201 ; MANAGER approuve l'un et refuse l'autre ; salarié relit les deux | Deux lignes conservées, APPROVED/REJECTED ; `restaurant-rh-haccp-publish-ui-1.json` | Correctif single-flight UI testé, pas encore rejoué ; idempotence multi-onglet absente |
| Restaurant, planning | Créneau18oct18–22h/Terrasse, publication200 | Une ligne CONFIRMED, heures UTC16–20 ; capture SMTP locale | Nouveau MIME pas encore vérifié ; ni Zoho ni réception Internet |
| Restaurant, HACCP | Saisie de nettoyage manuel puis historique | Un CLEANING manuel, valeur numérique absente ; `restaurant-rh-haccp-publish-ui-1.json` | Pas de sonde ou mesure automatique |
| Restaurant, QR mobile390 | Soupe6,50 + plat18,90 ; panier25,40 ; double clic Envoyer → unPOST201, addition25,40 | Une commande, deux lignes, HT24,66/TVA0,74, payé0/solde25,40, aucune vente/stock débité ; `restaurant-qr-apres-arret-bloque-1.json` | Pas de seconde tournée ni de paiement ; rechargement post-redémarrage restant |
| Restaurant, droits EMPLOYEE | Caisse/Rapports refusés403 ; création devis refusée403 et message visible | Zéro devis créé | Lecture financière et ACL fines ne sont pas entièrement qualifiées |
| Restaurant, Robi | Question sans modification/envoi ; UI en attente, aucune réponse acquise | Aucune opération financière annoncée | Requête non aboutie ; exemples de jeux encore affichés en profil métier |

Les prix et taux utilisés sont des données fictives de recette, pas une validation
comptable du catalogue. Le stock du restaurant ne doit pas être débité tant que sa
commande n'est pas finalisée. Le supplément de légumes est un article indépendant,
pas une preuve de gestion des variantes/suppléments liés.

### Défauts supplémentaires et arrêt bloquant

- **INT-22/P1 — Couverts natifs initialement vides perdus par projection :** deux
  couverts persistés à l'ouverture de table, puis bootstrap vide et écran sans produits.
  Correction limitée aux couverts natifs initialement vides/impayés ; ne pas ressusciter
  les lignes déjà consommées. Tests backend/POS ajoutés ; Chrome à rejouer.
- **INT-23/P1 — Double demande de congé :** deuxPOST201 sur double clic. Garde UI
  immédiate testée, verrou sur résultat réseau ambigu et absence de faux échec après
  création confirmée. Idempotence serveur/rechargement/multi-onglet **non implémentée**.
  Les deux demandes sont préservées et décidées séparément, pas supprimées.
- **INT-24/P1 — Arrêt local retenu par HTTP inactif :** arrêt demandé vers13:45UTC,
  API fermée mais runtime21664 reste présent avec connexion frontend5174. Préconnexion,
  en-têtes incomplets et keep-alive reproduits sur fixtures ; raccord lifecycle corrigé,
  nouvelles admissions refusées, POST admis attendu. Sept tests nouveaux et41locaux
  réussis. Aucun correctif à chaud ni arrêt forcé : reprise réelle **BLOCKED** en
  attente d'autorisation. L'incident Robi reste distinct, cause du drainage non attribuée.
- **P2/non qualifiés :** onboarding proposé aussi aux salariés sans pouvoir de
  configuration ; tableau de connexion vantant les jeux malgré le profil métier
  (garde conditionnelle compilée, rejeu restant) ; rapports/journal à relire après leurs
  nouveaux libellés ; variantes, réservations, impression/banque et écran Robi non qualifiés.

### Validations et sauvegarde conservatoire

**801unités (348backend,336web,117POS)** exécutées à13:46, **277PostgreSQL**
à13:53:56–13:54:46, zéro échec/ignoré ; cinq compilations métier réussies. Le correctif
lifecycle ultérieur est couvert séparément par **41tests locaux**, dont sept nouveaux,
pas par un redémarrage du processus chargé avant sa modification.

Restauration réellement achevée à**14:00:46.896UTC** : **81tables,12fichiers,
24PDF (14factures/10avoirs) identiques**, AES-GCM et clé séparée, zéro différence,
4083ms sur cache chaud (pasRTO). API arrêtée, scheduling figé et aucune autre connexion
à la base source observée à14:00:21 ; le processus frontend n'est pas déclaré arrêté.
Toutes les archives restent présentes. Aucun PASS bancaire ou matériel, aucune
production ni profil historique touché. Aucun nouveau commit/push de cette campagne.

Reprise : autorisation explicite pour le seul runtime résiduel, vérification préalable,
redémarrage normal, rejeux INT-22/INT-23 et des libellés, reprise de la commande B25,40€
déjà stockée sans duplication, puis parcours B et C. **T100 reste partiel.**

## Historique intermédiaire du 17 octobre vers 12:55 UTC

**NON LIVRÉ, café en cours, B/C non créés.** Dernière comparaison12:52:45UTC :
quatre ventes21,10€ TTC/20,03HT/1,07TVA, zéro restant dû ; produits97/59/46/19/100.
Les avoirs10,25€ et le remboursement carte déclaré4€ sont séparés des ventes.
Caisse encore ouverte,113,10€ théoriques avant les remboursements espèces attendus.

| Parcours Chrome supplémentaire | Observé et comparaison | Statut de limite |
|---|---|---|
| Reprise de l'avoir refusé11€ | Même référence, preuve409, clic explicite Modifier, puis2,50€ et solde7,75€ en deux avoirs uniques | Original figé/hash inchangé, TVA totale75c ; pas un remboursement |
| Remboursement2,50€ sur règlement sélectionné2,25€ | Refus409, zéro écriture pour cette demande ; formulaire figé | Erreur de sélection reconnue ; reprise logicielle corrigée/testée, Chrome à rejouer |
| Remboursement carte4€ | Double clic, une déclaration et justificatif proposés | Simulation, aucune banque/terminal réel |
| Transfert des QR | Trois commandes au comptoir200, total10,85€, anciens liens révoqués403 | Groupes/provenances et stock conservés |
| Séparation groupe fermé | Refus409 explicite, aucune somme déplacée | Limite conservatrice, pas réussite de séparation |
| Séparation groupe actif | GroupeQR4 de1,25€ vers salle200, autres9,60€ au comptoir | Pas de nouveau règlement/préparation |
| Paiement QR4 | Double clic, déclaré1,25€, monnaie0,75€, en-tête1,25/0 après groupe vidé | Rejeu positif du défaut INT-15 |
| Acompte des deux tournéesQR |3€ répartis81c/219c, reload puis reconnexion, reste6,60€ | Pas de débit stock avant soldes ; session POS non persistée au reload, reconnexion manuelle |
| Solde mixte des QR |2,60espèces/4carte, total historique9,60€, rendu2,40€ | Déclarations fictives, pas de capture bancaire |
| Journal caissier | Bouton de clôture absent, ventilation espèces/carte visible | Ancienne page3 native non qualifiée, nouveau contexte autorisé |
| Portail corrigé |375/390/768/1440 ; dernier Ajouter atteint au clavier et clic réel390 sans interception | Contraste/langues non intégralement qualifiés |

Nouvelle anomalie INT-19 : reprise de déclaration de remboursement refusée figée.
Correctif NOT_RECORDED limité à un plafond indépendant des réservations, décision
explicite et trace locale ; aucun abandon sur une réservation prestataire seule.
INT-20 : Journal appelle Encaissé les seules ventes finalisées, sans acomptes ni
remboursements ; texte corrigé en Ventes TTC avant avoirs + périmètre/lien de rapprochement,
calculs inchangés. Les deux corrections exigent encore leur rejeu après compilation.
INT-18 (avoir figé) et INT-15 (en-tête soldé) ont désormais leur rejeu positif ciblé.

Suites fraîches : **778unités (343/320/115),277PostgreSQL**, aucun échec/ignoré.
Nouvelle restauration12:55:27UTC : **81tables,10fichiers,24PDF égaux**, dont14factures
et10avoirs du laboratoire complet. Pas24nouveaux documents de campagne.3941ms sur
cache chaud, pas un RTO. Aucune archive supprimée.

[Journal intermédiaire12:50](preuves/intensive-journal-2026-10-17-1250.json) :485tentatives,
475retours,10erreurs d'outil,325clics retournés ; temps d'outils UI confirmés1463688ms,
environ165min de fenêtre murale. **Pas cinq heures actives**, pas485contrôles T100PASS.
Le premier collecteur SQL du solde a été interrompu sans preuve disponible ; pas de
nouveau paiement. La seconde lecture seule, fichier2 distinct, a confirmé les chiffres.

## Historique intermédiaire du 17 octobre vers 12:30 UTC

Campagne **NON LIVRÉE**, café seul en cours ; B/C non créés. Le client QR a désormais
été réellement parcouru dans trois contextes anonymes (deux convives du premier groupe,
puis un groupe neuf). Aucun parcours intégral de rôle/établissement n'est encore annoncé.

[Journal 12:30](preuves/intensive-journal-2026-10-17-1230.json) : 412 tentatives UI,
404 retours, huit erreurs d'outil, 275 clics retournés. Fenêtre murale environ145min,
temps d'outils UI confirmés1 249 286ms : **cinq heures actives non établies**.
Les erreurs d'identifiants accessibles périmés restent des erreurs d'outil, pas des
défauts applicatifs. Le clic produit intercepté par la barre fixe est, lui, reproduit
avec capture et lecture géométrique DOM : centre du bouton Eau à787px, nav dès782px,
`elementFromPoint` retourne Avis. Défilement réel End permet ensuite l'ajout attendu.

| Parcours réellement exécuté | Résultat observé | Limite |
|---|---|---|
| Facture depuis ticket, double clic puis émission | INV-2026-0001, 10,25 €/HT9,50/TVA0,75, une seule vente | Règlement déclaré, pas banque vérifiée |
| PDF A4/58/80 | Trois GET Chrome200 ; copies API/PDF SQL contrôlées ; trois rendus inspectés | Pas de comparaison du fichier téléchargé Chrome, ni d'impression physique |
| E-mail facture, double clic | POST202, un EML correspondant parmi trois ; PDF joint13 177octets identique au SQL | Capture SMTP locale seulement ; ni Zoho ni lecture |
| Avoir11€ sur10,25€ | Deux essais de la même référence refusés409, zéro avoir | Formulaire figé : correctif prêt, rejeu UI restant ; aucune référence supprimée manuellement |
| QR première tournée | Un espresso2,60€, commande201, addition après reload2,60€ | Prix serveur, aucun paiement/stock finalisé |
| QR deuxième tournée | Deux eaux + sandwich7€, double clic → un POST201, total visite9,60€ | Aucun supplément/consigne de panier inventé |
| Second convive/tablette | Autre contexte, même visite :9,60€ | Même groupe autorisé, pas encore séparation/fusion |
| Révocation et renouvellement | Ancien lien403 et message ; nouveau contexte/nouvelle visite0€ | Impayés9,60€ conservés pour personnel, pas annulés |
| Allemand | Navigation et certaines actions traduites après rechargement | Textes français encore présents ; multilingue incomplet |

Contrat portail relu : commande autorisée par capacité de visite, sans compte ; le texte
« inscription requise » est erroné, aucun réglage registrationMode n'existe. Correction
minimale : inscription facultative, sans affaiblir le contrôle des visites. La fiche CRM
facultative n'est pas une identité vérifiée et ne prouve pas un historique de commandes.
Profil sans jeux conservé. Paiement en ligne non configuré, bouton désactivé honnêtement.

Validations fraîches sur le code corrigé : **343 backend +277 web +114 POS =734 unités**,
**257 PostgreSQL**, zéro échec/ignoré. Douze gardes exportPDF et dix gardes MIME séparées,
non ajoutées à ces suites métier. Ces validations ne remplacent pas les rejeux Chrome.
Correction d'un ancien test e-mail : destinataire `.invalid` au lieu de `.test` pour
respecter EMAIL_TEST_ONLY ; aucune désactivation du garde de sécurité.

Les copies privées du PDF A4 SQL/API ont le SHA-256
`3007ab4fc7629364fdfdea24f907b688631ef950dbbcb040aaad80edcf038f8f`.
Le message MIME capturé pèse18 923octets, SHA-256
`fdcbfff6451ca58ac5738ed66c9c0ae8dd90c80a8adba2b4348df7e962db54d1`.
Le bouton e-mail des rapports ne passe pas par SMTP : il prépare un `mailto:` ;
son appel interrompu n'est pas présenté comme envoyé. Les autres pages Chrome restent
utilisables malgré le contrôle natif de clôture bloqué en page3. Aucun contournement.

## Historique intermédiaire du 17 octobre vers 11:45 UTC

Toujours **un seul établissement parcouru partiellement**. B/C et client QR NOT RUN.
[Journal public 11:45](preuves/intensive-journal-2026-10-17-1145.json) : 340 tentatives,
336 retours UI, quatre erreurs d'outil, 221 clics retournés ; ces nombres ne mesurent
pas les contrôles source uniques. Environ 101 min de fenêtre murale et 1 015 027 ms
d'outils UI confirmés, **pas cinq heures de tests actifs**.

Le contrôle Chrome de la clôture EMPLOYEE est **BLOCKED** : le clic puis la fermeture
officielle du dialogue n'ont pas rendu. La source utilise une alerte native après
erreur ; diagnostic plausible, sans inventer la réponse de l'appel bloqué. Ne pas
répéter la clôture. Une lecture ciblée supplémentaire à **11:53:25 UTC** confirme
le chemin exact POST /pos/close, rôle EMPLOYEE,403 dans ActivityEvent à11:41:18 UTC,
une vente, la caisse ouverte et **zéro PosClosure**. Le refus serveur est donc prouvé
indépendamment ; le retour Chrome reste bloqué. Les attentes ne sont pas des clics
réussis ni du temps actif ajouté.

| Parcours réel supplémentaire | Résultat visible / HTTP | Comparaison PostgreSQL et limites |
|---|---|---|
| Ancien brouillon divergent | Réessayer → 409 explicite ; rechargement et refus de l'import ; trois vrais clics produit | Quatre lignes confirmées à 10,25 €, ancien Espresso 2,50 € conservé ; reprise **manuelle**, pas récupération automatique |
| Quantité + puis − ; notes ticket/cuisine | 12,85 → 10,25 € ; notes saisies au clavier ; sauvegardes confirmées | Dates historiques protégées dans le correctif ; tickets de correction explicites, pas deux ventes |
| Transfert Table 1 → Table 2 | Confirmation UI, POST table-movements 200, destination correcte | Une TableMovement ; quatre lignes distinctes au même prix ; ancien QR non testé, aucune visite QR créée |
| Préparation | Commencer → prêt → servi, actualisation ; trois PATCH 200 | Preuve d'un parcours KDS, pas d'impression ou de préparation physique |
| Acompte de 4 € | Double clic, une demande 200 ; reçu 5 €, rendu 1 €, reste 6,25 € | Une commande ouverte, acompte 400 c, pas encore de vente finalisée ni débit stock |
| Solde mixte | Réseau coupé : erreur et solde conservé ; rétabli : même requestId, 200, reste zéro | Une vente 1 025 c, HT 950 c, TVA 75 c ; espèces 625 c, carte déclarée 400 c ; pas de preuve bancaire |
| Stock après vente | Journal : une vente, 10,25 €/TVA 0,75 € | Produits 98/59/49/20/100, ingrédient toujours 5 kg ; aucune consommation de grains inventée |
| Table soldée puis fermeture | Montant zéro ; fermeture → à nettoyer ; journal conserve une vente | Occupation physique distincte du solde financier ; clôture comptable non faite |
| Salarié désactivé puis réactivé | Login refusé avec contact propriétaire ; réactivation puis login au bon café | Rôle EMPLOYEE conservé ; pas d'ACL « sans finances » ajoutée |
| Pointages | Conflit historique explicite ; double entrée/sortie Limité puis reload : une ligne fermée | Deux anciens ouverts SansFinance préservés, une nouvelle ligne Limité fermée ; pas de correction automatique |
| Devis | Deux créations et reload : QUO-0001 16,15 €, QUO-0002 1,03 € lié au contact | Totaux/TVA reconstitués depuis lignes comparés au TTC persisté ; aucun devis converti ni encaissé |
| Planning envoyé à nouveau | Confirmation UI un e-mail ; deuxième EML local à 11:35:15 UTC | 3 478 octets, hash/MIME vérifiés ; café/salarié/date/horaires/Bar présents ; pas Zoho/Internet |
| Restauration avant finance | Arrêt propre puis nouvelle archive/copiedb et redémarrage | À 11:29:28 UTC : PostgreSQL égal et dix fichiers identiques, AES-GCM/clé séparée ; copie antérieure à la vente |

Le premier devis a été réellement créé sans client/notes : la première saisie via
outil ne les a pas transmis. Le second utilise sélection et frappe clavier, liaison
réussie ; aucun défaut applicatif de liaison n'est affirmé sur la seule première tentative.

État complémentaire des anomalies : INT-07/08/09/10/11 ont un rejeu positif ciblé et
une comparaison SQL/capture ; leurs périmètres complets ne sont pas déclarés certifiés.
INT-14 (P0) : paiement serveur confirmé suivi d'une erreur locale/GET pouvait rendre
le parcours en échec ou effacer une saisie plus récente — correctif conservateur,
tests et revue, compilé ; rejeu de panne Chrome encore NOT RUN.
INT-15 (P2) : après solde, en-tête « déjà enregistré 0 » malgré résultat confirmé
10,25 € — correctif et13 tests React GREEN, rejeu restant. INT-16 (P1) : alerte native
de refus403 de clôture et bouton proposé à EMPLOYEE — correction sans alerte et11
tests React GREEN, rejeu restant. INT-17 (P2) : libellé journal « Espèces » seul pour
le mixte — ventilation corrigée dans le code, même suite. Ces faits n'autorisent pas
la production. La campagne reste NON LIVRÉE et n'a aucun nouveau commit publié.

Preuves privées nouvelles : `cafe-seat-reprise-green-1.json`,
`cafe-acompte-ui-1.json`, `cafe-reglement-mixte-ui-1.json`,
`cafe-apres-cloture-bloquee-1.json`, `cafe-quotes-readonly-1.json`,
`cafe-pointages-transfert-readonly-1.json`, `cafe-planning-section-capture-2.json`,
`cafe-closure-refusal-readonly-1.json`.
Ces fichiers restent hors Git, comme le registre et les e-mails bruts.

## Historique intermédiaire du 17 octobre vers 11:15 UTC (non actuel)

Seul **A — CAFÉ DU CENTRE** est créé. Ses cinq identités internes distinctes ont été
connectées dans cinq contextes Chrome neufs ; cela ne signifie pas que leurs parcours
sont achevés. Client QR, B et C : **NOT RUN**. Aucun paiement, aucune vente finalisée,
aucune facture émise à ce relevé. Le fond de caisse fictif est de 100 €.

[Journal public expurgé](preuves/intensive-journal-2026-10-17-1115.json) : chaîne privée
vérifiée, 253 tentatives UI dont 250 retours d'outil réussis et trois erreurs d'outil ;
161 clics souris retournés (double clic compté deux fois), 125 champs renseignés.
Ces nombres ne sont ni des scénarios PASS ni des contrôles T100 uniques. Fenêtre murale
environ 68 min ; temps cumulé des outils UI confirmés 774 784 ms. **Cinq heures actives
non établies** ; aucun sommeil ni intervalle inventé n'est ajouté.

Actions observées : inscription et erreurs de formulaire, trois salles/quatre tables,
dix chaises, cinq produits/trois catégories, cinq membres, paramètres société,
modification de tarif, fond de caisse au double clic, accès responsable/employés,
congé invalide puis valide puis approuvé, tentative d'auto-approbation refusée,
créneau, publication de planning en échec puis reprise SMTP locale, client société,
fournisseur, ingrédient fractionnaire, bon et double clic de réception, révocation
en session et nouvelle tentative de connexion. Les captures sont intégrées à la
conversation ; leur export fichier refusé n'a pas été contourné.

### Rapprochements déjà constatés (fictifs)

| Action UI | Requête observée | Stockage vérifié | Résultat observé | État de preuve |
|---|---|---|---|---|
| Double clic ouverture avec 100 € | POST caisse 201/200 | Une CashDrawer, fond 10 000 c | Une caisse, pas deux fonds | UI + PostgreSQL ; encore ouverte |
| Tarif Espresso 2,50 → 2,60 € | Mise à jour catalogue | Product 260 c ; ligne/quote de chaise 250 c, TVA 3 % | Prix historique conservé | UI/reload + SQL à 10:50:17 |
| Congé du 21 octobre | POST invalide 400 puis valide 201 ; décision employé 403 et responsable 200 | LeaveRequest APPROVED, bon salarié/société | Demande approuvée relue par l'employé | UI + HTTP + SQL |
| Shift 18 octobre 06–12, pause 30 min | Création puis GET RH | Shift 04–10 UTC, bon salarié | 06–12 Europe/Luxembourg, carte retrouvée | UI + DOM/AX + SQL |
| Publication du planning | 207 avant boîte locale, puis confirmation | SMTP .eml synchronisé, shift CONFIRMED | Bon café/salarié/horaires ; section Bar initialement omise | Réception SMTP **locale**, pas Zoho ni Internet |
| Comptage ingrédient à 1,5 kg | Mise à jour stock | Ingredient.currentStock 1,5 | Valeur 27 € à 18 €/kg, reload égal | UI + serveur |
| Réception fournisseur de 3,5 kg au double clic | PUT receive 401 puis refresh 200 et reprise 200 | Un PurchaseOrder RECEIVED, Ingredient 5 kg | Stock 5 et non 8,5 kg ; valeur 90 € | UI + HTTP + SQL à 11:08 |
| Désactivation du salarié limité | Modification membre | Relecture API de l'ancienne session | Tous les appels métier observés 403 | UI + HTTP ; admission au login à corriger |

Les stocks de produits vendables et d'ingrédients sont distincts ; aucune consommation
de grains par Espresso n'est déduite sans recette implémentée. Le bon de 63 € n'est
pas un règlement fournisseur ni une facture. L'historique des mouvements de stock
n'est pas inventé à partir de la seule quantité finale.

### Défauts et état réel des corrections

| Réf. | Niveau | Constat | État à ce relevé |
|---|---|---|---|
| INT-01 | P1 | Chaises vides transformées en occupation | RED→GREEN PostgreSQL ; reprise Chrome : table reste libre puis premier article l'occupe. Ancienne reproduction préservée |
| INT-02 | P1 | Dashboard sur autre source ; capacité affichée comme clients | Corrigé et rejoué : 2/4 tables, badge explicite, zéro vente payée |
| INT-03 | P2 | CTA bandeau caisse n'ouvre pas la confirmation | Correctif/tests compilés ; rejeu d'une caisse connue fermée restant |
| INT-04 | P1 | Tables de salles différentes superposées, clic sur mauvaise table | Correctif/rejeu Chrome : bonne salle, bonne table, 2,50 € ; fermeture impayée refusée |
| INT-05 | P1 | Après 403, caisse faussement dite fermée avec boutons | Correctif/rejeu Chrome : accès refusé sans ouverture/clôture ni ancien fond |
| INT-06 | P2 | Carte planning masquée dans arbre accessible | Correctif/rejeu Chrome : nom et horaire exposés séparément ; pas de perte en base |
| INT-07 | P1 | Double clic Entrée crée deux pointages ouverts (deux 201) | Preuve UI/SQL ; verrou transactionnel et 13 tests PG écrits ; runtime/rejeu restants. Deux lignes fautives préservées |
| INT-08 | P2 | Section Bar absente de l'e-mail de planning | Capture MIME réelle ; correctif/template testé, nouvelle réception locale restante |
| INT-09 | P1 | Simple ajout POS employé refusé comme configuration | Trois PUT draft 403 ; comparaison canonique corrigée en test ; reprise Chrome restante |
| INT-10 | P0 | Ligne seat: modifiée dans une projection mais pas sa source | Ancien brouillon UI 10,25 € contre base 2,50 € ; risque de perte au roundtrip reproduit en test, écriture bloquée ; unification et garde 409 en cours |
| INT-11 | P1 | Login salarié sans adhésion active accepté vers faux accueil/setup | Données métier restent 403 ; correction admission en cours |
| INT-12 | P2 | Ancien onglet après recompilation demande un chunk supprimé | Erreur 404/dynamic import ; rechargement proposé rétablit Pointages. Reprise automatique non qualifiée |
| INT-13 | Fonction absente | ACL distincte « sans finances » | EMPLOYEE commun aux trois salariés ; devis/factures lisibles, mutations interdites 403. Ne pas déclarer le rôle spécialisé livré |

**Point de reprise délicat :** page Chrome 3 garde le brouillon POS non confirmé à
10,25 €. Ne pas cliquer Réessayer tant que la double projection n'est pas sécurisée.
Preuve privée du bootstrap et du dernier PUT rejeté conservée, sans en-têtes ni jetons.
La base garde une seule ancienne ligne Espresso à 2,50 €. Après preuve de refus 409,
les trois ajouts fictifs pourront être rejoués explicitement dans l'UI corrigée ; ce
sera une reprise manuelle documentée, pas une récupération automatique revendiquée.

Le compte limité est temporairement désactivé pour le test d'admission. SansFinance
garde deux pointages ouverts comme preuve, aucune clôture ou purge de correction.
Les autres données et archives restent intactes. Aucun nouveau commit ou déploiement
à ce relevé ; les corrections ne sont pas toutes qualifiées dans Chrome.

## Ce qui est acquis et ce qui ne l'est pas

Le [checkpoint précédent](CHECKPOINT.md) et [sa carte des stores](FIABILITE-PROFIL-METIER.md)
sont les références de reprise. Auth/portée, POS autoritaire PostgreSQL, CAS/UUID, modules,
planning, portail, stock actif et documents sont déjà cartographiés. Ne pas réimplémenter
les protections terminées pour les compter comme nouvelles fonctionnalités.

Matrice historique inchangée : **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN**, T100 partiel.
Les 584 unités, 201 intégrations PostgreSQL et 42 parcours Chrome du précédent lot sont
historiques : ce plan ne les relance ni ne les attribue à la nouvelle campagne.

Au seul instant de rédaction de ce squelette, aucun clic, paiement, contrôle API/SQL ou
temps actif n'est revendiqué par ce document. Les événements réellement exécutés par le
coordinateur devront compléter les preuves de campagne ; ces zéros initiaux ne remplacent
pas un relevé final. Cible **18 000 secondes actives au minimum**, non démontrée ici.

## Ordre et garde-fous

1. Vérifier le laboratoire, le profil métier, les services et l'absence d'effets externes.
2. Sauvegarder une copie cohérente avant la première mutation, sans rotation ni purge.
3. Vérifier URL et origine avec les capacités officielles de contrôle Chrome avant toute action.
4. Parcourir **A — CAFÉ DU CENTRE**, puis **B — RESTAURANT DES JARDINS**, puis
   **C — BOULANGERIE & SNACK**. Créer de nouvelles identités et sociétés, ne pas recycler
   les anciennes fixtures. Achever le rapprochement d'un établissement avant de passer au suivant.
5. Tracer les clics/formulaires/navigation/rechargements réels ; API et SQL ne sont que des compléments.
6. Corriger seulement les défauts reproduits, avec RED → GREEN, reprise UI et vérification durable.

Laboratoire fictif uniquement : aucune production, aucun master, paiement ou SMTP réel,
profil historique, suppression d'archive, Stripe Refunds ou vidéo. Les secrets, mots de
passe, capacités QR, jetons, dumps, profils Chrome et pièces privées restent hors des preuves
publiques. Une capture d'un formulaire de connexion doit être expurgée.

La protection Windows du précédent lot ne permettait pas de vérifier l'URL courante.
Cela reste une limite historique, pas une autorisation de la contourner. Si l'outil officiel
ne vérifie pas sûrement l'origine, le contrôle est **BLOCKED**, sans navigation alternative
destinée à évader la protection ; seules les opérations indépendantes autorisées continuent.

## Rapports par établissement

| Ordre | Société fictive | Périmètre préparé | État initial | Réconciliation |
|---|---|---|---|---|
| A | CAFÉ DU CENTRE | Comptoir, terrasse, salle, tournées, remises, rush et clôture avec écart | NOT RUN | Non exécutée |
| B | RESTAURANT DES JARDINS | Réservation, cuisine/bar, groupes, acompte, facture société et avoir | NOT RUN | Non exécutée |
| C | BOULANGERIE & SNACK | Vente rapide, stock, fournisseurs, réception et OCR fictif si disponible | NOT RUN | Non exécutée |

Pour chaque société, conserver un compte rendu distinct : identité de campagne non sensible,
dates, écrans réellement parcourus, référence de baseline, actions, montants et stocks attendus/
observés, PDF/export, incidents, liens vers preuves et reprise. Ne pas confondre bilan
d'une société avec bilan des trois.

## Rapports par identité et capacités réelles

| Identité demandée, distincte par société | Rôle réellement disponible | Qualification attendue |
|---|---|---|
| Patron / administrateur | OWNER | Société, catalogue, utilisateurs, finance, configuration autorisée |
| Responsable | MANAGER | Service, remises, incidents, RH et limites propriétaire à vérifier |
| Serveur / caissier | EMPLOYEE | Service et caisse selon droits réellement définis |
| Employé à accès limités | EMPLOYEE | Mesurer les restrictions effectives, sans inventer un rôle supplémentaire |
| Employé sans permission financière | EMPLOYEE | **ACL distincte non établie** ; documenter l'écart si le logiciel ne permet pas cette restriction |
| Client QR | Sans compte interne | Contexte indépendant, table/visite/groupe et révocation contrôlés |

Les deux derniers salariés sont bien des identités fictives distinctes ; leur appellation
métier n'ajoute pas une permission qui n'existe pas. Aucun PASS « sans finances » fondé sur un
simple libellé de compte. Les droits d'écriture stock des employés restent une décision
métier ouverte du lot précédent. Un refus de bouton ne prouve pas à lui seul le refus serveur.

## Inventaire T100 : couverture réelle, pas source = PASS

Source : [inventaire figé](preuves/inventaire-t100-fiabilite-2026-10-17.jsonl),
SHA256 `d51d6cd16314ccd5f39011c846a6f1164e51f200bb0e7d4da05ad13faa0ec3d1`.

**402 fichiers analysés ; 279 contiennent les 3 697 contrôles ; 157 routes ; 828 gabarits.**
Zéro diagnostic de parsing. Tous les contrôles source restent **NOT RUN** au départ.
Le périmètre lexical peut inclure du code inactif, non monté, ludique ou inaccessible :
la présence source n'est ni disponibilité métier ni contrôle exécuté. Le plan conserve
le dénominateur historique, puis séparera portée métier vérifiée et exclusions justifiées.

Classement ci-dessous fondé seulement sur le chemin source : ordre de tri, pas audit de
risque exécuté. Le JSON contient les 279 fichiers et leurs comptes sans modifier le JSONL.

| Priorité proposée | Module lexical | Fichiers avec contrôles | Contrôles source | Exécutés |
|---|---|---:|---:|---:|
| P0 | POS / service | 20 | 522 | 0 (plan initial) |
| P0 | Web / inventory | 7 | 223 | 0 (plan initial) |
| P0 | Web / invoices | 4 | 109 | 0 (plan initial) |
| P0 | Web / pos | 6 | 91 | 0 (plan initial) |
| P0 | Web / accounting | 8 | 71 | 0 (plan initial) |
| P0 | Web / admin | 5 | 64 | 0 (plan initial) |
| P0 | Administration SaaS | 9 | 46 | 0 (plan initial) |
| P0 | Accès / portée / navigation | 2 | 30 | 0 (plan initial) |
| P0 | Portail QR | 8 | 23 | 0 (plan initial) |
| P0 | Web / clients | 1 | 14 | 0 (plan initial) |
| P1 | Web / composants et autres écrans | 75 | 585 | 0 (plan initial) |
| P1 | Web / crm | 7 | 244 | 0 (plan initial) |
| P1 | Web / hr | 8 | 183 | 0 (plan initial) |
| P1 | Web / haccp | 5 | 128 | 0 (plan initial) |
| P1 | Web / reservations | 2 | 83 | 0 (plan initial) |
| P1 | Web / settings | 4 | 17 | 0 (plan initial) |
| P1 | Web / owner | 3 | 15 | 0 (plan initial) |
| P1 | Web / ai | 2 | 10 | 0 (plan initial) |
| P2 | Web / guest | 49 | 411 | 0 (plan initial) |
| P2 | Web / events | 3 | 128 | 0 (plan initial) |
| P2 | Web / marketing | 3 | 127 | 0 (plan initial) |
| P2 | Web / mobile | 10 | 86 | 0 (plan initial) |
| P2 | Site vitrine | 8 | 65 | 0 (plan initial) |
| P2 | Web / ads | 3 | 60 | 0 (plan initial) |
| P2 | Web / reputation | 3 | 59 | 0 (plan initial) |
| P2 | Web / sites | 1 | 51 | 0 (plan initial) |
| P2 | Web / licences | 1 | 26 | 0 (plan initial) |
| P2 | Web / rgpd | 1 | 23 | 0 (plan initial) |
| P2 | Web / qrmenu | 1 | 20 | 0 (plan initial) |
| P2 | Web / catering | 1 | 19 | 0 (plan initial) |
| P2 | Web / community | 1 | 14 | 0 (plan initial) |
| P2 | Web / maintenance | 1 | 13 | 0 (plan initial) |
| P2 | Web / api | 2 | 12 | 0 (plan initial) |
| P2 | Web / autoorder | 1 | 12 | 0 (plan initial) |
| P2 | Web / delivery | 1 | 12 | 0 (plan initial) |
| P2 | Web / setup | 2 | 12 | 0 (plan initial) |
| P2 | Web / backup | 1 | 11 | 0 (plan initial) |
| P2 | Web / formation | 1 | 11 | 0 (plan initial) |
| P2 | Web / music | 1 | 11 | 0 (plan initial) |
| P2 | Web / onboarding | 1 | 11 | 0 (plan initial) |
| P2 | Web / clickcollect | 1 | 10 | 0 (plan initial) |
| P2 | Web / referral | 1 | 8 | 0 (plan initial) |
| P2 | Web / centralkitchen | 1 | 7 | 0 (plan initial) |
| P2 | Web / changelog | 1 | 7 | 0 (plan initial) |
| P2 | Web / sustainability | 1 | 5 | 0 (plan initial) |
| P2 | Web / billing | 1 | 4 | 0 (plan initial) |
| P2 | Web / status | 1 | 4 | 0 (plan initial) |

Couverture à publier séparément : actions UI réellement exécutées, contrôles source uniques
rattachés à une preuve, variantes société/rôle/réseau, routes effectivement visitées. Un clic
sur un gabarit n'exécute pas toutes ses instances ; un scénario n'est pas un contrôle unique.

## Journal et traçabilité

Chaque événement réel reçoit un ID immuable, une date UTC, la société et l'identité fictives,
l'origine vérifiée, le type d'action, l'état avant/après, le résultat et la référence de preuve.
Séparer les compteurs : **actions UI**, contrôles API, lectures SQL, tests automatisés et
observations passives. Pas de clic reconstruit depuis la présence d'un handler.

| Scénario | Société / identité / rôle | Route et contrôle source | Action UI | Requête observée | Table / enregistrement | Attendu | Observé | Preuve | Statut |
|---|---|---|---|---|---|---|---|---|---|
| INT-A-OWNER-01 | A / owner / OWNER | À observer, source à rattacher | Compte puis société via UI | Non observée | Non vérifié | Société neuve et isolée | Non exécuté | Aucune | NOT RUN |

Les champs non observés restent vides, pas des endpoints ou noms de tables devinés. Publier
des références et empreintes non sensibles, jamais le contenu privé ou les secrets du réseau.

## Mesure des cinq heures actives

Enregistrer des intervalles d'activité liés aux événements réels. Conserver séparément le
temps de préparation, clic/navigation/formulaire, inspection du résultat et de la persistance,
débogage, attente de compilation/outils, interruption et temps mural. Définir explicitement
ce qui est inclus dans le total annoncé. Exclure sommeil/attente inactive et autres tâches.

L'union des intervalles évite de compter deux fois une action en concurrence. Une fenêtre
ouverte cinq heures, la différence entre deux horodatages, ou des traces répétées ne prouvent
pas cinq heures de recette active. Le total reste **non établi** jusqu'à consolidation de ces
événements. À l'interruption, conserver le dernier événement confirmé et la prochaine action,
sans combler la durée manquante ni déclarer la campagne terminée.

## Rapprochements et incidents à compléter

Pour chaque parcours significatif : recharge, déconnexion/reconnexion, lecture API puis SQL
du bon périmètre ; comparer TTC/HT/TVA, vente unique, acomptes/réserves/remboursements, stock,
préparation, originaux PDF/export et audit. Relever les valeurs initiales réelles avant de
calculer des deltas. Ne jamais transformer une nouvelle facture issue d'un ticket en seconde vente.

Préparer deux contextes caissiers/QR, doubles clics, réponse perdue et reprise, révocation
en session, données invalides et conflits de société. Arrêt du serveur et panne PostgreSQL
uniquement sur copie isolée, après sauvegarde et avec reprise définie ; pas de coupure du PC.

Fonctions déjà documentées absentes à requalifier sans les présenter comme livrées :
droits intersites, correction signée après préparation, variantes serveur complètes,
réception partielle/lien fournisseur, OCR fournisseur, recettes/unités/pertes unifiés,
multilingue complet, impression matérielle et connecteurs bancaires officiels. Une
protection 409 contre une réception partielle dangereuse n'est pas cette fonctionnalité.

## Anomalies et corrections

Aucune anomalie nouvelle revendiquée par ce squelette. Pour chaque observation : référence,
P0/P1/P2/P3, reproduction UI, preuve, cause, test RED, correction/commit, GREEN, reprise UI,
persistance et limites. Ne pas effacer une preuve FAIL après correction ; lier son rejeu.

## Reprise précise et critère de fin

État documentaire initial : préparation ; prochaine société **A**, scénario
**INT-A-OWNER-01**, après sauvegarde cohérente et validation sûre de l'origine. Si des actions
ont été exécutées depuis cette rédaction, le dernier événement réel du journal fait autorité,
pas cette position initiale. Préserver toutes archives et modifications existantes.

À chaque interruption, ajouter : dernier événement, société/compte/rôle/origine actifs sans
secret, état des données/opérations incertaines, preuve de sauvegarde, anomalies ouvertes,
temps actif confirmé et prochaine action exacte. Aucun compteur fictif.

La campagne n'est terminée qu'après les trois établissements, chaque identité/rôle, les
rapprochements et le traitement des défauts critiques découverts. Les blocages et fonctions
absentes restent explicites. **Ce document initial n'est pas une livraison ni une validation
de production ; aucun commit/push ou test nouveau n'est revendiqué.**
