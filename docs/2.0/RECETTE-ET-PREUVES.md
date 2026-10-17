# Recette actuelle

## Campagne intensive après 475f67a — 17 octobre, EN COURS / NON LIVRÉ

### Consolidation après les rejoués — 19:31:36 UTC

Trois établissements fictifs réellement parcourus, aucun rôle intégral ni T100
entièrement qualifié. [Validation finale v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json) :
**861 unités / 295 PostgreSQL / 47 fixtures locales**, deux profils compilés
(5 applications chacun). Les suites historiques ci-dessous ne s'y ajoutent pas.
[HTTP ciblés après clics](preuves/intensive-http-rejeux-2026-10-17-2130.json) et
[traçabilité](TRACABILITE-UI-API-PG-2026-10-17.md) distinguent toujours UI/API/PG.

Restauration finale : **81 tables / 10 083 lignes / 14 fichiers / 26 PDF identiques**,
copie chiffrée vérifiée, aucune purge. Restaurant 84,50 € TTC, avoir/remboursement 6,10
séparés, caisse comptée 276,05 € (−0,05). Bar 38,04 € TTC, acompte/solde mixtes déclarés,
caisse 118,90 € (−0,10). Café inchangé, caisse 106,80 € (−0,05).
Ancien QR effectivement refusé après paiement final ; visite Bar encore active
pendant l'acompte, nouveau groupe à zéro. Planning nocturne : nouvelle capture locale
avec date de fin explicite, pas réception externe. Voir [checkpoint](CHECKPOINT.md).

[Journal 21:32](preuves/intensive-journal-2026-10-17-2132.json) : 1 119 tentatives UI,
1 096 retours, 23 erreurs, 731 clics retournés et 368 champs. Pas un nombre de scénarios
PASS ni cinq heures actives. CSV cliqués, fichiers téléchargés non rapprochés ; aucun
essai physique ou bancaire. Robi métier, droits fins et parcours restants bloquent
toujours une déclaration de livraison intégrale ou de préparation au pilote.

### Point courant — vers14:05UTC

Café partiel : quatre ventes21,10€ TTC, avoirs et remboursements déclarés10,25€
séparés, caisse comptée/clôturée106,80€ avec écart-0,05€ justifié. Restaurant créé :
cinq membres/six produits/quatre catégories/quatre tables, planning et congés/HACCP,
une commandeQR25,40€ impayée (HT24,66/TVA0,74), zéro vente/stock débité. Boulangerie
NOT RUN. Aucun rôle entier qualifié ni cinq heures actives attestées.

Dernières exécutions **801unités et277PG**, cinq compilations métier ; nouveaux
tests locaux de drainage **41/41**, dont sept fixtures nouvelles. [Preuve agrégée](preuves/intensive-validation-2026-10-17-1405.json).
Restauration14:00:46UTC :81tables/12fichiers/24PDF égaux, AES-GCM/clé séparée,
aucune purge. API arrêtée et base sans autre client observé, mais runtime statique
non entièrement arrêté : préconnexion frontend résiduelle. Reprise UI **BLOCKED**
en attente de la décision d'arrêt du seul processus local ; aucun arrêt forcé effectué.
Correctifs récents table vide, double congé et libellés compilés/testés, Chrome encore
à rejouer. [Checkpoint exact](CHECKPOINT.md), [couverture par rôle](INTENSIVE-COUVERTURE-PAR-ROLE.md).

[Journal nommé14:05](preuves/intensive-journal-2026-10-17-1405.json) :713tentatives,
700retours d'outil,13erreurs,466clics retournés ; ni700PASS ni couverture uniqueT100.
Les anciens IDs répétés restent intacts et sont désambiguïsés par position+hash.

### Historique du relevé précédent

[Rapport courant](RECETTE-INTENSIVE-2026-10-17.md),
[résultats intermédiaires](preuves/intensive-resultats-2026-10-17-1150.json),
[journal officiel expurgé12:30](preuves/intensive-journal-2026-10-17-1230.json).
Un seul café fictif partiellement parcouru, B/C NOT RUN ; cinq identités réelles
dans des contextes neufs, pas cinq rôles entièrement qualifiés. Les retours d'outil ne
sont pas des assertions de réussite et les attentes bloquées ne sont pas du temps actif.

Sauvegarde/restauration supplémentaire à 11:29:28 UTC : **81 tables, 10 fichiers,
13 PDF facture et 8 PDF avoir égaux**, avant les encaissements fictifs. Vente de
10,25 € ensuite rapprochée UI/HTTP/SQL : HT 9,50 €, TVA 0,75 €, espèces déclarées
6,25 €, carte déclarée 4 €, une vente et stock débité une fois. Aucun paiement bancaire,
une facture depuis ticket ensuite émise pour ce café sans seconde vente. Deux devis
brouillons sans encaissement. Une demande d'avoir excessif refusée, aucune pièce créée.

Les validations unitaires/PG ciblées nouvelles sont rapportées avec leurs dates dans
le checkpoint :734unités et257PostgreSQL fraîchement exécutés après correctifs.
Trois captures SMTP strictement locales : planning avec Bar, puis facture dont le
PDF joint est identique à l'original SQL. Copies API A4/58/80 rendues et inspectées ;
aucune identité du téléchargement Chrome ou impression physique déduite.
QR : deux commandes201, total9,60€, double clic sans seconde commande ; révocation403,
nouveau groupe0€ tandis que les impayés restent conservés. Vues375/390/768 parcourues,
chevauchement mobile reproduit puis correctif compilé, rejeu géométrique restant.
Clôture Chrome page3 BLOCKED sur retour natif ; refus serveur403 et zéroPosClosure
établis indépendamment dans ActivityEvent/PostgreSQL, pas fausse preuve UI.
Nouvelle restauration12:31:06UTC :81tables/10fichiers/22PDF égaux, aucune purge.
Aucune qualification de production, cinq heures actives non atteintes.

