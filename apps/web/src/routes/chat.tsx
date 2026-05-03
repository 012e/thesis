import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import isThreadListOpenAtom from "@/lib/atoms/thread-list-visibility";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [isThreadListOpen, setIsThreadListOpen] = useAtom(isThreadListOpenAtom);

  return (
    <ChatRuntimeProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Left navigation sidebar (same as main layout) */}
        <LeftSidebar />

        {/* Thread list sidebar */}
        {isThreadListOpen ? <ThreadList className="w-64 shrink-0" /> : null}

        {/* Main chat area */}
        <div className="relative flex flex-1 flex-col overflow-hidden border-l">
          <button
            type="button"
            onClick={() => setIsThreadListOpen((prev) => !prev)}
            className="absolute top-4 left-4 z-10 rounded-full border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            {isThreadListOpen ? "Hide threads" : "Show threads"}
          </button>
          <Thread />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
