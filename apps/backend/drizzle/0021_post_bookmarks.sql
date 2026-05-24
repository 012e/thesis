CREATE TABLE IF NOT EXISTS "post_bookmarks" (
	"post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_bookmarks_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
