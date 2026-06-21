import type { Context } from "@rekog/mcp-nest";
import { describe, expect, it, vi } from "vitest";

import { PostManagementTools } from "@/mcp/post-management/post-management.tools";
import type { PostsService } from "@/posts/posts.service";

const context = {} as Context;

function parse(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

function createTools(overrides: Partial<PostsService> = {}) {
  const service = {
    getById: vi.fn(),
    listUnansweredQuestions: vi.fn(),
    acceptAnswer: vi.fn(),
    clearAcceptedAnswer: vi.fn(),
    bookmark: vi.fn(),
    unbookmark: vi.fn(),
    listBookmarks: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    ...overrides,
  } as unknown as PostsService;

  return { service, tools: new PostManagementTools(service) };
}

describe("PostManagementTools", () => {
  it("rejects unauthenticated calls", async () => {
    const { tools } = createTools();

    const response = await tools.listMyBookmarks({ limit: 20 }, context, {});

    expect(response.isError).toBe(true);
    expect(parse(response).error.code).toBe("UNAUTHENTICATED");
  });

  it("always scopes bookmark listing to the authenticated user", async () => {
    const listBookmarks = vi.fn().mockResolvedValue({
      items: [],
      nextCursor: "next",
    });
    const { tools } = createTools({ listBookmarks });

    const response = await tools.listMyBookmarks(
      { limit: 5, cursor: "cursor" },
      context,
      { user: { id: "user-1" } },
    );

    expect(listBookmarks).toHaveBeenCalledWith("user-1", 5, "cursor");
    expect(parse(response)).toEqual({
      ok: true,
      data: { items: [], nextCursor: "next" },
    });
  });

  it("rejects answer acceptance by a non-owner", async () => {
    const acceptAnswer = vi.fn();
    const { tools } = createTools({
      getById: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        authorId: "owner",
        kind: "question",
      }),
      acceptAnswer,
    });

    const response = await tools.acceptAnswer(
      {
        postId: "11111111-1111-4111-8111-111111111111",
        commentId: "22222222-2222-4222-8222-222222222222",
      },
      context,
      { user: { id: "other-user" } },
    );

    expect(parse(response).error.code).toBe("FORBIDDEN");
    expect(acceptAnswer).not.toHaveBeenCalled();
  });

  it("returns a conflict for an invalid answer comment", async () => {
    const postId = "11111111-1111-4111-8111-111111111111";
    const commentId = "22222222-2222-4222-8222-222222222222";
    const { tools } = createTools({
      getById: vi.fn().mockResolvedValue({
        id: postId,
        authorId: "owner",
        kind: "question",
      }),
      acceptAnswer: vi.fn().mockResolvedValue(null),
    });

    const response = await tools.acceptAnswer({ postId, commentId }, context, {
      user: { id: "owner" },
    });

    expect(parse(response).error.code).toBe("CONFLICT");
  });

  it("returns the existing bookmark when bookmarking is idempotent", async () => {
    const bookmark = {
      postId: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const { tools } = createTools({
      bookmark: vi.fn().mockResolvedValue(bookmark),
    });

    const response = await tools.bookmarkPost(
      { postId: bookmark.postId },
      context,
      { user: { id: "user-1" } },
    );

    expect(parse(response)).toEqual({ ok: true, data: bookmark });
  });

  it("reports missing bookmark and subscription removals", async () => {
    const postId = "11111111-1111-4111-8111-111111111111";
    const { tools } = createTools({
      unbookmark: vi.fn().mockResolvedValue(null),
      unsubscribe: vi.fn().mockResolvedValue(null),
    });

    const unbookmark = await tools.unbookmarkPost({ postId }, context, {
      user: { id: "user-1" },
    });
    const unsubscribe = await tools.unsubscribeFromPost({ postId }, context, {
      user: { id: "user-1" },
    });

    expect(parse(unbookmark).error.code).toBe("NOT_FOUND");
    expect(parse(unsubscribe).error.code).toBe("NOT_FOUND");
  });
});
