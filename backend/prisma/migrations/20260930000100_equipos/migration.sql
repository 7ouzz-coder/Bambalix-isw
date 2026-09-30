CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "code" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'UNIT',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Resource_individual_check" CHECK ("mode" = 'UNIT' AND "quantity" = 1)
);
CREATE UNIQUE INDEX "Resource_code_key" ON "Resource"("code");
CREATE INDEX "Resource_category_name_idx" ON "Resource"("category", "name");
