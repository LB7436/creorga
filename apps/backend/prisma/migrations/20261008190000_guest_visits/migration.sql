-- Additive only. Historical orders remain unassigned and staff-visible.
CREATE TABLE "GuestVisit" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "tableId" TEXT NOT NULL,
 "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 "openedBy" TEXT NOT NULL, "closedAt" TIMESTAMP(3), "closedBy" TEXT, "closeReason" TEXT,
 CONSTRAINT "GuestVisit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "GuestVisit_expiration_check" CHECK ("expiresAt" > "openedAt" AND "expiresAt" <= "openedAt" + INTERVAL '24 hours')
);
CREATE UNIQUE INDEX "GuestVisit_companyId_id_key" ON "GuestVisit"("companyId", "id");
CREATE INDEX "GuestVisit_companyId_tableId_idx" ON "GuestVisit"("companyId", "tableId");
CREATE UNIQUE INDEX "GuestVisit_one_open_table" ON "GuestVisit"("companyId", "tableId") WHERE "closedAt" IS NULL;
CREATE TABLE "GuestVisitAccess" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "visitId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GuestVisitAccess_visit_fkey" FOREIGN KEY ("companyId", "visitId") REFERENCES "GuestVisit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GuestVisitAccess_tokenHash_key" ON "GuestVisitAccess"("tokenHash");
CREATE INDEX "GuestVisitAccess_companyId_visitId_idx" ON "GuestVisitAccess"("companyId", "visitId");
ALTER TABLE "Order" ADD COLUMN "guestVisitId" TEXT, ADD COLUMN "guestRequestHash" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_guestVisit_fkey" FOREIGN KEY ("companyId", "guestVisitId") REFERENCES "GuestVisit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD COLUMN "guestVisitId" TEXT;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_guestVisit_fkey" FOREIGN KEY ("companyId", "guestVisitId") REFERENCES "GuestVisit"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
