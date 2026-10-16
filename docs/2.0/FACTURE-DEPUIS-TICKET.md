# Facture société depuis un ticket — lot local du 16 octobre 2026

Implémenté et testé localement, non déployé publiquement. Aucun nouveau paiement n’est demandé.

## Parcours disponible

Propriétaire ou responsable : journal de la caisse → « Facture société », puis connexion au
back-office si nécessaire. Le ticket reste sélectionné après connexion et rechargement.
Autre entrée : Factures → « Depuis un ticket de caisse ». Les cent derniers tickets sont
proposés ; la recherche par numéro exact retrouve également les tickets déjà clôturés.
Choisir un client avec nom de société et adresse. La création prépare un brouillon complet.
Le statut « Émise — règlement déclaré en caisse » génère ensuite l’original PDF figé.
Les trois téléchargements A4, 58 et 80 mm utilisent les données historiques.

Le raccourci POS utilise `VITE_BACKOFFICE_URL` (origine HTTPS du back-office, sans secret).
Sur localhost/127.0.0.1, le port 5174 est connu du laboratoire. Hors loopback, sans configuration
valide, ce raccourci n’apparaît pas ; le formulaire reste accessible dans le back-office.
L’identifiant dans le lien n’est pas une autorisation : l’API contrôle société et rôle.

## Garanties du lot

- Une seule facture par `PosSale`, contrainte unique et clé étrangère composite par société.
  Verrou transactionnel et reprises de numérotation existantes conservés. Vingt demandes
  simultanées retrouvent la même facture ; une réponse perdue n’impose pas une nouvelle pièce.
- Les lignes TTC, remise, TVA par taux, devise, date de service et émetteur viennent du reçu v2.
  Les changements ultérieurs du catalogue ou de la société ne remplacent pas ces valeurs.
- Pourboire et arrondi caritatif ne sont pas ajoutés à la facture de consommation. La carte
  cadeau consommée reste un moyen de règlement, pas une réduction de la vente.
- Le brouillon lié n’autorise aucune réécriture financière ; seuls client, échéance et notes
  sont modifiables avant émission. L’émission conserve les validations de mentions légales.
- Aucune écriture de vente, commande, stock ou encaissement n’est produite par la conversion.
  Les vues de recettes actuelles fondées sur les commandes et le journal restent inchangées.
- Le PDF et l’interface indiquent « règlement déclaré en caisse », sans inventer une preuve bancaire.

## Preuves et limites

`receipt-invoices.integration.test.ts` : neuf cas PostgreSQL/Express réels, dont vingt demandes
concurrentes, contraintes SQL, accès étranger/salarié, ticket clôturé, incohérences et PDF original.
Montant de référence calculé indépendamment : 11,70 € à 17 % et 10,30 € à 3 %, remise 2,20 €,
soit 18 € HT + 1,80 € TVA = 19,80 € TTC. Le pourboire de 1 € et le don de 0,20 € restent séparés.

Chrome neuf : douze observations, journal → connexion → ticket, création/relecture, libellé TTC,
trois vrais PDF, rechargement, unicité et journal/clôtures inchangés. Preuve privée
`BROWSER-RECEIPT-INVOICE.json`. Première émission effectivement exécutée, puis original relu.
Sauvegarde après arrêt des applications : 59 tables, huit fichiers et trois PDF originaux égaux
après chiffrement, déchiffrement et restauration dans une nouvelle base. Durée observée 1 529 ms,
uniquement sur cette petite copie ; aucune promesse de RTO.

Les tickets anciens sans prix/taux/émetteur fiables ou avec ventilation incohérente sont refusés,
pas reconstruits arbitrairement. Un émetteur historique incomplet peut empêcher l’émission :
la fiche actuelle n’est pas substituée silencieusement. Les avoirs, corrections après émission,
remboursements, facturation partielle et validation comptable restent des lots distincts.
Annuler un brouillon n’efface pas son lien unique et n’autorise pas une seconde facture.
Le traitement comptable des justificatifs déjà émis doit être validé avant exploitation réelle.
Ce lot ne qualifie ni conformité fiscale intégrale, ni transmission électronique, ni impression physique.

## Reproduction et retour

Depuis `creorga-2.0` avec le laboratoire privé configuré :

```powershell
node ../local-2.0/run.mjs integration receipt-invoices
node ../local-2.0/browser-receipt-invoice.mjs
```

Le scénario navigateur exige les fixtures fictives des recettes précédentes ; il ne touche aucun
profil existant. La migration `20261016150000_receipt_invoice_link` est additive et appliquée
seulement aux bases locale/de tests. Pour arrêter ce parcours, désactiver ses points d’entrée sans
supprimer liens, pièces ou colonnes. L’ancien code ne connaît pas leurs restrictions : ne pas le
remettre en écriture sur ces factures. Préférer un correctif en avant ou une nouvelle base restaurée,
applications arrêtées, sans écrasement de la base courante.
