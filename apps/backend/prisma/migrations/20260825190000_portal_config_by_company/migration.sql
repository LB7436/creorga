CREATE TABLE "PortalConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "toggles" JSONB NOT NULL DEFAULT '{}',
    "games" JSONB NOT NULL DEFAULT '{}',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "tableNumber" TEXT NOT NULL DEFAULT '1',
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "logoDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalConfiguration_companyId_key" ON "PortalConfiguration"("companyId");

ALTER TABLE "PortalConfiguration"
ADD CONSTRAINT "PortalConfiguration_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
