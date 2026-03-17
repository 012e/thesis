import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import type { FC, ReactNode } from "react";
import { env } from "@/env";

export const ChatRuntimeProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: env.VITE_MASTRA_CHAT_URL,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
