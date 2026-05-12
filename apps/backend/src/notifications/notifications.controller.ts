import { Controller, NotFoundException } from "@nestjs/common";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";

import { notificationsContract } from "@repo/rest-contracts";

import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * List notifications for the current user, newest-first with cursor pagination.
   */
  @TsRestHandler(notificationsContract.listNotifications)
  listNotifications(@Session() session: UserSession) {
    return tsRestHandler(
      notificationsContract.listNotifications,
      async ({ query }) => {
        const result = await this.notificationsService.list(session.user.id, {
          limit: query.limit,
          before: query.before,
        });
        return { status: 200, body: result };
      },
    );
  }

  /**
   * GET /notifications/unread-count
   * Registered before markRead so the literal "unread-count" path takes
   * precedence over the :id parameter.
   */
  @TsRestHandler(notificationsContract.getNotificationUnreadCount)
  getUnreadCount(@Session() session: UserSession) {
    return tsRestHandler(
      notificationsContract.getNotificationUnreadCount,
      async () => {
        const count = await this.notificationsService.getUnreadCount(
          session.user.id,
        );
        return { status: 200, body: { count } };
      },
    );
  }

  /**
   * PATCH /notifications/read-all
   * Mark all unread notifications for the current user as read.
   * Registered before markRead so the literal "read-all" path is matched first.
   */
  @TsRestHandler(notificationsContract.markAllRead)
  markAllRead(@Session() session: UserSession) {
    return tsRestHandler(notificationsContract.markAllRead, async () => {
      const updated = await this.notificationsService.markAllRead(
        session.user.id,
      );
      return { status: 200, body: { updated } };
    });
  }

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read.
   */
  @TsRestHandler(notificationsContract.markRead)
  markRead(@Session() session: UserSession) {
    return tsRestHandler(notificationsContract.markRead, async ({ params }) => {
      const notification = await this.notificationsService.markRead(
        params.id,
        session.user.id,
      );
      if (!notification) {
        throw new NotFoundException("Notification not found");
      }
      return { status: 200, body: notification };
    });
  }
}
