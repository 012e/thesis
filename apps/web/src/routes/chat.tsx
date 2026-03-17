import { createFileRoute } from "@tanstack/react-router";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { LeftSidebar } from "@/components/layout/left-sidebar";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  return (
    <ChatRuntimeProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Left navigation sidebar (same as main layout) */}
        <LeftSidebar />

        {/* Thread list sidebar */}
        <ThreadList className="w-64 shrink-0" />

        {/* Main chat area */}
        <div className="flex flex-1 flex-col overflow-hidden border-l">
          <Thread />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
