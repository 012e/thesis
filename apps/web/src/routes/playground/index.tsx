import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { createSwapy } from "swapy";
import type { Swapy } from "swapy";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
} from "@tabler/icons-react";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { PlaygroundAssistantTools } from "./-assistant-tools";
import { ChatPanel } from "./-chat-panel";
import { useIsDesktop } from "./-hooks";
import { PlaygroundPanel } from "./-playground-panel";
import {
  isChatCollapsedAtom,
  PlaygroundStateProvider,
  setBeforeChatCollapseAtom,
  toggleChatCollapsedAtom,
} from "./-playground-state";
import {
  COLLAPSED_CHAT_STRIP_SIZE,
  DEFAULT_PANEL_SLOTS,
  getPanelSlots,
  getStoredPanelSlots,
  MIN_DESKTOP_PANEL_WIDTH,
  MIN_MOBILE_PANEL_HEIGHT,
  OUTER_RESIZE_HANDLE_SIZE,
  panelSlotsAtom,
  primaryPanelSizeAtom,
} from "./-types";

export const Route = createFileRoute("/playground/")({
  component: PlaygroundPage,
});

export function PlaygroundPage() {
  return (
    <PlaygroundStateProvider>
      <PlaygroundContent />
    </PlaygroundStateProvider>
  );
}

