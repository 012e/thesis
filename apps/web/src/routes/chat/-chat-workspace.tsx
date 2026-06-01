import { useAssistantInstructions } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { FormRegistry } from "@/components/forms/registry";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChatState } from "@/hooks/use-chat-state";

export function ChatWorkspace() {
  const { threadId, activeForm, draftData } = useChatState();

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
