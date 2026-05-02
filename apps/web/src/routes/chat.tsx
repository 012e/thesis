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
import { FormRegistry } from "@/components/forms/registry";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import isThreadListOpenAtom from "@/lib/atoms/thread-list-visibility";
import { formDraftsAtom } from "@/lib/atoms/form-drafts";
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
  const threadId = useAuiState((s) => (s.thread as any).id || (s.thread as any).threadId || "default");
  const [drafts, setDrafts] = useAtom(formDraftsAtom);
  const draft = drafts[threadId] || { data: {} };

  const messages = useAuiState((s) => s.thread.messages);

  useEffect(() => {
    if (!messages) return;
    let newDraftData = { ...draft.data };
    let newActiveForm = draft.activeForm;
    let stateChanged = false;

    // Scan messages for tool calls. We replay them sequentially.
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
        }
      }));
    }
  }, [messages, threadId, setDrafts]);

  // System instructions to make AI aware of current form
  useAssistantInstructions(`
Current Active Form: ${draft.activeForm || "None"}
Current Form State: ${JSON.stringify(draft.data)}

Use the open_form tool to select a form, and set_form_field to edit fields.
`);

  const ActiveForm = draft.activeForm ? FormRegistry[draft.activeForm] : null;

  return (
    <ResizablePanelGroup orientation="horizontal" className="w-full">
      {ActiveForm && (
        <>
          <ResizablePanel defaultSize={60} minSize={30} className="bg-muted/10 overflow-y-auto">
            <div className="p-6 h-full">
              <ActiveForm key={threadId} threadId={threadId} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel defaultSize={ActiveForm ? 40 : 100} minSize={30} className="bg-background">
        <Thread />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
