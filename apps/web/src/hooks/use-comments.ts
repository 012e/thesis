import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listComments,
  createComment,
  createReply,
  deleteComment,
} from "@/lib/api/comments";
import type { CreateCommentBodyType } from "@repo/rest-contracts";
import { useToast as toast } from "@/hooks/use-toast";

export function useComments(postId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => listComments(postId),
    staleTime: 30000, // 30 seconds
    enabled,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentBodyType) => createComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Comment posted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to post comment: ${error.message}`);
    },
  });
}

export function useCreateReply(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => createReply(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Reply posted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to post reply: ${error.message}`);
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Comment deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}
