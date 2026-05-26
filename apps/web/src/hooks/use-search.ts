import { useQuery } from "@tanstack/react-query";
import { searchPosts, searchUsers } from "@/lib/api/search";
import { useTrack } from "@/components/analytics-provider";
import { useRef, useEffect } from "react";

export const SEARCH_POSTS_QUERY_KEY = (q: string) =>
  ["search", "posts", q] as const;

export const SEARCH_USERS_QUERY_KEY = (q: string) =>
  ["search", "users", q] as const;

export function useSearchPosts(q: string) {
  const trimmed = q.trim();
  const track = useTrack();
  const trackedRef = useRef<string>("");

  const query = useQuery({
    queryKey: SEARCH_POSTS_QUERY_KEY(trimmed),
    queryFn: () => searchPosts(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  useEffect(() => {
    if (query.isSuccess && trimmed.length > 0 && trackedRef.current !== trimmed) {
      trackedRef.current = trimmed;
      track("search", { query: trimmed, resultType: "posts" });
    }
  }, [query.isSuccess, trimmed, track]);

  return query;
}

export function useSearchUsers(q: string) {
  const trimmed = q.trim();
  const track = useTrack();
  const trackedRef = useRef<string>("");

  const query = useQuery({
    queryKey: SEARCH_USERS_QUERY_KEY(trimmed),
    queryFn: async () => {
      const response = await searchUsers({ q: trimmed });
      return response.users;
    },
    enabled: trimmed.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  useEffect(() => {
    if (query.isSuccess && trimmed.length > 0 && trackedRef.current !== trimmed) {
      trackedRef.current = trimmed;
      track("search", { query: trimmed, resultType: "users" });
    }
  }, [query.isSuccess, trimmed, track]);

  return query;
}
