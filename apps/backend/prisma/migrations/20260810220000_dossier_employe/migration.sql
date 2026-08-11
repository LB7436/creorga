-- Dossier employé : fiche RH, notes internes et documents (contrats, fiches
-- de paie). Rattaché à UserCompany, qui porte déjà la société et le rôle.
--
-- Migration purement additive : trois nouvelles tables, aucune colonne
-- ajoutée ou modifiée sur les tables existantes, aucune reprise de données.

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userCompanyId" TEXT NOT NULL,
    "poste" TEXT,
    "contrat" TEXT,
    "heuresHebdo" DOUBLE PRECISION,
    "salaireBrut" DOUBLE PRECISION,
    "dateEmbauche" TIMESTAMP(3),
    "dateFinContrat" TIMESTAMP(3),
    "dateNaissance" TIMESTAMP(3),
    "adresse" TEXT,
    "telephone" TEXT,
    "numSecu" TEXT,
    "iban" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "competences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeNote" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "auteurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fichier" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "periode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userCompanyId_key" ON "EmployeeProfile"("userCompanyId");

-- CreateIndex
CREATE INDEX "EmployeeNote_profileId_createdAt_idx" ON "EmployeeNote"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeDocument_profileId_type_idx" ON "EmployeeDocument"("profileId", "type");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userCompanyId_fkey" FOREIGN KEY ("userCompanyId") REFERENCES "UserCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeNote" ADD CONSTRAINT "EmployeeNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
