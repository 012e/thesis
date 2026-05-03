import { createFileRoute } from "@tanstack/react-router";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
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
            aria-label={
              isThreadListOpen ? "Collapse threads" : "Expand threads"
            }
            title={isThreadListOpen ? "Collapse threads" : "Expand threads"}
            className="absolute top-4 left-4 z-10 flex size-10 items-center justify-center rounded-full bg-background/90 shadow-sm transition-colors hover:bg-muted"
            tabIndex={-1}
          >
            {isThreadListOpen ? (
              <IconChevronLeft className="size-5" />
            ) : (
              <IconChevronRight className="size-5" />
            )}
          </button>
          <Thread />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}
