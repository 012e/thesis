import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import type { FC, PointerEvent } from "react";
import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  IconPlayerPlay,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconTerminal2,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconGripHorizontal,
  IconSettings,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import playgroundSettingsAtom from "@/lib/atoms/playground-settings";
import type {
  PlaygroundKeybinding,
  PlaygroundTheme,
} from "@/lib/atoms/playground-settings";
import { executeCode } from "@/lib/api/playground";
import type { ExecutionResult } from "@repo/rest-contracts";
import { atomWithStorage } from "jotai/utils";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

type Language = "javascript" | "typescript";

const MIN_EDITOR_HEIGHT = 220;
const MIN_OUTPUT_HEIGHT = 120;

// Watch the `dark` class on <html> directly so this works both in the app
// (next-themes sets the class) and in Storybook (addon-themes sets the class).
function useIsDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Inline brand icons for JS and TS
function JavaScriptIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#F7DF1E" rx="2" />
      <text
        x="4"
        y="26"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="16"
        fill="#000"
      >
        JS
      </text>
    </svg>
  );
}

function TypeScriptIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#3178C6" rx="2" />
      <text
        x="3"
        y="26"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="16"
        fill="#fff"
      >
        TS
      </text>
    </svg>
  );
}

const LANGUAGE_CONFIG: Record<
  Language,
  { label: string; Icon: FC<{ size?: number }> }
> = {
  javascript: { label: "JavaScript", Icon: JavaScriptIcon },
  typescript: { label: "TypeScript", Icon: TypeScriptIcon },
};

const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// JavaScript Playground
// Write your code here and click Run

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
console.log("Current time:", new Date().toISOString());
`,
  typescript: `// TypeScript Playground
// Write your code here and click Run

interface Greeting {
  message: string;
  timestamp: string;
}

