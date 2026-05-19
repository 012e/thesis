import { IconArchive, IconMessage, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThreadSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-20">
      <ThreadListPrimitive.Root>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Expand threads"
          title="Expand threads"
          className="group flex size-10 items-center justify-center bg-background/90 shadow-sm transition-colors hover:bg-accent"
        >
          <IconMessage
            className={cn(
              "size-5 text-muted-foreground transition-all duration-200 group-hover:-rotate-6 group-hover:scale-110",
              open && "rotate-12 scale-110 animate-pulse text-primary",
            )}
          />
        </button>

        {open ? (
          <div className="mt-2 w-64 max-h-96 overflow-hidden border bg-popover text-popover-foreground shadow-xl">
            <div className="border-b p-1">
              <ThreadListPrimitive.New asChild>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <IconPlus className="size-4" />
                  New chat
                </button>
              </ThreadListPrimitive.New>
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              <ThreadListPrimitive.Items>
                {() => <ThreadSelectorItem onSelect={() => setOpen(false)} />}
              </ThreadListPrimitive.Items>
            </div>
          </div>
        ) : null}
      </ThreadListPrimitive.Root>
    </div>
  );
}

function ThreadSelectorItem({ onSelect }: { onSelect: () => void }) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);

  const updateTitleTruncation = () => {
    const title = titleRef.current;
    setIsTitleTruncated(Boolean(title && title.scrollWidth > title.clientWidth));
  };

  useLayoutEffect(() => {
    updateTitleTruncation();

    const title = titleRef.current;
    if (!title) return;

    const resizeObserver = new ResizeObserver(updateTitleTruncation);
    resizeObserver.observe(title);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <ThreadListItemPrimitive.Root className="group relative flex items-center px-1">
      <Tooltip>
        <TooltipTrigger
          disabled={!isTitleTruncated}
          delay={1000}
          render={
            <ThreadListItemPrimitive.Trigger
              onClick={onSelect}
              onPointerEnter={updateTitleTruncation}
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm transition-colors hover:bg-accent data-active:bg-accent data-active:font-medium"
            />
          }
        >
          <IconMessage className="size-4 shrink-0 text-muted-foreground" />
          <span ref={titleRef} className="min-w-0 flex-1 truncate">
            <ThreadListItemPrimitive.Title fallback="New conversation" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-80">
          <ThreadListItemPrimitive.Title fallback="New conversation" />
        </TooltipContent>
      </Tooltip>

      <div className="absolute right-1 hidden items-center gap-0.5 border bg-background shadow-sm group-hover:flex">
        <ThreadListItemPrimitive.Archive asChild>
          <button
            type="button"
            title="Archive"
            className="p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconArchive className="size-3.5" />
          </button>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <button
            type="button"
            title="Delete"
            className="p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <IconTrash className="size-3.5" />
          </button>
        </ThreadListItemPrimitive.Delete>
      </div>
    </ThreadListItemPrimitive.Root>
  );
}
