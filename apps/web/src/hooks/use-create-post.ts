import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "@/lib/api/posts";
import { addNewPost } from "@/lib/session-storage";
import type { PostContentDto, PostDto } from "@repo/shared-dto";
import { toast } from "sonner";

export function useCreatePost() {
  const queryClient = useQueryClient();

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

      toast.success("Post created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  return mutation;
}
