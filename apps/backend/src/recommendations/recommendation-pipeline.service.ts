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
  postTags,
  posts,
  recommendationBatches,
  recommendationItems,
  userTagPreferences,
} from "@/db/schema";

import {
  RECOMMENDATION_FILTERS,
  type RecommendationFilter,
  type RecommendationFilterInput,
} from "./filters";
import { UserPreferenceVectorService } from "./user-preference-vector.service";

const DEFAULT_CANDIDATE_LIMIT = 500;
const DEFAULT_OUTPUT_LIMIT = 100;

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
          this.excludesBlockedTags(userId),
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

    const ranked = userVector
      ? await this.rankByVectorSimilarity(postIds, userVector)
      : await this.rankByRecency(postIds);

    return this.applyPreferredTagBoost(userId, ranked);
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

  private async applyPreferredTagBoost(
    userId: string,
    ranked: { postId: string; score: number }[],
  ): Promise<{ postId: string; score: number }[]> {
    if (ranked.length === 0) return ranked;

    const preferredPostIds = await this.getPostsWithPreference(
      userId,
      ranked.map((item) => item.postId),
      "preferred",
    );

    if (preferredPostIds.size === 0) return ranked;

    return ranked
      .map((item) => ({
        postId: item.postId,
        score: item.score + (preferredPostIds.has(item.postId) ? 0.2 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.postId.localeCompare(b.postId));
  }

  private async getPostsWithPreference(
    userId: string,
    postIds: string[],
    preference: "preferred" | "blocked",
  ): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();

    const rows = await this.databaseService.db
      .select({ postId: postTags.postId })
      .from(postTags)
      .innerJoin(userTagPreferences, eq(userTagPreferences.tagId, postTags.tagId))
      .where(
        and(
          inArray(postTags.postId, postIds),
          eq(userTagPreferences.userId, userId),
          eq(userTagPreferences.preference, preference),
        ),
      );

    return new Set(rows.map((row) => row.postId));
  }

  private excludesBlockedTags(userId: string) {
    return sql<boolean>`NOT EXISTS (
      SELECT 1 FROM ${postTags}
      INNER JOIN ${userTagPreferences}
        ON ${userTagPreferences.tagId} = ${postTags.tagId}
      WHERE ${postTags.postId} = ${posts.id}
        AND ${userTagPreferences.userId} = ${userId}
        AND ${userTagPreferences.preference} = 'blocked'
    )`;
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
