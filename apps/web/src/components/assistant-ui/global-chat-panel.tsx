import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import {
  IconX,
  IconPlus,
  IconMessage,
  IconChevronDown,
  IconLayoutSidebarRightExpand,
  IconLayoutSidebarRightCollapse,
  IconArchive,
  IconTrash,
  IconSparkles,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, useCallback, type FC } from "react";
import { useAtom } from "jotai";
import { cn } from "@/lib/utils";
import {
  isGlobalChatOpenAtom,
  globalChatSizeAtom,
} from "@/lib/atoms/global-chat";
import type { GlobalChatSize } from "@/lib/atoms/global-chat";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";

// ─── Thread Switcher Dropdown ─────────────────────────────────────────────────

interface ThreadSwitcherProps {
  onNewChat?: () => void;
}

function ThreadSwitcher({ onNewChat }: ThreadSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape when open
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [open]);

  const DropdownItem: FC = useCallback(() => {
    return (
      <ThreadListItemPrimitive.Root className="group relative flex items-center">
        <ThreadListItemPrimitive.Trigger
          onClick={() => setOpen(false)}
          className={cn(
            "flex flex-1 items-center gap-2 px-3 py-2 text-sm text-left w-full",
            "hover:bg-accent transition-colors",
            "data-[active]:bg-accent data-[active]:font-medium",
            "truncate",
          )}
        >
          <IconMessage className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">
            <ThreadListItemPrimitive.Title fallback="New conversation" />
          </span>
        </ThreadListItemPrimitive.Trigger>
        {/* Hover actions */}
        <div className="absolute right-2 hidden group-hover:flex items-center gap-0.5 bg-background border shadow-sm">
          <ThreadListItemPrimitive.Archive asChild>
            <button
              className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Archive"
            >
              <IconArchive className="size-3" />
            </button>
          </ThreadListItemPrimitive.Archive>
          <ThreadListItemPrimitive.Delete asChild>
            <button
              className="p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete"
            >
              <IconTrash className="size-3" />
            </button>
          </ThreadListItemPrimitive.Delete>
        </div>
      </ThreadListItemPrimitive.Root>
    );
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-left",
          "hover:bg-accent transition-colors",
          "text-foreground",
        )}
        title="Switch thread"
      >
        <IconSparkles className="size-4 shrink-0 text-primary" />
        <span className="font-medium text-xs truncate flex-1">Chats</span>
        <IconChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 z-20 bg-popover border border-border shadow-xl overflow-hidden">
          {/* New chat */}
          <div className="p-1 border-b border-border">
            <ThreadListPrimitive.New asChild>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNewChat?.();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <IconPlus className="size-4" />
                New chat
              </button>
            </ThreadListPrimitive.New>
          </div>

          {/* Thread list */}
          <div className="max-h-72 overflow-y-auto py-1">
            <ThreadListPrimitive.Root className="block">
              <ThreadListPrimitive.Items>
                {() => <DropdownItem />}
              </ThreadListPrimitive.Items>
            </ThreadListPrimitive.Root>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel Header ─────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  size: GlobalChatSize;
  onSizeToggle: () => void;
  onClose: () => void;
}

function PanelHeader({ size, onSizeToggle, onClose }: PanelHeaderProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-border shrink-0 bg-background">
      {/* Thread switcher takes up available space */}
      <ThreadSwitcher />

      {/* Resize button */}
      <button
        type="button"
        onClick={onSizeToggle}
        title={size === "normal" ? "Expand panel" : "Shrink panel"}
        aria-label={size === "normal" ? "Expand panel" : "Shrink panel"}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        {size === "normal" ? (
          <IconLayoutSidebarRightExpand className="size-4" />
        ) : (
          <IconLayoutSidebarRightCollapse className="size-4" />
        )}
      </button>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        title="Close AI chat (Esc)"
        aria-label="Close AI chat"
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <IconX className="size-4" />
      </button>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function GlobalChatPanel() {
  const [isOpen, setIsOpen] = useAtom(isGlobalChatOpenAtom);
  const [size, setSize] = useAtom(globalChatSizeAtom);

  // Keyboard shortcut: Ctrl/Cmd + Shift + K to toggle; Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle: Ctrl+Shift+K / Cmd+Shift+K
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }
      // Escape: close if open (handled here so it works even if panel not focused)
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSizeToggle = useCallback(() => {
    setSize((prev) => (prev === "normal" ? "large" : "normal"));
  }, [setSize]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="AI Chat"
      aria-hidden={!isOpen}
      className={cn(
        "fixed right-0 top-0 h-screen z-40",
        "flex flex-col bg-background border-l shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        size === "normal" ? "w-80" : "w-[480px]",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Only mount the runtime when panel has been opened at least once */}
      <ChatRuntimeProvider>
        <PanelHeader
          size={size}
          onSizeToggle={handleSizeToggle}
          onClose={handleClose}
        />
        <div className="flex-1 overflow-hidden min-h-0">
          <Thread compact />
        </div>
      </ChatRuntimeProvider>
    </div>
  );
}
