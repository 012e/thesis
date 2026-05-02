import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAuiState,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useRef, type FC, type MutableRefObject, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { env } from "@/env";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";
import { HistoryAdapterProvider } from "@/lib/chat/history-adapter";
import bearerToken from "@/lib/atoms/bearer-token";
import threadModelModesAtom from "@/lib/atoms/thread-model-modes";
import type { ModelMode } from "@/lib/atoms/model-mode";

const DEFAULT_MODE: ModelMode = "fast";

/**
 * Rendered inside AssistantRuntimeProvider so it has full access to
 * useAuiState. Updates modeRef synchronously during render so the transport's
 * body() callback always reads the correct per-thread mode before any request
 * fires, even immediately after a thread switch.
 */
const ActiveModeSync: FC<{ modeRef: MutableRefObject<ModelMode> }> = ({
  modeRef,
}) => {
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadModes = useAtomValue(threadModelModesAtom);

  // Update the ref synchronously during render — no useEffect needed.
  modeRef.current = threadModes[remoteId ?? localId] ?? DEFAULT_MODE;

  return null;
};

export const ChatRuntimeProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const token = useAtomValue(bearerToken);

  // Shared ref written by ActiveModeSync and read by the transport body callback.
  const modeRef = useRef<ModelMode>("fast");

  const runtime = useRemoteThreadListRuntime({
    adapter: {
      ...threadListAdapter,
      unstable_Provider: HistoryAdapterProvider,
    },
    runtimeHook: function useRuntimeHook() {
      return useChatRuntime({
        transport: new AssistantChatTransport({
          api: env.VITE_MASTRA_CHAT_URL,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: () => ({ mode: modeRef.current }),
        }),
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Keeps modeRef in sync with the active thread's persisted mode. */}
      <ActiveModeSync modeRef={modeRef} />
      {children}
    </AssistantRuntimeProvider>
  );
};
