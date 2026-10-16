-- Additive: historical files are not falsely assigned a verified digest.
ALTER TABLE "EmployeeDocument" ADD COLUMN "sha256" TEXT, ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_sha256_check"
  CHECK ("sha256" IS NULL OR "sha256" ~ '^[a-f0-9]{64}$');
