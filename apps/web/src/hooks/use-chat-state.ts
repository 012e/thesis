import { useAuiState } from "@assistant-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { formDraftsAtom } from "@/lib/atoms/form-drafts";
import {
  threadActiveFormAtomFamily,
  threadDraftDataAtomFamily,
  threadModelModeAtomFamily,
} from "@/lib/atoms/chat-state";

/**
 * Reads the current chat thread's derived state with fine-grained selectors.
 *
 * Each returned value is backed by a `selectAtom`-derived atom, so a component
 * using only `model` won't re-render when `draftData` changes, and vice-versa.
 *
 * Usage:
 * ```tsx
 * const { activeForm, draftData, model } = useChatState();
 * ```
 *
 * Must be rendered inside `AssistantRuntimeProvider` (i.e. inside
 * `ChatRuntimeProvider`) because it calls `useAuiState`.
 */
export function useChatState() {
  // `Thread` state has no `id` field — the stable per-thread key lives on
  // `ThreadListItem`. Use `remoteId` (server-assigned, survives page refresh)
  // and fall back to the ephemeral local `id` for brand-new unsent threads.
  const { id: localId, remoteId } = useAuiState((s) => s.threadListItem);
  const threadId = remoteId ?? localId;

  // Fine-grained selectors — each subscriber re-renders only on its slice
  const activeForm = useAtomValue(threadActiveFormAtomFamily(threadId));
  const draftData = useAtomValue(threadDraftDataAtomFamily(threadId));
  const model = useAtomValue(threadModelModeAtomFamily(threadId));

  // Low-level write access to the full drafts map
  const setDrafts = useSetAtom(formDraftsAtom);

  return { threadId, activeForm, draftData, model, setDrafts } as const;
}
