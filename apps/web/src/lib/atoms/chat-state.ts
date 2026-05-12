import { selectAtom } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { formDraftsAtom } from "./form-drafts";
import threadModelModesAtom from "./thread-model-modes";
import type { ModelMode } from "./model-mode";

const DEFAULT_MODE: ModelMode = "fast";

/**
 * Selects only the `activeForm` field for a given thread.
 * Subscribers won't re-render when only `data` changes.
 */
export const threadActiveFormAtomFamily = atomFamily((threadId: string) =>
  selectAtom(formDraftsAtom, (drafts) => drafts[threadId]?.activeForm),
);

/**
 * Selects only the `data` record for a given thread.
 * Subscribers won't re-render when only `activeForm` changes.
 */
export const threadDraftDataAtomFamily = atomFamily((threadId: string) =>
  selectAtom(formDraftsAtom, (drafts) => drafts[threadId]?.data ?? {}),
);

/**
 * Selects the model mode for a given thread key (`remoteId ?? localId`).
 * Falls back to "fast" if no preference is saved.
 */
export const threadModelModeAtomFamily = atomFamily((threadKey: string) =>
  selectAtom(
    threadModelModesAtom,
    (modes) => (modes[threadKey] ?? DEFAULT_MODE) as ModelMode,
  ),
);
