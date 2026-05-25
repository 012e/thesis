-- Tags table
CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "post_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Post-Tags join table
CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "author_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);

-- Tag daily stats table
CREATE TABLE IF NOT EXISTS "tag_daily_stats" (
  "tag_id" uuid NOT NULL,
  "day" date NOT NULL,
  "post_count" integer NOT NULL DEFAULT 0,
  CONSTRAINT "tag_daily_stats_tag_id_day_pk" PRIMARY KEY("tag_id","day")
);

-- Foreign keys
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tag_daily_stats" ADD CONSTRAINT "tag_daily_stats_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indexes for tag timelines and post hydration
CREATE INDEX IF NOT EXISTS "idx_post_tags_tag_timeline" ON "post_tags" ("tag_id","created_at","post_id");
CREATE INDEX IF NOT EXISTS "idx_post_tags_post" ON "post_tags" ("post_id");
