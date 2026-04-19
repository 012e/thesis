import { Injectable } from '@nestjs/common';
import type { CommentDto, ReactionTypeDto } from '@repo/shared-dto';
import { DatabaseService } from '@/db/database.service';
import { comments, commentReactions, usersView } from '@/db/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { UsersService } from '@/users/users.service';

const upvoteCount = count(
  sql`CASE WHEN ${commentReactions.type} = 'upvote' THEN 1 END`,
).as('upvoteCount');
const downvoteCount = count(
  sql`CASE WHEN ${commentReactions.type} = 'downvote' THEN 1 END`,
).as('downvoteCount');

const getUserReactionType = (userId: string) => {
  return sql<
    string | null
  >`MAX(CASE WHEN ${commentReactions.userId} = ${sql.raw(`'${userId}'`)} THEN ${commentReactions.type} END)`;
};

type CommentRow = typeof comments.$inferSelect & {
  author: typeof usersView.$inferSelect;
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  async list(postId: string, userId?: string): Promise<CommentDto[]> {
    const rows = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
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
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.postId, postId))
      .groupBy(
        comments.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(comments.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
  }

  async create(
    authorId: string,
    postId: string,
    content: string,
    parentId?: string,
  ): Promise<CommentDto> {
    const [createdComment] = await this.databaseService.db
      .insert(comments)
      .values({
        authorId,
        postId,
        content,
        parentId,
      })
      .returning();

    const [row] = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
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
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.id, createdComment.id))
      .groupBy(
        comments.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .limit(1);

    return this.toDto(row, row.userReactionType as ReactionTypeDto | null);
  }

  async getById(id: string, userId?: string): Promise<CommentDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
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
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.id, id))
      .groupBy(
        comments.id,
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

  async delete(id: string) {
    const [row] = await this.databaseService.db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning();

    return row;
  }

  async listReplies(commentId: string, userId?: string): Promise<CommentDto[]> {
    const rows = await this.databaseService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
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
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .leftJoin(commentReactions, eq(comments.id, commentReactions.commentId))
      .where(eq(comments.parentId, commentId))
      .groupBy(
        comments.id,
        usersView.id,
        usersView.username,
        usersView.email,
        usersView.name,
        usersView.image,
      )
      .orderBy(desc(comments.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
  }

  private toDto(
    row: CommentRow & { upvoteCount: number; downvoteCount: number },
    userReactionType?: ReactionTypeDto | null,
  ): CommentDto {
    return {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId ?? null,
      authorId: row.authorId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: {
        id: row.author.id,
        username: row.author.username ?? null,
        email: row.author.email,
        name: row.author.name ?? null,
        image: this.usersService.resolveAvatarUrl(row.author.image ?? null),
      },
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      currentUserReaction: userReactionType ?? null,
    };
  }
}
