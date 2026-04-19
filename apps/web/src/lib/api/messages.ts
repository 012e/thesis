import type { ConversationDto, DirectMessageDto } from '@repo/shared-dto';
import { client } from '.';

export async function listConversations(): Promise<ConversationDto[]> {
  const response = await client.listConversations();
  if (response.status === 200) {
    return response.body;
  }
  throw new Error('Failed to load conversations');
}

export async function startConversation(
  recipientId: string,
): Promise<ConversationDto> {
  const response = await client.startConversation({ body: { recipientId } });
  if (response.status === 200 || response.status === 201) {
    return response.body;
  }
  if (response.status === 400) {
    throw new Error('Cannot start a conversation with yourself');
  }
  if (response.status === 404) {
    throw new Error('User not found or you must follow them first');
  }
  throw new Error('Failed to start conversation');
}

/**
 * Returns the total number of unread messages across all of the current
 * user's conversations.
 */
export async function getUnreadCount(): Promise<number> {
  const response = await client.getUnreadCount();
  if (response.status === 200) {
    return response.body.total;
  }
  throw new Error('Failed to load unread count');
}

export async function getConversation(
  conversationId: string,
): Promise<ConversationDto> {
  const response = await client.getConversation({
    params: { id: conversationId },
  });
  if (response.status === 200) {
    return response.body;
  }
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  if (response.status === 404) {
    throw new Error('Conversation not found');
  }
  throw new Error('Failed to load conversation');
}

/**
 * Marks all messages in a conversation as read for the current user.
 * Call this when the user opens (or focuses) a conversation view.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const response = await client.markConversationRead({
    params: { id: conversationId },
    body: {},
  });
  if (response.status === 200) {
    return;
  }
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  if (response.status === 404) {
    throw new Error('Conversation not found');
  }
  throw new Error('Failed to mark conversation as read');
}

export async function listMessages(
  conversationId: string,
  options?: { before?: string; limit?: number },
): Promise<{ messages: DirectMessageDto[]; nextCursor: string | null }> {
  const response = await client.listMessages({
    params: { id: conversationId },
    query: {
      before: options?.before,
      limit: options?.limit,
    },
  });
  if (response.status === 200) {
    return response.body;
  }
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  if (response.status === 404) {
    throw new Error('Conversation not found');
  }
  throw new Error('Failed to load messages');
}

export async function sendMessageRest(
  conversationId: string,
  content: string,
): Promise<DirectMessageDto> {
  const response = await client.sendMessage({
    params: { id: conversationId },
    body: { content },
  });
  if (response.status === 201) {
    return response.body;
  }
  if (response.status === 403) {
    throw new Error('Access denied');
  }
  if (response.status === 404) {
    throw new Error('Conversation not found');
  }
  throw new Error('Failed to send message');
}

