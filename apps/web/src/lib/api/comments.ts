import type { CommentType, CreateCommentBodyType } from "@repo/rest-contracts";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function listComments(postId: string): Promise<CommentType[]> {
  const response = await client.listComments({
    params: { postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  throw new Error("Failed to list comments");
}

export async function createComment(
  postId: string,
  data: CreateCommentBodyType,
): Promise<CommentType> {
  const response = await client.createComment({
    params: { postId },
    body: data,
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 201) {
    return response.body;
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  throw new Error("Failed to create comment");
}

export async function createReply(
  commentId: string,
  content: string,
): Promise<CommentType> {
  const response = await client.createReply({
    params: { id: commentId },
    body: { content },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 201) {
    return response.body;
  }

  if (response.status === 404) {
    throw new Error("Comment not found");
  }

  throw new Error("Failed to create reply");
}

export async function deleteComment(commentId: string): Promise<CommentType> {
  const response = await client.deleteComment({
    params: { id: commentId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  if (response.status === 403) {
    throw new Error("Not authorized to delete this comment");
  }

  if (response.status === 404) {
    throw new Error("Comment not found");
  }

  throw new Error("Failed to delete comment");
}

export async function listCommentReplies(
  commentId: string,
): Promise<CommentType[]> {
  const response = await client.listCommentReplies({
    params: { id: commentId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  if (response.status === 404) {
    throw new Error("Comment not found");
  }

  throw new Error("Failed to list replies");
}
