-- Additif : aucune réservation historique réécrite ni supprimée.
CREATE UNIQUE INDEX "Table_companyId_id_key" ON "Table"("companyId", "id");
CREATE UNIQUE INDEX "Customer_companyId_id_key" ON "Customer"("companyId", "id");
-- NOT VALID préserve une copie ancienne éventuellement incohérente. Les nouvelles
-- écritures sont contrôlées ; la validation des anciennes relations reste distincte.
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_company_table_fkey"
  FOREIGN KEY ("companyId", "tableId") REFERENCES "Table"("companyId", "id") NOT VALID;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_company_customer_fkey"
  FOREIGN KEY ("companyId", "customerId") REFERENCES "Customer"("companyId", "id") NOT VALID;
CREATE INDEX "Reservation_company_table_date_idx" ON "Reservation"("companyId", "tableId", "date");
