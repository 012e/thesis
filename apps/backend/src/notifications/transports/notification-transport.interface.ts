import type { NotificationDto } from "@repo/shared-dto";

/**
 * A notification transport is responsible for delivering a persisted
 * notification to its recipient via a specific channel (WebSocket, email, etc.).
 *
 * Register new transports in NotificationsModule and select them by name
 * when calling NotificationsService.deliver().
 */
export interface NotificationTransport {
  /** Unique identifier used to select this transport when calling deliver(). */
  readonly name: string;

  /**
   * Send the notification to its recipient.
   * Implementations should be non-fatal — log errors rather than re-throwing.
   */
  send(notification: NotificationDto): Promise<void>;
}

/**
 * Injection token for the transport registry array.
 * Use @Inject(NOTIFICATION_TRANSPORTS) to receive the registered list.
 */
export const NOTIFICATION_TRANSPORTS = Symbol("NOTIFICATION_TRANSPORTS");
