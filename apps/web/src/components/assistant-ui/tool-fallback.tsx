"use client";

import { memo } from "react";
import { IconRobot, IconTool } from "@tabler/icons-react";
import {
  type ToolCallMessagePartStatus,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";

import { ToolStep, type ToolStepState } from "@/components/assistant-ui/tool-timeline";

function formatToolName(toolName: string) {
  const words = toolName
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean);

  if (words[0] === "agent") {
    words.shift();
  }

  const lastWord = words.at(-1);
  if (lastWord === "agent") {
    words.pop();
  } else if (lastWord?.endsWith("agent")) {
    words[words.length - 1] = lastWord.slice(0, -"agent".length);
  }

  if (toolName.toLowerCase().includes("agent")) {
    words.push("agent");
  }

  return words.length
    ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    : toolName;
}

function toStepState(status?: ToolCallMessagePartStatus): ToolStepState {
  switch (status?.type) {
    case "running":
    case "requires-action":
      return "running";
    case "incomplete":
      // Cancellations read as a finished (muted) step, not an error.
      return status.reason === "cancelled" ? "complete" : "error";
    default:
      return "complete";
  }
}

function buildLabel({
  formattedToolName,
  isAgentCall,
  state,
  isCancelled,
}: {
  formattedToolName: string;
  isAgentCall: boolean;
  state: ToolStepState;
  isCancelled: boolean;
}) {
  const name = <b className="font-medium">{formattedToolName}</b>;

  if (isCancelled) {
    return (
      <span className="text-muted-foreground line-through">
        {isAgentCall ? "Cancelled " : "Cancelled tool "}
        {name}
      </span>
    );
  }

  if (isAgentCall) {
    if (state === "running") return <>Calling {name}</>;
    if (state === "error") return <>{name} failed</>;
    return <>Called {name}</>;
  }

  if (state === "running") return <>Running {name}</>;
  if (state === "error") return <>{name} failed</>;
  return <>Used {name}</>;
}

function ResultBlock({ result }: { result?: unknown }) {
  if (result === undefined) return null;
  return (
    <div className="border-t border-dashed border-border/60 pt-2">
      <p className="font-semibold text-muted-foreground">Result</p>
      <pre className="whitespace-pre-wrap text-muted-foreground">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function ErrorBlock({ status }: { status?: ToolCallMessagePartStatus }) {
  if (status?.type !== "incomplete") return null;

  const { error } = status;
  const errorText = error
    ? typeof error === "string"
      ? error
      : JSON.stringify(error)
    : null;
  if (!errorText) return null;

  const isCancelled = status.reason === "cancelled";

  return (
    <div>
      <p className="font-semibold text-muted-foreground">
        {isCancelled ? "Cancelled reason" : "Error"}
      </p>
      <p className="text-muted-foreground">{errorText}</p>
    </div>
  );
}

/**
 * Default renderer for tool calls without a bespoke UI. Renders as a single
 * step in the surrounding {@link ToolTimeline}, expandable to reveal the raw
 * arguments and result for debugging.
 */
const ToolFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const state = toStepState(status);
  const formattedToolName = formatToolName(toolName);
  const isAgentCall = formattedToolName.endsWith(" Agent");

  const label = buildLabel({
    formattedToolName,
    isAgentCall,
    state,
    isCancelled,
  });

  const hasArgs = Boolean(argsText && argsText.trim() && argsText !== "{}");
  const hasResult = result !== undefined && !isCancelled;
  const hasError = status?.type === "incomplete" && Boolean(status.error);
  const hasDetails = hasArgs || hasResult || hasError;

  return (
    <ToolStep
      icon={isAgentCall ? IconRobot : IconTool}
      label={label}
      state={state}
    >
      {hasDetails ? (
        <>
          <ErrorBlock status={status} />
          {hasArgs && (
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {argsText}
            </pre>
          )}
          {hasResult && <ResultBlock result={result} />}
        </>
      ) : null}
    </ToolStep>
  );
};

export const ToolFallback = memo(ToolFallbackImpl) as ToolCallMessagePartComponent;
(ToolFallback as { displayName?: string }).displayName = "ToolFallback";
