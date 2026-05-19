import { createFileRoute } from "@tanstack/react-router";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { ChatWorkspace } from "./-chat-workspace";
import {
  CreatePlanToolUI,
  OpenFormToolUI,
  SetFormFieldToolUI,
  SubmitFormToolUI,
  UpdatePlanItemToolUI,
} from "./-tool-uis";
import { ThreadSelector } from "./-thread-selector";

export const Route = createFileRoute("/chat/")({
  component: ChatPage,
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
