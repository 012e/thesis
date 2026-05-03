import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { UserProfile, UserSearchResult } from "../schemas/user";

const c = initContract();

export const usersContract = c.router({
  // searchUsers MUST be declared before getUserProfile so the static segment
  // "/users/search" is not swallowed by the dynamic ":id" path parameter.
  searchUsers: {
    method: "GET",
    path: "/users/search",
    query: z.object({
      q: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
    responses: {
      200: z.object({
        users: z.array(UserSearchResult),
        total: z.number().int().nonnegative(),
      }),
    },
    summary:
      "Search users by name/email/username, or list all users when query is empty. Supports pagination with total count.",
  },
  // updateAvatar MUST be declared before getUserProfile so the static segment
  // "/users/me/avatar" is not swallowed by the dynamic ":id" path parameter.
  updateAvatar: {
    method: "PATCH",
    path: "/users/me/avatar",
    body: z.object({
      avatarUrl: z.string().url(),
    }),
    responses: {
      200: z.object({ image: z.string().nullable() }),
      401: z.null(),
    },
    summary: "Update the authenticated user's avatar URL in user_profiles.",
  },
  // updateCoverPhoto MUST be declared before getUserProfile so the static segment
  // "/users/me/cover-photo" is not swallowed by the dynamic ":id" path parameter.
  updateCoverPhoto: {
    method: "PATCH",
    path: "/users/me/cover-photo",
    body: z.object({
      coverPhotoUrl: z.string().url(),
    }),
    responses: {
      200: z.object({ coverPhoto: z.string().nullable() }),
      401: z.null(),
    },
    summary:
      "Update the authenticated user's cover photo URL in user_profiles.",
  },
  // updateProfile MUST be declared before getUserProfile so the static segment
  // "/users/me/profile" is not swallowed by the dynamic ":id" path parameter.
  updateProfile: {
    method: "PATCH",
    path: "/users/me/profile",
    body: z.object({
      bio: z.string().max(500).nullable(),
    }),
    responses: {
      200: UserProfile,
      401: z.null(),
    },
    summary: "Update the authenticated user's profile fields (bio).",
  },
  getUserProfile: {
    method: "GET",
    path: "/users/:id/profile",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: UserProfile,
      404: z.null(),
    },
    summary: "Get a user's profile with statistics",
  },
});

export type UsersContract = typeof usersContract;
