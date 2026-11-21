CREATE TABLE "VehicleMaintenance" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VehicleMaintenance_period_check" CHECK ("endsAt" > "startsAt")
);
CREATE INDEX "VehicleMaintenance_vehicleId_startsAt_endsAt_idx" ON "VehicleMaintenance"("vehicleId", "startsAt", "endsAt");
