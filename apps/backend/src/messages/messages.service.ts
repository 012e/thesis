import { and, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ConversationDto,
  ConversationParticipantDto,
  DirectMessageDto,
} from "@repo/shared-dto";

import { DatabaseService } from "@/db/database.service";
import {
  conversations,
  directMessages,
  userFollows,
  userProfiles,
} from "@/db/schema";
import { user } from "@/db/auth-schema";

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class MessagesService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ─── Conversations ──────────────────────────────────────────────────────────

  /**
   * Returns all conversations for a user sorted by most recent activity.
   * Each conversation is enriched with the other participant's profile and
   * the last message (if any).
   */
  async listConversations(userId: string): Promise<ConversationDto[]> {
    const rows = await this.databaseService.db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.userAId, userId),
          eq(conversations.userBId, userId),
        ),
      )
      .orderBy(desc(conversations.updatedAt));

    if (rows.length === 0) return [];

    // Fetch all conversations enriched in parallel
    return Promise.all(rows.map((row) => this.enrichConversation(row, userId)));
  }

  /**
   * Idempotently opens (or retrieves) a 1-on-1 conversation between two users.
   * Enforces a follow relationship: the requester must follow the recipient.
   */
  async findOrCreateConversation(
    requesterId: string,
    recipientId: string,
  ): Promise<{ conversation: ConversationDto; created: boolean }> {
    if (requesterId === recipientId) {
      throw new ForbiddenException("Cannot start a conversation with yourself");
    }

    // Verify the recipient exists
    const [recipient] = await this.databaseService.db
      .select()
      .from(user)
      .where(eq(user.id, recipientId))
      .limit(1);

    if (!recipient) {
      throw new NotFoundException("Recipient not found");
    }

    // Enforce follow relationship: requester must follow recipient
    const [followRow] = await this.databaseService.db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, requesterId),
          eq(userFollows.followeeId, recipientId),
        ),
      )
      .limit(1);

    if (!followRow) {
      throw new NotFoundException(
        "You must follow this user to send them a message",
      );
    }

    // Canonical ordering: smaller ID is always user_a
    const [userAId, userBId] =
      requesterId < recipientId
        ? [requesterId, recipientId]
        : [recipientId, requesterId];

    // Upsert — ON CONFLICT on the unique (user_a_id, user_b_id) pair
    const [row] = await this.databaseService.db
      .insert(conversations)
      .values({ userAId, userBId })
      .onConflictDoNothing()
      .returning();

    const created = !!row;

    // If INSERT was skipped (conflict), fetch the existing row
    const conversation =
      row ??
      (await this.databaseService.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userAId, userAId),
            eq(conversations.userBId, userBId),
          ),
        )
        .limit(1)
        .then(([r]) => r));

    return {
      conversation: await this.enrichConversation(conversation, requesterId),
      created,
    };
  }

  /**
   * Retrieves a single conversation, verifying the requesting user is a participant.
   */
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDto> {
    const [row] = await this.databaseService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!row) throw new NotFoundException("Conversation not found");
    this.assertParticipant(row, userId);

    return this.enrichConversation(row, userId);
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  /**
   * Returns paginated messages for a conversation (newest-first).
   * Uses cursor-based pagination: `before` is the ISO datetime of the oldest
   * message already loaded by the client.
   */
  async listMessages(
    conversationId: string,
    userId: string,
    before?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<{ messages: DirectMessageDto[]; nextCursor: string | null }> {
    const [conv] = await this.databaseService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) throw new NotFoundException("Conversation not found");
    this.assertParticipant(conv, userId);

    const effectiveLimit = Math.min(limit, 100);

    const whereClause = before
      ? and(
          eq(directMessages.conversationId, conversationId),
          lt(directMessages.createdAt, new Date(before)),
        )
      : eq(directMessages.conversationId, conversationId);

    // Fetch one extra to determine if there's a next page
    const rows = await this.databaseService.db
      .select()
      .from(directMessages)
      .where(whereClause)
      .orderBy(desc(directMessages.createdAt))
      .limit(effectiveLimit + 1);

    const hasMore = rows.length > effectiveLimit;
    const pageRows = hasMore ? rows.slice(0, effectiveLimit) : rows;

    const nextCursor = hasMore
      ? pageRows[pageRows.length - 1]!.createdAt.toISOString()
      : null;

    return {
      messages: pageRows.map(this.toDirectMessageDto),
      nextCursor,
    };
  }

  /**
   * Sends a message and bumps the conversation's `updated_at` timestamp so it
   * surfaces at the top of the conversation list.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<DirectMessageDto> {
    const [conv] = await this.databaseService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) throw new NotFoundException("Conversation not found");
    this.assertParticipant(conv, senderId);

    const [message] = await this.databaseService.db
      .insert(directMessages)
      .values({ conversationId, senderId, content, type: "text" })
      .returning();

    // Bump conversation's updatedAt so it rises in the sorted list
    await this.databaseService.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return this.toDirectMessageDto(message!);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Returns the raw participant IDs for a conversation without ownership checks.
   * Used by the WebSocket gateway to resolve the recipient after a message is sent.
   * The caller is responsible for having already validated the sender is a participant.
   */
  async getConversationParticipantIds(
    conversationId: string,
  ): Promise<{ userAId: string; userBId: string }> {
    const [row] = await this.databaseService.db
      .select({
        userAId: conversations.userAId,
        userBId: conversations.userBId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!row) throw new NotFoundException("Conversation not found");
    return row;
  }

  /**
   * Returns the total number of unread messages for a user across all conversations.
   * A message is unread if the user is not the sender and `readAt` is NULL.
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const [result] = await this.databaseService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(directMessages)
      .innerJoin(
        conversations,
        eq(directMessages.conversationId, conversations.id),
      )
      .where(
        and(
          or(
            eq(conversations.userAId, userId),
            eq(conversations.userBId, userId),
          ),
          ne(directMessages.senderId, userId),
          isNull(directMessages.readAt),
        ),
      );

    return result?.count ?? 0;
  }

  /**
   * Marks all unread messages in a conversation as read for the given user.
   * Only affects messages sent by the other participant (not the user's own messages).
   */
  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const [conv] = await this.databaseService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) throw new NotFoundException("Conversation not found");
    this.assertParticipant(conv, userId);

    await this.databaseService.db
      .update(directMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessages.conversationId, conversationId),
          ne(directMessages.senderId, userId),
          isNull(directMessages.readAt),
        ),
      );
  }

  private assertParticipant(
    conversation: typeof conversations.$inferSelect,
    userId: string,
  ): void {
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException(
        "You are not a participant in this conversation",
      );
    }
  }

  private async enrichConversation(
    row: typeof conversations.$inferSelect,
    currentUserId: string,
  ): Promise<ConversationDto> {
    const otherUserId =
      row.userAId === currentUserId ? row.userBId : row.userAId;

    const [otherUserRow] = await this.databaseService.db
      .select({
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername,
        name: user.name,
        image: sql<
          string | null
        >`COALESCE(${userProfiles.avatarUrl}, ${user.image})`,
      })
      .from(user)
      .leftJoin(userProfiles, eq(userProfiles.userId, user.id))
      .where(eq(user.id, otherUserId))
      .limit(1);

    const otherUser: ConversationParticipantDto = {
      id: otherUserRow?.id ?? otherUserId,
      username: otherUserRow?.username ?? null,
      displayUsername: otherUserRow?.displayUsername ?? null,
      name: otherUserRow?.name ?? null,
      image: otherUserRow?.image ?? null,
    };

    // Fetch last message
    const [lastMessageRow] = await this.databaseService.db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, row.id))
      .orderBy(desc(directMessages.createdAt))
      .limit(1);

    return {
      id: row.id,
      otherUser,
      lastMessage: lastMessageRow
        ? this.toDirectMessageDto(lastMessageRow)
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  readonly toDirectMessageDto = (
    row: typeof directMessages.$inferSelect,
  ): DirectMessageDto => ({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: row.content,
    type: row.type,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
