import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

import { auth } from '@/auth';
import type { NotificationDto } from '@repo/shared-dto';

// ─── Event name constants ─────────────────────────────────────────────────────

/**
 * Server → Client: a new notification has been persisted and delivered.
 * Emitted to `user:{userId}` room so any connected client of that user receives it.
 */
export const WS_NOTIFICATION = 'notification' as const;

// ─── Gateway ─────────────────────────────────────────────────────────────────

/**
 * WebSocket gateway for the real-time notification channel.
 *
 * Authentication flow mirrors MessagesGateway:
 *  1. Client connects with `auth: { token: '<bearer jwt>' }` in the handshake.
 *  2. `handleConnection` resolves the session via Better Auth.
 *  3. The socket is automatically joined to `user:{userId}`.
 *
 * This gateway only pushes; clients do not send any events here.
 * Use the REST endpoints (NotificationsController) for read/unread state.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, unknown>)?.token ??
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token || typeof token !== 'string') {
        this.disconnect(client, 'Missing auth token');
        return;
      }

      const session = await auth.api.getSession({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      });

      if (!session?.user) {
        this.disconnect(client, 'Invalid or expired token');
        return;
      }

      client.data.userId = session.user.id;

      // Auto-join the per-user room so this client receives all notifications
      // for the authenticated user without any further handshake.
      await client.join(`user:${session.user.id}`);

      client.emit('authenticated');
    } catch {
      this.disconnect(client, 'Authentication error');
    }
  }

  handleDisconnect(_client: Socket): void {
    // Socket.IO automatically removes the client from all rooms on disconnect.
  }

  // ─── Push API (called by WebSocketTransport) ─────────────────────────────

  /**
   * Emit a notification event to all connected sockets for a given user.
   * Non-fatal if the user has no open sockets.
   */
  emitToUser(userId: string, notification: NotificationDto): void {
    this.server.to(`user:${userId}`).emit(WS_NOTIFICATION, notification);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private disconnect(client: Socket, reason: string): void {
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}
