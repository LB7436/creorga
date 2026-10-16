CREATE TABLE "FloorWorkspace" (
 "companyId" TEXT PRIMARY KEY, "revision" BIGINT NOT NULL CHECK ("revision" >= 0),
 "snapshot" JSONB NOT NULL, "snapshotHash" TEXT NOT NULL, "initialSnapshot" JSONB NOT NULL, "initialHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FloorWorkspace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FloorChange" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "revision" BIGINT NOT NULL,
 "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "beforeHash" TEXT NOT NULL, "afterHash" TEXT NOT NULL,
 "delta" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FloorChange_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "FloorWorkspace"("companyId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FloorChange_companyId_revision_key" ON "FloorChange"("companyId","revision");
