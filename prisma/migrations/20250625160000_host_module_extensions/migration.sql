-- Host module extensions

CREATE TYPE "HostAccountStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'DELETED');
CREATE TYPE "HostBadgeType" AS ENUM ('VERIFIED_HOST', 'TOP_HOST', 'SUPER_HOST', 'NEW_HOST', 'COMMUNITY_HOST');
CREATE TYPE "HostMediaType" AS ENUM ('AVATAR', 'COVER', 'GALLERY');
CREATE TYPE "HostDocumentType" AS ENUM ('IDENTITY_PROOF', 'ADDRESS_PROOF', 'OTHER');

ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "hosting_experience" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "profile_image" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "cover_image" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "account_status" "HostAccountStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact_name" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "linkedin" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "twitter" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "preferences_json" JSONB;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "availability_json" JSONB;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "host_profiles" ADD COLUMN IF NOT EXISTS "followers_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "host_profiles" SET "slug" = LOWER(REPLACE("display_name", ' ', '-')) || '-' || SUBSTRING("id"::text, 1, 8) WHERE "slug" IS NULL;
ALTER TABLE "host_profiles" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "host_profiles_slug_key" ON "host_profiles"("slug");
CREATE INDEX IF NOT EXISTS "host_profiles_account_status_idx" ON "host_profiles"("account_status");
CREATE INDEX IF NOT EXISTS "host_profiles_slug_idx" ON "host_profiles"("slug");

ALTER TABLE "host_analytics" ADD COLUMN IF NOT EXISTS "upcoming_events" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "host_analytics" ADD COLUMN IF NOT EXISTS "completed_events" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "host_analytics" ADD COLUMN IF NOT EXISTS "followers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "host_analytics" ADD COLUMN IF NOT EXISTS "response_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE TABLE "host_badges" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "badge_type" "HostBadgeType" NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_badges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "host_badges_host_id_badge_type_key" ON "host_badges"("host_id", "badge_type");
CREATE INDEX "host_badges_host_id_idx" ON "host_badges"("host_id");

CREATE TABLE "host_media" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "media_type" "HostMediaType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "host_media_host_id_idx" ON "host_media"("host_id");
CREATE INDEX "host_media_media_type_idx" ON "host_media"("media_type");

CREATE TABLE "host_documents" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "document_type" "HostDocumentType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT,
    "mime" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "host_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "host_documents_host_id_idx" ON "host_documents"("host_id");

CREATE TABLE "host_activities" (
    "id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "host_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "host_activities_host_id_idx" ON "host_activities"("host_id");
CREATE INDEX "host_activities_created_at_idx" ON "host_activities"("created_at");

ALTER TABLE "host_badges" ADD CONSTRAINT "host_badges_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_media" ADD CONSTRAINT "host_media_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_documents" ADD CONSTRAINT "host_documents_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "host_activities" ADD CONSTRAINT "host_activities_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "host_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
