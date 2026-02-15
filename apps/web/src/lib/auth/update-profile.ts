import { authClient } from "@/lib/auth";
import { toast } from "sonner";

export async function updateProfile({
  name,
  image,
}: {
  name?: string;
  image?: string;
}): Promise<boolean> {
  try {
    const result = await authClient.updateUser({
      name,
      image,
    });

    if (result.error) {
      toast.error("Update failed", {
        description: result.error.message || "Failed to update profile",
      });
      return false;
    }

    toast.success("Profile updated", {
      description: "Your profile has been updated successfully",
    });
    return true;
  } catch (error) {
    toast.error("Update failed", {
      description:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
    return false;
  }
}
