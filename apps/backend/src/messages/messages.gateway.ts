import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { auth } from '@/auth';
import { MessagesService } from './messages.service';
import type { DirectMessageDto } from '@repo/shared-dto';

// ─── Event name constants (single source of truth) ──────────────────────────

/** Client → Server: join a conversation room to receive real-time messages. */
export const WS_JOIN_CONVERSATION = 'join-conversation' as const;

/** Client → Server: send a message in a conversation. */
export const WS_SEND_MESSAGE = 'send-message' as const;

/** Client → Server: notify the other participant that the user is typing. */
export const WS_TYPING = 'typing' as const;

/** Server → Client: a new message was delivered to the room. */
export const WS_NEW_MESSAGE = 'new-message' as const;

/** Server → Client: another participant started / stopped typing. */
export const WS_TYPING_INDICATOR = 'typing-indicator' as const;

// ─── Payload types ──────────────────────────────────────────────────────────

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

interface TypingPayload {
  conversationId: string;
  /** true = started typing, false = stopped typing */
  isTyping: boolean;
}

// ─── Gateway ────────────────────────────────────────────────────────────────

/**
 * WebSocket gateway for direct messaging.
 *
 * Authentication flow:
 *  1. Client connects with `auth: { token: '<bearer jwt>' }` in the handshake.
 *  2. `handleConnection` resolves the session via Better Auth; disconnects
 *     unauthenticated clients immediately.
 *  3. The resolved user ID is stored on `socket.data.userId`.
 *
 * Room naming: `conversation:{conversationId}`
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Tightened at the HTTP layer via ALLOWED_ORIGINS; WS auth is token-based.
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly messagesService: MessagesService) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, unknown>)?.token ??
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token || typeof token !== 'string') {
        this.disconnect(client, 'Missing auth token');
        return;
      }

      // Leverage Better Auth's built-in session verification
      const session = await auth.api.getSession({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      });

      if (!session?.user) {
        this.disconnect(client, 'Invalid or expired token');
        return;
      }

      client.data.userId = session.user.id;
      // Signal to the client that server-side auth is complete and the socket
      // is ready to accept events. This prevents a race where the client emits
      // events before handleConnection (which is async) has finished setting
      // client.data.userId.
      client.emit('authenticated');
    } catch {
      this.disconnect(client, 'Authentication error');
    }
  }

  handleDisconnect(_client: Socket): void {
    // Socket.IO automatically removes the client from all rooms on disconnect.
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  /**
   * Join a conversation room. The server validates that the authenticated user
   * is a participant before admitting them to the room.
   */
  @SubscribeMessage(WS_JOIN_CONVERSATION)
  async onJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinConversationPayload,
  ): Promise<void> {
    const userId = this.requireAuth(client);
    const { conversationId } = payload;

    // Verify participant access — throws ForbiddenException / NotFoundException
    // which @nestjs/websockets converts to WsException automatically.
    try {
      await this.messagesService.getConversation(conversationId, userId);
    } catch {
      throw new WsException('Access denied or conversation not found');
    }

    const room = this.roomName(conversationId);
    await client.join(room);
  }

  /**
   * Send a message via WebSocket. Persists via MessagesService, then broadcasts
   * the saved message to all clients in the conversation room.
   */
  @SubscribeMessage(WS_SEND_MESSAGE)
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    const userId = this.requireAuth(client);
    const { conversationId, content } = payload;

    let message: DirectMessageDto;
    try {
      message = await this.messagesService.sendMessage(
        conversationId,
        userId,
        content,
      );
    } catch {
      throw new WsException('Failed to send message');
    }

    // Broadcast to the entire room (including the sender for confirmation)
    this.server.to(this.roomName(conversationId)).emit(WS_NEW_MESSAGE, message);
  }

  /**
   * Forward typing indicators to the other participant(s) in the room.
   * No persistence — fire-and-forget.
   */
  @SubscribeMessage(WS_TYPING)
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ): void {
    const userId = this.requireAuth(client);
    const { conversationId, isTyping } = payload;

    // Emit to everyone in the room EXCEPT the sender
    client.to(this.roomName(conversationId)).emit(WS_TYPING_INDICATOR, {
      userId,
      conversationId,
      isTyping,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private roomName(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private requireAuth(client: Socket): string {
    const userId = client.data.userId as string | undefined;
    if (!userId) throw new WsException('Unauthenticated');
    return userId;
  }

  private disconnect(client: Socket, reason: string): void {
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}
