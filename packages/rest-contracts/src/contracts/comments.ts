import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { Comment, CreateCommentBody } from "../schemas/comment";

const c = initContract();

export const commentsContract = c.router({
  listComments: {
    method: "GET",
    path: "/posts/:postId/comments",
    pathParams: z.object({ postId: z.string().uuid() }),
    responses: {
      200: z.array(Comment),
      404: z.null(),
    },
    summary: "List comments for a post",
  },
  createComment: {
    method: "POST",
    path: "/posts/:postId/comments",
    pathParams: z.object({ postId: z.string().uuid() }),
    body: CreateCommentBody,
    responses: {
      201: Comment,
      404: z.null(),
    },
    summary: "Create a comment for a post",
  },
  deleteComment: {
    method: "DELETE",
    path: "/comments/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.undefined(),
    responses: {
      200: Comment,
      403: z.null(),
      404: z.null(),
    },
    summary: "Delete a comment",
  },
  getComment: {
    method: "GET",
    path: "/comments/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: Comment,
      404: z.null(),
    },
    summary: "Get a single comment",
  },
  listCommentReplies: {
    method: "GET",
    path: "/comments/:id/replies",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.array(Comment),
      404: z.null(),
    },
    summary: "List direct replies to a comment",
  },
  createReply: {
    method: "POST",
    path: "/comments/:id/replies",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({ content: z.string().min(1) }),
    responses: {
      201: Comment,
      404: z.null(),
    },
    summary: "Create a reply to a comment",
  },
});

export type CommentsContract = typeof commentsContract;
