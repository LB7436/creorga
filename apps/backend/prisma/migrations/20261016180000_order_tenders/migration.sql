CREATE TABLE "OrderTender" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "actorId" TEXT,
  "attemptId" TEXT, "saleId" TEXT, "settlementId" TEXT, "method" TEXT NOT NULL, "confirmation" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" >= 0), "tipCents" INTEGER NOT NULL DEFAULT 0 CHECK ("tipCents" >= 0),
  "charityCents" INTEGER NOT NULL DEFAULT 0 CHECK ("charityCents" >= 0), "cashReceivedCents" INTEGER, "cashChangeCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("attemptId" IS NULL) <> ("saleId" IS NULL)),
  CHECK ("amountCents" + "tipCents" + "charityCents" > 0),
  CHECK ("confirmation" IN ('manual_declaration','provider_verified')),
  CONSTRAINT "OrderTender_companyId_orderId_fkey" FOREIGN KEY ("companyId","orderId") REFERENCES "Order"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderTender_companyId_attemptId_fkey" FOREIGN KEY ("companyId","attemptId") REFERENCES "PaymentAttempt"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderTender_companyId_saleId_fkey" FOREIGN KEY ("companyId","saleId") REFERENCES "PosSale"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderTender_companyId_settlementId_fkey" FOREIGN KEY ("companyId","settlementId") REFERENCES "PaymentSettlement"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderTender_companyId_id_key" ON "OrderTender"("companyId","id");
CREATE UNIQUE INDEX "OrderTender_companyId_attemptId_orderId_method_key" ON "OrderTender"("companyId","attemptId","orderId","method");
CREATE UNIQUE INDEX "OrderTender_companyId_saleId_orderId_method_key" ON "OrderTender"("companyId","saleId","orderId","method");
CREATE INDEX "OrderTender_companyId_orderId_idx" ON "OrderTender"("companyId","orderId");
