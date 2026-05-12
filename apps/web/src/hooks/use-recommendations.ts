import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchRecommendations } from "@/lib/api/recommendations";
import { getNewPosts } from "@/lib/session-storage";
import { useMemo } from "react";

export const RECOMMENDATIONS_QUERY_KEY = ["recommendations"] as const;

export interface UseRecommendationsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = 20, enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: [...RECOMMENDATIONS_QUERY_KEY, limit],
    queryFn: ({ pageParam }) =>
      fetchRecommendations({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });

  // Combine new posts from session storage with fetched posts
  const dataWithNewPosts = useMemo(() => {
    if (!query.data) return query.data;

    const newPosts = getNewPosts();
    return {
      ...query.data,
      pages: query.data.pages.map((page, index) => {
        // Add new posts to the first page only
        if (index === 0) {
          return {
            ...page,
            items: [...newPosts, ...page.items],
          };
        }
        return page;
      }),
    };
  }, [query.data]);

  return {
    ...query,
    data: dataWithNewPosts,
  };
}
