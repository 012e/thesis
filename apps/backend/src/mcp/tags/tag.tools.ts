import { Injectable } from "@nestjs/common";
import { Tool, type Context } from "@rekog/mcp-nest";
import { z } from "zod";

import { TagsService } from "@/tags/tags.service";

type AuthenticatedRequest = {
  user?: {
    id: string;
  };
};

function result(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ ok: true, data }) },
    ],
  };
}

function error(code: "UNAUTHENTICATED" | "NOT_FOUND", message: string) {
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
export class TagTools {
  constructor(private readonly tagsService: TagsService) {}

  @Tool({
    name: "get_trending_tags",
    description: "Get tags with the most posts in a recent time window",
    parameters: z.object({
      limit: z.number().int().min(1).max(50).default(10),
      windowHours: z.number().int().min(1).max(168).default(24),
    }),
  })
  async getTrendingTags(
    { limit, windowHours }: { limit: number; windowHours: number },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    if (!request.user) {
      return error("UNAUTHENTICATED", "Authentication is required.");
    }
    return result(await this.tagsService.getTrendingTags(limit, windowHours));
  }

  @Tool({
    name: "suggest_tags",
    description: "Suggest tags whose slugs start with a query",
    parameters: z.object({
      query: z.string().min(1).describe("Tag slug prefix"),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  })
  async suggestTags(
    { query, limit }: { query: string; limit: number },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    if (!request.user) {
      return error("UNAUTHENTICATED", "Authentication is required.");
    }
    return result(await this.tagsService.suggestTags(query, limit));
  }

  @Tool({
    name: "get_tag",
    description: "Get tag metadata by slug",
    parameters: z.object({
      slug: z.string().min(1).describe("Tag slug"),
    }),
  })
  async getTag(
    { slug }: { slug: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    if (!request.user) {
      return error("UNAUTHENTICATED", "Authentication is required.");
    }
    const tag = await this.tagsService.getTag(slug);
    if (!tag) return error("NOT_FOUND", `Tag ${slug} was not found.`);
    return result(tag);
  }

  @Tool({
    name: "get_posts_by_tag",
    description: "Get a cursor-paginated page of posts associated with a tag",
    parameters: z.object({
      slug: z.string().min(1).describe("Tag slug"),
      sort: z.enum(["top", "latest"]).default("top"),
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z
        .string()
        .optional()
        .describe("Opaque cursor from the previous page"),
    }),
  })
  async getPostsByTag(
    {
      slug,
      sort,
      limit,
      cursor,
    }: {
      slug: string;
      sort: "top" | "latest";
      limit: number;
      cursor?: string;
    },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const page = await this.tagsService.listPostsByTag(
      slug,
      userId,
      sort,
      limit,
      cursor,
    );
    if (!page) return error("NOT_FOUND", `Tag ${slug} was not found.`);
    return result(page);
  }

  @Tool({
    name: "list_my_tag_preferences",
    description: "List the current user's preferred and blocked tags",
    parameters: z.object({}),
  })
  async listMyTagPreferences(
    _parameters: Record<string, never>,
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");
    return result(await this.tagsService.listUserTagPreferences(userId));
  }

  @Tool({
    name: "set_tag_preference",
    description: "Set or replace the current user's preference for a tag",
    parameters: z.object({
      slug: z.string().min(1).describe("Tag slug"),
      preference: z.enum(["preferred", "blocked"]),
    }),
  })
  async setTagPreference(
    { slug, preference }: { slug: string; preference: "preferred" | "blocked" },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const updated = await this.tagsService.setUserTagPreference(
      userId,
      slug,
      preference,
    );
    if (!updated) return error("NOT_FOUND", `Tag ${slug} was not found.`);
    return result(updated);
  }

  @Tool({
    name: "remove_tag_preference",
    description: "Remove the current user's preference for a tag",
    parameters: z.object({
      slug: z.string().min(1).describe("Tag slug"),
    }),
  })
  async removeTagPreference(
    { slug }: { slug: string },
    _context: Context,
    request: AuthenticatedRequest,
  ) {
    const userId = request.user?.id;
    if (!userId) return error("UNAUTHENTICATED", "Authentication is required.");

    const deleted = await this.tagsService.deleteUserTagPreference(
      userId,
      slug,
    );
    if (!deleted) {
      return error(
        "NOT_FOUND",
        `No preference for tag ${slug} exists for the current user.`,
      );
    }
    return result({ slug, removed: true });
  }
}
