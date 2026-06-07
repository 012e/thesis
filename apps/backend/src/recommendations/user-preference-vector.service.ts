import { Injectable, Logger } from "@nestjs/common";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import type { AnalyticsEvent } from "@/db/schema";
import {
  analyticsEvents,
  posts,
  userRecommendationProfiles,
  EMBEDDING_DIMENSIONS,
} from "@/db/schema";

/**
 * Weights for different analytics event types when building user preference vectors.
 * Positive weights attract the user vector toward post embeddings.
 * Negative weights repel it.
 */
const RECOMMENDATION_EVENT_TYPES = [
  "post_view",
  "poll_vote",
  "post_share",
  "comment_create",
  "post_like",
  "post_bookmark",
  "post_unlike",
  "post_unbookmark",
] as const satisfies readonly AnalyticsEvent["type"][];

const EVENT_WEIGHTS: Record<
  (typeof RECOMMENDATION_EVENT_TYPES)[number],
  number
> = {
  post_view: 1,
  poll_vote: 2,
  post_share: 3,
  comment_create: 4,
  post_like: 4,
  post_bookmark: 5,
  post_unlike: -2,
  post_unbookmark: -3,
};

/** Minimum number of weighted events to produce a usable vector. */
const MIN_EVENTS_FOR_VECTOR = 3;

@Injectable()
export class UserPreferenceVectorService {
  private readonly logger = new Logger(UserPreferenceVectorService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Rebuild the user's preference vector from recent analytics events.
   * Returns true if a usable vector was produced, false for cold-start users.
   */
  async buildUserVector(userId: string): Promise<boolean> {
    const now = new Date();
    // Use a 30-day window for analytics events
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch weighted post embeddings from analytics events
    const rows = await this.databaseService.db
      .select({
        embedding: posts.embedding,
        eventType: analyticsEvents.type,
      })
      .from(analyticsEvents)
      .innerJoin(
        posts,
        eq(sql`${analyticsEvents.metadata}->>'postId'`, sql`${posts.id}::text`),
      )
      .where(
        and(
          eq(analyticsEvents.userId, userId),
          gte(analyticsEvents.createdAt, windowStart),
          isNotNull(posts.embedding),
          inArray(analyticsEvents.type, RECOMMENDATION_EVENT_TYPES),
        ),
      );

    if (rows.length < MIN_EVENTS_FOR_VECTOR) {
      this.logger.debug(
        `User ${userId} has ${rows.length} events (< ${MIN_EVENTS_FOR_VECTOR}), skipping vector build`,
      );

      // Upsert profile with zero vector count so we know we tried
      await this.databaseService.db
        .insert(userRecommendationProfiles)
        .values({
          userId,
          vector: null,
          eventCount: rows.length,
          lastGeneratedAt: now,
          sourceWindowStart: windowStart,
          sourceWindowEnd: now,
        })
        .onConflictDoUpdate({
          target: userRecommendationProfiles.userId,
          set: {
            vector: null,
            eventCount: rows.length,
            lastGeneratedAt: now,
            sourceWindowStart: windowStart,
            sourceWindowEnd: now,
          },
        });

      return false;
    }

    // Compute weighted average of post embeddings
    const dims = EMBEDDING_DIMENSIONS;
    const accumulated = new Float64Array(dims);
    let totalWeight = 0;

    for (const row of rows) {
      if (!row.embedding) continue;
      const weight = EVENT_WEIGHTS[row.eventType] ?? 0;
      if (weight === 0) continue;

      // Parse the embedding string "[0.1,0.2,...]" into numbers
      const embeddingValues = this.parseEmbedding(row.embedding);
      if (!embeddingValues || embeddingValues.length !== dims) continue;

      for (let i = 0; i < dims; i++) {
        accumulated[i] += embeddingValues[i] * weight;
      }
      totalWeight += Math.abs(weight);
    }

    if (totalWeight === 0) {
      return false;
    }

    // Normalize to unit vector
    const result = new Array<number>(dims);
    let magnitude = 0;
    for (let i = 0; i < dims; i++) {
      result[i] = accumulated[i] / totalWeight;
      magnitude += result[i] * result[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
      for (let i = 0; i < dims; i++) {
        result[i] /= magnitude;
      }
    }

    // Drizzle's vector column encoder expects number[] and serializes it for pgvector.
    await this.databaseService.db
      .insert(userRecommendationProfiles)
      .values({
        userId,
        vector: result,
        eventCount: rows.length,
        lastGeneratedAt: now,
        sourceWindowStart: windowStart,
        sourceWindowEnd: now,
      })
      .onConflictDoUpdate({
        target: userRecommendationProfiles.userId,
        set: {
          vector: result,
          eventCount: rows.length,
          lastGeneratedAt: now,
          sourceWindowStart: windowStart,
          sourceWindowEnd: now,
        },
      });

    this.logger.debug(
      `Built preference vector for user ${userId} from ${rows.length} events`,
    );

    return true;
  }

  /**
   * Get the user's current preference vector, or null if not available.
   */
  async getUserVector(userId: string): Promise<number[] | null> {
    const rows = await this.databaseService.db
      .select({ vector: userRecommendationProfiles.vector })
      .from(userRecommendationProfiles)
      .where(eq(userRecommendationProfiles.userId, userId))
      .limit(1);

    const row = rows[0];
    if (!row?.vector) return null;
    return this.parseEmbedding(row.vector);
  }

  private parseEmbedding(raw: unknown): number[] | null {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return parsed as number[];
      } catch {
        return null;
      }
    }
    if (Array.isArray(raw)) return raw as number[];
    return null;
  }
}
