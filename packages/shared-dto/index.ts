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

export interface PostContentDto {
  text?: string;
  poll?: PollPostContentDto;
  visualization?: VisualizationPostContentDto;
}

export interface PostAuthorDto {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
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
  currentUserReaction: ReactionTypeDto | null;
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
