ALTER TABLE "OrderItem" ADD COLUMN "sourceLineId" TEXT;
CREATE TABLE "ServiceSession" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "tableId" TEXT NOT NULL,
 "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" TIMESTAMP(3),
 CONSTRAINT "ServiceSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceSession_companyId_id_key" ON "ServiceSession"("companyId","id");
CREATE INDEX "ServiceSession_companyId_tableId_closedAt_idx" ON "ServiceSession"("companyId","tableId","closedAt");
CREATE UNIQUE INDEX "ServiceSession_open_table_key" ON "ServiceSession"("companyId","tableId") WHERE "closedAt" IS NULL;
CREATE TABLE "ServiceCover" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "coverId" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "orderId" TEXT,
 "items" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("state" IN ('OPEN','SETTLED','CANCELLED')),
 "actorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ServiceCover_session_fkey" FOREIGN KEY ("companyId","sessionId") REFERENCES "ServiceSession"("companyId","id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ServiceCover_order_fkey" FOREIGN KEY ("companyId","orderId") REFERENCES "Order"("companyId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceCover_companyId_coverId_key" ON "ServiceCover"("companyId","coverId");
CREATE INDEX "ServiceCover_companyId_orderId_idx" ON "ServiceCover"("companyId","orderId");
