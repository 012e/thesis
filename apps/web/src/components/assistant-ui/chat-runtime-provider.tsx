import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import type { FC, ReactNode } from "react";
import { env } from "@/env";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";

export const ChatRuntimeProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () =>
      useChatRuntime({
        transport: new AssistantChatTransport({
          api: env.VITE_MASTRA_CHAT_URL,
        }),
      }),
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
