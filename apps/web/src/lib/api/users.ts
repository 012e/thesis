import type { LeaderboardEntryDto, UserProfileDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { client } from ".";

export async function getLeaderboard(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ entries: LeaderboardEntryDto[]; total: number }> {
  const response = await client.getLeaderboard({
    query: { limit: params?.limit, offset: params?.offset },
  });

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to load leaderboard");
}

export async function getUserProfile(userId: string): Promise<UserProfileDto> {
  const response = await client.getUserProfile({
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

  throw new Error("Failed to load user profile");
}

export async function updateAvatar(
  avatarUrl: string,
): Promise<{ image: string | null }> {
  const response = await client.updateAvatar({
    body: { avatarUrl },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to update avatar");
}

export async function updateCoverPhoto(
  coverPhotoUrl: string,
): Promise<{ coverPhoto: string | null }> {
  const response = await client.updateCoverPhoto({
    body: { coverPhotoUrl },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to update cover photo");
}

export async function updateUserProfile(data: {
  bio: string | null;
}): Promise<UserProfileDto> {
  const response = await client.updateProfile({
    body: { bio: data.bio },
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 200) {
    return response.body;
  }

  throw new Error("Failed to update profile");
}
