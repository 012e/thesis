import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  IconPlayerPlay,
  IconLoader2,
  IconTerminal2,
  IconChevronDown,
  IconCheck,
  IconGripHorizontal,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import playgroundSettingsAtom from "@/lib/atoms/playground-settings";
import { CodeLanguageIcon } from "@/lib/code-language-meta";
import { MIN_EDITOR_HEIGHT, MIN_OUTPUT_HEIGHT } from "./-types";
import {
  PLAYGROUND_LANGUAGES,
  PLAYGROUND_LANGUAGE_LABELS,
} from "./-language-config";
import { PlaygroundSettingsDialog } from "./-settings-dialog";
import { OutputPanel } from "./-output-panel";
import { useIsDark } from "./-hooks";
import {
  changeLanguageAtom,
  codeAtom,
  editFlashAtom,
  isChatCollapsedAtom,
  languageAtom,
  resultAtom,
  setCodeAtom,
  setResultAtom,
  toggleOutputMinimizedAtom,
  useRunPlaygroundCode,
} from "./-playground-state";
import { isOutputMinimizedAtom } from "./-types";
import { Spinner } from "@/components/ui/spinner";

export function PlaygroundPanel() {
  const code = useAtomValue(codeAtom);
  const editFlash = useAtomValue(editFlashAtom);
  const language = useAtomValue(languageAtom);
  const result = useAtomValue(resultAtom);
  const isOutputMinimized = useAtomValue(isOutputMinimizedAtom);
  const isChatCollapsed = useAtomValue(isChatCollapsedAtom);
  const setCode = useSetAtom(setCodeAtom);
  const setResult = useSetAtom(setResultAtom);
  const changeLanguage = useSetAtom(changeLanguageAtom);
  const toggleOutputMinimized = useSetAtom(toggleOutputMinimizedAtom);
  const { isPending, run } = useRunPlaygroundCode();
  const isDark = useIsDark();
  const [settings, setSettings] = useAtom(playgroundSettingsAtom);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const flashDecorationsRef = useRef<ReturnType<
    Parameters<OnMount>[0]["createDecorationsCollection"]
  > | null>(null);

  const editorTheme =
    settings.theme === "auto"
      ? isDark
        ? "vs-dark"
        : "vs"
      : settings.theme === "dark"
        ? "vs-dark"
        : "vs";

  const currentLanguageLabel = PLAYGROUND_LANGUAGE_LABELS[language];

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();

    if (!editor || !model || !editFlash) return;

    const startOffset = Math.min(editFlash.startOffset, model.getValueLength());
    const endOffset = Math.min(editFlash.endOffset, model.getValueLength());
    if (endOffset <= startOffset) return;

    const startPosition = model.getPositionAt(startOffset);
    const endPosition = model.getPositionAt(endOffset);

    flashDecorationsRef.current?.clear();
    flashDecorationsRef.current = editor.createDecorationsCollection([
      {
        range: {
          startLineNumber: startPosition.lineNumber,
          startColumn: startPosition.column,
          endLineNumber: endPosition.lineNumber,
          endColumn: endPosition.column,
        },
        options: {
          className: "playground-edit-flash-line",
          isWholeLine: true,
        },
      },
    ]);

    const timeoutId = window.setTimeout(() => {
      flashDecorationsRef.current?.clear();
      flashDecorationsRef.current = null;
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [editFlash]);

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 h-12">
        <div className="flex items-center gap-2">
          {!isChatCollapsed && (
            <button
              type="button"
              data-swapy-handle
              className="cursor-grab touch-none p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
              aria-label="Move playground panel"
              title="Move playground panel"
            >
              <IconGripHorizontal className="size-4" />
            </button>
          )}
          <IconTerminal2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Playground</span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isPending}
              className="flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CodeLanguageIcon language={language} size={16} />
              <span>{currentLanguageLabel}</span>
              <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="start"
              className="min-w-40"
            >
              {PLAYGROUND_LANGUAGES.map((lang) => {
                const label = PLAYGROUND_LANGUAGE_LABELS[lang];
                return (
                  <DropdownMenuItem
                    key={lang}
                    className="cursor-pointer gap-2 px-3 py-2"
                    onClick={() => changeLanguage(lang)}
                  >
                    <CodeLanguageIcon language={lang} size={16} />
                    <span>{label}</span>
                    {language === lang && (
                      <IconCheck className="ml-auto h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <PlaygroundSettingsDialog />

          <button
            type="button"
            onClick={run}
            disabled={isPending || !code.trim()}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconPlayerPlay className="h-4 w-4" />
            )}
            {isPending ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      <div
        ref={playgroundRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          className="flex-1 overflow-hidden"
          style={{ minHeight: MIN_EDITOR_HEIGHT }}
        >
          <Editor
            height="100%"
            language={language}
            value={code}
            theme={editorTheme}
            onMount={handleEditorMount}
            onChange={(value) => setCode(value ?? "")}
            loading={<Spinner />}
            options={{
              fontSize: settings.fontSize,
              fontFamily: "'JetBrains Mono Variable', 'Courier New', monospace",
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

        <OutputPanel
          result={result}
          isPending={isPending}
          isOutputMinimized={isOutputMinimized}
          outputHeight={settings.outputHeight}
          onClearOutput={() => setResult(null)}
          onToggleMinimized={toggleOutputMinimized}
          onResizeStart={handleResizeStart}
        />
      </div>
    </div>
  );
}
