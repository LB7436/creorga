CREATE UNIQUE INDEX "PaymentAttempt_companyId_id_key" ON "PaymentAttempt"("companyId", "id");
CREATE TABLE "PaymentSettlement" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
 "attemptId" TEXT NOT NULL, "provider" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "captureId" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "currency" TEXT NOT NULL,
 "feesCents" INTEGER CHECK ("feesCents" >= 0), "netCents" INTEGER,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentSettlement_companyId_orderId_fkey" FOREIGN KEY ("companyId", "orderId") REFERENCES "Order"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "PaymentSettlement_companyId_attemptId_fkey" FOREIGN KEY ("companyId", "attemptId") REFERENCES "PaymentAttempt"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentSettlement_attemptId_key" ON "PaymentSettlement"("attemptId");
CREATE UNIQUE INDEX "PaymentSettlement_companyId_attemptId_key" ON "PaymentSettlement"("companyId", "attemptId");
CREATE UNIQUE INDEX "PaymentSettlement_provider_merchantId_captureId_key" ON "PaymentSettlement"("provider", "merchantId", "captureId");
CREATE INDEX "PaymentSettlement_companyId_orderId_idx" ON "PaymentSettlement"("companyId", "orderId");
CREATE TABLE "PaymentWebhook" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "eventId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "externalOrderId" TEXT, "payloadHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RECEIVED', "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "PaymentWebhook_companyId_provider_eventId_key" ON "PaymentWebhook"("companyId", "provider", "eventId");
CREATE INDEX "PaymentWebhook_companyId_status_idx" ON "PaymentWebhook"("companyId", "status");
