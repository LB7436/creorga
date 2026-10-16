# Séparations de service et recette P0

16 octobre 2026. Base vérifiée locale et GitHub : `3b02765820e4f7f452cb812be88af608870c1937`,
incluant `23bba56`. Branche dédiée inchangée. Laboratoire privé uniquement, aucune production.

## Implémenté

`POST /api/pos/service-separations` porte une référence UUID, une révision attendue et une
sélection GROUP ou LINES. Résultat durable relisible par `GET /api/pos/table-movements/:id`,
limité à la société et à l'auteur. Verrou société, tables triées, commandes triées, CAS de salle
et journal sont dans la même transaction. Un conflit ne laisse pas une demi-séparation.

| Opération | Règle livrée |
|---|---|
| Groupe QR après fusion | Déplace la visite entière et toutes ses commandes ouvertes ; chaque autre groupe reste indépendant |
| Groupe natif avec acompte | Déplace le couvert complet, sans réaffecter son acompte, ses tentatives ou son solde |
| Une ou plusieurs lignes natives | Vers un autre couvert natif ou un nouveau groupe, à la même table ou une autre |
| Partie de quantité native | Identifiant de portion dérivé de la demande, origine conservée, quantité totale conservée |
| Prix/TVA | Copie de la quote historique vérifiée, même après changement de catalogue ; aucune consultation du tarif actuel pour remplacer l'ancien |
| Préparation déjà prête/servie | Ticket initial, état et quantité historiques conservés ; liste de routage des portions, pas de nouveau lot |
| Déplacement ultérieur | Routage recalculé aussi par le transfert/fusion de table existant |
| Suppression ultérieure d'une portion | Correction négative distincte ; le paiement d'une portion ne l'annule pas en cuisine |
| QR | Visite déplacée et visites à destination révoquées ; renouvellement séparé. Aucune capacité ne devient celle du groupe voisin |
| Réseau | Référence conservée sous société/utilisateur ; relecture après réponse perdue, refus des réponses tardives d'un autre compte |

Le POS propose « Séparer le groupe » et « Séparer une ligne » avec quantité et destination.
Les anciens déplacements de lignes via un brouillon sont refusés : ils pouvaient renvoyer une
préparation et ne possédaient pas le journal de séparation. Les transferts de couvert entier
compatibles restent disponibles. La caisse ne déplace pas sa projection avant confirmation.

### Refus explicites, sans modification financière

- Une partie d'une commande QR reste non prise en charge : déplacer **toute la visite**, pas
  copier ses lignes dans un nouveau couvert. Le solde n'est jamais ventilé arbitrairement.
- Une ligne native déjà matérialisée en commande/acompte ne se découpe pas ; déplacer son groupe
  complet. Même protection si le groupe de destination possède une commande financière.
- Remise globale ou article offert : séparation refusée, sans perte ni extension du geste.
- Consignes globales cuisine/bar, note ou client société différents à une destination occupée :
  refus. Les notes individuelles sont transportées telles quelles, sans nouvelle préparation.
- Chaise : utiliser le déplacement de la chaise complète, pas la nouvelle découpe de couvert.
- Consignes de bouteilles/emballages : aucun modèle de consigne lié et remboursable n'est configuré
  dans le schéma actuel. Un simple article « consigne » ne prouve pas ce système. Non livré.

Procédure : recharger la salle et les soldes ; identifier le groupe complet ; utiliser une table
distincte si nécessaire. Un responsable traite séparément toute correction commerciale/fiscale
avec motif et pièces (avoir/remboursement existants lorsque pertinents). Ne pas effacer un acompte,
une facture, une réserve ou une remise pour contourner le refus. Ne pas réémettre une vente réglée.
Un lien expiré n'obtient pas une nouvelle durée par simple renouvellement ; clôture contrôlée et
nouvelle visite seulement lorsque la situation du groupe a été traitée.

## Défauts reproduits et corrections

1. Endpoint de séparation absent (404) : groupes QR et lignes/quantités natives maintenant transactionnels.
2. Déplacement de ligne par brouillon accepté (200) : désormais 409 explicite ; aucun envoi cuisine caché.
3. Routage périmé après un nouveau transfert d'une portion : destination recalculée, ticket non renvoyé.
4. Suppression d'une portion ignorée par la préparation : correction distincte ; paiement non assimilé à annulation.
5. Réservation rattachée à la table d'une autre société acceptée (201) ; client étranger également non validé :
   vérification d'appartenance, lectures anciennes expurgées et contraintes composites SQL.
