import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { UserFollow } from "../schemas/follow";
import { FollowUser } from "../schemas/follow";

const c = initContract();

export const followsContract = c.router({
  followUser: {
    method: "POST",
    path: "/users/:id/follow",
    pathParams: z.object({ id: z.string() }),
    body: z.undefined(),
    responses: {
      201: UserFollow,
      400: z.null(),
      404: z.null(),
    },
    summary: "Follow another user",
  },
  unfollowUser: {
    method: "DELETE",
    path: "/users/:id/follow",
    pathParams: z.object({ id: z.string() }),
    body: z.undefined(),
    responses: {
      200: UserFollow,
      404: z.null(),
    },
    summary: "Unfollow a user",
  },
  listFollowers: {
    method: "GET",
    path: "/users/:id/followers",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: z.array(FollowUser),
      404: z.null(),
    },
    summary: "List followers of a user",
  },
  listFollowing: {
    method: "GET",
    path: "/users/:id/following",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: z.array(FollowUser),
      404: z.null(),
    },
    summary: "List users followed by a user",
  },
});

export type FollowsContract = typeof followsContract;
