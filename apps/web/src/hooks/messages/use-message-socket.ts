import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Socket } from "socket.io-client";
import { useAtomValue } from "jotai";
import type { DirectMessageDto } from "@repo/shared-dto";
import bearerToken from "@/lib/atoms/bearer-token";
import { env } from "@/env";
import { getOrCreateMessagesSocket } from "@/lib/socket/messages-socket";
import { messageKeys } from "./use-messages";
import { conversationKeys } from "./use-conversations";

// ─── Event name constants (mirrors messages.gateway.ts) ─────────────────────

const WS_JOIN_CONVERSATION = "join-conversation";
const WS_SEND_MESSAGE = "send-message";
const WS_TYPING = "typing";
const WS_NEW_MESSAGE = "new-message";
const WS_TYPING_INDICATOR = "typing-indicator";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TypingIndicatorPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface UseMessageSocketOptions {
  /** Called when a new message arrives via WebSocket. */
  onNewMessage?: (message: DirectMessageDto) => void;
  /** Called when the other participant's typing state changes. */
  onTypingIndicator?: (payload: TypingIndicatorPayload) => void;
  /** Called when the socket connects successfully. */
  onConnect?: () => void;
  /** Called when the socket disconnects. */
  onDisconnect?: () => void;
}

export interface UseMessageSocketReturn {
  /** Send a message via WebSocket (preferred over REST for real-time delivery). */
  sendMessage: (content: string) => void;
  /** Emit a typing started/stopped event. */
  setTyping: (isTyping: boolean) => void;
  /** Whether the WebSocket is currently connected. */
  isConnected: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages a Socket.IO connection to the `/messages` namespace for real-time DMs.
 *
 * Usage:
 * ```ts
 * const { sendMessage, setTyping, isConnected } = useMessageSocket(conversationId, {
 *   onNewMessage: (msg) => console.log('received', msg),
 *   onTypingIndicator: ({ isTyping }) => setOtherUserTyping(isTyping),
 * });
 * ```
 *
 * Features:
 * - Authenticates via the Jotai `bearerToken` atom (same JWT used for REST calls)
 * - Joins the conversation room on mount, leaves on unmount
 * - Automatically invalidates TanStack Query caches on new messages
 * - Singleton socket per auth token — safe to call from multiple components
 *
 * @param conversationId - The conversation to subscribe to. Pass `undefined` to
 *   skip joining (e.g. on the conversation list page with no active thread).
 */
export function useMessageSocket(
  conversationId: string | undefined,
  options: UseMessageSocketOptions = {},
): UseMessageSocketReturn {
  const token = useAtomValue(bearerToken);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);
  const optionsRef = useRef(options);

  // Keep options ref up-to-date without re-creating the socket
  optionsRef.current = options;

  // ─── Socket lifecycle ───────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateMessagesSocket(token, env.VITE_BACKEND_URL);
    socketRef.current = socket;

    // 'authenticated' fires after the server's async handleConnection completes
    // and sets socket.data.userId. Joining the room before this event arrives
    // would hit the server before userId is populated → 'Unauthenticated' error.
    const onAuthenticated = () => {
      isConnectedRef.current = true;
      optionsRef.current.onConnect?.();

      if (conversationId) {
        socket.emit(WS_JOIN_CONVERSATION, { conversationId });
      }
    };

    const onDisconnect = () => {
      isConnectedRef.current = false;
      optionsRef.current.onDisconnect?.();
    };

    const onNewMessage = (message: DirectMessageDto) => {
      // Invalidate TanStack Query caches so components re-fetch
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: messageKeys.byConversation(conversationId),
        });
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });

      // Also call the custom handler if provided
      optionsRef.current.onNewMessage?.(message);
    };

    const onTypingIndicator = (payload: TypingIndicatorPayload) => {
      optionsRef.current.onTypingIndicator?.(payload);
    };

    socket.on("authenticated", onAuthenticated);
    socket.on("disconnect", onDisconnect);
    socket.on(WS_NEW_MESSAGE, onNewMessage);
    socket.on(WS_TYPING_INDICATOR, onTypingIndicator);

    // If the socket already received 'authenticated' before this effect ran
    // (e.g. the hook re-mounts with the same token), join the room immediately.
    if (socket.connected && isConnectedRef.current && conversationId) {
      socket.emit(WS_JOIN_CONVERSATION, { conversationId });
    }

    return () => {
      socket.off("authenticated", onAuthenticated);
      socket.off("disconnect", onDisconnect);
      socket.off(WS_NEW_MESSAGE, onNewMessage);
      socket.off(WS_TYPING_INDICATOR, onTypingIndicator);
      // Do NOT disconnect — the socket is shared across hook instances
    };
  }, [token, conversationId, queryClient]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    (content: string) => {
      const socket = socketRef.current;
      if (!socket?.connected || !conversationId) {
        console.warn(
          "[useMessageSocket] Cannot send message: not connected or no conversation",
        );
        return;
      }
      socket.emit(WS_SEND_MESSAGE, { conversationId, content });
    },
    [conversationId],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket?.connected || !conversationId) return;
      socket.emit(WS_TYPING, { conversationId, isTyping });
    },
    [conversationId],
  );

  return {
    sendMessage,
    setTyping,
    isConnected: isConnectedRef.current,
  };
}
