# Checkpoint CréOrga 2.0 — 8 octobre 2026

Mission en cours. **Pas de qualification de production ni de recette complète T01–T100.**

## Références et environnement

- Copie source `creorga-2.0`, branche `codex/creorga-2-0-2026-10-08`.
- Départ `350b35120f44d2508d863a3a73f644eb0aa6b141` ; premiers commits `8682053`, `0775b0f`.
- Lot documents/intégrité/reprise en validation avant commit. `git log` donne ensuite sa référence.
- `origin/master` contrôlé le 8 octobre : toujours le SHA de départ ; branche 2.0 non publiée.
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
déchiffrement identique, nouvelle base, comparaison des **57 tables**, six fichiers métier et
un original PDF émis. Empreinte PDF vérifiée. Médias absents de cette copie, état explicitement
consigné ; leur inclusion est couverte par tests dédiés. Preuve privée `RESTORATION-2.0.json`.
Durée de cette petite copie : 1 698 ms, pas une promesse RTO. Clé de reprise séparée du chiffré.
La rétention normale a supprimé un ancien dump de la copie de travail ; originaux préservés.

Migrations additives appliquées uniquement aux copies : journal POS `20260905220000`,
tentatives `20261008130000`, règlements `20261008143000`, affectations `20261008153000`,
documents émis `20261008163000`, envois de facture `20261008173000`.

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

Dernier passage global : **326 tests unitaires** (227 backend, 64 web, 35 POS) et **52 intégrations
PostgreSQL** réussis. Prestataires bancaires simulés ; deux tests SMTP utilisent un serveur local.
Les cinq applications compilent ; deux erreurs de typage dans les nouveaux tests web ont été
corrigées, dix tests ciblés puis compilation web repassés.
Treize contrôles navigateur du parcours facture repassés après dépendances/cache, avec vrais
téléchargements PDF et reconnexion indépendante. Aucun résultat ne vaut impression physique
ou paiement bancaire.

Audit dépendances : zéro alerte de production connue ; onze alertes restantes de développement.
Voir `DEPENDANCES-ET-LIMITES.md`. Pas de certification de sécurité.

## Non terminé / non qualifié

- Gel serveur des prix/taux des commandes POS ouvertes ; QR de visite révocables.
- Export T04 des anciennes ventes navigateur et qualification des stores persistants.
- Ancien outil de restauration à durcir ; clôture et rapprochement comptable complets.
- Ticket vers facture sans recréer une vente, avoirs, paiements partiels/remboursements complets.
- Qualification des connecteurs, résolution des paiements manuels incertains, journal financier.
- Impression physique, tiroir, panne électrique, réseau durant service, terminal et PayPal sandbox réel.
- Ensemble des parcours métier/UI, accessibilité ; cent scénarios non tous exécutés.
- Caméras absentes et vidéo désactivée ; surveillance permanente des tables exclue par défaut.

## Reprendre

Vérifier branche et diff ; lire `MIGRATION-REPRISE-ROLLBACK.md`. Ne pas exécuter de seed/reset ni
de test sur une base d'exploitation. Depuis le dossier parent : `node local-2.0/run.mjs unit`,
`node local-2.0/run.mjs integration`, puis lancer uniquement les services du laboratoire.
Les scripts privés lisent leur configuration sans afficher les secrets. Vérificateur partageable :
`scripts/verify-restored-copy.mjs` avec son guide.

Prochaine action : enregistrer le lot validé, puis corriger les prix historiques POS, les QR
de session et l'ancien restaurateur avec tests dédiés.
