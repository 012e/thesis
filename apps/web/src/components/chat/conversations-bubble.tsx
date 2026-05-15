import { useState, useRef, useEffect, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { IconMessageCircle2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/messages/use-conversations";
import { useUnreadNotifications } from "@/hooks/messages/use-unread-notifications";
import { openChatWindowAtom } from "@/lib/atoms/chat-windows";
import {
  isGlobalChatOpenAtom,
  globalChatSizeAtom,
} from "@/lib/atoms/global-chat";
import type { ConversationDto } from "@repo/shared-dto";

// ─── Conversation List Item ───────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: ConversationDto;
  onOpen: (conversationId: string) => void;
}

function ConversationItem({ conversation, onOpen }: ConversationItemProps) {
  const { otherUser, lastMessage } = conversation;

  const displayName =
    otherUser.name ??
    otherUser.displayUsername ??
    otherUser.username ??
    "Unknown";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const preview = lastMessage?.content
    ? lastMessage.content.length > 42
      ? lastMessage.content.slice(0, 42) + "…"
      : lastMessage.content
    : "No messages yet";

  const timeAgo = lastMessage ? getRelativeTime(lastMessage.createdAt) : "";

  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent/60 transition-colors text-left rounded-lg"
      onClick={() => onOpen(conversation.id)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
          {initial}
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-popover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-sm text-foreground truncate">
            {displayName}
          </span>
          {timeAgo && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {timeAgo}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConversationsBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const { unreadCount } = useUnreadNotifications();
  const openWindow = useSetAtom(openChatWindowAtom);

  // Shift right when the global AI chat panel is open so we don't sit inside it.
  const isGlobalChatOpen = useAtomValue(isGlobalChatOpenAtom);
  const globalChatSize = useAtomValue(globalChatSizeAtom);
  const panelWidth = isGlobalChatOpen
    ? globalChatSize === "normal"
      ? 320
      : 480
    : 0;
  // 16px = right-4 base offset; slide with the same 300ms curve as the panel.
  const rightPx = panelWidth + 16;

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      setIsOpen(false);
      openWindow(conversationId);
    },
    [openWindow],
  );

  return (
    <div
      className="fixed bottom-4 z-50 flex flex-col items-end gap-2"
      style={{
        right: `${rightPx}px`,
        transition: "right 300ms ease-in-out",
      }}
    >      {/* ── Conversations panel ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="w-72 rounded-xl shadow-2xl border border-border bg-popover text-popover-foreground overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-bold text-base">Chats</h2>
          </div>

          {/* Search (decorative) */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
              <svg
                className="w-3.5 h-3.5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="text-xs text-muted-foreground">
                Search Messenger
              </span>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-80 p-1.5">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading…
              </div>
            )}
            {!isLoading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <IconMessageCircle2 className="w-8 h-8 opacity-40" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                onOpen={handleOpenConversation}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Messenger button ────────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
          isOpen && "scale-105",
        )}
        title="Messenger"
      >
        <IconMessageCircle2 className="w-6 h-6" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
