import { atomWithStorage, createJSONStorage } from "jotai/utils";

/**
 * Persists the most-recently-active thread's remote ID in sessionStorage.
 *
 * The root ChatRuntimeProvider writes to this atom whenever the active thread
 * changes, and reads from it on mount to restore the last active thread.
 *
 * sessionStorage scope means the state is shared within the current browser
 * tab but not across tabs, which is the right granularity for "continue where
 * you left off" UX.
 */
export const activeThreadRemoteIdAtom = atomWithStorage<string | null>(
  "chat_active_thread_remote_id",
  null,
  createJSONStorage(() => sessionStorage),
);
