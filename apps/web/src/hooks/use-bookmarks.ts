import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUserBookmarks } from "@/lib/api/posts";

export const BOOKMARKS_QUERY_KEY = ["bookmarks"] as const;

export interface UseBookmarksOptions {
  userId: string;
  limit?: number;
  enabled?: boolean;
}

export function useBookmarks(options: UseBookmarksOptions) {
  const { userId, limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...BOOKMARKS_QUERY_KEY, userId, limit],
    queryFn: ({ pageParam }) =>
      fetchUserBookmarks({
        userId,
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
