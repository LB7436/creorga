# Recette finale — six profils × trois établissements

## Périmètre et état de départ

Campagne **F18-20261018**, reprise sur `ab0d735f60f01bbfd0c7f914a43c2b997f280e2e`,
branche `codex/creorga-2-0-2026-10-08`. PC et référence distante vérifiés le
18 octobre. **Campagne NON LIVRÉE ; pilote NON QUALIFIÉ.**

Profil `CREORGA_BUSINESS_ONLY`. Aucun déploiement, paiement réel, fournisseur IA
cloud, profil Chrome historique, changement de master ou suppression d'archive.
Les constats des lots précédents restent des preuves historiques : ils ne sont
pas comptés comme de nouveaux clics ni comme dix-huit parcours terminés.

**Actualisation finale L3,18octobre après16:49UTC.** La nouvelle copie autorisée
a permis les six profils Restaurant et les six Bar, puis la fin du service et
du comptage Café existants. Les dix-huit combinaisons ont des actions F18,
mais **0PASS/18BLOCKED partiels/0NOT RUN de combinaison entière**. Les nombreux
sous-parcours non exécutés restent NOT RUN, pas promus par cette ouverture.
Notes POS et abandon HTTP ont maintenant leur vrai contre-essai Chrome GREEN,
trois STOPPED sans forçage, reprise même référence sans second paiement et
restauration finale82tables/21466lignes/14fichiers/26PDF égaux. Les paragraphes
L2 ci-dessous restent historiques. [État et limites L3](F18-REPRISE-INDEPENDANTE-2026-10-18.md).

**Actualisation historique14:18UTC — F18-L2.** La copie séparée explicitement autorisée a
permis de reprendre Chrome : cuisine/QR/EMPLOYEE Café, OWNER/SERVER Restaurant.
La reprise d'un solde Restaurant abandonné retrouve le commit sans deuxième POST.
L'arrêt du nouveau runtime est ensuite refusé `HTTP_WORK_UNTRACKED` ; une cause
sync+gzip est reproduite et corrigée en tests, mais son contre-essai graphique
reste bloqué. Notes POS corrigées en tests, Chrome à refaire. Restauration réelle
L2 de82tables/20012lignes/14fichiers/26PDF égaux, sans preuve d'arrêt/flush mémoire.
[Rapport détaillé, valeurs et reprise](F18-LABORATOIRE-SEPARE-2026-10-18.md).

Avant mutation : copie cohérente restaurée à 10:38:47.507 UTC dans une **nouvelle**
base de laboratoire ; **82 tables, 18 997 lignes, 14 fichiers et 26 PDF** égaux.
Archive SHA-256 `d87386aaec2c8bbce0139881264b99cea5d64fce7810e7164e0830d1149b4450`.
Chiffrement AES-GCM vérifié, clé séparée, aucune purge. Les modifications locales
préexistantes ont été copiées et vérifiées avant travail ; elles restent exclues
du futur commit.

## Critères d'une combinaison qualifiée

Pour **chaque** case : contexte Chrome neuf, identité/rôle/capacités réels,
société active visible, actions réellement montées autorisées et refusées,
résultat visuel, HTTP observé, PostgreSQL/audit pour les effets applicables,
rechargement/persistance, puis déconnexion ou expiration confirmée. Les critères
qui ne s'appliquent pas sont motivés, pas transformés en succès fictif.

Un bouton visible, un test SQL, une connexion réussie ou un composant lu ne
suffisent pas. Chaque sous-contrôle reçoit une référence de preuve ; une case
reste ouverte si un critère obligatoire est absent. Un refus attendu peut être
PASS pour ce refus, sans qualifier le parcours complet.

