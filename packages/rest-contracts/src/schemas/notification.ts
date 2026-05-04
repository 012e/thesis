import { z } from 'zod';

// ─── Type enum ────────────────────────────────────────────────────────────────

export const NotificationType = z.enum([
  'follow',
  'comment',
  'reply',
  'post_update',
  'post_reaction',
  'comment_reaction',
  'direct_message',
]);

// ─── Payload schemas (per type) ───────────────────────────────────────────────

export const FollowNotificationPayload = z.object({
  followerId: z.string(),
  followerUsername: z.string().nullable(),
  followerName: z.string().nullable(),
});

export const CommentNotificationPayload = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
  preview: z.string(),
});

export const ReplyNotificationPayload = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid(),
  commentId: z.string().uuid(),
  preview: z.string(),
});

export const PostUpdateNotificationPayload = z.object({
  postId: z.string().uuid(),
  preview: z.string().nullable(),
});

export const PostReactionNotificationPayload = z.object({
  postId: z.string().uuid(),
  reactionType: z.enum(['upvote', 'downvote']),
});

export const CommentReactionNotificationPayload = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
  reactionType: z.enum(['upvote', 'downvote']),
});

export const DirectMessageNotificationPayload = z.object({
  conversationId: z.string().uuid(),
  preview: z.string(),
});

export const NotificationPayload = z.union([
  FollowNotificationPayload,
  CommentNotificationPayload,
  ReplyNotificationPayload,
  PostUpdateNotificationPayload,
  PostReactionNotificationPayload,
  CommentReactionNotificationPayload,
  DirectMessageNotificationPayload,
]);

// ─── Actor ────────────────────────────────────────────────────────────────────

export const NotificationActor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
});

// ─── Notification ─────────────────────────────────────────────────────────────

export const Notification = z.object({
  id: z.string().uuid(),
  /** The recipient's user ID. */
  userId: z.string(),
  actorId: z.string().nullable(),
  actor: NotificationActor.nullable(),
  type: NotificationType,
  payload: NotificationPayload,
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

// ─── Query / body ─────────────────────────────────────────────────────────────

export const ListNotificationsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  /** Cursor: ISO datetime of the oldest notification already loaded. */
  before: z.string().datetime().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type NotificationTypeEnum = z.infer<typeof NotificationType>;
export type NotificationPayloadType = z.infer<typeof NotificationPayload>;
export type NotificationType2 = z.infer<typeof Notification>;
export type ListNotificationsQueryType = z.infer<typeof ListNotificationsQuery>;
