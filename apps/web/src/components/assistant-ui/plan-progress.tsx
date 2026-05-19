import { useState, useRef, useEffect } from "react";
import {
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconMinus,
  IconCircle,
  IconListCheck,
} from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useAuiState, useThreadRuntime } from "@assistant-ui/react";
import {
  threadPlanAtomFamily,
  planStatesAtom,
  type PlanItem,
  type PlanItemStatus,
} from "@/lib/atoms/plan-state";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Item status icon
// ---------------------------------------------------------------------------

function ItemStatusIcon({ status }: { status: PlanItemStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-500">
          <IconCheck className="size-2.5" />
        </span>
      );
    case "in_progress":
      return (
        <IconLoader2 className="size-4 shrink-0 animate-spin text-primary" />
      );
    case "skipped":
      return <IconMinus className="size-4 shrink-0 text-muted-foreground/50" />;
    default:
      return (
        <IconCircle className="size-4 shrink-0 text-muted-foreground/40" />
      );
  }
}

// ---------------------------------------------------------------------------
// Single plan item row
// ---------------------------------------------------------------------------

function PlanItemRow({ item }: { item: PlanItem }) {
  const isSkipped = item.status === "skipped";
  const isCompleted = item.status === "completed";

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="mt-0.5">
        <ItemStatusIcon status={item.status} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm leading-snug",
            isSkipped && "text-muted-foreground/50 line-through",
            isCompleted && "text-muted-foreground",
            !isSkipped && !isCompleted && "text-foreground",
          )}
        >
          {item.label}
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground">{item.notes}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main PlanProgressBar component
// ---------------------------------------------------------------------------

export function PlanProgressBar() {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadId = remoteId ?? localId;

  const plan = useAtomValue(threadPlanAtomFamily(threadId));
  const setPlanStates = useSetAtom(planStatesAtom);
  const threadRuntime = useThreadRuntime();

  // Collapse state — forced open while pending approval
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Rejection feedback UI
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const rejectInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open when a plan first appears pending approval
  const prevApprovalStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!plan) return;
    if (
      plan.approvalStatus === "pending_approval" &&
      prevApprovalStatus.current !== "pending_approval"
    ) {
      setIsOpen(true);
      setIsDismissed(false);
      setShowRejectInput(false);
      setRejectFeedback("");
    }
    prevApprovalStatus.current = plan.approvalStatus;
  }, [plan?.approvalStatus]);

  // Focus reject textarea when it appears
  useEffect(() => {
    if (showRejectInput) {
      requestAnimationFrame(() => rejectInputRef.current?.focus());
    }
  }, [showRejectInput]);

  if (!plan || isDismissed) return null;

  const completedCount = plan.items.filter(
    (i) => i.status === "completed" || i.status === "skipped",
  ).length;
  const totalCount = plan.items.length;
  const isPendingApproval = plan.approvalStatus === "pending_approval";
  const isCompleted = plan.approvalStatus === "completed";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleApprove() {
    // Optimistically mark the plan as approved so the bar collapses
    setPlanStates((prev) => ({
      ...prev,
      [threadId]: prev[threadId]
        ? { ...prev[threadId]!, approvalStatus: "approved" }
        : null,
    }));
    setIsOpen(false);

    threadRuntime.append({
      role: "user",
      content: [
        { type: "text", text: "Approved — please proceed with the plan." },
      ],
    });
  }

  function handleReject() {
    const feedback = rejectFeedback.trim();
    const message = feedback
      ? `Plan rejected. Please revise it. Feedback: ${feedback}`
      : "Plan rejected. Please revise it.";

    setShowRejectInput(false);
    setRejectFeedback("");

    threadRuntime.append({
      role: "user",
      content: [{ type: "text", text: message }],
    });
  }

  // ---------------------------------------------------------------------------
  // Collapsed summary bar
  // ---------------------------------------------------------------------------

  const CollapsedBar = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="flex w-full items-center gap-2 border border-border bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/60"
    >
      <IconListCheck
        className={cn(
          "size-4 shrink-0",
          isCompleted ? "text-green-500" : "text-primary",
        )}
      />
      <span className="flex-1 truncate text-sm">
        {isCompleted ? (
          <span className="text-green-600 dark:text-green-400">
            Plan complete ({totalCount}/{totalCount})
          </span>
        ) : isPendingApproval ? (
          <span className="text-amber-600 dark:text-amber-400">
            Plan ready for review — {plan.title}
          </span>
        ) : (
          <span>
            <span className="font-medium text-foreground">
              Plan: {completedCount}/{totalCount}
            </span>
            <span className="ml-1.5 text-muted-foreground">— {plan.title}</span>
          </span>
        )}
      </span>
      <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );

  // ---------------------------------------------------------------------------
  // Expanded panel
  // ---------------------------------------------------------------------------

  const ExpandedPanel = (
    <div className="w-full border border-border bg-background shadow-sm">
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border px-3 py-2.5",
          isPendingApproval && "bg-amber-50/50 dark:bg-amber-950/20",
          isCompleted && "bg-green-50/50 dark:bg-green-950/20",
        )}
      >
        <IconListCheck
          className={cn(
            "size-4 shrink-0",
            isPendingApproval && "text-amber-500",
            isCompleted && "text-green-500",
            !isPendingApproval && !isCompleted && "text-primary",
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {plan.title}
          </p>
          {!isPendingApproval && (
            <p className="text-xs text-muted-foreground">
              {isCompleted
                ? `All ${totalCount} steps complete`
                : `${completedCount} of ${totalCount} steps done`}
            </p>
          )}
          {isPendingApproval && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Review the steps below and approve to begin
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Dismiss button (only when completed) */}
          {isCompleted && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Dismiss"
            >
              <IconX className="size-3.5" />
            </button>
          )}
          {/* Collapse toggle (not for pending — user must act) */}
          {!isPendingApproval && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Collapse"
            >
              <IconChevronUp className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Step list */}
      <div className="px-3 py-1">
        {plan.items.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              idx < plan.items.length - 1 && "border-b border-border/50",
            )}
          >
            <PlanItemRow item={item} />
          </div>
        ))}
      </div>

      {/* Approval actions (pending only) */}
      {isPendingApproval && (
        <div className="border-t border-border px-3 py-2.5 space-y-2">
          {/* Reject feedback area */}
          {showRejectInput && (
            <div className="space-y-1.5">
              <textarea
                ref={rejectInputRef}
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Optional: tell the AI what to change..."
                rows={2}
                className="w-full resize-none border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleReject();
                  }
                  if (e.key === "Escape") {
                    setShowRejectInput(false);
                    setRejectFeedback("");
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex items-center gap-1.5 border border-destructive px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <IconX className="size-3.5" />
                  Send rejection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectFeedback("");
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Approve / Reject buttons */}
          {!showRejectInput && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApprove}
                className="flex flex-1 items-center justify-center gap-1.5 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <IconCheck className="size-4" />
                Approve &amp; start
              </button>
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                className="flex items-center gap-1.5 border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <IconX className="size-4" />
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      {isOpen ? ExpandedPanel : CollapsedBar}
    </div>
  );
}
