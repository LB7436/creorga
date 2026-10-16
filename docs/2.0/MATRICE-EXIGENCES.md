# Matrice des cent exigences

État de départ de la mission du 8 octobre 2026. Une ligne partielle ne signifie pas que le scénario complet est validé. Les preuves courantes sont dans RECETTE-ET-PREUVES.md et CHECKPOINT.md.

| ID | Priorité | Exigence | État actuel |
|---|---|---|---|
| T01 | P0 | installation neuve complète | Partiel : installation locale ; recette UI en cours |
| T02 | P0 | restauration sur copie avec pièces jointes | Vérifié : 65 tables, 8 fichiers dont RH, 7 PDF facture + 6 avoir intègres ; médias absents ; réservations de remboursement absentes de cette archive |
| T03 | P0 | migration de la copie ancienne | Migrations additives appliquées à une copie |
| T04 | P0 | export d’anciennes ventes navigateur sans perte | Étude/procédure prête ; export chiffré testé sur fixtures ; profils réels interdits/non ouverts, provenance/export complet manquants |
| T05 | P0 | refus d’accès intersociétés | Paiements, commandes, visites et documents testés ; réponses tardives web/POS isolées ; périmètre global partiel |
| T06 | P0 | refus intersites selon rôle | À implémenter ou à recetter |
| T07 | P0 | panne de base sans élévation de privilège | Garde-fous testés avec panne simulée : middlewares, login, refresh, me ; aucun rôle inventé |
| T08 | P0 | révocation d’une caisse | À implémenter ou à recetter |
| T09 | P0 | restauration chiffrée de sauvegarde externe | Partiel : copie AES-GCM locale restaurée ; transfert/stockage externe non testé |
| T10 | P0 | rapprochement avant/après des ventes, TVA, soldes et documents. | Tables et octets comparés égaux sur copie ; anciennes ventes navigateur non rapprochées |
| T11 | P1 | vente café comptoir | Caisse fictive testée par clics jusqu'aux espèces, rendu et journal ; matériel restant |
| T12 | P1 | table avec plusieurs tournées | À implémenter ou à recetter |
| T13 | P1 | transfert de table | À implémenter ou à recetter |
| T14 | P1 | fusion puis partage | À implémenter ou à recetter |
| T15 | P1 | partage par article | À implémenter ou à recetter |
| T16 | P1 | partage par montant avec centimes résiduels | À implémenter ou à recetter |
| T17 | P1 | offert avec permission et motif | À implémenter ou à recetter |
| T18 | P1 | annulation après envoi au bar | À implémenter ou à recetter |
| T19 | P1 | retour après vente | À implémenter ou à recetter |
| T20 | P0 | deux terminaux modifient la même session | Partiel : verrous, provenance unique et vingt acomptes concurrents testés ; session de salle/KDS complète restante |
| T21 | P0 | double clic sur validation | API testée ; clic tactile à vérifier |
| T22 | P0 | perte réseau après validation locale | Partiel : Chrome perd les réponses après commit serveur puis rejoue après rechargement sans doublon ; caisse autonome hors réseau non qualifiée |
| T23 | P0 | reprise sans double préparation | À implémenter ou à recetter |
| T24 | P1 | variantes de taille et suppléments | À implémenter ou à recetter |
| T25 | P1 | produit indisponible | À implémenter ou à recetter |
| T26 | P1 | clôture avec écart déclaré. | Session v2, acomptes/mouvements, motif d'écart, vingt reprises et rapport figé testés ; CSV/relecture navigateur ; comptage physique non testé |
| T27 | P0 | prix catalogue TTC | Gel serveur testé, catalogue modifié puis reconnexion et encaissement au tarif historique par navigateur |
| T28 | P1 | facture à prix HT | Testée : formulaire, calcul serveur, émission et PDF téléchargé |
| T29 | P0 | plusieurs taux | Calcul, ventilation PDF et parcours navigateur testés ; régime fiscal à valider |
| T30 | P1 | remise répartie | Calcul exact testé, dont ventilation fiscale du rapport ; parcours complet à recetter |
| T31 | P1 | avoir partiel | Correction commerciale par taux historiques, reliquat exact, original inchangé, PDF, concurrence/droits testés ; sélection d'articles restante |
| T32 | P1 | acompte puis solde | Journal durable, solde serveur, Chrome espèces puis carte déclarée et réponse perdue ; toute l'UI POS native pas encore raccordée |
| T33 | P1 | facture complète depuis ticket sans double vente | Implémenté pour reçus POS v2 cohérents ; 9 intégrations et 12 observations navigateur ; validation comptable/anciens reçus restante |
| T34 | P1 | changement ultérieur de fiche société sans modification du document historique | Testé : original A4 identique ; snapshot nouveau reçu POS testé |
| T35 | P0 | numérotation concurrente sur au moins vingt demandes | Factures/avoirs : vingt créations/rejeux concurrents PostgreSQL ; séries uniques et plafond d'avoirs |
| T36 | P1 | montant 99,99 €, 100 € et 100,01 € selon régime applicable | À implémenter ou à recetter |
| T37 | P1 | long document multipage | À implémenter ou à recetter |
| T38 | P1 | export fiscal réconcilié | Partiel : TTC/remises, journal signé factures/avoirs et CSV caisse ; faux net ignorant les avoirs refusé ; grand livre/format externe à qualifier |
| T39 | P1 | acceptation de devis sans double conversion | À implémenter ou à recetter |
| T40 | P1 | XML électronique valide et XML invalide clairement rejeté. | À implémenter ou à recetter |
| T41 | P1 | PayPal sandbox payé | Accès sandbox manquants ; contrat HTTP simulé testé |
| T42 | P1 | refus | À implémenter ou à recetter |
| T43 | P1 | abandon | À implémenter ou à recetter |
| T44 | P0 | timeout après capture effective | Partiel : solde réservé après erreur réseau |
| T45 | P0 | webhook reçu deux fois | Déduplication testée avec échange prestataire remplacé |
| T46 | P1 | webhook avant retour navigateur | Rapprochement sans retour navigateur testé ; vrai prestataire non raccordé |
| T47 | P0 | signature falsifiée rejetée | Signature Stripe locale testée ; vérification PayPal HTTP simulée |
| T48 | P0 | montant/devise/marchand incohérent rejeté | Incohérences rejetées en intégration, aucune fausse confirmation |
| T49 | P0 | événements désordonnés | À implémenter ou à recetter |
| T50 | P1 | remboursement partiel | PayPal implémenté, réserve/preuve testées par doubles ; part de commande protégée ; aucun vrai sandbox, espèces/Stripe et réserves refusées restants |
| T51 | P0 | deux tentatives concurrentes sur le même solde | Tentatives concurrentes testées sur PostgreSQL |
| T52 | P1 | paiement espèces + carte | Partiel/mixte testé PostgreSQL et Chrome ; cadeau/espèces/pourboire/don ventilés sans CA gonflé ; matériel non testé |
| T53 | P1 | terminal autonome affiché comme déclaration manuelle | Libellé et journal manual_declaration vérifiés navigateur/API ; aucun terminal physique |
| T54 | P0 | paiement en attente sans faux solde nul | Tentative et solde conservés en intégration ; aucun prestataire réel |
| T55 | P1 | rapprochement frais/net/brut | À implémenter ou à recetter |
| T56 | P1 | séparation des abonnements CréOrga et recettes du commerçant. | Clés Stripe séparées et rattachement commerçant contrôlé ; onboarding multiple restant |
| T57 | P1 | ticket 58 mm | Partiel : facture PDF 58 mm téléchargée et inspectée ; papier/ticket POS non qualifiés |
| T58 | P1 | ticket 80 mm | Partiel : facture PDF 80 mm téléchargée et inspectée ; papier/ticket POS non qualifiés |
| T59 | P1 | accents et euro | Rendus PDF inspectés FR/DE/PT ; codepages matériels non testés |
| T60 | P1 | QR lisible | À implémenter ou à recetter |
| T61 | P1 | fin de papier | Non exécuté : matériel / environnement à qualifier |
| T62 | P1 | imprimante débranchée puis rebranchée | Non exécuté : matériel / environnement à qualifier |
| T63 | P1 | accusé perdu et statut inconnu | Non exécuté : matériel / environnement à qualifier |
| T64 | P1 | duplicata sans écriture supplémentaire | Non exécuté : matériel / environnement à qualifier |
| T65 | P1 | tiroir non ouvert à la réimpression | Non exécuté : matériel / environnement à qualifier |
| T66 | P1 | cent lignes sans troncature | À implémenter ou à recetter |
| T67 | P1 | facture reçue dans boîte de test avec vrai PDF | Dialogue SMTP loopback et PDF joint identique testés ; aucun envoi Zoho réel |
| T68 | P1 | échec d’envoi et reprise sans doublon | Référence stable et perte accusé après DATA testées ; incertain sans renvoi automatique |
| T69 | P1 | lien expiré | À implémenter ou à recetter |
| T70 | P0 | pièce d’une autre société inaccessible. | Factures/PDF et RH testés ; salarié limité à son dossier, téléchargement direct et droits vérifiés |
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
| T96 | P0 | QR d’ancienne session révoqué | Visites révocables et refus ancien lien testés API/navigateur ; créances conservées au personnel |
| T97 | P2 | congé visible selon rôle | À implémenter ou à recetter |
| T98 | P2 | donnée HACCP manquante non inventée | À implémenter ou à recetter |
| T99 | P2 | langues et responsive | À implémenter ou à recetter |
| T100 | P2 | tous les boutons du périmètre livré ont un comportement vérifié, y compris l’erreur et le mode dégradé. | À implémenter ou à recetter |
