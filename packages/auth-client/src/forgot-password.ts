import { authClient } from "./auth-client";
import type {
  RequestPasswordResetParams,
  ResetPasswordParams,
  AuthResult,
} from "./types";

const BASE_URL = "http://localhost:3000";

export async function requestPasswordReset({
  email,
}: RequestPasswordResetParams): Promise<AuthResult> {
  try {
    // Call the request-password-reset endpoint directly via fetch
    const response = await fetch(`${BASE_URL}/request-password-reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Please try again later",
      };
    }

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      error: "Please try again later",
    };
  }
}

export async function resetPassword({
  newPassword,
  token,
}: ResetPasswordParams): Promise<AuthResult> {
  const result = await authClient.resetPassword({
    newPassword,
    token,
  });

  if (result.error) {
    return {
      success: false,
      error: result.error.message || "Invalid or expired token",
    };
  }

  return {
    success: true,
  };
}
