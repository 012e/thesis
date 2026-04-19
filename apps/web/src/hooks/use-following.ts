import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { listFollowing } from "@/lib/api/follows";
import { useSession } from "./use-session";

export function useFollowing(userId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["users", userId, "following"],
    queryFn: () => listFollowing(userId),
    enabled: !!session && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useFollowingSuspense(userId: string) {
  return useSuspenseQuery({
    queryKey: ["users", userId, "following"],
    queryFn: () => listFollowing(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
