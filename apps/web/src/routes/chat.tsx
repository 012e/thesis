import { createFileRoute } from "@tanstack/react-router";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  makeAssistantToolUI,
  useAssistantInstructions,
  useAuiState,
} from "@assistant-ui/react";
import { useEffect } from "react";
import { useAtom } from "jotai";
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

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

// -- Tool Interceptors --

const OpenFormToolUI = makeAssistantToolUI({
  toolName: "open_form",
  render: ({ args, status }) => {
    if (status.type === "running") return <div className="text-sm text-blue-500">Opening {args.formName as string}...</div>;
    return <div className="text-sm text-green-600">Opened {args.formName as string}</div>;
  }
});

const SetFormFieldToolUI = makeAssistantToolUI({
  toolName: "set_form_field",
  render: ({ args, status }) => {
    if (status.type === "running") return <div className="text-sm text-blue-500">Updating {args.field as string}...</div>;
    return <div className="text-sm text-green-600">Updated {args.field as string}</div>;
  }
});

const SubmitFormToolUI = makeAssistantToolUI({
  toolName: "submit_form",
  render: ({ status }) => {
    if (status.type === "running") return <div className="text-sm text-blue-500">Submitting form...</div>;
    return <div className="text-sm text-green-600">Form submitted</div>;
  }
});


function ChatPage() {
  const [isThreadListOpen, setIsThreadListOpen] = useAtom(isThreadListOpenAtom);

  return (
    <ChatRuntimeProvider>
      <OpenFormToolUI />
      <SetFormFieldToolUI />
      <SubmitFormToolUI />
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

  const messages = useAuiState((s) => s.thread.messages);

  useEffect(() => {
    if (!messages) return;

    // Replay all COMPLETED tool calls from the full message history to derive
    // the authoritative form state. Skipping "running" parts avoids flickering
    // from partially-streamed JSON args.
    let derivedActiveForm: string | undefined = undefined;
    const derivedData: Record<string, unknown> = {};
    let hasSubmit = false;

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of ((msg as any).content ?? [])) {
        if (part.type !== "tool-call") continue;
        // Skip tool calls whose args are still streaming
        if ((part as any).status?.type === "running") continue;

        const args = (part as any).args ?? {};
        if (part.toolName === "open_form") {
          derivedActiveForm = args.formName as string;
        } else if (part.toolName === "set_form_field") {
          derivedData[args.field as string] = args.value;
        } else if (part.toolName === "submit_form") {
          hasSubmit = true;
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
  }, [messages, threadId, setDrafts]);

  // System instructions to make AI aware of current form
  useAssistantInstructions(
    `Current Active Form: ${activeForm ?? "None"}\nCurrent Form State: ${JSON.stringify(draftData)}\n\nUse the open_form tool to select a form, and set_form_field to edit fields.`,
  );

  const activeFormConfig = activeForm ? FormRegistry[activeForm] : null;
  const ActiveForm = activeFormConfig?.form;
  const isHorizontalForm = ActiveForm && activeFormConfig?.layout === "horizontal";

  return (
    <ResizablePanelGroup orientation="horizontal" className="w-full">
      {isHorizontalForm && (
        <>
          <ResizablePanel defaultSize={60} minSize={30} className="bg-muted/10 overflow-y-auto">
            <div className="p-6 h-full flex flex-col max-h-full">
              <ActiveForm key={threadId} threadId={threadId} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel defaultSize={isHorizontalForm ? 40 : 100} minSize={30} className="bg-background">
        <Thread />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
