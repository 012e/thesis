import { Injectable } from "@nestjs/common";
import type {
  NotificationPayloadDto,
  NotificationPostContextDto,
  NotificationTypeDto,
  PostContentDto,
} from "@repo/shared-dto";
import { eq } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { comments, postSubscriptions, posts, usersView } from "@/db/schema";
import { NotificationsService } from "@/notifications/notifications.service";

@Injectable()
export class PostsNotificationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    const recipientIds = [
      ...new Set(subscribers.map((row) => row.userId)),
    ].filter((userId) => !excluded.has(userId));

    await Promise.all(
      recipientIds.map((userId) =>
        this.notificationsService.deliver({ userId, actorId, type, payload }, [
          "websocket",
        ]),
      ),
    );
  }

  async deliverPostUpdateNotification(
    postId: string,
    actorId: string,
    text: string | undefined,
  ): Promise<void> {
    const postContext = await this.getPostNotificationContext(postId);

    await this.notifySubscribers(postId, actorId, "post_update", {
      postId,
      preview: text ? text.slice(0, 100) : null,
      post: postContext ?? undefined,
    });
  }

  /**
   * Q&A primitive: notify the answerer that the asker accepted their comment
   * as the answer. No-op when the asker accepts their own comment.
   */
  async deliverAnswerAcceptedNotification(
    postId: string,
    commentId: string,
    actorId: string,
    recipientId: string,
    xpEarned?: number,
  ): Promise<void> {
    if (recipientId === actorId) return;

    const [postContext, commentRows] = await Promise.all([
      this.getPostNotificationContext(postId),
      this.databaseService.db
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
        .limit(1),
    ]);

    const comment = commentRows[0];

    await this.notificationsService.deliver(
      {
        userId: recipientId,
        actorId,
        type: "answer_accepted",
        payload: {
          postId,
          commentId,
          post: postContext ?? undefined,
          comment: comment
            ? {
                id: comment.id,
                preview: comment.content.slice(0, 100),
                author: comment.author,
              }
            : undefined,
          xpEarned,
        },
      },
      ["websocket"],
    );
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

  private getPostPreview(content: PostContentDto): string | null {
    if (content.text?.trim()) return content.text.slice(0, 100);
    if (content.poll?.question.trim()) {
      return content.poll.question.slice(0, 100);
    }
    if (content.visualization?.title.trim()) {
      return content.visualization.title.slice(0, 100);
    }
    return null;
  }
}
