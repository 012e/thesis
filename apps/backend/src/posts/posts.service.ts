import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type {
  NotificationPayloadDto,
  NotificationTypeDto,
  PostDto,
  PostSubscriptionDto,
  ReactionTypeDto,
} from "@repo/shared-dto";
import type { z } from "zod";

import { DatabaseService } from "@/db/database.service";
import {
  comments,
  postReactions,
  posts,
  postSubscriptions,
  usersView,
} from "@/db/schema";
import { StorageService } from "@/storage/storage.service";
import { UsersService } from "@/users/users.service";
import { NotificationsService } from "@/notifications/notifications.service";
import {
  EMBEDDING_SERVICE,
  type IEmbeddingService,
} from "@/embedding/embedding.interface";

import { createPostSchema, updatePostSchema } from "./posts.schemas";

const upvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'upvote' THEN 1 END`,
).as("upvoteCount");
const downvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'downvote' THEN 1 END`,
).as("downvoteCount");

const commentCount = sql<number>`(SELECT count(*)::int FROM ${comments} WHERE ${comments.postId} = ${posts.id})`.as(
  "commentCount",
);

const getUserReactionType = (userId: string) => {
  return sql<
    string | null
  >`MAX(CASE WHEN ${postReactions.userId} = ${sql.raw(`'${userId}'`)} THEN ${postReactions.type} END)`;
};

