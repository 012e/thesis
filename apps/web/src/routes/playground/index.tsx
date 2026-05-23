import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { createSwapy } from "swapy";
import type { Swapy } from "swapy";
import { IconGripHorizontal } from "@tabler/icons-react";
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
  const [isOutputMinimized, setIsOutputMinimized] = useAtom(
    isOutputMinimizedAtom,
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || isChatCollapsed) {
      swapyRef.current?.destroy();
      swapyRef.current = null;
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
    setIsChatCollapsed((current) => !current);
  }, []);

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

  const panelGridStyle: CSSProperties = isChatCollapsed
    ? { gridTemplateColumns: "minmax(0, 1fr)" }
    : isDesktop
      ? {
          gridTemplateColumns: `minmax(${MIN_DESKTOP_PANEL_WIDTH}px, ${primaryPanelSize}fr) ${OUTER_RESIZE_HANDLE_SIZE}px minmax(${MIN_DESKTOP_PANEL_WIDTH}px, ${100 - primaryPanelSize}fr)`,
        }
      : {
          gridTemplateRows: `minmax(${MIN_MOBILE_PANEL_HEIGHT}px, ${primaryPanelSize}fr) ${OUTER_RESIZE_HANDLE_SIZE}px minmax(${MIN_MOBILE_PANEL_HEIGHT}px, ${100 - primaryPanelSize}fr)`,
        };

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
          {isChatCollapsed ? (
            <div className="min-h-0 min-w-0 overflow-hidden">
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
                onToggleChatCollapsed={handleToggleChatCollapsed}
                onToggleOutputMinimized={handleToggleOutputMinimized}
                onClearOutput={handleClearOutput}
              />
            </div>
          ) : (
            <>
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
                    onToggleChatCollapsed={handleToggleChatCollapsed}
                    onToggleOutputMinimized={handleToggleOutputMinimized}
                    onClearOutput={handleClearOutput}
                  />
                </div>
              </div>
              <button
                type="button"
                onPointerDown={handleOuterResizeStart}
                className="group flex min-h-0 min-w-0 shrink-0 items-center justify-center border bg-muted/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-lg:cursor-row-resize lg:cursor-col-resize"
                aria-label="Resize playground panels"
              >
                <IconGripHorizontal className="size-4 text-muted-foreground transition-colors group-hover:text-foreground lg:rotate-90" />
              </button>
              <div
                data-swapy-slot="chat"
                className="relative min-h-0 min-w-0 overflow-visible"
              >
                <div
                  data-swapy-item="chat"
                  className="relative z-0 h-full min-h-0 min-w-0 overflow-hidden transition-opacity duration-150 data-swapy-dragging:z-50 data-swapy-dragging:opacity-80"
                >
                  <ChatPanel onToggleChatCollapsed={handleToggleChatCollapsed} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
