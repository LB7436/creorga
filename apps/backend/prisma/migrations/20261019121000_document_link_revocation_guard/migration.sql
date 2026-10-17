-- Défense additive contre le résultat UNKNOWN des CHECK SQL sur NULL.
-- Les PK/FK et les documents sources restent inchangés ; aucune valeur réécrite.
ALTER TABLE "InvoiceDocumentLink"
ADD CONSTRAINT "InvoiceDocumentLink_revocation_complete_check"
CHECK (
  ("revokedAt" IS NULL AND "revokedBy" IS NULL AND "revocationReason" IS NULL)
  OR
  ("revokedAt" IS NOT NULL AND "revokedBy" IS NOT NULL
    AND "revocationReason" IS NOT NULL AND length(btrim("revocationReason")) >= 3)
);
