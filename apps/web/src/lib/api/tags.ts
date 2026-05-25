import type { TagDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function fetchTag(slug: string): Promise<TagDto | null> {
  const response = await client.getTag({
    params: { slug },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    return null;
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch tag");
}

export interface TagPostsParams {
  slug: string;
  sort?: "top" | "latest";
  limit?: number;
  cursor?: string;
}

export async function fetchTagPosts(params: TagPostsParams) {
  const response = await client.getTagPosts({
    params: { slug: params.slug },
    query: {
      sort: params.sort,
      limit: params.limit,
      cursor: params.cursor,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    return null;
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch tag posts");
}

export interface TrendingTagsParams {
  window?: string;
  limit?: number;
}

export async function fetchTrendingTags(params: TrendingTagsParams = {}) {
  const response = await client.getTrendingTags({
    query: {
      limit: params.limit,
      window: params.window,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch trending tags");
}

export interface TagSuggestionsParams {
  q: string;
  limit?: number;
}

export async function fetchTagSuggestions(params: TagSuggestionsParams) {
  const response = await client.suggestTags({
    query: {
      q: params.q,
      limit: params.limit,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to fetch tag suggestions");
}
