# Cœur financier — lot local du 16 octobre 2026

## Actualisation : lot suivant

Le lot décrit ci-dessous est conservé comme historique. Après `163d70d`, le code
`6080a6a90fe864ad24f7b4565ee6988e56469fd4` ajoute l'autorité PostgreSQL de salle, les acomptes
directs dans la caisse, les déclarations de remboursement et un rapprochement explicite.
Consulter `SESSIONS-ET-RAPPROCHEMENT-P0.md` et `CHECKPOINT.md` : 401 unités et 123 intégrations
actuelles. Les transferts QR, versements et résolution des réservations restent partiels/non livrés.

## Historique des lots précédents

Code : `dfb708a4748d485e25cb40287281de4a6613069e`, après
`a59916a415e4c3e5ac06d7d0ccb150d651306d43`, même branche
`codex/creorga-2-0-2026-10-08`. Aucune modification de production.
Ce lot réduit des risques P0 démontrés ; il ne termine ni toute l'unification de salle,
ni toute la qualification comptable, bancaire et matérielle de CréOrga.

## Résultats et défauts effectivement reproduits

| Défaut observé avant correction | Protection livrée | Preuve |
|---|---|---|
| Ancien plan après paiement, ligne déplacée sous un nouvel ID de couvert : deuxième vente acceptée | `SaleOrigin`, provenance de ligne/commande unique par société, filtrage/rejet des projections consommées | POS : ancien plan réinjecté, une vente et un débit de stock seulement |
| Ligne QR recopiée dans un couvert natif : nouvelle vente acceptée | Une ligne `OrderItem` existante ne devient pas une ligne native indépendante | POS : réponse 409 avant encaissement |
| Ouvertures simultanées : plusieurs caisses actives | Verrou financier de société et unicité SQL des nouvelles sessions v2 ouvertes | Une ouverture parmi vingt demandes ; dix-neuf conflits |
| Clôture ancienne ignorant les acomptes et mouvements | Affectations `OrderTender`, session de caisse explicite et rapport figé | Acompte inclus avant solde ; mouvement rejoué une fois ; clôture immuable |
| Capture multi-commandes permettant de rembourser la part d'une autre vente | `RefundAllocation`, réservation par commande d'origine | 300 centimes refusés lorsque seulement 200 sont attribuables |
| Réponse finale perdue : commande réglée devenue introuvable dans le formulaire | Référence conservée, commande encore sélectionnable pour réconciliation, rejeu du même contenu | Chrome : perte volontaire après commit, rechargement, deux parts seulement |
| Rapport fiscal historique ne déduisant pas les nouveaux avoirs | Refus explicite sur période avec avoirs et journal documentaire séparé | HTTP 409, CSV factures/avoirs avec références et signes, pas de faux net fiscal |

## Vente et affectations : autorité et limites

PostgreSQL reste l'autorité financière. La vente POS et ses provenances sont écrites dans
la même transaction que commandes, affectations et débit de stock. Une facture issue d'un
ticket n'ajoute toujours aucune vente. Les anciens reçus restent inchangés.

Les lignes natives, commandes QR et `GuestVisit` ne deviennent pas encore un modèle unique
de session transactionnelle : brouillons et prix ouverts restent aussi en JSON. Un vieux reçu
sans identifiant de ligne ne reçoit pas de provenance rétrospective inventée. Les transferts,
fusions et préparation/KDS hors ligne ne sont pas qualifiés globalement par ces tests.
Ne pas promettre « jamais de doublon » sur toutes les sources historiques inconnues.

## Avoirs : correction distincte de l'argent rendu

Propriétaire/responsable, détail d'une facture émise → « Avoirs de la facture » : montant
partiel ou champ vide pour le reliquat, motif obligatoire, référence stable. `CreditNote`
conserve numéro `AVO`, auteur, motif, date, lien à l'original, contenu, PDF et SHA-256.
Les anciennes séries `AVO` sont prises en compte dans la numérotation avec unicité/reprises.

