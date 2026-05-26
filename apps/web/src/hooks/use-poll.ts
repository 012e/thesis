import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { votePoll, unvotePoll, getPollResults } from "@/lib/api/polls";
import type { PollResultsDto } from "@repo/shared-dto";
import { useToast as toast } from "@/hooks/use-toast";
import { useTrack } from "@/components/analytics-provider";

export function usePollResults(postId: string) {
  return useQuery({
    queryKey: ["poll-results", postId],
    queryFn: () => getPollResults(postId),
  });
}

export function usePollVote(postId: string) {
  const queryClient = useQueryClient();
  const track = useTrack();

  return useMutation({
    mutationFn: async (optionIds: string[]) => {
      return votePoll(postId, optionIds);
    },
    onMutate: async (optionIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["poll-results", postId] });

      // Snapshot previous value
      const previousResults = queryClient.getQueryData<PollResultsDto>([
        "poll-results",
        postId,
      ]);

      // Optimistically update
      if (previousResults) {
        const newUserVotes = optionIds;
        queryClient.setQueryData<PollResultsDto>(["poll-results", postId], {
          ...previousResults,
          userVotes: newUserVotes,
        });
      }

      return { previousResults };
    },
    onError: (error: Error, _variables, context) => {
      // Roll back on error
      if (context?.previousResults) {
        queryClient.setQueryData(
          ["poll-results", postId],
          context.previousResults,
        );
      }
      toast.error(`Failed to vote: ${error.message}`);
    },
    onSuccess: (data) => {
      // Update with server response
      queryClient.setQueryData(["poll-results", postId], data);
      track("poll_vote", { postId, optionIds: data.userVotes });
    },
  });
}

export function usePollUnvote(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return unvotePoll(postId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["poll-results", postId] });

      const previousResults = queryClient.getQueryData<PollResultsDto>([
        "poll-results",
        postId,
      ]);

      if (previousResults) {
        queryClient.setQueryData<PollResultsDto>(["poll-results", postId], {
          ...previousResults,
          userVotes: [],
        });
      }

      return { previousResults };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousResults) {
        queryClient.setQueryData(
          ["poll-results", postId],
          context.previousResults,
        );
      }
      toast.error(`Failed to remove vote: ${error.message}`);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["poll-results", postId], data);
    },
  });
}
