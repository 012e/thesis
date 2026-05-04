export interface UserSearchResultDto {
  id: string;
  username: string | null;
  displayUsername: string | null;
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
  currentUserSubscribed: boolean;
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
  | 'follow'
  | 'comment'
  | 'reply'
  | 'post_update'
  | 'post_reaction'
  | 'comment_reaction'
  | 'direct_message';

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
}

/** Someone replied to the recipient's comment. */
export interface ReplyNotificationPayload {
  postId: string;
  parentCommentId: string;
  commentId: string;
  /** First 100 characters of the reply content. */
  preview: string;
}

/** A subscribed post was edited. */
export interface PostUpdateNotificationPayload {
  postId: string;
  /** First 100 characters of the updated post text, when available. */
  preview: string | null;
}

/** Someone reacted to the recipient's post. */
export interface PostReactionNotificationPayload {
  postId: string;
  reactionType: ReactionTypeDto;
}

/** Someone reacted to the recipient's comment. */
export interface CommentReactionNotificationPayload {
  postId: string;
  commentId: string;
  reactionType: ReactionTypeDto;
}

/** Someone sent the recipient a direct message. */
export interface DirectMessageNotificationPayload {
  conversationId: string;
  /** First 100 characters of the message content. */
  preview: string;
}

/** Discriminated union of all possible notification payloads. */
export type NotificationPayloadDto =
  | FollowNotificationPayload
  | CommentNotificationPayload
  | ReplyNotificationPayload
  | PostUpdateNotificationPayload
  | PostReactionNotificationPayload
  | CommentReactionNotificationPayload
  | DirectMessageNotificationPayload;

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
    name: string | null;
  } | null;
  type: NotificationTypeDto;
  payload: NotificationPayloadDto;
  /** ISO datetime when the notification was read. null = unread. */
  readAt: string | null;
  createdAt: string;
}