## Fiabilité et finalisation après f198c98 — 17 octobre 2026

Code/tests `23316e37547c46bb03176a63e3c7b16a1f082d2e` ;
[bilan du lot](FIABILITE-PROFIL-METIER.md), [checkpoint](CHECKPOINT.md).
**584 unités, 201 PostgreSQL et 42 Chrome** déjà exécutés à 08:25–08:34 UTC, rapports
complets contrôlés pendant la finalisation, **pas présentés comme relancés**.
[Validation et dates](preuves/validation-fiabilite-2026-10-17.json).

Nouveaux contrôles de finalisation : **34 autocontrôles locaux**, dix compilations
(cinq par profil), restauration neuve à 08:51 UTC avec **81 tables, 8 fichiers,
21 PDF égaux**, puis **19 assertions de reprise**. Clé AES-GCM séparée, aucune purge.
[Restauration](preuves/restauration-fiabilite-2026-10-17.json),
[sources/livrables/raccourcis/jeux](preuves/finalisation-fiabilite-2026-10-17.json).

**55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN.** T69 devient PASS ; T100 reste partiel.
La protection computer-use empêche de vérifier sûrement l'URL de la fenêtre native :
contrôle Windows **BLOCKED**, aucune protection contournée ni navigation de remplacement.
Ce blocage n'est ni masqué par les 42 parcours Chrome de laboratoire ni promu en PASS
par la présence des raccourcis. Matériel, banque réelle, historique et production non qualifiés.

## Profil métier sans jeux — après 962c01b

16 octobre 2026, code `9e15b1a`. [Rapport](PROFIL-PROFESSIONNEL-SANS-JEUX.md),
[validation](preuves/business-only-validation-2026-10-16.json),
[ressources avant/après](preuves/business-only-ressources-2026-10-16.json),
[inventaire source](preuves/business-only-inventaire-t100-2026-10-16.jsonl),
[restauration](preuves/restauration-business-only-2026-10-16.json).

**518 unités (277 backend / 177 web / 64 POS), 178 intégrations PostgreSQL et 28 parcours
Chrome dans dix fichiers**, zéro échec/ignoré. API/SQL/fichiers locaux réels, prestataires et IA
remplacés lorsque précisé dans les noms de scénarios. Cinq applications compilées pour chacun
des profils métier et complet ; trois contrôles de livrable/hôte/guards. Les 12 tests des outils,
23 du comparateur et 100 identifiants/8 contrôles du générateur sont distincts des suites métier.
Robi : confirmation, scope et PDF testés avec IA remplacée ; pas de modèle/voix réels qualifiés.

À 19:32 UTC : **79 tables/8 fichiers/9 PDF facture et 8 avoir égaux**, AES-GCM/clé séparée,
17 contrôles après redémarrage. Durée 3 721 ms, pas un RTO ; tables d'allocation peuplées 7/14/21.
Jeux : récupération 99 fichiers vérifiée, zéro module dans le graphe métier contre 55 en complet.
Raccourci Windows créé/contrôlé, lanceur `-NoBrowser` exécuté ; pas de clic physique revendiqué.

Ressources : trois séries courtes comparables, aucun gain énergétique extrapolé. Le profil
compilé complet consomme moins de working sets sommés que le métier dans cette série ;
pas de causalité « suppression des jeux = baisse RAM » ni accélération universelle.
Deux dumps de rotation du laboratoire supprimés par une rétention auparavant non neutralisée ;
corrigée et testée. 27 copies absentes récupérées dans 36 ZIP du jour, SHA vérifiés ; les noms des
deux suppressions manquent, correspondance exacte non prouvée. Originaux hors laboratoire intacts.
[Preuve de récupération et limite](preuves/rotation-laboratoire-2026-10-16.json).

Matrice inchangée **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN**. T100 partiel : 399 fichiers,
3 680 contrôles, 157 routes et 826 gabarits source, non convertis en PASS. Aucun déploiement,
paiement réel, profil historique, vidéo ou Stripe Refunds activé. Limites externes inchangées.

## T100 et profilage HTTP — lot suivant c0ddd81

16 octobre 2026. [Rapport T100](T100-CONTROLES-ET-PERFORMANCE.md),
[validation fraîche](preuves/t100-validation-2026-10-16.json),
[inventaire source](preuves/t100-inventaire-source-2026-10-16.jsonl),
[mesure HTTP appariée](preuves/profil-http-t100-2026-10-16.json) et
[restauration](preuves/restauration-t100-2026-10-16.json).

450 unités (272 backend / 114 web / 64 POS) et 173 intégrations PostgreSQL relancées, sans
échec/ignoré. **21 parcours Chrome dans huit fichiers** et leur portée réelle figurent dans le JSON de validation.
Les nouveaux cas incluent des frontières simulées explicitement nommées, pas de banque réelle.
Les cinq applications compilent ; les avertissements de gros bundles restent visibles.
Restauration à 18:39 UTC : 79 tables et 8 fichiers égaux, 17 PDF intègres (9 factures / 8 avoirs),
AES-GCM vérifié, 17 contrôles après redémarrage ; 3 221 ms sur cette copie, pas un RTO.
12 tests des outils d'inventaire/preuves/profilage, 23 contrôles du comparateur de restauration,
100 identifiants métier et 8 contrôles de statut/provenance du générateur sont conservés/vérifiés.

