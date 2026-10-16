# Export de rapprochement financier v1

16 octobre 2026. Outil technique de contrôle, **pas grand livre ni format comptable certifié**.

Accès OWNER/MANAGER : `GET /api/accounting/reconciliation`, ou `?format=csv`.
Le panneau se trouve dans Comptabilité → Rapports de caisse → Rapprochement financier.
Les bornes facultatives `startDate` / `endDate` sont des instants ISO avec fuseau, inclusifs.
Le journal est lu dans une transaction `RepeatableRead` ; les filtres société sont imposés
au serveur. Au-delà de 5 000 éléments dans un des journaux de la société, refus explicite,
pas de troncature silencieuse. Réduire uniquement la période ne contourne pas cette limite
globale : une extraction paginée qualifiée reste à construire pour les grands historiques.
Les devises différentes sont refusées avant agrégation.

Le CSV est UTF-8 avec BOM, séparateur point-virgule, champs cités, guillemets échappés,
montants entiers en centimes. Cellule monétaire vide = inconnue/non applicable, pas zéro.
Les chaînes susceptibles d'être interprétées comme formules sont neutralisées par apostrophe.

| `kind` | Source et règle | Colonnes à utiliser |
|---|---|---|
| `SALE_ORDER` | Commande finalisée PAID/payée, une fois par ID | `salesCents`, `salesBaseCents`, `salesTaxCents` |
| `TICKET_REFERENCE` | Reçu POS, liens vers les commandes | `documentCents` informatif seulement, ventes = 0 |
| `INVOICE` | Facture émise et références d'origine | `documentCents` informatif, ventes = 0 ; non liée = revue comptable |
| `CREDIT_NOTE` | Avoir émis lié à la facture | `documentCents` négatif, base/TVA de correction distinctes ; cash = 0 |
| `TENDER` | Affectation de règlement, incluant acompte | `receiptCents` = consommation + pourboire + don ; `foodCents` séparé |
| `BANK_CAPTURE_REFERENCE` | Capture vérifiée, pas second encaissement | brut, frais et net disponibles ; `receiptCents` = 0 |
| `PROVIDER_REFUND` | Réservation ou remboursement vérifié | confirmé dans `refundCents`, sinon `heldRefundCents` |
| `DECLARED_REFUND` | Déclaration du responsable | `refundCents` déclaré ; cash négatif seulement si espèces |
| `CASH_MOVEMENT` | Entrée/sortie du tiroir | cash signé ; 0 si déjà compté comme remboursement lié |
| `CASH_CLOSURE_REFERENCE` | Rapport figé de clôture | théorique/compté/écart, jamais une seconde opération de trésorerie |

`id` identifie l'événement ; `refs` relie les IDs séparés par `|`. `status` distingue
déclaration manuelle, preuve prestataire, historique sans tender, pièce documentaire et
inconnues. `date` est UTC. Les colonnes de document ne doivent **pas être sommées entre
tickets et factures**. L'export n'impute aucun compte général et n'invente pas d'écriture
de créance pour une facture sans origine de vente fiable.

La base actuelle des ventes est explicitement celle des commandes finalisées/payées,
pas une comptabilité d'engagement. Les dates d'émission, de paiement et de correction
peuvent appartenir à des périodes différentes : pas de faux « net fiscal » obtenu en
soustrayant indistinctement tous les avoirs du chiffre d'affaires de la période.
Les anciens payés sans tender sont signalés (`LEGACY_PAYMENT_WITHOUT_LEDGER`), jamais
complétés par un règlement fictif. Surallocation, écart de règlement et incohérence HT/TVA
ont aussi un code de contrôle. Ce contrôle est limité et ne certifie pas les anciens arrondis.

Les pourboires, dons, frais et remboursements ne deviennent pas des ventes nouvelles.
Le flux espèces net ne comprend pas le fond initial, qui figure dans les rapports de caisse.
Les versements bancaires restent `null` / « non intégrés ». Une capture ou son net ne prouve
ni versement ni réception bancaire. L'import des relevés, rapprochement des commissions,
dates de règlement et écritures de banque reste un lot distinct.

Contrôles reproduits : ticket 11,70 € + facture liée = 11,70 € de ventes, pas 23,40 € ;
avoir 3 € documentaire séparé d'une sortie espèces de 3 €, sortie comptée une seule fois ;
frais absents non inventés ; surallocation signalée ; cellule `=...` neutralisée.
Tests unitaires `financial-reconciliation.test.ts`, HTTP/SQL `refunds.integration.test.ts`
et téléchargement réel depuis le panneau web. Aucune validation par un comptable revendiquée.
