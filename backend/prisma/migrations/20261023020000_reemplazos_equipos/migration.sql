CREATE TYPE "EquipmentReplacementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "EquipmentReplacement" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "proposedResourceId" TEXT,
    "externalAlternative" TEXT,
    "reason" TEXT NOT NULL,
    "estimatedCost" DECIMAL(12,2),
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "eventStartsAt" TIMESTAMPTZ(3) NOT NULL,
    "eventEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "EquipmentReplacementStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),
    "decidedById" TEXT,
    "decisionReason" TEXT,
    CONSTRAINT "EquipmentReplacement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentReplacement_alternative" CHECK (
        ("proposedResourceId" IS NOT NULL AND "externalAlternative" IS NULL)
        OR ("proposedResourceId" IS NULL AND "externalAlternative" IS NOT NULL
            AND char_length(btrim("externalAlternative")) BETWEEN 3 AND 240)
    ),
    CONSTRAINT "EquipmentReplacement_reason" CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500),
    CONSTRAINT "EquipmentReplacement_cost" CHECK ("estimatedCost" IS NULL OR "estimatedCost" >= 0),
    CONSTRAINT "EquipmentReplacement_period" CHECK (
        isfinite("startsAt") AND isfinite("endsAt") AND "endsAt" > "startsAt"
        AND isfinite("eventStartsAt") AND isfinite("eventEndsAt") AND "eventEndsAt" > "eventStartsAt"
        AND "startsAt" <= "eventStartsAt" AND "endsAt" >= "eventEndsAt"
    ),
    CONSTRAINT "EquipmentReplacement_decision" CHECK (
        ("status" = 'PENDING' AND "decidedAt" IS NULL AND "decidedById" IS NULL AND "decisionReason" IS NULL)
        OR ("status" <> 'PENDING' AND "decidedAt" IS NOT NULL AND isfinite("decidedAt")
            AND "decidedById" IS NOT NULL AND char_length(btrim("decidedById")) BETWEEN 1 AND 100
            AND "decisionReason" IS NOT NULL AND char_length(btrim("decisionReason")) BETWEEN 3 AND 500)
    ),
    CONSTRAINT "EquipmentReplacement_assignmentId_fkey" FOREIGN KEY ("assignmentId")
        REFERENCES "EquipmentAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipmentReplacement_proposedResourceId_fkey" FOREIGN KEY ("proposedResourceId")
        REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "EquipmentReplacement_assignmentId_createdAt_id_idx" ON "EquipmentReplacement"("assignmentId", "createdAt", "id");
CREATE INDEX "EquipmentReplacement_proposedResourceId_idx" ON "EquipmentReplacement"("proposedResourceId");
