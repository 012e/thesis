import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  inArray,
  sql,
  asc,
} from "drizzle-orm";
import { toSql } from "pgvector";

import { DatabaseService } from "@/db/database.service";
import {
  posts,
  recommendationBatches,
  recommendationItems,
  tags,
  userTagPreferences,
} from "@/db/schema";
import { excludesBlockedTags } from "@/tags/tags-query.helpers";

import {
  RECOMMENDATION_FILTERS,
  type RecommendationFilter,
  type RecommendationFilterInput,
} from "./filters";
import { UserPreferenceVectorService } from "./user-preference-vector.service";

const DEFAULT_CANDIDATE_LIMIT = 500;
const DEFAULT_OUTPUT_LIMIT = 100;
const RRF_K = 60;

@Injectable()
export class RecommendationPipelineService {
  private readonly logger = new Logger(RecommendationPipelineService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userPreferenceVectorService: UserPreferenceVectorService,
    @Inject(RECOMMENDATION_FILTERS)
    private readonly filters: RecommendationFilter[],
  ) {}

  /**
   * Run the full recommendation pipeline for a user:
   * 1. Build/refresh user preference vector
   * 2. Fetch candidates
   * 3. Apply filters
   * 4. Rank by cosine similarity (or recency fallback)
   * 5. Persist to recommendation_items
   */
  async generateForUser(
    userId: string,
    trigger: string = "manual",
  ): Promise<string> {
    // Create batch record
    const [batch] = await this.databaseService.db
      .insert(recommendationBatches)
      .values({
        userId,
        status: "running",
        trigger,
      })
      .returning({ id: recommendationBatches.id });

    try {
      // Step 1: Build user vector
      const hasVector =
        await this.userPreferenceVectorService.buildUserVector(userId);
      const userVector = hasVector
        ? await this.userPreferenceVectorService.getUserVector(userId)
        : null;

      // Step 2: Fetch candidates
      const candidatePostIds = await this.fetchCandidates(userId);

      if (candidatePostIds.length === 0) {
        await this.completeBatch(batch.id, "completed");
        return batch.id;
      }

      // Step 3: Apply filters
      const filteredIds = await this.applyFilters(
        userId,
        candidatePostIds,
        userVector,
        batch.id,
        trigger,
      );

      if (filteredIds.length === 0) {
        await this.completeBatch(batch.id, "completed");
        return batch.id;
      }

      // Step 4: Rank candidates
      const ranked = await this.rankCandidates(userId, filteredIds, userVector);

      // Step 5: Persist items
      const itemsToInsert = ranked
        .slice(0, DEFAULT_OUTPUT_LIMIT)
        .map((item, index) => ({
          batchId: batch.id,
          userId,
          postId: item.postId,
          rank: index + 1,
          score: item.score,
        }));

      if (itemsToInsert.length > 0) {
        await this.databaseService.db
          .insert(recommendationItems)
          .values(itemsToInsert);
      }

      await this.completeBatch(batch.id, "completed");

      this.logger.log(
        `Generated ${itemsToInsert.length} recommendations for user ${userId}`,
      );

      return batch.id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.completeBatch(batch.id, "failed", errorMsg);
      throw error;
    }
  }

  /**
   * Fetch candidate post IDs: recent visible posts,
   * excluding the user's own posts.
   * Embeddings are NOT required here – posts without embeddings are still
   * valid candidates for the recency-based cold-start fallback.
   */
  private async fetchCandidates(userId: string): Promise<string[]> {
    const rows = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.hidden, false),
          sql`${posts.authorId} != ${userId}`,
          excludesBlockedTags(userId, posts.id),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(DEFAULT_CANDIDATE_LIMIT);

