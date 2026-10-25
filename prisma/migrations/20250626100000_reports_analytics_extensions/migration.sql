-- Reports module extensions: types, attachments, expanded report fields

CREATE TYPE "ReportType" AS ENUM ('USER', 'HOST', 'EVENT', 'REVIEW', 'BOOKING');
CREATE TYPE "ReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "ReportCategory_new" AS ENUM (
  'SPAM',
  'HARASSMENT',
  'VIOLENCE',
  'FAKE_PROFILE',
  'SCAM',
  'NSFW',
  'OTHER'
);

CREATE TYPE "ReportStatus_new" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'RESOLVED',
  'REJECTED',
  'CLOSED'
);

ALTER TYPE "ReportActionType" ADD VALUE IF NOT EXISTS 'NOTE';
ALTER TYPE "ReportActionType" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "ReportActionType" ADD VALUE IF NOT EXISTS 'STATUS_CHANGE';

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "report_type" "ReportType";
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "reported_host_id" UUID;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "reported_booking_id" UUID;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "reported_review_id" UUID;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "review_type" "ReviewType";
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "priority" "ReportPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "reports"
SET "report_type" = CASE
  WHEN "reported_event_id" IS NOT NULL THEN 'EVENT'::"ReportType"
  WHEN "reported_user_id" IS NOT NULL THEN 'USER'::"ReportType"
  ELSE 'USER'::"ReportType"
END
WHERE "report_type" IS NULL;

ALTER TABLE "reports" ALTER COLUMN "report_type" SET NOT NULL;

ALTER TABLE "reports" ALTER COLUMN "category" TYPE "ReportCategory_new" USING (
  CASE "category"::text
    WHEN 'UNSAFE_BEHAVIOUR' THEN 'VIOLENCE'::"ReportCategory_new"
    WHEN 'FRAUD' THEN 'SCAM'::"ReportCategory_new"
    ELSE "category"::text::"ReportCategory_new"
  END
);

ALTER TABLE "reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reports" ALTER COLUMN "status" TYPE "ReportStatus_new" USING (
  CASE "status"::text
    WHEN 'DISMISSED' THEN 'REJECTED'::"ReportStatus_new"
    WHEN 'ESCALATED' THEN 'CLOSED'::"ReportStatus_new"
    ELSE "status"::text::"ReportStatus_new"
  END
);

ALTER TABLE "review_reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "review_reports" ALTER COLUMN "status" TYPE "ReportStatus_new" USING (
  CASE "status"::text
    WHEN 'DISMISSED' THEN 'REJECTED'::"ReportStatus_new"
    WHEN 'ESCALATED' THEN 'CLOSED'::"ReportStatus_new"
    ELSE "status"::text::"ReportStatus_new"
  END
);

ALTER TABLE "event_reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "event_reports" ALTER COLUMN "status" TYPE "ReportStatus_new" USING (
  CASE "status"::text
    WHEN 'DISMISSED' THEN 'REJECTED'::"ReportStatus_new"
    WHEN 'ESCALATED' THEN 'CLOSED'::"ReportStatus_new"
    ELSE "status"::text::"ReportStatus_new"
  END
);

DROP TYPE "ReportCategory";
ALTER TYPE "ReportCategory_new" RENAME TO "ReportCategory";

DROP TYPE "ReportStatus";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";

ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ReportStatus";
ALTER TABLE "review_reports" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ReportStatus";
ALTER TABLE "event_reports" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ReportStatus";

CREATE INDEX IF NOT EXISTS "reports_report_type_idx" ON "reports"("report_type");
CREATE INDEX IF NOT EXISTS "reports_priority_idx" ON "reports"("priority");
CREATE INDEX IF NOT EXISTS "reports_assigned_to_idx" ON "reports"("assigned_to");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_report_type_reported_user_id_idx"
  ON "reports"("reporter_id", "report_type", "reported_user_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_report_type_reported_host_id_idx"
  ON "reports"("reporter_id", "report_type", "reported_host_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_report_type_reported_event_id_idx"
  ON "reports"("reporter_id", "report_type", "reported_event_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_report_type_reported_booking_id_idx"
  ON "reports"("reporter_id", "report_type", "reported_booking_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_report_type_reported_review_id_review_type_idx"
  ON "reports"("reporter_id", "report_type", "reported_review_id", "review_type");

DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_host_id_fkey"
    FOREIGN KEY ("reported_host_id") REFERENCES "host_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_booking_id_fkey"
    FOREIGN KEY ("reported_booking_id") REFERENCES "event_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "report_attachments" (
  "id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "uploaded_by" UUID NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_name" TEXT,
  "mime_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_attachments_report_id_idx" ON "report_attachments"("report_id");

DO $$ BEGIN
  ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
