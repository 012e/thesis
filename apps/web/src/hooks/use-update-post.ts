import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePost } from "@/lib/api/posts";
import type { PostContentDto } from "@repo/shared-dto";
import { useToast as toast } from "@/hooks/use-toast";
import { FOLLOWING_POSTS_QUERY_KEY } from "@/hooks/use-following-posts";

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
      queryClient.invalidateQueries({ queryKey: FOLLOWING_POSTS_QUERY_KEY });
      toast.success("Post updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });
}
