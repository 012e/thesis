import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useStartConversation } from '@/hooks/messages';
import { openChatWindowAtom } from '@/lib/atoms/chat-windows';

/**
 * Returns a function that starts (or retrieves) a DM conversation with a user
 * and opens the chat window for it.
 *
 * Errors (e.g. "must follow first") are already surfaced as toasts by
 * `useStartConversation`.
 */
export function useOpenChat() {
  const openWindow = useSetAtom(openChatWindowAtom);
  const { mutateAsync: startConversation } = useStartConversation();

  return useCallback(
    async (recipientId: string) => {
      try {
        const conversation = await startConversation(recipientId);
        openWindow(conversation.id);
      } catch {
        // Error already handled by useStartConversation with a toast
      }
    },
    [startConversation, openWindow],
  );
}
