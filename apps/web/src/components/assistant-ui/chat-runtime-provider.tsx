import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAuiState,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import {
  useRef,
  useMemo,
  type FC,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useAtomValue } from "jotai";
import { env } from "@/env";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";
import { useThreadHistoryAdapter } from "@/lib/chat/history-adapter";
import bearerToken from "@/lib/atoms/bearer-token";
import threadModelModesAtom from "@/lib/atoms/thread-model-modes";
import type { ModelMode } from "@/lib/atoms/model-mode";
import {
  globalAIContextAtom,
  serializeAIContext,
} from "@/lib/atoms/ai-context";
import store from "@/lib/atoms/store";

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

  // Stable adapter reference — recreating this object on every render would
  // cause useRemoteThreadListRuntime to call __internal_load() repeatedly.
  const stableAdapter = useMemo(() => threadListAdapter, []);

  const runtime = useRemoteThreadListRuntime({
    adapter: stableAdapter,
    runtimeHook: function useRuntimeHook() {
      const history = useThreadHistoryAdapter();

      return useChatRuntime({
        transport: new AssistantChatTransport({
          api: env.VITE_MASTRA_CHAT_URL,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: () => ({
            mode: modeRef.current,
            context: serializeAIContext(store.get(globalAIContextAtom)),
          }),
        }),
        adapters: { history },
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
