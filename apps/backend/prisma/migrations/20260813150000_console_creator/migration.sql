-- Console créateur : fondations de la collecte et de l'authentification.
--
-- Migration purement additive : sept nouvelles tables (auth créateur,
-- événements d'usage, connexions, erreurs, agrégats quotidiens par société,
-- opportunités commerciales) et deux index sur "Order". Aucune colonne
-- modifiée sur les tables existantes, aucune reprise de données.

-- CreateTable
CREATE TABLE "CreatorAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "userId" TEXT,
    "role" TEXT,
    "method" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "emailHash" TEXT,
    "kind" TEXT NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "path" TEXT,
    "companyId" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMetricDaily" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "mutations" INTEGER NOT NULL DEFAULT 0,
    "moduleUsage" JSONB NOT NULL DEFAULT '{}',
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "cashDiscrepancy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoicesOverdueCount" INTEGER NOT NULL DEFAULT 0,
    "invoicesOverdueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expensesNoReceipt" INTEGER NOT NULL DEFAULT 0,
    "haccpLogs" INTEGER NOT NULL DEFAULT 0,
    "wasOpen" BOOLEAN NOT NULL DEFAULT false,
    "rowCounts" JSONB NOT NULL DEFAULT '{}',
    "dataBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "statusNote" TEXT,
    "dedupKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorAccount_email_key" ON "CreatorAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRefreshToken_token_key" ON "CreatorRefreshToken"("token");

-- CreateIndex
CREATE INDEX "CreatorRefreshToken_accountId_createdAt_idx" ON "CreatorRefreshToken"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_companyId_ts_idx" ON "ActivityEvent"("companyId", "ts");

-- CreateIndex
CREATE INDEX "ActivityEvent_module_ts_idx" ON "ActivityEvent"("module", "ts");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_ts_idx" ON "ActivityEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_ts_idx" ON "LoginEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "LoginEvent_ts_idx" ON "LoginEvent"("ts");

-- CreateIndex
CREATE INDEX "ErrorLog_ts_idx" ON "ErrorLog"("ts");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMetricDaily_companyId_date_key" ON "TenantMetricDaily"("companyId", "date");

-- CreateIndex
CREATE INDEX "TenantMetricDaily_date_idx" ON "TenantMetricDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_dedupKey_key" ON "Opportunity"("dedupKey");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_status_idx" ON "Opportunity"("companyId", "status");

-- CreateIndex
CREATE INDEX "Opportunity_status_createdAt_idx" ON "Opportunity"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_companyId_paidAt_idx" ON "Order"("companyId", "paidAt");

-- CreateIndex
CREATE INDEX "Order_companyId_status_idx" ON "Order"("companyId", "status");

-- AddForeignKey
ALTER TABLE "CreatorRefreshToken" ADD CONSTRAINT "CreatorRefreshToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreatorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
