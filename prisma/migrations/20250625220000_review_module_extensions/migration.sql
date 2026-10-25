-- Review module extensions: moderation, votes, replies, media, reports

CREATE TYPE "ReviewType" AS ENUM ('EVENT', 'HOST', 'GUEST');
CREATE TYPE "ReviewModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

ALTER TABLE "host_reviews" ADD COLUMN IF NOT EXISTS "moderation_status" "ReviewModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "host_reviews" ADD COLUMN IF NOT EXISTS "helpful_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "host_reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "guest_reviews" ADD COLUMN IF NOT EXISTS "moderation_status" "ReviewModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "guest_reviews" ADD COLUMN IF NOT EXISTS "helpful_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guest_reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "event_reviews" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "event_reviews" ADD COLUMN IF NOT EXISTS "would_recommend" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_reviews" ADD COLUMN IF NOT EXISTS "moderation_status" "ReviewModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "event_reviews" ADD COLUMN IF NOT EXISTS "helpful_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_reviews" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "host_reviews_moderation_status_idx" ON "host_reviews"("moderation_status");
CREATE INDEX IF NOT EXISTS "guest_reviews_moderation_status_idx" ON "guest_reviews"("moderation_status");
CREATE INDEX IF NOT EXISTS "event_reviews_moderation_status_idx" ON "event_reviews"("moderation_status");

CREATE TABLE IF NOT EXISTS "review_replies" (
    "id" UUID NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "review_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_replies_review_type_review_id_key" ON "review_replies"("review_type", "review_id");
CREATE INDEX IF NOT EXISTS "review_replies_review_type_review_id_idx" ON "review_replies"("review_type", "review_id");

DO $$ BEGIN
    ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_author_id_fkey"
        FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "review_votes" (
    "id" UUID NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_votes_review_type_review_id_user_id_key" ON "review_votes"("review_type", "review_id", "user_id");
CREATE INDEX IF NOT EXISTS "review_votes_review_type_review_id_idx" ON "review_votes"("review_type", "review_id");

DO $$ BEGIN
    ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "review_media" (
    "id" UUID NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "review_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "media_type" TEXT NOT NULL DEFAULT 'image',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_media_review_type_review_id_idx" ON "review_media"("review_type", "review_id");

CREATE TABLE IF NOT EXISTS "review_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "review_type" "ReviewType" NOT NULL,
    "review_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_reports_reporter_id_review_type_review_id_key" ON "review_reports"("reporter_id", "review_type", "review_id");
CREATE INDEX IF NOT EXISTS "review_reports_status_idx" ON "review_reports"("status");
CREATE INDEX IF NOT EXISTS "review_reports_review_type_review_id_idx" ON "review_reports"("review_type", "review_id");

DO $$ BEGIN
    ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_fkey"
        FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
