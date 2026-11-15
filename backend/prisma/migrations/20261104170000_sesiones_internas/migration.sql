CREATE TABLE "internal_users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "internal_users_email_key" ON "internal_users"("email");
CREATE TABLE "internal_sessions" (
  "id" TEXT PRIMARY KEY,
  "token_hash" TEXT NOT NULL,
  "csrf_token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "internal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "internal_sessions_token_hash_key" ON "internal_sessions"("token_hash");
CREATE INDEX "internal_sessions_user_id_idx" ON "internal_sessions"("user_id");
CREATE INDEX "internal_sessions_expires_at_idx" ON "internal_sessions"("expires_at");