La qualification globale demeure **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN**. L'inventaire des
contrôles est réalisé au niveau source ; T100 entier n'est toujours pas exécuté. Les preuves
précédentes ne sont ni effacées ni présentées comme de nouveaux essais matériels ou externes.
Gain HTTP apparié démontré sur le même jeu : p95 2 605,46 → 1 703,63 ms, −34,61 % ; aucune
qualification de charge de service. Les séries historiques ci-dessous restent distinctes.

## Allocation financière et recette étendue — lot précédent

16 octobre 2026, après `7c08307`, même branche dédiée. Références de livraison dans CHECKPOINT.
**Laboratoire uniquement, pas de qualification de production.**

- 418 unités (271 backend / 91 web / 56 POS), 173 intégrations PostgreSQL / 18 fichiers :
  zéro échec ou ignoré dans la recette finale ; prestataires simulés. Un cas substitue seulement
  la lecture d'un ancien miroir JSON par des données fictives, jamais un profil historique.
- Cinq parcours Chrome réussis : gestion HACCP/devis, allocation financière QR,
  performance/interface, fusion QR et séparations natives. Contextes neufs, aucune navigation
  historique ; API privée redémarrée entre fichiers, limiteur normal non contourné.
- Cinq applications compilées. 23 autocontrôles de comparaison de restauration ; 100 cas uniques
  et 8 contrôles de statut/provenance de matrice. Aucun verdict fondé seulement sur l'existence d'un fichier.
- **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN**, avec préconditions/actions/attendu/observé/preuves.
  Douze anciens NOT RUN exécutés, seize fonctions/prérequis absents classés BLOCKED, T100 non terminé.
  Les anciens 29 BLOCKED ne sont pas déclarés résolus ; catégories et conditions dans le rapport.
- Migration réelle d'une ancienne copie : 7 → 34 migrations, 47 tables / 341 lignes et colonnes
  historiques identiques. Cliché privé source lu seulement ; aucun profil ni archive originale ouvert.
- Restauration finale à 17:22 UTC : **79 tables et 8 fichiers égaux**, 9 PDF facture et 8 PDF avoir
  intègres, trois nouvelles tables financières peuplées (5/10/15). AES-GCM / clé séparée, nouvelle
  base, 2 952 ms sur cette copie, pas un RTO ; 17 assertions après redémarrage.

Allocation v1 : trois groupes avec remise historique, quantités partielles, centimes résiduels,
deux taux, décisions d'acompte, groupe payé sans clôture globale, paiement mixte, un seul stock/vente,
conflit concurrent, aperçu périmé et attente réelle d'un verrou PostgreSQL. Anciennes capacités QR
refusées ; nouveau groupe limité à son addition ; réponse perdue récupérée. Documents déjà émis
et remboursements existants **refusés**, pas redistribués artificiellement.
Neuf cas d'allocation incluent aussi la TVA finale indépendante de l'ordre SQL, le miroir JSON
fictif ne réintroduisant pas l'original et le refus d'un ancien solde couvert mais non clôturé.

Profilage apparié (même jeu, dix transactions hors HTTP/miroir) : 1 483 → 8 requêtes,
p95 1 313,72 → 607,19 ms. Dernier HTTP global p95 2 420 ms sans builds/tests concurrents, sur un
autre jeu cumulé (724 produits / 245 tables / 1 266 lignes). Série avec builds 2 492 ms également
conservée, mais non appariée. Aucune amélioration HTTP globale démontrée face aux 2 060 ms anciens.
Contrôles ciblés clavier/erreurs/reprise et largeurs
375/768/1440 ; minimum texte 7,44:1 sur le dialogue mesuré, pas le site entier.

Les simulations de refus/abandon/webhook ne sont pas des essais PayPal officiels. Thermique,
terminal, sauvegarde externe, T04, traductions complètes et T100 restent non qualifiés.
Stripe Refunds et vidéo non activés ; aucune production modifiée.

Rapport et commandes : [ALLOCATION-FINANCIERE-ET-RECETTE.md](ALLOCATION-FINANCIERE-ET-RECETTE.md).
Preuves expurgées : [matrice JSON](preuves/recette-metier-2026-10-16.json),
[profilage](preuves/profil-sauvegarde-comparaison-2026-10-16.json),
[migration](preuves/migration-ancienne-copie-2026-10-16.json),
[restauration](preuves/restauration-allocation-2026-10-16.json).

## Historique — recette métier et corrections P0/P1 avant 7c08307

Base `3b02765`, code `c55a987` (réservations) et `80a1c7e` (séparations), même branche dédiée.
**Laboratoire privé seulement ; aucun déploiement ni prestataire bancaire réel.**

La [matrice T01–T100](RECETTE-METIER-T01-T100.md) contient pour chaque cas données/préconditions,
actions, attendu, observé, preuve et statut. Résultat : **42 PASS, 0 FAIL restant, 29 BLOCKED,
29 NOT RUN**. Les numéros de l'annexe originale sont conservés, y compris vidéo non activée.
Les PASS sont logiciels dans le périmètre déclaré : API/PostgreSQL, unités ou Chrome selon la preuve.
Un webhook remplacé n'est pas un échange PayPal sandbox ; un PDF n'est pas du papier.

