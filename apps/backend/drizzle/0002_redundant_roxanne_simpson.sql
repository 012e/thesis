CREATE TABLE "user_follows" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
