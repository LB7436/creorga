# Checkpoint CréOrga 2.0 — 16 octobre 2026

Mission en cours. **Matrice T01–T100 documentée, mais pas de recette intégralement exécutée ni de qualification de production.**

## Lot courant — installation professionnelle sans jeux et T100

16 octobre 2026. Base locale/GitHub vérifiée `962c01b2767a06db510c6b0aa3e22d521da77534`,
branche `codex/creorga-2-0-2026-10-08`. **Code : `9e15b1a`**, le commit documentaire suivant
contient les preuves. [Rapport](PROFIL-PROFESSIONNEL-SANS-JEUX.md),
[checkpoint du lot](BUSINESS-ONLY-CHECKPOINT.md), [validation](preuves/business-only-validation-2026-10-16.json).

- Profil `CREORGA_BUSINESS_ONLY` réversible : un Node API + quatre interfaces compilées,
  PostgreSQL séparé, aucune importation de jeux/Three.js ni serveur Vite en mode métier.
  Jeux gardés dans Git et profil complet ; **99 fichiers récupérés avec empreintes vérifiées**
  au commit immuable de base. Aucune suppression GitHub/désinstallation Windows.
- Raccourci Bureau « CréOrga 2.0 » créé et relu ; lanceur exécuté sans UI (`-NoBrowser`).
  Chrome dédié neuf prévu, pas de double-clic physique revendiqué ni profil historique ouvert.
  Aucun démarrage Windows ajouté ; loopback et origines existantes conservés.
- Préférences modules : société/utilisateur/session, brouillon/refus/reset ; planning nocturne,
  minutes/pauses historiques, Europe/Luxembourg et clavier ; salle/portail monotones et réponses
  périmées rejetées. Portail/reset/onboarding sérialisés en PostgreSQL, PATCH minimal concurrent.
  Pas de réécriture des ventes ni réimplémentation des fonctions financières déjà validées.
- **518 unités (277 backend / 177 web / 64 POS), 178 PostgreSQL, 28 parcours Chrome** dans
  dix fichiers, zéro échec/ignoré. Cinq builds métier + cinq complets ; trois contrôles de
  livrable/hôte/guards. Échanges bancaires et IA remplacés, aucun paiement réel.
- Reprise courante 19:32 UTC : **79 tables, 8 fichiers et 17 PDF égaux**, AES-GCM/clé séparée,
  17 assertions après redémarrage ; 3 721 ms, pas un RTO. Les tables d'allocation contiennent
  7/14/21 lignes. [Preuve](preuves/restauration-business-only-2026-10-16.json). 34 migrations inchangées.
- Ressources comparables : working sets sommés 2 296,79 → 1 719,27 MiB (−25,14 %), 40–44 → 28
  processus, relance CLI chaude 4 278 → 3 040 ms. Le complet compilé mesure 1 533,97 MiB : aucun
  gain RAM attribué causalement aux seuls jeux. Modules p95 se dégrade 490,64 → 868,40 ms sur
  cinq mesures ; séries courtes, pages partagées non dédupliquées, aucun watt/économie déduit.
  Sauvegarde de salle, série distincte à 734 produits / 267 tables : médiane 1 738,82 ms,
  p95 2 325,22 ms ; pas un nouveau gain apparié. [Preuve](preuves/performance-business-only-2026-10-16.json).
- **Incident laboratoire :** deux dumps de rotation supprimés par une rétention distincte
  avant sa correction. 27 dumps absents récupérés depuis 36 ZIP du jour avec empreintes ; les
  journaux ne nomment pas les deux fichiers, donc correspondance exacte non prouvée.
  Originaux de conservation hors laboratoire intacts ; rétentions ZIP/dump désormais fermées
  dans le mode local essentiel. [Preuve](preuves/rotation-laboratoire-2026-10-16.json).

Windows, Node 22.19, PostgreSQL 16.15 loopback:5450, données fictives `creorga_local`/`creorga_tests`.
Profil métier laissé actif 3002/5174/5175/5177/5178, configs/archives/clés hors Git. Le buildinfo
guest préexistant reste hors commit. Aucun déploiement, master, VPS, DNS ni logiciel tiers modifié.

**Matrice inchangée : 54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN.** T100 partiel : inventaire
399 fichiers/3 680 contrôles/157 routes/826 gabarits ; toutes les entrées source restent NOT RUN.
Pas de qualification matériel, banque officielle/PayPal sandbox, IA/voix réelle, Android,
paie/calendrier légal, machine vierge ou cloud. OCR global et backups clients restent fermés.
Stripe Refunds et vidéo restent désactivés ; **pas de qualification de production**.

Reprise : même code récent en profil complet via `start-profile.mjs --full`, aucune donnée
supprimée. Incident : arrêter écrivains, conserver l'état puis restaurer dans une nouvelle base
et comparer avant reprise ; jamais remettre un ancien POS en écriture sur la base migrée.
**Prochaine action :** T100 par écran/rôle, Modules et snapshot de salle à profiler sur jeu figé,
calendriers/réglages planning et blocages logiciels, puis recette matérielle/prestataire séparée.

## Lot précédent — T100, erreurs d'interface et performance HTTP

16 octobre 2026. Reprise sur `c0ddd81eba5ea006af023ec4748d961d44337470`, dépôt et
branche dédiés inchangés. Commits de code : `245731f` (cuisine), `de37329` (POS),
`959ffec` (web/sécurité). Le commit documentaire suivant contient ce checkpoint et les preuves.
Aucun push vers master, aucune production ni suppression de données réelles.

- Inventaire AST reproductible des cinq applications, avec références de contrôles et routes,
  libellés réduits et limites explicites. Le scan initial comptait 3 666 contrôles ; total final
  dans [la preuve](preuves/t100-validation-2026-10-16.json) : **3 676 contrôles, 157 routes JSX,
  393 fichiers et 826 gabarits répétés**, aucun diagnostic de parsing. Chaque entrée statique demeure NOT RUN.
