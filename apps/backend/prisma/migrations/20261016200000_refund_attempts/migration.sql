CREATE TABLE "RefundAttempt" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "creditNoteId" TEXT NOT NULL, "settlementId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "providerRequestId" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "captureId" TEXT NOT NULL, "currency" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "status" TEXT NOT NULL DEFAULT 'PENDING', "externalId" TEXT,
 "confirmedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("status" IN ('PENDING','UNKNOWN','REVIEW','SUCCEEDED')),
 CONSTRAINT "RefundAttempt_companyId_creditNoteId_fkey" FOREIGN KEY ("companyId","creditNoteId") REFERENCES "CreditNote"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RefundAttempt_companyId_settlementId_fkey" FOREIGN KEY ("companyId","settlementId") REFERENCES "PaymentSettlement"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RefundAttempt_companyId_id_key" ON "RefundAttempt"("companyId","id");
CREATE UNIQUE INDEX "RefundAttempt_provider_merchantId_externalId_key" ON "RefundAttempt"("provider","merchantId","externalId");
CREATE INDEX "RefundAttempt_companyId_creditNoteId_idx" ON "RefundAttempt"("companyId","creditNoteId");
CREATE INDEX "RefundAttempt_companyId_settlementId_idx" ON "RefundAttempt"("companyId","settlementId");
