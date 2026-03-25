import { z } from "zod";

export const User = z.object({
  id: z.string(),
  username: z.string(),
});

export const ReactionType = z.enum(["upvote", "downvote"]);

export const PostAuthor = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
});

export type UserType = z.infer<typeof User>;
export type ReactionTypeEnum = z.infer<typeof ReactionType>;
export type PostAuthorType = z.infer<typeof PostAuthor>;
