import type { PointerEvent } from "react";
import {
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import type { ExecutionResult } from "@repo/rest-contracts";

type OutputPanelProps = {
  result: ExecutionResult | null;
  isPending: boolean;
  isOutputMinimized: boolean;
  outputHeight: number;
  onClearOutput: () => void;
  onToggleMinimized: () => void;
  onResizeStart: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function OutputPanel({
  result,
  isPending,
  isOutputMinimized,
  outputHeight,
  onClearOutput,
  onToggleMinimized,
  onResizeStart,
}: OutputPanelProps) {
  const hasOutput = result !== null;
  const isSuccess = hasOutput && result.exitCode === 0;
  const isError = hasOutput && result.exitCode !== 0;

  return (
    <>
      {!isOutputMinimized && (
        <button
          type="button"
          onPointerDown={onResizeStart}
          className="group flex shrink-0 cursor-row-resize items-center justify-center border-y bg-muted/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-0.5"
          aria-label="Resize output panel"
        ></button>
      )}

      <div
        className="flex shrink-0 flex-col overflow-hidden"
        style={{ height: isOutputMinimized ? undefined : outputHeight }}
      >
        <div className="flex shrink-0 items-center justify-between border-b bg-zinc-900/50 px-4 py-2">
          <div className="flex items-center gap-2">
            {!hasOutput && (
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Output
              </span>
            )}
            {isPending && (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Executing...
                </span>
              </>
            )}
            {isSuccess && (
              <>
                <IconCircleCheck className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Exited with code 0
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconClock className="h-3 w-3" />
                  {result.executionTime}ms
                </span>
              </>
            )}
            {isError && (
              <>
                <IconCircleX className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium text-destructive">
                  Exited with code {result.exitCode}
                </span>
                {result.executionTime > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconClock className="h-3 w-3" />
                    {result.executionTime}ms
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasOutput && (
              <button
                type="button"
                onClick={onClearOutput}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                title="Clear output"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMinimized}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              title={isOutputMinimized ? "Restore output" : "Minimize output"}
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

        <div
          className="flex-1 overflow-auto bg-zinc-900 px-4 py-3 font-mono text-sm"
          hidden={isOutputMinimized}
        >
          {!hasOutput && !isPending && (
            <p className="text-xs text-muted-foreground">
              Run your code to see output here.
            </p>
          )}

          {isPending && (
            <p className="animate-pulse text-xs text-muted-foreground">
              Running in sandbox...
            </p>
          )}

          {hasOutput && (
            <div className="space-y-2">
              {result.stdout && (
                <pre className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {result.stdout}
                </pre>
              )}
              {result.stderr && (
                <pre className="whitespace-pre-wrap leading-relaxed text-destructive">
                  {result.stderr}
                </pre>
              )}
              {!result.stdout && !result.stderr && (
                <p className="text-xs text-muted-foreground">(no output)</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
