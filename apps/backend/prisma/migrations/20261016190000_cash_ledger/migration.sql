-- Les anciennes clôtures conservent leur interprétation et leurs montants.
ALTER TABLE "CashDrawer" ADD COLUMN "ledgerVersion" INTEGER, ADD COLUMN "openRequestHash" TEXT,
 ADD COLUMN "closeRequestId" TEXT, ADD COLUMN "closeRequestHash" TEXT, ADD COLUMN "closeReason" TEXT,
 ADD COLUMN "closedBy" TEXT, ADD COLUMN "closeSnapshot" JSONB;
CREATE UNIQUE INDEX "CashDrawer_companyId_id_key" ON "CashDrawer"("companyId","id");
CREATE UNIQUE INDEX "CashDrawer_companyId_closeRequestId_key" ON "CashDrawer"("companyId","closeRequestId");
CREATE UNIQUE INDEX "CashDrawer_one_open_v2" ON "CashDrawer"("companyId") WHERE "closedAt" IS NULL AND "ledgerVersion" = 2;
ALTER TABLE "OrderTender" ADD COLUMN "cashDrawerId" TEXT;
ALTER TABLE "OrderTender" ADD CONSTRAINT "OrderTender_companyId_cashDrawerId_fkey" FOREIGN KEY ("companyId","cashDrawerId") REFERENCES "CashDrawer"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "OrderTender_companyId_cashDrawerId_idx" ON "OrderTender"("companyId","cashDrawerId");
CREATE TABLE "CashMovement" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "drawerId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "direction" TEXT NOT NULL CHECK ("direction" IN ('IN','OUT')), "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
 "reason" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CashMovement_companyId_drawerId_fkey" FOREIGN KEY ("companyId","drawerId") REFERENCES "CashDrawer"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CashMovement_companyId_drawerId_idx" ON "CashMovement"("companyId","drawerId");
