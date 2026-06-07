import { z } from "zod";

export interface UserSearchResultDto {
  id: string;
  username: string | null;
  displayUsername: string | null;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
}

export interface AITokenUsageDto {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
}

export interface PollPostOptionDto {
  id: string;
  label: string;
}

export interface PollPostContentDto {
  question: string;
  options: PollPostOptionDto[];
  allowsMultipleSelections: boolean;
  closesAt?: string | null;
}

export type VisualizationTypeDto = "bar" | "line" | "pie" | "table";

export interface VisualizationDataPointDto {
  label: string;
  value: number;
}

export interface VisualizationPostContentDto {
  title: string;
  visualizationType: VisualizationTypeDto;
  data: VisualizationDataPointDto[];
  description?: string;
  unit?: string;
}

export interface PostImageDto {
  url: string;
  key: string;
  width: number;
  height: number;
}

export interface PostContentDto {
  text?: string;
  poll?: PollPostContentDto;
  visualization?: VisualizationPostContentDto;
  images?: PostImageDto[];
}

export interface PostAuthorDto {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
  image: string | null;
}

export interface PostDto {
  id: string;
  authorId: string;
  author: PostAuthorDto;
  content: PostContentDto;
  createdAt: string;
  updatedAt: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  currentUserReaction: ReactionTypeDto | null;
  currentUserUpvoted: boolean;
  currentUserDownvoted: boolean;
  currentUserSubscribed: boolean;
  currentUserBookmarked: boolean;
  tags: PostTagDto[];
}

export interface BookmarkSummaryDto {
  postId: string;
  createdAt: string;
}

export interface PostSubscriptionDto {
  postId: string;
  userId: string;
  createdAt: string;
}

export type ReactionTypeDto = "upvote" | "downvote";

export interface PostReactionDto {
  postId: string;
  userId: string;
  type: ReactionTypeDto;
  createdAt: string;
}

export interface PostReactionSummaryDto {
  upvotes: number;
  downvotes: number;
  userReaction: ReactionTypeDto | null;
}

export interface ReactorDto {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
  reactionType: ReactionTypeDto;
  reactedAt: string;
}

export interface FollowUserDto {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
  image: string | null;
}

export interface UserFollowDto {
  followerId: string;
  followeeId: string;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  author: PostAuthorDto;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvoteCount: number;
  downvoteCount: number;
  currentUserReaction: ReactionTypeDto | null;
}

export interface CommentReactionDto {
  commentId: string;
  userId: string;
  type: ReactionTypeDto;
  createdAt: string;
}

export interface CommentReactionSummaryDto {
  upvotes: number;
  downvotes: number;
  userReaction: ReactionTypeDto | null;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string;
}

export interface UserProfileDto {
  id: string;
  username: string | null;
  displayUsername: string | null;
  email: string;
  name: string | null;
  image: string | null;
  coverPhoto: string | null;
  bio: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
}

export interface PollVoteDto {
  postId: string;
  optionId: string;
  userId: string;
  createdAt: string;
}

export interface PollOptionResultDto {
  optionId: string;
  label: string;
  voteCount: number;
  percentage: number;
}

export interface PollResultsDto {
  postId: string;
  totalVotes: number;
  options: PollOptionResultDto[];
  userVotes: string[];
  isClosed: boolean;
  closesAt?: string | null;
}

// ─── Direct Messaging ────────────────────────────────────────────────────────

/** Supported message content types. Extensible for future types (image, file…). */
export type DirectMessageTypeDto = "text";

export interface DirectMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: DirectMessageTypeDto;
  /** ISO datetime. null means not yet read (reserved for future read receipts). */
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipantDto {
  id: string;
  username: string | null;
  displayUsername: string | null;
  name: string | null;
  image: string | null;
}

