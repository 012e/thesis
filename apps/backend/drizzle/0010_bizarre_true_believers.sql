DROP VIEW "public"."users_view";--> statement-breakpoint
CREATE VIEW "public"."users_view" AS (SELECT id, username, email, name, image FROM "user");