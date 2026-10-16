CREATE FUNCTION creorga_allocated_settlement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "orderId" = OLD.id) THEN
    IF NEW."status" = 'CANCELLED' AND OLD."status" <> 'CANCELLED' THEN RAISE EXCEPTION 'allocation : correction documentaire requise avant annulation'; END IF;
    IF (NEW."paidAt" IS NOT NULL OR NEW."status" = 'PAID') AND
       COALESCE((SELECT SUM("amountCents") FROM "OrderTender" WHERE "orderId" = OLD.id),0) <> ROUND(OLD."total"::numeric * 100) THEN
      RAISE EXCEPTION 'allocation : paiement total non démontré';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Order_allocation_settlement_guard" BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION creorga_allocated_settlement_guard();
CREATE FUNCTION creorga_allocated_tender_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "orderId" = OLD."orderId") THEN RAISE EXCEPTION 'allocation : règlement et provenance immutables'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "OrderTender_allocation_guard" BEFORE UPDATE ON "OrderTender" FOR EACH ROW EXECUTE FUNCTION creorga_allocated_tender_guard();
