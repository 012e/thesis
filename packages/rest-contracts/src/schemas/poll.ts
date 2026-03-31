import { z } from "zod";

export const PollVote = z.object({
  postId: z.string().uuid(),
  optionId: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
});

export const PollOptionResult = z.object({
  optionId: z.string(),
  label: z.string(),
  voteCount: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const PollResults = z.object({
  postId: z.string().uuid(),
  totalVotes: z.number().int().nonnegative(),
  options: z.array(PollOptionResult),
  userVotes: z.array(z.string()), // optionIds the user has voted for
  isClosed: z.boolean(),
  closesAt: z.string().datetime().nullable().optional(),
});

export const VotePollBody = z.object({
  optionIds: z.array(z.string()).min(1),
});

export type PollVoteType = z.infer<typeof PollVote>;
export type PollOptionResultType = z.infer<typeof PollOptionResult>;
export type PollResultsType = z.infer<typeof PollResults>;
export type VotePollBodyType = z.infer<typeof VotePollBody>;
