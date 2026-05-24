import { useQuery } from "@tanstack/react-query";
import { fetchTrendingTags } from "@/lib/api/tags";

export const TRENDING_TAGS_QUERY_KEY = ["tags", "trending"];

export function useTrendingTags(window = "24h", limit = 10) {
  return useQuery({
    queryKey: [...TRENDING_TAGS_QUERY_KEY, window, limit],
    queryFn: () => fetchTrendingTags({ window, limit }),
    staleTime: 60 * 1000, // 1 minute
  });
}
