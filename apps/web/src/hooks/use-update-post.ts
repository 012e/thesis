import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePost } from "@/lib/api/posts";
import type { PostContentDto } from "@repo/shared-dto";
import { toast } from "@/lib/toast";

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      content,
    }: {
      postId: string;
      content: PostContentDto;
    }) => updatePost(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Post updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });
}
