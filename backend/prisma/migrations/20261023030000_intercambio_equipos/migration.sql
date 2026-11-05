ALTER TABLE "EquipmentReplacement" ADD COLUMN "resultingAssignmentId" TEXT;

CREATE UNIQUE INDEX "EquipmentReplacement_resultingAssignmentId_key"
    ON "EquipmentReplacement"("resultingAssignmentId");

ALTER TABLE "EquipmentReplacement"
    ADD CONSTRAINT "EquipmentReplacement_resultingAssignmentId_fkey"
    FOREIGN KEY ("resultingAssignmentId") REFERENCES "EquipmentAssignment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "EquipmentReplacement_resultingAssignment" CHECK (
        "resultingAssignmentId" IS NULL
        OR ("status" = 'APPROVED' AND "proposedResourceId" IS NOT NULL
            AND "resultingAssignmentId" <> "assignmentId")
    );
