import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from '@/lib/toast';
import type { Socket } from 'socket.io-client';

import bearerToken from '@/lib/atoms/bearer-token';
import { env } from '@/env';
import { getOrCreateNotificationsSocket } from '@/lib/socket/notifications-socket';
import { getUnreadNotificationCount } from '@/lib/api/notifications';
import type { NotificationDto } from '@repo/shared-dto';

// ─── Event constant (mirrors notifications.gateway.ts) ───────────────────────

const WS_NOTIFICATION = 'notification';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const notificationUnreadCountKey = [
  'notifications',
  'unread-count',
] as const;

export const notificationsListKey = ['notifications', 'list'] as const;

// ─── Toast renderer ──────────────────────────────────────────────────────────

function showNotificationToast(notification: NotificationDto): void {
  const actor = notification.actor;
  const actorName =
    actor?.username ?? actor?.name ?? 'Someone';

  switch (notification.type) {
    case 'follow':
      toast.info(`${actorName} started following you`);
      break;
    case 'comment':
      toast.info(`${actorName} commented on your post`);
      break;
    case 'reply':
      toast.info(`${actorName} replied to your comment`);
      break;
    case 'post_reaction':
      toast.info(`${actorName} reacted to your post`);
      break;
    case 'comment_reaction':
      toast.info(`${actorName} reacted to your comment`);
      break;
    case 'direct_message':
      toast.info(`New message from ${actorName}`);
      break;
    default:
      toast.info('You have a new notification');
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  /** Total number of unread notifications (all types including DMs). */
  unreadCount: number;
}

/**
 * Connects to the `/notifications` WebSocket namespace and keeps the unread
 * count in sync. Shows Sonner toasts for each incoming notification.
 *
 * Mount once in a layout-level component (e.g. LeftSidebar).
 * Does not require the user to join any rooms — the server auto-joins
 * `user:{userId}` on authentication.
 */
export function useNotifications(): UseNotificationsReturn {
  const token = useAtomValue(bearerToken);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  // ─── Initial unread count via REST ─────────────────────────────────────────

  const { data: unreadCount = 0 } = useQuery({
    queryKey: notificationUnreadCountKey,
    queryFn: getUnreadNotificationCount,
    enabled: !!token,
    staleTime: 60_000,
  });

  // ─── Real-time updates via Socket.IO ───────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateNotificationsSocket(token, env.VITE_BACKEND_URL);
    socketRef.current = socket;

    const onNotification = (notification: NotificationDto) => {
      // Show a Sonner toast so the user sees the event immediately.
      showNotificationToast(notification);

      // Invalidate the unread count and list so queries re-fetch.
      void queryClient.invalidateQueries({ queryKey: notificationUnreadCountKey });
      void queryClient.invalidateQueries({ queryKey: notificationsListKey });
    };

    socket.on(WS_NOTIFICATION, onNotification);

    return () => {
      socket.off(WS_NOTIFICATION, onNotification);
      // Do NOT disconnect — the socket is shared across all hook instances.
    };
  }, [token, queryClient]);

  return { unreadCount };
}
