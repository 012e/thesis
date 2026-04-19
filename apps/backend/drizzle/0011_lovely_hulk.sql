CREATE TABLE "user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"avatar_url" text
);
--> statement-breakpoint
DROP VIEW "public"."users_view";--> statement-breakpoint
CREATE VIEW "public"."users_view" AS (SELECT u.id, u.username, u.email, u.name, up.avatar_url AS image FROM "user" u LEFT JOIN user_profiles up ON up.user_id = u.id);