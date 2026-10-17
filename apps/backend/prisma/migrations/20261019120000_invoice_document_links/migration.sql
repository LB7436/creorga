-- Additif : aucune facture, vente ou pièce historique modifiée.
CREATE TABLE "InvoiceDocumentLink" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "documentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" TEXT,
  "revocationReason" TEXT,
  CONSTRAINT "InvoiceDocumentLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceDocumentLink_companyId_invoiceId_fkey" FOREIGN KEY ("companyId", "invoiceId") REFERENCES "Invoice"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoiceDocumentLink_lifetime_check" CHECK ("expiresAt" > "createdAt" AND "expiresAt" <= "createdAt" + INTERVAL '60 minutes'),
  CONSTRAINT "InvoiceDocumentLink_hash_check" CHECK ("documentHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "InvoiceDocumentLink_revocation_check" CHECK (("revokedAt" IS NULL AND "revokedBy" IS NULL AND "revocationReason" IS NULL) OR ("revokedAt" IS NOT NULL AND "revokedBy" IS NOT NULL AND length("revocationReason") >= 3))
);
CREATE UNIQUE INDEX "InvoiceDocumentLink_companyId_id_key" ON "InvoiceDocumentLink"("companyId", "id");
CREATE INDEX "InvoiceDocumentLink_companyId_invoiceId_createdAt_idx" ON "InvoiceDocumentLink"("companyId", "invoiceId", "createdAt");
CREATE TABLE "InvoiceDocumentLinkEvent" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceDocumentLinkEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceDocumentLinkEvent_companyId_linkId_fkey" FOREIGN KEY ("companyId", "linkId") REFERENCES "InvoiceDocumentLink"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoiceDocumentLinkEvent_action_check" CHECK ("action" IN ('CREATED', 'REVOKED', 'DOWNLOADED'))
);
CREATE INDEX "InvoiceDocumentLinkEvent_companyId_linkId_createdAt_idx" ON "InvoiceDocumentLinkEvent"("companyId", "linkId", "createdAt");
