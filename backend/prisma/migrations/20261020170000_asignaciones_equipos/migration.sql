CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    CONSTRAINT "EquipmentAssignment_valid_period" CHECK (
        isfinite("startsAt") AND isfinite("endsAt") AND "endsAt" > "startsAt"
    ),
    CONSTRAINT "EquipmentAssignment_valid_release" CHECK (
        ("releasedAt" IS NULL AND "releaseReason" IS NULL) OR
        ("releasedAt" IS NOT NULL AND "releaseReason" IS NOT NULL AND char_length(btrim("releaseReason")) BETWEEN 3 AND 500)
    ),
    CONSTRAINT "EquipmentAssignment_resourceId_fkey" FOREIGN KEY ("resourceId")
        REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipmentAssignment_eventId_fkey" FOREIGN KEY ("eventId")
        REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "EquipmentAssignment_resourceId_releasedAt_startsAt_idx"
    ON "EquipmentAssignment"("resourceId", "releasedAt", "startsAt");
CREATE INDEX "EquipmentAssignment_eventId_idx" ON "EquipmentAssignment"("eventId");
