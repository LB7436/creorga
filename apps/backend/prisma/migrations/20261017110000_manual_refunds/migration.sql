ALTER TABLE "RefundAttempt" ADD COLUMN "verifiedAt" TIMESTAMP(3), ADD COLUMN "lastProof" JSONB;
CREATE TABLE "ManualRefund" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "creditNoteId" TEXT NOT NULL, "tenderId" TEXT NOT NULL,
 "actorId" TEXT NOT NULL, "method" TEXT NOT NULL CHECK ("method" IN ('CASH','CARD')),
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "currency" TEXT NOT NULL, "reason" TEXT NOT NULL, "reference" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "cashMovementId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ManualRefund_credit_fkey" FOREIGN KEY ("companyId","creditNoteId") REFERENCES "CreditNote"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ManualRefund_tender_fkey" FOREIGN KEY ("companyId","tenderId") REFERENCES "OrderTender"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ManualRefund_cash_fkey" FOREIGN KEY ("cashMovementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ManualRefund_cash_check" CHECK (("method" = 'CASH') = ("cashMovementId" IS NOT NULL))
);
CREATE UNIQUE INDEX "ManualRefund_companyId_id_key" ON "ManualRefund"("companyId","id");
CREATE UNIQUE INDEX "ManualRefund_cashMovementId_key" ON "ManualRefund"("cashMovementId");
CREATE INDEX "ManualRefund_companyId_creditNoteId_idx" ON "ManualRefund"("companyId","creditNoteId");
CREATE INDEX "ManualRefund_companyId_tenderId_idx" ON "ManualRefund"("companyId","tenderId");
