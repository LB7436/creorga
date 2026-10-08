CREATE UNIQUE INDEX "Invoice_companyId_id_key" ON "Invoice"("companyId", "id");
CREATE TABLE "InvoiceDelivery" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "recipient" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "documentHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
 "providerId" TEXT, "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMP(3), "acceptedAt" TIMESTAMP(3),
 FOREIGN KEY ("companyId", "invoiceId") REFERENCES "Invoice"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InvoiceDelivery_companyId_status_idx" ON "InvoiceDelivery"("companyId", "status");
