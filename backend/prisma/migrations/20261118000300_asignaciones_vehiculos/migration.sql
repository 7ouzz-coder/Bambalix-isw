CREATE TABLE "VehicleAssignment" (
 "id" TEXT PRIMARY KEY,
 "vehicleId" TEXT NOT NULL REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "eventId" INTEGER NOT NULL REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "startsAt" TIMESTAMPTZ(3) NOT NULL, "endsAt" TIMESTAMPTZ(3) NOT NULL,
 "releasedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "VehicleAssignment_period_check" CHECK ("endsAt" > "startsAt")
);
CREATE INDEX "VehicleAssignment_vehicleId_releasedAt_startsAt_idx" ON "VehicleAssignment"("vehicleId","releasedAt","startsAt");
CREATE INDEX "VehicleAssignment_eventId_idx" ON "VehicleAssignment"("eventId");
