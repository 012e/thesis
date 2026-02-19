import { authClient } from "./auth-client";
import type { UpdateProfileParams, AuthResult } from "./types";

export async function updateProfile({
  name,
  image,
}: UpdateProfileParams): Promise<AuthResult> {
  try {
    const result = await authClient.updateUser({
      name,
      image,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message || "Failed to update profile",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
