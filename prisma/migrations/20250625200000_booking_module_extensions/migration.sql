-- Booking module extensions: status values, expiry, history timeline

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TABLE "event_bookings" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
ALTER TABLE "event_bookings" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "event_bookings" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

CREATE TABLE IF NOT EXISTS "booking_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booking_history_booking_id_idx" ON "booking_history"("booking_id");
CREATE INDEX IF NOT EXISTS "booking_history_booking_id_created_at_idx" ON "booking_history"("booking_id", "created_at");

DO $$ BEGIN
    ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_booking_id_fkey"
        FOREIGN KEY ("booking_id") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "booking_history" ADD CONSTRAINT "booking_history_actor_id_fkey"
        FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "event_bookings_expires_at_idx" ON "event_bookings"("expires_at");
