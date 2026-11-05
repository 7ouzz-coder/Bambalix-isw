CREATE TABLE "EquipmentMaintenance" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentMaintenance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentMaintenance_valid_period" CHECK (
        isfinite("startsAt") AND isfinite("endsAt") AND "endsAt" > "startsAt"
    ),
    CONSTRAINT "EquipmentMaintenance_valid_reason" CHECK (
        char_length(btrim("reason")) BETWEEN 3 AND 500
    )
);

CREATE INDEX "EquipmentMaintenance_resourceId_startsAt_id_idx"
    ON "EquipmentMaintenance"("resourceId", "startsAt", "id");

ALTER TABLE "EquipmentMaintenance" ADD CONSTRAINT "EquipmentMaintenance_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
