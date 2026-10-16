# Checkpoint CréOrga 2.0 — 16 octobre 2026

Mission en cours. **Pas de qualification de production ni de recette complète T01–T100.**

## Dernier lot — sessions et rapprochement, 16 octobre 2026

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
