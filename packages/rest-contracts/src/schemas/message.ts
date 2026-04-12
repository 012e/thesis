import { z } from 'zod';

export const DirectMessageType = z.enum(['text']);

export const ConversationParticipant = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export const DirectMessage = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string(),
  content: z.string(),
  type: DirectMessageType,
  /** null until read receipts are implemented */
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const Conversation = z.object({
  id: z.string().uuid(),
  /** The other participant from the perspective of the requesting user. */
  otherUser: ConversationParticipant,
  /** Most recent message in this conversation, if any. */
  lastMessage: DirectMessage.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SendMessageBody = z.object({
  content: z.string().min(1).max(10_000),
});

export const StartConversationBody = z.object({
  /** ID of the user to open a conversation with. */
  recipientId: z.string(),
});

export const ListMessagesQuery = z.object({
  /** Cursor-based pagination: ISO datetime of the oldest message already loaded. */
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type DirectMessageTypeEnum = z.infer<typeof DirectMessageType>;
export type ConversationParticipantType = z.infer<
  typeof ConversationParticipant
>;
export type DirectMessageType2 = z.infer<typeof DirectMessage>;
export type ConversationType = z.infer<typeof Conversation>;
export type SendMessageBodyType = z.infer<typeof SendMessageBody>;
export type StartConversationBodyType = z.infer<typeof StartConversationBody>;
export type ListMessagesQueryType = z.infer<typeof ListMessagesQuery>;