6. Vingt réservations simultanées créaient huit réservations : une seule création confirmée après verrouillage ;
   modification et réactivation vérifient aussi le conflit. Marge historique de 90 minutes conservée, pas
   nouvelle promesse de gestion des durées/capacités.
7. Lignes inaccessibles au clavier, absence de dialogue/focus encadré : sélection native, focus contenu,
   Échap et retour au déclencheur ; contexte arrière inerte pendant la fenêtre.
8. Contraste secondaire à 3,58:1 mesuré dans Chrome : couleur corrigée et nouvelle mesure du dialogue.
9. Limites incohérentes de salle révélées par le jeu cumulé : brouillon validé jusqu'à 300 tables,
   mais création unitaire bloquée dès 200. Les deux chemins utilisent maintenant la limite déjà
   validée de 300, avec test PostgreSQL. Cela ne constitue pas une qualification de charge à 300 tables.

Durcissement supplémentaire : le validateur de groupes acceptait les clés réservées de prototype ;
elles sont désormais refusées. Test d'entrée red/green exécuté, sans prétendre avoir démontré
une exploitation ou un accès intersociétés par cette voie.

Échecs de recette distincts : compteur de fixture ayant ignoré une commande native créée pendant le test,
sélecteur trop strict d'une table, attente du Journal alors que la caisse exige une reconnexion au
rechargement, `.at()` incompatible avec la cible TypeScript POS, premier cache Vitest bloqué par le sandbox.
Ils ne sont pas comptés comme défauts bancaires. Un essai de mesure interrompu a conservé ses données fictives.
Le limiteur de connexion a ensuite produit deux refus 429, confirmés par lecture HTTP ; seul le backend
privé a été redémarré, sans désactiver la protection. Le jeu de performance est maintenant réutilisable
par son marquage fictif : les répétitions n'ajoutent plus systématiquement 25 tables et 100 produits.

## Migration et reprise

Une seule migration additive nouvelle : `20261018130000_reservation_isolation`, réellement appliquée
le 16 octobre sur `creorga_local` et `creorga_tests`. Ajoute deux index uniques de parent, deux FK
composites **NOT VALID** et un index de recherche. Les anciennes lignes ne sont ni corrigées ni effacées.
NOT VALID signifie que les nouvelles écritures sont contrôlées, pas que toutes les anciennes relations
sont certifiées : revue séparée nécessaire. Les FK protègent aussi les appels SQL hors HTTP.

Les séparations réutilisent TableMovement et le snapshot PostgreSQL de salle. `lineOrigins` et
`kitchenBaselines` sont des champs serveur, non importables depuis le navigateur. Pas de nouvelle base
financière ni de réécriture des ventes, factures, captures, tenders ou réserves antérieures.

Ancien binaire interdit en écriture sur une salle contenant ces projections : il ne connaît pas la
préparation des portions. En cas de retour, arrêter les écrivains, conserver l'état courant, restaurer
dans une **autre** base et préférer un correctif en avant. Aucun down/reset/purge.

## Recette et limites

Voir [matrice T01–T100](RECETTE-METIER-T01-T100.md) et ses preuves horodatées, pas les seuls nombres
historiques du checkpoint. Les intégrations exécutent PostgreSQL réel et remplacent seulement les
échanges prestataire. Les parcours Chrome sont versionnés dans `tests/browser-lab` ; pas de profil persistant.
Les données d'essais sont conservées. Les mesures synthétiques n'ont ni seuil contractuel ni baseline.

Les quatre états ne sont pas interchangeables : PASS logiciel, FAIL reproduit non corrigé, BLOCKED
par accès/matériel/périmètre et NOT RUN. Les cent lignes documentées ne signifient pas cent scénarios réussis.
Impression thermique, tiroir, banque/PayPal sandbox officiel et coupure électrique restent bloqués.
Vidéo désactivée. Multilingue, lecteur d'écran, tous les boutons et service horeca complet non qualifiés.

Prochaine priorité : concevoir une allocation financière explicite pour les découpes QR/acomptes/remises,
avant de rendre ces cas actifs. Ensuite, recette métier des parcours non exécutés et qualification
du matériel/prestataire sur un établissement pilote autorisé. **Ne pas mettre en production.**

Référence de conception clavier vérifiée : [WAI-ARIA Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Le test ciblé ne vaut pas conformité globale WCAG ni essai avec lecteur d'écran.
