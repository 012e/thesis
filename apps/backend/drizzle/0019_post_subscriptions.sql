ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'post_update';
--> statement-breakpoint
CREATE TABLE "post_subscriptions" (
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_subscriptions_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "post_subscriptions" ADD CONSTRAINT "post_subscriptions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "post_subscriptions" ("post_id", "user_id")
SELECT "id", "author_id" FROM "posts"
ON CONFLICT DO NOTHING;
