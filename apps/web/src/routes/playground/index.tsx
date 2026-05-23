import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { createSwapy } from "swapy";
import type { Swapy } from "swapy";
import {
  IconGripHorizontal,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { executeCode } from "@/lib/api/playground";
import type { ExecutionResult } from "@repo/rest-contracts";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { PlaygroundAssistantTools } from "./-assistant-tools";
import { PlaygroundPanel } from "./-playground-panel";
import { ChatPanel } from "./-chat-panel";
import {
  isOutputMinimizedAtom,
  MIN_DESKTOP_PANEL_WIDTH,
  MIN_MOBILE_PANEL_HEIGHT,
  OUTER_RESIZE_HANDLE_SIZE,
  COLLAPSED_CHAT_STRIP_SIZE,
} from "./-types";
import type { Language } from "./-types";
import { useIsDesktop } from "./-hooks";
import { DEFAULT_CODE } from "./-language-config";

export const Route = createFileRoute("/playground/")({
  component: PlaygroundPage,
});

export function PlaygroundPage() {
  const isDesktop = useIsDesktop();
  const containerRef = useRef<HTMLDivElement>(null);
  const swapyRef = useRef<Swapy | null>(null);
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState<string>(DEFAULT_CODE.javascript);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [primaryPanelSize, setPrimaryPanelSize] = useState(68);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  // Tracks whether the chat swapy item is physically in the first grid column
  // (i.e. the user swapped panels so chat moved to the playground slot).
  const [chatIsInFirstColumn, setChatIsInFirstColumn] = useState(false);
  const [isOutputMinimized, setIsOutputMinimized] = useAtom(
    isOutputMinimizedAtom,
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || isChatCollapsed) {
      return;
    }

    swapyRef.current = createSwapy(container, {
      animation: "none",
      swapMode: "drop",
    });

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, [isChatCollapsed]);

  useEffect(() => {
    swapyRef.current?.update();
  }, [isDesktop]);

  const { mutate: runCode, isPending } = useMutation({
    mutationFn: executeCode,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      setResult({
        stdout: "",
        stderr: err.message,
        exitCode: -1,
        executionTime: 0,
      });
    },
  });

  const handleRun = useCallback(() => {
    if (!code.trim()) return;
    runCode({ code, language });
  }, [code, language, runCode]);

  const handleLanguageChange = useCallback(
    (newLang: Language) => {
      setLanguage(newLang);
      if (code === DEFAULT_CODE[language]) {
        setCode(DEFAULT_CODE[newLang]);
      }
    },
    [code, language],
  );

  const handleClearOutput = useCallback(() => {
    setResult(null);
  }, []);

  const handleToggleOutputMinimized = useCallback(() => {
    setIsOutputMinimized((current) => !current);
  }, [setIsOutputMinimized]);

  const handleToggleChatCollapsed = useCallback(() => {
    if (!isChatCollapsed) {
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
      }
      swapyRef.current?.destroy();
      swapyRef.current = null;
    }
    setIsChatCollapsed((current) => !current);
  }, [isChatCollapsed]);

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
    [isChatCollapsed, isDesktop, primaryPanelSize],
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

  return (
    <ChatRuntimeProvider>
      <PlaygroundAssistantTools
        code={code}
        language={language}
        result={result}
        setCode={setCode}
        setLanguage={setLanguage}
        setResult={setResult}
        setIsOutputMinimized={setIsOutputMinimized}
      />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />
        <div
          ref={containerRef}
          className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
          style={panelGridStyle}
        >
          {/*
           * Both swapy slot/item wrappers are ALWAYS in the DOM.
           * Swapy.destroy() only removes event listeners — it never restores
           * moved DOM nodes. If we conditionally unmount these wrappers while
           * swapy has physically moved an item to a different slot, React's
           * removeChild call targets the wrong parent and throws a DOMException.
           * Keeping the wrappers mounted and only changing their inner content
           * (ChatPanel ↔ collapsed strip) avoids this entirely.
           */}
          <div
            data-swapy-slot="playground"
            className="relative min-h-0 min-w-0 overflow-visible"
          >
            <div
              data-swapy-item="playground"
              className="relative z-0 h-full min-h-0 min-w-0 overflow-hidden transition-opacity duration-150 data-swapy-dragging:z-50 data-swapy-dragging:opacity-80"
            >
              <PlaygroundPanel
                code={code}
                language={language}
                result={result}
                isPending={isPending}
                isOutputMinimized={isOutputMinimized}
                isChatCollapsed={isChatCollapsed}
                onCodeChange={setCode}
                onLanguageChange={handleLanguageChange}
                onRun={handleRun}
                onToggleOutputMinimized={handleToggleOutputMinimized}
                onClearOutput={handleClearOutput}
              />
            </div>
          </div>

          {/* Resize handle — only when expanded. Safe to toggle because it is
              not a swapy slot/item, so React can add/remove it freely. */}
          {!isChatCollapsed && (
            <button
              type="button"
              onPointerDown={handleOuterResizeStart}
              className="group flex min-h-0 min-w-0 shrink-0 items-center justify-center border bg-muted/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-lg:cursor-row-resize lg:cursor-col-resize"
              aria-label="Resize playground panels"
            >
              <IconGripHorizontal className="size-4 text-muted-foreground transition-colors group-hover:text-foreground lg:rotate-90" />
            </button>
          )}

          <div
            data-swapy-slot="chat"
            className="relative min-h-0 min-w-0 overflow-visible"
          >
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
                <ChatPanel onToggleChatCollapsed={handleToggleChatCollapsed} />
              )}
            </div>
          </div>
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
