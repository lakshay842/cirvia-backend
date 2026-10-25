-- Event module extensions

ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'BOOKING_CLOSED';

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_trending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "amenities_json" JSONB;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

CREATE INDEX IF NOT EXISTS "events_is_featured_idx" ON "events"("is_featured");
CREATE INDEX IF NOT EXISTS "events_is_trending_idx" ON "events"("is_trending");
CREATE INDEX IF NOT EXISTS "events_slug_idx" ON "events"("slug");
