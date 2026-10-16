ALTER TABLE "GuestVisitAccess" ADD COLUMN "revokedAt" TIMESTAMP(3), ADD COLUMN "revokeReason" TEXT;
-- Plusieurs groupes restent séparés après une fusion physique. L'ouverture
-- ordinaire reste sérialisée par le verrou société/table et refuse un doublon.
DROP INDEX "GuestVisit_one_open_table";
CREATE TABLE "TableMovement" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "actorId" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TableMovement_companyId_createdAt_idx" ON "TableMovement"("companyId", "createdAt");
