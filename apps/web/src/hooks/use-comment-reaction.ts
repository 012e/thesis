import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactToComment, unreactToComment } from "@/lib/api/comments";
import type { CommentType } from "@repo/rest-contracts";
import type { ReactionTypeDto } from "@repo/shared-dto";
import { useToast as toast } from "@/hooks/use-toast";
import { useTrack } from "@/components/analytics-provider";

interface CommentReactionVariables {
  commentId: string;
  type: ReactionTypeDto | null; // null means remove reaction
}

/**
 * Mutation hook to upvote/downvote a comment.
 *
 * Uses optimistic updates: the `["comments", postId]` cache is patched
 * immediately so the UI responds without waiting for a round-trip. If the
 * server call fails the previous state is restored.
 */
export function useCommentReaction(postId: string) {
  const queryClient = useQueryClient();
  const track = useTrack();
  const queryKey = ["comments", postId] as const;

  return useMutation({
    mutationFn: ({ commentId, type }: CommentReactionVariables) =>
      type === null
        ? unreactToComment(commentId)
        : reactToComment(commentId, type),

    onMutate: async ({ commentId, type }) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData<CommentType[]>(queryKey);

      // Optimistically patch the single comment
      queryClient.setQueryData<CommentType[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id !== commentId) return c;

          const prev = c.currentUserReaction;
          const next = type;

          // Compute new counts
          let upvoteCount = c.upvoteCount;
          let downvoteCount = c.downvoteCount;

          // Undo previous reaction
          if (prev === "upvote") upvoteCount = Math.max(0, upvoteCount - 1);
          if (prev === "downvote")
            downvoteCount = Math.max(0, downvoteCount - 1);

          // Apply new reaction
          if (next === "upvote") upvoteCount += 1;
          if (next === "downvote") downvoteCount += 1;

          return {
            ...c,
            upvoteCount,
            downvoteCount,
            currentUserReaction: next,
          };
        });
      });

      return { previous };
    },

    onError: (error: Error, _vars, context) => {
      // Roll back to snapshot
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(`Failed to update reaction: ${error.message}`);
    },

    onSuccess: (_data, { commentId, type }) => {
      if (type === "upvote") {
        track("comment_like", { commentId, postId });
      }
    },
  });
}
