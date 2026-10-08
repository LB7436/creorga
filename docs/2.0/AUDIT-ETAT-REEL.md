# État réel au début de Creorga 2.0

Révision de départ : `350b35120f44d2508d863a3a73f644eb0aa6b141`, consultée localement le 8 octobre 2026.
Le VPS Creorga a été retiré le 24 septembre ; le travail porte sur une copie Windows isolée.

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

`STRUCTURE.md` et `RAPPORT-AUDIT.md` décrivent une époque antérieure au PDF et au dump.
`CLAUDE.md` annonce que superadmin n'est pas un workspace et que les fronts n'ont pas de tests,
alors que le manifeste actuel inclut superadmin et des tests web/POS.
Les liens de branche GitHub sont évolutifs ; les références de cet audit sont celles du SHA ci-dessus.
