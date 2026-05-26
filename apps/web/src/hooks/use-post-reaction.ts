import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactToPost, unreactToPost } from "@/lib/api/posts";
import type { ReactionTypeDto } from "@repo/shared-dto";
import { useToast as toast } from "@/hooks/use-toast";
import { useTrack } from "@/components/analytics-provider";

interface PostReactionVariables {
  postId: string;
  type: ReactionTypeDto | null; // null means remove reaction
}

export function usePostReaction() {
  const queryClient = useQueryClient();
  const track = useTrack();

  const mutation = useMutation({
    mutationFn: async ({ postId, type }: PostReactionVariables) => {
      if (type === null) {
        await unreactToPost(postId);
      } else {
        await reactToPost(postId, type);
      }
    },
    onSuccess: (_data, { postId, type }) => {
      // Invalidate recommendations query to refresh post list with updated reaction counts
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });

      if (type === "upvote") {
        track("post_like", { postId });
      } else if (type === null) {
        track("post_unlike", { postId });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reaction: ${error.message}`);
    },
  });

  return mutation;
}
