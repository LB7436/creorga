CREATE TABLE "CreditNote" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
  "number" TEXT NOT NULL, "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "currency" TEXT NOT NULL, "totalCents" INTEGER NOT NULL CHECK ("totalCents" > 0),
  "baseCents" INTEGER NOT NULL CHECK ("baseCents" >= 0), "taxCents" INTEGER NOT NULL CHECK ("taxCents" >= 0),
  "taxGroups" JSONB NOT NULL, "snapshot" JSONB NOT NULL, "pdf" BYTEA NOT NULL, "pdfHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNote_amounts_check" CHECK ("baseCents" + "taxCents" = "totalCents"),
  CONSTRAINT "CreditNote_companyId_invoiceId_fkey" FOREIGN KEY ("companyId", "invoiceId") REFERENCES "Invoice"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CreditNote_companyId_id_key" ON "CreditNote"("companyId", "id");
CREATE UNIQUE INDEX "CreditNote_companyId_number_key" ON "CreditNote"("companyId", "number");
CREATE INDEX "CreditNote_companyId_invoiceId_idx" ON "CreditNote"("companyId", "invoiceId");
