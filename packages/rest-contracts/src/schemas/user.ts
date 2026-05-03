import { z } from "zod";

export const UserSearchResult = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type UserSearchResultType = z.infer<typeof UserSearchResult>;

export const UserProfile = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  coverPhoto: z.string().nullable(),
  bio: z.string().nullable(),
  createdAt: z.string().datetime(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  postCount: z.number().int().nonnegative(),
  isFollowing: z.boolean(),
});

export type UserProfileType = z.infer<typeof UserProfile>;
