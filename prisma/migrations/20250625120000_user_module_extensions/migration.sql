-- User Module extensions: follows, privacy, account settings, connected accounts

CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE "ActivityVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_privacy_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "activity_visibility" "ActivityVisibility" NOT NULL DEFAULT 'FOLLOWERS',
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone" BOOLEAN NOT NULL DEFAULT false,
    "show_last_seen" BOOLEAN NOT NULL DEFAULT true,
    "allow_follow_requests" BOOLEAN NOT NULL DEFAULT true,
    "show_trust_score" BOOLEAN NOT NULL DEFAULT true,
    "show_activity_feed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_account_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connected_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

CREATE UNIQUE INDEX "user_privacy_settings_user_id_key" ON "user_privacy_settings"("user_id");

CREATE UNIQUE INDEX "user_account_settings_user_id_key" ON "user_account_settings"("user_id");

CREATE UNIQUE INDEX "connected_accounts_provider_provider_id_key" ON "connected_accounts"("provider", "provider_id");
CREATE UNIQUE INDEX "connected_accounts_user_id_provider_key" ON "connected_accounts"("user_id", "provider");
CREATE INDEX "connected_accounts_user_id_idx" ON "connected_accounts"("user_id");

ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_account_settings" ADD CONSTRAINT "user_account_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
