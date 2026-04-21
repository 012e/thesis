import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost } from "@/lib/api/posts";
import { removeNewPost } from "@/lib/session-storage";
import { toast } from "sonner";

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_post, postId) => {
      removeNewPost(postId);
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Post deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
}
