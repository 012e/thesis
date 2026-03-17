CREATE TYPE "public"."reaction_type" AS ENUM('upvote', 'downvote');

CREATE TABLE "post_reactions" (
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reactions_pkey" PRIMARY KEY("post_id","user_id"),
	CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
);