| Exécution actuelle | Résultat et portée |
|---|---|
| Unités complètes | 410 : 267 backend, 91 web, 52 POS ; aucune unité en échec/ignorée |
| PostgreSQL complet | 151 / 16 fichiers, creorga_tests seulement ; banques remplacées |
| Chrome versionné | 3 / 3, contextes neufs sans profil persistant, loopback et compte fictif |
| Builds | web, backend, POS, guest, superadmin ; avertissements de gros bundles conservés |
| Comparateur de restauration | 23 autocontrôles réussis |
| Matrice | 100 cas uniques, 7 contrôles du générateur, aucune déduction de PASS depuis le code |
| Restauration de copie | 76 tables et 8 fichiers identiques, 9 PDF facture + 8 PDF avoir intègres |
| Redémarrage | 8 lectures/assertions réussies sur portions, provenance, préparation, réservation et FK restaurées |

Échecs red/green : endpoint de séparation absent ; déplacement non audité via brouillon accepté ;
routage périmé après nouveau transfert ; suppression de portion sans correction ; relation de réservation
étrangère acceptée ; huit réservations sur vingt appels simultanés ; modification/réactivation contournant
le conflit ; entrée de prototype acceptée ; limite 200/300 incohérente ; sélection clavier impossible ;
absence de rôle/focus modal ; contraste de texte 3,58:1. Corrections et limites :
[SEPARATIONS-ET-RECETTE-P0.md](SEPARATIONS-ET-RECETTE-P0.md).

Le nouveau fichier de réservations possède cinq cas. Les mouvements passent de six à treize cas,
les sessions de sept à huit, le POS ajoute deux cas de récupération/scope, et la préparation un cas
de portion supprimée versus réglée. Le validateur de groupes possède un test de clés réservées.
Les suites antérieures restent présentes. Le test de quantité règle deux portions à 23,40 € + 11,70 €,
rejoue, vérifie deux ventes pour 35,10 €, une réduction de stock de trois et la TVA historique 17 %,
alors que le catalogue a changé. Les groupes QR gardent leurs acomptes/soldes distincts.

Chrome : fusion + acompte et réponse perdue, renouvellement de deux QR isolés ; séparation d'une
portion préparée, réponse perdue puis rechargement/reconnexion, déplacement du groupe ; clavier,
focus contenu, Échap/retour au bouton et trois tailles. API de réservation également écrite/relue
dans cette session, sans prétendre avoir livré une interface complète de réservation.

Mesures : 20 lectures, 10 sauvegardes, 10 règlements **manuels fictifs**, 10 ouvertures de fenêtre
jusqu'à opacité >= 0,99. Jeu cumulé conservé de 712 produits / 221 tables / 1 308 lignes au point mesuré.
Voir [données de mesure](preuves/performance-2026-10-16.json). p95 : 275 / 2 060 / 1 633 / 366 ms,
respectivement. Pas de seuil inventé, baseline ou charge multi-utilisateur. Coût du snapshot global
à profiler avant un vrai service. Contraste minimal 7,44:1 sur les seuls textes contrôlés ; trois
captures stables inspectées. Comparaison visuelle **INCONCLUSIVE** sans baseline ; pas d'audit axe,
lecteur d'écran, zoom global ou certification WCAG. Première capture transitoire pendant l'animation
écartée de la revue ; le script attend désormais l'opacité stable.

Sauvegarde : applications arrêtées, nouvelle copie d'entrée sans toucher aux dumps existants,
pg_dump natif, archive v2 et AES-GCM/clé séparée, pg_restore transactionnel dans une base neuve.
Comparaison exhaustive des lignes/colonnes et octets PDF. Tables peuplées : mouvements 16,
réservations 3, changements de salle 263, couverts 727, sessions 210. Les deux FK NOT VALID sont
retrouvées après restauration. 2 653 ms mesurées sur cette copie, **pas un RTO**. Aucun nettoyage
d'archives originales ou de profils. Services privés redémarrés et huit vérifications de reprise réussies.

Incidents de scripts distincts des défauts produit : compteur de fixture, sélecteur et statut HTTP
attendu, reconnexion nécessaire après rechargement, cache Vitest refusé par sandbox et cible `.at()`
TypeScript. Le limiteur a produit HTTP 429 pendant une répétition : backend **privé** redémarré,
pas de désactivation de protection. Données des essais interrompus conservées ; jeu de charge réutilisé.

### Reproduction

Sur ce PC, lanceurs privés (secrets hors dépôt) depuis le dépôt réel :

```powershell
node ../local-2.0/run.mjs backend-unit --reporter=json --outputFile=../../../local-2.0/recipe-backend-unit.json
node node_modules/vitest/vitest.mjs run --root apps/web --reporter=json --outputFile=../../../local-2.0/recipe-web-unit.json
node node_modules/vitest/vitest.mjs run --root apps/pos --reporter=json --outputFile=../../../local-2.0/recipe-pos-unit.json
node ../local-2.0/run.mjs integration --reporter=json --outputFile=../../../local-2.0/recipe-integration.json
node ../local-2.0/run-browser-lab.mjs
node scripts/verify-restored-copy.mjs --self-test
node scripts/render-business-recipe.mjs --self-test
```

Puis arrêt des cinq écrivains, `restore-current-copy.mjs`, redémarrage et
`verify-restart-business-recipe.mjs` du laboratoire privé. Ne pas transposer ces chemins vers une
production. Pour générer la matrice à partir de **preuves réellement exécutées et fraîches** :

```powershell
node scripts/render-business-recipe.mjs --reports=../local-2.0 --since=2026-10-16T14:45:00Z
```

Changer `--since` au début d'une nouvelle recette, pas pour recycler une ancienne preuve.
Un autre clone doit préparer sa propre base **creorga_tests**, clé JWT de test, services loopback
et compte `.invalid` propriétaire d'une société marquée fictive. Les suites sont versionnées,
les configurations et sauvegardes privées ne le sont pas. La matrice publique JSON ne contient
ni mots de passe, ni jetons, ni dump, ni QR. Les rapports bruts et captures restent privés.

