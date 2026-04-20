import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import bearerToken from '@/lib/atoms/bearer-token';
import { getUnreadCount } from '@/lib/api/messages';

// ─── Query key ───────────────────────────────────────────────────────────────

export const unreadCountKey = ["conversations", "unread-count"] as const;

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseUnreadNotificationsReturn {
  /** Total number of unread messages across all conversations. */
  unreadCount: number;
}

/**
 * Fetches the conversation-level unread message count via REST.
 *
 * The old real-time WebSocket listener (`new-message-notification`) has been
 * removed — DM notifications are now routed through `NotificationsService`.
 * This hook retains the REST query so components like `ConversationsBubble`
 * that display a conversation-level badge continue to work.
 */
export function useUnreadNotifications(): UseUnreadNotificationsReturn {
  const token = useAtomValue(bearerToken);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: unreadCountKey,
    queryFn: getUnreadCount,
    enabled: !!token,
    staleTime: 60_000,
  });

  return { unreadCount };
}
