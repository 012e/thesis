import { useAtom } from "jotai";
import { useAuiState } from "@assistant-ui/react";
import { useEffect } from "react";
import { IconBolt, IconBrain } from "@tabler/icons-react";
import threadModelModesAtom from "@/lib/atoms/thread-model-modes";
import type { ModelMode } from "@/lib/atoms/model-mode";
import { cn } from "@/lib/utils";

const DEFAULT_MODE: ModelMode = "fast";

const MODES = [
  {
    value: "fast" as const,
    label: "Fast",
    icon: IconBolt,
    description: "Quicker responses",
  },
  {
    value: "thinking" as const,
    label: "Thinking",
    icon: IconBrain,
    description: "Deeper reasoning",
  },
];

/**
 * Compact Fast/Thinking toggle for the composer toolbar.
 *
 * Each thread persists its own mode in localStorage keyed by `remoteId`
 * (stable across page refreshes) or the assistant-ui local `id` for new
 * unsent threads. When a thread is first initialized (remoteId assigned),
 * the mode is migrated from the local id key to the remoteId key.
 *
 * Falls back to the global `modelMode` atom for threads with no saved preference.
 */
export function ModelSelector({ className }: { className?: string }) {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadKey = remoteId ?? localId;

  const [threadModes, setThreadModes] = useAtom(threadModelModesAtom);

  const mode: ModelMode = threadModes[threadKey] ?? DEFAULT_MODE;

  const setMode = (newMode: ModelMode) => {
    setThreadModes((prev) => ({ ...prev, [threadKey]: newMode }));
  };

  // When remoteId becomes available for a thread that was previously tracked
  // by localId, migrate the stored mode so it survives page refreshes.
  useEffect(() => {
    if (!remoteId) return;
    if (threadModes[remoteId] !== undefined) return; // already migrated
    const localMode = threadModes[localId];
    if (localMode === undefined) return; // nothing to migrate
    setThreadModes((prev) => {
      const next = { ...prev, [remoteId]: localMode };
      delete next[localId];
      return next;
    });
  }, [remoteId, localId, threadModes, setThreadModes]);

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border border-input bg-muted/50 p-0.5",
        className,
      )}
    >
      {MODES.map(({ value, label, icon: Icon, description }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            title={description}
            onClick={() => setMode(value)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
