import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUserPosts } from "@/lib/api/posts";
import { useSession } from "./use-session";

export const USER_POSTS_QUERY_KEY = (userId: string) =>
  ["users", userId, "posts"] as const;

export interface UseUserPostsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useUserPosts(
  userId: string,
  options: UseUserPostsOptions = {},
) {
  const { data: session } = useSession();
  const { limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...USER_POSTS_QUERY_KEY(userId), limit],
    queryFn: ({ pageParam }) =>
      fetchUserPosts({
        userId,
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!session && !!userId && enabled,
  });
}
