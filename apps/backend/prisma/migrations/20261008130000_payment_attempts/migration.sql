CREATE UNIQUE INDEX "Order_companyId_id_key" ON "Order"("companyId", "id");
CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT,
  "requestId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "externalId" TEXT,
  "createRequestId" TEXT NOT NULL,
  "captureRequestId" TEXT NOT NULL,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_companyId_orderId_fkey" FOREIGN KEY ("companyId", "orderId") REFERENCES "Order"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentAttempt_companyId_requestId_key" ON "PaymentAttempt"("companyId", "requestId");
CREATE UNIQUE INDEX "PaymentAttempt_provider_merchantId_externalId_key" ON "PaymentAttempt"("provider", "merchantId", "externalId");
CREATE INDEX "PaymentAttempt_companyId_orderId_status_idx" ON "PaymentAttempt"("companyId", "orderId", "status");
CREATE UNIQUE INDEX "PaymentAttempt_one_active_order" ON "PaymentAttempt"("companyId", "orderId")
WHERE "status" IN ('CREATING', 'PENDING', 'AWAITING_TERMINAL', 'UNKNOWN', 'REVIEW', 'AUTHORIZED');
