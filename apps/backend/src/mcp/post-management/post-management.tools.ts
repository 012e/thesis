import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";

import { PostsService } from "@/posts/posts.service";

type AuthenticatedRequest = {
  user?: {
    id: string;
  };
};

const pageParameters = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of posts to return"),
  cursor: z
    .string()
    .optional()
    .describe("Opaque cursor returned by the previous page"),
};

function result(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ ok: true, data }) },
    ],
  };
}

function error(
  code: "UNAUTHENTICATED" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT",
  message: string,
) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ ok: false, error: { code, message } }),
      },
    ],
  };
}

@Injectable()
export class PostManagementTools {
  constructor(private readonly postsService: PostsService) {}

  @Tool({
    name: "list_unanswered_questions",
    description: "List unsolved question posts, newest first",
    parameters: z.object(pageParameters),
  })
  async listUnansweredQuestions(
    { limit, cursor }: { limit: number; cursor?: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    return result(
      await this.postsService.listUnansweredQuestions(userId, limit, cursor),
    );
  }

  @Tool({
    name: "accept_answer",
    description:
      "Accept a top-level comment as the answer to a question authored by the current user",
    parameters: z.object({
      postId: z.string().uuid().describe("UUID of the question post"),
      commentId: z
        .string()
        .uuid()
        .describe("UUID of the top-level answer comment"),
    }),
  })
  async acceptAnswer(
    { postId, commentId }: { postId: string; commentId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const post = await this.postsService.getById(postId, userId);
    if (!post) return error("NOT_FOUND", `Post ${postId} was not found.`);
    if (post.authorId !== userId) {
      return error(
        "FORBIDDEN",
        `Only the author of post ${postId} can accept an answer.`,
      );
    }
    if (post.kind !== "question") {
      return error("CONFLICT", `Post ${postId} is not a question.`);
    }

    const updated = await this.postsService.acceptAnswer(
      postId,
      userId,
      commentId,
    );
    if (!updated) {
      return error(
        "CONFLICT",
        `Comment ${commentId} is not a top-level answer on post ${postId}.`,
      );
    }

    return result(updated);
  }

  @Tool({
    name: "clear_accepted_answer",
    description:
      "Clear the accepted answer on a post authored by the current user",
    parameters: z.object({
      postId: z.string().uuid().describe("UUID of the question post"),
    }),
  })
  async clearAcceptedAnswer(
    { postId }: { postId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const post = await this.postsService.getById(postId, userId);
    if (!post) return error("NOT_FOUND", `Post ${postId} was not found.`);
    if (post.authorId !== userId) {
      return error(
        "FORBIDDEN",
        `Only the author of post ${postId} can clear its accepted answer.`,
      );
    }

    const updated = await this.postsService.clearAcceptedAnswer(postId, userId);
    if (!updated) return error("NOT_FOUND", `Post ${postId} was not found.`);

    return result(updated);
  }

  @Tool({
    name: "bookmark_post",
    description: "Bookmark a post for the current user",
    parameters: z.object({
      postId: z.string().uuid().describe("UUID of the post to bookmark"),
    }),
  })
  async bookmarkPost(
    { postId }: { postId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const bookmark = await this.postsService.bookmark(postId, userId);
    if (!bookmark) return error("NOT_FOUND", `Post ${postId} was not found.`);

    return result(bookmark);
  }

  @Tool({
    name: "unbookmark_post",
    description: "Remove the current user's bookmark from a post",
    parameters: z.object({
      postId: z.string().uuid().describe("UUID of the post to unbookmark"),
    }),
  })
  async unbookmarkPost(
    { postId }: { postId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const bookmark = await this.postsService.unbookmark(postId, userId);
    if (!bookmark) {
      return error(
        "NOT_FOUND",
        `No bookmark for post ${postId} exists for the current user.`,
      );
    }

    return result(bookmark);
  }

  @Tool({
    name: "list_my_bookmarks",
    description: "List posts bookmarked by the current authenticated user",
    parameters: z.object(pageParameters),
  })
  async listMyBookmarks(
    { limit, cursor }: { limit: number; cursor?: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    return result(await this.postsService.listBookmarks(userId, limit, cursor));
  }

  @Tool({
    name: "subscribe_to_post",
    description: "Subscribe the current user to updates on a post",
    parameters: z.object({
      postId: z.string().uuid().describe("UUID of the post to subscribe to"),
    }),
  })
  async subscribeToPost(
    { postId }: { postId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const subscription = await this.postsService.subscribe(postId, userId);
    if (!subscription) {
      return error("NOT_FOUND", `Post ${postId} was not found.`);
    }

    return result(subscription);
  }

  @Tool({
    name: "unsubscribe_from_post",
    description: "Remove the current user's subscription from a post",
    parameters: z.object({
      postId: z
        .string()
        .uuid()
        .describe("UUID of the post to unsubscribe from"),
    }),
  })
  async unsubscribeFromPost(
    { postId }: { postId: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const subscription = await this.postsService.unsubscribe(postId, userId);
    if (!subscription) {
      return error(
        "NOT_FOUND",
        `No subscription for post ${postId} exists for the current user.`,
      );
    }

    return result(subscription);
  }
}