const getCurrentUserSubscribed = (userId: string) => {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${postSubscriptions}
    WHERE ${postSubscriptions.postId} = ${posts.id}
      AND ${postSubscriptions.userId} = ${userId}
  )`;
};

type CreatePostInput = z.infer<typeof createPostSchema>;
type UpdatePostInput = z.infer<typeof updatePostSchema>;

export type PostRow = typeof posts.$inferSelect & {
  author: typeof usersView.$inferSelect;
};

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(EMBEDDING_SERVICE)
    private readonly embeddingService: IEmbeddingService,
  ) {}

  async listByUser(
    authorId: string,
    requestingUserId: string,
  ): Promise<PostDto[]> {
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
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.authorId, authorId))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(posts.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
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
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(posts.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
  }

  async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    // Embed the post text before inserting — hard-fail if embedding fails.
    const textToEmbed = input.content.text ?? "";
    const embedding = textToEmbed.trim()
      ? await this.embeddingService.embed(textToEmbed)
      : null;

    const [createdPost] = await this.databaseService.db
      .insert(posts)
      .values({
        authorId,
        content: input.content,
        embedding: embedding ?? null,
      })
      .returning();

    await this.databaseService.db
      .insert(postSubscriptions)
      .values({ postId: createdPost.id, userId: authorId })
      .onConflictDoNothing();

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
        userReactionType: getUserReactionType(authorId),
        currentUserSubscribed: getCurrentUserSubscribed(authorId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.id, createdPost.id))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    return this.toDto(row, row.userReactionType as ReactionTypeDto | null);
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
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.id, id))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    return row
      ? this.toDto(row, row.userReactionType as ReactionTypeDto | null)
      : null;
  }

  async update(
    id: string,
    authorId: string,
    input: UpdatePostInput,
  ): Promise<PostDto | null> {
    const [updatedPost] = await this.databaseService.db
      .update(posts)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();

    if (!updatedPost) return null;

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
        userReactionType: getUserReactionType(authorId),
        currentUserSubscribed: getCurrentUserSubscribed(authorId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.id, updatedPost.id))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    const dto = row
      ? this.toDto(row, row.userReactionType as ReactionTypeDto | null)
      : null;

    if (dto) {
      void this.deliverPostUpdateNotification(dto.id, authorId, dto.content.text).catch(
        (error) =>
          this.logger.warn(
            `Failed to notify subscribers for post update ${dto.id}: ${(error as Error).message}`,
          ),
      );
    }

    return dto;
  }

  async recommendations(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: PostDto[]; nextCursor: string | null }> {
    const parsed = cursor ? this.decodeCursor(cursor) : null;

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
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
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
        ? this.encodeCursor({
            reactionCount: lastItem.reactionCount,
            postId: lastItem.id,
          })
        : null;

    return {
      items: items.map((row) =>
        this.toDto(row, row.userReactionType as ReactionTypeDto | null),
      ),
      nextCursor,
    };
  }

  async delete(id: string, authorId: string): Promise<PostDto | null> {
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
        userReactionType: getUserReactionType(authorId),
        currentUserSubscribed: getCurrentUserSubscribed(authorId),
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .leftJoin(postReactions, eq(posts.id, postReactions.postId))
      .where(eq(posts.id, id))
      .groupBy(
        posts.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    if (!row || row.authorId !== authorId) return null;

    await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));

    const images = row.content.images;
    if (images && images.length > 0) {
      const imageKeys = images.map((img) => img.key);
      this.storageService.deleteImages(imageKeys).catch((error) => {
        this.logger.error(`Failed to delete images for post ${id}:`, error);
      });
    }

    return this.toDto(row, row.userReactionType as ReactionTypeDto | null);
  }

  async subscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    await this.databaseService.db
      .insert(postSubscriptions)
      .values({ postId, userId })
      .onConflictDoNothing();

    const [row] = await this.databaseService.db
      .select()
      .from(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.postId, postId),
          eq(postSubscriptions.userId, userId),
        ),
      )
      .limit(1);

    return row ? this.toSubscriptionDto(row) : null;
  }

  async unsubscribe(
    postId: string,
    userId: string,
  ): Promise<PostSubscriptionDto | null> {
    const [post] = await this.databaseService.db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return null;

    if (post.authorId === userId) {
      return this.subscribe(postId, userId);
    }

    const [row] = await this.databaseService.db
      .delete(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.postId, postId),
          eq(postSubscriptions.userId, userId),
        ),
      )
      .returning();

    return row ? this.toSubscriptionDto(row) : null;
  }

  async notifySubscribers(
    postId: string,
    actorId: string,
    type: NotificationTypeDto,
    payload: NotificationPayloadDto,
    excludeUserIds: string[] = [],
  ): Promise<void> {
    const excluded = new Set([actorId, ...excludeUserIds]);
    const subscribers = await this.databaseService.db
      .select({ userId: postSubscriptions.userId })
      .from(postSubscriptions)
      .where(eq(postSubscriptions.postId, postId));

    const recipientIds = [...new Set(subscribers.map((row) => row.userId))]
      .filter((userId) => !excluded.has(userId));

    await Promise.all(
      recipientIds.map((userId) =>
        this.notificationsService.deliver(
          { userId, actorId, type, payload },
          ["websocket"],
        ),
      ),
    );
  }

  readonly toDto = (
    row: PostRow & {
      upvoteCount: number;
      downvoteCount: number;
      commentCount: number;
      currentUserSubscribed?: boolean;
    },
    userReactionType?: ReactionTypeDto | null,
  ): PostDto => {
    return {
      id: row.id,
      authorId: row.authorId,
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
        image: this.usersService.resolveAvatarUrl(row.author.image ?? null),
      },
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      commentCount: row.commentCount,
      currentUserReaction: userReactionType ?? null,
      currentUserSubscribed: row.currentUserSubscribed ?? false,
    };
  };

  private readonly toSubscriptionDto = (row: {
    postId: string;
    userId: string;
    createdAt: Date;
  }): PostSubscriptionDto => ({
    postId: row.postId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  });

  private async postExists(postId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return row !== undefined;
  }

  private async deliverPostUpdateNotification(
    postId: string,
    actorId: string,
    text: string | undefined,
  ): Promise<void> {
    await this.notifySubscribers(postId, actorId, "post_update", {
      postId,
      preview: text ? text.slice(0, 100) : null,
    });
  }

  private encodeCursor(cursor: {
    reactionCount: number;
    postId: string;
  }): string {
    return Buffer.from(JSON.stringify(cursor)).toString("base64url");
  }

  private decodeCursor(cursor: string): {
    reactionCount: number;
    postId: string;
  } | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      ) as unknown;
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "reactionCount" in decoded &&
        "postId" in decoded &&
        typeof (decoded as { reactionCount: unknown }).reactionCount ===
          "number" &&
        typeof (decoded as { postId: unknown }).postId === "string"
      ) {
        return decoded as { reactionCount: number; postId: string };
      }
      return null;
    } catch {
      return null;
    }
  }
}
