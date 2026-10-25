-- v1.1 performance indexes

CREATE INDEX IF NOT EXISTS "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX IF NOT EXISTS "event_bookings_event_id_booking_status_idx" ON "event_bookings"("event_id", "booking_status");
CREATE INDEX IF NOT EXISTS "events_status_booking_start_idx" ON "events"("status", "booking_start");
