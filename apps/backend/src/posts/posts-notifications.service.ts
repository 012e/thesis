import { Injectable } from "@nestjs/common";
import type {
  NotificationPayloadDto,
  NotificationPostContextDto,
  NotificationTypeDto,
  PostContentDto,
} from "@repo/shared-dto";
import { eq } from "drizzle-orm";

import { DatabaseService } from "@/db/database.service";
import { postSubscriptions, posts, usersView } from "@/db/schema";
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
