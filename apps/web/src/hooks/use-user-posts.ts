import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchUserPosts } from "@/lib/api/posts";
import { useSession } from "./use-session";

export function useUserPosts(userId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["users", userId, "posts"],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!session && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useUserPostsSuspense(userId: string) {
  return useSuspenseQuery({
    queryKey: ["users", userId, "posts"],
    queryFn: () => fetchUserPosts(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
