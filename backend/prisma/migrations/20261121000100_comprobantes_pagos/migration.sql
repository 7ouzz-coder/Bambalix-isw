CREATE TABLE "payment_receipts" (
  "payment_id" TEXT PRIMARY KEY REFERENCES "payments"("id") ON DELETE CASCADE,
  "mime" TEXT NOT NULL,
  "content" BYTEA NOT NULL
);
