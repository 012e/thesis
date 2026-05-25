import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { Tag, TrendingTagsPage, TagSuggestionsPage } from "../schemas/tag";
import { Post } from "../schemas/post";

const c = initContract();

export const tagsContract = c.router({
  getTrendingTags: {
    method: "GET",
    path: "/tags/trending",
    query: z.object({
      limit: z.coerce.number().int().positive().max(50).optional(),
      window: z.string().optional(),
    }),
    responses: {
      200: TrendingTagsPage,
    },
    summary: "Get trending tags for a given time window.",
  },
  suggestTags: {
    method: "GET",
    path: "/tags/suggest",
    query: z.object({
      q: z.string().min(1),
      limit: z.coerce.number().int().positive().max(20).optional(),
    }),
    responses: {
      200: TagSuggestionsPage,
    },
    summary: "Suggest tags matching a prefix query for composer autocomplete.",
  },
  getTag: {
    method: "GET",
    path: "/tags/:slug",
    pathParams: z.object({ slug: z.string() }),
    responses: {
      200: Tag,
      404: z.null(),
    },
    summary: "Get metadata for a specific tag by slug.",
  },
  getTagPosts: {
    method: "GET",
    path: "/tags/:slug/posts",
    pathParams: z.object({ slug: z.string() }),
    query: z.object({
      sort: z.enum(["top", "latest"]).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      cursor: z.string().optional(),
    }),
    responses: {
      200: z.object({
        items: z.array(Post),
        nextCursor: z.string().nullable(),
      }),
      404: z.null(),
    },
    summary:
      "Get paginated posts for a tag, ordered by sort (top or latest). Paginated with keyset cursor.",
  },
});

export type TagsContract = typeof tagsContract;
