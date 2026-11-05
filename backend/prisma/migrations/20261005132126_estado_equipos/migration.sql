-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('UNREVIEWED', 'OPERATIONAL', 'MAINTENANCE', 'DAMAGED');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "EquipmentStatus" NOT NULL DEFAULT 'UNREVIEWED';

-- CreateTable
CREATE TABLE "EquipmentStatusChange" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "previousStatus" "EquipmentStatus" NOT NULL,
    "status" "EquipmentStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentStatusChange_resourceId_createdAt_idx" ON "EquipmentStatusChange"("resourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentStatusChange_resourceId_revision_key" ON "EquipmentStatusChange"("resourceId", "revision");

-- AddForeignKey
ALTER TABLE "EquipmentStatusChange" ADD CONSTRAINT "EquipmentStatusChange_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
