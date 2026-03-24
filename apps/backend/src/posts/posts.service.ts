import { and, asc, count, desc, eq, lt, or, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import type { PostDto, ReactionTypeDto } from '@repo/shared-dto';
import type { z } from 'zod';

import { DatabaseService } from '@/db/database.service';
import { postReactions, posts, usersView } from '@/db/schema';

const upvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'upvote' THEN 1 END`,
).as('upvoteCount');
const downvoteCount = count(
  sql`CASE WHEN ${postReactions.type} = 'downvote' THEN 1 END`,
).as('downvoteCount');

const getUserReactionType = (userId: string) => {
  return sql<
    string | null
  >`MAX(CASE WHEN ${postReactions.userId} = ${sql.raw(`'${userId}'`)} THEN ${postReactions.type} END)`;
};

import { createPostSchema, updatePostSchema } from './posts.schemas';

type CreatePostInput = z.infer<typeof createPostSchema>;
type UpdatePostInput = z.infer<typeof updatePostSchema>;

type PostRow = typeof posts.$inferSelect & {
  author: typeof usersView.$inferSelect;
};

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

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
        },
        upvoteCount,
        downvoteCount,
        userReactionType: getUserReactionType(userId),
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
      )
      .orderBy(desc(posts.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
  }

  async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    const [createdPost] = await this.databaseService.db
      .insert(posts)
      .values({
        authorId,
        content: input.content,
      })
      .returning();

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
        },
        upvoteCount,
        downvoteCount,
        userReactionType: getUserReactionType(authorId),
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
        },
        upvoteCount,
        downvoteCount,
        userReactionType: userId
          ? getUserReactionType(userId)
          : sql<string | null>`NULL`,
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
        },
        upvoteCount,
        downvoteCount,
        userReactionType: getUserReactionType(authorId),
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
      )
      .limit(1);

    return row
      ? this.toDto(row, row.userReactionType as ReactionTypeDto | null)
      : null;
  }

  async recommendations(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: PostDto[]; nextCursor: string | null }> {
    const parsed = cursor ? this.decodeCursor(cursor) : null;

    const reactionCount = count(postReactions.postId).as('reaction_count');

    // Build the query without cursor filtering first
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
        },
        reactionCount,
        upvoteCount,
        downvoteCount,
        userReactionType: getUserReactionType(userId),
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
      )
      .$dynamic();

    // Apply cursor filtering using HAVING clause
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

  private encodeCursor(cursor: {
    reactionCount: number;
    postId: string;
  }): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(cursor: string): {
    reactionCount: number;
    postId: string;
  } | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as unknown;
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'reactionCount' in decoded &&
        'postId' in decoded &&
        typeof (decoded as { reactionCount: unknown }).reactionCount ===
          'number' &&
        typeof (decoded as { postId: unknown }).postId === 'string'
      ) {
        return decoded as { reactionCount: number; postId: string };
      }
      return null;
    } catch {
      return null;
    }
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
        },
        upvoteCount,
        downvoteCount,
        userReactionType: getUserReactionType(authorId),
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
      )
      .limit(1);

    if (!row || row.authorId !== authorId) return null;

    await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));

    return this.toDto(row, row.userReactionType as ReactionTypeDto | null);
  }

  private readonly toDto = (
    row: PostRow & { upvoteCount: number; downvoteCount: number },
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
      },
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      currentUserReaction: userReactionType ?? null,
    };
  };
}
