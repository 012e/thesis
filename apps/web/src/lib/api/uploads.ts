import type { PostImageDto } from "@repo/shared-dto";
import { handleAuthFailure } from "@/lib/auth";
import { env } from "@/env";

export interface UploadImagesResponse {
  images: PostImageDto[];
}

export async function uploadImages(
  files: File[],
): Promise<UploadImagesResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${env.VITE_BACKEND_URL}/uploads/images`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error("Authentication required");
  }

  if (response.status === 413) {
    throw new Error("File too large. Maximum size is 10 MB per image.");
  }

  if (response.status === 400) {
    const error = await response.json();
    throw new Error(error.message || "Invalid file(s)");
  }

  if (!response.ok) {
    throw new Error("Failed to upload images");
  }

  return response.json();
}
