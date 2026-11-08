CREATE TABLE "public_event_requests" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "phone" TEXT,
 "requested_date" TEXT NOT NULL,
 "service" TEXT NOT NULL,
 "message" TEXT NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "public_event_requests_pkey" PRIMARY KEY ("id")
);
