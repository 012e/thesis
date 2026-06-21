CREATE TYPE "public"."xp_reason" AS ENUM('post_upvote', 'comment_upvote', 'answer_accepted');--> statement-breakpoint
CREATE TABLE "user_xp" (
	"user_id" text PRIMARY KEY NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"reason" "xp_reason" NOT NULL,
	"source_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_ledger_award_unique" UNIQUE("reason","source_id","actor_id")
);
--> statement-breakpoint
DROP VIEW "public"."users_view";--> statement-breakpoint
CREATE INDEX "idx_xp_ledger_user_created" ON "xp_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE VIEW "public"."users_view" AS (SELECT u.id, u.username, u.email, u.name, up.avatar_url AS image, COALESCE(ux.total, 0) AS xp FROM "user" u LEFT JOIN user_profiles up ON up.user_id = u.id LEFT JOIN user_xp ux ON ux.user_id = u.id);