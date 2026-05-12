import type {
  PostDto,
  PostContentDto,
  ReactionTypeDto,
} from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function fetchUserPosts(userId: string): Promise<PostDto[]> {
  const response = await client.listUserPosts({
    params: { id: userId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    return [];
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch user posts");
}

export interface FollowingPostsParams {
  limit?: number;
  cursor?: string;
}

export async function fetchFollowingPosts(params: FollowingPostsParams) {
  const response = await client.listFollowingPosts({
    query: {
      limit: params.limit,
      cursor: params.cursor,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch following posts");
}

export async function createPost(content: PostContentDto): Promise<PostDto> {
  const response = await client.createPost({
    body: {
      content,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 201) {
    return response.body;
  }

  throw new Error("Failed to create post");
}

export async function reactToPost(
  postId: string,
  type: ReactionTypeDto,
): Promise<void> {
  const response = await client.reactToPost({
    params: { id: postId },
    body: {
      type,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status !== 200) {
    throw new Error("Failed to react to post");
  }
}

export async function deletePost(postId: string): Promise<PostDto> {
  const response = await client.deletePost({
    params: { id: postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("You are not allowed to delete this post");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to delete post");
}

export async function updatePost(
  postId: string,
  content: PostContentDto,
): Promise<PostDto> {
  const response = await client.updatePost({
    params: { id: postId },
    body: { content },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 403) {
    throw new Error("You are not allowed to edit this post");
  }

  if (response.status === 404) {
    throw new Error("Post not found");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to update post");
}

export async function unreactToPost(postId: string): Promise<void> {
  const response = await client.unreactToPost({
    params: { id: postId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("Reaction not found");
  }

  if (response.status !== 200) {
    throw new Error("Failed to remove reaction");
  }
}
