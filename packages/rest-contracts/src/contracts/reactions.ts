import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ReactionType } from "../schemas/shared";
import {
  Reactor,
  PostReaction,
  PostReactionSummary,
  ReactPostBody,
} from "../schemas/reaction";

const c = initContract();

export const reactionsContract = c.router({
  reactToPost: {
    method: "PUT",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ReactPostBody,
    responses: {
      200: PostReaction,
      404: z.null(),
    },
    summary: "Upvote or downvote a post (replaces any existing reaction)",
  },
  unreactToPost: {
    method: "DELETE",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: PostReaction,
      404: z.null(),
    },
    summary: "Remove the current user's reaction from a post",
  },
  getReactionSummary: {
    method: "GET",
    path: "/posts/:id/reaction",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: PostReactionSummary,
      404: z.null(),
    },
    summary: "Get upvote/downvote counts and the current user's reaction",
  },
  listReactors: {
    method: "GET",
    path: "/posts/:id/reactors",
    pathParams: z.object({ id: z.string().uuid() }),
    query: z.object({
      type: ReactionType.optional(),
    }),
    responses: {
      200: z.array(Reactor),
      404: z.null(),
    },
    summary: "List users who reacted to a post, optionally filtered by type",
  },
});

export type ReactionsContract = typeof reactionsContract;
