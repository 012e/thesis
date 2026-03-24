import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactToPost, unreactToPost } from "@/lib/api/posts";
import type { ReactionTypeDto } from "@repo/shared-dto";
import { toast } from "sonner";

interface PostReactionVariables {
  postId: string;
  type: ReactionTypeDto | null; // null means remove reaction
}

export function usePostReaction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ postId, type }: PostReactionVariables) => {
      if (type === null) {
        await unreactToPost(postId);
      } else {
        await reactToPost(postId, type);
      }
    },
    onSuccess: () => {
      // Invalidate recommendations query to refresh post list with updated reaction counts
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reaction: ${error.message}`);
    },
  });

  return mutation;
}
