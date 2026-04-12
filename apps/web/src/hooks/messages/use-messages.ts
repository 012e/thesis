import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { listMessages, sendMessageRest } from '@/lib/api/messages';
import { conversationKeys } from './use-conversations';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const messageKeys = {
  byConversation: (conversationId: string) =>
    ['messages', conversationId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches paginated message history for a conversation (newest-first).
 * Uses cursor-based infinite query — call `fetchNextPage()` to load older messages.
 *
 * Only fetches when `conversationId` is provided.
 */
export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: messageKeys.byConversation(conversationId ?? ''),
    queryFn: ({ pageParam }) =>
      listMessages(conversationId!, {
        before: pageParam as string | undefined,
        limit: 50,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
    staleTime: 10_000,
  });
}

/**
 * Sends a message via the REST fallback endpoint.
 * For real-time delivery, prefer using `useMessageSocket` which emits via WebSocket.
 * This mutation is useful as a fallback when the WebSocket is unavailable,
 * or for optimistic UI without WebSocket.
 *
 * On success it invalidates both the message list and conversation list
 * (so the conversation's `lastMessage` and `updatedAt` are refreshed).
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendMessageRest(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.byConversation(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}
