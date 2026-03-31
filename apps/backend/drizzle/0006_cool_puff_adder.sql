CREATE TABLE "poll_votes" (
	"post_id" uuid NOT NULL,
	"option_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_post_id_option_id_user_id_pk" PRIMARY KEY("post_id","option_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;