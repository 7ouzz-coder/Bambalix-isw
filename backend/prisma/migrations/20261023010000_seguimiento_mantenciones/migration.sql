ALTER TABLE "EquipmentMaintenance"
    ADD COLUMN "closedAt" TIMESTAMPTZ(3),
    ADD COLUMN "closingNotes" TEXT,
    ADD CONSTRAINT "EquipmentMaintenance_valid_closure" CHECK (
        ("closedAt" IS NULL AND "closingNotes" IS NULL)
        OR ("closedAt" IS NOT NULL AND isfinite("closedAt")
            AND "closingNotes" IS NOT NULL
            AND char_length(btrim("closingNotes")) BETWEEN 3 AND 500)
    );

CREATE TABLE "EquipmentMaintenanceNote" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentMaintenanceNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentMaintenanceNote_valid_content" CHECK (
        char_length(btrim("content")) BETWEEN 3 AND 500
    ),
    CONSTRAINT "EquipmentMaintenanceNote_maintenanceId_fkey"
        FOREIGN KEY ("maintenanceId") REFERENCES "EquipmentMaintenance"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "EquipmentMaintenanceNote_maintenanceId_createdAt_id_idx"
    ON "EquipmentMaintenanceNote"("maintenanceId", "createdAt", "id");