**Bloqué/non exécuté :** voir chaque ligne de la matrice et le protocole matériel. En particulier,
pas d'allocation arbitraire de lignes QR/acomptes/remises, pas de matériel thermique/tiroir/terminal,
PayPal sandbox officiel, banque réelle, coupure électrique, T04 historique ou vidéo. Les 0 FAIL
restants ne signifient pas absence de défaut dans les 58 scénarios bloqués/non exécutés.

## Preuves des lots antérieurs

## Dernière recette — fusions QR, remboursements et versements

16 octobre 2026. Code `23bba568ec54c7c0acc3861f3ba639f155c1dd3d`, après `879155d`.
**Qualification de laboratoire, pas de mise en production.**

| Vérification exécutée | Résultat | Périmètre réel |
|---|---|---|
| Unités complètes backend/web/POS | 406 réussites : 265/91/50 | 57 fichiers, pas de banque réelle |
| Intégrations PostgreSQL complètes | 138 réussites / 15 fichiers | creorga_tests, prestataires simulés |
| Builds | Cinq applications compilées | web, backend, POS, guest, superadmin ; avertissements de gros bundles POS/superadmin |
| Navigateur versionné | 1 test Playwright réussi | Fusion POS/QR, acompte, réponse perdue, QR séparés, addition relue sans nouvelle commande |
| Chrome privé POS/QR | 15 observations finales | Deux commandes QR et un couvert natif, deux acomptes, tentative UNKNOWN, groupes et largeurs |
| Chrome privé versements/remboursements | 9 observations finales | Import/rejeu après perte de réponse, validation et historique, maintien de réserve, référence non prouvée refusée |
| Reprise après redémarrage | 9 contrôles de lecture réussis | Même identité des couverts, soldes, réserve, décisions, versement et ancien QR refusé |
| Vérificateur de restauration | 23 autocontrôles réussis | Tests du comparateur, distincts de la restauration ci-dessous |
| Restauration complète en nouvelle base | 76 tables et 8 fichiers égaux | Toutes lignes/colonnes ; 9 PDF facture + 8 PDF d'avoir intègres, AES-GCM + clé séparée |

Les six nouvelles tables contiennent des données dans le dump restauré : TableMovement 3,
RefundReviewEvent 5, PayoutStatement 1, BankPayout 1, PayoutLine 5, PayoutDecision 1.
RefundAttempt 2 et RefundAllocation 2 inclus également. Les écritures de recette sont fictives.
Temps mesuré 1 847 ms, pas un RTO. Les données d'essais interrompus sont conservées, non nettoyées.

Tests nouveaux : `table-movements.integration.test.ts` (6), `bank-payouts.integration.test.ts` (4),
`refunds.integration.test.ts` étendu à 17, deux cas POS de récupération/scope, deux cas de sélection
de groupe et un cas de compteurs de versements par période. Les suites précédentes restent présentes.
Le contrat HTTP PayPal vérifie désormais la clé invoice_id en plus de l'idempotence.

Échecs reproduits et corrigés : routes initialement absentes, compteur de versements hors période,
preuve de remboursement SUCCEEDED rétrogradée en UNKNOWN par timeout tardif, addition absente du
menu d'un QR renouvelé tant qu'aucune nouvelle commande n'était envoyée. Échecs de scripts distincts :
champ updatedAt cuisine manquant, relation de fixture tender incomplète, mauvaise route du rapport,
sélecteur d'historique trop strict après plusieurs décisions, API pas encore démarrée. La limite
normale des connexions a également interrompu une recette ; seul le laboratoire a été redémarré,
aucune protection globale de production assouplie.

Les réponses réseau ont été volontairement perdues **après** commit côté serveur. La reprise POS
après rechargement a été observée lors du premier passage, puis les parcours ont été relus. Ne pas
confondre ces tests avec une caisse autonome hors ligne ou une panne électrique.

### Reproduction

Depuis le dépôt réel sur ce PC, lanceurs privés avec secrets non publiés :

```powershell
node ../local-2.0/run.mjs unit
node ../local-2.0/run.mjs integration
node ../local-2.0/run-browser-lab.mjs
node scripts/verify-restored-copy.mjs --self-test
```

Depuis un autre clone, créer/configurer un laboratoire PostgreSQL fictif, appliquer les migrations
avec `migrate deploy`, générer Prisma et fournir séparément JWT_SECRET/JWT_REFRESH_SECRET.
La base de recette doit s'appeler **creorga_tests**, avec `CREORGA_TEST_DATABASE=creorga_tests` ;
aucune URL réelle. Depuis apps/backend :

```powershell
node ../../node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts
```

Navigateur : `node node_modules/@playwright/test/cli.js test --config playwright.lab.config.ts`.
Nécessite Chrome installé, serveurs loopback 3002/5174/5175, autorité PostgreSQL, activation
`CREORGA_LAB_BROWSER_TESTS=1` et identifiants CREORGA_E2E_EMAIL/CREORGA_E2E_PASSWORD fournis hors Git.
Le test refuse un email hors .invalid ou une société non propriétaire/non marquée fictive ; il crée
des données de recette qu'il conserve. Aucun profil persistant, vidéo ou trace contenant des secrets.

