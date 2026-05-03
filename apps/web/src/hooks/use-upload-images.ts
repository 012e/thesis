import { useMutation } from "@tanstack/react-query";
import { uploadImages } from "@/lib/api/uploads";
import type { PostImageDto } from "@repo/shared-dto";
import { toast } from "@/lib/toast";

export interface UseUploadImagesResult {
  images: PostImageDto[];
}

export function useUploadImages() {
  const mutation = useMutation({
    mutationFn: async (files: File[]): Promise<UseUploadImagesResult> => {
      const response = await uploadImages(files);
      return { images: response.images };
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload images: ${error.message}`);
    },
  });

  return mutation;
}
