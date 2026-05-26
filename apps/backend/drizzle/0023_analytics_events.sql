DO $$ BEGIN
  CREATE TYPE "public"."analytics_event_type" AS ENUM(
    'post_view',
    'post_like',
    'post_unlike',
    'post_bookmark',
    'post_unbookmark',
    'comment_create',
    'comment_like',
    'post_share',
    'post_create',
    'poll_vote',
    'search',
    'page_view'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "type" "analytics_event_type" NOT NULL,
  "metadata" jsonb,
  "client_timestamp" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_user_id" ON "analytics_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_type" ON "analytics_events" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analytics_events_created_at" ON "analytics_events" USING btree ("created_at");
