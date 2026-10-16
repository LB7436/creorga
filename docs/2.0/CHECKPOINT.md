# Checkpoint CréOrga 2.0 — 16 octobre 2026

Mission en cours. **Pas de qualification de production ni de recette complète T01–T100.**

## Références et environnement

- Copie source `creorga-2.0`, branche `codex/creorga-2-0-2026-10-08`.
- Départ `350b35120f44d2508d863a3a73f644eb0aa6b141` ; premiers commits `8682053`, `0775b0f`.
- Lot documents/intégrité/reprise `86a6a7a` ; lot du 16 octobre `d2da7b6`, publiés sur la branche dédiée.
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
déchiffrement identique, nouvelle base, comparaison des **59 tables**, six fichiers métier et
deux originaux PDF émis. Empreintes PDF vérifiées. Médias absents de cette copie, état explicitement
consigné ; leur inclusion est couverte par tests dédiés. Preuve privée `RESTORATION-2.0.json`.
Durée de cette petite copie le 16 octobre : 1 671 ms, pas une promesse RTO. Clé séparée du chiffré.
La rétention normale a supprimé un ancien dump de la copie de travail ; originaux préservés.

Migrations additives appliquées uniquement aux copies : journal POS `20260905220000`,
tentatives `20261008130000`, règlements `20261008143000`, affectations `20261008153000`,
documents émis `20261008163000`, envois de facture `20261008173000`, visites `20261008190000`.

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

Dernier passage global du 16 octobre : **379 unités** (253 backend, 80 web, 46 POS) et
**65 intégrations PostgreSQL** réussies. Prestataires bancaires simulés ; SMTP local.
Les cinq applications compilent. Chrome neuf : dix observations QR, six caisse/prix et quinze
export navigateur réussies. Les treize contrôles facture sont datés du 8 octobre. Aucun résultat
ne vaut impression physique ou paiement bancaire. Voir `RECETTE-ET-PREUVES.md`.

Audit dépendances : zéro alerte de production connue ; onze alertes restantes de développement.
Voir `DEPENDANCES-ET-LIMITES.md`. Pas de certification de sécurité.

## Non terminé / non qualifié

- Unification transactionnelle des sessions/lignes POS natives avec commandes et visites QR.
- Export T04 des anciennes ventes navigateur et qualification des stores persistants.
- Clôture et rapprochement comptable complets ; restauration Docker réelle non exécutée.
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

Prochaine action : compléter les vérifications P0 des accès RH, puis lien ticket/facture unique,
avoirs, paiements partiels et recette des clôtures. L'export réel T04 exige les origines/profils
historiques ; aucun de ces profils n'a été ouvert ou modifié par les tests.
