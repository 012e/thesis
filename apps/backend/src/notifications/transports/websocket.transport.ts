import { Injectable } from "@nestjs/common";
import type { NotificationDto } from "@repo/shared-dto";
import type { NotificationTransport } from "./notification-transport.interface";
import { NotificationsGateway } from "../notifications.gateway";

/**
 * Delivers notifications via the Socket.IO `/notifications` namespace.
 * Emits a `notification` event to the `user:{userId}` room.
 */
@Injectable()
export class WebSocketTransport implements NotificationTransport {
  readonly name = "websocket";

  constructor(private readonly gateway: NotificationsGateway) {}

  async send(notification: NotificationDto): Promise<void> {
    try {
      this.gateway.emitToUser(notification.userId ?? "", notification);
    } catch (err) {
      // Non-fatal — the notification is already persisted to the DB.
      console.warn("[WebSocketTransport] Failed to emit notification:", err);
    }
  }
}
