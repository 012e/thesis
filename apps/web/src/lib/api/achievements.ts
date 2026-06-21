import type { AchievementDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function getUserAchievements(
  userId: string,
): Promise<AchievementDto[]> {
  const response = await client.getUserAchievements({
    params: { id: userId },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 404) {
    throw new Error("User not found");
  }

  if (response.status === 200) {
    return response.body.achievements;
  }

  throw new Error("Failed to load achievements");
}
