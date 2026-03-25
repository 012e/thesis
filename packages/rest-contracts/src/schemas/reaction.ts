import { z } from "zod";
import { ReactionType } from "./shared";

export const PostReaction = z.object({
  postId: z.string().uuid(),
  userId: z.string(),
  type: ReactionType,
  createdAt: z.string().datetime(),
});

export const PostReactionSummary = z.object({
  upvotes: z.number().int().nonnegative(),
  downvotes: z.number().int().nonnegative(),
  userReaction: ReactionType.nullable(),
});

export const Reactor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
  reactionType: ReactionType,
  reactedAt: z.string().datetime(),
});

export const ReactPostBody = z.object({
  type: ReactionType,
});

export type PostReactionType = z.infer<typeof PostReaction>;
export type PostReactionSummaryType = z.infer<typeof PostReactionSummary>;
export type ReactorType = z.infer<typeof Reactor>;
export type ReactPostBodyType = z.infer<typeof ReactPostBody>;
