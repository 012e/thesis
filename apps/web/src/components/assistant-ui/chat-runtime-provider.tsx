import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAuiState,
  useAssistantRuntime,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import {
  useRef,
  useEffect,
  useMemo,
  type FC,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useAtomValue, useAtom } from "jotai";
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
import { activeThreadRemoteIdAtom } from "@/lib/atoms/active-thread";

const DEFAULT_MODE: ModelMode = "fast";

/**
 * Rendered inside AssistantRuntimeProvider so it has full access to the
 * runtime context.
 *
 * Responsibilities:
 * 1. Keeps modeRef in sync with the active thread's persisted model mode
 *    (existing behaviour — updates synchronously during render).
 * 2. Saves the active thread's remoteId to sessionStorage whenever it changes.
 * 3. On mount, restores the previously-active thread by subscribing to the
 *    thread list and switching once it has finished loading.
 */
const ActiveModeSync: FC<{ modeRef: MutableRefObject<ModelMode> }> = ({
  modeRef,
}) => {
  // useAssistantRuntime gives direct access to threadList with its full API:
  // getState(), subscribe(), switchToThread().
  const runtime = useAssistantRuntime();
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadModes = useAtomValue(threadModelModesAtom);
  const [savedRemoteId, setSavedRemoteId] = useAtom(activeThreadRemoteIdAtom);

  // (1) Update modeRef synchronously during render — no useEffect needed.
  modeRef.current = threadModes[remoteId ?? localId] ?? DEFAULT_MODE;

  // (2) Persist the active thread's remoteId to sessionStorage whenever it
  //     changes. Only save when the thread has been synced to the server
  //     (i.e. has a real remoteId).
  useEffect(() => {
    if (remoteId) setSavedRemoteId(remoteId);
  }, [remoteId, setSavedRemoteId]);

  // (3) Restore the saved thread once the thread list has loaded.
  //     hasRestoredRef prevents repeated switching within one mount lifetime.
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current || !savedRemoteId) return;

    const tryRestore = () => {
      const state = runtime.threads.getState();
      if (state.isLoading) return;

      // Already on the correct thread — mark done without switching.
      if (state.threadItems[state.mainThreadId]?.remoteId === savedRemoteId) {
        hasRestoredRef.current = true;
        return;
      }

      // Search regular threads first, then archived ones.
      const allIds = [...state.threadIds, ...state.archivedThreadIds];
      const targetLocalId = allIds.find(
        (id) => state.threadItems[id]?.remoteId === savedRemoteId,
      );

      if (targetLocalId) {
        hasRestoredRef.current = true;
        runtime.threads.switchToThread(targetLocalId).catch(() => {});
      }
    };

    // Try immediately (thread list may already be loaded).
    tryRestore();

    // Subscribe so we retry once the list finishes loading.
    return runtime.threads.subscribe(tryRestore);
  }, [savedRemoteId, runtime]);

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
      {/* Keeps modeRef in sync and handles cross-route thread state persistence. */}
      <ActiveModeSync modeRef={modeRef} />
      {children}
    </AssistantRuntimeProvider>
  );
};
