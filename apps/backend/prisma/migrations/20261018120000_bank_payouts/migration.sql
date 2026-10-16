CREATE TABLE "PayoutStatement" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
 "actorId" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
 "statementRef" TEXT NOT NULL, "provider" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "currency" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("companyId","id"), UNIQUE("companyId","contentHash"), UNIQUE("companyId","provider","merchantId","statementRef")
);
CREATE TABLE "BankPayout" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "statementId" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "currency" TEXT NOT NULL, "externalRef" TEXT NOT NULL,
 "declaredNetCents" INTEGER NOT NULL, "receivedCents" INTEGER CHECK ("receivedCents" >= 0), "bankReference" TEXT, "receivedAt" TIMESTAMP(3),
 "validatedAt" TIMESTAMP(3), "validatedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("companyId","statementId") REFERENCES "PayoutStatement"("companyId","id") ON DELETE CASCADE,
 UNIQUE("companyId","id"), UNIQUE("companyId","provider","merchantId","externalRef"),
 CHECK (("validatedAt" IS NULL) = ("validatedBy" IS NULL))
);
CREATE INDEX "BankPayout_companyId_createdAt_idx" ON "BankPayout"("companyId","createdAt");
CREATE TABLE "PayoutLine" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "payoutId" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "merchantId" TEXT NOT NULL, "kind" TEXT NOT NULL CHECK ("kind" IN ('CAPTURE','REFUND','FEE','HOLD','RELEASE')),
 "externalRef" TEXT NOT NULL, "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0), "settlementId" TEXT, "refundId" TEXT,
 FOREIGN KEY ("companyId","payoutId") REFERENCES "BankPayout"("companyId","id") ON DELETE CASCADE,
 FOREIGN KEY ("companyId","settlementId") REFERENCES "PaymentSettlement"("companyId","id") ON DELETE RESTRICT,
 FOREIGN KEY ("companyId","refundId") REFERENCES "RefundAttempt"("companyId","id") ON DELETE RESTRICT,
 UNIQUE("companyId","provider","merchantId","kind","externalRef"), UNIQUE("companyId","settlementId"), UNIQUE("companyId","refundId"),
 CHECK (("kind" = 'CAPTURE' OR "settlementId" IS NULL) AND ("kind" = 'REFUND' OR "refundId" IS NULL))
);
CREATE INDEX "PayoutLine_companyId_payoutId_idx" ON "PayoutLine"("companyId","payoutId");
CREATE TABLE "PayoutDecision" (
 "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "payoutId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("companyId","payoutId") REFERENCES "BankPayout"("companyId","id") ON DELETE CASCADE
);
CREATE INDEX "PayoutDecision_companyId_payoutId_idx" ON "PayoutDecision"("companyId","payoutId");
CREATE TRIGGER "PayoutDecision_no_update" BEFORE UPDATE ON "PayoutDecision" FOR EACH ROW EXECUTE FUNCTION "creorga_immutable_review"();
