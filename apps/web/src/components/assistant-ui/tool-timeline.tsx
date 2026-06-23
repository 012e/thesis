"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconLoader2,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type ToolStepState = "running" | "complete" | "error";

/**
 * Container for a run of adjacent activity rows ({@link RailRow}/{@link
 * ToolStep}). Their connectors line up into one continuous rail.
 *
 * When `capLast` is true the final row's connector is hidden, so the rail caps
 * cleanly at the last step (a single-step group then shows no dangling line).
 * Set it false when this timeline continues into a following one (e.g. the next
 * assistant message in the same turn), so the rail flows on to the next step.
 */
export function ToolTimeline({
  capLast = true,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { capLast?: boolean }) {
  return (
    <div
      data-slot="tool-timeline"
      className={cn(
        "flex w-full flex-col",
        // Reveal connectors inside the timeline…
        "[&_[data-rail-line]]:bg-border",
        // …except the final row's, so the rail caps at the last step.
        capLast &&
          "[&>[data-rail-row]:last-child_[data-rail-line]]:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A single row hanging off the assistant activity rail.
 *
 * The left column is a fixed-width track: an optional `node` (the dot/icon that
 * sits *on* the rail) followed by a vertical connector that grows to the bottom
 * of the row. Because consecutive rows — within a message and across tightly
 * stacked assistant messages — share the same track geometry, their connectors
 * line up into one continuous rail. A row with no `node` (e.g. prose) lets the
 * rail pass straight through on its left.
 *
 * The connector of the final row in a run is hidden by the container via the
 * `[&>[data-rail-row]:last-child_[data-rail-line]]:hidden` rule, capping the
 * rail at the last step.
 */
export function RailRow({
  node,
  children,
  contentClassName,
  className,
}: {
  node?: ReactNode;
  children?: ReactNode;
  contentClassName?: string;
  className?: string;
}) {
  return (
    <div data-rail-row className={cn("flex gap-3", className)}>
      <div className="relative flex w-6 shrink-0 flex-col items-center self-stretch">
        {node != null && (
          <div className="z-10 flex size-6 items-center justify-center bg-background">
            {node}
          </div>
        )}
        <div
          data-rail-line
          aria-hidden
          className="w-px grow bg-transparent"
        />
      </div>
      <div className={cn("min-w-0 flex-1 pb-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

function ToolStepLabel({
  label,
  state,
  className,
}: {
  label: ReactNode;
  state: ToolStepState;
  className?: string;
}) {
  const isRunning = state === "running";

  return (
    <span
      className={cn(
        "relative inline-block text-left text-sm leading-snug",
        state === "error" ? "text-destructive" : "text-foreground",
        className,
      )}
    >
      <span>{label}</span>
      {isRunning && (
        <span
          aria-hidden
          className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
        >
          {label}
        </span>
      )}
    </span>
  );
}

function ToolStepDetail({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1">
      <span className="inline-flex max-w-full items-center truncate bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export type ToolStepProps = {
  icon: ComponentType<{ className?: string }>;
  label: ReactNode;
  /** Short secondary value (e.g. a title or filename) shown as a chip. */
  detail?: ReactNode;
  state: ToolStepState;
  /** Optional expandable content (args/result). Renders a disclosure chevron. */
  children?: ReactNode;
  defaultOpen?: boolean;
};

/**
 * A single tool/agent step on the activity rail: an icon node, a label, an
 * optional detail chip, and optional expandable content.
 */
export function ToolStep({
  icon: Icon,
  label,
  detail,
  state,
  children,
  defaultOpen = false,
}: ToolStepProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = Boolean(children);

  const node = (
    <span
      className={cn(
        state === "running"
          ? "text-primary"
          : state === "error"
            ? "text-destructive"
            : "text-foreground",
      )}
    >
      {state === "running" ? (
        <IconLoader2 className="size-4 animate-spin" />
      ) : state === "error" ? (
        <IconAlertTriangle className="size-4" />
      ) : (
        <Icon className="size-4" />
      )}
    </span>
  );

  return (
    <RailRow node={node} contentClassName="pt-0.5">
      {hasDetails ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="group/step flex w-full items-center gap-2 text-left"
        >
          <ToolStepLabel
            label={label}
            state={state}
            className="min-w-0 grow truncate"
          />
          <IconChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      ) : (
        <ToolStepLabel
          label={label}
          state={state}
          className="block min-w-0 truncate"
        />
      )}

      {detail && <ToolStepDetail>{detail}</ToolStepDetail>}

      {hasDetails && open && (
        <div className="mt-2 flex flex-col gap-2 border-l border-border/60 pl-3 text-sm duration-200 animate-in fade-in-0 slide-in-from-top-1">
          {children}
        </div>
      )}
    </RailRow>
  );
}
