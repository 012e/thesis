import { and, count, eq, sql } from "drizzle-orm";
import { Injectable } from "@nestjs/common";
import type {
  PostReactionDto,
  PostReactionSummaryDto,
  CommentReactionDto,
  CommentReactionSummaryDto,
  ReactorDto,
  ReactionTypeDto,
} from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import {
  postReactions,
  commentReactions,
  posts,
  comments,
  usersView,
} from '@/db/schema';
import { NotificationsService } from '@/notifications/notifications.service';
import { PostsService } from '@/posts/posts.service';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly postsService: PostsService,
  ) {}

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
    const [post] = await this.databaseService.db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    if (!post) return null;

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

    void this.postsService
      .notifySubscribers(postId, userId, 'post_reaction', {
        postId,
        reactionType: type,
      })
      .catch((err) =>
        console.warn('[ReactionsService] Failed to deliver post reaction notification:', err),
      );

    return this.toReactionDto(row);
  }

  /**
   * Upsert a reaction for a comment by a user.
   */
  async reactToComment(
    commentId: string,
    userId: string,
    type: ReactionTypeDto,
  ): Promise<CommentReactionDto | null> {
    const [comment] = await this.databaseService.db
      .select({ id: comments.id, authorId: comments.authorId, postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    if (!comment) return null;

    const [row] = await this.databaseService.db
      .insert(commentReactions)
      .values({ commentId, userId, type })
      .onConflictDoUpdate({
        target: [commentReactions.commentId, commentReactions.userId],
        set: {
          type,
          createdAt: sql`now()`,
        },
      })
      .returning();

    // Notify comment author — skip self-reactions
    if (comment.authorId !== userId) {
      void this.notificationsService
        .deliver(
          {
            userId: comment.authorId,
            actorId: userId,
            type: 'comment_reaction',
            payload: { commentId, postId: comment.postId, reactionType: type },
          },
          ['websocket'],
        )
        .catch((err) =>
          console.warn('[ReactionsService] Failed to deliver comment reaction notification:', err),
        );
    }

    return this.toCommentReactionDto(row);
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
   * Remove a user's reaction from a comment.
   */
  async unreactToComment(
    commentId: string,
    userId: string,
  ): Promise<CommentReactionDto | null> {
    const commentExists = await this.commentExists(commentId);
    if (!commentExists) return null;

    const [row] = await this.databaseService.db
      .delete(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.userId, userId),
        ),
      )
      .returning();

    return row ? this.toCommentReactionDto(row) : null;
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
        and(eq(postReactions.postId, postId), eq(postReactions.type, "upvote")),
      );

    const [downvoteRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.type, "downvote"),
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
   * Return upvote/downvote counts and the requesting user's own reaction for a comment.
   */
  async getCommentSummary(
    commentId: string,
    requestingUserId: string,
  ): Promise<CommentReactionSummaryDto | null> {
    const commentExists = await this.commentExists(commentId);
    if (!commentExists) return null;

    const [upvoteRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.type, "upvote"),
        ),
      );

    const [downvoteRow] = await this.databaseService.db
      .select({ cnt: count() })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.type, "downvote"),
        ),
      );

    const [userRow] = await this.databaseService.db
      .select({ type: commentReactions.type })
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.userId, requestingUserId),
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

  /**
   * List all users who reacted to a comment.
   */
  async listCommentReactors(
    commentId: string,
    type?: ReactionTypeDto,
  ): Promise<ReactorDto[] | null> {
    const commentExists = await this.commentExists(commentId);
    if (!commentExists) return null;

    const conditions = [eq(commentReactions.commentId, commentId)];
    if (type) {
      conditions.push(eq(commentReactions.type, type));
    }

    const rows = await this.databaseService.db
      .select({
        id: usersView.id,
        username: usersView.username,
        email: usersView.email,
        name: usersView.name,
        reactionType: commentReactions.type,
        reactedAt: commentReactions.createdAt,
      })
      .from(commentReactions)
      .innerJoin(usersView, eq(commentReactions.userId, usersView.id))
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

  private async commentExists(commentId: string): Promise<boolean> {
    const [row] = await this.databaseService.db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, commentId))
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

  private readonly toCommentReactionDto = (
    row: typeof commentReactions.$inferSelect,
  ): CommentReactionDto => ({
    commentId: row.commentId,
    userId: row.userId,
    type: row.type as ReactionTypeDto,
    createdAt: row.createdAt.toISOString(),
  });
}
