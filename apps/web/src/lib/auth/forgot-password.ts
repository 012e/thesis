import { authClient } from "@/lib/auth";
import { toast } from "sonner";

const BASE_URL = "http://localhost:3000";

export async function requestPasswordReset({
  email,
}: {
  email: string;
}): Promise<boolean> {
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
      toast.error("Failed to send reset email", {
        description: result.message || "Please try again later",
      });
      return false;
    }

    toast.success("Reset email sent", {
      description: "Check your inbox for password reset instructions",
    });

    return true;
  } catch {
    toast.error("Failed to send reset email", {
      description: "Please try again later",
    });
    return false;
  }
}

export async function resetPassword({
  newPassword,
  token,
}: {
  newPassword: string;
  token: string;
}): Promise<boolean> {
  const result = await authClient.resetPassword({
    newPassword,
    token,
  });

  if (result.error) {
    toast.error("Failed to reset password", {
      description: result.error.message || "Invalid or expired token",
    });
    return false;
  }

  toast.success("Password reset successful", {
    description: "You can now login with your new password",
  });

  return true;
}
