-- Complète le garde-fou d'items : DELETE hors allocation doit conserver son comportement.
CREATE OR REPLACE FUNCTION creorga_allocated_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE oid TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN oid := NEW."orderId"; ELSE oid := OLD."orderId"; END IF;
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "orderId" = oid) THEN
    IF TG_OP IN ('DELETE','INSERT') THEN RAISE EXCEPTION 'allocation : ligne historique immutable'; END IF;
    IF ROW(NEW."orderId", NEW."productId", NEW."quantity", NEW."unitPrice", NEW."taxRate", NEW."productName", NEW."notes") IS DISTINCT FROM
       ROW(OLD."orderId", OLD."productId", OLD."quantity", OLD."unitPrice", OLD."taxRate", OLD."productName", OLD."notes") THEN
      RAISE EXCEPTION 'allocation : ligne historique immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "OrderItem_allocation_insert_guard" BEFORE INSERT ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION creorga_allocated_item_guard();
