import { authClient } from "./auth-client";
import type { RegisterParams, AuthResult } from "./types";

export async function register({
  name,
  email,
  password,
}: RegisterParams): Promise<AuthResult> {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to create account",
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Registration failed",
    };
  }

  // Get JWT token after successful registration
  const tokenResult = await authClient.token();
  if (tokenResult.error) {
    return {
      success: false,
      error: "Failed to retrieve authentication token",
    };
  }

  return {
    success: true,
    token: tokenResult.data.token,
  };
}