| ID | Profil réel | Café | Restaurant | Bar |
|---|---|---|---|---|
| OWNER | Propriétaire OWNER | A-OWNER — BLOCKED partiel : clôture57,05€, reprise copie et sauvegarde ; exports bout en bout ouverts | B-OWNER — BLOCKED partiel : QR/transfert/solde/clôture133,20€, administration/export à compléter | C-OWNER — BLOCKED partiel : droits révoqués/rétablis, stock, QR, Robi local ; administration/fiscal à compléter |
| ADMIN | Administration métier ADMIN, pas plateforme | A-ADMIN — BLOCKED partiel : tarif/stock/planning F18 ; régression complète L3 NOT RUN | B-ADMIN — BLOCKED partiel : nuit23–03h sauvegardée, CA/droits refusés ; catalogue à compléter | C-ADMIN — BLOCKED partiel : stock2,25L sans coût, nuit lisible, CA refusé ; catalogue/personnel à compléter |
| MANAGER | Responsable MANAGER | A-MANAGER — BLOCKED partiel : planning/droits export/Robi F18 ; service avancé ouvert | B-MANAGER — BLOCKED partiel : CA/Robi local, RH existantes, pas gestion des droits ; offerts/incidents à compléter | C-MANAGER — BLOCKED partiel : KDS réel avant/après paiement ; remise/offert/RH à compléter |
| SERVER | Serveur/caissier SERVER avec droits effectifs | A-SERVER — BLOCKED partiel : service courant soldé une fois, reload/reconnexion ; transferts/offerts selon responsable ouverts | B-SERVER — BLOCKED partiel : notes F2/F3, acompte/mixte, réponse perdue et STOPPED/reprise prouvés ; séparation avancée ouverte | C-SERVER — BLOCKED partiel : ouverture25€,13,20€POS+8,40€QR, clôture38,50€motivée ; fusion différente refusée409 |
| EMPLOYEE | Employé limité EMPLOYEE | A-EMPLOYEE — BLOCKED partiel : refus finance/coûts, révocation ; pointages historiques ambigus préservés | B-EMPLOYEE — BLOCKED partiel : planning propre, pointage entrée/sortie, refus CA/Robi/autre société ; exports/DTO complets ouverts | C-EMPLOYEE — BLOCKED partiel : quantité sans coût, CA/catalogue/Robi financiers refusés, retrait en ancien onglet ; RH propres à compléter |
| QR | Client, visite sans compte interne | A-QR — BLOCKED partiel : commandes/addition/cuisine L2 ; fin en caisse L3, rejeu du QR clôturé NOT RUN | B-QR — BLOCKED partiel : deux commandes, KDS, transfert/renouvellement, ancien lien403 puis envoi403 ; variantes/attaques avancées ouvertes | C-QR — BLOCKED partiel : deux commandes/8,40€, KDS, fin et ancien lien/envoi403, mobile ; variantes et fusion positive ouvertes |

Les quinze identités internes existantes sont réutilisées. SERVER n'est pas
automatiquement CASHIER : les droits d'ouverture/clôture sont contrôlés ; un
override existant du Bar ne vaut pas autorisation dans les deux autres sociétés.
ADMIN ne reçoit pas implicitement les finances ou la gestion des droits.

État agrégé actuel : **0 PASS / 0 FAIL / 18 BLOCKED partiels / 0 NOT RUN de combinaison entière**.
Ce tableau ne masque pas les défauts UI : leurs RED, contre-essais et limites
sont détaillés dans le [registre T100 F18](T100-F18-2026-10-18.md).
Le blocage du runtime L2 est conservé historiquement. L3 est arrêté normalement,
pas indisponible par un nouveau défaut : les sous-critères métier manquants,
fonctions absentes et limitations d'outils/matériel empêchent la qualification.
Une combinaison commencée n'est pas une combinaison réussie.

## Données et scénarios nouveaux

Les sociétés, ventes, factures, règlements et documents déjà prouvés sont
préservés. Les nouvelles données nécessaires portent un identifiant de scénario
`F18-…` et sont réconciliées séparément des totaux antérieurs. Les anciennes
visites QR sont fermées/révoquées/expirées ; leurs refus ne remplacent pas un
nouveau parcours QR positif. De nouvelles visites fictives distinctes sont
autorisées par la mission, pas de réouverture d'une ancienne addition.

Socle ancien protégé : Café 21,10 € de ventes brutes ; Restaurant 84,50 € ;
Bar 38,04 €. Ce sont des références historiques à rapprocher avec les nouvelles
observations SQL, pas le chiffre d'affaires du 18 octobre ni un bénéfice net.

## Critères métier par profil

- OWNER : nouvelle journée/service fictif si nécessaire, caisse et rapprochement,
  gestion autorisée, fiscalité historique préservée, refus intersociétés, export
  réel lorsqu'autorisé ; sauvegarde et reprise séparément prouvées.
- ADMIN : catalogue/prix/stock et personnel/planning selon droits effectifs ;
  refus des finances, remboursements et droits non attribués ; persistance.
- MANAGER : service, incidents/remises autorisés, planning/congés, rapports
  réellement accessibles, limites des exports et permissions ; persistance.
