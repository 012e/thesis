import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listConversations,
  startConversation,
  getConversation,
} from "@/lib/api/messages";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const conversationKeys = {
  all: ["conversations"] as const,
  detail: (id: string) => ["conversations", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Returns the list of all conversations for the current user,
 * sorted by most recent activity.
 */
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.all,
    queryFn: listConversations,
    staleTime: 30_000,
  });
}

/**
 * Returns a single conversation by ID.
 * Only fetches when `conversationId` is provided.
 */
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId ?? ""),
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 60_000,
  });
}

/**
 * Starts (or retrieves) a 1-on-1 conversation with another user.
 * Invalidates the conversation list on success.
 */
export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipientId: string) => startConversation(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start conversation: ${error.message}`);
    },
  });
}
