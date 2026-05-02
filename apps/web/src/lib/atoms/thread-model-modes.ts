import { atomWithStorage } from "jotai/utils";
import type { ModelMode } from "./model-mode";

/**
 * Persisted map of thread key → ModelMode.
 *
 * Key is `remoteId` for initialized threads (stable across page refreshes)
 * or the assistant-ui local `id` for brand-new unsent threads (session-local
 * until the thread gets a remoteId, at which point the entry is migrated).
 */
const threadModelModesAtom = atomWithStorage<Record<string, ModelMode>>(
  "thread-model-modes",
  {},
);

export default threadModelModesAtom;
