import { Injectable } from "@nestjs/common";
import type {
  CommentDto,
  NotificationCommentContextDto,
  NotificationPostContextDto,
  PostContentDto,
  ReactionTypeDto,
} from "@repo/shared-dto";
import { DatabaseService } from "@/db/database.service";
import { comments, commentReactions, posts, usersView } from "@/db/schema";
import { and, eq, desc, count, sql } from "drizzle-orm";
import { UsersService } from "@/users/users.service";
import { NotificationsService } from "@/notifications/notifications.service";
import { PostsService } from "@/posts/posts.service";
import { XpService } from "@/xp/xp.service";

const upvoteCount = count(
  sql`CASE WHEN ${commentReactions.type} = 'upvote' THEN 1 END`,
).as("upvoteCount");
const downvoteCount = count(
  sql`CASE WHEN ${commentReactions.type} = 'downvote' THEN 1 END`,
).as("downvoteCount");

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
    private readonly notificationsService: NotificationsService,
    private readonly postsService: PostsService,
    private readonly xpService: XpService,
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
          xp: usersView.xp,
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
        usersView.xp,
      )
      .orderBy(desc(comments.createdAt));

    const acceptedCommentId = await this.getAcceptedCommentId(postId);

    return rows.map((row) =>
      this.toDto(
        row,
        row.userReactionType as ReactionTypeDto | null,
        acceptedCommentId,
      ),
    );
  }

  /** Q&A primitive: the comment a question's author accepted as the answer. */
  private async getAcceptedCommentId(postId: string): Promise<string | null> {
    const [row] = await this.databaseService.db
      .select({ acceptedCommentId: posts.acceptedCommentId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return row?.acceptedCommentId ?? null;
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
          xp: usersView.xp,
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
        usersView.xp,
      )
      .limit(1);

    const dto = this.toDto(row, row.userReactionType as ReactionTypeDto | null);

    // Fire-and-forget notifications
    void this.deliverCommentNotification({
      authorId,
      postId,
      commentId: dto.id,
      content,
      parentId,
    }).catch((err) =>
      console.warn(
        "[CommentsService] Failed to deliver comment notification:",
        err,
      ),
    );

    return dto;
  }

  /** Resolve and deliver the appropriate notification (comment on post or reply). */
  private async deliverCommentNotification(opts: {
    authorId: string;
    postId: string;
    commentId: string;
    content: string;
    parentId?: string;
  }): Promise<void> {
    const { authorId, postId, commentId, content, parentId } = opts;
    const preview = content.slice(0, 100);
    const [postContext, commentContext] = await Promise.all([
      this.getPostNotificationContext(postId),
      this.getCommentNotificationContext(commentId),
    ]);

    if (parentId) {
      // Reply to a comment — notify the parent comment author
      const parentComment = await this.getCommentNotificationContext(parentId);

      if (parentComment && parentComment.author.id !== authorId) {
        await this.notificationsService.deliver(
          {
            userId: parentComment.author.id,
            actorId: authorId,
            type: "reply",
            payload: {
              postId,
              parentCommentId: parentId,
              commentId,
              preview,
              post: postContext ?? undefined,
              parentComment,
              comment: commentContext ?? undefined,
            },
          },
          ["websocket"],
        );
      }

      await this.postsService.notifySubscribers(
        postId,
        authorId,
        "reply",
        {
          postId,
          parentCommentId: parentId,
          commentId,
          preview,
          post: postContext ?? undefined,
          parentComment: parentComment ?? undefined,
          comment: commentContext ?? undefined,
        },
        parentComment ? [parentComment.author.id] : [],
      );
    } else {
      await this.postsService.notifySubscribers(postId, authorId, "comment", {
        postId,
        commentId,
        preview,
        post: postContext ?? undefined,
        comment: commentContext ?? undefined,
      });
    }
  }

  private async getPostNotificationContext(
    postId: string,
  ): Promise<NotificationPostContextDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: posts.id,
        content: posts.content,
        author: {
          id: usersView.id,
          username: usersView.username,
          name: usersView.name,
        },
      })
      .from(posts)
      .innerJoin(usersView, eq(posts.authorId, usersView.id))
      .where(eq(posts.id, postId))
      .limit(1);

    return row
      ? {
          id: row.id,
          preview: this.getPostPreview(row.content),
          author: row.author,
        }
      : null;
  }

  private async getCommentNotificationContext(
    commentId: string,
  ): Promise<NotificationCommentContextDto | null> {
    const [row] = await this.databaseService.db
      .select({
        id: comments.id,
        content: comments.content,
        author: {
          id: usersView.id,
          username: usersView.username,
          name: usersView.name,
        },
      })
      .from(comments)
      .innerJoin(usersView, eq(comments.authorId, usersView.id))
      .where(eq(comments.id, commentId))
      .limit(1);

    return row
      ? {
          id: row.id,
          preview: row.content.slice(0, 100),
          author: row.author,
        }
      : null;
  }

  private getPostPreview(content: PostContentDto): string | null {
    if (content.text?.trim()) return content.text.slice(0, 100);
    if (content.poll?.question.trim())
      return content.poll.question.slice(0, 100);
    if (content.visualization?.title.trim()) {
      return content.visualization.title.slice(0, 100);
    }
    return null;
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
          xp: usersView.xp,
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
        usersView.xp,
      )
      .limit(1);

    if (!row) return null;

    const acceptedCommentId = await this.getAcceptedCommentId(row.postId);

    return this.toDto(
      row,
      row.userReactionType as ReactionTypeDto | null,
      acceptedCommentId,
    );
  }

  async delete(id: string) {
    const [row] = await this.databaseService.db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning();

    // Q&A primitive: if the deleted comment was the accepted answer, re-open
    // the question (back to "needs help") and revoke the answerer's XP.
    if (row) {
      const reopened = await this.databaseService.db
        .update(posts)
        .set({ acceptedCommentId: null, solvedAt: null })
        .where(
          and(eq(posts.id, row.postId), eq(posts.acceptedCommentId, row.id)),
        )
        .returning({ authorId: posts.authorId });

      const askerId = reopened[0]?.authorId;
      if (askerId) {
        await this.xpService.revoke({
          reason: "answer_accepted",
          sourceId: row.id,
          actorId: askerId,
        });
      }
    }

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
          xp: usersView.xp,
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
        usersView.xp,
      )
      .orderBy(desc(comments.createdAt));

    return rows.map((row) =>
      this.toDto(row, row.userReactionType as ReactionTypeDto | null),
    );
  }

  private toDto(
    row: CommentRow & { upvoteCount: number; downvoteCount: number },
    userReactionType?: ReactionTypeDto | null,
    acceptedCommentId?: string | null,
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
        xp: row.author.xp,
      },
      upvoteCount: row.upvoteCount,
      downvoteCount: row.downvoteCount,
      currentUserReaction: userReactionType ?? null,
      isAccepted:
        acceptedCommentId != null && row.id === acceptedCommentId,
    };
  }
}
