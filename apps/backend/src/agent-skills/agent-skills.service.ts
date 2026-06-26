import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { toSql } from "pgvector";

import { env } from "@/env";

import type {
  AgentSkillDto,
  AgentSkillSearchModeDto,
  AgentSkillSearchResultDto,
} from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import { agentSkills, type AgentSkill } from "@/db/schema";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";

import { DEFAULT_AGENT_SKILLS } from "./default-agent-skills";

const DEFAULT_SEARCH_LIMIT = 20;

interface SkillSearchRow {
  id: string;
  name: string;
  description: string;
  content: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  score: number;
}

@Injectable()
export class AgentSkillsService implements OnModuleInit {
  private readonly logger = new Logger(AgentSkillsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
  ) {}

  /** On startup, backfill any zero-vector embeddings left by the stub service. */
  async onModuleInit() {
    if (!env.OPENAI_API_KEY) {
      this.logger.warn(
        "OPENAI_API_KEY not set — skipping embedding backfill (stub service active)",
      );
      return;
    }
    void this.backfillZeroEmbeddings().catch((err) =>
      this.logger.error(`Startup embedding backfill failed: ${String(err)}`),
    );
  }

  /**
   * List a user's skills, installing the default set the first time they have
   * none. Returns skills ordered by default-first then most recently updated.
   */
  async list(userId: string): Promise<AgentSkillDto[]> {
    await this.ensureDefaultsInstalled(userId);

    const rows = await this.databaseService.db
      .select()
      .from(agentSkills)
      .where(eq(agentSkills.userId, userId))
      .orderBy(desc(agentSkills.isDefault), desc(agentSkills.updatedAt));

    return rows.map((row) => this.toDto(row));
  }

  async create(
    userId: string,
    input: { name: string; description: string; content: string },
  ): Promise<AgentSkillDto> {
    const embedding = await this.embedSkill(input);

    const [created] = await this.databaseService.db
      .insert(agentSkills)
      .values({
        userId,
        name: input.name,
        description: input.description,
        content: input.content,
        embedding,
      })
      .returning();

    return this.toDto(created);
  }

