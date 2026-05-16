import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSetAtom } from "jotai";
import { IconMinus, IconX, IconSend } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { useConversation } from "@/hooks/messages/use-conversations";
import { useMessages } from "@/hooks/messages/use-messages";
import { useMessageSocket } from "@/hooks/messages/use-message-socket";
import { markConversationRead } from "@/lib/api/messages";
import {
  closeChatWindowAtom,
  toggleMinimizeChatWindowAtom,
} from "@/lib/atoms/chat-windows";

// ─── Constants ───────────────────────────────────────────────────────────────

/** px from right edge for the first window. Subsequent windows shift left. */
export const WINDOW_WIDTH = 320;
export const WINDOW_GAP = 8;
/** The conversations bubble occupies ~80 px from the right (56px button + 4px padding + 8px gap). */
export const BUBBLE_OFFSET = 84;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  conversationId: string;
  index: number;
  minimized: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitial(name: string | null, username: string | null): string {
  return (name?.[0] ?? username?.[0] ?? "?").toUpperCase();
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatWindow({
  conversationId,
  index,
  minimized,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const closeWindow = useSetAtom(closeChatWindowAtom);
  const toggleMinimize = useSetAtom(toggleMinimizeChatWindowAtom);

  // ── Conversation metadata ─────────────────────────────────────────────────
  const { data: conversation } = useConversation(conversationId);
  const otherUser = conversation?.otherUser;

  // ── Messages ──────────────────────────────────────────────────────────────
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessages(conversationId);

  const allMessages = useMemo(() => {
    return (data?.pages ?? [])
      .flatMap((page) => page.messages)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [data?.pages]);

  // ── Scroll management ─────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (!minimized && !isUserScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [allMessages.length, minimized]);

  // Restore scroll to bottom when window is unminimized
  useEffect(() => {
    if (!minimized) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [minimized]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    isUserScrolledUpRef.current = !isAtBottom;

    // Load more when scrolled near top
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── Mark as read when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (!minimized && conversationId) {
      markConversationRead(conversationId).catch(() => {});
    }
  }, [minimized, conversationId]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── Input state ───────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const typingEmittedRef = useRef(false);
  const stopTypingRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { sendMessage, setTyping } = useMessageSocket(conversationId, {
    onNewMessage: () => {
      isUserScrolledUpRef.current = false;
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    },
    onTypingIndicator: ({ isTyping, userId }) => {
      // Only react to the OTHER user's typing events
      if (userId === currentUserId) return;
      setIsOtherTyping(isTyping);
      if (isTyping) {
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(
          () => setIsOtherTyping(false),
          3000,
        );
      }
    },
  });

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!typingEmittedRef.current) {
      setTyping(true);
      typingEmittedRef.current = true;
    }

    clearTimeout(stopTypingRef.current);
    stopTypingRef.current = setTimeout(() => {
      setTyping(false);
      typingEmittedRef.current = false;
    }, 1500);
  };

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    sendMessage(text);
    setInputText("");
    setTyping(false);
    typingEmittedRef.current = false;
    clearTimeout(stopTypingRef.current);

    isUserScrolledUpRef.current = false;
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [inputText, sendMessage, setTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Position ──────────────────────────────────────────────────────────────
  const rightPx = BUBBLE_OFFSET + index * (WINDOW_WIDTH + WINDOW_GAP);

  // ── Render ────────────────────────────────────────────────────────────────
  const displayName =
    otherUser?.name ??
    otherUser?.username ??
    otherUser?.displayUsername ??
    "Chat";
  const initial = getInitial(
    otherUser?.name ?? null,
    otherUser?.displayUsername ?? otherUser?.username ?? null,
  );

  return (
    <div
      className="fixed bottom-0 z-40 flex flex-col w-80 rounded-t-xl shadow-2xl border border-border bg-background overflow-hidden"
      style={{ right: `${rightPx}px` }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground cursor-pointer select-none"
        onClick={() => toggleMinimize(conversationId)}
      >
        {/* Avatar */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-foreground/20 text-primary-foreground font-semibold text-sm shrink-0">
          {initial}
        </div>

        {/* Name */}
        <span className="flex-1 font-semibold text-sm truncate">
          {displayName}
        </span>

        {/* Actions */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            onClick={() => toggleMinimize(conversationId)}
          >
            <IconMinus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            onClick={() => closeWindow(conversationId)}
            title="Close"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body (hidden when minimized) ─────────────────────────────────── */}
      {!minimized && (
        <>
          {/* Messages list */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex flex-col gap-1 p-3 overflow-y-auto h-80 bg-background"
          >
            {/* Load-more indicator */}
            {isFetchingNextPage && (
              <div className="text-center text-xs text-muted-foreground py-1">
                Loading…
              </div>
            )}

            {/* Empty state */}
            {!isLoading && allMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Say hello!</p>
              </div>
            )}

            {/* Messages */}
            {allMessages.map((msg, idx) => {
              const isMine = msg.senderId === currentUserId;
              const showTime =
                idx === allMessages.length - 1 ||
                new Date(allMessages[idx + 1].createdAt).getTime() -
                  new Date(msg.createdAt).getTime() >
                  5 * 60 * 1000;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    isMine ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm break-words",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm",
                    )}
                  >
                    {msg.content}
                  </div>
                  {showTime && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isOtherTyping && (
              <div className="flex items-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-3">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-background">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              className="flex-1 text-sm bg-muted rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50 transition-shadow"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                inputText.trim()
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground cursor-not-allowed",
              )}
              title="Send"
            >
              <IconSend className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
