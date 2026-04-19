import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePollResults, usePollVote, usePollUnvote } from "@/hooks/use-poll";
import type { PollPostContentDto } from "@repo/shared-dto";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";

interface PollDisplayProps {
  postId: string;
  poll: PollPostContentDto;
}

export function PollDisplay({ postId, poll }: PollDisplayProps) {
  const { data: results, isLoading } = usePollResults(postId);
  const { mutate: vote, isPending: isVoting } = usePollVote(postId);
  const { mutate: unvote, isPending: isUnvoting } = usePollUnvote(postId);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(),
  );

  const hasVoted = results?.userVotes && results.userVotes.length > 0;
  const isClosed = results?.isClosed ?? false;
  const showResults = hasVoted || isClosed;
  const isPending = isVoting || isUnvoting;

  const handleOptionClick = (optionId: string) => {
    if (isPending || isClosed) return;

    if (hasVoted) {
      // If already voted, clicking removes the vote
      unvote();
      return;
    }

    if (poll.allowsMultipleSelections) {
      setSelectedOptions((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(optionId)) {
          newSet.delete(optionId);
        } else {
          newSet.add(optionId);
        }
        return newSet;
      });
    } else {
      // Single selection - vote immediately
      vote([optionId]);
    }
  };

  const handleVoteSubmit = () => {
    if (selectedOptions.size === 0 || isPending) return;
    vote(Array.from(selectedOptions));
    setSelectedOptions(new Set());
  };

  const formatClosesAt = (closesAt: string) => {
    const date = new Date(closesAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs <= 0) return "Closed";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d left`;
    if (diffHours > 0) return `${diffHours}h left`;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m left`;
  };

  if (isLoading) {
    return (
      <div className="p-4 mt-3 rounded-xl border bg-muted/30">
        <div className="flex justify-center items-center py-4">
          <IconLoader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 mt-3 rounded-xl border bg-muted/30">
      <h4 className="mb-3 font-semibold">{poll.question}</h4>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const result = results?.options.find((o) => o.optionId === option.id);
          const percentage = result?.percentage ?? 0;
          const voteCount = result?.voteCount ?? 0;
          const isSelected =
            selectedOptions.has(option.id) ||
            results?.userVotes?.includes(option.id);

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              disabled={isPending || isClosed}
              className={cn(
                "relative w-full p-3 rounded-lg border text-left transition-all",
                "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                isSelected && !showResults && "border-primary bg-primary/5",
                isSelected && showResults && "border-primary",
                isClosed && "cursor-not-allowed opacity-70",
              )}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-lg transition-all",
                    isSelected ? "bg-primary/20" : "bg-muted",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="flex relative justify-between items-center">
                <div className="flex gap-2 items-center">
                  {isSelected && showResults && (
                    <IconCheck className="w-4 h-4 text-primary" />
                  )}
                  <span
                    className={cn(isSelected && showResults && "font-medium")}
                  >
                    {option.label}
                  </span>
                </div>

                {showResults && (
                  <div className="flex gap-2 items-center text-sm text-muted-foreground">
                    <span>{voteCount} votes</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote button for multiple selection polls */}
      {poll.allowsMultipleSelections && !hasVoted && !isClosed && (
        <div className="mt-3">
          <Button
            onClick={handleVoteSubmit}
            disabled={selectedOptions.size === 0 || isPending}
            className="w-full"
          >
            {isPending && <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />}
            Vote ({selectedOptions.size} selected)
          </Button>
        </div>
      )}

      {/* Footer with vote count and time remaining */}
      <div className="flex gap-2 justify-between items-center mt-3 text-sm text-muted-foreground">
        <span>{results?.totalVotes ?? 0} votes</span>
        {poll.closesAt && <span>{formatClosesAt(poll.closesAt)}</span>}
        {hasVoted && !isClosed && (
          <button
            onClick={() => unvote()}
            disabled={isPending}
            className="text-primary hover:underline"
          >
            Remove vote
          </button>
        )}
      </div>
    </div>
  );
}
