-- Migration additive : aucune vente ni aucun fichier existant n'est supprimé.
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'BACKOFFICE',
 ADD COLUMN "externalTableId" TEXT, ADD COLUMN "publicToken" TEXT, ADD COLUMN "guestStatus" TEXT;
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;
CREATE TABLE "PosSale" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id"), "userId" TEXT NOT NULL,
 "number" INTEGER NOT NULL, "snapshot" JSONB NOT NULL, "closedId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PosSale_companyId_number_key" ON "PosSale"("companyId", "number");
CREATE INDEX "PosSale_companyId_closedId_idx" ON "PosSale"("companyId", "closedId");
CREATE TABLE "PosCoverPayment" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "coverId" TEXT NOT NULL, "saleId" TEXT NOT NULL REFERENCES "PosSale"("id")
);
CREATE UNIQUE INDEX "PosCoverPayment_companyId_coverId_key" ON "PosCoverPayment"("companyId", "coverId");
CREATE TABLE "PosClosure" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id"), "userId" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PosClosure_companyId_createdAt_idx" ON "PosClosure"("companyId", "createdAt");
CREATE TABLE "PosReceiptDelivery" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "saleId" TEXT NOT NULL,
 "recipient" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "providerId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PosReceiptDelivery_companyId_saleId_idx" ON "PosReceiptDelivery"("companyId", "saleId");
