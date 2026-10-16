ALTER TABLE "RefundAttempt" DROP CONSTRAINT "RefundAttempt_status_check";
ALTER TABLE "RefundAttempt" ADD CONSTRAINT "RefundAttempt_status_check"
 CHECK ("status" IN ('PENDING','UNKNOWN','REVIEW','SUCCEEDED','REFUSED_RECONCILIATION'));