- SERVER : plusieurs lignes/tournées, notes, préparation, mouvements de tables,
  paiements fictifs partiels/mixtes et restant dû ; refus prix/finances non
  attribués ; reprise et absence de double écriture.
- EMPLOYEE : tâches propres/stock quantitatif autorisé sans coût ni CA ; refus
  prix, finances, exports, droits, autre société et sessions révoquées ; persistance.
- QR : table/visite/groupe corrects, catalogue/panier/consignes, deux envois,
  addition et suivi ; refus ancien lien/intertable/intersociété, fermeture,
  responsive 375/390/768/1440 ; aucune fausse confirmation bancaire.

Ces critères sont déclinés en observations atomiques. Un chemin non implémenté
reste NOT IMPLEMENTED/BLOCKED et ne sera pas remplacé par une maquette.

## Points sensibles à reproduire et à résoudre

1. Abandon HTTP : l'ancien drain conserve une incertitude permanente ; suivre
   l'achèvement applicatif réel, pas uniquement `finish/close`. Aucune suppression
   du garde sans preuve des callbacks, transactions et tâches différées.
2. Export local d'une clôture : vérifier le droit d'export distinct de la lecture
   du CA, y compris après révocation dans un onglet ouvert (risque lu, pas encore
   reproduit dans cette nouvelle campagne).
3. QR : réponses retardées, portée du panier et renouvellement ; vérifier les
   composants réellement montés, pas les anciens prototypes non routés.
4. Réservations/variantes : disponibilité du parcours UI à établir ; les tests
   API historiques et les notes gratuites ne prouvent pas ces parcours.

## Traçabilité et durée

Le journal privé chaîné contient opérations officielles, identifiants, instants
et résultats expurgés. Il distingue tentative, retour d'outil, résultat métier et
preuve persistée. Il ne publie ni mots de passe, liens QR porteurs ni jetons.
Les périodes actives commencent par un marqueur explicite ; les préparations
antérieures non chronométrées, pauses et attentes ne sont pas ajoutées pour
atteindre cinq heures. Le temps des outils n'est pas la couverture T100.

La matrice historique T01–T100 reste **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN**
au démarrage ; T100 reste partiel, 3 697 contrôles statiques ne sont pas 3 697
actions exécutées. Cette campagne ne modifie aucun verdict sans preuve nouvelle.

## Prochaine recette prioritaire sur la même copie, sans recréation

1. Séparer les groupes POS/QR avec acomptes et consignes différentes : le refus
   actuel409 est sûr mais ne livre pas le parcours positif demandé. Définir les
   décisions de routage et d'allocation avant toute correction métier.
2. Qualifier les écrans de réservation, variantes et suppléments depuis les
   parcours réellement montés ; absence de commande utilisateur ≠ succès API.
3. Reprendre MANAGER/OWNER : offerts/remises/annulations et séparations déjà
   disponibles, sans refaire les ventes/tickets/documents historiques. Chaque
   scénario distinct nécessite son budget fictif et sa traçabilité.
4. Terminer les refus/prix/exports/RH par rôle et société ; rejouer les quatre
   profils Café non retestés L3 seulement sur les zones récemment modifiées.
5. Débloquer les octets des téléchargements par un moyen officiel autorisé,
   sans rechercher un chemin alternatif ; puis matériel/acquéreur/IA autorisés
   séparément. Garder les fonctions non disponibles honnêtement marquées.

La copie L3 est la seule cible d'une reprise, après vérification du dernier
STOPPED/PID/ports et de sa base25450. Ne pas forcer les anciennes instances,
redémarrer Windows, supprimer des profils ou multiplier les laboratoires.

## Reprise historique

### Point intermédiaire réel du 18 octobre, 12:04 UTC

Les six contextes Café ont été ouverts dans Chrome. **Aucune des dix-huit
combinaisons n'est encore déclarée PASS.** Restaurant et Bar n'ont pas été
recommencés : leurs données et preuves antérieures sont conservées.

- OWNER : ouverture d'une nouvelle caisse fictive avec 50 € ; rechargement et
  PostgreSQL concordants. Retrait puis rétablissement exact du droit d'export
  MANAGER ; révocation puis réactivation EMPLOYEE. Décisions versionnées en base.
- ADMIN : quantité de l'ingrédient fictif 5 → 5,25 kg, saisie puis Tab,
  PUT200, rechargement et SQL. Tarif **futur** espresso 2,60 → 2,70 € ;
  rechargement et reconnexion. Accès direct CA/factures refusés. Anciennes lignes
  financières et fiscales égales, sans réécriture des ventes.
