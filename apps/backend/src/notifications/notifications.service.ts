import { Inject, Injectable, Logger } from "@nestjs/common";
import { PgBossService } from "@wavezync/nestjs-pgboss";
import { and, count, desc, eq, isNull, lt } from "drizzle-orm";

import type {
  NotificationDto,
  NotificationPayloadDto,
  NotificationTypeDto,
} from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import { notifications, usersView } from "@/db/schema";
import {
  NOTIFICATION_TRANSPORTS,
  type NotificationTransport,
} from "./transports/notification-transport.interface";
import {
  DELIVER_NOTIFICATION_JOB,
  type DeliverNotificationJobData,
} from "./notification-jobs.service";

// ─── Input type for creating a notification ───────────────────────────────────

export interface CreateNotificationData {
  /** Recipient user ID. */
  userId: string;
  /** User who triggered the event. Null for system notifications. */
  actorId?: string | null;
  type: NotificationTypeDto;
  payload: NotificationPayloadDto;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly pgBossService: PgBossService,
    @Inject(NOTIFICATION_TRANSPORTS)
    private readonly transports: NotificationTransport[],
  ) {}

  /**
   * Persist a notification to the database and dispatch it through
   * the selected transport channels.
   *
   * @param data     Notification content and recipient.
   * @param channels Transport names to use (e.g. `['websocket']`).
   *                 Only the matching registered transports will be invoked.
   */
  async deliver(
    data: CreateNotificationData,
    channels: string[] = ["websocket"],
  ): Promise<NotificationDto> {
    const notification = await this.persist(data);

    // Enqueue background job for transport delivery — non-blocking.
    this.pgBossService
      .scheduleJob<DeliverNotificationJobData>(DELIVER_NOTIFICATION_JOB, {
        notification,
        channels,
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to enqueue deliver-notification job for ${notification.id}: ${(err as Error)?.message ?? err}`,
        );
      });

    return notification;
  }

  // ─── REST query methods ────────────────────────────────────────────────────

  /**
   * List notifications for a user, newest-first with optional cursor pagination.
   */
  async list(
    userId: string,
    options?: { limit?: number; before?: string },
  ): Promise<{ notifications: NotificationDto[]; nextCursor: string | null }> {
    const limit = options?.limit ?? 20;
    const before = options?.before ? new Date(options.before) : undefined;

    const conditions = [eq(notifications.userId, userId)];
    if (before) {
      conditions.push(lt(notifications.createdAt, before));
    }

    const rows = await this.databaseService.db
      .select({
        notification: notifications,
        actor: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
      })
      .from(notifications)
      .leftJoin(usersView, eq(notifications.actorId, usersView.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1); // fetch one extra to determine if there's a next page

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (items[items.length - 1]?.notification.createdAt.toISOString() ?? null)
      : null;

    return {
      notifications: items.map((r) =>
        this.toDto(r.notification, r.actor ?? null),
      ),
      nextCursor,
    };
  }

  /** Count unread notifications for a user. */
  async getUnreadCount(userId: string): Promise<number> {
    const [row] = await this.databaseService.db
      .select({ cnt: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );

    return row?.cnt ?? 0;
  }

  /** Mark a single notification as read. Returns null if not found or not owned. */
  async markRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationDto | null> {
    const [updated] = await this.databaseService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning();

    if (!updated) {
      // Either not found, not owned, or already read — fetch to check existence
      const [existing] = await this.databaseService.db
        .select({
          notification: notifications,
          actor: {
            id: usersView.id,
            username: usersView.username,
            email: usersView.email,
            name: usersView.name,
            image: usersView.image,
          },
        })
        .from(notifications)
        .leftJoin(usersView, eq(notifications.actorId, usersView.id))
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId),
          ),
        )
        .limit(1);

      return existing
        ? this.toDto(existing.notification, existing.actor ?? null)
        : null;
    }

    // Fetch actor for the DTO
    const [withActor] = await this.databaseService.db
      .select({
        notification: notifications,
        actor: {
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        },
      })
      .from(notifications)
      .leftJoin(usersView, eq(notifications.actorId, usersView.id))
      .where(eq(notifications.id, updated.id))
      .limit(1);

    return withActor
      ? this.toDto(withActor.notification, withActor.actor ?? null)
      : this.toDto(updated, null);
  }

  /** Mark all unread notifications for a user as read. Returns update count. */
  async markAllRead(userId: string): Promise<number> {
    const rows = await this.databaseService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      )
      .returning({ id: notifications.id });

    return rows.length;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async persist(
    data: CreateNotificationData,
  ): Promise<NotificationDto> {
    const [row] = await this.databaseService.db
      .insert(notifications)
      .values({
        userId: data.userId,
        actorId: data.actorId ?? null,
        type: data.type,
        payload: data.payload,
      })
      .returning();

    // Eagerly resolve the actor for the DTO
    let actor: {
      id: string;
      username: string | null;
      email: string;
      name: string | null;
      image: string | null;
    } | null = null;

    if (data.actorId) {
      const [actorRow] = await this.databaseService.db
        .select({
          id: usersView.id,
          username: usersView.username,
          email: usersView.email,
          name: usersView.name,
          image: usersView.image,
        })
        .from(usersView)
        .where(eq(usersView.id, data.actorId))
        .limit(1);

      actor = actorRow ?? null;
    }

    return this.toDto(row, actor);
  }

  private readonly toDto = (
    row: typeof notifications.$inferSelect,
    actor: {
      id: string;
      username: string | null;
      email: string;
      name: string | null;
      image: string | null;
    } | null,
  ): NotificationDto => ({
    id: row.id,
    userId: row.userId,
    actorId: row.actorId ?? null,
    actor: actor
      ? {
          id: actor.id,
          username: actor.username ?? null,
          email: actor.email,
          name: actor.name ?? null,
          image: actor.image ?? null,
        }
      : null,
    type: row.type as NotificationTypeDto,
    payload: row.payload as NotificationPayloadDto,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}
