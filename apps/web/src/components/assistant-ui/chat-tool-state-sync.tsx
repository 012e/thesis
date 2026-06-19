import { useAuiState } from "@assistant-ui/react";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

import { formDraftsAtom } from "@/lib/atoms/form-drafts";
import { planStatesAtom, type PlanItem } from "@/lib/atoms/plan-state";

type ToolCallPart = {
  type?: unknown;
  toolCallId?: unknown;
  toolName?: unknown;
  args?: unknown;
  status?: unknown;
};

type ToolArgs = Record<string, unknown>;

export function ChatToolStateSync({
  syncForms = false,
  syncPlans = true,
}: {
  syncForms?: boolean;
  syncPlans?: boolean;
}) {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadId = remoteId ?? localId;
  const messages = useAuiState((s) => s.thread.messages);
  const setDrafts = useSetAtom(formDraftsAtom);
  const setPlanStates = useSetAtom(planStatesAtom);
  const seenSubmitCallsByThread = useRef(new Map<string, Set<string>>());

  useEffect(() => {
    if (!messages) return;

    // Replay completed tool calls from history to derive authoritative UI state.
    let derivedActiveForm: string | undefined = undefined;
    const derivedData: Record<string, unknown> = {};
    const completedSubmitCalls = new Set<string>();

    let latestPlanArgs: {
      title: string;
      items: Array<{ id: string; label: string; description?: string }>;
    } | null = null;
    const itemUpdates: Record<
      string,
      { status: PlanItem["status"]; notes?: string }
    > = {};

    for (const [messageIndex, msg] of messages.entries()) {
      if (msg.role !== "assistant") continue;

      for (const [partIndex, part] of getToolCallParts(msg).entries()) {
        if (isRunningToolCall(part)) continue;

        const args = getToolArgs(part.args);

        if (part.toolName === "open_form") {
          derivedActiveForm = getStringArg(args, "formName");
        } else if (part.toolName === "set_form_field") {
          const field = getStringArg(args, "field");
          if (field) derivedData[normalizeFormField(field)] = args.value;
        } else if (part.toolName === "submit_form") {
          completedSubmitCalls.add(
            getToolCallKey(part, messageIndex, partIndex),
          );
        } else if (part.toolName === "create_plan") {
          const title = getStringArg(args, "title");
          const items = getPlanItems(args.items);

          if (title && items) {
            latestPlanArgs = { title, items };
            Object.keys(itemUpdates).forEach((k) => delete itemUpdates[k]);
          }
        } else if (part.toolName === "update_plan_item" && latestPlanArgs) {
          const id = getStringArg(args, "id");
          const status = getPlanItemStatus(args.status);

          if (id && status) {
            const notes = getStringArg(args, "notes");
            itemUpdates[id] = notes ? { status, notes } : { status };
          }
        }
      }
    }

    if (syncForms) {
      const seenSubmitCalls = seenSubmitCallsByThread.current.get(threadId);
      const shouldSubmit =
        seenSubmitCalls !== undefined &&
        [...completedSubmitCalls].some((callId) => !seenSubmitCalls.has(callId));

      // The first snapshot for a thread is history, not a new tool event.
      // Record it as already handled so revisiting a thread cannot resubmit.
      if (seenSubmitCalls) {
        completedSubmitCalls.forEach((callId) => seenSubmitCalls.add(callId));
      } else {
        seenSubmitCallsByThread.current.set(threadId, completedSubmitCalls);
      }

      setDrafts((prev) => {
        const current = prev[threadId];
        const submitRequest =
          shouldSubmit || (current?.submitRequest ?? false);

        if (
          current !== undefined &&
          current.activeForm === derivedActiveForm &&
          recordsEqual(current.data, derivedData) &&
          (current.submitRequest ?? false) === submitRequest
        ) {
          return prev;
        }

        return {
          ...prev,
          [threadId]: {
            activeForm: derivedActiveForm,
            data: derivedData,
            // Only a newly completed submit_form call may arm this flag.
            // PostCreationForm clears it before starting the request.
            submitRequest,
          },
        };
      });
    }

    if (syncPlans) {
      setPlanStates((prev) => {
        if (!latestPlanArgs) {
          if (prev[threadId] !== null && prev[threadId] !== undefined) {
            return { ...prev, [threadId]: null };
          }
          return prev;
        }

        const items: PlanItem[] = latestPlanArgs.items.map((item) => ({
          ...item,
          status: itemUpdates[item.id]?.status ?? "pending",
          notes: itemUpdates[item.id]?.notes,
        }));

        const hasAnyUpdate = Object.keys(itemUpdates).length > 0;
        const allDone = items.every(
          (i) => i.status === "completed" || i.status === "skipped",
        );
        const approvalStatus = allDone
          ? "completed"
          : hasAnyUpdate
            ? "approved"
            : "pending_approval";

        const previousApprovalStatus = prev[threadId]?.approvalStatus;
        const resolvedApprovalStatus =
          approvalStatus === "pending_approval" &&
          previousApprovalStatus === "approved"
            ? "approved"
            : approvalStatus;

        return {
          ...prev,
          [threadId]: {
            title: latestPlanArgs.title,
            items,
            approvalStatus: resolvedApprovalStatus,
          },
        };
      });
    }
  }, [messages, syncForms, syncPlans, threadId, setDrafts, setPlanStates]);

  return null;
}

function getToolCallParts(message: { content?: unknown }): ToolCallPart[] {
  if (!Array.isArray(message.content)) return [];

  return message.content.filter(
    (part): part is ToolCallPart =>
      isRecord(part) &&
      part.type === "tool-call" &&
      typeof part.toolName === "string",
  );
}

function isRunningToolCall(part: ToolCallPart) {
  return isRecord(part.status) && part.status.type === "running";
}

function getToolArgs(args: unknown): ToolArgs {
  return isRecord(args) ? args : {};
}

function getToolCallKey(
  part: ToolCallPart,
  messageIndex: number,
  partIndex: number,
) {
  return typeof part.toolCallId === "string"
    ? part.toolCallId
    : `${messageIndex}:${partIndex}`;
}

function getStringArg(args: ToolArgs, key: string) {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeFormField(field: string) {
  return field === "text" ? "content" : field;
}

function recordsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        Object.is(left[key], right[key]),
    )
  );
}

function getPlanItems(value: unknown) {
  if (!Array.isArray(value)) return null;

  const items = value.filter(
    (item): item is { id: string; label: string; description?: string } =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      (item.description === undefined || typeof item.description === "string"),
  );

  return items.length === value.length ? items : null;
}

function getPlanItemStatus(value: unknown): PlanItem["status"] | undefined {
  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "skipped"
  ) {
    return value;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
