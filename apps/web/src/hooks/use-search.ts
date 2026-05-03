import { useQuery } from "@tanstack/react-query";
import { searchPosts, searchUsers } from "@/lib/api/search";

export const SEARCH_POSTS_QUERY_KEY = (q: string) =>
  ["search", "posts", q] as const;

export const SEARCH_USERS_QUERY_KEY = (q: string) =>
  ["search", "users", q] as const;

export function useSearchPosts(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: SEARCH_POSTS_QUERY_KEY(trimmed),
    queryFn: () => searchPosts(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useSearchUsers(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: SEARCH_USERS_QUERY_KEY(trimmed),
    queryFn: async () => {
      const response = await searchUsers({ q: trimmed });
      return response.users;
    },
    enabled: trimmed.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
