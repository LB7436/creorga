-- Aucun rapprochement rétroactif ni réécriture de ticket historique.
CREATE TABLE "SaleOrigin" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('LINE', 'ORDER')),
  "sourceId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleOrigin_companyId_saleId_fkey" FOREIGN KEY ("companyId", "saleId") REFERENCES "PosSale"("companyId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SaleOrigin_companyId_kind_sourceId_key" ON "SaleOrigin"("companyId", "kind", "sourceId");
CREATE INDEX "SaleOrigin_companyId_saleId_idx" ON "SaleOrigin"("companyId", "saleId");
