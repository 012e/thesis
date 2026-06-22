CREATE TABLE "agent_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_agent_skills_user_name" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE INDEX "idx_agent_skills_user" ON "agent_skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_skills_embedding_hnsw_idx"
  ON "agent_skills"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);