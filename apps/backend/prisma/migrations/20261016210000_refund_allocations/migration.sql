CREATE TABLE "RefundAllocation" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "refundId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
 CONSTRAINT "RefundAllocation_companyId_refundId_fkey" FOREIGN KEY ("companyId","refundId") REFERENCES "RefundAttempt"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "RefundAllocation_companyId_orderId_fkey" FOREIGN KEY ("companyId","orderId") REFERENCES "Order"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RefundAllocation_companyId_refundId_orderId_key" ON "RefundAllocation"("companyId","refundId","orderId");
CREATE INDEX "RefundAllocation_companyId_orderId_idx" ON "RefundAllocation"("companyId","orderId");
