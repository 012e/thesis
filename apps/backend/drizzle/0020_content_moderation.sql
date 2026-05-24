-- Custom SQL migration file for content moderation tables

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected', 'needs_human_review');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."moderation_source" AS ENUM('auto_duplicate', 'auto_harmful', 'user_report', 'admin_flag');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."flag_priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."report_reason" AS ENUM('spam', 'harassment', 'misinformation', 'hate_speech', 'violence', 'inappropriate', 'copyright', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add content_hash and hidden columns to posts
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content_hash" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;

-- Post moderation table
CREATE TABLE IF NOT EXISTS "post_moderation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "source" "moderation_source" NOT NULL,
  "status" "moderation_status" DEFAULT 'pending' NOT NULL,
  "priority" "flag_priority" DEFAULT 'medium' NOT NULL,
  "llm_confidence" text,
  "llm_summary" text,
  "similar_post_id" uuid,
  "similarity_score" text,
  "moderation_result" jsonb,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "review_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "post_moderation" DROP CONSTRAINT IF EXISTS "post_moderation_post_id_posts_id_fk";
ALTER TABLE "post_moderation" ADD CONSTRAINT "post_moderation_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

-- Post reports table
CREATE TABLE IF NOT EXISTS "post_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" "report_reason" NOT NULL,
  "description" text,
  "passed_heuristic" boolean DEFAULT true NOT NULL,
  "moderation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_post_id_posts_id_fk";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "post_reports" DROP CONSTRAINT IF EXISTS "post_reports_moderation_id_post_moderation_id_fk";
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_moderation_id_post_moderation_id_fk" FOREIGN KEY ("moderation_id") REFERENCES "public"."post_moderation"("id") ON DELETE set null ON UPDATE no action;

-- Post flags table
CREATE TABLE IF NOT EXISTS "post_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "flagged_by" text NOT NULL,
  "priority" "flag_priority" DEFAULT 'medium' NOT NULL,
  "reason" text,
  "moderation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "post_flags" DROP CONSTRAINT IF EXISTS "post_flags_post_id_posts_id_fk";
ALTER TABLE "post_flags" ADD CONSTRAINT "post_flags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "post_flags" DROP CONSTRAINT IF EXISTS "post_flags_moderation_id_post_moderation_id_fk";
ALTER TABLE "post_flags" ADD CONSTRAINT "post_flags_moderation_id_post_moderation_id_fk" FOREIGN KEY ("moderation_id") REFERENCES "public"."post_moderation"("id") ON DELETE set null ON UPDATE no action;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS "idx_post_moderation_post_id" ON "post_moderation" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_moderation_status" ON "post_moderation" ("status");
CREATE INDEX IF NOT EXISTS "idx_post_moderation_source" ON "post_moderation" ("source");
CREATE INDEX IF NOT EXISTS "idx_post_reports_post_id" ON "post_reports" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_flags_post_id" ON "post_flags" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_posts_content_hash" ON "posts" ("content_hash");
CREATE INDEX IF NOT EXISTS "idx_posts_hidden" ON "posts" ("hidden");
