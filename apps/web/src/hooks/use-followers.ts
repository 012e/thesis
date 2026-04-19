import { useQuery } from "@tanstack/react-query";
import { listFollowers } from "@/lib/api/follows";
import { useSession } from "./use-session";

export function useFollowers(userId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["users", userId, "followers"],
    queryFn: () => listFollowers(userId),
    enabled: !!session && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
