import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFollowingPosts } from "@/lib/api/posts";

export const FOLLOWING_POSTS_QUERY_KEY = ["posts", "following"] as const;

export interface UseFollowingPostsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useFollowingPosts(options: UseFollowingPostsOptions = {}) {
  const { limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...FOLLOWING_POSTS_QUERY_KEY, limit],
    queryFn: ({ pageParam }) =>
      fetchFollowingPosts({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled,
  });
}
