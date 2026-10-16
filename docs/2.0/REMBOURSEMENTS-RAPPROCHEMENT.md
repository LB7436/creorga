# Rapprochement des remboursements incertains

16 octobre 2026. Code `23bba568ec54c7c0acc3861f3ba639f155c1dd3d`.
Implémenté et testé avec prestataire simulé, **pas avec PayPal réel ni sa sandbox distante**.
Stripe Refunds reste désactivé : aucun adaptateur `startRefund` + `verifyRefund` complet n'est activé.

## Procédure responsable

Depuis la facture et son avoir : consulter le remboursement, ses références et « Afficher les preuves
et décisions ». OWNER/MANAGER uniquement. L'avoir n'est jamais une preuve de remboursement.

| Situation | Action autorisée | Réservation |
|---|---|---|
| UNKNOWN sans référence | Chercher la clé de demande dans le dossier prestataire ; saisir une référence candidate | Conservée |
| Référence candidate | Relecture serveur ; marchand, capture, devise, montant, ID de remboursement **et clé prestataire** doivent correspondre | Conservée tant que non confirmée |
| REVIEW / incohérence | Examiner l'historique et rechercher la bonne preuve ; aucune saisie « remboursé » | Conservée |
| PENDING, timeout, 404, prestataire indisponible | Réessayer la vérification, pas l'émission ; journaliser le maintien | Conservée |
| Refus terminal vérifié | Nouvelle relecture serveur du refus exact + décision responsable motivée | Libérée uniquement si cette nouvelle preuve est suffisante |
| COMPLETED exact | Confirmation prestataire enregistrée | Montant consommé, pas rendu remboursable |

`POST /api/payments/refunds/:id/review` : UUID stable, action `KEEP_RESERVED`,
`ASSOCIATE_REFERENCE` (avec `externalId`) ou `RELEASE_NOT_REFUNDED`, motif obligatoire.
La libération demande un état local REFUSED_RECONCILIATION issu d'une vérification, une référence
connue et une **nouvelle** preuve serveur exacte, failed avec état PayPal FAILED/CANCELLED.
PENDING, preuve incohérente ou absence de référence ne satisfont jamais ces conditions.
Le refus est relu avant la transaction, puis l'état/horodatage local est recontrôlé sous verrou société.

Une association UNKNOWN exige la clé d'origine relue (`invoice_id` du remboursement = clé prestataire
persistée), pas seulement « même montant et même capture ». Les nouvelles émissions placent cette clé
dans la requête PayPal en plus de l'idempotence HTTP. Une ancienne demande sans cette liaison fiable
peut rester bloquée : assistance prestataire nécessaire, aucune recherche arbitraire ou faux 404 probant.

La décision NOT_REFUNDED conserve montants, allocations, références et preuves. Son horodatage de
libération exclut désormais cette seule réservation des plafonds avoir/capture/commande, y compris
dans les remboursements déclarés. Rejouer la décision ne la reproduit pas. Une vérification ultérieure
contradictoire peut remettre le montant sous réserve ou constater le remboursement, jamais effacer
son historique. Toute anomalie tardive doit être examinée avant une nouvelle opération.

`RefundReviewEvent` conserve requêtes retournées/inconnues, preuves exactes, incohérences, erreurs de
prestataire et décisions. L'API n'offre pas d'édition et un trigger SQL refuse UPDATE ; ce n'est pas
un stockage WORM ou une preuve juridiquement qualifiée contre un administrateur de base. Historique
par société et refus de troncature au-delà de 1 000 événements. Aucun secret de prestataire enregistré.

## Garanties et limites

Les appels externes restent hors transaction SQL. Une réponse de création tardive, même en timeout,
ne peut plus rétrograder une preuve confirmée pendant l'appel. Le dossier et ses affectations ne sont
jamais détruits pour « réessayer ». Les décisions ne déclenchent aucun remboursement.

Les 17 tests PostgreSQL du fichier `refunds.integration.test.ts` incluent les scénarios précédents,
association inconnue, refus relu devenu pending, libération et rejeu, course timeout/confirmation,
rapprochement de versement tardif, immutabilité, droits, montants et société. Les tests PayPal HTTP sont
des simulations. Les règles terminales et la liaison invoice_id doivent encore être qualifiées contre
un compte sandbox officiel avant toute activation opérationnelle.

Références primaires reconsultées : [PayPal Payments v2 — remboursement](https://developer.paypal.com/api/payments/v2/refunds-get),
[schéma officiel](https://developer.paypal.com/api/payments/v2/schema.json).
Le schéma documente les états et le champ invoice_id ; la politique de libération conservatrice et
sa validation métier sont des choix CréOrga, pas une certification de PayPal.