- Sauvegarde HTTP profilée à jeu figé : p95 **2 605,46 → 1 703,63 ms (−34,61 %)**,
  dix mesures après quatre échauffements, même empreinte, 726 produits / 251 tables / 650 groupes /
  1 250 lignes. Index cuisine linéaire sans retirer les garanties de préparation ou de durabilité.
  Dernière série Chrome distincte : p95 2 091,84 ms sur 730 produits / 258 tables / 1 254 lignes,
  aucune erreur JS ; elle n'est pas la mesure appariée instrumentée.
- POS : import atomique validé, undo/redo limité à la géométrie, données financières courantes
  préservées ; transfert réel via API existantes plutôt que copie catalogue ; gestes et inactivité
  corrigés ; raccourcis sans connecteur annoncés indisponibles, pas présentés comme implémentés.
- Web : jeton limité aux origines approuvées, confirmation Robi réellement contrôlée,
  séparation utilisateur/société/session/discussion, pièce PDF transmise de façon éphémère,
  erreurs d'alertes/stock/publicité visibles, vraie personnalisation et fausses protections retirées.
- Unités fraîches : **450 (272 backend / 114 web / 64 POS)**. PostgreSQL : **173**, prestataires
  remplacés. **21 parcours Chrome réussis dans huit fichiers**, cinq compilations et 12 tests
  d'outils réussis. Dates et parcours dans la preuve dédiée ; les simulations
  de frontières UI sont explicitement distinguées des écritures PostgreSQL réelles.
- Aucun schéma SQL modifié : les **34 migrations existantes** restent en place, aucun seed/reset.
  Assistant navigateur v3 : historique non attribuable conservé en quarantaine non affichée ;
  aucun ancien profil ouvert. `apps/guest/tsconfig.tsbuildinfo` préexistant reste hors commit.

**Matrice métier : 54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN** inchangée dans sa qualification.
T100 a désormais un inventaire et davantage de preuves ciblées, mais tous les contrôles, rôles,
erreurs et écrans n'ont pas été exécutés : il reste **NOT RUN / partiellement exécuté**, pas PASS.
Les précédentes preuves T01–T99 restent horodatées ; aucune fonction matérielle, bancaire,
historique ou absente n'est promue artificiellement par ce lot.

Sauvegarde/restauration et reprise du lot à 18:39 UTC : **79 tables, 8 fichiers, 9 PDF facture et
8 PDF avoir identiques**, chiffrement AES-GCM/clé séparée ; **17 contrôles** après redémarrage.
Durée de cette restauration : 3 221 ms, pas un RTO. [Preuve dédiée](preuves/restauration-t100-2026-10-16.json).
Archives privées, clés et configurations restent hors Git. Aucun envoi IA/bancaire réel,
déploiement, DNS, activation Stripe Refunds/vidéo ou modification d'archive originale.

**Prochaine action concrète :** reprendre l'inventaire T100 par écran/rôle avec ses variantes
réseau/persistance, puis reproduire les candidats de caches multi-sociétés et de configuration
portail/planning avant correction. Le snapshot global de salle reste coûteux malgré le gain mesuré.
Les essais externes et la recette métier complète restent nécessaires avant toute mise en production.

Rapport et commandes : [T100-CONTROLES-ET-PERFORMANCE.md](T100-CONTROLES-ET-PERFORMANCE.md).
Reprise et limites de retour : [MIGRATION-REPRISE-ROLLBACK.md](MIGRATION-REPRISE-ROLLBACK.md).

## Lot précédent — allocation financière et recette étendue

