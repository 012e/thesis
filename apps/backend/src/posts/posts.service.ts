import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import type { PostDto, ReactionTypeDto } from '@repo/shared-dto';
import type { z } from 'zod';

import { DatabaseService } from '@/db/database.service';
import { postReactions, posts, usersView } from '@/db/schema';
import { StorageService } from '@/storage/storage.service';
import { UsersService } from '@/users/users.service';

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
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
  ) {}

  async listByUser(authorId: string, requestingUserId: string): Promise<PostDto[]> {
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
        userReactionType: getUserReactionType(requestingUserId),
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
        usersView.image,
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
          image: usersView.image,
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
        usersView.image,
      )
      .limit(1);

    return row
      ? this.toDto(row, row.userReactionType as ReactionTypeDto | null)
      : null;
  }

  async search(query: string, userId: string): Promise<PostDto[]> {
    // ParadeDB's @@@ operator cannot be used inside queries that also have JOINs
    // because the BM25 scan context does not propagate through join planner nodes.
    // Solution: run a standalone BM25 search first (with score), then JOIN on the
    // resulting IDs using plain SQL in a CTE, executed as a single raw statement.
    const result = await this.databaseService.db.execute(sql`
      WITH bm25 AS (
        SELECT id, paradedb.score(id) AS bm25_score
        FROM posts
        WHERE id @@@ paradedb.match('content.text', ${query})
        LIMIT 50
      )
      SELECT
        p.id,
        p.author_id,
        p.content,
        p.created_at,
        p.updated_at,
        u.id           AS author_id_u,
        u.username     AS author_username,
        u.email        AS author_email,
        u.name         AS author_name,
        u.image        AS author_image,
        COUNT(CASE WHEN pr.type = 'upvote'   THEN 1 END) AS upvote_count,
        COUNT(CASE WHEN pr.type = 'downvote' THEN 1 END) AS downvote_count,
        MAX(CASE WHEN pr.user_id = ${userId} THEN pr.type END) AS user_reaction_type,
        bm25.bm25_score
      FROM bm25
      INNER JOIN posts p ON p.id = bm25.id
      INNER JOIN users_view u ON u.id = p.author_id
      LEFT JOIN post_reactions pr ON pr.post_id = p.id
      GROUP BY p.id, p.author_id, p.content, p.created_at, p.updated_at,
               u.id, u.username, u.email, u.name, u.image, bm25.bm25_score
      ORDER BY bm25.bm25_score DESC
    `);

    return result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r['id'] as string,
        authorId: r['author_id'] as string,
        author: {
          id: r['author_id_u'] as string,
          username: (r['author_username'] as string | null) ?? null,
          email: r['author_email'] as string,
          name: (r['author_name'] as string | null) ?? null,
          image: this.usersService.resolveAvatarUrl(
            (r['author_image'] as string | null) ?? null,
          ),
        },
        content: r['content'] as PostDto['content'],
        createdAt: new Date(r['created_at'] as string).toISOString(),
        updatedAt: new Date(r['updated_at'] as string).toISOString(),
        upvoteCount: Number(r['upvote_count']),
        downvoteCount: Number(r['downvote_count']),
        currentUserReaction:
          (r['user_reaction_type'] as ReactionTypeDto | null) ?? null,
      } satisfies PostDto;
    });
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
          image: usersView.image,
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
        usersView.image,
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
          image: usersView.image,
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
        usersView.image,
      )
      .limit(1);

    if (!row || row.authorId !== authorId) return null;

    // Delete the post from database
    await this.databaseService.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)));

    // Clean up images from storage (fire and forget, don't block the response)
    const images = row.content.images;
    if (images && images.length > 0) {
      const imageKeys = images.map((img) => img.key);
      this.storageService.deleteImages(imageKeys).catch((error) => {
        this.logger.error(`Failed to delete images for post ${id}:`, error);
      });
    }

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
        image: this.usersService.resolveAvatarUrl(row.author.image ?? null),
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
