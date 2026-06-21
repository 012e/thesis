import type { Context } from "@rekog/mcp-nest";
import { describe, expect, it, vi } from "vitest";

import { TagTools } from "@/mcp/tags/tag.tools";
import type { TagsService } from "@/tags/tags.service";

const context = {} as Context;

function parse(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

function createTools(overrides: Partial<TagsService> = {}) {
  const service = {
    getTrendingTags: vi.fn(),
    suggestTags: vi.fn(),
    getTag: vi.fn(),
    listPostsByTag: vi.fn(),
    listUserTagPreferences: vi.fn(),
    setUserTagPreference: vi.fn(),
    deleteUserTagPreference: vi.fn(),
    ...overrides,
  } as unknown as TagsService;

  return { service, tools: new TagTools(service) };
}

describe("TagTools", () => {
  it("rejects unauthenticated calls", async () => {
    const { tools } = createTools();

    const response = await tools.listMyTagPreferences({}, context, {});

    expect(response.isError).toBe(true);
    expect(parse(response).error.code).toBe("UNAUTHENTICATED");
  });

  it("passes tag sorting and pagination to the existing service", async () => {
    const listPostsByTag = vi.fn().mockResolvedValue({
      items: [],
      nextCursor: "next",
    });
    const { tools } = createTools({ listPostsByTag });

    const response = await tools.getPostsByTag(
      {
        slug: "react",
        sort: "latest",
        limit: 5,
        cursor: "cursor",
      },
      context,
      { user: { id: "user-1" } },
    );

    expect(listPostsByTag).toHaveBeenCalledWith(
      "react",
      "user-1",
      "latest",
      5,
      "cursor",
    );
    expect(parse(response).data.nextCursor).toBe("next");
  });

  it("reports missing tags explicitly", async () => {
    const { tools } = createTools({
      getTag: vi.fn().mockResolvedValue(null),
      listPostsByTag: vi.fn().mockResolvedValue(null),
      setUserTagPreference: vi.fn().mockResolvedValue(null),
    });
    const request = { user: { id: "user-1" } };

    const getTag = await tools.getTag({ slug: "missing" }, context, request);
    const getPosts = await tools.getPostsByTag(
      { slug: "missing", sort: "top", limit: 20 },
      context,
      request,
    );
    const setPreference = await tools.setTagPreference(
      { slug: "missing", preference: "blocked" },
      context,
      request,
    );

    expect(parse(getTag).error.code).toBe("NOT_FOUND");
    expect(parse(getPosts).error.code).toBe("NOT_FOUND");
    expect(parse(setPreference).error.code).toBe("NOT_FOUND");
  });

  it("replaces a preference and returns the resulting state", async () => {
    const preference = {
      id: "tag-id",
      slug: "react",
      displayName: "React",
      postCount: 10,
      preference: "blocked",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const setUserTagPreference = vi.fn().mockResolvedValue(preference);
    const { tools } = createTools({ setUserTagPreference });

    const response = await tools.setTagPreference(
      { slug: "react", preference: "blocked" },
      context,
      { user: { id: "user-1" } },
    );

    expect(setUserTagPreference).toHaveBeenCalledWith(
      "user-1",
      "react",
      "blocked",
    );
    expect(parse(response)).toEqual({ ok: true, data: preference });
  });

  it("reports missing preference deletion", async () => {
    const { tools } = createTools({
      deleteUserTagPreference: vi.fn().mockResolvedValue(false),
    });

    const response = await tools.removeTagPreference(
      { slug: "react" },
      context,
      { user: { id: "user-1" } },
    );

    expect(parse(response).error.code).toBe("NOT_FOUND");
  });
});
