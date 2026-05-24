import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUserBookmarks } from "@/lib/api/posts";

export const BOOKMARKED_POSTS_QUERY_KEY = ["posts", "bookmarks"] as const;

export interface UseBookmarkedPostsOptions {
  userId: string;
  limit?: number;
  enabled?: boolean;
}

export function useBookmarkedPosts(options: UseBookmarkedPostsOptions) {
  const { userId, limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...BOOKMARKED_POSTS_QUERY_KEY, userId, limit],
    queryFn: ({ pageParam }) =>
      fetchUserBookmarks(userId, {
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled: enabled && Boolean(userId),
  });
}
