import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from '@assistant-ui/react';
import {
  useChatRuntime,
  AssistantChatTransport,
} from '@assistant-ui/react-ai-sdk';
import type { FC, ReactNode } from 'react';
import { env } from '@/env';
import { threadListAdapter } from '@/lib/chat/thread-list-adapter';
import { useAtomValue } from 'jotai';
import bearerToken from '@/lib/atoms/bearer-token';

export const ChatRuntimeProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const token = useAtomValue(bearerToken);
  const runtime = useRemoteThreadListRuntime({
    adapter: threadListAdapter,
    runtimeHook: () =>
      useChatRuntime({
        transport: new AssistantChatTransport({
          api: env.VITE_MASTRA_CHAT_URL,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
