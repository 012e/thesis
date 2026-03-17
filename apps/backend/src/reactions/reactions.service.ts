import { and, count, eq, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import type {
  PostReactionDto,
  PostReactionSummaryDto,
  ReactorDto,
  ReactionTypeDto,
} from '@repo/shared-dto';

import { DatabaseService } from '@/db/database.service';
import { postReactions, posts, usersView } from '@/db/schema';

@Injectable()
export class ReactionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Upsert a reaction (upvote or downvote) for a post by a user.
   * If the user already has a reaction of a different type it is replaced.
   * Returns null when the post does not exist.
   */
  async react(
    postId: string,
    userId: string,
    type: ReactionTypeDto,
  ): Promise<PostReactionDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    const [row] = await this.databaseService.db
      .insert(postReactions)
      .values({ postId, userId, type })
      .onConflictDoUpdate({
        target: [postReactions.postId, postReactions.userId],
        set: {
          type,
          createdAt: sql`now()`,
        },
      })
      .returning();

    return this.toReactionDto(row);
  }

  /**
   * Remove a user's reaction from a post.
   * Returns the deleted reaction, or null if none existed or the post does not exist.
   */
  async unreact(
    postId: string,
    userId: string,
  ): Promise<PostReactionDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    const [row] = await this.databaseService.db
      .delete(postReactions)
      .where(
        and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
      )
      .returning();

    return row ? this.toReactionDto(row) : null;
  }

  /**
   * Return upvote/downvote counts and the requesting user's own reaction.
   * Returns null when the post does not exist.
   */
  async getSummary(
    postId: string,
    requestingUserId: string,
  ): Promise<PostReactionSummaryDto | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    const [upvoteRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(postReactions)
      .where(
        and(eq(postReactions.postId, postId), eq(postReactions.type, 'upvote')),
      );

    const [downvoteRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.type, 'downvote'),
        ),
      );

    const [userRow] = await this.databaseService.db
      .select({ type: postReactions.type })
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, requestingUserId),
        ),
      )
      .limit(1);

    return {
      upvotes: upvoteRow?.cnt ?? 0,
      downvotes: downvoteRow?.cnt ?? 0,
      userReaction: (userRow?.type as ReactionTypeDto) ?? null,
    };
  }

  /**
   * List all users who reacted to a post, optionally filtered by reaction type.
   * Returns null when the post does not exist.
   */
  async listReactors(
    postId: string,
    type?: ReactionTypeDto,
  ): Promise<ReactorDto[] | null> {
    const postExists = await this.postExists(postId);
    if (!postExists) return null;

    const conditions = [eq(postReactions.postId, postId)];
    if (type) {
      conditions.push(eq(postReactions.type, type));
    }

    const rows = await this.databaseService.db
      .select({
        id: usersView.id,
        username: usersView.username,
        email: usersView.email,
        name: usersView.name,
        reactionType: postReactions.type,
        reactedAt: postReactions.createdAt,
      })
      .from(postReactions)
      .innerJoin(usersView, eq(postReactions.userId, usersView.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      id: row.id,
      username: row.username ?? null,
      email: row.email,
      name: row.name ?? null,
      reactionType: row.reactionType as ReactionTypeDto,
      reactedAt: row.reactedAt.toISOString(),
    }));
  }

  private async postExists(postId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return !!row;
  }

  private readonly toReactionDto = (
    row: typeof postReactions.$inferSelect,
  ): PostReactionDto => ({
    postId: row.postId,
    userId: row.userId,
    type: row.type as ReactionTypeDto,
    createdAt: row.createdAt.toISOString(),
  });
}
