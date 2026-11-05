-- AlterTable
ALTER TABLE "Client" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT 'persona',
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPosition" TEXT;