Preuves privées : logs `*-qr-refunds-payouts-final.log`, BROWSER-TABLE-MOVES.json,
BROWSER-QR-REFUNDS-PAYOUTS.json, RESTART-QR-REFUNDS-PAYOUTS.json, RESTORATION-2.0.json et captures.
QR privés masqués. Les captures 375/768/1440 ont été inspectées, sans baseline : comparaison visuelle
**INCONCLUSIVE**. Pas d'audit axe/lecteur d'écran ni de qualification d'accessibilité/performance globale.

**Non exécuté/bloqué :** PayPal sandbox officiel, banque/acquéreur réel, remboursement Stripe,
vrais relevés et change, impression/terminal/carte physiques, coupure électrique, T04 réel et recette
métier complète T01–T100. Aucun paiement simulé n'est une transaction bancaire vérifiée.

## Recette antérieure — sessions et rapprochement P0, 16 octobre 2026

Code : `6080a6a90fe864ad24f7b4565ee6988e56469fd4`, branche dédiée publiée, sans production.

- `run.mjs unit` : **401 / 401**, 264 backend, 89 web, 48 POS.
- `run.mjs integration` : **123 / 123**, treize fichiers, PostgreSQL réel et banques simulées.
  `service-sessions.integration.test.ts` (7) vérifie autorité, cache, concurrence, droits,
  acompte natif, transfert avec acompte, solde mixte, vingt rejeux, rollback salle/stock/tenders
  et QR réglé depuis sa commande. Les tests de remboursements passent de 9 à 12 ; les visites
  passent à 11 avec un test de verrous fondé sur `pg_locks` et une barrière, pas un délai supposé.
- `npm run build` : cinq applications compilées ; gros bundles existants non qualifiés en charge.
- Comparateur de reprise `--self-test` : 23 / 23, lecture seule.
- `BROWSER-P0-SUIVANT.json` : **15 observations**, Chrome neuf, loopback, comptes `.invalid`.
  Acompte 1 € puis 2,50 € mixtes, pertes de réponses après commit, reconnexion, trois affectations
  pour une commande et un reçu, monnaie exacte, remboursement motivé, HTML/CSV téléchargés,
  PDF d'avoir réel, aucune exception JavaScript. Trois largeurs, aucun débordement du panneau POS.
- PDF A4 d'avoir rendu avec Poppler et inspecté ; historique 3 %, références et montants lisibles.
  Pas d'imprimante/terminal. Baseline visuelle absente : **INCONCLUSIVE** ; pas de verdict de
  conformité d'accessibilité, aucune mesure Core Web Vitals complète ni de charge d'un service.
- `RESTORATION-2.0.json` : écrivains arrêtés, archive v2 + AES-GCM puis base neuve, **70 tables
  égales**, huit fichiers, huit PDF facture et sept d'avoirs valides. Avec données nouvelles :
  workspace 1, changements 20, sessions/couverts 6, tenders 18, provenances 6, déclaration 1.
  1 769 ms sur cette petite copie, pas un RTO ; médias absents, réserves PayPal vides dans l'archive.
- Après redémarrage des cinq services locaux, six vérifications de lecture réussies : autorité
  PostgreSQL, reçu retrouvé, couvert soldé absent, trois affectations exactes, remboursement
  et rapprochement retrouvés. Preuve privée distincte `RESTART-P0-SUIVANT.json`.

Échecs effectivement reproduits puis corrigés : autorité mémoire ancienne, sauvegarde concurrente
écrasante, endpoint d'acompte absent, rejouabilité parallèle, modification après acompte,
réinitialisation de préparation, nouvelle voie d'encaissement contournant le reçu POS, refus PayPal
non distingué, absence de déclaration de remboursement, cycle de verrous société/table QR.
Le parcours navigateur a révélé un couvert vide inclus dans la demande : il est désormais exclu.
Des corrections du script de recette (route CRM, reconnexion obligatoire, émission au statut déjà
réglé) ne sont pas présentées comme des corrections produit. Le limiteur de connexions a été observé,
pas désactivé en production pour faciliter la recette.

Non testé : sandbox PayPal/Stripe réel, banque, imprimante, panne électrique, charge en service,
profils historiques T04, transferts de visites QR non implémentés et rapprochement des versements.
La recette passée ne suffit pas à autoriser la mise en production. Détail et commandes :
`SESSIONS-ET-RAPPROCHEMENT-P0.md`. Les sections qui suivent conservent les preuves des lots antérieurs.

## Historique des lots précédents

## Référence du 16 octobre 2026

Référence actuelle du lot financier `dfb708a` : **395 unités** (260 backend, 89 web, 46 POS),
**112 intégrations PostgreSQL** dans douze fichiers, cinq compilations et 23 auto-contrôles du
vérificateur de restauration réussis. Les résultats ci-dessous sont les étapes historiques,
pas des tests supplémentaires à additionner. Aucun prestataire bancaire réel utilisé.

Suites concernées : POS 15, commandes 9, paiements 26, avoirs 8, remboursements 9, caisses 5.
Échecs reproduits avant correctifs : revente d'une ligne déplacée, copie QR/native,
plusieurs ouvertures concurrentes, remboursement sur la part d'une autre commande et
rapport fiscal ignorant les avoirs. Vingt appels concurrents et droits/sociétés testés.
Les huit tests de références UI préservent une demande incertaine ou corrompue ; l'export
navigateur possède désormais dix-sept tests, dont ces nouvelles références chiffrées.

