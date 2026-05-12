import { createFileRoute } from "@tanstack/react-router";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import {
  useAuiState,
  makeAssistantToolUI,
  useAssistantInstructions,
} from "@assistant-ui/react";
import { FormRegistry } from "@/components/forms/registry";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useEffect } from "react";
import { useChatState } from "@/hooks/use-chat-state";

export const Route = createFileRoute("/compose")({
  component: ComposePage,
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

function ComposePage() {
  return (
    <ChatRuntimeProvider>
      <OpenFormToolUI />
      <SetFormFieldToolUI />
      <SubmitFormToolUI />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />
        <ThreadList className="w-64 shrink-0" />

        <div className="flex flex-1 overflow-hidden border-l">
          <ComposeWorkspace />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}

function ComposeWorkspace() {
  const { threadId, activeForm, draftData, setDrafts } = useChatState();

  // Listen to tool calls to update state (the UI tool interceptors run on render, but we need to update Jotai state too.
  // Wait, makeAssistantToolUI handles rendering, but how do we update the form state from the backend tool call?
  // We can read messages and sync state.
  const messages = useAuiState((s) => s.thread.messages);

  useEffect(() => {
    if (!messages) return;
    let newDraftData = { ...draftData };
    let newActiveForm = activeForm;
    let stateChanged = false;

    // Scan messages for tool calls. We replay them sequentially.
    // In a real app we might only process new ones, but for simplicity we replay.
    messages.forEach((msg) => {
      if (msg.role !== "assistant" || !msg.content) return;
      msg.content.forEach((part) => {
        if (part.type === "tool-call") {
          const { toolName, args } = part;
          if (toolName === "open_form") {
            if (newActiveForm !== args.formName) {
              newActiveForm = args.formName as string;
              stateChanged = true;
            }
          } else if (toolName === "set_form_field") {
            if (newDraftData[args.field as string] !== args.value) {
              newDraftData[args.field as string] = args.value;
              stateChanged = true;
            }
          }
        }
      });
    });

    if (stateChanged) {
      setDrafts((prev) => ({
        ...prev,
        [threadId]: {
          activeForm: newActiveForm,
          data: newDraftData,
        },
      }));
    }
  }, [messages, threadId, setDrafts]);

  // System instructions to make AI aware of current form
  useAssistantInstructions(`
Current Active Form: ${activeForm || "None"}
Current Form State: ${JSON.stringify(draftData)}

Use the open_form tool to select a form, and set_form_field to edit fields.
`);

  const activeFormConfig = activeForm ? FormRegistry[activeForm] : null;
  const ActiveForm = activeFormConfig?.form;

  return (
    <ResizablePanelGroup orientation="horizontal" className="w-full">
      <ResizablePanel
        defaultSize={60}
        minSize={30}
        className="bg-muted/10 overflow-y-auto"
      >
        <div className="p-6 h-full">
          {ActiveForm ? (
            <ActiveForm key={threadId} threadId={threadId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-4">
              <p>No active form</p>
              <p className="text-sm">Ask the assistant to draft a post.</p>
            </div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={40} minSize={30} className="bg-background">
        <Thread />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
