# État réel au début de Creorga 2.0

Révision de départ : `350b35120f44d2508d863a3a73f644eb0aa6b141`, consultée localement le 8 octobre 2026.
Le VPS Creorga a été retiré le 24 septembre ; le travail porte sur une copie Windows isolée.

## Mise à jour après les lots locaux

Complément du 16 octobre : gel des prix POS et revue tracée des lignes historiques incomplètes,
visites QR révocables, suppression des canaux publics de table, isolation des requêtes tardives
dans la caisse. Export navigateur chiffré testé sur fixtures, ancien restaurateur durci.
Référence actuelle : 379 unités, 65 intégrations, cinq compilations et parcours navigateur réussis.
Reprise courante : 59 tables, six fichiers, deux PDF intègres. Aucun paiement bancaire ni matériel
physique qualifié ; les anciens profils navigateur réels n'ont pas été exportés.

Complément RH : l'ancien contrôle du dossier était déjà correct, mais `/hr/team` renvoyait encore
les profils de collègues aux salariés. Fuite reproduite/corrigée. Octets et droits de téléchargement,
altération et suppression interrompue testés avec PostgreSQL et fichiers. Référence portée à
384 unités, 73 intégrations, neuf observations navigateur RH ; voir `DOCUMENTS-RH.md`.

Les constats de départ du tableau ci-dessous sont historiques. Dans la copie 2.0 :

- Commandes, captures et caisse utilisent des verrous communs ; montant et devise sont contrôlés
  côté serveur. Stripe et PayPal distinguent demande, attente, preuve confirmée et résultat incertain.
- Les nouvelles factures émises conservent leur contenu, PDF original et empreinte en PostgreSQL.
  Les anciens documents sans original sont explicitement reconstitués. Le profil légal est désormais
  persisté, la TVA ventilée, et les téléchargements ont été éprouvés par le navigateur.
- La lecture des salles échoue explicitement sur corruption. Les écritures JSON sont flushées ;
  la garantie matérielle en cas de coupure électrique reste à qualifier sur Windows.
- Les replis d'authentification qui inventaient un propriétaire lors d'une panne sont supprimés.
  Le routeur de sauvegarde client reste indisponible ; aucune fuite active par son ancien montage
  n'a été démontrée. Les requêtes et caches sont isolés au changement de compte ou société ;
  la qualification des anciens stores persistants reste distincte.
- Le rapport fiscal extrayait à tort la TVA de prix interprétés HT. Il utilise désormais la base TTC
  et les remises, et refuse un historique dont les totaux ne peuvent être réconciliés.
- L'émission de cartes cadeaux et les crédits de portefeuille exigent un responsable. Une carte
  prépayée est désormais un paiement, sans réduction de la vente ni de sa TVA.
- La sauvegarde v2 inclut données, médias et dump avec empreintes. Une copie a été restaurée
  et comparée : 57 tables, six fichiers et un PDF émis identiques. Médias absents de cette copie,
  explicitement signalés ; leur inclusion est testée séparément.

Les paiements bancaires sandbox, impressions physiques, vidéo et recette complète T01–T100
restent non validés. Voir les preuves datées et limites dans `RECETTE-ET-PREUVES.md`.

## Constats vérifiés

| Sujet | Constat | Preuve / conséquence |
|---|---|---|
| Restauration | 48 tables identiques et fichiers du snapshot repris | Dump réellement restauré, empreintes des lignes comparées ; originaux conservés |
| Tests historiques | La référence de 249 tests est reproduite maintenant | 172 backend, 46 web, 31 POS ; les tests navigateur restent distincts |
| Paiement | Le routeur initial n'appliquait pas de contexte société et transmettait le montant client | 9 régressions reproduites ; première correction testée avec une base réelle |
| Paiement concurrent | Plusieurs appels initiaient plusieurs demandes | Tentative durable et réservation désormais ajoutées ; dix contrôles API passent |
| Commandes | Ancien checkout : lecture puis mise à jour sans verrou atomique | À tester et corriger avant qualification |
| Prix catalogue | POS extrait la TVA d'un prix TTC ; route historique Orders additionne la TVA au même prix | Politique commune à implémenter ; préserver les transactions historiques |
| Fichiers | `safeWriteJson` écrit puis renomme sans synchronisation disque | Durabilité sur coupure électrique non établie |
| Documents | PDF serveur A4 présent ; rendu sans ventilation groupée des taux | Les anciennes affirmations d'absence de PDF sont dépassées |
| Documents historiques | PDF lit la fiche société actuelle | Snapshot d'émission à ajouter avant document fiscal stable |
| Sauvegardes | Dump natif/Docker et archive data présents | L'ancien constat « aucun pg_dump » est dépassé ; médias hors data à inclure |
| UI | Plusieurs modules restent fermés pour migration multi-locataire | Ne pas annoncer leurs fonctions comme utilisables ; inventorier chaque parcours livré |
| Paiements SaaS | Abonnement Stripe distinct et checkout désactivé tant que sa persistance n'est pas qualifiée | Ne pas confondre recettes du restaurateur et abonnements du produit |

## Environnement

| Élément | Disponible | État / preuve |
|---|---|---|
| Windows et Node | Oui | Node 22.19.0 |
| Prisma | Oui | Client 5.22.0 généré dans la nouvelle copie |
| PostgreSQL | Oui | Binaire portable 16.15, cluster neuf, SCRAM, loopback |
| Docker | Non utilisé | Accès à l'API Docker refusé dans le premier diagnostic ; le laboratoire fonctionne sans Docker |
| Tests HTTP / PostgreSQL | Oui | Base `creorga_tests` protégée par un contrôle explicite du nom de base |
| Prestataire PayPal | Non configuré | Aucun paiement sandbox ni réel annoncé |
| Imprimante thermique | Non qualifiée | Prévisualisation possible, preuve physique absente |
| Caméras | Non qualifiées | Pas de flux utilisé, vidéo désactivée |

## Documents à actualiser

Complément du 16 octobre : le parcours ticket POS → facture société est désormais implémenté
pour les reçus v2 cohérents. Neuf tests d'intégration PostgreSQL et douze observations Chrome
vérifient son unicité et la conservation des montants sans nouvelle vente. Les anciennes pièces
incomplètes, avoirs et qualifications comptables restent hors validation. Voir
`FACTURE-DEPUIS-TICKET.md` et la référence actuelle dans `CHECKPOINT.md`.

`STRUCTURE.md` et `RAPPORT-AUDIT.md` décrivent une époque antérieure au PDF et au dump.
`CLAUDE.md` annonce que superadmin n'est pas un workspace et que les fronts n'ont pas de tests,
alors que le manifeste actuel inclut superadmin et des tests web/POS.
Les liens de branche GitHub sont évolutifs ; les références de cet audit sont celles du SHA ci-dessus.
