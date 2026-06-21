import { Injectable, Logger } from "@nestjs/common";
import { PgBossService } from "@wavezync/nestjs-pgboss";
import { and, asc, count, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import {
  posts,
  usersView,
  postReactions,
  recommendationBatches,
  recommendationItems,
  comments,
  postBookmarks,
  postSubscriptions,
} from "@/db/schema";
import {
  upvoteCount,
  downvoteCount,
  commentCount,
  getUserReactionType,
  getCurrentUserSubscribed,
  getCurrentUserBookmarked,
} from "@/posts/posts-query.helpers";
import { PostsPresenterService } from "@/posts/posts-presenter.service";
import type { PostFeedPage } from "@/posts/posts.types";
import { excludesBlockedTags } from "@/tags/tags-query.helpers";

import { RecommendationPipelineService } from "./recommendation-pipeline.service";
import {
  GENERATE_RECOMMENDATIONS_JOB,
  type GenerateRecommendationsJobData,
} from "./recommendation-jobs.service";
import { encodeQueueCursor, decodeQueueCursor } from "./recommendation-cursors";

const GENERATION_THRESHOLD = 20;
const SHUFFLE_BUCKET_SIZE = 4;

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly postsPresenter: PostsPresenterService,
    private readonly pipelineService: RecommendationPipelineService,
    private readonly pgBossService: PgBossService,
  ) {}

  /**
   * Get recommendations for a user, reading from the precomputed queue.
   * Triggers generation if the queue is empty or running low.
   */
  async getRecommendations(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    // Check remaining unserved items
    const remainingCount = await this.getUnservedCount(userId);

    if (remainingCount === 0) {
      // Cold start: generate synchronously for the first page
      await this.pipelineService.generateForUser(userId, "cold_start");
    } else if (remainingCount <= GENERATION_THRESHOLD) {
      // Enqueue background regeneration
      await this.enqueueGeneration(userId, "low_queue");
    }

    // Read from queue
    return this.readFromQueue(userId, limit, cursor);
  }

  /**
   * Read recommendation items from the precomputed queue.
   */
  private async readFromQueue(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<PostFeedPage> {
    const parsed = cursor ? decodeQueueCursor(cursor) : null;

    // Build query for unserved items ordered by rank
    const baseCondition = and(
      eq(recommendationItems.userId, userId),
      isNull(recommendationItems.servedAt),
      excludesBlockedTags(userId, recommendationItems.postId),
    );

    const whereCondition = parsed
      ? and(
          baseCondition,
          or(
            gt(recommendationItems.rank, parsed.rank),
            and(
              eq(recommendationItems.rank, parsed.rank),
              gt(recommendationItems.id, parsed.itemId),
            ),
          ),
        )
      : baseCondition;

    const rows = await this.databaseService.db
      .select({
        itemId: recommendationItems.id,
        postId: recommendationItems.postId,
        rank: recommendationItems.rank,
        score: recommendationItems.score,
      })
      .from(recommendationItems)
      .where(whereCondition)
      .orderBy(asc(recommendationItems.rank), asc(recommendationItems.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);

    const nextCursor =
      hasMore && lastItem
        ? encodeQueueCursor({
            rank: lastItem.rank,
            itemId: lastItem.itemId,
          })
        : null;

    if (items.length === 0) {
      return { items: [], nextCursor: null };
    }

    // Mark items as served
    const itemIds = items.map((i) => i.itemId);
    await this.databaseService.db
      .update(recommendationItems)
      .set({ servedAt: new Date() })
      .where(inArray(recommendationItems.id, itemIds));

    const shuffledItems = this.boundedShuffleItems(items, userId, cursor);

    // Hydrate post data
    const postIds = shuffledItems.map((i) => i.postId);
    const postDtos = await this.hydratePostIds(postIds, userId);

    // Maintain bounded-shuffled serving order
    const postMap = new Map(postDtos.map((p) => [p.id, p]));
    const orderedDtos = shuffledItems
      .map((i) => postMap.get(i.postId))
      .filter((p): p is PostDto => p !== undefined);

    return { items: orderedDtos, nextCursor };
  }

  private boundedShuffleItems<T extends { itemId: string; rank: number }>(
    items: T[],
    userId: string,
    cursor?: string,
  ): T[] {
    if (items.length <= 1) return items;

    const shuffled: T[] = [];
    for (let i = 0; i < items.length; i += SHUFFLE_BUCKET_SIZE) {
      const bucket = items.slice(i, i + SHUFFLE_BUCKET_SIZE);
      shuffled.push(
        ...bucket
          .map((item) => ({
            item,
            key: this.shuffleKey(userId, cursor, item.itemId, item.rank),
          }))
          .sort((a, b) => a.key.localeCompare(b.key))
          .map(({ item }) => item),
      );
    }

    return shuffled;
  }

  private shuffleKey(
    userId: string,
    cursor: string | undefined,
    itemId: string,
    rank: number,
  ): string {
    return createHash("sha256")
      .update(`${userId}:${cursor ?? "first"}:${itemId}:${rank}`)
      .digest("hex");
  }

  /**
   * Hydrate post IDs into full PostDto objects using the same query pattern
   * as the existing posts read service.
   */
  private async hydratePostIds(
    postIds: string[],
    userId: string,
  ): Promise<PostDto[]> {
    if (postIds.length === 0) return [];

    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        kind: posts.kind,
        acceptedCommentId: posts.acceptedCommentId,
        solvedAt: posts.solvedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
          xp: usersView.xp,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: getUserReactionType(userId),
        currentUserSubscribed: getCurrentUserSubscribed(userId),
        currentUserBookmarked: getCurrentUserBookmarked(userId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(
        and(
          inArray(posts.id, postIds),
          eq(posts.hidden, false),
          excludesBlockedTags(userId, posts.id),
        ),
      )
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
        usersView.xp,
      );

    const dtos = rows.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    await this.postsPresenter.hydrateTags(dtos);

    return dtos;
  }

  /**
   * Count unserved recommendation items for a user.
   */
  private async getUnservedCount(userId: string): Promise<number> {
    const [result] = await this.databaseService.db
      .select({ count: count() })
      .from(recommendationItems)
      .where(
        and(
          eq(recommendationItems.userId, userId),
          isNull(recommendationItems.servedAt),
          excludesBlockedTags(userId, recommendationItems.postId),
        ),
      );

    return result?.count ?? 0;
  }

  /**
   * Enqueue a background recommendation generation job.
   * Idempotent: skips if a pending/running job already exists.
   */
  private async enqueueGeneration(
    userId: string,
    trigger: string,
  ): Promise<void> {
    // Check for existing pending/running batches
    const existing = await this.databaseService.db
      .select({ id: recommendationBatches.id })
      .from(recommendationBatches)
      .where(
        and(
          eq(recommendationBatches.userId, userId),
          inArray(recommendationBatches.status, ["pending", "running"]),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      this.logger.debug(
        `Skipping generation enqueue for user ${userId}: pending/running batch exists`,
      );
      return;
    }

    const jobData: GenerateRecommendationsJobData = { userId, trigger };
    await this.pgBossService.scheduleJob(
      GENERATE_RECOMMENDATIONS_JOB,
      jobData,
      {
        singletonKey: `rec-${userId}`,
      },
    );

    this.logger.debug(
      `Enqueued recommendation generation for user ${userId} (trigger: ${trigger})`,
    );
  }

}
