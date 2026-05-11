import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  Post,
  CreatePostBody,
  UpdatePostBody,
  RecommendationPage,
} from "../schemas/post";

const c = initContract();

export const postsContract = c.router({
  listPosts: {
    method: "GET",
    path: "/posts",
    responses: {
      200: z.array(Post),
    },
    summary: "List social media posts",
  },
  createPost: {
    method: "POST",
    path: "/posts",
    body: CreatePostBody,
    responses: {
      201: Post,
    },
    summary: "Create a social media post",
  },
  searchPosts: {
    method: "GET",
    path: "/posts/search",
    query: z.object({
      q: z.string().min(1),
    }),
    responses: {
      200: z.array(Post),
    },
    summary:
      "Full-text search posts by content text using ParadeDB BM25. Results are ordered by relevance score descending.",
  },
  listFollowingPosts: {
    method: "GET",
    path: "/posts/following",
    responses: {
      200: z.array(Post),
    },
    summary:
      "List newest posts from users followed by the current user, ordered by creation date descending.",
  },
  getPost: {
    method: "GET",
    path: "/posts/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: Post,
      404: z.null(),
    },
    summary: "Get a social media post",
  },
  updatePost: {
    method: "PUT",
    path: "/posts/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: UpdatePostBody,
    responses: {
      200: Post,
      403: z.null(),
      404: z.null(),
    },
    summary: "Update a social media post",
  },
  deletePost: {
    method: "DELETE",
    path: "/posts/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: Post,
      403: z.null(),
      404: z.null(),
    },
    summary: "Delete a social media post",
  },
  getRecommendations: {
    method: "GET",
    path: "/recommendations",
    query: z.object({
      limit: z.coerce.number().int().positive().max(100).optional(),
      cursor: z.string().optional(),
    }),
    responses: {
      200: RecommendationPage,
    },
    summary:
      "Get recommended posts for the current user, ordered by total reaction count descending. Paginated with a keyset cursor encoding (reactionCount, postId).",
  },
  listUserPosts: {
    method: "GET",
    path: "/users/:id/posts",
    pathParams: z.object({ id: z.string() }),
    responses: {
      200: z.array(Post),
      404: z.null(),
    },
    summary:
      "List posts by a specific user, ordered by creation date descending.",
  },
});

export type PostsContract = typeof postsContract;