- MANAGER : lecture de la clôture historique, clic CSV effectué mais octets non
  attestés. Après retrait `exports.read`, le bouton disparaît dans l'onglet
  déjà ouvert, sans masquer la lecture autorisée ; il revient après rétablissement.
  Nouveau créneau distinct EMPLOYEE 18–19 h terrasse, POST201, visible en gestion
  puis uniquement dans le planning personnel de cet employé après rechargement.
- EMPLOYEE : CA, prix et droits refusés par URL ; stock quantitatif 5,25 kg
  sans coût dans l'interface **et le DTO HTTP récent**. Robi CA renvoie403,
  sans résultat financier visible. En-tête Restaurant non attribué :403 ;
  retour normal Café après retrait de l'en-tête. Révocation dans l'onglet ouvert
  observée, SQL membre inactif/version1, puis accès rétabli. Connexion,
  déconnexion, reconnexion réellement exécutées. Deux pointages historiques
  ouverts restent inchangés ; nouvelle entrée409 avec explication de revue.
- SERVER : nouvelle session table, deux espressos au nouveau prix, quantité,
  consignes de ligne et de préparation, seconde tournée bière. Acompte fictif
  espèces3 € sur une table alors à10,55 €, double clic : une seule requête de
  règlement et300 centimes répartis en base, pas une nouvelle vente finalisée.
  Rechargement exige réauthentification ; lignes et acompte sont retrouvés.
- QR : nouvelle visite indépendante sans compte, première eau1,25 € avec
  double clic et un seul POST201, seconde commande distincte POST201. Le client
  ne voit pas les9,30 € du groupe POS. Après acompte et seconde commande,
  son restant est2,15 €, contre8,80 € pour toute la table. Premier puis second
  panier exécutés, suivi préparation/prêt/servi du nouveau QR côté caisse.
  Capture mobile375 px inspectée ; lectures DOM390/768/1440 sans débordement
  horizontal. Ces mesures ne qualifient pas toutes les pages responsive.
- Robi : lecture déterministe locale de stock MANAGER et CA OWNER0 €
  exécutée, cohérente avec les ventes finalisées du jour ; formulation libre
  non reconnue renvoie503 fournisseur indisponible. **Aucune IA générative testée.**

**Incidents découverts par ces vrais parcours :**

1. Cuisine web `/pos/kitchen` : sept commandes de démonstration et indicateurs
   fixes, sans lien avec les données Café. Correctif et tests préparés sur l'API
   réelle existante ; **recompilation et rejeu Chrome encore requis**.
2. QR : le volet panier vide réapparaît après « Nouvelle commande » et absorbe
   le premier clic. Cause reproduite puis correctif minimal testé ; **rejeu
   Chrome du nouveau binaire encore requis**. La seconde commande initiale a
   été envoyée après constat du panier vide et fermeture du voile, pas en
   rejouant aveuglément un POST.
3. Arrêt après abandon HTTP : attente SQL du règlement mixte880 centimes
   prouvée, page rechargée avant réponse. Transaction expirée, zéro nouveau
   règlement/vente et aucun effet de stock ; l'arrêt officiel reste non
   confirmé et le processus est conservé. Le contrôle Windows ultérieur voit
   encore3002 LISTEN/ECONNRESET, malgré les refus réseau initiaux ; pas cinq ports
   libérés. Voir [preuve détaillée et rectification](F18-ABANDON-HTTP.md).

Preuves privées nouvelles : `f18-cafe-avant-20261018-v1.json`, observations
`…stock-admin…`, `…planning-prix…`, `…deux-commandes…`, `…http-abandon…`,
`cafe-rights-f18-export-retour-20261018-v1.json`,
`cafe-rights-f18-employe-revoque-20261018-v1.json` et journal chaîné.
Une comparaison intermédiaire confirme les anciennes ventes, factures, avoirs,
règlements, remboursements, lignes et provenances inchangés. Une observation
SQL n'est pas, à elle seule, un PASS de parcours UI.

Une première annotation FAIL « réponse Robi absente » a été **rétractée** : le
filtre d'affichage de l'orchestrateur cachait ce texte dans la preuve abrégée.
La snapshot intégrale montre bien le résultat local. Journal original et
annotation corrective conservés ; aucun correctif produit fictif attribué.

Les validations globales exécutées avant les deux derniers correctifs UI sont
604 backend,482 web,161 POS et353 PostgreSQL, toutes réussies après correction
d'une réponse simulée de test incomplète. **Ce n'est pas encore une validation
globale du dernier état UI.** Les tests ciblés sont détaillés dans les preuves ;
aucun total Chrome n'est déduit des nombres unitaires.

