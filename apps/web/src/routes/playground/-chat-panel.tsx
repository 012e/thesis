import { IconGripHorizontal, IconX } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadSwitcher } from "@/components/assistant-ui/global-chat-panel";
import { toggleChatCollapsedAtom } from "./-playground-state";

export function ChatPanel() {
  const toggleChatCollapsed = useSetAtom(toggleChatCollapsedAtom);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-background h-12">
        <button
          type="button"
          data-swapy-handle
          className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
          aria-label="Move chat panel"
          title="Move chat panel"
        >
          <IconGripHorizontal className="size-4" />
        </button>

        <ThreadSwitcher />

        <button
          type="button"
          onClick={() => toggleChatCollapsed()}
          title="Close AI chat"
          aria-label="Close AI chat"
          className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconX className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Thread />
      </div>
    </aside>
  );
}
