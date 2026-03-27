import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/lib/api/users";
import { useSession } from "./use-session";

export function useUserProfile(userId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["users", userId, "profile"],
    queryFn: () => getUserProfile(userId),
    enabled: !!session && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
