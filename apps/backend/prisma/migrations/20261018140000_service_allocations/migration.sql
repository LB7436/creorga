-- Additif, aucun backfill ni modification des montants/documents historiques.
CREATE TABLE "ServiceAllocation" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "planHash" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("companyId", "orderId"), UNIQUE ("companyId", "orderId", "id"),
  FOREIGN KEY ("companyId", "orderId") REFERENCES "Order"("companyId", "id") ON DELETE RESTRICT
);
CREATE TABLE "ServiceShare" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "allocationId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL, "tableId" TEXT NOT NULL, "label" TEXT NOT NULL,
  "totalCents" INTEGER NOT NULL CHECK ("totalCents" >= 0), "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("companyId", "orderId", "id"), UNIQUE ("companyId", "visitId"),
  FOREIGN KEY ("companyId", "orderId", "allocationId") REFERENCES "ServiceAllocation"("companyId", "orderId", "id") ON DELETE CASCADE,
  FOREIGN KEY ("companyId", "orderId") REFERENCES "Order"("companyId", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("companyId", "visitId") REFERENCES "GuestVisit"("companyId", "id") ON DELETE RESTRICT
);
CREATE INDEX "ServiceShare_companyId_tableId_idx" ON "ServiceShare"("companyId", "tableId");
CREATE UNIQUE INDEX "OrderTender_companyId_orderId_id_key" ON "OrderTender"("companyId", "orderId", "id");
CREATE TABLE "ServiceShareTender" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "shareId" TEXT NOT NULL, "tenderId" TEXT NOT NULL, "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("companyId", "tenderId", "shareId"),
  FOREIGN KEY ("companyId", "orderId", "shareId") REFERENCES "ServiceShare"("companyId", "orderId", "id") ON DELETE CASCADE,
  FOREIGN KEY ("companyId", "orderId", "tenderId") REFERENCES "OrderTender"("companyId", "orderId", "id") ON DELETE RESTRICT
);
CREATE FUNCTION creorga_allocation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'allocation financière immutable : correction explicite requise'; END $$;
CREATE TRIGGER "ServiceAllocation_immutable" BEFORE UPDATE ON "ServiceAllocation" FOR EACH ROW EXECUTE FUNCTION creorga_allocation_immutable();
CREATE TRIGGER "ServiceShare_immutable" BEFORE UPDATE ON "ServiceShare" FOR EACH ROW EXECUTE FUNCTION creorga_allocation_immutable();
CREATE TRIGGER "ServiceShareTender_immutable" BEFORE UPDATE ON "ServiceShareTender" FOR EACH ROW EXECUTE FUNCTION creorga_allocation_immutable();
CREATE FUNCTION creorga_allocated_order_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "orderId" = OLD.id) AND
     ROW(NEW."companyId", NEW."subtotal", NEW."taxAmount", NEW."total", NEW."guestVisitId", NEW."source") IS DISTINCT FROM
     ROW(OLD."companyId", OLD."subtotal", OLD."taxAmount", OLD."total", OLD."guestVisitId", OLD."source") THEN
    RAISE EXCEPTION 'allocation : montants et provenance de commande immutables';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Order_allocation_guard" BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION creorga_allocated_order_guard();
CREATE FUNCTION creorga_allocated_item_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "orderId" = OLD."orderId") THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'allocation : ligne historique immutable'; END IF;
    IF ROW(NEW."orderId", NEW."productId", NEW."quantity", NEW."unitPrice", NEW."taxRate", NEW."productName", NEW."notes") IS DISTINCT FROM
       ROW(OLD."orderId", OLD."productId", OLD."quantity", OLD."unitPrice", OLD."taxRate", OLD."productName", OLD."notes") THEN
      RAISE EXCEPTION 'allocation : ligne historique immutable';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "OrderItem_allocation_guard" BEFORE UPDATE OR DELETE ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION creorga_allocated_item_guard();
-- Validation différée : toutes les parts d'un règlement doivent exister dans le même commit.
CREATE FUNCTION creorga_share_tender_totals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cid TEXT; oid TEXT;
BEGIN
  cid := NEW."companyId"; oid := NEW."orderId";
  IF EXISTS (SELECT 1 FROM "ServiceAllocation" WHERE "companyId" = cid AND "orderId" = oid) THEN
    IF EXISTS (SELECT 1 FROM "OrderTender" t WHERE t."companyId" = cid AND t."orderId" = oid
      AND t."amountCents" <> COALESCE((SELECT SUM(s."amountCents") FROM "ServiceShareTender" s WHERE s."companyId" = cid AND s."tenderId" = t.id),0)) THEN
      RAISE EXCEPTION 'allocation : provenance de règlement incomplète';
    END IF;
    IF EXISTS (SELECT 1 FROM "ServiceShare" s WHERE s."companyId" = cid AND s."orderId" = oid
      AND s."totalCents" < COALESCE((SELECT SUM(p."amountCents") FROM "ServiceShareTender" p WHERE p."companyId" = cid AND p."shareId" = s.id),0)) THEN
      RAISE EXCEPTION 'allocation : groupe surpayé';
    END IF;
    IF (SELECT SUM("totalCents") FROM "ServiceShare" WHERE "companyId" = cid AND "orderId" = oid) IS DISTINCT FROM
       (SELECT ROUND("total"::numeric * 100)::bigint FROM "Order" WHERE "companyId" = cid AND id = oid) THEN
      RAISE EXCEPTION 'allocation : centimes de commande non conservés';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "ServiceShareTender_totals" AFTER INSERT ON "ServiceShareTender" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creorga_share_tender_totals();
CREATE CONSTRAINT TRIGGER "OrderTender_share_totals" AFTER INSERT ON "OrderTender" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creorga_share_tender_totals();
CREATE CONSTRAINT TRIGGER "ServiceShare_totals" AFTER INSERT ON "ServiceShare" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION creorga_share_tender_totals();
