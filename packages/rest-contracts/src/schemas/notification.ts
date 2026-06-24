import { z } from "zod";

import { AchievementTier } from "./achievement";

// ─── Type enum ────────────────────────────────────────────────────────────────

export const NotificationType = z.enum([
  "follow",
  "comment",
  "reply",
  "post_update",
  "post_reaction",
  "comment_reaction",
  "direct_message",
  "post_hidden",
  "answer_accepted",
  "achievement_unlocked",
]);

// ─── Payload schemas (per type) ───────────────────────────────────────────────

const NotificationUserContext = z.object({
  id: z.string(),
  username: z.string().nullable(),
  name: z.string().nullable(),
});

const NotificationPostContext = z.object({
  id: z.string().uuid(),
  preview: z.string().nullable(),
  author: NotificationUserContext,
});

const NotificationCommentContext = z.object({
  id: z.string().uuid(),
  preview: z.string(),
  author: NotificationUserContext,
});

export const FollowNotificationPayload = z.object({
  followerId: z.string(),
  followerUsername: z.string().nullable(),
  followerName: z.string().nullable(),
});

export const CommentNotificationPayload = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
  preview: z.string(),
  post: NotificationPostContext.optional(),
  comment: NotificationCommentContext.optional(),
});

export const ReplyNotificationPayload = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid(),
  commentId: z.string().uuid(),
  preview: z.string(),
  post: NotificationPostContext.optional(),
  parentComment: NotificationCommentContext.optional(),
  comment: NotificationCommentContext.optional(),
});

export const PostUpdateNotificationPayload = z.object({
  postId: z.string().uuid(),
  preview: z.string().nullable(),
  post: NotificationPostContext.optional(),
});

export const PostReactionNotificationPayload = z.object({
  postId: z.string().uuid(),
  reactionType: z.enum(["upvote", "downvote"]),
  post: NotificationPostContext.optional(),
});

export const CommentReactionNotificationPayload = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
  reactionType: z.enum(["upvote", "downvote"]),
  post: NotificationPostContext.optional(),
  comment: NotificationCommentContext.optional(),
  xpEarned: z.number().int().positive().optional(),
});

export const DirectMessageNotificationPayload = z.object({
  conversationId: z.string().uuid(),
  preview: z.string(),
});

export const PostHiddenNotificationPayload = z.object({
  postId: z.string().uuid(),
  reason: z.string().nullable(),
  post: NotificationPostContext.optional(),
});

export const AnswerAcceptedNotificationPayload = z.object({
  postId: z.string().uuid(),
  commentId: z.string().uuid(),
  post: NotificationPostContext.optional(),
  comment: NotificationCommentContext.optional(),
  xpEarned: z.number().int().positive().optional(),
});

export const AchievementUnlockedNotificationPayload = z.object({
  tier: AchievementTier,
  label: z.string(),
  threshold: z.number().int().nonnegative(),
});

export const NotificationPayload = z.union([
  FollowNotificationPayload,
  CommentNotificationPayload,
  ReplyNotificationPayload,
  PostUpdateNotificationPayload,
  PostReactionNotificationPayload,
  CommentReactionNotificationPayload,
  DirectMessageNotificationPayload,
  PostHiddenNotificationPayload,
  AnswerAcceptedNotificationPayload,
  AchievementUnlockedNotificationPayload,
]);

// ─── Actor ────────────────────────────────────────────────────────────────────

export const NotificationActor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
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
