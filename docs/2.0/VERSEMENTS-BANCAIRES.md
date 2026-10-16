# Versements et relevés fictifs — modèle v1

16 octobre 2026. Code `23bba568ec54c7c0acc3861f3ba639f155c1dd3d`.
**Aucune banque connectée, aucun relevé réel qualifié, aucune confirmation de virement bancaire.**

## Modèle et calcul

`PayoutStatement` conserve l'import, son auteur, référence et empreinte de contenu ; `BankPayout`
le versement déclaré ; `PayoutLine` sa ventilation ; `PayoutDecision` les relectures et validations
manuelles avec leurs instantanés et motifs. Liens composites société/objet ; captures et remboursements
entiers affectables une seule fois. Pas de modification des ventes, factures, avoirs, tenders ou captures.

Net calculé = captures − remboursements − frais − retenues + libérations.
Comparer ce net au net déclaré et au montant reçu déclaré, avec référence et date du relevé fictif.
Une somme reçue absente reste inconnue, pas zéro. Les lignes CAPTURE exigent une capture exacte de
la société/marchand/devise ; REFUND exige un remboursement SUCCEEDED exact. Une réservation UNKNOWN
ne prouve pas une sortie bancaire. Frais/retenues/libérations sont des **déclarations du relevé fictif**,
pas des données obtenues automatiquement d'un acquéreur.

Doublons : UUID d'import, empreinte du contenu, référence de relevé/versement, références des lignes
par société/prestataire/marchand/type et unicité du rattachement capture/remboursement. L'import est
atomique sous verrou société. Un même contenu rend l'import existant, une réutilisation incohérente
ou un doublon partiel refuse toute la transaction. Les différences ne sont jamais forcées à zéro.

## API et interface

OWNER/MANAGER : Comptabilité → Rapports de caisse → Versements bancaires fictifs.

- `GET /api/accounting/payouts` : DTO, calculs et raisons non résolues. Refus explicite au-delà de
  200 versements, pas de liste tronquée annoncée comme complète.
- `POST /api/accounting/payout-statements` : import JSON explicitement `fictional: true` ;
  nécessite `CREORGA_PAYOUT_IMPORT_ENABLED=true`, désactivé par défaut, activé seulement dans le laboratoire.
- `POST /api/accounting/payouts/:id/refresh` : UUID et motif ; relie les preuves exactes arrivées
  après import, sans changer le relevé ni ses montants. Conserve avant/après dans le journal.
- `POST /api/accounting/payouts/:id/validate` : UUID, motif et `expectedHash` de la revue ;
  refuse tout écart ou changement concurrent. Validation manuelle fictive figée et idempotente.
- `GET /api/accounting/payouts/:id/history` : décisions et pièces de rapprochement conservées,
  UPDATE SQL refusé, absence de preuve non remplacée par une notification.

Exemple **fictif**, qui restera non résolu sans capture correspondante. L'interface ajoute l'UUID :

```json
{
  "fictional": true, "statementRef": "RELEVE-FICTIF-001", "provider": "paypal",
  "merchantId": "MARCHAND-FICTIF", "currency": "EUR",
  "payouts": [{
    "externalRef": "VERSEMENT-FICTIF-001", "declaredNetCents": 1100,
    "receivedCents": 1100, "bankReference": "BANQUE-FICTIVE-001",
    "receivedAt": "2026-10-16T12:00:00Z",
    "lines": [
      { "kind": "CAPTURE", "externalRef": "CAPTURE-FICTIVE-001", "amountCents": 1170 },
      { "kind": "FEE", "externalRef": "FRAIS-FICTIFS-001", "amountCents": 70 }
    ]
  }]
}
```

Le CSV de rapprochement ajoute BANK_PAYOUT et les colonnes `bankReceivedCents`, `payoutGrossCents`,
`payoutRefundCents`, `payoutFeesCents`, `payoutHeldCents`, `payoutReleasedCents`, `payoutComputedNetCents`.
Sur cette ligne, `netCents` est le net **déclaré** ; ventes et encaissements restent à zéro.
Les compteurs de versements sont filtrés par leur date de réception déclarée ou, à défaut, d'import.
Les frais de ce relevé ne sont pas ajoutés aux frais de captures déjà comptés ailleurs.

## Recette et limites

Quatre intégrations dédiées : import/rejeu, concurrence/doublons, validation/historique immuable,
écarts, devise/marchand et droits. Un scénario supplémentaire dans les tests de remboursements
importe avant confirmation, conserve l'écart, relit après preuve, puis valide :
1 170 − 300 − 70 − 100 + 25 = 725 centimes, sans réécriture de la vente.
Chrome privé : import avec réponse perdue puis rejeu, validation, historique et trois largeurs.

V1 ne prend pas en charge : relevés bancaires réels CSV/OFX/camt/MT940, change, retenues entre périodes
avec rapprochement de leur origine, captures découpées sur plusieurs versements, litiges, commissions
affectées finement et corrections versionnées d'un relevé validé. Un montant/référencement erroné ou
une réception absente reste non résolu ; ne pas supprimer un import pour contourner les doublons.
Ces cas nécessitent un lot distinct et une recette avec le comptable et les prestataires concernés.