### Validation finale du code figé, après les correctifs

Exécutions réelles du18octobre12:19–12:21UTC,805sources stables, empreinte
`5f9cd1d28f9bfdd4c65ce85f97e78d5aa5566865b756b726249fcbb280a90fd9` :

[Agrégat public expurgé](preuves/f18-validation-2026-10-18.json), rapproché aux
rapports privés frais, aux SHA des fichiers et aux observations financières.
Le hash du JSON canonique et le SHA de ses octets formatés sont distincts ;
les champs `reportBytesSha256` désignent bien les octets des fichiers conservés.

| Suite | Exécutés / réussis | Échecs / ignorés | Preuve privée fraîche |
|---|---:|---:|---|
| Backend |616/616 |0/0 | `validation-backend-unit-1792325942162-iQJaQX` |
| Web |513/513 |0/0 | `validation-web-unit-1792325940911-38kKKO` |
| POS |161/161 |0/0 | `validation-pos-unit-1792326024718-do2uUn` |
| PostgreSQL |353/353 |0/0 | `validation-integration-1792325941001-56VO9V` |
| Lanceur/profil, fixtures séparées |50/50 |0/0 | `validation-local-profile-UYQmq6` |

Soit1290unitaires, pas les suites ciblées ajoutées plusieurs fois. Les fixtures
locales ont leur propre empreinte et des répertoires neufs ; elles ne sont pas
des doubles clics Windows. La compilation métier des cinq applications est réussie
12:19:00.934–12:20:53.657UTC ; `gameModuleCount=0`. Source utilisateur
`apps/guest/tsconfig.tsbuildinfo` inchangée après ces validations, exclue du futur
commit ; aucun fichier privé/DB/archive à publier.

### Rapprochement final observé, pas une restauration finale

Lectures privées READ ONLY du18octobre12:21UTC, trois sociétés existantes :
zéro anomalie détectée dans les invariants financiers contrôlés. Comparaison
par identifiants/empreintes des anciennes ventes, factures, avoirs, règlements,
remboursements déclarés, lignes fiscales et provenances : **zéro différence**.
Cette égalité porte sur les champs expurgés sélectionnés, pas toutes les82tables.

| Société | Anciennes ventes TTC conservées | Delta F18 réellement commis | État restant |
|---|---:|---|---|
| Café |21,10 € |11,80 € de commandes ouvertes, acompte espèces3 €, aucune nouvelle vente finalisée |8,80 € dus ; caisse50+3=53 € attendus, non clôturée |
| Restaurant |84,50 € |Aucune nouvelle opération métier F18 |Parcours graphiques F18 NOT RUN |
| Bar |38,04 € |Aucune nouvelle opération métier F18 |Parcours graphiques F18 NOT RUN |

Stocks produits Café97/59/46/19/100 inchangés : pas de débit avant finalisation
des nouvelles commandes. Quantité de l'ingrédient explicitement modifiée par ADMIN
5→5,25kg, pas une réception ou vente fictivement déduite. QR n°8 servi mais encore
impayé125centimes, première QR90centimes dus après35centimes d'acompte. Préparation,
occupation et paiement restent des états distincts. Quinze membres actifs ;
les4nouvelles décisions de droits Café sont ajoutées aux8historiques, sans purge.

Restauration initiale82tables/18997lignes/14fichiers/26PDF prouvée, finale F18
BLOCKED.27copies récupérées à nouveau vérifiées, pas27restaurations. Raccourcis
Bureau préservés ; nouveau double clic natif non testé.99fichiers de jeux relus
dans le commit immuable962c01b, ancêtre du HEAD distant vérifié, pas supprimés.

### Robi : trois niveaux distincts

1. **Lectures déterministes locales :** CA OWNER et stock MANAGER Café exécutés,
   refus CA EMPLOYEE exécuté ; anciens résultats Bar/Restaurant non recomptés.
2. **Assistant à règles :** formulations exactes reconnues dans les lectures
   précédentes ; formulation libre non reconnue renvoie503 fournisseur indisponible,
   pas un résultat inventé. Ce n'est pas une conversation générative qualifiée.
3. **Fournisseur IA générative réel : BLOCKED.** Pas de configuration autorisée,
   aucune donnée métier envoyée au cloud. Pièce jointe, conversation ancienne,
   révocation pendant requête et erreur réseau ne sont pas qualifiées par ces
   seuls trois appels ; tests techniques antérieurs et clics restent séparés.

