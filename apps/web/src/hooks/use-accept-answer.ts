import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptAnswer, clearAcceptedAnswer } from "@/lib/api/posts";
import { useToast as toast } from "@/hooks/use-toast";

/**
 * Q&A primitive: accept a top-level comment as the answer to a question
 * (marking it solved) or clear the accepted answer to re-open the question.
 */
export function useAcceptAnswer(postId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    queryClient.invalidateQueries({ queryKey: ["unanswered-questions"] });
  };

  const accept = useMutation({
    mutationFn: (commentId: string) => acceptAnswer(postId, commentId),
    onSuccess: () => {
      invalidate();
      toast.success("Answer accepted — question marked solved.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept answer: ${error.message}`);
    },
  });

  const clear = useMutation({
    mutationFn: () => clearAcceptedAnswer(postId),
    onSuccess: () => {
      invalidate();
      toast.success("Question re-opened.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to re-open question: ${error.message}`);
    },
  });

  return { accept, clear };
}
