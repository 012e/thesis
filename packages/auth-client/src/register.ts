import { authClient } from "./auth-client";
import type { RegisterParams, AuthResult } from "./types";

export async function register(params: RegisterParams): Promise<AuthResult> {
  const { data, error } = await authClient.signUp.email(params);

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
  if (!data.token) {
    return {
      success: false,
      error: "No token found",
    };
  }

  return {
    success: true,
    token: data.token,
  };
}
