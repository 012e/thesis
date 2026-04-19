import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { type Socket } from "socket.io-client";
import bearerToken from "@/lib/atoms/bearer-token";
import { env } from "@/env";
import { getOrCreateMessagesSocket } from "@/lib/socket/messages-socket";
import { getUnreadCount } from "@/lib/api/messages";

// ─── Event constant (mirrors messages.gateway.ts) ────────────────────────────

const WS_NEW_MESSAGE_NOTIFICATION = "new-message-notification";

// ─── Query key ───────────────────────────────────────────────────────────────

export const unreadCountKey = ["conversations", "unread-count"] as const;

// ─── Notification payload type (mirrors gateway) ─────────────────────────────

export interface NewMessageNotificationPayload {
  conversationId: string;
  senderId: string;
  /** First 100 characters of the message — for future toast display. */
  preview: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseUnreadNotificationsReturn {
  /** Total number of unread messages across all conversations. */
  unreadCount: number;
}

/**
 * Subscribes to real-time new-message notifications via the per-user Socket.IO
 * room (`user:{userId}`) and keeps a TanStack Query-backed unread count in sync.
 *
 * This hook does NOT require the user to have joined any conversation room —
 * the server auto-joins the `user:{userId}` room on authentication, so
 * notifications arrive regardless of which page the user is on.
 *
 * Usage: mount once in a layout-level component (e.g. LeftSidebar).
 */
export function useUnreadNotifications(): UseUnreadNotificationsReturn {
  const token = useAtomValue(bearerToken);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  // ─── Initial unread count via REST ─────────────────────────────────────────

  const { data: unreadCount = 0 } = useQuery({
    queryKey: unreadCountKey,
    queryFn: getUnreadCount,
    // Only fetch when authenticated
    enabled: !!token,
    // Relatively stable; will be refreshed on socket notification anyway
    staleTime: 60_000,
  });

  // ─── Real-time updates via Socket.IO ───────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateMessagesSocket(token, env.VITE_BACKEND_URL);
    socketRef.current = socket;

    const onNotification = (_payload: NewMessageNotificationPayload) => {
      // Invalidate the unread count query so it re-fetches the authoritative
      // value from the server. This guarantees accuracy even across multiple tabs.
      void queryClient.invalidateQueries({ queryKey: unreadCountKey });
    };

    socket.on(WS_NEW_MESSAGE_NOTIFICATION, onNotification);

    return () => {
      socket.off(WS_NEW_MESSAGE_NOTIFICATION, onNotification);
      // Do NOT disconnect — the socket is shared across all hook instances.
    };
  }, [token, queryClient]);

  return { unreadCount };
}
