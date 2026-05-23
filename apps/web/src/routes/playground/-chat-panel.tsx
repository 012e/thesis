import { IconGripHorizontal } from "@tabler/icons-react";
import { Thread } from "@/components/assistant-ui/thread";

type ChatPanelProps = {
  onToggleChatCollapsed: () => void;
};

export function ChatPanel({ onToggleChatCollapsed }: ChatPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-background max-lg:border-l-0 max-lg:border-t">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            data-swapy-handle
            className="mt-0.5 cursor-grab touch-none p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            aria-label="Move chat panel"
            title="Move chat panel"
          >
            <IconGripHorizontal className="size-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold">AI Code Assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              Can inspect, edit, and run this playground
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleChatCollapsed}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Hide
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Thread compact />
      </div>
    </aside>
  );
}