    return rows.map((r) => r.id);
  }

  /**
   * Apply all registered filters sequentially.
   */
  private async applyFilters(
    userId: string,
    candidatePostIds: string[],
    profileVector: number[] | null,
    batchId: string,
    trigger: string,
  ): Promise<string[]> {
    let currentIds = candidatePostIds;

    for (const filter of this.filters) {
      if (currentIds.length === 0) break;

      const input: RecommendationFilterInput = {
        userId,
        candidatePostIds: currentIds,
        profileVector,
        context: { batchId, trigger },
      };

      const beforeCount = currentIds.length;
      const result = await filter.apply(input);
      currentIds = result.keptPostIds;

      this.logger.debug(
        `Filter "${filter.name}": ${beforeCount} → ${currentIds.length}`,
      );
    }

    return currentIds;
  }

  /**
   * Rank candidates by cosine similarity to user vector.
   * Falls back to recency + engagement for cold-start users.
   */
  private async rankCandidates(
    userId: string,
    postIds: string[],
    userVector: number[] | null,
  ): Promise<{ postId: string; score: number }[]> {
    if (postIds.length === 0) return [];

    const preferredTagQuery = await this.getPreferredTagSearchQuery(userId);

    if (preferredTagQuery) {
      return userVector
        ? this.rankByHybridPreferredTagAndVector(
            postIds,
            preferredTagQuery,
            userVector,
          )
        : this.rankByHybridPreferredTagAndRecency(postIds, preferredTagQuery);
    }

    return userVector
      ? await this.rankByVectorSimilarity(postIds, userVector)
      : await this.rankByRecency(postIds);
  }

  private async rankByHybridPreferredTagAndVector(
    postIds: string[],
    preferredTagQuery: string,
    userVector: number[],
  ): Promise<{ postId: string; score: number }[]> {
    const queryVector = toSql(userVector);
    const postIdArray = this.toUuidArraySql(postIds);

    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY paradedb.score(id) DESC) AS bm25_rank
        FROM posts
        WHERE id = ANY(${postIdArray})
          AND id @@@ paradedb.match('content.text', ${preferredTagQuery})
        LIMIT ${DEFAULT_CANDIDATE_LIMIT}
      ),
      vec AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> ${queryVector}::vector ASC) AS vec_rank
        FROM posts
        WHERE id = ANY(${postIdArray})
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${queryVector}::vector
        LIMIT ${DEFAULT_CANDIDATE_LIMIT}
      ),
      rrf AS (
        SELECT
          COALESCE(bm25.id, vec.id) AS post_id,
          (COALESCE(1.0 / (${RRF_K} + bm25.bm25_rank), 0) +
           COALESCE(1.0 / (${RRF_K} + vec.vec_rank),  0)) AS score
        FROM bm25
        FULL OUTER JOIN vec ON bm25.id = vec.id
      )
      SELECT post_id, score
      FROM rrf
      WHERE post_id IS NOT NULL
      ORDER BY score DESC, post_id ASC
    `);

    return this.mapRankRows(result.rows);
  }

  private async rankByHybridPreferredTagAndRecency(
    postIds: string[],
    preferredTagQuery: string,
  ): Promise<{ postId: string; score: number }[]> {
    const postIdArray = this.toUuidArraySql(postIds);

    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY paradedb.score(id) DESC) AS bm25_rank
        FROM posts
        WHERE id = ANY(${postIdArray})
          AND id @@@ paradedb.match('content.text', ${preferredTagQuery})
        LIMIT ${DEFAULT_CANDIDATE_LIMIT}
      ),
      recent AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS recent_rank
        FROM posts
        WHERE id = ANY(${postIdArray})
        ORDER BY created_at DESC
        LIMIT ${DEFAULT_CANDIDATE_LIMIT}
      ),
      rrf AS (
        SELECT
          COALESCE(bm25.id, recent.id) AS post_id,
          (COALESCE(1.0 / (${RRF_K} + bm25.bm25_rank), 0) +
           COALESCE(1.0 / (${RRF_K} + recent.recent_rank), 0)) AS score
        FROM bm25
        FULL OUTER JOIN recent ON bm25.id = recent.id
      )
      SELECT post_id, score
      FROM rrf
      WHERE post_id IS NOT NULL
      ORDER BY score DESC, post_id ASC
    `);

    return this.mapRankRows(result.rows);
  }

  /**
   * Rank by cosine similarity between post embeddings and user vector.
   */
  private async rankByVectorSimilarity(
    postIds: string[],
    userVector: number[],
  ): Promise<{ postId: string; score: number }[]> {
    const queryVector = toSql(userVector);

    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        similarity: sql<number>`1 - (${posts.embedding} <=> ${queryVector}::vector)`,
      })
      .from(posts)
      .where(and(inArray(posts.id, postIds), isNotNull(posts.embedding)))
      .orderBy(
        asc(sql`${posts.embedding} <=> ${queryVector}::vector`),
        desc(posts.createdAt),
      );

    return rows.map((r) => ({
      postId: r.id,
      score: Number(r.similarity) || 0,
    }));
  }

  /**
   * Fallback ranking for cold-start users: order by recency.
   */
  private async rankByRecency(
    postIds: string[],
  ): Promise<{ postId: string; score: number }[]> {
    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(inArray(posts.id, postIds))
      .orderBy(desc(posts.createdAt));

    // Score by position (1.0 for most recent, decaying)
    return rows.map((r, index) => ({
      postId: r.id,
      score: 1.0 / (1 + index * 0.1),
    }));
  }

  private async getPreferredTagSearchQuery(
    userId: string,
  ): Promise<string | null> {
    const rows = await this.databaseService.db
      .select({ slug: tags.slug, displayName: tags.displayName })
      .from(userTagPreferences)
      .innerJoin(tags, eq(tags.id, userTagPreferences.tagId))
      .where(
        and(
          eq(userTagPreferences.userId, userId),
          eq(userTagPreferences.preference, "preferred"),
        ),
      )
      .orderBy(desc(userTagPreferences.updatedAt), asc(tags.slug))
      .limit(20);

    const terms = new Set<string>();

    for (const row of rows) {
      this.addSearchTerms(terms, row.slug);
      this.addSearchTerms(terms, row.displayName);
    }

    return terms.size > 0 ? [...terms].join(" ") : null;
  }

  private addSearchTerms(terms: Set<string>, value: string): void {
    for (const term of value.toLowerCase().split(/[^a-z0-9]+/)) {
      if (term.length > 1) terms.add(term);
    }
  }

  private toUuidArraySql(postIds: string[]) {
    return sql`ARRAY[${sql.join(
      postIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}]::uuid[]`;
  }

  private mapRankRows(
    rows: { [column: string]: unknown }[],
  ): { postId: string; score: number }[] {
    return rows.map((row) => ({
      postId: row["post_id"] as string,
      score: Number(row["score"]) || 0,
    }));
  }

  private async completeBatch(
    batchId: string,
    status: "completed" | "failed",
    error?: string,
  ): Promise<void> {
    await this.databaseService.db
      .update(recommendationBatches)
      .set({
        status,
        completedAt: new Date(),
        error: error ?? null,
      })
      .where(eq(recommendationBatches.id, batchId));
  }
}
