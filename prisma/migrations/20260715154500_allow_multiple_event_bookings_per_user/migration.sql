-- Allow multiple bookings per user on the same event (add more spots).
DROP INDEX IF EXISTS "event_bookings_event_id_user_id_key";

CREATE INDEX IF NOT EXISTS "event_bookings_event_id_user_id_idx" ON "event_bookings"("event_id", "user_id");
