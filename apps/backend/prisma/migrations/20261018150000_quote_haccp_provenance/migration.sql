-- Anciennes acceptations / mesures laissées sans provenance inventée.
ALTER TABLE "Quote" ADD COLUMN "convertedInvoiceId" TEXT, ADD COLUMN "convertedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Quote_companyId_convertedInvoiceId_key" ON "Quote"("companyId", "convertedInvoiceId");
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_convertedInvoice_fkey" FOREIGN KEY ("companyId", "convertedInvoiceId") REFERENCES "Invoice"("companyId", "id") ON DELETE RESTRICT;
ALTER TABLE "HaccpLog" ADD COLUMN "source" TEXT CHECK ("source" IS NULL OR "source" = 'MANUAL');
