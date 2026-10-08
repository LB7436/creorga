ALTER TABLE "Order" ADD COLUMN "inventoryDebitedAt" TIMESTAMP(3);
ALTER TABLE "PaymentAttempt" ADD COLUMN "tableId" TEXT, ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'ORDER';
CREATE UNIQUE INDEX "PaymentSettlement_companyId_id_key" ON "PaymentSettlement"("companyId", "id");
CREATE TABLE "PaymentAllocation" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "attemptId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "active" BOOLEAN NOT NULL DEFAULT true,
 "settlementId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("companyId", "orderId") REFERENCES "Order"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("companyId", "attemptId") REFERENCES "PaymentAttempt"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("companyId", "settlementId") REFERENCES "PaymentSettlement"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentAllocation_attemptId_orderId_key" ON "PaymentAllocation"("attemptId", "orderId");
CREATE INDEX "PaymentAllocation_companyId_orderId_active_idx" ON "PaymentAllocation"("companyId", "orderId", "active");
-- Aucune réinterprétation des anciennes ventes : seulement les tentatives introduites par les lots 2.0.
INSERT INTO "PaymentAllocation" ("id", "companyId", "attemptId", "orderId", "amountCents", "active", "settlementId", "createdAt")
 SELECT a."id" || ':order', a."companyId", a."id", a."orderId", a."amountCents",
 a."status" IN ('CREATING','PENDING','AWAITING_TERMINAL','UNKNOWN','REVIEW','AUTHORIZED'), s."id", a."createdAt"
 FROM "PaymentAttempt" a LEFT JOIN "PaymentSettlement" s ON s."attemptId" = a."id";
CREATE UNIQUE INDEX "PaymentAllocation_one_active_per_order" ON "PaymentAllocation"("companyId", "orderId") WHERE "active";
