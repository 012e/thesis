import { createFileRoute } from "@tanstack/react-router";
import { useAuiState } from "@assistant-ui/react";
import { useQuery } from "@tanstack/react-query";
import { millify } from "millify";
import { ChatRuntimeProvider } from "@/components/assistant-ui/chat-runtime-provider";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { client } from "@/lib/api";
import { threadTokenUsageQueryKey } from "@/lib/chat/token-usage-query";
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

export function ChatPage() {
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
          <ThreadTokenUsage />
          <ChatWorkspace />
        </div>
      </div>
    </ChatRuntimeProvider>
  );
}

function ThreadTokenUsage() {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const messageCount = useAuiState((s) => s.thread.messages?.length ?? 0);

  const { data } = useQuery({
    queryKey: [...threadTokenUsageQueryKey(remoteId), messageCount],
    enabled: Boolean(remoteId),
    queryFn: async () => {
      if (!remoteId) return null;

      const response = await client.getThreadTokenUsage({
        params: { id: remoteId },
      });

      if (response.status === 404) return null;
      if (response.status !== 200) {
        throw new Error(`Failed to load token usage: ${response.status}`);
      }

      return response.body;
    },
  });

  if (!remoteId) return null;

  return (
    <div className="absolute top-4 right-4 z-20 border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
      {data ? `${millify(data.totalTokens)} tokens` : "0 tokens"}
    </div>
  );
}