Cette version traite une **correction commerciale globale** répartie entre les taux historiques,
pas une sélection article par article ni une réintégration physique de stock. Les centimes
résiduels reprennent les reliquats originaux. Un avoir partiel puis complet reconstitue
exactement HT, TVA et TTC d'origine. Aucun changement de fiche société/catalogue ne les recalcule.
Original non émis, annulé, incohérent ou sans preuve PDF suffisante : correction automatique refusée.

## Paiements partiels, mixtes et confirmations

Comptabilité → Caisse → « Règlements des commandes » : acompte ou solde, espèces, carte
autonome déclarée, ou ventilation des deux. Le serveur calcule le solde à partir des
affectations. Un paiement partiel ne crée ni deuxième commande ni statut payé prématuré.
Les lignes financières ne sont plus éditables après acompte ; une correction doit être tracée.
Le flux générique de changement de statut est également bloqué après acompte ; le flux QR
de préparation reste distinct. Ce comportement conservateur demande une amélioration métier.

`OrderTender` sépare consommations, pourboires et dons ; cadeau prépayé reste un paiement.
`manual_declaration` n'est jamais une preuve bancaire. Pour les connecteurs vérifiables,
montant/devise/marchand/capture doivent correspondre ; un retour navigateur ne suffit pas.
Le QR public affiche et demande uniquement le reliquat.

Une commande QR ayant reçu un acompte n'est pas encaissée une deuxième fois en totalité
dans le POS : ce parcours renvoie un conflit explicite. Terminer depuis les règlements des
commandes ou le paiement QR du solde. Le paiement partiel directement dans toute l'interface
POS native et le paiement en ligne de couverts natifs ouverts restent à compléter.

## Remboursements : réservation avant appel, preuve avant confirmation

Depuis un avoir rattaché à une vente possédant une capture PayPal configurée : choix de la
capture et du montant, réservation durable, appel avec clé prestataire stable, puis relecture.
`RefundAttempt` et `RefundAllocation` plafonnent ensemble avoir, capture et part d'origine.
Deux demandes ne peuvent pas réserver le même argent ; le remboursement ne réécrit pas la vente.

La réponse de création n'est pas annoncée comme remboursée. Seule la preuve relue exacte
donne `SUCCEEDED`. Timeout : `UNKNOWN`, réserve conservée, pas de deuxième appel automatique.
Preuve incohérente : `REVIEW`. ID externe perdu ou refus distant : rapprochement manuel,
pas de libération hasardeuse. Un refus distant n'a pas encore d'état terminal libérant la réserve.
Un ancien remboursement sans affectation vérifiable bloque la capture, sans répartition inventée.

**Implémenté, testé par doubles HTTP et banque simulée ; aucun sandbox PayPal réel ni remboursement réel.**
Remboursements espèces/carte déclarés, connecteur Stripe de remboursement, traitement automatique
des webhooks de remboursement et litiges ne sont pas livrés. Un connecteur non vérifiable
renvoie 501 sans lancer d'opération. Frais/versements restent à rapprocher séparément.