export interface ConversationDto {
  id: string;
  /** The other participant from the perspective of the requesting user. */
  otherUser: ConversationParticipantDto;
  /** Most recent message in this conversation, if any. */
  lastMessage: DirectMessageDto | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** All possible notification trigger types. */
export type NotificationTypeDto =
  | "follow"
  | "comment"
  | "reply"
  | "post_update"
  | "post_reaction"
  | "comment_reaction"
  | "direct_message"
  | "post_hidden";

export interface NotificationUserContextDto {
  id: string;
  username: string | null;
  name: string | null;
}

export interface NotificationPostContextDto {
  id: string;
  preview: string | null;
  author: NotificationUserContextDto;
}

export interface NotificationCommentContextDto {
  id: string;
  preview: string;
  author: NotificationUserContextDto;
}

/** Someone followed the recipient. */
export interface FollowNotificationPayload {
  followerId: string;
  followerUsername: string | null;
  followerName: string | null;
}

/** Someone commented on the recipient's post. */
export interface CommentNotificationPayload {
  postId: string;
  commentId: string;
  /** First 100 characters of the comment content. */
  preview: string;
  post?: NotificationPostContextDto;
  comment?: NotificationCommentContextDto;
}

/** Someone replied to the recipient's comment. */
export interface ReplyNotificationPayload {
  postId: string;
  parentCommentId: string;
  commentId: string;
  /** First 100 characters of the reply content. */
  preview: string;
  post?: NotificationPostContextDto;
  parentComment?: NotificationCommentContextDto;
  comment?: NotificationCommentContextDto;
}

/** A subscribed post was edited. */
export interface PostUpdateNotificationPayload {
  postId: string;
  /** First 100 characters of the updated post text, when available. */
  preview: string | null;
  post?: NotificationPostContextDto;
}

/** Someone reacted to the recipient's post. */
export interface PostReactionNotificationPayload {
  postId: string;
  reactionType: ReactionTypeDto;
  post?: NotificationPostContextDto;
}

/** Someone reacted to the recipient's comment. */
export interface CommentReactionNotificationPayload {
  postId: string;
  commentId: string;
  reactionType: ReactionTypeDto;
  post?: NotificationPostContextDto;
  comment?: NotificationCommentContextDto;
}

/** Someone sent the recipient a direct message. */
export interface DirectMessageNotificationPayload {
  conversationId: string;
  /** First 100 characters of the message content. */
  preview: string;
}

/** The recipient's post was hidden by the moderation system. */
export interface PostHiddenNotificationPayload {
  postId: string;
  /** Human-readable reason why the post was hidden (e.g. moderation source). */
  reason: string | null;
  post?: NotificationPostContextDto;
}

/** Discriminated union of all possible notification payloads. */
export type NotificationPayloadDto =
  | FollowNotificationPayload
  | CommentNotificationPayload
  | ReplyNotificationPayload
  | PostUpdateNotificationPayload
  | PostReactionNotificationPayload
  | CommentReactionNotificationPayload
  | DirectMessageNotificationPayload
  | PostHiddenNotificationPayload;

// ─── AI Context ──────────────────────────────────────────────────────────────

/**
 * JSON-safe serialized AI context payload.
 * Shared between apps/web (serialization) and apps/ai (tool return value + Zod schema).
 * Uses a discriminated union so switch statements are exhaustively checked at compile time.
 */
export type AIContextPayload =
  | { readonly type: "none" }
  | {
      readonly type: "page";
      readonly page: string;
      readonly label: string;
    }
  | {
      readonly type: "post";
      readonly postId: string;
      readonly authorUsername: string;
      readonly contentPreview: string;
      readonly createdAt: string;
    }
  | {
      readonly type: "user-profile";
      readonly userId: string;
      readonly username: string;
      readonly displayName: string;
    };

export const AIContextPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("page"),
    page: z.string(),
    label: z.string(),
  }),
  z.object({
    type: z.literal("post"),
    postId: z.string(),
    authorUsername: z.string(),
    contentPreview: z.string(),
    createdAt: z.string(),
  }),
  z.object({
    type: z.literal("user-profile"),
    userId: z.string(),
    username: z.string(),
    displayName: z.string(),
  }),
]);

/**
 * Converts an AIContextPayload to a brief one-line hint for LLM system instructions.
 * Returns null when type is "none" (no context to inject).
 *
 * Examples:
 *   "User context: He is currently viewing a post by @alice"
 *   "User context: He is currently on the Playground page"
 *   "User context: He is currently viewing @bob's profile"
 */
export function formatContextHint(ctx: AIContextPayload): string | null {
  switch (ctx.type) {
    case "none":
      return null;
    case "page":
      return `User context: He is currently on the ${ctx.label} page`;
    case "post":
      return `User context: He is currently viewing a post by @${ctx.authorUsername}`;
    case "user-profile":
      return `User context: He is currently viewing @${ctx.username}'s profile`;
  }
}

export interface NotificationDto {
  id: string;
  /** The recipient of this notification. */
  userId: string;
  /** The user who triggered the notification (follower, commenter, reactor, sender). */
  actorId: string | null;
  /** Display info for the actor — resolved server-side for convenience. */
  actor: {
    id: string;
    username: string | null;
    email: string;
    name: string | null;
    image: string | null;
  } | null;
  type: NotificationTypeDto;
  payload: NotificationPayloadDto;
  /** ISO datetime when the notification was read. null = unread. */
  readAt: string | null;
  createdAt: string;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface TagDto {
  id: string;
  slug: string;
  displayName: string;
  postCount: number;
}

export interface PostTagDto {
  id: string;
  slug: string;
  displayName: string;
}

export type TagPreferenceKindDto = "preferred" | "blocked";

export interface TagPreferenceDto {
  id: string;
  slug: string;
  displayName: string;
  postCount: number;
  preference: TagPreferenceKindDto;
  createdAt: string;
  updatedAt: string;
}

export interface UserTagPreferencesDto {
  preferred: TagPreferenceDto[];
  blocked: TagPreferenceDto[];
}

// ─── Content Moderation ──────────────────────────────────────────────────────

export type ModerationStatusDto =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_human_review";

export type ModerationSourceDto =
  | "auto_duplicate"
  | "auto_harmful"
  | "user_report"
  | "admin_flag";

export type FlagPriorityDto = "low" | "medium" | "high" | "critical";

export type ReportReasonDto =
  | "spam"
  | "harassment"
  | "misinformation"
  | "hate_speech"
  | "violence"
  | "inappropriate"
  | "copyright"
  | "other";

export interface PostModerationDto {
  id: string;
  postId: string;
  source: ModerationSourceDto;
  status: ModerationStatusDto;
  priority: FlagPriorityDto;
  llmConfidence: string | null;
  llmSummary: string | null;
  similarPostId: string | null;
  similarityScore: string | null;
  moderationResult: unknown | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostReportDto {
  id: string;
  postId: string;
  reporterId: string;
  reason: ReportReasonDto;
  description: string | null;
  passedHeuristic: boolean;
  moderationId: string | null;
  createdAt: string;
}

export interface PostFlagDto {
  id: string;
  postId: string;
  flaggedBy: string;
  priority: FlagPriorityDto;
  reason: string | null;
  moderationId: string | null;
  createdAt: string;
}
