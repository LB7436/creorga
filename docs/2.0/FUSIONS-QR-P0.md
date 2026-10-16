# Transferts et fusions POS/QR — P0

16 octobre 2026. Code `23bba568ec54c7c0acc3861f3ba639f155c1dd3d`. Laboratoire seulement.

## Autorité et invariants

`POST /api/pos/table-movements` reçoit `requestId` UUID stable, `kind` TRANSFER ou MERGE,
`fromTableId`, `intoTableId`, `expectedRevision`. Authentification, société et rôle de service
obligatoires ; autorité PostgreSQL nécessaire. TRANSFER exige une destination sans addition.
MERGE déplace les couverts complets sans additionner/copier leurs lignes.

Verrous : société financière, tables triées, commandes triées. Même transaction pour localisation,
révocation des accès, sessions/couverts, CAS du plan et `TableMovement`. Un conflit de révision
tardif annule aussi les révocations et déplacements SQL. Le rejeu rend la réponse figée ; une
référence réutilisée différemment est refusée. Le résultat perdu est relu par
`GET /api/pos/table-movements/:id`, limité à sa société/auteur.

La localisation courante des commandes impayées (`Order.externalTableId`) et des visites
(`GuestVisit.tableId`) change explicitement. Identifiants, lignes, prix/TVA, tenders, allocations,
tentatives externes et documents restent inchangés. Les ventes payées ne sont pas déplacées.
Le journal conserve les IDs, sessions précédentes/cible et métadonnées des tables avant déplacement.
Le déplacement n'appelle ni stock, ni capture, ni nouvelle émission cuisine. Les tickets natifs
changent d'étiquette ; les commandes QR gardent leur état de préparation.

## Règles QR explicites

1. Lors d'un déplacement, tous les liens des visites ouvertes de source et destination sont révoqués.
   Même l'ancien QR de destination ne devient pas un accès à une addition fusionnée.
2. Les visites restent **deux groupes distincts**, éventuellement à la même table physique.
   Le personnel choisit le groupe (ID et numéros de commandes) avant de redonner un QR.
3. Une nouvelle capacité désigne la même visite, à sa localisation actuelle et avec son échéance
   d'origine. Le portail et les paiements publics restent filtrés par visite, pas seulement par table.
4. Afficher un nouveau lien ne ferme pas les autres liens valides de ce même groupe ; déplacement,
   fermeture et expiration les révoquent. La création ordinaire refuse une autre visite déjà ouverte.
5. Les références des paiements en cours ne sont pas réécrites. Le retour signé du paiement conserve
   sa tentative d'origine ; le personnel peut rapprocher cette tentative sans rouvrir un ancien QR.
   En cas de retour impossible, vérifier le journal : ne jamais demander de payer de nouveau sur timeout.

Le POS ne modifie pas optimistement les tables : il conserve la référence par société/utilisateur,
relit le résultat après perte de réponse et récupère les demandes connues au prochain démarrage.
Les brouillons génériques refusent toujours les modifications/transferts QR hors cette opération.

## Recette et limites

Six intégrations PostgreSQL : identités, QR anciens et renouvelés, solde partiel, paiement inconnu,
concurrence, tenant interdit, rollback tardif et consignes de préparation. Le test Playwright versionné
fait une fusion depuis le POS, perd sa réponse, renouvelle les deux QR et affiche l'addition existante
sans nouvelle commande. La recette privée ajoute un couvert natif avec acompte, une tentative PayPal
UNKNOWN, transfert ultérieur et rechargement de session. Voir `RECETTE-ET-PREUVES.md`.

Limites volontaires : pas de fusion des gestes commerciaux globaux ni de consignes cuisine différentes ;
refus explicite et aucune révocation en cas d'échec. Pas de redistribution fine des groupes/lignes
après fusion, ni association implicite d'une ligne native à un client QR. Les modules cuisine natif/QR
restent deux adaptateurs. Aucune autonomie de caisse sans serveur, aucune qualification de production.
