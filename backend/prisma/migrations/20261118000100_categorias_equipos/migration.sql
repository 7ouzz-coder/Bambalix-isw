CREATE TABLE "EquipmentCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EquipmentCategory_name_key" ON "EquipmentCategory"("name");
CREATE UNIQUE INDEX "EquipmentCategory_name_ci_key" ON "EquipmentCategory" (lower("name"));
INSERT INTO "EquipmentCategory" ("id", "name")
SELECT md5(lower(trim("category"))), min(trim("category"))
FROM "Resource"
WHERE trim("category") <> ''
GROUP BY lower(trim("category"));