### Couverture et durée réelles

Journal F18 jusqu'au dernier marqueur de validation indépendante :150tentatives
d'action UI,148retours d'outil et2erreurs ;87appels de clic dont86retournés.
Un appel peut demander un double clic ; le nombre exact de clics physiques n'est
pas enregistré de façon fiable. Les66snapshots,21listes réseau,9lectures de requête
et3captures inline sont des observations, pas des clics ou des PASS supplémentaires.
Les deux erreurs UI sont un choix de sélecteur demandé comme « false » au lieu
du libellé et un bouton de bienvenue devenu non interactif après transition.
Réobservation et poursuite effectuées ; aucun rejeu aveugle d'une mutation inconnue.

Répartition des150tentativesUI : OWNER32,ADMIN24,MANAGER21,SERVER38,EMPLOYEE26,QR9.
Ce sont des interactions, pas150fonctions ni18parcours complets. Les horodatages
des phases distinguent clics, diagnostic, compilation et rédaction ; le temps
mural et les temps d'attente outils ne sont pas cinq heures de tests actifs.
Le préfixe vérifié du journal contient2447événements toutes campagnes confondues,
dont286F18, tête SHA
`e22bb2b5fe21335335f68902942a0764597f07c36af3968482d934facfd9e748`.
Les2447ne sont pas2447actions nouvelles. Les marqueurs sont fermés au point
de reprise12:42UTC ; aucune attente artificielle pour atteindre cinq heures.

### Incidents et limites prioritaires

| Référence | Priorité | État au point de reprise |
|---|---|---|
| F18-I01 arrêt après abandon / reprise idempotente réelle |P0 de recette |BLOCKED : rollback et absence de doublon constatés, arrêt/rejeu/reprise/restauration finale non qualifiés ;3002 reste réservé |
| F18-I02 cuisine web démonstrative |P1 |Remplacée par le contrat API réel,30tests ciblés puis suite globale/compilation GREEN ; contre-essai Chrome BLOCKED |
| F18-I03 volet panier QR vide |P2 |Cause reproduite,2lignes corrigées,22tests ciblés puis suite globale/compilation GREEN ; contre-essai Chrome BLOCKED |
| F18-I04 export de clôture sans droit d'export distinct |P1 |Correction/tests et retrait/rétablissement dans l'onglet réel prouvés ; octets téléchargés toujours non qualifiés |
| F18-I05 diagnostic privé d'arrêt effacé |P1 diagnostic |RED→GREEN sur étapes/raisons bornées ; ne récupère pas le motif perdu de l'ancien PID |
| Pointages anciens en doublon |Données protégées |Refus d'une nouvelle entrée prouvé ; correction historique exige décision, aucune ligne supprimée/modifiée |

### Performance : limites de cette campagne

Aucune nouvelle série comparable avant/après n'est établie pour la salle, POS,
QR, rapports, connexions, CPU/RAM/GPU. Les tests et compilations ont été exécutés
simultanément : leurs durées ne sont **pas** une baseline de latence de service.
Le temps112,722s est celui de cette compilation, pas du démarrage. Les mesures
du [lot précédent](PERFORMANCE-FIABILITE.md) restent historiques, sans gain revendiqué.
Pas d'optimisation, de changement Node global, de portage Rust/Go ou de retrait
de transaction/verrou/fsync réalisé pour embellir les nombres.

### Suite sûre

Ne pas rejouer le solde avec un nouvel identifiant : demande conservée
`5b93c091-f841-4672-beb3-90c991a7023f`, montant880, espèces380 et carte
**déclarée fictive**500. Le dernier SQL constate encore880 dus. Le runtime
ancien n'a pas confirmé son arrêt : ne pas contourner ce garde, réutiliser ses
ports sur la même base ou prétendre une reprise réussie. Diagnostiquer le défaut
en tests isolés et conserver toutes les copies. La restauration initiale prouvée
reste distincte d'une restauration finale de ce nouvel état, encore à exécuter.

Commencer par le manifeste/sauvegarde F18, réutiliser les identités existantes,
consulter les marqueurs et preuves avant toute mutation. Ne pas répéter une
opération ambiguë avec un nouvel identifiant. Reprendre les cases encore ouvertes,
pas les ventes anciennes. Publier les correctifs validés uniquement sur la branche
2.0 ; campagne et qualification pilote restent des verdicts distincts.
