import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "@/lib/api/posts";
import { addNewPost } from "@/lib/session-storage";
import type { PostContentDto, PostDto } from "@repo/shared-dto";
import { useToast as toast } from "@/hooks/use-toast";
import { FOLLOWING_POSTS_QUERY_KEY } from "@/hooks/use-following-posts";
import { useTrack } from "@/components/analytics-provider";

export function useCreatePost() {
  const queryClient = useQueryClient();
  const track = useTrack();

  const mutation = useMutation({
    mutationFn: async (content: PostContentDto) => {
      const post = await createPost(content);
      return post;
    },
    onSuccess: (post: PostDto) => {
      // Store new post in session storage for optimistic UI update
      addNewPost(post);

      // Invalidate recommendations query to sync with server
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: FOLLOWING_POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tags", "trending"] });

      track("post_create", { postId: post.id });
      toast.success("Post created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  return mutation;
}
