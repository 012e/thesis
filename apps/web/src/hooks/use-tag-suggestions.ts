import { useQuery } from "@tanstack/react-query";
import { fetchTagSuggestions } from "@/lib/api/tags";

export function useTagSuggestions(query: string, limit = 5) {
  return useQuery({
    queryKey: ["tags", "suggest", query, limit],
    queryFn: () => fetchTagSuggestions({ q: query, limit }),
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  });
}
