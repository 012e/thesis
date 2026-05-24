import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useAtom } from "jotai";
import {
  IconX,
  IconArrowLeft,
  IconSend,
  IconMessageCircle2,
  IconSearch,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  isDmChatOpenAtom,
  activeDmConversationAtom,
} from "@/lib/atoms/dm-chat";
import { useSession } from "@/hooks/use-session";
import {
  useConversations,
  useConversation,
} from "@/hooks/messages/use-conversations";
import { useMessages } from "@/hooks/messages/use-messages";
import { useMessageSocket } from "@/hooks/messages/use-message-socket";
import { markConversationRead } from "@/lib/api/messages";
import { Spinner } from "@/components/ui/spinner";
import type { ConversationDto } from "@repo/shared-dto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayName(user: {
  name?: string | null;
  displayUsername?: string | null;
  username?: string | null;
}): string {
  return user.name ?? user.displayUsername ?? user.username ?? "Unknown";
}

function getInitial(displayName: string): string {
  return (displayName[0] ?? "?").toUpperCase();
}

// ─── Conversation List Item ───────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: ConversationDto;
  onSelect: (id: string) => void;
}

function ConversationItem({ conversation, onSelect }: ConversationItemProps) {
  const { otherUser, lastMessage } = conversation;
  const displayName = getDisplayName(otherUser);
  const initial = getInitial(displayName);

  const preview = lastMessage?.content
    ? lastMessage.content.length > 40
      ? lastMessage.content.slice(0, 40) + "…"
      : lastMessage.content
    : "No messages yet";

  const timeAgo = lastMessage ? getRelativeTime(lastMessage.createdAt) : "";

  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent/60 transition-colors text-left"
      onClick={() => onSelect(conversation.id)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
          {initial}
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
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

// ─── List View ────────────────────────────────────────────────────────────────

interface ListViewProps {
  onSelect: (conversationId: string) => void;
  onClose: () => void;
}

function ListView({ onSelect, onClose }: ListViewProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = getDisplayName(c.otherUser).toLowerCase();
      return name.includes(q);
    });
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <h2 className="font-bold text-base">Messages</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close messages"
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <IconX className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
          <IconSearch className="size-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            placeholder="Search conversations"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Spinner size="md" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <IconMessageCircle2 className="size-8 opacity-40" />
            <p className="text-sm">
              {search ? "No results" : "No conversations yet"}
            </p>
          </div>
        )}
        {filtered.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

interface DetailViewProps {
  conversationId: string;
  onBack: () => void;
}

function DetailView({ conversationId, onBack }: DetailViewProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: conversation } = useConversation(conversationId);
  const otherUser = conversation?.otherUser;

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

  // ── Scroll management ───────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [allMessages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    isUserScrolledUpRef.current = !isAtBottom;
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── Mark as read on mount ────────────────────────────────────────────────────
  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  // ── Typing indicator ────────────────────────────────────────────────────────
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── Input state ─────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const typingEmittedRef = useRef(false);
  const stopTypingRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const { sendMessage, setTyping } = useMessageSocket(conversationId, {
    onNewMessage: () => {
      isUserScrolledUpRef.current = false;
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    },
    onTypingIndicator: ({ isTyping, userId }) => {
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

  // ── Input handlers ───────────────────────────────────────────────────────────
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayName = otherUser ? getDisplayName(otherUser) : "Chat";
  const initial = getInitial(displayName);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="size-4" />
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs shrink-0">
            {initial}
          </div>
          <span className="font-semibold text-sm truncate">{displayName}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col gap-1 p-3 min-h-0"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-1 text-xs text-muted-foreground">
            <Spinner size="sm" />
          </div>
        )}

        {!isLoading && allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Say hello!</p>
          </div>
        )}

        {allMessages.map((msg, idx) => {
          const isMine = msg.senderId === currentUserId;
          const showTime =
            idx === allMessages.length - 1 ||
            new Date(allMessages[idx + 1]!.createdAt).getTime() -
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

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0">
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
          type="button"
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
          <IconSend className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function DmSidebar() {
  const [isOpen, setIsOpen] = useAtom(isDmChatOpenAtom);
  const [activeConversationId, setActiveConversationId] = useAtom(
    activeDmConversationAtom,
  );

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActiveConversationId(null);
  }, [setIsOpen, setActiveConversationId]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
    },
    [setActiveConversationId],
  );

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Messages"
      aria-hidden={!isOpen}
      className={cn(
        "fixed right-0 top-0 h-screen w-80 z-40",
        "flex flex-col bg-background border-l shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {activeConversationId === null ? (
        <ListView onSelect={handleSelectConversation} onClose={handleClose} />
      ) : (
        <DetailView conversationId={activeConversationId} onBack={handleBack} />
      )}
    </div>
  );
}
