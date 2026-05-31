import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import type { PostDto, ReactionTypeDto } from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import {
  postBookmarks,
  postReactions,
  posts,
  userFollows,
  usersView,
} from "@/db/schema";

import {
  decodeCreatedAtCursor,
  decodeRecommendationCursor,
  encodeCreatedAtCursor,
  encodeRecommendationCursor,
} from "./posts-cursors";
import {
  commentCount,
  downvoteCount,
  getCurrentUserBookmarked,
  getCurrentUserSubscribed,
  getUserReactionType,
  upvoteCount,
} from "./posts-query.helpers";
import { PostsPresenterService } from "./posts-presenter.service";
import type { PostFeedPage } from "./posts.types";

@Injectable()
export class PostsReadService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly postsPresenter: PostsPresenterService,
  ) {}

  async listByUser(
    authorId: string,
    requestingUserId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    const parsed = cursor
      ? decodeCreatedAtCursor(cursor, { throwOnInvalidDate: true })
      : null;
    const cursorDate = parsed ? new Date(parsed.createdAt) : null;
    const createdAtCursorValue = sql<Date>`date_trunc('milliseconds', ${posts.createdAt})`;

    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: getUserReactionType(requestingUserId),
        currentUserSubscribed: getCurrentUserSubscribed(requestingUserId),
        currentUserBookmarked: getCurrentUserBookmarked(requestingUserId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(
        cursorDate && parsed
          ? and(
              eq(posts.authorId, authorId),
              eq(posts.hidden, false),
              or(
                lt(createdAtCursorValue, cursorDate),
                and(
                  eq(createdAtCursorValue, cursorDate),
                  gt(posts.id, parsed.postId),
                ),
              ),
            )
          : and(eq(posts.authorId, authorId), eq(posts.hidden, false)),
      )
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(createdAtCursorValue), asc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? encodeCreatedAtCursor({
            createdAt: lastItem.createdAt.toISOString(),
            postId: lastItem.id,
          })
        : null;

    const dtos = items.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    await this.postsPresenter.hydrateTags(dtos);

    return { items: dtos, nextCursor };
  }

  async list(userId: string): Promise<PostDto[]> {
    const rows = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
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
      .where(eq(posts.hidden, false))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(posts.createdAt));

    const dtos = rows.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    return this.postsPresenter.hydrateTags(dtos);
  }

  async listByFollowing(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    const parsed = cursor
      ? decodeCreatedAtCursor(cursor, { throwOnInvalidDate: true })
      : null;
    const cursorDate = parsed ? new Date(parsed.createdAt) : null;
    const createdAtCursorValue = sql<Date>`date_trunc('milliseconds', ${posts.createdAt})`;

    const query = this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: getUserReactionType(userId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .innerJoin(
        userFollows,
        and(
          eq(userFollows.followeeId, posts.authorId),
          eq(userFollows.followerId, userId),
        ),
      )
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(
        cursorDate && parsed
          ? and(
              eq(posts.hidden, false),
              or(
                lt(createdAtCursorValue, cursorDate),
                and(
                  eq(createdAtCursorValue, cursorDate),
                  gt(posts.id, parsed.postId),
                ),
              ),
            )
          : eq(posts.hidden, false),
      )
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      );

    const rows = await query
      .orderBy(desc(createdAtCursorValue), asc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? encodeCreatedAtCursor({
            createdAt: lastItem.createdAt.toISOString(),
            postId: lastItem.id,
          })
        : null;

    const followingDtos = items.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    await this.postsPresenter.hydrateTags(followingDtos);

    return { items: followingDtos, nextCursor };
  }

  async getById(id: string, userId?: string): Promise<PostDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: userId
          ? getUserReactionType(userId)
          : sql<string | null>`NULL`,
        currentUserSubscribed: userId
          ? getCurrentUserSubscribed(userId)
          : sql<boolean>`false`,
        currentUserBookmarked: userId
          ? getCurrentUserBookmarked(userId)
          : sql<boolean>`false`,
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(and(eq(posts.id, id), eq(posts.hidden, false)))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    if (!row) return null;

    const dto = this.postsPresenter.toDto(
      row,
      row.userReactionType as ReactionTypeDto | null,
    );
    await this.postsPresenter.hydrateTags([dto]);
    return dto;
  }

  async recommendations(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    const parsed = cursor ? decodeRecommendationCursor(cursor) : null;
    const reactionCount = count(postReactions.postId).as("reaction_count");

    let query = this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        reactionCount,
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
      .where(eq(posts.hidden, false))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .$dynamic();

    if (parsed) {
      query = query.having(
        or(
          sql`count(${postReactions.postId}) < ${parsed.reactionCount}`,
          and(
            sql`count(${postReactions.postId}) = ${parsed.reactionCount}`,
            sql`${posts.id} > ${parsed.postId}`,
          ),
        ),
      );
    }

    const rows = await query
      .orderBy(desc(reactionCount), asc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? encodeRecommendationCursor({
            reactionCount: lastItem.reactionCount,
            postId: lastItem.id,
          })
        : null;

    const recDtos = items.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    await this.postsPresenter.hydrateTags(recDtos);

    return { items: recDtos, nextCursor };
  }

  async listBookmarks(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PostFeedPage> {
    const parsed = cursor ? decodeCreatedAtCursor(cursor) : null;
    const cursorDate = parsed ? new Date(parsed.createdAt) : null;
    const bookmarkedAtCursorValue = sql<Date>`date_trunc('milliseconds', ${postBookmarks.createdAt})`;

    const query = this.databaseService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        author: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
        upvoteCount,
        downvoteCount,
        commentCount,
        userReactionType: getUserReactionType(userId),
        currentUserSubscribed: getCurrentUserSubscribed(userId),
        currentUserBookmarked: getCurrentUserBookmarked(userId),
        bookmarkedAt: postBookmarks.createdAt,
      })
      .from(postBookmarks)
      .innerJoin(posts, eq(postBookmarks.postId, posts.id))
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(
        cursorDate && parsed
          ? and(
              eq(postBookmarks.userId, userId),
              eq(posts.hidden, false),
              or(
                lt(bookmarkedAtCursorValue, cursorDate),
                and(
                  eq(bookmarkedAtCursorValue, cursorDate),
                  gt(posts.id, parsed.postId),
                ),
              ),
            )
          : and(eq(postBookmarks.userId, userId), eq(posts.hidden, false)),
      )
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
        postBookmarks.createdAt,
      );

    const rows = await query
      .orderBy(desc(bookmarkedAtCursorValue), asc(posts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? encodeCreatedAtCursor({
            createdAt: lastItem.bookmarkedAt.toISOString(),
            postId: lastItem.id,
          })
        : null;

    const bookmarkDtos = items.map((row) =>
      this.postsPresenter.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
      ),
    );
    await this.postsPresenter.hydrateTags(bookmarkDtos);

    return { items: bookmarkDtos, nextCursor };
  }
}
