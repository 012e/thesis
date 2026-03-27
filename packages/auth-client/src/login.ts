import { authClient } from "./auth-client";
import type { LoginParams, AuthResult } from "./types";

export async function login({
  email,
  password,
}: LoginParams): Promise<AuthResult> {
  const result = await authClient.signIn.email({
    email: email,
    password: password,
  });

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Invalid email or password",
    };
  }

  // Get JWT token after successful login
  const { data, error } = await authClient.token();
  if (error) {
    return {
      success: false,
      error: `fuck 1 Failed to retrieve authentication token: ${error}`,
    };
  }

  return {
    success: true,
    token: data.token,
  };
}
