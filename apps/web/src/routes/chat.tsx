import { createFileRoute } from "@tanstack/react-router";
import {
  IconArchive,
  IconMessage,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  makeAssistantToolUI,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAssistantInstructions,
  useAuiState,
} from "@assistant-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { FormRegistry } from "@/components/forms/registry";
import { useChatState } from "@/hooks/use-chat-state";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { planStatesAtom, type PlanItem } from "@/lib/atoms/plan-state";
import { cn } from "@/lib/utils";

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
  return (
    <ChatRuntimeProvider>
      <OpenFormToolUI />
      <SetFormFieldToolUI />
      <SubmitFormToolUI />
      <CreatePlanToolUI />
      <UpdatePlanItemToolUI />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />

        <div className="relative flex flex-1 flex-col overflow-hidden border-l">
          <ThreadSelector />
          <ChatWorkspace />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}

function ThreadSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  const ThreadSelectorItem = () => {
    const titleRef = useRef<HTMLSpanElement>(null);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);

    const updateTitleTruncation = () => {
      const title = titleRef.current;
      setIsTitleTruncated(
        Boolean(title && title.scrollWidth > title.clientWidth),
      );
    };

    useLayoutEffect(() => {
      updateTitleTruncation();

      const title = titleRef.current;
      if (!title) return;

      const resizeObserver = new ResizeObserver(updateTitleTruncation);
      resizeObserver.observe(title);
      return () => resizeObserver.disconnect();
    }, []);

    return (
      <ThreadListItemPrimitive.Root className="group relative flex items-center px-1">
        <Tooltip>
          <TooltipTrigger
            disabled={!isTitleTruncated}
            delay={1000}
            render={
              <ThreadListItemPrimitive.Trigger
                onClick={() => setOpen(false)}
                onPointerEnter={updateTitleTruncation}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm transition-colors hover:bg-accent data-active:bg-accent data-active:font-medium"
              />
            }
          >
            <IconMessage className="size-4 shrink-0 text-muted-foreground" />
            <span ref={titleRef} className="min-w-0 flex-1 truncate">
              <ThreadListItemPrimitive.Title fallback="New conversation" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-80">
            <ThreadListItemPrimitive.Title fallback="New conversation" />
          </TooltipContent>
        </Tooltip>

        <div className="absolute right-1 hidden items-center gap-0.5 border bg-background shadow-sm group-hover:flex">
          <ThreadListItemPrimitive.Archive asChild>
            <button
              type="button"
              title="Archive"
              className="p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconArchive className="size-3.5" />
            </button>
          </ThreadListItemPrimitive.Archive>
          <ThreadListItemPrimitive.Delete asChild>
            <button
              type="button"
              title="Delete"
              className="p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <IconTrash className="size-3.5" />
            </button>
          </ThreadListItemPrimitive.Delete>
        </div>
      </ThreadListItemPrimitive.Root>
    );
  };

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-20">
      <ThreadListPrimitive.Root>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Expand threads"
          title="Expand threads"
          className="group flex size-10 items-center justify-center bg-background/90 shadow-sm transition-colors hover:bg-accent"
        >
          <IconMessage
            className={cn(
              "size-5 text-muted-foreground transition-all duration-200 group-hover:-rotate-6 group-hover:scale-110",
              open && "rotate-12 scale-110 animate-pulse text-primary",
            )}
          />
        </button>

        {open ? (
          <div className="mt-2 w-64 max-h-96 overflow-hidden border bg-popover text-popover-foreground shadow-xl">
            <div className="border-b p-1">
              <ThreadListPrimitive.New asChild>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <IconPlus className="size-4" />
                  New chat
                </button>
              </ThreadListPrimitive.New>
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              <ThreadListPrimitive.Items>
                {() => <ThreadSelectorItem />}
              </ThreadListPrimitive.Items>
            </div>
          </div>
        ) : null}
      </ThreadListPrimitive.Root>
    </div>
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
        } else if (
          part.toolName === "create_plan" &&
          args.title &&
          Array.isArray(args.items)
        ) {
          // A new plan resets all previous item update tracking
          latestPlanArgs = { title: args.title as string, items: args.items };
          Object.keys(itemUpdates).forEach((k) => delete itemUpdates[k]);
        } else if (
          part.toolName === "update_plan_item" &&
          latestPlanArgs &&
          args.id
        ) {
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
