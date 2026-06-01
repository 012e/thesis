import { useAuiState } from "@assistant-ui/react";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { formDraftsAtom } from "@/lib/atoms/form-drafts";
import { planStatesAtom, type PlanItem } from "@/lib/atoms/plan-state";

type ToolCallPart = {
  type?: unknown;
  toolName?: unknown;
  args?: unknown;
  status?: unknown;
};

type ToolArgs = Record<string, unknown>;

export function ChatToolStateSync() {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadId = remoteId ?? localId;
  const messages = useAuiState((s) => s.thread.messages);
  const setDrafts = useSetAtom(formDraftsAtom);
  const setPlanStates = useSetAtom(planStatesAtom);

  useEffect(() => {
    if (!messages) return;

    // Replay completed tool calls from history to derive authoritative UI state.
    let derivedActiveForm: string | undefined = undefined;
    const derivedData: Record<string, unknown> = {};
    let hasSubmit = false;

    let latestPlanArgs: {
      title: string;
      items: Array<{ id: string; label: string; description?: string }>;
    } | null = null;
    const itemUpdates: Record<
      string,
      { status: PlanItem["status"]; notes?: string }
    > = {};

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;

      for (const part of getToolCallParts(msg)) {
        if (isRunningToolCall(part)) continue;

        const args = getToolArgs(part.args);

        if (part.toolName === "open_form") {
          derivedActiveForm = getStringArg(args, "formName");
        } else if (part.toolName === "set_form_field") {
          const field = getStringArg(args, "field");
          if (field) derivedData[field] = args.value;
        } else if (part.toolName === "submit_form") {
          hasSubmit = true;
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

    setDrafts((prev) => {
      const current = prev[threadId];
      return {
        ...prev,
        [threadId]: {
          activeForm: derivedActiveForm,
          data: derivedData,
          // Only set submitRequest; PostCreationForm clears it after submission.
          submitRequest: hasSubmit || (current?.submitRequest ?? false),
        },
      };
    });

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
  }, [messages, threadId, setDrafts, setPlanStates]);

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

function getStringArg(args: ToolArgs, key: string) {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
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
