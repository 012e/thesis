import {
  login as authLogin,
  register as authRegister,
  requestPasswordReset as authRequestPasswordReset,
  resetPassword as authResetPassword,
  updateProfile as authUpdateProfile,
  authClient,
  type LoginParams,
  type RegisterParams,
  type RequestPasswordResetParams,
  type ResetPasswordParams,
  type UpdateProfileParams,
} from "@repo/auth-client";
import { toast } from "sonner";
import store from "@/lib/atoms/store";
import bearerToken from "@/lib/atoms/bearer-token";

/**
 * Login wrapper that handles token storage and UI feedback
 */
export async function login(params: LoginParams): Promise<boolean> {
  // Clear any existing token before attempting login
  store.set(bearerToken, null);

  const result = await authLogin(params);

  if (!result.success) {
    toast.error("Login failed", {
      description: result.error || "Invalid email or password",
    });
    // Ensure token remains cleared on failure
    store.set(bearerToken, null);
    return false;
  }

  if (result.token) {
    store.set(bearerToken, result.token);
  }

  toast.success("Login successful", {
    description: "Welcome back!",
  });

  return true;
}

/**
 * Register wrapper that handles token storage and UI feedback
 */
export async function register(params: RegisterParams): Promise<boolean> {
  const result = await authRegister(params);

  if (!result.success) {
    toast.error("Registration failed", {
      description: result.error || "Unable to create account",
    });
    return false;
  }

  if (result.token) {
    store.set(bearerToken, result.token);
  }

  toast.success("Account created successfully", {
    description: "Welcome!",
  });

  return true;
}

/**
 * Request password reset wrapper with UI feedback
 */
export async function requestPasswordReset(
  params: RequestPasswordResetParams,
): Promise<boolean> {
  const result = await authRequestPasswordReset(params);

  if (!result.success) {
    toast.error("Failed to send reset email", {
      description: result.error || "Please try again later",
    });
    return false;
  }

  toast.success("Reset email sent", {
    description: "Check your inbox for password reset instructions",
  });

  return true;
}

/**
 * Reset password wrapper with UI feedback
 */
export async function resetPassword(
  params: ResetPasswordParams,
): Promise<boolean> {
  const result = await authResetPassword(params);

  if (!result.success) {
    toast.error("Failed to reset password", {
      description: result.error || "Invalid or expired token",
    });
    return false;
  }

  toast.success("Password reset successful", {
    description: "You can now login with your new password",
  });

  return true;
}

/**
 * Update profile wrapper with UI feedback
 */
export async function updateProfile(
  params: UpdateProfileParams,
): Promise<boolean> {
  const result = await authUpdateProfile(params);

  if (!result.success) {
    toast.error("Update failed", {
      description: result.error || "Failed to update profile",
    });
    return false;
  }

  toast.success("Profile updated", {
    description: "Your profile has been updated successfully",
  });

  return true;
}

/**
 * Check if the user has a valid bearer token
 */
export function isAuthenticated(): boolean {
  const token = store.get(bearerToken);
  return !!token;
}

/**
 * Get the current bearer token
 */
export function getToken(): string | null | undefined {
  return store.get(bearerToken);
}

/**
 * Clear the bearer token and sign out
 */
export async function logout() {
  store.set(bearerToken, null);
  await authClient.signOut();
}

/**
 * Handle authentication failure by clearing the token
 * This should be called when receiving 401 responses from the API
 */
export function handleAuthFailure() {
  const currentToken = store.get(bearerToken);
  if (currentToken) {
    store.set(bearerToken, null);
    toast.error("Session expired", {
      description: "Please login again to continue",
    });
  }
}

// Re-export types for convenience
export type { LoginParams, RegisterParams, UpdateProfileParams };
