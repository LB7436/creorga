# Matrice des cent exigences

État de départ de la mission du 8 octobre 2026. Une ligne partielle ne signifie pas que le scénario complet est validé. Les preuves courantes sont dans RECETTE-ET-PREUVES.md et CHECKPOINT.md.

| ID | Priorité | Exigence | État actuel |
|---|---|---|---|
| T01 | P0 | installation neuve complète | Partiel : installation locale ; recette UI en cours |
| T02 | P0 | restauration sur copie avec pièces jointes | Reprise technique vérifiée ; consultation métier à compléter |
| T03 | P0 | migration de la copie ancienne | Migrations additives appliquées à une copie |
| T04 | P0 | export d’anciennes ventes navigateur sans perte | À implémenter ou à recetter |
| T05 | P0 | refus d’accès intersociétés | Partiel : paiements et commandes testés sur API |
| T06 | P0 | refus intersites selon rôle | À implémenter ou à recetter |
| T07 | P0 | panne de base sans élévation de privilège | Partiel : garde-fous production couverts en unité |
| T08 | P0 | révocation d’une caisse | À implémenter ou à recetter |
| T09 | P0 | restauration chiffrée de sauvegarde externe | À implémenter ou à recetter |
| T10 | P0 | rapprochement avant/après des ventes, TVA, soldes et documents. | À implémenter ou à recetter |
| T11 | P1 | vente café comptoir | À implémenter ou à recetter |
| T12 | P1 | table avec plusieurs tournées | À implémenter ou à recetter |
| T13 | P1 | transfert de table | À implémenter ou à recetter |
| T14 | P1 | fusion puis partage | À implémenter ou à recetter |
| T15 | P1 | partage par article | À implémenter ou à recetter |
| T16 | P1 | partage par montant avec centimes résiduels | À implémenter ou à recetter |
| T17 | P1 | offert avec permission et motif | À implémenter ou à recetter |
| T18 | P1 | annulation après envoi au bar | À implémenter ou à recetter |
| T19 | P1 | retour après vente | À implémenter ou à recetter |
| T20 | P0 | deux terminaux modifient la même session | Partiel : verrous PostgreSQL testés |
| T21 | P0 | double clic sur validation | API testée ; clic tactile à vérifier |
| T22 | P0 | perte réseau après validation locale | À implémenter ou à recetter |
| T23 | P0 | reprise sans double préparation | À implémenter ou à recetter |
| T24 | P1 | variantes de taille et suppléments | À implémenter ou à recetter |
| T25 | P1 | produit indisponible | À implémenter ou à recetter |
| T26 | P1 | clôture avec écart déclaré. | À implémenter ou à recetter |
| T27 | P0 | prix catalogue TTC | API et calcul TTC testés |
| T28 | P1 | facture à prix HT | À implémenter ou à recetter |
| T29 | P0 | plusieurs taux | Calcul par taux testé ; PDF à compléter |
| T30 | P1 | remise répartie | À implémenter ou à recetter |
| T31 | P1 | avoir partiel | À implémenter ou à recetter |
| T32 | P1 | acompte puis solde | À implémenter ou à recetter |
| T33 | P1 | facture complète depuis ticket sans double vente | À implémenter ou à recetter |
| T34 | P1 | changement ultérieur de fiche société sans modification du document historique | À implémenter ou à recetter |
| T35 | P0 | numérotation concurrente sur au moins vingt demandes | À implémenter ou à recetter |
| T36 | P1 | montant 99,99 €, 100 € et 100,01 € selon régime applicable | À implémenter ou à recetter |
| T37 | P1 | long document multipage | À implémenter ou à recetter |
| T38 | P1 | export fiscal réconcilié | À implémenter ou à recetter |
| T39 | P1 | acceptation de devis sans double conversion | À implémenter ou à recetter |
| T40 | P1 | XML électronique valide et XML invalide clairement rejeté. | À implémenter ou à recetter |
| T41 | P1 | PayPal sandbox payé | Accès sandbox manquants ; contrat HTTP simulé testé |
| T42 | P1 | refus | À implémenter ou à recetter |
| T43 | P1 | abandon | À implémenter ou à recetter |
| T44 | P0 | timeout après capture effective | Partiel : solde réservé après erreur réseau |
| T45 | P0 | webhook reçu deux fois | À implémenter ou à recetter |
| T46 | P1 | webhook avant retour navigateur | À implémenter ou à recetter |
| T47 | P0 | signature falsifiée rejetée | À implémenter ou à recetter |
| T48 | P0 | montant/devise/marchand incohérent rejeté | Contrôles de preuve en cours |
| T49 | P0 | événements désordonnés | À implémenter ou à recetter |
| T50 | P1 | remboursement partiel | À implémenter ou à recetter |
| T51 | P0 | deux tentatives concurrentes sur le même solde | Tentatives concurrentes testées sur PostgreSQL |
| T52 | P1 | paiement espèces + carte | À implémenter ou à recetter |
| T53 | P1 | terminal autonome affiché comme déclaration manuelle | À implémenter ou à recetter |
| T54 | P0 | paiement en attente sans faux solde nul | À implémenter ou à recetter |
| T55 | P1 | rapprochement frais/net/brut | À implémenter ou à recetter |
| T56 | P1 | séparation des abonnements CréOrga et recettes du commerçant. | À implémenter ou à recetter |
| T57 | P1 | ticket 58 mm | À implémenter ou à recetter |
| T58 | P1 | ticket 80 mm | À implémenter ou à recetter |
| T59 | P1 | accents et euro | À implémenter ou à recetter |
| T60 | P1 | QR lisible | À implémenter ou à recetter |
| T61 | P1 | fin de papier | Non exécuté : matériel / environnement à qualifier |
| T62 | P1 | imprimante débranchée puis rebranchée | Non exécuté : matériel / environnement à qualifier |
| T63 | P1 | accusé perdu et statut inconnu | Non exécuté : matériel / environnement à qualifier |
| T64 | P1 | duplicata sans écriture supplémentaire | Non exécuté : matériel / environnement à qualifier |
| T65 | P1 | tiroir non ouvert à la réimpression | Non exécuté : matériel / environnement à qualifier |
| T66 | P1 | cent lignes sans troncature | À implémenter ou à recetter |
| T67 | P1 | facture reçue dans boîte de test avec vrai PDF | À implémenter ou à recetter |
| T68 | P1 | échec d’envoi et reprise sans doublon | À implémenter ou à recetter |
| T69 | P1 | lien expiré | À implémenter ou à recetter |
| T70 | P0 | pièce d’une autre société inaccessible. | À implémenter ou à recetter |
| T71 | P1 | table 3 addition ouverte après départ déclaré | À implémenter ou à recetter |
| T72 | P1 | client revenu | À implémenter ou à recetter |
| T73 | P1 | personne encore à table | À implémenter ou à recetter |
| T74 | P1 | paiement au comptoir | À implémenter ou à recetter |
| T75 | P1 | table transférée | À implémenter ou à recetter |
| T76 | P1 | compte entreprise autorisé | À implémenter ou à recetter |
| T77 | P3/P4 | connexion caméra perdue | Non exécuté : matériel / environnement à qualifier |
| T78 | P3/P4 | image ancienne détectée | Non exécuté : matériel / environnement à qualifier |
| T79 | P3/P4 | décalage d’horloge | Non exécuté : matériel / environnement à qualifier |
| T80 | P3/P4 | caméra déplacée | Non exécuté : matériel / environnement à qualifier |
| T81 | P3/P4 | objet compté une fois malgré plusieurs images | Non exécuté : matériel / environnement à qualifier |
| T82 | P3/P4 | événement de porte sans table identifiable | Non exécuté : matériel / environnement à qualifier |
| T83 | P3/P4 | absence de séquence gérée sans fabrication | Non exécuté : matériel / environnement à qualifier |
| T84 | P3/P4 | masque de confidentialité effectif sur direct, clip, miniature et export | Non exécuté : matériel / environnement à qualifier |
| T85 | P3/P4 | absence de son | Non exécuté : matériel / environnement à qualifier |
| T86 | P3/P4 | purge et expiration des clips | Non exécuté : matériel / environnement à qualifier |
| T87 | P3/P4 | accès vidéo refusé à un rôle non habilité | Non exécuté : matériel / environnement à qualifier |
| T88 | P3/P4 | disque vidéo plein sans impact sur caisse | Non exécuté : matériel / environnement à qualifier |
| T89 | P3/P4 | URL caméra malveillante rejetée | Non exécuté : matériel / environnement à qualifier |
| T90 | P3/P4 | fichier vidéo corrompu isolé sans compromettre le service. | Non exécuté : matériel / environnement à qualifier |
| T91 | P2 | facture fournisseur importée deux fois | À implémenter ou à recetter |
| T92 | P2 | réception partielle distincte de la facture | À implémenter ou à recetter |
| T93 | P2 | recette et conversions de stock | À implémenter ou à recetter |
| T94 | P2 | inventaire et pertes | À implémenter ou à recetter |
| T95 | P2 | réservation concurrente | À implémenter ou à recetter |
| T96 | P2 | QR d’ancienne session révoqué | À implémenter ou à recetter |
| T97 | P2 | congé visible selon rôle | À implémenter ou à recetter |
| T98 | P2 | donnée HACCP manquante non inventée | À implémenter ou à recetter |
| T99 | P2 | langues et responsive | À implémenter ou à recetter |
| T100 | P2 | tous les boutons du périmètre livré ont un comportement vérifié, y compris l’erreur et le mode dégradé. | À implémenter ou à recetter |
