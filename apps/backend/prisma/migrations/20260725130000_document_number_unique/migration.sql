-- Unicité du numéro de facture et de devis par société.
--
-- `nextNumber()` comptait les documents existants et ajoutait 1, sans verrou :
-- six factures créées simultanément ont toutes reçu le n° INV-2026-0028.
-- Au Luxembourg, la numérotation séquentielle et unique des factures est une
-- obligation légale — un doublon n'est pas seulement gênant, il est fautif.
--
-- Les doublons éventuellement déjà en base sont suffixés avant la pose de la
-- contrainte, pour que la migration reste applicable en production. Le suffixe
-- -D2, -D3… signale un document à renuméroter manuellement.
WITH doublons AS (
  SELECT
    "id",
    "number",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "number"
      ORDER BY "createdAt", "id"
    ) AS rang
  FROM "Invoice"
)
UPDATE "Invoice" i
SET "number" = d."number" || '-D' || d.rang
FROM doublons d
WHERE i."id" = d."id" AND d.rang > 1;

WITH doublons AS (
  SELECT
    "id",
    "number",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "number"
      ORDER BY "createdAt", "id"
    ) AS rang
  FROM "Quote"
)
UPDATE "Quote" q
SET "number" = d."number" || '-D' || d.rang
FROM doublons d
WHERE q."id" = d."id" AND d.rang > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_number_key" ON "Invoice"("companyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_companyId_number_key" ON "Quote"("companyId", "number");
