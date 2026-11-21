ALTER TABLE "quote_items" ADD COLUMN "equipment_id" TEXT, ADD COLUMN "vehicle_id" TEXT;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_one_resource_check" CHECK ("equipment_id" IS NULL OR "vehicle_id" IS NULL);