  async update(
    userId: string,
    id: string,
    input: { name?: string; description?: string; content?: string },
  ): Promise<AgentSkillDto | null> {
    const [existing] = await this.databaseService.db
      .select()
      .from(agentSkills)
      .where(and(eq(agentSkills.id, id), eq(agentSkills.userId, userId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const next = {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      content: input.content ?? existing.content,
    };

    // Recompute the embedding only when an embedded field actually changed.
    const embeddingChanged =
      next.name !== existing.name ||
      next.description !== existing.description ||
      next.content !== existing.content;
    const embedding = embeddingChanged
      ? await this.embedSkill(next)
      : existing.embedding;

    const [updated] = await this.databaseService.db
      .update(agentSkills)
      .set({ ...next, embedding, updatedAt: new Date() })
      .where(and(eq(agentSkills.id, id), eq(agentSkills.userId, userId)))
      .returning();

    return updated ? this.toDto(updated) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const deleted = await this.databaseService.db
      .delete(agentSkills)
      .where(and(eq(agentSkills.id, id), eq(agentSkills.userId, userId)))
      .returning({ id: agentSkills.id });

    return deleted.length > 0;
  }

  /**
   * Search a user's skills, either by lexical text relevance (Postgres
   * full-text + ILIKE fallback) or by semantic embedding cosine similarity.
   */
  async search(
    userId: string,
    query: string,
    mode: AgentSkillSearchModeDto = "text",
    limit = DEFAULT_SEARCH_LIMIT,
  ): Promise<{ mode: AgentSkillSearchModeDto; items: AgentSkillSearchResultDto[] }> {
    await this.ensureDefaultsInstalled(userId);

    const items =
      mode === "embedding"
        ? await this.searchByEmbedding(userId, query, limit)
        : await this.searchByText(userId, query, limit);

    return { mode, items };
  }

  private async searchByText(
    userId: string,
    query: string,
    limit: number,
  ): Promise<AgentSkillSearchResultDto[]> {
    const like = `%${query}%`;
    const result = await this.databaseService.db.execute(sql`
      SELECT
        id, name, description, content, is_default, created_at, updated_at,
        ts_rank(
          to_tsvector('english', name || ' ' || description || ' ' || content),
          plainto_tsquery('english', ${query})
        ) AS score
      FROM agent_skills
      WHERE user_id = ${userId}
        AND (
          to_tsvector('english', name || ' ' || description || ' ' || content)
            @@ plainto_tsquery('english', ${query})
          OR name ILIKE ${like}
          OR description ILIKE ${like}
          OR content ILIKE ${like}
        )
      ORDER BY score DESC, updated_at DESC
      LIMIT ${limit}
    `);

    return (result.rows as unknown as SkillSearchRow[]).map((row) =>
      this.searchRowToDto(row),
    );
  }

  private async searchByEmbedding(
    userId: string,
    query: string,
    limit: number,
  ): Promise<AgentSkillSearchResultDto[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const queryVector = toSql(queryEmbedding);

    const rows = await this.databaseService.db
      .select({
        id: agentSkills.id,
        name: agentSkills.name,
        description: agentSkills.description,
        content: agentSkills.content,
        isDefault: agentSkills.isDefault,
        createdAt: agentSkills.createdAt,
        updatedAt: agentSkills.updatedAt,
        score: sql<number>`1 - (${agentSkills.embedding} <=> ${queryVector}::vector)`,
      })
      .from(agentSkills)
      .where(
        and(
          eq(agentSkills.userId, userId),
          sql`${agentSkills.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(asc(sql`${agentSkills.embedding} <=> ${queryVector}::vector`))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      content: row.content,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      // Cosine similarity can be NaN when an embedding has zero magnitude
      // (e.g. the test stub's zero vector); clamp to 0 to stay a valid number.
      score: toFiniteScore(row.score),
    }));
  }

  /** Insert the default skill set for a user that has none yet. */
  private async ensureDefaultsInstalled(userId: string): Promise<void> {
    const [{ count }] = await this.databaseService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentSkills)
      .where(eq(agentSkills.userId, userId));

    if (count === 0) {
      try {
        const values = await Promise.all(
          DEFAULT_AGENT_SKILLS.map(async (skill) => ({
            userId,
            name: skill.name,
            description: skill.description,
            content: skill.content,
            isDefault: true,
            embedding: await this.embedSkill(skill),
          })),
        );

        await this.databaseService.db
          .insert(agentSkills)
          .values(values)
          .onConflictDoNothing();
      } catch (error) {
        // Non-fatal: a concurrent request may have installed defaults first.
        this.logger.warn(
          `Failed to install default agent skills for ${userId}: ${String(error)}`,
        );
      }
      return;
    }

    // Fire-and-forget: re-embed skills that were stored with null or zero-vector
    // embeddings (e.g. when the backend first ran without OPENAI_API_KEY).
    void this.reEmbedMissingEmbeddings(userId).catch((err) =>
      this.logger.warn(
        `Re-embedding failed for user ${userId}: ${String(err)}`,
      ),
    );
  }

  /** Backfills ALL zero-vector/null embeddings across all users at startup. */
  private async backfillZeroEmbeddings(): Promise<void> {
    // Step 1: null out zero vectors written by the stub.
    // Use <#> (negative inner product with itself = -(||v||²)); only zero vectors give 0.
    await this.databaseService.db.execute(sql`
      UPDATE agent_skills
      SET embedding = NULL, updated_at = NOW()
      WHERE embedding IS NOT NULL
        AND (embedding <#> embedding) = 0
    `);

    // Step 2: re-embed everything that now has a NULL embedding.
    const skills = await this.databaseService.db
      .select()
      .from(agentSkills)
      .where(sql`${agentSkills.embedding} IS NULL`);

    if (skills.length === 0) {
      this.logger.log("Embedding backfill: nothing to do");
      return;
    }

    this.logger.log(`Backfilling embeddings for ${skills.length} skill(s)`);

    let fixed = 0;
    await Promise.allSettled(
      skills.map(async (skill) => {
        try {
          const embedding = await this.embedSkill(skill);
          if (!embedding || embedding.every((x) => x === 0)) return;
          await this.databaseService.db
            .update(agentSkills)
            .set({ embedding, updatedAt: new Date() })
            .where(eq(agentSkills.id, skill.id));
          fixed++;
        } catch (error) {
          this.logger.warn(
            `Failed to backfill embedding for skill ${skill.id}: ${String(error)}`,
          );
        }
      }),
    );

    this.logger.log(`Embedding backfill complete: ${fixed}/${skills.length} updated`);
  }

  /**
   * Re-embeds skills whose embedding is NULL or a zero vector (produced by the
   * stub service). Skips gracefully when the embedding service is still a stub.
   */
  private async reEmbedMissingEmbeddings(userId: string): Promise<void> {
    const skills = await this.databaseService.db
      .select()
      .from(agentSkills)
      .where(
        and(
          eq(agentSkills.userId, userId),
          sql`(${agentSkills.embedding} IS NULL OR (${agentSkills.embedding} <#> ${agentSkills.embedding}) = 0)`,
        ),
      );

    if (skills.length === 0) return;

    await Promise.allSettled(
      skills.map(async (skill) => {
        try {
          const embedding = await this.embedSkill(skill);
          if (!embedding || embedding.every((x) => x === 0)) return;
          await this.databaseService.db
            .update(agentSkills)
            .set({ embedding, updatedAt: new Date() })
            .where(eq(agentSkills.id, skill.id));
        } catch (error) {
          this.logger.warn(
            `Failed to re-embed skill ${skill.id}: ${String(error)}`,
          );
        }
      }),
    );
  }

  private async embedSkill(input: {
    name: string;
    description: string;
    content: string;
  }): Promise<number[] | null> {
    const text = `${input.name}\n${input.description}\n${input.content}`.trim();
    if (!text) {
      return null;
    }
    try {
      return await this.embeddingService.embed(text);
    } catch (error) {
      this.logger.warn(`Failed to embed agent skill: ${String(error)}`);
      return null;
    }
  }

  private toDto(row: AgentSkill): AgentSkillDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      content: row.content,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private searchRowToDto(row: SkillSearchRow): AgentSkillSearchResultDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      content: row.content,
      isDefault: row.is_default,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      score: toFiniteScore(row.score),
    };
  }
}

/** Coerce a possibly-NaN/non-finite DB value into a finite number for the DTO. */
function toFiniteScore(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
