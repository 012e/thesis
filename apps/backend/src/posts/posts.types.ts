import type {
  PostContentDto,
  PostDto,
  PostKindDto,
  ReactionTypeDto,
} from "@repo/shared-dto";
import type { z } from "zod";

import type { createPostSchema, updatePostSchema } from "./posts.schemas";

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export type PostRow = {
  id: string;
  authorId: string;
  content: PostContentDto;
  kind: PostKindDto;
  acceptedCommentId: string | null;
  solvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string | null;
    email: string;
    name: string | null;
    image: string | null;
  };
};

export type PostDtoRow = PostRow & {
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  currentUserSubscribed?: boolean;
  currentUserBookmarked?: boolean;
};

export type PostFeedPage = {
  items: PostDto[];
  nextCursor: string | null;
};

export type UserReactionRow = {
  userReactionType: ReactionTypeDto | string | null;
};