function greet(name: string): Greeting {
  return {
    message: \`Hello, \${name}!\`,
    timestamp: new Date().toISOString(),
  };
}

const result = greet("World");
console.log(result.message);
console.log("Timestamp:", result.timestamp);
`,
};

const isOutputMinimizedAtom = atomWithStorage<boolean>(
  "playground.isOutputMinimized",
  false,
);
export function PlaygroundPage() {
  const isDark = useIsDark();
  const playgroundRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useAtom(playgroundSettingsAtom);
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState<string>(DEFAULT_CODE.javascript);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isOutputMinimized, setIsOutputMinimized] = useAtom(
    isOutputMinimizedAtom,
  );

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
      // Only switch to default if user hasn't changed from the other default
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
  }, []);

  const handleResizeStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const playground = playgroundRef.current;
      if (!playground) return;

      event.preventDefault();
      const startY = event.clientY;
      const startOutputHeight = settings.outputHeight;
      const maxOutputHeight = Math.max(
        MIN_OUTPUT_HEIGHT,
        playground.clientHeight - MIN_EDITOR_HEIGHT,
      );

      const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
        const nextHeight = startOutputHeight + startY - moveEvent.clientY;
        const outputHeight = Math.min(
          Math.max(nextHeight, MIN_OUTPUT_HEIGHT),
          maxOutputHeight,
        );

        setSettings((current) => ({
          ...current,
          outputHeight,
        }));
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [setSettings, settings.outputHeight],
  );

  const editorTheme =
    settings.theme === "auto"
      ? isDark
        ? "vs-dark"
        : "vs"
      : settings.theme === "dark"
        ? "vs-dark"
        : "vs";
  const { Icon: CurrentLanguageIcon, label: currentLanguageLabel } =
    LANGUAGE_CONFIG[language];

  const hasOutput = result !== null;
  const isSuccess = hasOutput && result.exitCode === 0;
  const isError = hasOutput && result.exitCode !== 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <LeftSidebar />

      {/* Main playground area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <IconTerminal2 className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-sm">Playground</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isPending}
                className="flex items-center gap-2 border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CurrentLanguageIcon size={16} />
                <span>{currentLanguageLabel}</span>
                <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="start"
                className="min-w-40"
              >
                {(Object.keys(LANGUAGE_CONFIG) as Language[]).map((lang) => {
                  const { Icon, label } = LANGUAGE_CONFIG[lang];
                  return (
                    <DropdownMenuItem
                      key={lang}
                      className="gap-2 px-3 py-2 cursor-pointer"
                      onClick={() => handleLanguageChange(lang)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                      {language === lang && (
                        <IconCheck className="w-3.5 h-3.5 ml-auto text-primary" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger className="flex items-center gap-1.5 border p-1.5 text-sm transition-colors hover:bg-accent">
                <IconSettings className="w-4 h-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Playground settings</DialogTitle>
                  <DialogDescription>
                    Configure the editor appearance and common keyboard
                    behavior.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="playground-theme">Theme</Label>
                    <Select
                      value={settings.theme}
                      onValueChange={(value) =>
                        value !== null &&
                        setSettings((current) => ({
                          ...current,
                          theme: value as PlaygroundTheme,
                        }))
                      }
                    >
                      <SelectTrigger id="playground-theme" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Follow app theme</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="playground-keybinding">Keybinding</Label>
                    <Select
                      value={settings.keybinding}
                      onValueChange={(value) =>
                        value !== null &&
                        setSettings((current) => ({
                          ...current,
                          keybinding: value as PlaygroundKeybinding,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="playground-keybinding"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Default multi-cursor (Alt)
                        </SelectItem>
                        <SelectItem value="alternate">
                          Alternate multi-cursor (Ctrl/Cmd)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="playground-font-size">Font size</Label>
                      <input
                        id="playground-font-size"
                        type="number"
                        min={11}
                        max={24}
                        value={settings.fontSize}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            fontSize: Number(event.target.value),
                          }))
                        }
                        className="h-8 border bg-background px-2 text-sm outline-none focus:border-ring"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="playground-tab-size">Tab size</Label>
                      <input
                        id="playground-tab-size"
                        type="number"
                        min={2}
                        max={8}
                        value={settings.tabSize}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            tabSize: Number(event.target.value),
                          }))
                        }
                        className="h-8 border bg-background px-2 text-sm outline-none focus:border-ring"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 border px-3 py-2 text-sm">
                    <span>Word wrap</span>
                    <input
                      type="checkbox"
                      checked={settings.wordWrap === "on"}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          wordWrap: event.target.checked ? "on" : "off",
                        }))
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 border px-3 py-2 text-sm">
                    <span>Minimap</span>
                    <input
                      type="checkbox"
                      checked={settings.minimap}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          minimap: event.target.checked,
                        }))
                      }
                    />
                  </label>
                </div>
              </DialogContent>
            </Dialog>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={isPending || !code.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconPlayerPlay className="w-4 h-4" />
              )}
              {isPending ? "Running..." : "Run"}
            </button>
          </div>
        </div>

        <div
          ref={playgroundRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Editor panel */}
          <div
            className="flex-1 overflow-hidden"
            style={{ minHeight: MIN_EDITOR_HEIGHT }}
          >
            <Editor
              height="100%"
              language={language}
              value={code}
              theme={editorTheme}
              onChange={(value) => setCode(value ?? "")}
              options={{
                fontSize: settings.fontSize,
                fontFamily:
                  "'JetBrains Mono Variable', 'Courier New', monospace",
                minimap: { enabled: settings.minimap },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "line",
                wordWrap: settings.wordWrap,
                tabSize: settings.tabSize,
                multiCursorModifier:
                  settings.keybinding === "alternate" ? "ctrlCmd" : "alt",
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
              }}
            />
          </div>

          {!isOutputMinimized && (
            <button
              type="button"
              onPointerDown={handleResizeStart}
              className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center border-y bg-muted/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Resize output panel"
            >
              <IconGripHorizontal className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          )}

          {/* Output panel */}
          <div
            className="flex flex-col overflow-hidden shrink-0"
            style={{
              height: isOutputMinimized ? undefined : settings.outputHeight,
            }}
          >
            {/* Output header */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
              <div className="flex items-center gap-2">
                {!hasOutput && (
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Output
                  </span>
                )}
                {isPending && (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Executing...
                    </span>
                  </>
                )}
                {isSuccess && (
                  <>
                    <IconCircleCheck className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Exited with code 0
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <IconClock className="w-3 h-3" />
                      {result.executionTime}ms
                    </span>
                  </>
                )}
                {isError && (
                  <>
                    <IconCircleX className="w-4 h-4 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                      Exited with code {result.exitCode}
                    </span>
                    {result.executionTime > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <IconClock className="w-3 h-3" />
                        {result.executionTime}ms
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {hasOutput && (
                  <button
                    onClick={handleClearOutput}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    title="Clear output"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}

                <button
                  onClick={handleToggleOutputMinimized}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  title={
                    isOutputMinimized ? "Restore output" : "Minimize output"
                  }
                  aria-label={
                    isOutputMinimized ? "Restore output" : "Minimize output"
                  }
                >
                  {isOutputMinimized ? (
                    <IconChevronUp className="size-5" />
                  ) : (
                    <IconChevronDown className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Output body */}
            <div
              className="flex-1 overflow-auto px-4 py-3 font-mono text-sm"
              hidden={isOutputMinimized}
            >
              {!hasOutput && !isPending && (
                <p className="text-muted-foreground text-xs">
                  Run your code to see output here.
                </p>
              )}

              {isPending && (
                <p className="text-muted-foreground text-xs animate-pulse">
                  Running in sandbox...
                </p>
              )}

              {hasOutput && (
                <div className="space-y-2">
                  {result.stdout && (
                    <pre className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {result.stdout}
                    </pre>
                  )}
                  {result.stderr && (
                    <pre className="whitespace-pre-wrap text-destructive leading-relaxed">
                      {result.stderr}
                    </pre>
                  )}
                  {!result.stdout && !result.stderr && (
                    <p className="text-muted-foreground text-xs">(no output)</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