function PlaygroundContent() {
  const isDesktop = useIsDesktop();
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<Swapy | null>(null);
  const initialPanelSlotsRef = useRef(getStoredPanelSlots());
  const [primaryPanelSize, setPrimaryPanelSize] = useAtom(primaryPanelSizeAtom);
  const isChatCollapsed = useAtomValue(isChatCollapsedAtom);
  const setBeforeChatCollapse = useSetAtom(setBeforeChatCollapseAtom);
  const toggleChatCollapsed = useSetAtom(toggleChatCollapsedAtom);
  const setPanelSlots = useSetAtom(panelSlotsAtom);
  // Tracks whether the chat swapy item is physically in the first grid column
  // (i.e. the user swapped panels so chat moved to the playground slot).
  const [chatIsInFirstColumn, setChatIsInFirstColumn] = useState(
    initialPanelSlotsRef.current.playground === "chat",
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || isChatCollapsed) {
      return;
    }

    const swapy = createSwapy(container, {
      animation: "none",
      swapMode: "drop",
    });
    swapy.onSwapEnd((event) => {
      if (!event.hasChanged) return;

      const nextPanelSlots = getPanelSlots(event.slotItemMap);
      if (nextPanelSlots) {
        setPanelSlots(nextPanelSlots);
      }
    });
    swapyRef.current = swapy;

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, [isChatCollapsed, setPanelSlots]);

  useEffect(() => {
    swapyRef.current?.update();
  }, [isDesktop]);

  const handleBeforeChatCollapse = useCallback(() => {
    // Detect which grid column the chat item is physically in before collapsing.
    // Swapy moves DOM nodes but React's vDOM doesn't track this. We must
    // destroy swapy (listener cleanup only – it does NOT restore DOM positions)
    // and keep both swapy slot/item wrappers in the DOM so React never tries
    // to removeChild a node that swapy moved to a different parent.
    const container = containerRef.current;
    if (container) {
      const chatInFirstSlot = container.querySelector(
        '[data-swapy-slot="playground"] [data-swapy-item="chat"]',
      );
      setChatIsInFirstColumn(chatInFirstSlot !== null);
      setPanelSlots(
        chatInFirstSlot
          ? { playground: "chat", chat: "playground" }
          : DEFAULT_PANEL_SLOTS,
      );
    }
    swapyRef.current?.destroy();
    swapyRef.current = null;
  }, [setPanelSlots]);

  useEffect(() => {
    setBeforeChatCollapse(handleBeforeChatCollapse);

    return () => {
      setBeforeChatCollapse(null);
    };
  }, [handleBeforeChatCollapse, setBeforeChatCollapse]);

  const handleToggleChatCollapsed = useCallback(() => {
    toggleChatCollapsed();
  }, [toggleChatCollapsed]);

  const handleOuterResizeStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const container = containerRef.current;
      if (!container || isChatCollapsed) return;

      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = primaryPanelSize;
      const containerSize = isDesktop
        ? container.clientWidth
        : container.clientHeight;
      const minPanelSize = isDesktop
        ? MIN_DESKTOP_PANEL_WIDTH
        : MIN_MOBILE_PANEL_HEIGHT;
      const availableSize = containerSize - OUTER_RESIZE_HANDLE_SIZE;
      const minPercent = Math.min(
        (minPanelSize / Math.max(availableSize, 1)) * 100,
        50,
      );
      const maxPercent = 100 - minPercent;

      const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
        const delta = isDesktop
          ? moveEvent.clientX - startX
          : moveEvent.clientY - startY;
        const nextSize = startSize + (delta / Math.max(availableSize, 1)) * 100;

        setPrimaryPanelSize(
          Math.min(Math.max(nextSize, minPercent), maxPercent),
        );
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [isChatCollapsed, isDesktop, primaryPanelSize, setPrimaryPanelSize],
  );

  // Grid template:
  //  - Expanded:  playground-slot | resize-handle | chat-slot  (3 tracks)
  //  - Collapsed: wide-panel | thin-strip  (2 tracks)
  //    → which track is narrow depends on which physical column chat ended up in
  const panelGridStyle: CSSProperties = isChatCollapsed
    ? isDesktop
      ? chatIsInFirstColumn
        ? {
            gridTemplateColumns: `${COLLAPSED_CHAT_STRIP_SIZE}px minmax(0, 1fr)`,
          }
        : {
            gridTemplateColumns: `minmax(0, 1fr) ${COLLAPSED_CHAT_STRIP_SIZE}px`,
          }
      : chatIsInFirstColumn
        ? {
            gridTemplateRows: `${COLLAPSED_CHAT_STRIP_SIZE}px minmax(0, 1fr)`,
          }
        : {
            gridTemplateRows: `minmax(0, 1fr) ${COLLAPSED_CHAT_STRIP_SIZE}px`,
          }
    : isDesktop
      ? {
          gridTemplateColumns: `minmax(${MIN_DESKTOP_PANEL_WIDTH}px, ${primaryPanelSize}fr) ${OUTER_RESIZE_HANDLE_SIZE}px minmax(${MIN_DESKTOP_PANEL_WIDTH}px, ${100 - primaryPanelSize}fr)`,
        }
      : {
          gridTemplateRows: `minmax(${MIN_MOBILE_PANEL_HEIGHT}px, ${primaryPanelSize}fr) ${OUTER_RESIZE_HANDLE_SIZE}px minmax(${MIN_MOBILE_PANEL_HEIGHT}px, ${100 - primaryPanelSize}fr)`,
        };

  // Border side and chevron icons depend on which edge the collapsed strip sits on.
  // Desktop: strip on the right (default) → border-l; on the left (swapped) → border-r
  // Mobile:  strip at the bottom (default) → border-t; at the top (swapped) → border-b
  const stripBorderClass = isDesktop
    ? chatIsInFirstColumn
      ? "border-r"
      : "border-l"
    : chatIsInFirstColumn
      ? "border-b"
      : "border-t";

  const playgroundItem = (
    <div
      data-swapy-item="playground"
      className="relative z-0 h-full min-h-0 min-w-0 overflow-hidden transition-opacity duration-150 data-swapy-dragging:z-50 data-swapy-dragging:opacity-80"
    >
      <PlaygroundPanel />
    </div>
  );

  const chatItem = (
    <div
      data-swapy-item="chat"
      className="relative z-0 h-full min-h-0 min-w-0 overflow-hidden transition-opacity duration-150 data-swapy-dragging:z-50 data-swapy-dragging:opacity-80"
    >
      {isChatCollapsed ? (
        <button
          type="button"
          onClick={handleToggleChatCollapsed}
          className={`group flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/20 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring max-lg:flex-row ${stripBorderClass}`}
          aria-label="Show AI chat"
          title="Show AI chat"
        >
          {/* Desktop chevron */}
          {chatIsInFirstColumn ? (
            <IconChevronRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground max-lg:hidden" />
          ) : (
            <IconChevronLeft className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground max-lg:hidden" />
          )}
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground transition-colors group-hover:text-foreground max-lg:text-xs lg:[writing-mode:vertical-rl] lg:rotate-180">
            AI Chat
          </span>
          {/* Mobile chevron */}
          {chatIsInFirstColumn ? (
            <IconChevronDown className="hidden size-3.5 text-muted-foreground transition-colors group-hover:text-foreground max-lg:block" />
          ) : (
            <IconChevronUp className="hidden size-3.5 text-muted-foreground transition-colors group-hover:text-foreground max-lg:block" />
          )}
        </button>
      ) : (
        <ChatPanel />
      )}
    </div>
  );
  const initialPanelSlots = initialPanelSlotsRef.current;

  return (
    <>
      <PlaygroundAssistantTools />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />
        <div
          ref={containerRef}
          className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
          style={panelGridStyle}
        >
          {resolveInitialPanelItem(
            "playground",
            initialPanelSlots.playground,
            playgroundItem,
            chatItem,
          )}

          {/* Resize handle — only when expanded. Safe to toggle because it is
              not a swapy slot/item, so React can add/remove it freely. */}
          {!isChatCollapsed && (
            <button
              type="button"
              onPointerDown={handleOuterResizeStart}
              className="group flex w-0 border bg-muted/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-lg:cursor-row-resize lg:cursor-col-resize"
              aria-label="Resize playground panels"
            ></button>
          )}

          {resolveInitialPanelItem(
            "chat",
            initialPanelSlots.chat,
            playgroundItem,
            chatItem,
          )}
        </div>
      </div>
    </>
  );
}

function resolveInitialPanelItem(
  slot: "playground" | "chat",
  item: "playground" | "chat",
  playgroundItem: ReactNode,
  chatItem: ReactNode,
) {
  return (
    <div data-swapy-slot={slot} className="relative min-h-0 min-w-0 overflow-visible">
      {item === "playground" ? playgroundItem : chatItem}
    </div>
  );
}
