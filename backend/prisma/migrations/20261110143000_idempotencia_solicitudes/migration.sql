ALTER TABLE "public_event_requests" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "public_event_requests_idempotency_key_key" ON "public_event_requests"("idempotency_key");
