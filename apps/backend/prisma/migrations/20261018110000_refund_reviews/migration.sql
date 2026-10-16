ALTER TABLE "RefundAttempt" ADD COLUMN "reservationReleasedAt" TIMESTAMP(3);
ALTER TABLE "RefundAttempt" DROP CONSTRAINT "RefundAttempt_status_check";
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_status_check" CHECK ("status" IN ('PENDING','UNKNOWN','REVIEW','SUCCEEDED','REFUSED_RECONCILIATION','NOT_REFUNDED'));
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_release_check" CHECK (("status" = 'NOT_REFUNDED') = ("reservationReleasedAt" IS NOT NULL));
CREATE TABLE "RefundReviewEvent" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "refundId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "requestHash" TEXT,
  "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("companyId", "refundId") REFERENCES "RefundAttempt"("companyId", "id") ON DELETE CASCADE
);
CREATE INDEX "RefundReviewEvent_companyId_refundId_createdAt_idx" ON "RefundReviewEvent"("companyId", "refundId", "createdAt");
CREATE FUNCTION "creorga_immutable_review"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Append-only reconciliation history'; END $$;
CREATE TRIGGER "RefundReviewEvent_no_update" BEFORE UPDATE ON "RefundReviewEvent" FOR EACH ROW EXECUTE FUNCTION "creorga_immutable_review"();
