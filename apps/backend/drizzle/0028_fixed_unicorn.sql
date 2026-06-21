CREATE TYPE "public"."post_kind" AS ENUM('discussion', 'question');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'answer_accepted';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "kind" "post_kind" DEFAULT 'discussion' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "accepted_comment_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "solved_at" timestamp with time zone;
