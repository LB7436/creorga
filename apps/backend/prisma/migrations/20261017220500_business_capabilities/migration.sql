-- Additif : ni changement de rôle, ni réécriture des ventes ou documents.
ALTER TABLE "UserCompany" ADD COLUMN "capabilities" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "UserCompany" ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_accessVersion_nonnegative" CHECK ("accessVersion" >= 0);
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_capabilities_object" CHECK (jsonb_typeof("capabilities") = 'object');
CREATE TABLE "BusinessPermissionEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "membershipId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "beforeVersion" INTEGER NOT NULL,
  "afterVersion" INTEGER NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL,
  "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessPermissionEvent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "UserCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "BusinessPermissionEvent_companyId_userId_createdAt_idx" ON "BusinessPermissionEvent"("companyId", "userId", "createdAt");
