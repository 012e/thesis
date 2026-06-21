import { Thread } from "@/components/assistant-ui/thread";
import { FormRegistry } from "@/components/forms/registry";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChatState } from "@/hooks/use-chat-state";

export function ChatWorkspace() {
  const { threadId, activeForm } = useChatState();

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
        <Thread
          footerContent={
            <ActiveVerticalForm />
          }
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ActiveVerticalForm() {
  const { threadId, activeForm } = useChatState();

  if (!activeForm) return null;
  const config = FormRegistry[activeForm];
  if (config?.layout !== "vertical") return null;

  const Form = config.form;
  return (
    <div className="w-full max-w-2xl p-4 bg-muted/30 border border-border shadow-sm">
      <Form threadId={threadId} />
    </div>
  );
}
