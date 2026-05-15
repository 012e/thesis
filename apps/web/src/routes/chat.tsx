import { createFileRoute } from "@tanstack/react-router";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  makeAssistantToolUI,
  useAssistantInstructions,
  useAuiState,
} from "@assistant-ui/react";
import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { FormRegistry } from "@/components/forms/registry";
import isThreadListOpenAtom from "@/lib/atoms/thread-list-visibility";
import { useChatState } from "@/hooks/use-chat-state";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { planStatesAtom, type PlanItem } from "@/lib/atoms/plan-state";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

// -- Tool Interceptors --

const OpenFormToolUI = makeAssistantToolUI({
  toolName: "open_form",
  render: ({ args, status }) => {
    if (status.type === "running")
      return (
        <div className="text-sm text-blue-500">
          Opening {args.formName as string}...
        </div>
      );
    return (
      <div className="text-sm text-green-600">
        Opened {args.formName as string}
      </div>
    );
  },
});

const SetFormFieldToolUI = makeAssistantToolUI({
  toolName: "set_form_field",
  render: ({ args, status }) => {
    if (status.type === "running")
      return (
        <div className="text-sm text-blue-500">
          Updating {args.field as string}...
        </div>
      );
    return (
      <div className="text-sm text-green-600">
        Updated {args.field as string}
      </div>
    );
  },
});

const SubmitFormToolUI = makeAssistantToolUI({
  toolName: "submit_form",
  render: ({ status }) => {
    if (status.type === "running")
      return <div className="text-sm text-blue-500">Submitting form...</div>;
    return <div className="text-sm text-green-600">Form submitted</div>;
  },
});

// Renders null in the chat bubble — all plan UI lives in the sticky PlanProgressBar.
// The plan state is derived entirely by the ChatWorkspace replay loop.
const CreatePlanToolUI = makeAssistantToolUI({
  toolName: "create_plan",
  render: () => null,
});

// Minimal presence in the chat; the sticky bar is the live source of truth.
const UpdatePlanItemToolUI = makeAssistantToolUI({
  toolName: "update_plan_item",
  render: ({ status }) => {
    if (status.type === "running")
      return <div className="text-sm text-blue-500">Updating step...</div>;
    return null;
  },
});

function ChatPage() {
  const [isThreadListOpen, setIsThreadListOpen] = useAtom(isThreadListOpenAtom);

  return (
    <ChatRuntimeProvider>
      <OpenFormToolUI />
      <SetFormFieldToolUI />
      <SubmitFormToolUI />
      <CreatePlanToolUI />
      <UpdatePlanItemToolUI />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />

        {isThreadListOpen ? <ThreadList className="w-64 shrink-0" /> : null}

        <div className="relative flex flex-1 flex-col overflow-hidden border-l">
          <button
            type="button"
            onClick={() => setIsThreadListOpen((prev) => !prev)}
            aria-label={
              isThreadListOpen ? "Collapse threads" : "Expand threads"
            }
            title={isThreadListOpen ? "Collapse threads" : "Expand threads"}
            className="absolute top-4 left-4 z-10 flex size-10 items-center justify-center bg-background/90 shadow-sm transition-colors"
            tabIndex={-1}
          >
            {isThreadListOpen ? (
              <IconChevronLeft className="size-5" />
            ) : (
              <IconChevronRight className="size-5" />
            )}
          </button>
          <ChatWorkspace />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}

function ChatWorkspace() {
  const { threadId, activeForm, draftData, setDrafts } = useChatState();
  const setPlanStates = useSetAtom(planStatesAtom);

  const messages = useAuiState((s) => s.thread.messages);

  useEffect(() => {
    if (!messages) return;

    // ── Form state replay ────────────────────────────────────────────────────
    // Replay all COMPLETED tool calls from the full message history to derive
    // the authoritative form state. Skipping "running" parts avoids flickering
    // from partially-streamed JSON args.
    let derivedActiveForm: string | undefined = undefined;
    const derivedData: Record<string, unknown> = {};
    let hasSubmit = false;

    // ── Plan state replay ────────────────────────────────────────────────────
    // Track the latest create_plan call and all update_plan_item calls after it.
    let latestPlanArgs: { title: string; items: Array<{ id: string; label: string; description?: string }> } | null = null;
    const itemUpdates: Record<string, { status: PlanItem["status"]; notes?: string }> = {};

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of (msg as any).content ?? []) {
        if (part.type !== "tool-call") continue;
        // Skip tool calls whose args are still streaming
        if ((part as any).status?.type === "running") continue;

        const args = (part as any).args ?? {};

        // -- Form tools --
        if (part.toolName === "open_form") {
          derivedActiveForm = args.formName as string;
        } else if (part.toolName === "set_form_field") {
          derivedData[args.field as string] = args.value;
        } else if (part.toolName === "submit_form") {
          hasSubmit = true;

        // -- Plan tools --
        } else if (part.toolName === "create_plan" && args.title && Array.isArray(args.items)) {
          // A new plan resets all previous item update tracking
          latestPlanArgs = { title: args.title as string, items: args.items };
          Object.keys(itemUpdates).forEach((k) => delete itemUpdates[k]);
        } else if (part.toolName === "update_plan_item" && latestPlanArgs && args.id) {
          itemUpdates[args.id as string] = {
            status: args.status as PlanItem["status"],
            notes: args.notes as string | undefined,
          };
        }
      }
    }

    // Write form state
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

    // Write plan state
    setPlanStates((prev) => {
      if (!latestPlanArgs) {
        // No plan in this thread — clear any stale state
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

      // Avoid overwriting an already-optimistically-approved plan with
      // "pending_approval" when the replay runs before the first update_plan_item
      // call comes back. If the previous state is "approved" and we derived
      // "pending_approval", keep "approved" (the optimistic update wins).
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

  // System instructions to make AI aware of current form and plan
  useAssistantInstructions(
    `Current Active Form: ${activeForm ?? "None"}\nCurrent Form State: ${JSON.stringify(draftData)}\n\nUse the open_form tool to select a form, and set_form_field to edit fields.`,
  );

  const activeFormConfig = activeForm ? FormRegistry[activeForm] : null;
  const ActiveForm = activeFormConfig?.form;
  const isHorizontalForm =
    ActiveForm && activeFormConfig?.layout === "horizontal";

  return (
    <ResizablePanelGroup orientation="horizontal" className="w-full">
      {isHorizontalForm && (
        <>
          <ResizablePanel
            defaultSize={60}
            minSize={30}
            className="bg-muted/10 overflow-y-auto"
          >
            <div className="p-6 h-full flex flex-col max-h-full">
              <ActiveForm key={threadId} threadId={threadId} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel
        defaultSize={isHorizontalForm ? 40 : 100}
        minSize={30}
        className="bg-background"
      >
        <Thread />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
