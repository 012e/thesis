import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import type { FC } from "react";
import {
  IconPlus,
  IconMessage,
  IconArchive,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const ThreadList: FC<{ className?: string }> = ({ className }) => {
  return (
    <ThreadListPrimitive.Root
      className={cn(
        "flex flex-col h-full overflow-hidden bg-background border-r",
        className,
      )}
    >
      {/* New thread button */}
      <div className="p-3 border-b">
        <ThreadListPrimitive.New asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors">
            <IconPlus className="size-4" />
            New chat
          </button>
        </ThreadListPrimitive.New>
      </div>

      {/* Thread items */}
      <div className="flex-1 overflow-y-auto py-2">
        <ThreadListPrimitive.Items
          components={{ ThreadListItem: ThreadListItem }}
        />
      </div>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="group relative flex items-center px-2 py-0.5">
      <ThreadListItemPrimitive.Trigger className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm text-left hover:bg-accent transition-colors data-[active]:bg-accent data-[active]:font-medium truncate min-w-0">
        <IconMessage className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">
          <ThreadListItemPrimitive.Title fallback="New conversation" />
        </span>
      </ThreadListItemPrimitive.Trigger>

      {/* Actions shown on hover */}
      <div className="absolute right-2 hidden group-hover:flex items-center gap-0.5 bg-background rounded-md border shadow-sm p-0.5">
        <ThreadListItemPrimitive.Archive asChild>
          <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <IconArchive className="size-3.5" />
          </button>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <button className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <IconTrash className="size-3.5" />
          </button>
        </ThreadListItemPrimitive.Delete>
      </div>
    </ThreadListItemPrimitive.Root>
  );
};
