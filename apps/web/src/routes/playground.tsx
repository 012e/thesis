import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  IconPlayerPlay,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconTerminal2,
  IconTrash,
} from "@tabler/icons-react";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { executeCode } from "@/lib/api/playground";
import type { ExecutionResult } from "@repo/rest-contracts";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

type Language = "javascript" | "typescript";

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

export function PlaygroundPage() {
  const { resolvedTheme } = useTheme();
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState<string>(DEFAULT_CODE.javascript);
  const [result, setResult] = useState<ExecutionResult | null>(null);

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

  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";

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
            {/* Language toggle */}
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                onClick={() => handleLanguageChange("javascript")}
                disabled={isPending}
                className={`px-3 py-1.5 transition-colors ${
                  language === "javascript"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                JavaScript
              </button>
              <button
                onClick={() => handleLanguageChange("typescript")}
                disabled={isPending}
                className={`px-3 py-1.5 border-l transition-colors ${
                  language === "typescript"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                TypeScript
              </button>
            </div>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={isPending || !code.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Editor panel */}
        <div className="flex-1 overflow-hidden border-b">
          <Editor
            height="100%"
            language={language}
            value={code}
            theme={editorTheme}
            onChange={(value) => setCode(value ?? "")}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono Variable', 'Courier New', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderLineHighlight: "line",
              wordWrap: "on",
              tabSize: 2,
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Output panel */}
        <div className="h-64 flex flex-col overflow-hidden shrink-0">
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

            {hasOutput && (
              <button
                onClick={handleClearOutput}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Clear output"
              >
                <IconTrash className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Output body */}
          <div className="flex-1 overflow-auto px-4 py-3 font-mono text-sm">
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
  );
}