`BROWSER-FINANCIAL-P0.json` : **17 observations** dans Chrome neuf, localhost, données fictives.
Acompte espèces puis solde carte déclaré, perte volontaire des deux réponses après commit,
rechargement et rejeu sans doublon, mouvement motivé, clôture 101 €, relecture figée,
CSV de caisse, avoir 3 € puis solde 8,70 €, vrai PDF, CSV documentaire et refus du faux net fiscal.
Captures 375/768/1440 ; PDF d'avoir rendu/inspecté. Zéro exception JS sur ce parcours.
Comparaison visuelle **INCONCLUSIVE** sans baseline ; axe, clavier complet, lecteur d'écran et
Core Web Vitals non qualifiés. Aucun test d'impression physique ou paiement bancaire.

Restauration du lot financier, applications arrêtées : **65 tables**, huit fichiers, sept PDF
de factures et six d'avoirs identiques/intègres après AES-GCM et restauration native dans une
base neuve ; 1 646 ms sur cette petite copie, pas un RTO. Huit affectations, quatre caisses,
trois mouvements. Les tables de provenances POS/remboursements sont vides dans cette archive,
leur persistance non vide étant éprouvée en intégration. Médias absents explicitement.
La rétention a retiré un ancien dump du laboratoire seulement ; originaux conservés.

Reproduction : `node ../local-2.0/run.mjs unit`, `node ../local-2.0/run.mjs integration`,
`node scripts/verify-restored-copy.mjs --self-test`, puis script privé
`node ../local-2.0/browser-financial-p0.mjs` avec fixtures `.invalid`.
Voir `COEUR-FINANCIER-P0.md`, `T04-REPRISE-HISTORIQUE.md` et le checkpoint pour les limites.

### Étape ticket/facture précédente

Lot précédent : **384 unités et 82 intégrations PostgreSQL**, tous réussis. Backend, web et POS
compilés ; avertissement de taille de bundle POS conservé. Neuf intégrations ticket/facture,
dont vingt demandes concurrentes et contraintes SQL. Chrome neuf : **douze observations**,
journal → connexion → ticket conservé, facture unique, TTC correctement affiché, trois PDF,
rechargement, journal/clôtures inchangés. Première émission puis relecture effectuées.
Nouvelle restauration : **59 tables, huit fichiers et trois PDF** identiques, AES-GCM vérifié,
1 529 ms sur cette petite copie (pas un RTO). Voir `FACTURE-DEPUIS-TICKET.md`.

Les références suivantes décrivent les étapes précédentes, pas des résultats supplémentaires à additionner.

Complément RH : **384 unités** (258 backend, 80 web, 46 POS) et **73 intégrations**, tous réussis.
Backend et web recompilés après ce complément ; les trois autres fronts sont inchangés depuis
leur compilation réussie ci-dessous. Huit intégrations RH : fuite d'annuaire reproduite puis
corrigée, cloisonnement, octets originaux, corruption et suppression reprenable. Cinq nouveaux
tests unitaires : écrasement, fsync échoué, chemins et bornes de charge.

`BROWSER-HR-DOCUMENTS.json` : neuf observations réussies via les contrôles de création de salarié,
upload, ouverture, rechargement, connexion salariée, suppression et refus ultérieur. Fixtures seulement.
Dernière restauration : **59 tables, huit fichiers dont deux pièces RH, deux PDF**, égaux après
AES-GCM. Durée de cette petite copie : 1 503 ms, sans promesse RTO. Voir `DOCUMENTS-RH.md`.

**379 tests unitaires** (253 backend, 80 web, 46 POS), **65 intégrations PostgreSQL** et
compilation des cinq applications réussis. Les échanges bancaires restent simulés ; aucun
paiement PayPal sandbox réel ni essai physique d'imprimante n'est inclus.

- `guest-visits.integration.test.ts` : dix cas, ancien QR refusé, révocation, isolation entre
  groupes et sociétés, prix serveur, référence liée au contenu, visite concurrente, expiration,
  retour bancaire tardif après fermeture. Le dialogue bancaire est remplacé.
- `server.test.ts` et `floorBridge.scope.test.ts` POS : dix cas de réponses tardives, changement de
  compte, cookie d'un autre utilisateur, adhésion retirée, renouvellement concurrent, règlement
  et clôture terminés après déconnexion. Aucune contamination de la société suivante.
- `browser-recovery.test.ts` : seize contrôles de copie chiffrée, empreintes, données malformées
  conservées, types non sérialisables refusés, IndexedDB et caches historiques. Aucun rejeu.
- `verifier-restauration.test.ts` : dix-huit contrôles hermétiques ; Docker simulé.

Recette Chrome neuf, données fictives, preuves privées :

- `BROWSER-VISITS.json` : dix observations, QR ouvert et fermé par clics, commande à 3,50 € sans
  inscription CRM, ancien lien refusé, seconde visite avec solde nul, aucune exception JavaScript.
- `BROWSER-POS-PRICING.json` : six observations, catalogue passé de 3,50 € à 6 € et de 3 % à 17 %,
  reconnexion, commande conservée à 3,50 € avec sa TVA historique de 0,10 €, espèces reçues 5 €,
  rendu 1,50 €, vente retrouvée dans le journal.
- `BROWSER-RECOVERY.json` : quinze observations, téléchargements archive/clé puis relecture,
  IndexedDB et cache inchangés, mauvais fichier invalidant le succès, mauvaise clé refusée,
  deux origines séparées, aucune requête API ni exception. **Profils historiques réels non exportés.**

Nouvelle sauvegarde applications arrêtées, déchiffrement AES-GCM et restauration native :
**59 tables égales, six fichiers et deux originaux PDF intègres**. Médias absents explicitement.
Durée observée sur cette petite copie : 1 671 ms, sans promesse RTO. La rétention a supprimé un
ancien dump de la copie de travail ; archives initiales préservées. Preuve `RESTORATION-2.0.json`.

