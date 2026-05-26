import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePost } from "@/lib/api/posts";
import { removeNewPost } from "@/lib/session-storage";
import { useToast as toast } from "@/hooks/use-toast";
import { FOLLOWING_POSTS_QUERY_KEY } from "@/hooks/use-following-posts";
import { clearCreatedPost } from "@/lib/atoms/created-post";

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_post, postId) => {
      clearCreatedPost(postId);
      removeNewPost(postId);
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: FOLLOWING_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Post deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
}
