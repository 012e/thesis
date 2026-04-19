import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  Conversation,
  DirectMessage,
  SendMessageBody,
  StartConversationBody,
  ListMessagesQuery,
} from '../schemas/message';

const c = initContract();

export const messagesContract = c.router({
  listConversations: {
    method: 'GET',
    path: '/conversations',
    responses: {
      200: z.array(Conversation),
    },
    summary:
      'List all conversations for the current user, sorted by latest activity',
  },

  startConversation: {
    method: 'POST',
    path: '/conversations',
    body: StartConversationBody,
    responses: {
      200: Conversation,
      201: Conversation,
      /** Recipient not found or not followed */
      404: z.null(),
      /** Cannot start a conversation with yourself */
      400: z.null(),
    },
    summary: 'Start or retrieve a conversation with another user (idempotent)',
  },

  /**
   * Placed before getConversation to prevent /conversations/:id matching
   * the literal segment "unread-count".
   */
  getUnreadCount: {
    method: 'GET',
    path: '/conversations/unread-count',
    responses: {
      200: z.object({ total: z.number().int().nonnegative() }),
    },
    summary: 'Get total unread message count for the current user',
  },

  getConversation: {
    method: 'GET',
    path: '/conversations/:id',
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: Conversation,
      403: z.null(),
      404: z.null(),
    },
    summary: 'Get a single conversation by ID',
  },

  listMessages: {
    method: 'GET',
    path: '/conversations/:id/messages',
    pathParams: z.object({ id: z.string().uuid() }),
    query: ListMessagesQuery,
    responses: {
      200: z.object({
        messages: z.array(DirectMessage),
        /** Cursor for the next page (createdAt of the oldest message returned) */
        nextCursor: z.string().datetime().nullable(),
      }),
      403: z.null(),
      404: z.null(),
    },
    summary: 'List messages in a conversation (cursor-based, newest-first)',
  },

  sendMessage: {
    method: 'POST',
    path: '/conversations/:id/messages',
    pathParams: z.object({ id: z.string().uuid() }),
    body: SendMessageBody,
    responses: {
      201: DirectMessage,
      403: z.null(),
      404: z.null(),
    },
    summary:
      'Send a message to a conversation (REST fallback; prefer WebSocket)',
  },

  markConversationRead: {
    method: 'POST',
    path: '/conversations/:id/read',
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: z.null(),
      403: z.null(),
      404: z.null(),
    },
    summary: 'Mark all messages in a conversation as read for the current user',
  },
});

export type MessagesContract = typeof messagesContract;
