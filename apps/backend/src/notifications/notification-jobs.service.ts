import { Inject, Injectable, Logger } from "@nestjs/common";
import { Job } from "@wavezync/nestjs-pgboss";
import type { JobWithMetadata } from "pg-boss";

import type { NotificationDto } from "@repo/shared-dto";

import {
  NOTIFICATION_TRANSPORTS,
  type NotificationTransport,
} from "./transports/notification-transport.interface";

export const DELIVER_NOTIFICATION_JOB = "deliver-notification";

export interface DeliverNotificationJobData {
  notification: NotificationDto;
  channels: string[];
}

/**
 * Processes notification delivery as a background job via pg-boss.
 * Each job receives one or more notifications to dispatch through the
 * selected transport channels.
 */
@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);

  constructor(
    @Inject(NOTIFICATION_TRANSPORTS)
    private readonly transports: NotificationTransport[],
  ) {}

  @Job(DELIVER_NOTIFICATION_JOB, { teamSize: 5, teamConcurrency: 2 })
  async handleDeliverNotification(
    jobs: JobWithMetadata<DeliverNotificationJobData>[],
  ): Promise<void> {
    await Promise.allSettled(
      jobs.map(async (job) => {
        const { notification, channels } = job.data;
        const selected = this.transports.filter((t) =>
          channels.includes(t.name),
        );

        await Promise.allSettled(
          selected.map((t) =>
            t.send(notification).catch((err) => {
              this.logger.warn(
                `[${t.name}] Failed to deliver notification ${notification.id}: ${err?.message ?? err}`,
              );
            }),
          ),
        );
      }),
    );
  }
}
