import type { PostType, UserSearchResultType } from "@repo/rest-contracts";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

type SearchUsersParams = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function searchPosts(q: string): Promise<PostType[]> {
  const response = await client.searchPosts({ query: { q } });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to search posts");
}

export async function searchUsers(params: SearchUsersParams = {}): Promise<{
  users: UserSearchResultType[];
  total: number;
}> {
  const response = await client.searchUsers({
    query: {
      q: params.q,
      limit: params.limit,
      offset: params.offset,
    },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to search users");
}
