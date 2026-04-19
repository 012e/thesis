import type { FollowUserDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function listFollowers(userId: string): Promise<FollowUserDto[]> {
  const response = await client.listFollowers({
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
    return response.body;
  }

  throw new Error("Failed to load followers");
}

export async function listFollowing(userId: string): Promise<FollowUserDto[]> {
  const response = await client.listFollowing({
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
    return response.body;
  }

  throw new Error("Failed to load following");
}
