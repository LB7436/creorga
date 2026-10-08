ALTER TABLE "Company" ADD COLUMN "legalProfile" JSONB;
ALTER TABLE "Customer" ADD COLUMN "businessName" TEXT, ADD COLUMN "address" TEXT, ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR', ADD COLUMN "priceBasis" TEXT NOT NULL DEFAULT 'HT',
 ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0 CHECK ("discountCents" >= 0), ADD COLUMN "serviceDate" TIMESTAMP(3),
 ADD COLUMN "documentMode" TEXT NOT NULL DEFAULT 'AUTO', ADD COLUMN "issuedAt" TIMESTAMP(3), ADD COLUMN "issuedSnapshot" JSONB,
 ADD COLUMN "issuedPdf" BYTEA, ADD COLUMN "issuedPdfHash" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN "taxReason" TEXT;
-- Les documents historiques ne sont ni renumérotés ni faussement figés avec la fiche actuelle.
