import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchUnansweredQuestions } from "@/lib/api/posts";

export const UNANSWERED_QUESTIONS_QUERY_KEY = ["unanswered-questions"] as const;

export interface UseUnansweredQuestionsOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Q&A primitive: the "still needs help" surface — unsolved question posts,
 * newest first.
 */
export function useUnansweredQuestions(
  options: UseUnansweredQuestionsOptions = {},
) {
  const { limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: [...UNANSWERED_QUESTIONS_QUERY_KEY, limit],
    queryFn: ({ pageParam }) =>
      fetchUnansweredQuestions({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}