Documentation PayPal consultée : [remboursement d'une capture](https://developer.paypal.com/api/payments/v2/captures-refund),
[parcours de remboursement](https://developer.paypal.com/checkout/refund-payment) et
[idempotence](https://developer.paypal.com/api/rest/reference/idempotency/).
Le contrat HTTP testé ne qualifie pas un compte marchand ou son contrat.

## Caisse v2, rapports et exports

Ouvrir la session avant les règlements. `CashMovement` conserve auteur, motif, sens, montant
et clé stable. Espèces théoriques = fond initial + encaissements espèces (pourboires/dons
séparément détaillés) + entrées − sorties. Écart = compté − théorique ; motif si écart.
La clôture fige ses sources, calculs, auteur et date. Réessayer la même demande ne la réécrit pas.
Historique → « Consulter la clôture » retrouve le même rapport après rechargement.

Un règlement reçu sans session v2 ouverte reste durable mais sans affectation de tiroir ;
il n'est pas rattaché silencieusement à une ouverture ultérieure. Les anciennes sessions
sans journal v2 exigent un rapprochement manuel et ne sont pas recalculées avec le nouveau code.
Le compteur POS de clôture des tickets reste distinct du comptage physique du tiroir.

CSV de clôture : règlements, sources, pourboires/dons, mouvements et lignes de contrôle
identifiées comme non-écritures. CSV documentaire : pièces émises, liens d'origine, devise,
date, TVA historique et signe de correction. Une facture liée à un ticket n'est pas une
nouvelle vente à additionner. Encaissement ≠ chiffre d'affaires ; avoir ≠ remboursement.
Ces exports opérationnels ne sont **pas un grand livre qualifié pour un logiciel comptable**.
Le net fiscal intégrant tous documents, anciens soldes et frais reste à définir/valider avec le comptable.

## Recette actuelle, et ce qu'elle ne prouve pas

- 395 unités : 260 backend, 89 web, 46 POS ; 112 intégrations PostgreSQL, toutes réussies.
- POS 15, commandes 9, paiements 26, avoirs 8, remboursements 9, caisses 5 ; les autres
  intégrations existantes sont conservées, dont neuf ticket/facture. N'additionner qu'une fois les suites.
- Vingt demandes simultanées : avoirs, ouvertures/clôtures, acomptes ; plafonds, rejeux,
  droits, société étrangère, capture étrangère et preuves incohérentes testés.
- Chrome neuf : 17 observations, dont réponses volontairement perdues **après** commit,
  rechargement, espèces puis carte, rapport rouvert, deux CSV et vrai PDF d'avoir téléchargés.
  Captures 375/768/1440 des écrans modifiés ; contraste sombre des nouveaux panneaux corrigé.
  PDF A4 d'avoir rendu en PNG et inspecté. Aucune preuve d'impression physique.
- QA visuelle : **INCONCLUSIVE** faute de baseline ; axe, lecteur d'écran, clavier complet
  et Core Web Vitals non qualifiés. Badge de navigation « NaN » préexistant observé, hors correctif P0.
- Cinq applications compilées ; avertissements de taille de bundle POS/superadmin conservés.
- Sauvegarde/restauration native : 65 tables identiques, huit fichiers, sept PDF de factures
  et six PDF d'avoirs intègres ; AES-GCM vérifié, 1 646 ms sur cette petite copie, pas un RTO.
  Huit affectations, quatre caisses et trois mouvements comparés. `SaleOrigin`, `RefundAttempt`
  et `RefundAllocation` sont vides dans cette copie ; leur persistance avec données est testée
  en intégration, pas par cette archive. Médias absents déclarés. Originaux préservés.

Preuves privées : `BROWSER-FINANCIAL-P0.json`, images `financial-*`, deux CSV et
`RESTORATION-2.0.json`. Données fictives uniquement ; aucune archive privée dans Git.

## Reproduction et suite

Depuis la racine, laboratoire privé déjà configuré :

```powershell
node ../local-2.0/run.mjs unit
node ../local-2.0/run.mjs integration
node scripts/verify-restored-copy.mjs --self-test
node ../local-2.0/browser-financial-p0.mjs
```

Le script navigateur privé exige une société fictive `.invalid`, ajoute des écritures de recette
et n'utilise aucun profil existant. Les suites partageables sont les fichiers `*.integration.test.ts`.
Pour la restauration : arrêter les cinq applications, utiliser le lanceur privé, créer une
nouvelle base et conserver archive et clé séparées. Voir `MIGRATION-REPRISE-ROLLBACK.md`.

Priorités restantes : autorité transactionnelle complète des sessions/préparations, solde
partiel dans tous les parcours POS, remboursements manuels traçables et résolution des réserves,
rapprochement frais/versements/export comptable choisi, puis qualification réelle PayPal/matériel.
T04 reste bloqué sur les profils réels : `T04-REPRISE-HISTORIQUE.md`.
