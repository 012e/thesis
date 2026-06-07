CREATE TYPE "tag_preference_kind" AS ENUM ('preferred', 'blocked');

CREATE TABLE IF NOT EXISTS "user_tag_preferences" (
  "user_id" text NOT NULL,
  "tag_id" uuid NOT NULL,
  "preference" "tag_preference_kind" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_tag_preferences_user_id_tag_id_pk" PRIMARY KEY ("user_id", "tag_id")
);

ALTER TABLE "user_tag_preferences"
  ADD CONSTRAINT "user_tag_preferences_tag_id_tags_id_fk"
  FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_user_tag_preferences_user_preference"
  ON "user_tag_preferences" ("user_id", "preference");

CREATE INDEX IF NOT EXISTS "idx_user_tag_preferences_tag"
  ON "user_tag_preferences" ("tag_id");
