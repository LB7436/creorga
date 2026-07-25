-- Unicité du numéro de commande par société.
--
-- La numérotation applicative lisait le dernier numéro puis ajoutait 1, sans
-- verrou : des commandes simultanées repartaient toutes du même numéro (8
-- commandes concurrentes ont produit huit fois le n° 112 en test).
--
-- Des doublons peuvent déjà exister en base : on les renumérote AVANT de poser
-- la contrainte, sinon la migration échouerait sur une base de production.
-- Chaque doublon reçoit un numéro libre au-dessus du maximum de sa société,
-- en conservant la commande la plus ancienne sur le numéro d'origine.
WITH doublons AS (
  SELECT
    "id",
    "companyId",
    ROW_NUMBER() OVER (
      PARTITION BY "companyId", "orderNumber"
      ORDER BY "createdAt", "id"
    ) AS rang
  FROM "Order"
),
maxima AS (
  SELECT "companyId", MAX("orderNumber") AS max_num
  FROM "Order"
  GROUP BY "companyId"
),
a_renumeroter AS (
  SELECT
    d."id",
    m.max_num + ROW_NUMBER() OVER (PARTITION BY d."companyId" ORDER BY d."id") AS nouveau_numero
  FROM doublons d
  JOIN maxima m ON m."companyId" = d."companyId"
  WHERE d.rang > 1
)
UPDATE "Order" o
SET "orderNumber" = r.nouveau_numero
FROM a_renumeroter r
WHERE o."id" = r."id";

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_orderNumber_key" ON "Order"("companyId", "orderNumber");
