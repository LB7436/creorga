# Allocation financière et recette étendue — 16 octobre 2026

## Verdict et périmètre

Lot de laboratoire, **pas une qualification de production**. Base de travail vérifiée :
`7c08307ae4096e03027b5afcfbde7a3f38f66caf`, dépôt `LB7436/creorga`, branche
[`codex/creorga-2-0-2026-10-08`](https://github.com/LB7436/creorga/tree/codex/creorga-2-0-2026-10-08).
Code : `4a4824b` (performance) puis `2931739` (allocation et corrections), références complètes
dans [CHECKPOINT.md](CHECKPOINT.md). Le commit documentaire suivant conserve les preuves.

La répartition financière **v1** d'une commande QR ouverte est implémentée et testée avec
remise historique et acomptes explicitement affectés. Ce n'est ni la séparation universelle
de toutes les ventes ni un nouveau système de facturation. Les cas non qualifiés sont refusés.

[Matrice actuelle](RECETTE-METIER-T01-T100.md) : **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN**.
Les 0 FAIL signifient seulement qu'aucune assertion de cette recette finale n'est en échec.
T100, les fonctions absentes et les essais externes empêchent toujours une recette complète.

## Environnement réellement utilisé

| Élément | Disponible et testé | Limites |
|---|---|---|
| Windows, Node 22.19, Prisma 5.22, PostgreSQL 16.15 | Unités, API et transactions réelles | Ce PC n'est pas une installation vierge |
| `creorga_tests`, loopback:5450 | 173 tests d'intégration sur données fictives | Prestataires bancaires remplacés ; cas de miroir JSON substitué explicitement |
| `creorga_local`, loopback:5450 | Chrome et restauration de copie privée | Écritures métier limitées à la société fictive de recette |
| API / web / POS / administration / portail | 3002 / 5174 / 5175 / 5177 / 5178, loopback | Aucun service public déployé |
| Chrome 155, contextes neufs | Cinq parcours, sans profil persistant | Pas de profil historique ouvert |
| Ancien cliché privé de base | Lecture et dump, restauration en nouvelle base | Ni archive originale ni cliché source modifié |
| Imprimante, tiroir, terminal, PayPal sandbox officiel | Non qualifiés | Accès ou matériel manquants ; aucun paiement réel |
| Stripe Refunds et vidéo | Restent désactivés | Aucune activation ou recette matérielle prétendue |

Les lanceurs privés neutralisent les communications externes, conservent les comptes fictifs et
les secrets hors Git. Les cinq fichiers Chrome sont exécutés séquentiellement avec redémarrage
de la seule API privée entre fichiers, **limiteur de connexion normal conservé**. Le résultat
n'est donc pas un essai d'endurance de cinq parcours sans redémarrage.
Le fichier `apps/guest/tsconfig.tsbuildinfo` déjà modifié avant la mission est exclu des commits.

## A — Modèle et parcours de répartition

### Une créance d'origine, plusieurs projections de groupes

| Objet | Autorité et rôle |
|---|---|
| `Order` et `OrderItem` | Commande, prix, taux, quantités et notes historiques conservés, sans clonage |
| `ServiceAllocation` | Décision immuable, auteur, motif, empreintes de demande et d'aperçu |
| `ServiceShare` | Groupe, table, visite QR distincte, ventilation figée des lignes et centimes |
| `OrderTender` | Règlement toujours attaché à la commande et à sa provenance d'origine |
| `ServiceShareTender` | Affectation exacte du règlement à un ou plusieurs groupes |
| `TableMovement`, `FloorChange` | Résultat de reprise idempotent et journal de révision |

Le responsable choisit les quantités, groupes, tables, consignes cuisine/bar, le motif et
**chaque affectation d'acompte**. Aucun bouton ne décide silencieusement à qui attribuer un acompte.
L'interface propose un aperçu sans écriture, puis une validation séparée avec case d'acceptation.
Les autres employés n'ont pas accès à cette décision financière.

API : `POST /api/pos/financial-allocations/preview`, puis
`POST /api/pos/financial-allocations`. Le second appel exige UUID, révision attendue,
empreinte de l'aperçu et acceptation explicite. Le résultat est relisible par
`GET /api/pos/table-movements/:id`, limité à la société et à l'auteur.

Verrou financier société, verrous de tables ordonnés, verrou de commande, nouvelle lecture après
attente et CAS de salle protègent la confirmation. Un acompte arrivé entre aperçu et confirmation
invalide l'aperçu. Deux décisions concurrentes ne créent qu'une allocation. Une réponse réseau
perdue conserve la même référence ; le POS récupère le résultat sans recopier les lignes.
Les réponses tardives d'une autre société ou d'un autre utilisateur sont refusées côté POS.

### Politique de centimes, déterministe et journalisée

1. Trier les identifiants historiques des lignes et les clés stables des groupes par ordre binaire.
2. Conserver prix unitaires, taux et notes de l'original. Vérifier la cohérence du total et de la TVA
   historiques avant toute écriture ; refuser les valeurs qui nécessiteraient une réinterprétation.
3. Ventiler la remise globale historique entre lignes au prorata de leur brut, par plus forts restes.
4. Ventiler le net de chaque ligne entre ses unités ; les centimes résiduels vont aux premières
   unités dans l'ordre stable des groupes. Aucune quantité ne peut être oubliée ou affectée deux fois.
5. Ventiler la TVA **historique par taux** sur les portions nettes ; la base est le net moins cette TVA.
   Ne pas recalculer chaque portion indépendamment avec un arrondi qui changerait le total.
6. Exiger une affectation explicite et exacte de chaque règlement. Refuser groupe surpayé,
   règlement oublié, groupe inconnu et doublon de décision.

Exemple fictif testé : trois cafés à 3,50 €, total historique 10,00 €, remise 0,50 €.
Trois groupes reçoivent 3,34 / 3,33 / 3,33 €, avec remises 0,16 / 0,17 / 0,17 € et TVA
0,10 / 0,10 / 0,09 €. Un acompte de 5 € affecté explicitement 2 € / 3 € / 0 € laisse
1,34 / 0,33 / 3,33 € à régler. Le changement de catalogue ne remplace pas ces prix.
Un test distinct contrôle deux taux, des quantités partielles et des consignes différentes.
Les taux de ces fixtures ne constituent pas un conseil fiscal.

### Règlements et préparation

Depuis « Acompte / solde », un seul groupe réparti est choisi par déclaration. Espèces, carte
autonome déclarée ou mixte sont ventilées côté serveur ; le solde attendu est contrôlé.
Les paiements en cours ou incertains de l'original restent réservés : aucune allocation ni
nouvelle déclaration ne les contourne. Les nouvelles déclarations conservent `OrderTender`,
leur auteur, leur session de caisse et leur lien de groupe.

Le règlement d'un groupe ne dit pas que toute la commande est payée. Une seule vente POS et un
seul débit de stock de l'original sont produits **au règlement intégral de tous les groupes**.
Ce moment est le comportement actuel, pas une promesse de décrément du stock au service.
Les relectures et doubles clics ne produisent pas de second mouvement.
Une carte autonome déclarée n'est jamais présentée comme une confirmation bancaire vérifiée.

La cuisine garde son ticket d'origine, son état et ses quantités. Les portions apparaissent
dans un routage par groupe/table, avec consignes distinctes ; pas de deuxième préparation.
Les lignes historiques et les couverts ayant un acompte ne semblent plus éditables localement
dans les contrôles de quantité/note/ajout corrigés. Une nouvelle tournée se crée via un nouveau
groupe, pas en modifiant silencieusement une ligne financière figée.

### Confidentialité QR et refus de sécurité

Les anciennes capacités d'accès sont révoquées. Chaque groupe reçoit une **nouvelle visite**,
avec échéance héritée, sans prolongation implicite. Un lien distinct doit être renouvelé par
visite ; une ancienne photo ne devient pas l'accès au nouveau groupe. La lecture d'addition
et de commandes ne montre que les portions de la visite autorisée. Le jeton de suivi de
l'ancienne commande ne permet pas de contourner ce cloisonnement.
Les autres tournées de l'ancienne visite restent séparées ; elles ne sont pas redistribuées.

Cas volontairement refusés (409 explicite, pas d'écriture partielle) :

- Original réglé/annulé, visite fermée/expirée, historique fiscal incohérent ou prix/quantité
  non représentable par cette version ; deux à dix groupes, quantités entières seulement.
- Ancien original déjà entièrement couvert par ses règlements mais sans clôture : rapprochement
  responsable, aucune allocation entièrement soldée ni vente de régularisation inventée.
- Document fiscal déjà émis : aucune modification du document ou de son PDF. Une correction
  documentaire appropriée doit être traitée séparément, pas une renumérotation.
- Remboursement existant ou tentative/réservation active, UNKNOWN ou REVIEW : provenance
  conservée, rapprochement préalable. **La redistribution d'une commande déjà remboursée n'est pas livrée.**
- Geste de table non matérialisé, nouvelle remise sur une portion, allocation renouvelée,
  transfert/fusion d'une portion déjà répartie ou découpe financière native avec acompte.
- Encaissement global ou paiement en ligne des portions : connecteur non qualifié ; règlement
  explicite du groupe auprès du personnel. Pas de fausse confirmation de prestataire.

Les consignes de bouteilles/emballages remboursables n'ont toujours pas de modèle métier qualifié.
Les consignes de préparation cuisine/bar sont, elles, transportées. Ne pas confondre les deux.

## B/C — Recette étendue et défauts reproduits

Parmi les **29 anciens NOT RUN** : douze sont désormais exécutés/PASS, seize sont classés
BLOCKED avec fonction/prérequis manquant, et T100 reste honnêtement NOT RUN.

Nouveaux PASS : **T03, T08, T16, T17, T25, T36, T39, T42, T43, T46, T97, T98**.
Les trois cas bancaires sont des simulations de prestataire, **pas PayPal sandbox officiel**.
La preuve T08 est la révocation logicielle d'un jeton de caisse, pas un essai de matériel physique.
T03 vérifie les données migrées ; il ne qualifie pas tous les parcours métier historiques.

| Défaut effectivement reproduit | Correction / portée |
|---|---|
| Aucune répartition financière QR contrôlée | Aperçu, décision responsable, affectations, reprise et gardes SQL décrits ci-dessus |
| Lecture périmée pendant l'attente du verrou de commande | Relecture et conflit 409 avant calcul ; test PostgreSQL avec verrou réellement retenu |
| Un centime de TVA déplacé dans le reçu final à cause de l'ordre implicite SQL | Même ordre historique déterministe pour le reçu et contrôle de ses trois totaux avant commit |
| Ancien miroir JSON réintroduisant l'original dans l'addition du personnel | Original alloué exclu de la projection de secours, sans effacer la pièce ; test fictif 16,67 € → 6,67 € |
| Original historiquement couvert mais non clôturé accepté en allocation | Refus 409 et conservation des règlements, aucune vente ou clôture inventée |
| Tous les couverts inchangés réécrits lors d'un déplacement graphique | Synchronisation différentielle par couvert/session, même transaction/CAS |
| Température vide/espaces convertie en mesure, rapport vide affiché à 100 % | Température numérique requise, tableaux/booléens/objets refusés, source MANUAL imposée ; absence de mesure « Non mesuré » |
| Offert accepté avec simple libellé par défaut ; motif absent du reçu | Responsable + motif réel requis ; motif échappé conservé sur le reçu HTML |
| Réception partielle fournie mais commande fournisseur intégralement reçue | Requête non vide refusée sans modifier stock/statut ; réception partielle complète reste à développer |
| Refus fournisseur laissé indistinctement en attente | REVIEW et message de rapprochement ; réserve conservée, aucun second débit lancé |
| Annulation/édition destructive après début de préparation | Refus explicite ; workflow de correction signé non encore livré |

Compléments : lien durable devis → facture, conversion unique concurrente et relecture après réponse
perdue ; PDF complets à 99,99 / 100 / 100,01 € ; produit inactif exclu/refusé dans POS et QR ; congés
cloisonnés par salarié. Anciennes acceptations de devis et mesures sans provenance restent sans
provenance inventée. Les anciennes mesures HACCP ne sont pas requalifiées par cette migration.

Les **29 anciens BLOCKED ne sont pas débloqués par un test simulé**. Répartition actuelle :

| Catégorie | Nombre | Cas / prochaine condition |
|---|---:|---|
| `EXTERNAL` | 14 | T01 machine vierge, T09 restauration externe, T41 PayPal officiel, T56 comptes marchands, T57–T66 matériel/impression (T64 compris) |
| `HISTORY_AUTHORIZATION` | 1 | T04 : autorisation séparée et copie des profils historiques nécessaires ; profils restés fermés |
| `UNIMPLEMENTED` | 30 | T06, T18, T24, T40, T69, T71–T90, T91–T94, T99 : sites, corrections, variantes, XML/canal, liens documentaires, alertes/vidéo, achats/stock, langues |
| Logiciel corrigé dans ce lot | Hors compte BLOCKED | Défauts reproductibles ci-dessus, couverts par tests ; pas une nouvelle catégorie PASS artificielle |

Certaines lignes BLOCKED portent un **sous-test de garde-fou réussi** (T18, T92) : le refus sûr
n'est pas une réussite du parcours métier non implémenté. T100 est un travail logiciel restant,
pas un accès externe manquant : inventaire de tous les boutons, erreurs et modes dégradés à terminer.

## D — Profilage et ergonomie

[Comparaison appariée](preuves/profil-sauvegarde-comparaison-2026-10-16.json) : dix sauvegardes
du seul agencement avant/après, **même copie**, 226 tables, 646 couverts natifs, 1 276 lignes.
Le backend est arrêté pendant le profilage transactionnel, sans HTTP ni miroir JSON.

| Mesure comparable | Avant | Après |
|---|---:|---:|
| Requêtes par transaction d'agencement | 1 483 | 8 |
| p95 de cette transaction | 1 313,72 ms | 607,19 ms |

Cause : recherche/upsert par couvert puis comptage par session même sans changement métier.
Correction : lectures groupées, comparaison d'empreinte, écriture uniquement si lignes/destination
changent, clôture groupée des sessions vides. Les vrais changements restent persistés ; les
lignes matérialisées ne perdent pas leur verrou d'intégrité. Le snapshot global et son empreinte
existent encore ; aucune prétention de synchronisation différentielle complète.

**Ne pas comparer 607 ms au précédent p95 HTTP de 2 060 ms.** La dernière série Chrome complète
([mesures](preuves/performance-2026-10-16.json), 17:21 UTC) est exécutée sans builds/tests concurrents,
sur un autre jeu cumulé : 724 produits, 245 tables, 1 266 lignes, 95 ventes fictives au journal.
p95 HTTP+JSON : lecture 372 ms, sauvegarde 2 420 ms, paiement manuel fictif 1 100 ms ; dialogue
stable 399 ms. La [série antérieure avec compilations](preuves/performance-avec-builds-2026-10-16.json)
est conservée : 2 492 ms de sauvegarde, 721 produits / 238 tables / 1 281 lignes. Ce ne sont pas
deux séries appariées ; ne pas en déduire l'effet isolé des compilations.
**Le p95 HTTP global n'est pas démontré amélioré**. Il faut isoler et mesurer snapshot/miroir/
chargement et contention sur un jeu figé, puis tester plusieurs appareils avant de fixer une cible de service.

Chrome vérifie à 375/768/1440 px : absence de débordement des dialogues concernés, navigation
clavier, focus contenu, aperçu focalisé, validation explicite, erreur d'acompte visible, reprise
après réponse perdue, rechargement et reconnexion. Minimum automatique 7,44:1 sur les textes du
dialogue de séparation mesuré, pas tout le site. Aucun `pageerror` dans les cinq parcours.
Sans baseline, comparaison visuelle **INCONCLUSIVE**. Traductions complètes, lecteur d'écran,
zoom global, tous les contrastes et tous les écrans restent non qualifiés ; aucune certification WCAG.

## Validation actuelle et reprise

- **418 unités** : 271 backend, 91 web, 56 POS, sans échec ni ignoré.
- **173 intégrations PostgreSQL**, 18 fichiers, sans échec ni ignoré ; neuf cas dédiés à l'allocation.
  Conflits d'aperçu, 20 relectures, acompte concurrent, ancien QR, autre société/utilisateur,
  modification SQL interdite, PDF inchangé et absence de doublon de stock/vente sont contrôlés.
- **5 parcours Chrome réussis** : gestion HACCP/devis, allocation, performance/interface,
  fusion QR, séparations natives. Aucun essai bancaire réel.
- **5 applications compilées** : web, backend, POS, guest et administration. Avertissements de
  gros bundles conservés ; pas d'optimisation de bundles revendiquée.
- Schéma Prisma validé par la CLI sur URL de validation loopback, sans connexion à une base réelle.
- **23 autocontrôles** du comparateur ; **100 identifiants uniques et 8 contrôles** du générateur.
- Ancienne copie : **7 → 34 migrations**, 47 tables / 341 lignes historiques et colonnes identiques,
  cliché source inchangé ; [preuve](preuves/migration-ancienne-copie-2026-10-16.json).
- Sauvegarde finale à 17:22 UTC : **79 tables + 8 fichiers égaux**, données des trois nouvelles
  tables incluses (5 allocations / 10 groupes / 15 affectations), 9 PDF facture + 8 PDF avoir intègres.
  Archive v2, vrai pg_dump/pg_restore, AES-GCM avec clé séparée, nouvelle base, comparaison de toutes
  lignes/colonnes/octet PDF ; 2 952 ms sur cette copie, **pas un RTO**.
- **17 contrôles après redémarrage** ; [preuve publique expurgée](preuves/restauration-allocation-2026-10-16.json).
  Comptes, dumps, jetons QR, captures et clés restent privés, aucun export bancaire réel.

Commandes réellement utilisées, depuis la racine du dépôt, avec les lanceurs privés de ce PC
(ils exigent la configuration locale exclue de Git) :

```powershell
node ../local-2.0/run.mjs backend-unit --reporter=json --outputFile=../../../local-2.0/recipe-backend-unit.json
node node_modules/vitest/vitest.mjs run --root apps/web --reporter=json --outputFile=../../../local-2.0/recipe-web-unit.json
node node_modules/vitest/vitest.mjs run --root apps/pos --reporter=json --outputFile=../../../local-2.0/recipe-pos-unit.json
node ../local-2.0/run.mjs integration --reporter=json --outputFile=../../../local-2.0/recipe-integration.json
node ../local-2.0/run-browser-lab.mjs
npm run build
npm run build --workspace=apps/pos
npm run build --workspace=apps/guest
npm run build --workspace=apps/superadmin
node scripts/verify-restored-copy.mjs --self-test
node scripts/render-business-recipe.mjs --self-test
node scripts/render-business-recipe.mjs --reports=../local-2.0 --since=2026-10-16T16:20:00Z
```

La restauration et la migration ancienne utilisent des lanceurs privés avec validation de
destination loopback et création de nouvelle base ; procédure détaillée dans
[MIGRATION-REPRISE-ROLLBACK.md](MIGRATION-REPRISE-ROLLBACK.md).
Ne pas remplacer ces garde-fous par une URL de production ou un `migrate dev`/reset/seed.
Les transactions PostgreSQL sont réelles. Les prestataires sont remplacés ; le cas d'ancien
miroir substitue uniquement la lecture JSON par un objet fictif, sans fichier/profil historique.

## Priorités suivantes et conditions de passage

1. T100 : achever le catalogue exhaustif des contrôles/erreurs, notamment les autres actions sur
   groupes financiers figés. Les gardes serveur ne dispensent pas d'un retour d'erreur UX clair.
2. Étendre l'allocation avec workflow documentaire et de remboursement, transferts ultérieurs
   et correction signée de préparation ; ne pas lever les refus actuels sans les invariants/test associés.
3. Mesurer séparément le coût HTTP complet à jeu et processus constants, puis contention réelle.
   Le snapshot global reste un risque de latence en service. La liste de destinations à plusieurs
   centaines de tables mérite recherche/filtrage ; son absence ne doit pas être masquée par le test responsive.
4. Développer les fonctions réellement absentes listées dans la matrice, par lots réversibles,
   sans confondre les statuts de recette avec une roadmap déjà implémentée.
5. Après accès/autorisation distincts : machine vierge, PayPal sandbox officiel, matériel 58/80 mm,
   tiroir et terminal, sauvegarde externe, puis recette pilote métier. Vidéo et Stripe Refunds
   restent désactivés ; aucune banque réelle ou mise en production n'est autorisée par ce lot.

Méthode : TDD avec échecs reproduits avant correction, invariants Prisma/PostgreSQL et contrôles
Chrome/accessibilité ciblés. Des erreurs de fixtures/lanceurs ont aussi été corrigées (par exemple
sélection du gagnant concurrent et attente de disponibilité API) ; elles ne sont pas présentées
comme des défauts métier ni comme une qualification externe.
