import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ComponentType } from "react";
import {
  IconFilePencil,
  IconFilePlus,
  IconFileSearch,
  IconLanguage,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { ToolStep, type ToolStepState } from "@/components/assistant-ui/tool-timeline";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Last segment of a virtual file path, e.g. "/playground/index.js" → "index.js". */
function basename(path: unknown) {
  if (typeof path !== "string") return undefined;
  const segment = path.split("/").filter(Boolean).at(-1);
  return segment || undefined;
}

/** Status strings returned by read/edit/write that mean the call did not apply. */
const FAILED_STATUSES = new Set([
  "not_found",
  "stale",
  "ambiguous",
  "invalid_request",
]);

/** Derive the rail step state from a file-tool result and its run status. */
function fileToolState(running: boolean, result: unknown): ToolStepState {
  if (running) return "running";
  if (isRecord(result) && typeof result.status === "string") {
    return FAILED_STATUSES.has(result.status) ? "error" : "complete";
  }
  return "complete";
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  c: "C",
  "c++": "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
  lua: "Lua",
};

function languageLabel(value: unknown) {
  if (typeof value !== "string") return undefined;
  return LANGUAGE_LABELS[value] ?? value;
}

/** Compact rail step shared by the file tools (running/complete/error verbs). */
function FileToolStep({
  icon,
  verb,
  state,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  /** [running, complete, error] phrasing, e.g. ["Reading", "Read", "Read"]. */
  verb: readonly [string, string, string];
  state: ToolStepState;
  detail?: string;
}) {
  const label =
    state === "running"
      ? `${verb[0]} file`
      : state === "error"
        ? `${verb[2]} failed`
        : `${verb[1]} file`;

  return <ToolStep icon={icon} label={label} detail={detail} state={state} />;
}

const ReadFileToolUIImpl = makeAssistantToolUI({
  toolName: "read_file",
  render: ({ args, result, status }) => (
    <FileToolStep
      icon={IconFileSearch}
      verb={["Reading", "Read", "Read"]}
      state={fileToolState(status.type === "running", result)}
      detail={basename(
        (isRecord(result) && result.path) || args.path,
      )}
    />
  ),
});

const EditFileToolUIImpl = makeAssistantToolUI({
  toolName: "edit_file",
  render: ({ args, result, status }) => (
    <FileToolStep
      icon={IconFilePencil}
      verb={["Editing", "Edited", "Edit"]}
      state={fileToolState(status.type === "running", result)}
      detail={basename(args.path ?? (isRecord(result) && result.path))}
    />
  ),
});

const WriteFileToolUIImpl = makeAssistantToolUI({
  toolName: "write_file",
  render: ({ args, result, status }) => (
    <FileToolStep
      icon={IconFilePlus}
      verb={["Writing", "Wrote", "Write"]}
      state={fileToolState(status.type === "running", result)}
      detail={basename(args.path ?? (isRecord(result) && result.path))}
    />
  ),
});

const SetPlaygroundLanguageToolUIImpl = makeAssistantToolUI({
  toolName: "set_playground_language",
  render: ({ args, status }) => {
    const label = languageLabel(args.language);
    const running = status.type === "running";
    return (
      <ToolStep
        icon={IconLanguage}
        label={
          running
            ? "Switching language"
            : label
              ? `Switched to ${label}`
              : "Switched language"
        }
        detail={label}
        state={running ? "running" : "complete"}
      />
    );
  },
});

const RunPlaygroundCodeToolUIImpl = makeAssistantToolUI({
  toolName: "run_playground_code",
  render: ({ result, status }) => {
    const running = status.type === "running";
    const exitCode =
      isRecord(result) && typeof result.exitCode === "number"
        ? result.exitCode
        : undefined;
    const failed = exitCode !== undefined && exitCode !== 0;
    const executionTime =
      isRecord(result) && typeof result.executionTime === "number"
        ? result.executionTime
        : undefined;

    return (
      <ToolStep
        icon={IconPlayerPlay}
        label={running ? "Running code" : failed ? "Run failed" : "Ran code"}
        detail={
          running
            ? undefined
            : failed
              ? `Exit code ${exitCode}`
              : executionTime !== undefined
                ? `${executionTime} ms`
                : undefined
        }
        state={running ? "running" : failed ? "error" : "complete"}
      />
    );
  },
});

/** Bespoke rail steps for the code playground's page-local file tools. */
export function PlaygroundToolUIs() {
  return (
    <>
      <ReadFileToolUIImpl />
      <EditFileToolUIImpl />
      <WriteFileToolUIImpl />
      <SetPlaygroundLanguageToolUIImpl />
      <RunPlaygroundCodeToolUIImpl />
    </>
  );
}
