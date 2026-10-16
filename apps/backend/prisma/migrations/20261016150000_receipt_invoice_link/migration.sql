-- Ajout uniquement : ne recrée et ne renumérote aucune vente/facture existante.
ALTER TABLE "Invoice" ADD COLUMN "sourcePosSaleId" TEXT, ADD COLUMN "sourceReceipt" JSONB;
CREATE UNIQUE INDEX "PosSale_companyId_id_key" ON "PosSale"("companyId", "id");
CREATE UNIQUE INDEX "Invoice_sourcePosSaleId_key" ON "Invoice"("sourcePosSaleId");
CREATE UNIQUE INDEX "Invoice_companyId_sourcePosSaleId_key" ON "Invoice"("companyId", "sourcePosSaleId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_sourcePosSale_fkey"
  FOREIGN KEY ("companyId", "sourcePosSaleId") REFERENCES "PosSale"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_sourceReceipt_check"
  CHECK (("sourcePosSaleId" IS NULL AND "sourceReceipt" IS NULL) OR ("sourcePosSaleId" IS NOT NULL AND "sourceReceipt" IS NOT NULL));
