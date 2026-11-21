CREATE TABLE "EquipmentIncident" (
  "id" TEXT PRIMARY KEY,
  "assignmentId" TEXT NOT NULL REFERENCES "EquipmentAssignment"("id") ON DELETE RESTRICT,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EquipmentIncident_assignmentId_createdAt_idx" ON "EquipmentIncident"("assignmentId", "createdAt");
