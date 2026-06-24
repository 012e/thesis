import { useQuery } from "@tanstack/react-query";
import { getUserAchievements } from "@/lib/api/achievements";
import { useSession } from "./use-session";

export function useUserAchievements(userId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["users", userId, "achievements"],
    queryFn: () => getUserAchievements(userId),
    enabled: !!session && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
