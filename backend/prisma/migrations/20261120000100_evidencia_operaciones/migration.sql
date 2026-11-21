CREATE TABLE "EquipmentMaintenancePhoto" (
  "maintenanceId" TEXT NOT NULL REFERENCES "EquipmentMaintenance"("id") ON DELETE CASCADE,
  "stage" TEXT NOT NULL CHECK ("stage" IN ('before', 'after')),
  "mime" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  PRIMARY KEY ("maintenanceId", "stage")
);