16 octobre 2026. Base locale/distance vérifiée avant travaux :
`7c08307ae4096e03027b5afcfbde7a3f38f66caf`, `LB7436/creorga`, branche
[`codex/creorga-2-0-2026-10-08`](https://github.com/LB7436/creorga/tree/codex/creorga-2-0-2026-10-08).
Commits de code validés :

- `4a4824b5fd4cdfc8bbf28ef1a60cba87459e8fba` — sauvegarde de salle différentielle et test.
- `2931739b2cd6e75283dbe67f3f6c2aa3e8c0f294` — allocation QR, corrections P0, quatre migrations
  additives et tests unitaires/PostgreSQL/Chrome.

Le commit documentaire qui suit contient les preuves et ce checkpoint. Aucune fusion vers master,
aucun déploiement. Le SHA documentaire est donné par `git log -1` sur la branche publiée.

### Implémenté et réellement testé

- Répartition financière QR **v1** entre 2–10 groupes : quantités, remise globale historique,
  centimes/TVA conservés, choix explicite de chaque acompte, consignes cuisine/bar distinctes.
  Aperçu puis acceptation responsable, contrôle de révision, audit et reprise par même UUID.
- Commande/tenders d'origine non clonés. Nouvelles visites QR par groupe, échéance héritée,
  anciennes capacités révoquées, lecture limitée au groupe. Préparation d'origine non relancée.
- Paiement partiel/mixte **manuellement déclaré**, un groupe à la fois. Stock et vente finale
  uniques au règlement intégral de l'original. Réserves incertaines jamais libérées par allocation.
- Gardes : original émis/remboursé, paiement en cours, réallocation ou transfert de portions
  déjà allouées refusés. Le workflow documentaire/remboursement de ces cas n'est **pas** livré.
- Corrections de recette : lecture périmée pendant verrou, réécritures inutiles de salle,
  motif réel d'offert + reçu, température vide/100 % fictif, refus bancaire visible avec réserve,
  annulation destructive après préparation bloquée, réception partielle dangereuse refusée.
- Dernières régressions couvertes : ordre SQL faisant varier la TVA finale d'un centime,
  ancien miroir JSON doublant l'affichage d'addition du personnel, original entièrement couvert
  mais non clôturé, espaces/booléens/tableaux acceptés comme température. Aucun original supprimé.
- Lien devis/facture durable et relecture idempotente ; produits inactifs refusés ; accès aux
  congés et nouveaux PDF aux trois seuils contrôlés. Source MANUAL des nouvelles mesures HACCP.

### Résultats actuels

| Contrôle | Résultat réellement exécuté |
|---|---|
| Matrice T01–T100 | **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN** |
| Unités backend / web / POS | **418**, soit 271 / 91 / 56, aucune ignorée |
| Intégrations PostgreSQL | **173**, 18 fichiers, aucune ignorée, prestataires remplacés |
| Chrome neuf | **5 parcours réussis**, sans profils historiques |
| Compilations | Cinq applications réussies ; avertissements de gros bundles conservés |
| Autocontrôles | 23 comparateur ; 100 identifiants et 8 contrôles du générateur |
| Ancienne copie migrée | 7 → 34 migrations, 47 tables / 341 lignes anciennes identiques |
| Restauration réelle | **79 tables + 8 fichiers égaux**, 9 PDF facture + 8 PDF avoir |
| Reprise après redémarrage | **17 assertions réussies**, allocations et PDF inclus |

Les 29 anciens NOT RUN deviennent 12 PASS, 16 BLOCKED et 1 NOT RUN (T100). Les 29 anciens
BLOCKED restent bloqués, sans qualification fictive. Total : 14 EXTERNAL, 1 HISTORY_AUTHORIZATION,
30 UNIMPLEMENTED. Les défauts logiciels corrigés ont leurs tests ; fonctions absentes non inventées.

Profilage apparié sur même copie (226 tables / 646 couverts / 1 276 lignes), dix transactions
d'agencement : **1 483 → 8 requêtes ; p95 1 313,72 → 607,19 ms**, hors HTTP/miroir.
Dernier HTTP Chrome p95 salle **2 420 ms**, sans builds/tests concurrents, sur un autre jeu cumulé
(724 produits, 245 tables, 1 266 lignes). Série antérieure avec builds : 2 492 ms, autre jeu.
**Aucun gain HTTP global démontré** face à l'ancien 2 060 ms. Le snapshot global reste à profiler.
Dialogues ciblés à 375/768/1440, clavier/focus/erreurs/reconnexion ; minimum texte mesuré 7,44:1
sur un seul dialogue. Pas de baseline visuelle, audit WCAG complet ou traduction intégrale.

### Données, migrations et limites

Windows, Node 22.19, Prisma 5.22, PostgreSQL 16.15 loopback:5450 ; applications
3002/5174/5175/5177/5178. `creorga_local` et `creorga_tests`, données fictives de recette.
Quatre migrations additives 20261018140000 / 141000 / 142000 / 150000, exécutées le 16 octobre,
34 migrations au total. Nouvelles tables restaurées avec données : 5 allocations, 10 groupes,
15 affectations de règlement. Archive v2, pg_dump/pg_restore natifs, AES-GCM et clé séparée.
La restauration finale (17:22 UTC) prend 2 952 ms sur cette copie, **pas un RTO**.
L'ancien cliché privé utilisé pour T03 est lu seulement et reste identique ; archives originales
et profils historiques intacts. Aucun reset/seed/purge, paiement réel, DNS, VPS ou production.
Le fichier `apps/guest/tsconfig.tsbuildinfo` déjà modifié reste hors commit.

**Non testé/bloqué :** matériel, PayPal sandbox officiel, comptes marchands externes, installation
vierge, restauration cloud et T04. Stripe Refunds et vidéo restent désactivés. Pas de redistribution
de remboursement/document émis, de déplacement ultérieur de portions allouées, de réception
partielle complète, de correction signée après préparation ou de modèle de consigne remboursable.
T100 et les autres fonctions absentes ne permettent pas de déclarer CréOrga prêt pour production.

Reprise : arrêter tous les écrivains, conserver l'état courant puis restaurer **dans une autre base**,
avec fichiers du même instant. Garder les réserves, provenances, parts et décisions. Ancien code
interdit en écriture ; correction en avant recommandée. Aucun down/reset ni suppression d'acompte.

**Prochaine action concrète :** achever T100 et le profilage HTTP à jeu/processus figés ; ensuite
étendre les cas financiers actuellement refusés avec workflow documentaire explicite, puis essais externes.
Rapport complet : [ALLOCATION-FINANCIERE-ET-RECETTE.md](ALLOCATION-FINANCIERE-ET-RECETTE.md).
Preuves : [matrice](RECETTE-METIER-T01-T100.md), [profilage](preuves/profil-sauvegarde-comparaison-2026-10-16.json),
[reprise](preuves/restauration-allocation-2026-10-16.json), [procédure](MIGRATION-REPRISE-ROLLBACK.md).

## Historique — recette métier et corrections P0/P1 avant 7c08307

16 octobre 2026. Base locale et GitHub relevée avant travaux : `3b02765820e4f7f452cb812be88af608870c1937`,
incluant `23bba56`. Même dépôt et branche `codex/creorga-2-0-2026-10-08`.

- **Code : `c55a987`** — réservations isolées et sérialisées, migration additive.
- **Code : `80a1c7e`** — séparations natives et groupes QR entiers, préparation, reprise et interface.
  [Branche exacte](https://github.com/LB7436/creorga/tree/codex/creorga-2-0-2026-10-08).
  Le commit de recette/documentation qui suit ces deux commits contient ce checkpoint et les preuves.
- Environnement : Windows, Node 22.19, Prisma 5.22, PostgreSQL 16.15 loopback:5450 ; applications
  loopback 3002/5174/5175/5177/5178. Données fictives de laboratoire, copie privée et `creorga_tests`.
  Aucune production, VPS, DNS, branche master, vraie carte, archive originale ou profil historique modifié.
  Le `apps/guest/tsconfig.tsbuildinfo` déjà modifié avant la mission reste hors commit.

### Livré et réellement testé

- Séparer une visite QR entière après fusion, avec toutes ses tournées, acompte et solde conservés.
  Déplacer un couvert natif complet avec acompte. Séparer une ou plusieurs lignes/quantités natives
  **avant matérialisation financière**, vers un groupe existant ou nouveau, même table ou autre table.
- Historique de prix/TVA et provenances conservés. Transaction PostgreSQL + CAS + audit idempotent,
  reprise après réponse perdue, anciennes capacités QR révoquées et renouvellement par groupe.
- Préparation d'origine conservée ; routage des portions explicite, sans doublon ni remise à zéro.
  Un transfert ultérieur suit les portions. Supprimer une portion émet une correction distincte ;
  la payer n'annule pas la préparation. Brouillon non audité ne déplace plus les lignes entre groupes.
- Réservations : table/client étrangers refusés, deux FK SQL composites, une seule réservation au
  créneau sur vingt demandes concurrentes, modification/réactivation également protégées. Jour
  Luxembourg testé au changement d'heure. Les anciennes relations ne sont pas réécrites.
- Interface : sélection clavier des lignes, fenêtres identifiées, focus encadré, Échap/retour au
  déclencheur, arrière-plan inerte et erreurs visibles. Contraste secondaire corrigé après mesure
  3,58:1 ; minimum courant 7,44:1 sur les textes du seul dialogue contrôlé. Largeurs 375/768/1440.
- Limite de création de table alignée sur les 300 déjà validées par le brouillon ; ce nombre n'est
  pas une capacité de production certifiée. Identifiants de prototype réservés refusés en entrée.

### Résultats courants, pas les nombres historiques ci-dessous

| Contrôle exécuté | Résultat |
|---|---|
| Matrice métier versionnée | **42 PASS / 0 FAIL / 29 BLOCKED / 29 NOT RUN** |
| Unités backend / web / POS | **410 réussites** : 267 / 91 / 52 |
| Intégrations PostgreSQL | **151 réussites**, 16 fichiers, prestataires remplacés |
| Chrome neuf | **3 parcours réussis**, fusion QR, séparation/reprise et performance/interface |
| Compilations | Cinq applications réussies ; avertissements gros bundles POS/superadmin conservés |
| Comparateur restauration | 23 autocontrôles réussis, distincts de la restauration ci-dessous |
| Générateur de matrice | 100 identifiants uniques, 7 contrôles de statut réussis ; preuves anciennes refusées |
| Restauration réelle de copie | **76 tables + 8 fichiers égaux**, 9 PDF facture et 8 PDF avoir intègres |
| Reprise après redémarrage | **8 lectures/assertions réussies**, y compris contraintes de la nouvelle base restaurée |

Restauration : écrivains arrêtés, nouvelle entrée de sauvegarde privée sans rétention sur les anciens
dumps, pg_dump natif, archive v2, AES-GCM et clé séparée, pg_restore transactionnel en nouvelle base.
Toutes lignes/colonnes et empreintes PDF comparées. Nouvelles données présentes : TableMovement 16,
Reservation 3, FloorChange 263, ServiceCover 727, ServiceSession 210. Les deux contraintes NOT VALID
restaurées sont présentes ; **pas** une validation de toutes les anciennes relations. 2 653 ms sur
cette copie, pas un RTO. Aucune ancienne archive supprimée par cette vérification. Cinq services privés redémarrés.

### Performance observée

Jeu cumulé fictif conservé : **712 produits, 221 tables, 1 308 lignes ouvertes** au moment de la mesure,
65 ventes au journal ; pas une journée réelle. Ryzen 7600X, 12 processeurs logiques, 63 Gio, Chrome 155,
loopback sans ralentissement artificiel. p95 : lecture bootstrap **275 ms** (20 essais), sauvegarde
confirmée **2 060 ms** (10), règlement manuel fictif **1 633 ms** (10), fenêtre opaque après animation
**366 ms** (10). Source : [mesures brutes](preuves/performance-2026-10-16.json).
Ces temps révèlent un coût de sauvegarde globale à profiler : aucune promesse de service rapide,
baseline comparative, charge multi-postes ou Core Web Vitals. Captures stables inspectées ; comparaison
visuelle **INCONCLUSIVE**, baseline absente. Pas de lecteur d'écran ni qualification globale WCAG.

### Non terminé / bloqué

- Découpe financière d'une commande QR, d'un acompte ou d'une remise globale/article offert : refus
  explicite avec procédure, pas allocation arbitraire. Consignes globales différentes ou client société
  différent : refus à destination occupée. Notes individuelles conservées ; pas de moteur séparé bar/cuisine livré.
- Bouteilles/emballages : pas de modèle de consigne remboursable configuré. Autonomie sans serveur non livrée.
- Les 29 NOT RUN sont détaillés dans la matrice : devis/conversion, seuils de facture, certains parcours
  stock/achats/RH/HACCP, alertes, multilingue complet et inventaire exhaustif des boutons notamment.
- Imprimantes thermiques/tiroir/terminal, sandbox PayPal officiel et banque réelle bloqués ; inventaire
  Windows lu, aucune impression lancée. Protocole préparé. Stripe Refunds reste désactivé. Vidéo désactivée.
- Profils historiques T04 fermés, récupération externe/cloud non réalisée. Qualification métier/comptable
  et bancaire réelle absente : **ne pas mettre CréOrga en production**.

Reprise concrète : lire [Séparations et recette P0](SEPARATIONS-ET-RECETTE-P0.md),
[la matrice](RECETTE-METIER-T01-T100.md) et la migration/rollback. Concevoir d'abord une allocation
financière explicite des découpes QR/acompte/remise, puis exécuter les parcours NOT RUN et qualifier
matériel/prestataires dans un pilote autorisé. Les fonctions déjà livrées ci-dessous ne sont pas à recréer.

Preuves privées : rapports Vitest JSON, rapport Chrome et captures, RESTORATION-2.0.json,
RESTART-RECETTE-METIER.json. Aucun secret publié. Les preuves publiques sont des résultats expurgés.

## Lots antérieurs conservés

## Dernier lot — fusions QR, remboursements et versements, 16 octobre 2026

- Dépôt `LB7436/creorga`, branche `codex/creorga-2-0-2026-10-08`. Base locale et distante
  vérifiée : `879155d769428d1a59d5b830ee180043785f668b`, incluant `6080a6a`.
- Code : **`23bba568ec54c7c0acc3861f3ba639f155c1dd3d`**.
  [Commit immuable](https://github.com/LB7436/creorga/commit/23bba568ec54c7c0acc3861f3ba639f155c1dd3d),
  [branche exacte](https://github.com/LB7436/creorga/tree/codex/creorga-2-0-2026-10-08).
  Le commit documentaire qui suit conserve les preuves et ce checkpoint sur la même branche.
- Répertoire réel : `creorga-2.0` sous le dossier projet, pas le dépôt vide parent.
  Windows, Node 22.19, PostgreSQL 16.15 loopback:5450, Prisma 5.22. Bases privées
  `creorga_local` et `creorga_tests` exclusivement. `master`, VPS, DNS et production inchangés.
  Le `tsconfig.tsbuildinfo` guest modifié avant la mission reste hors commit.
- **Implémenté :** transfert/fusion explicite POS/QR, identités des couverts/commandes conservées,
  acomptes et réservations de paiement inchangés, audit idempotent, CAS PostgreSQL atomique.
  Toutes les capacités QR des groupes concernés sont révoquées ; renouvellement distinct par
  visite, choix explicite du groupe dans l'interface. Pas de copie de lignes, stock ou préparation.
  Une addition renouvelée est maintenant visible sans créer une nouvelle commande.
- **Implémenté :** rapprochement PayPal avec événements/proofs/décisions conservés, association
  d'une référence inconnue uniquement après relecture exacte et preuve de sa clé prestataire.
  Libération `NOT_REFUNDED` seulement après refus terminal relu et décision responsable motivée.
  UNKNOWN non identifiable, preuve incohérente, panne ou état pending : réservation conservée.
  Un timeout de création tardif ne rétrograde plus une confirmation concurrente.
- **Implémenté, fictif uniquement :** relevés et versements, captures/remboursements/frais/retenues/
  libérations, calcul serveur du net, déduplication, écarts bloquants, relecture des pièces tardives,
  validation manuelle et historique. Aucun connecteur bancaire réel. Option d'import désactivée
  par défaut et activée uniquement dans le lanceur privé. CSV enrichi sans doubler ventes/encaissements.
- Migrations `20261018100000_table_movements`, `20261018110000_refund_reviews`,
  `20261018120000_bank_payouts` appliquées par `migrate deploy` aux deux bases privées.
  Aucun seed/reset/backfill des ventes. Le remplacement de l'unicité « une visite par table »
  est explicite et non destructif : plusieurs groupes séparés peuvent partager une table après fusion.
  Les préfixes 20261018 identifient la séquence ; exécution réelle le **16 octobre 2026**.
- **Testé actuellement : 406 unités** (265 backend, 91 web, 50 POS), **138 intégrations PostgreSQL /
  15 fichiers**, cinq builds, 23 autocontrôles de restauration, **un test navigateur versionné**.
  Six intégrations de déplacement : QR révoqués/renouvelés, acompte, tentative en cours, concurrence,
  conflit PostgreSQL tardif avec rollback des révocations, société et préparation.
  Prestataires simulés : ni sandbox PayPal réelle ni opération bancaire réelle.
- Chrome neuf : 15 observations finales POS/QR et 9 versements/remboursements, plus reprise
  après réponse perdue/rechargement observée lors du premier passage. Profils historiques intacts.
  Trois largeurs 375/768/1440 ; QR privés masqués dans les captures. Pas de baseline visuelle,
  axe, lecteur d'écran ou mesure de performance en service : **non qualifiés**.
- Dernière restauration réelle : **76 tables égales**, huit fichiers, neuf PDF facture et huit
  PDF d'avoir intègres ; AES-GCM vérifié, clé séparée. Les six nouvelles tables ont des données :
  `TableMovement` 3, `RefundReviewEvent` 5, `PayoutStatement` 1, `BankPayout` 1,
  `PayoutLine` 5, `PayoutDecision` 1 ; `RefundAttempt`/`RefundAllocation` contiennent deux lignes
  chacun, d'origine fictive. Mesure 1 847 ms sur petite copie, **pas un RTO**.
  Deux anciennes générations de dumps de travail ont été retirées par la rétention habituelle
  pendant les deux essais ; originaux et archives de reprise préservés.
- Services locaux redémarrés ; **neuf contrôles de lecture** confirment les couverts distincts,
  deux soldes de 2,50 €, paiement inconnu non payé, réserve et décisions conservées, versement
  fictif et ancien QR encore refusé. POS : `http://localhost:5175`, gestion : `http://localhost:5174`.
- Preuves privées : `unit-qr-refunds-payouts-final.log`, `integration-qr-refunds-payouts-final.log`,
  `build-qr-refunds-payouts-final.log`, `BROWSER-TABLE-MOVES.json`,
  `BROWSER-QR-REFUNDS-PAYOUTS.json`, `RESTART-QR-REFUNDS-PAYOUTS.json`, `RESTORATION-2.0.json`.
  Ni secrets, ni dumps, ni fixtures privées publiés. Test navigateur reproductible dans
  `tests/browser-lab/qr-movements.spec.ts`, configuration `playwright.lab.config.ts`.

### Limites et prochaine action concrète

Le lot est utilisable **pour recette en laboratoire**, pas déclaré prêt en production.
Stripe Refunds reste désactivé. PayPal réel/sandbox, vrais relevés/acquéreurs, terminaux,
impression physique, coupure électrique et recette métier T01–T100 restent non testés.
T04 et les profils historiques n'ont pas été ouverts. Vidéo toujours hors activation.

Les gestes commerciaux globaux et consignes cuisine différentes bloquent explicitement une
fusion plutôt que contaminer un autre groupe. Séparation fine d'un groupe/ligne après fusion,
affectation automatique des lignes natives à une visite QR, cuisine totalement unifiée et
véritable caisse autonome hors connexion restent à qualifier/livrer. Ne pas les annoncer terminés.
Le versement v1 rapproche une capture/remboursement entier une seule fois : découpage multi-versements,
change, litiges, corrections de relevés validés et connecteurs bancaires réels restent à développer.
Sans clé prestataire retrouvable ou preuve terminale fiable, le remboursement reste bloqué ;
aucune dérogation manuelle ne libère sa réserve.

Prochaine action sûre : compléter la séparation/réassociation fine des groupes et la qualification
des cas de gestes/consignes, puis corrections/versionnement des relevés et pagination. Pour les
essais prestataire ou matériels, une configuration et une autorisation distinctes restent nécessaires.
Ne pas refaire avoirs, acomptes, paiements mixtes, clôtures, factures ni les fonctions de ce lot.
Reprise : arrêt des écrivains, archive cohérente, restauration en nouvelle base, correctif en avant ;
jamais retour d'un ancien code en écriture sur les visites multiples ou réserves migrées.

Références : `FUSIONS-QR-P0.md`, `REMBOURSEMENTS-RAPPROCHEMENT.md`, `VERSEMENTS-BANCAIRES.md`,
`RECETTE-ET-PREUVES.md`, `MIGRATION-REPRISE-ROLLBACK.md`.

## Lot antérieur — sessions et rapprochement, 16 octobre 2026

- Base vérifiée locale/distante : `163d70dd7544dc4cf608da508cc849092ee87cba`.
- Code publié : **`6080a6a90fe864ad24f7b4565ee6988e56469fd4`**, contrôlé par `git ls-remote`.
  [Commit immuable](https://github.com/LB7436/creorga/commit/6080a6a90fe864ad24f7b4565ee6988e56469fd4).
  [Branche GitHub exacte](https://github.com/LB7436/creorga/tree/codex/creorga-2-0-2026-10-08).
- `master`, Contabo, DNS et production non modifiés. Le fichier généré guest déjà modifié
  avant le lot est conservé hors commit. Aucun secret, archive privée ni clé publié.
- Source de travail : sous-dossier `creorga-2.0`, pas le dépôt vide du dossier parent.
  Environnement Windows/PG16.15/Node22.19/Prisma5.22, mêmes ports loopback qu'au lot précédent.
- Autorité de salle PostgreSQL activée dans le **lanceur privé local uniquement**.
  Copie initiale conservée, révisions/empreintes, cache non maître, fichier miroir, audit des
  deltas. Nouveau lien session/couvert/commande ; transfert natif complet avec acompte testé.
- POS : acompte, partiel, mixte et solde dans l'interface, restant dû serveur, référence
  durable par compte, reçu final et retrait des lignes atomiques avec le règlement.
  Cuisine native : lots différentiels au lieu de relancer toute la préparation.
- Espèces/carte autonome : remboursement **déclaré**, lié à l'avoir/tender d'origine, droits,
  motif, justificatif HTML, plafonds et mouvement espèces uniques. PayPal refusé/à rapprocher
  avec preuve horodatée et réservation conservée ; aucun déblocage définitif livré.
- Rapprochement et CSV v1 : ventes, documents, encaissements, remboursements, frais connus,
  références de clôture séparés. Historiques sans tender signalés ; versements bancaires inconnus,
  non intégrés. Pas de grand livre ni de conformité comptable revendiquée.
- Migrations `20261017090000_floor_workspace`, `20261017100000_service_sessions`,
  `20261017110000_manual_refunds`, `20261017120000_refund_reconciliation_state` appliquées
  seulement à `creorga_local` / `creorga_tests`. Le préfixe 20261017 est un identifiant de
  séquence : exécution réelle le **16 octobre**, pas une preuve d'exécution future.
- Recette actuelle : **401 unités (264 backend, 89 web, 48 POS), 123 intégrations PostgreSQL
  / 13 fichiers**, cinq applications compilées, 23 autocontrôles de restauration.
  Banques simulées, pas sandbox prestataire réel. Concurrence, vingt rejeux, rollback global
  sur conflit, droits/isolation, QR et ordre des verrous couverts. Toutes suites existantes conservées.
- Chrome neuf : **15 observations**, réponse perdue après commit d'acompte puis solde mixte,
  reconnexion, un reçu final, remboursement déclaré, HTML/CSV téléchargés et PDF réel.
  Captures 375/768/1440, avoir A4 rendu/inspecté. Régression visuelle INCONCLUSIVE sans baseline ;
  axe, clavier complet, lecteur d'écran, performance en service et matériel non qualifiés.
- Reprise réelle applications arrêtées : **70 tables égales**, huit fichiers, huit PDF facture
  et sept d'avoirs intègres, chiffrement AES-GCM vérifié, clé séparée, 1 769 ms sur petite copie
  (pas un RTO). Avec données : workspace 1, changements 20, sessions/couverts 6, tenders 18,
  provenances 6, remboursement déclaré 1. Réservations PayPal vides dans cette archive,
  testées avec données en intégration. Originaux et profils historiques intacts.
- Preuves privées : `BROWSER-P0-SUIVANT.json`, `p0-suivant-*`, `*-p0-suivant-final.log`,
  `RESTORATION-2.0.json`. Écritures fictives interrompues conservées, pas de nettoyage réel.
  La rétention normale a retiré d'anciens dumps de travail, **pas les archives originales**.
- Les cinq services locaux ont été redémarrés. Six contrôles de lecture supplémentaires
  confirment le reçu, les trois affectations, la session soldée et le remboursement conservés :
  `RESTART-P0-SUIVANT.json`. La caisse est de nouveau accessible sur localhost:5175.

### Limites et prochaine action concrète

Les transferts/fusions QR restent **non implémentés** : le brouillon les refuse explicitement,
sans fausse sauvegarde ; le paiement QR partiel en caisse utilise bien la commande d'origine.
La séparation/édition de lignes après acompte, l'autorité de préparation native/QR complètement
unifiée, la résolution probante des remboursements incertains, les relevés de versements et
le format du logiciel comptable restent à faire. Pas de vente autonome sans connexion au serveur.
Stripe Refunds est une **étude seulement**, aucun adaptateur activé. T04 réel non exécuté.

Prochain lot sûr : rattacher les visites QR aux sessions lors de transferts/fusions sans
révoquer le mauvais groupe ni dévoiler son addition, avec tests des anciens QR et paiements
en cours ; conserver les identités et affectations existantes. Ne pas refaire les acomptes,
avoirs, clôtures ou conversions ticket/facture déjà livrés. Pour rollback : arrêt des écrivains,
archive courante puis restauration en **nouvelle base** ; jamais ancien code en écriture sur
les réservations/sessions migrées. Voir les trois nouveaux documents et la procédure ci-dessous.

Références : `SESSIONS-ET-RAPPROCHEMENT-P0.md`, `EXPORT-RAPPROCHEMENT-V1.md`,
`STRIPE-REFUNDS-ETUDE.md`. Aucun passage en production autorisé par ces résultats.

## État antérieur conservé — jusqu'à 163d70d

Les nombres et priorités des sections suivantes sont historiques ; l'actualisation ci-dessus
et les preuves de recette les complètent sans prétendre que toutes les exigences sont terminées.

## Références et environnement

- Copie source `creorga-2.0`, branche `codex/creorga-2-0-2026-10-08`.
- Départ `350b35120f44d2508d863a3a73f644eb0aa6b141` ; premiers commits `8682053`, `0775b0f`.
- Lot documents/intégrité/reprise `86a6a7a` ; lot du 16 octobre `d2da7b6`, publiés sur la branche dédiée.
- Complément RH `5605ec6` publié ; le lot suivant relie ticket et facture (voir historique de cette branche).
- Base du présent lot : `a59916a415e4c3e5ac06d7d0ccb150d651306d43`.
  Code financier : `dfb708a4748d485e25cb40287281de4a6613069e`. Le commit documentaire suivant
  précise les preuves et limites ; aucun déploiement public. Voir `COEUR-FINANCIER-P0.md`.
- `origin/master` contrôlé le 16 octobre : SHA de départ, préservée ; branche 2.0 poussée sur GitHub.
- Windows, Node 22.19.0, PostgreSQL portable 16.15 sur loopback 5450 ; Prisma 5.22.
- Laboratoire privé `local-2.0` adjacent au dépôt : secrets et données exclus de Git.
- API 3002 ; web 5174, caisse 5175, administration 5177, portail 5178, tous sur loopback.
- SMTP limité à la boîte locale de test ; connexions sortantes du backend limitées au loopback.
  Aucune clé bancaire réelle utilisée. Aucun déploiement, DNS ou opération Contabo dans ce lot.

## Données et reprise

Archives originales et copie de septembre préservées. Les profils navigateur existants ne sont
ni ouverts ni nettoyés. Snapshot initial : 48 tables réconciliées avec le dump, fichiers conservés.
Les modifications se font dans `creorga_local` et les fixtures dans `creorga_tests` seulement.

Restauration courante exécutée applications arrêtées : archive v2, copie chiffrée AES-GCM,
déchiffrement identique, nouvelle base, comparaison des **65 tables**, huit fichiers métier,
sept originaux PDF de facture et six d'avoirs. Empreintes PDF vérifiées. Médias absents de cette copie, état explicitement
consigné ; leur inclusion est couverte par tests dédiés. Preuve privée `RESTORATION-2.0.json`.
Durée de cette copie le 16 octobre : 1 646 ms, pas un RTO. Clé séparée du chiffré.
La rétention normale a supprimé un ancien dump de la copie de travail ; originaux préservés.

Migrations additives appliquées uniquement aux copies : journal POS `20260905220000`,
tentatives `20261008130000`, règlements `20261008143000`, affectations `20261008153000`,
documents émis `20261008163000`, envois de facture `20261008173000`, visites `20261008190000`.
Pièces RH `20261016140000_hr_document_integrity`, sans réécriture historique.
Lien ticket/facture `20261016150000_receipt_invoice_link`, unicité et appartenance à la société.
Lot financier : `20261016160000_sale_origins`, `20261016170000_credit_notes`,
`20261016180000_order_tenders`, `20261016190000_cash_ledger`,
`20261016200000_refund_attempts`, `20261016210000_refund_allocations`.
Aucun backfill de ventes, numéros, prix, règlements ou clôtures historiques. La copie restaurée
contient huit affectations, quatre caisses et trois mouvements ; provenances POS et réservations
de remboursements y sont vides (testées avec données en intégration, pas par cette archive).

## Implémenté et vérifié dans la copie

- Réservation persistante, verrous partagés, calcul serveur, clés stables, preuves marchand,
  montant et devise, affectation unique ; Stripe et PayPal ne valident pas un retour navigateur.
- Cartes cadeaux traitées comme paiement, pas remise ; débit atomique avec la caisse.
  Export fiscal TTC corrigé et refus des historiques impossibles à réconcilier.
- Factures : profil légal, client société, TVA par taux, original PDF figé et haché, rendus
  A4/58/80, numérotation concurrente ; anciens documents signalés comme reconstitués.
- File d'envoi idempotente ; SMTP accepté distinct de reçu ; résultat ambigu conservé.
- Panne de base sans propriétaire inventé ; isolation requêtes/caches au changement de session.
- JSON synchronisé avant succès, corruption de salle explicite ; sauvegarde v2 avec inventaire
  et empreintes des données, médias et dump ; vérificateur de restauration en lecture seule.
- Prix et taux des nouvelles commandes POS gelés par le serveur, anciens incomplets soumis à
  revue OWNER/MANAGER motivée ; interface de revue existante et tests d'autorisation.
- QR par visite révocable, anciens impayés réservés au personnel, QR permanent limité au menu.
  Paiement en cours encore rapprochable après fermeture ; aucun secret de visite au prestataire.
- Export navigateur autonome chiffré (localStorage, IndexedDB et caches), sans import/rejeu ;
  vérificateur Docker durci et testé par doubles. Reprise native réelle comparée ci-dessus.
- Caisse : réponses, renouvellements, encaissements et clôtures tardifs refusés après changement
  d'utilisateur/société ; références anciennes conservées dans leur ancien périmètre.
- RH : fuite du profil complet par `/hr/team` corrigée. Création exclusive des fichiers, fsync,
  empreinte, téléchargement contrôlé, suppression incomplète conservée et reprise visible.
- Ticket → facture société unique : prix TTC, remise, taux et émetteur historiques, hors pourboire/don ;
  aucune nouvelle vente ni encaissement. Journal → connexion → ticket vérifié. Voir `FACTURE-DEPUIS-TICKET.md`.
- Provenances POS uniques : ancienne projection déplacée dans un nouveau couvert et copie de ligne QR
  ne deviennent plus de nouvelles ventes. Unification complète des sessions JSON/SQL encore partielle.
- Avoirs partiels/intégraux séparés et numérotés, TVA et PDF historiques ; original inchangé.
  Correction commerciale répartie par taux, sans remboursement ni stock implicites.
- Affectations durables de paiements partiels/mixtes, solde serveur, QR limité au reliquat,
  pourboires/dons distincts ; réponse perdue et rejeu après rechargement testés.
- Remboursement PayPal réservé par avoir/capture/commande puis confirmé uniquement par preuve exacte.
  Création, timeout, concurrence et incohérences testés avec banques simulées, pas dans le vrai sandbox.
- Caisses v2 : ouverture unique, mouvements motivés, acomptes inclus, comptage, écart justifié,
  rapport immuable et retrouvé après rechargement. CSV opérationnel et journal factures/avoirs séparés.
  Ancien rapport TVA bloqué lorsqu'il ignorerait des avoirs ; pas de faux net fiscal.
- Références UI incertaines conservées sans écrasement ; export de reprise chiffré les inclut désormais.

Référence du 16 octobre : **395 unités** (260 backend, 89 web, 46 POS) et
**112 intégrations PostgreSQL** réussies, dont neuf ticket/facture. Vérificateur de restauration :
23 auto-contrôles. Prestataires bancaires simulés ; SMTP local.
Les cinq applications compilent. Chrome neuf : dix observations QR, six caisse/prix et quinze
export navigateur, neuf RH, douze ticket/facture et dix-sept du nouveau lot financier réussies.
Ces exécutions ne sont pas un audit de tous les écrans. Les treize contrôles facture HT sont datés du 8 octobre. Aucun résultat
ne vaut impression physique ou paiement bancaire. Voir `RECETTE-ET-PREUVES.md`.

Audit dépendances : zéro alerte de production connue ; onze alertes restantes de développement.
Voir `DEPENDANCES-ET-LIMITES.md`. Pas de certification de sécurité.

## Non terminé / non qualifié

- Unification transactionnelle complète des sessions/lignes POS natives avec commandes/visites,
  transferts, fusion et KDS. Les nouveaux garde-fous ne reconstruisent pas les provenances manquantes.
- Export T04 réel : profils non ouverts, export complet/provenance autorisés manquants.
  Étude et procédure prêtes dans `T04-REPRISE-HISTORIQUE.md`.
- Grand livre/export comptable qualifié, rapprochement frais/net/versements, anciennes sessions,
  règlements sans caisse ouverte ; restauration Docker réelle non exécutée.
- Avoirs article par article, remboursement espèces/carte déclaré et Stripe, libération des
  remboursements refusés/incertains, rapprochement automatique des webhooks de remboursement.
- Paiement partiel dans tous les parcours POS natifs ; un acompte QR se termine dans la gestion
  des commandes ou par paiement QR du reliquat. Anciens justificatifs incomplets à examiner.
- Qualification des connecteurs et résolution des opérations manuelles incertaines.
- Impression physique, tiroir, panne électrique, réseau durant service, terminal et PayPal sandbox réel.
- Ensemble des parcours métier/UI, accessibilité ; cent scénarios non tous exécutés.
- Caméras absentes et vidéo désactivée ; surveillance permanente des tables exclue par défaut.

## Reprendre

Vérifier branche et diff ; lire `MIGRATION-REPRISE-ROLLBACK.md`. Ne pas exécuter de seed/reset ni
de test sur une base d'exploitation. Depuis le dossier parent : `node local-2.0/run.mjs unit`,
`node local-2.0/run.mjs integration`, puis lancer uniquement les services du laboratoire.
Les scripts privés lisent leur configuration sans afficher les secrets. Vérificateur partageable :
`scripts/verify-restored-copy.mjs` avec son guide.

Prochaine action : achever l'autorité transactionnelle de session et les parcours POS de solde,
puis remboursements manuels traçables/rapprochement comptable et qualification PayPal sandbox.
T04 attend un export privé de provenance fiable ou une autorisation distincte de reprise sur copie ;
aucun profil historique n'a été ouvert ou modifié. Vidéo désactivée, aucun achat ni prestataire réel.
QA visuelle INCONCLUSIVE sans baseline ; axe, clavier complet et performances non qualifiés.