Reproduction depuis le parent : `node local-2.0/run.mjs unit`, `node local-2.0/run.mjs integration`,
`node local-2.0/browser-visits.mjs`, `node local-2.0/browser-pos-pricing.mjs`,
`node local-2.0/browser-recovery.mjs`. Les scripts privés exigent le compte fictif `.invalid` et
créent des données de recette. Les suites partageables sont dans les workspaces du dépôt.

## Avancement du 8 octobre — vérifications distinctes

Dernier passage global après réunion des lots : **326 tests unitaires** (227 backend, 64 web,
35 POS) et **52 intégrations PostgreSQL**, tous réussis sous Vitest 4.1.11. Les preuves externes
restent limitées comme précisé ci-dessous. La correction de type JSON du snapshot POS ne change
pas ses valeurs. Les cinq applications compilent ; deux erreurs de typage des adaptateurs
dans les tests web ont été corrigées, puis dix tests ciblés et le build web repassés.
Les treize observations navigateur du parcours facture ont été reproduites après les derniers
changements de dépendances et de cache, toujours sans exception JavaScript.

La restauration v2 a été exécutée avec les applications arrêtées : **57 tables égales**, six
fichiers de données et un original PDF émis intègres, après chiffrement/déchiffrement AES-GCM.
Durée observée de cette petite copie : 1 698 ms, incluant archivage et comparaison. Cette mesure
ne permet pas d'annoncer un temps de reprise d'un établissement chargé. Médias absents dans cette
copie, inclusion éprouvée en tests distincts. Preuve privée : `RESTORATION-2.0.json`.

Les nombres ci-dessous décrivent leurs exécutions ciblées, ils ne s'additionnent pas tous :
certains fichiers sont communs à plusieurs passages. La suite complète est celle indiquée en tête.

- 41 intégrations avant les derniers lots : PostgreSQL réel, routes HTTP et autorisations ;
  échanges bancaires simulés. Deux cas utilisent un vrai dialogue SMTP loopback avec destinataire
  `.invalid` : pièce PDF identique et réponse perdue après DATA sans renvoi automatique.
- 31 tests paiement/factures repassés après les contrôles de rôle cuisine et la sauvegarde du
  profil légal. Ils incluent vingt numéros concurrents, original A4 immuable, accès intersociétés.
- 23 tests stockage/salles : fichier synchronisé avant succès, corruption bloquée explicitement,
  sauvegarde précédente préservée, pas de salle vide inventée en cas d'erreur.
- 40 tests middlewares/sauvegardes, puis 13 tests disponibilité/rotation d'authentification :
  panne sans promotion, jeton démo refusé en production, routeur global de sauvegarde fermé aux clients.
- 8 tests comptabilité et 5 intégrations CRM : TVA extraite du TTC, historiques incohérents
  rejetés, carte cadeau protégée par rôle, débits de portefeuille concurrents sérialisés.
- 13 observations navigateur dans des contextes Chrome neufs : fiche légale enregistrée puis
  relue, client société, facture HT à deux taux, émission, PDF A4/58/80 effectivement téléchargés,
  autre session et empreinte A4 identique ; aucune exception JavaScript sur ce parcours.
  Preuve privée : `BROWSER-DOCUMENTS.json`. Le compte et les documents sont fictifs.
- Aperçus A4/58/80 rendus en PNG puis inspectés : accents, montants, groupes de TVA et pieds
  visibles. Ces aperçus sont des **factures**, pas une qualification d'imprimante thermique.

Les premiers échecs ont produit des corrections réelles : profil légal validé mais absent de
l'écriture SQL, réponse de changement de statut sans lignes, libellé Client ambigu pour
l'accessibilité, rendu PDF trop lent. Un échec de script dû au bouton Enregistrer déjà désactivé
a été corrigé en changeant réellement la donnée fictive ; il n'est pas compté comme défaut métier.

Les sections suivantes conservent les repères historiques de cette même mission.

Commandes du laboratoire depuis le dossier parent du dépôt :

```powershell
node local-2.0/run.mjs migrate
node local-2.0/run.mjs unit
node local-2.0/run.mjs integration
```

Le lanceur d'intégration impose la base fictive `creorga_tests`. Ne pas le configurer sur une
base contenant de vraies données. Le prestataire bancaire est remplacé, contrairement à la base,
aux autorisations et aux routes HTTP qui sont réelles.

Référence initiale de cette mission : 249 tests unitaires passent. Première recette de paiement : 10 tests passent,
après 9 échecs reproduits sur la version initiale. Les cas vérifient commande intersociétés,
montant, devise, retour arbitraire, commande déjà payée, clé absente, lecture arbitraire,
rejeu simultané, références concurrentes et anonymat.

Non prouvés par ces tests : paiement PayPal sandbox, débit bancaire réel, sortie de papier,
caméra, cent scénarios du cahier des charges, panne électrique, performance durant un service.
Les résultats à venir complètent ce fichier ; aucune donnée fictive ne sert de preuve matérielle.

Seconde vérification : 255 unités (178 backend, 46 web, 31 POS), 25 intégrations
(19 paiement, 6 commande), puis cinq observations de navigateur réussies : inscription,
société reçue, nom sauvegardé, salle vide, aucune exception JavaScript.
Preuve privée : `BROWSER-SMOKE.json`.

Un test de concurrence de salle dépendait de délais 30/100 ms. Il utilise maintenant
des barrières explicites : la première requête entre, la seconde confirme son écriture,
puis la première reprend et doit obtenir 409. La protection n'a pas été affaiblie.
