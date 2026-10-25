-- KYC module extensions: statuses, document types, verification reviews

ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'RESUBMITTED';
ALTER TYPE "VerificationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TYPE "VerificationType" ADD VALUE IF NOT EXISTS 'VOTER_ID';
ALTER TYPE "VerificationType" ADD VALUE IF NOT EXISTS 'PAN_CARD';
ALTER TYPE "VerificationType" ADD VALUE IF NOT EXISTS 'INTERNATIONAL_ID';

ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'VOTER_ID';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PAN_CARD';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'INTERNATIONAL_ID';

CREATE TABLE "verification_reviews" (
    "id" UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_reviews_verification_id_idx" ON "verification_reviews"("verification_id");
CREATE INDEX "verification_reviews_reviewer_id_idx" ON "verification_reviews"("reviewer_id");

ALTER TABLE "verification_reviews" ADD CONSTRAINT "verification_reviews_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_reviews" ADD CONSTRAINT "verification_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
