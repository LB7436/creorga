# Matériel et preuves

## Protocole de qualification — 16 octobre 2026

La matrice ci-dessous décrit des **essais à exécuter**, pas une compatibilité certifiée.
Les rendus PDF et les pertes de réponse HTTP du laboratoire ne prouvent pas une sortie de papier.
La file persistante d'impression/retour d'état n'est pas qualifiée : ne pas la présenter comme livrée.

Inventaire Windows relu le 16 octobre (`Get-Printer`, aucune tâche envoyée) : HP OfficeJet
9010 **Offline**, fax HP, AnyDesk, Microsoft Print to PDF et deux imprimantes OneNote.
Aucun modèle thermique ne figure dans cet inventaire ; cela ne prouve pas l'absence d'un
appareil réseau non installé. Aucun tiroir ou terminal n'a été qualifié matériellement.

| Famille / interface | À relever avant essai | Diagnostic logiciel disponible | Essai physique ou prestataire | Statut |
|---|---|---|---|---|
| Thermique 58 mm USB/réseau | Marque, modèle, firmware, pilote, OS, largeur imprimable, DPI, codepage | PDF logiciel existant ; type MIME, pagination, empreinte | Papier, alignement, euro/accents, logo, QR, 100 lignes | BLOCKED : aucun modèle qualifié |
| Thermique 80 mm USB/réseau | Mêmes champs, colonnes et massicot exacts | Même distinction PDF / ticket / préaddition | Coupe après pied, retours d'état et duplicata | BLOCKED |
| Tiroir via imprimante | Modèle, connectique et broches, impulsion documentée | Autorisations à prévoir dans l'agent, pas une ouverture depuis tout navigateur | Ouverture autorisée puis réimpression sans impulsion | BLOCKED : aucun tiroir/agent qualifié |
| Terminal intégré | Modèle, OS, acquéreur, contrat et API retour vérifiable | Adaptateurs existants à qualifier un par un ; Stripe Refunds désactivé | Montant, confirmation, annulation, timeout après débit, remboursement | BLOCKED : aucun terminal/contrat de recette |
| Terminal autonome | Modèle et procédure de rapprochement | Déclarations manuelles caisse et remboursements testées en PostgreSQL | Comparaison ticket acquéreur / déclaration / versement | BLOCKED pour preuve bancaire ; déclaration simulée uniquement |
| PayPal sandbox officiel | Comptes marchand/acheteur fictifs, clés sandbox et webhook autorisé | Contrat HTTP et preuves simulées, rejeux/concurrence testés | Capture/refus/abandon, webhook signé, remboursement et relevé sandbox | BLOCKED : identifiants absents |
| Réseau coupé | Poste de test et serveur local distincts, référence stable enregistrée | Chrome perd volontairement la réponse après commit ; reprise par GET et rechargement | Câble/Wi-Fi retiré avant, pendant et après l'opération | Simulation exécutée ; coupure physique BLOCKED |
| Électricité coupée | Machine dédiée, copie fictive, onduleur, autorisation et arrêt sûr | Redémarrage propre et restauration de copie vérifiables | Coupure franche, intégrité au redémarrage, absence de double préparation/encaissement | BLOCKED : aucune coupure du PC utilisateur autorisée |

Pour chaque modèle : créer une fiche avec numéro d'essai, versions, date, opérateur,
document source et empreinte, identifiant de tâche, états observés, photos du papier,
logs expurgés, résultat PASS/FAIL/BLOCKED/NOT RUN et limites. Un nom de pilote ne vaut pas essai.

### Séquence thermique / tiroir

1. Confirmer que les données sont fictives ; fermer toute application pouvant envoyer une tâche réelle.
2. Relever les capacités dans le manuel du **modèle**, pas seulement le terme ESC/POS.
3. Imprimer les jeux 58/80 : noms longs, FR/DE/LU/EN/PT, euro, plusieurs taux, remise,
   pourboire distinct, référence, QR, pied et 100 lignes. Comparer au document canonique.
4. Tester papier absent, capot ouvert, imprimante éteinte, câble/Wi-Fi retiré, agent redémarré.
5. Perdre l'accusé après envoi : afficher **résultat inconnu**, vérifier le papier et demander
   un duplicata explicite. Ne jamais promettre « exactement une fois » sans capacité matérielle.
6. Vérifier en base que ni réimpression ni échec n'ajoute vente, paiement ou mouvement de stock.
   Le duplicata ne doit pas ouvrir le tiroir. Journaliser toute ouverture autorisée.

### Séquence PayPal / terminal

Sandbox officiel seulement après accès séparé : contrôler marchand, montant, devise, référence,
signature, ordre et doublons des événements. Une approbation ou un retour navigateur n'est pas une
capture. Tester UNKNOWN puis rapprochement, paiement partiel et deux appareils concurrents.
Ne pas changer la clé d'idempotence pour résoudre une réponse ambiguë. Conserver la réserve de
remboursement sans preuve terminale exacte. Aucun remboursement ou encaissement réel dans cette mission.

Sources primaires relues le 16 octobre 2026 : [référence Epson ESC/POS](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/index.html)
pour les capacités par modèle et [guide PayPal sandbox](https://developer.paypal.com/sandbox-testing/overview)
pour la séparation des comptes/environnements de test. Ce protocole est une proposition de recette,
pas une qualification du matériel, du prestataire ou de conformité fiscale.

## Repères historiques conservés

Inventaire Windows du 8 octobre : HP OfficeJet Pro 9010 et imprimantes virtuelles
PDF/OneNote/AnyDesk. Aucune caméra retournée par la classe Windows Camera ; ce contrôle
ne prouve pas l'absence de caméras réseau non raccordées.

| Matériel | Preuve actuelle | État |
|---|---|---|
| HP de bureau | Pilote présent ; aucune impression déclenchée | Non qualifiée pour tickets thermiques |
| Thermique 58/80 mm | Aucun appareil testé | Modèle à préciser |
| Terminal de carte | Aucun terminal connecté | Non testé |
| IP/NVR RTSP/ONVIF | Aucun flux utilisé | Modèle/firmware à qualifier |
| USB UVC / capture HDMI-SDI | Aucun appareil qualifié | Non testé |

Une prévisualisation ne prouve ni papier sorti, coupe, tiroir ni retour d'état. Le deep-link
SumUp demande une confirmation manuelle. Aucun protocole ou logo ne vaut certification.

Les factures A4/58/80 ont été générées, ouvertes comme vrais PDF, rendues en PNG et inspectées.
Leur pied de page et leurs groupes de TVA sont visibles. Il s'agit de rendus de factures :
papier sorti, largeur imprimable, ESC/POS, massicot, tiroir et perte d'accusé restent non testés.
