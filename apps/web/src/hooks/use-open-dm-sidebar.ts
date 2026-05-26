import { useCallback } from "react";
import { useSetAtom } from "jotai";

import { useStartConversation } from "@/hooks/messages";
import {
  activeDmConversationAtom,
  isDmChatOpenAtom,
} from "@/lib/atoms/dm-chat";

/**
 * Starts or retrieves a DM conversation, then opens the sidebar directly to it.
 */
export function useOpenDmSidebar() {
  const setDmOpen = useSetAtom(isDmChatOpenAtom);
  const setActiveConversationId = useSetAtom(activeDmConversationAtom);
  const { mutateAsync: startConversation } = useStartConversation();

  return useCallback(
    async (recipientId: string) => {
      try {
        const conversation = await startConversation(recipientId);
        setActiveConversationId(conversation.id);
        setDmOpen(true);
      } catch {
        // Error already handled by useStartConversation with a toast.
      }
    },
    [setActiveConversationId, setDmOpen, startConversation],
  );
}
