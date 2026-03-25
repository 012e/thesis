import { z } from "zod";

export const FollowUser = z.object({
  id: z.string(),
  username: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
});

export const UserFollow = z.object({
  followerId: z.string(),
  followeeId: z.string(),
  createdAt: z.string().datetime(),
});

export type FollowUserType = z.infer<typeof FollowUser>;
export type UserFollowType = z.infer<typeof UserFollow>;
