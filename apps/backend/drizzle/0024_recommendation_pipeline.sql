-- Recommendation pipeline tables

CREATE TYPE "public"."recommendation_batch_status" AS ENUM('pending', 'running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS "user_recommendation_profiles" (
  "user_id" text PRIMARY KEY NOT NULL,
  "vector" vector(1536),
  "event_count" integer NOT NULL DEFAULT 0,
  "last_generated_at" timestamp with time zone,
  "source_window_start" timestamp with time zone,
  "source_window_end" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "recommendation_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "status" "recommendation_batch_status" DEFAULT 'pending' NOT NULL,
  "trigger" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "error" text
);

CREATE TABLE IF NOT EXISTS "recommendation_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "recommendation_batches"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "rank" integer NOT NULL,
  "score" double precision NOT NULL,
  "filter_reasons" jsonb,
  "served_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_recommendation_items_user_unserved"
  ON "recommendation_items" ("user_id", "served_at", "rank");

CREATE INDEX IF NOT EXISTS "idx_recommendation_items_user_post"
  ON "recommendation_items" ("user_id", "post_id");
