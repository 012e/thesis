import { createFileRoute } from "@tanstack/react-router";
import { useAuiState } from "@assistant-ui/react";
import { FormToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { ChatWorkspace } from "./-chat-workspace";
import { ThreadSelector } from "./-thread-selector";

export const Route = createFileRoute("/chat/")({
  component: ChatPage,
});

export function ChatPage() {
  return (
    <>
      <FormToolUIs />
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />

        <div className="relative flex flex-1 flex-col overflow-hidden border-l">
          <ThreadSelector />
          <ThreadTokenUsage />
          <ChatWorkspace />
        </div>
      </div>
    </>
  );
}

function ThreadTokenUsage() {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);

  if (!remoteId) return null;

  return null;
}
