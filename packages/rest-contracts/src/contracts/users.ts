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
      q: z.string().min(1),
    }),
    responses: {
      200: z.array(UserSearchResult),
    },
    summary:
      "Full-text search users by name, email, or username using ParadeDB BM25. Results ordered by relevance score descending.",
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
