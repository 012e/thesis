import { useEffect } from "react";
import type { AssistantPageId } from "./page-capabilities";

type ReadyState = {
  ready: boolean;
  listeners: Set<() => void>;
};

const readinessStates = new Map<AssistantPageId, ReadyState>();

function getReadyState(pageId: AssistantPageId) {
  let state = readinessStates.get(pageId);
  if (!state) {
    state = { ready: false, listeners: new Set() };
    readinessStates.set(pageId, state);
  }
  return state;
}

export function isAssistantPageReady(pageId: AssistantPageId) {
  return getReadyState(pageId).ready;
}

function setAssistantPageReady(pageId: AssistantPageId, ready: boolean) {
  const state = getReadyState(pageId);
  if (state.ready === ready) return;

  state.ready = ready;
  for (const listener of state.listeners) listener();
}

export function waitForAssistantPageReady(
  pageId: AssistantPageId,
  timeoutMs = 2500,
) {
  if (isAssistantPageReady(pageId)) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const state = getReadyState(pageId);
    const timeoutId = window.setTimeout(() => {
      state.listeners.delete(listener);
      resolve(false);
    }, timeoutMs);

    const listener = () => {
      if (!state.ready) return;
      window.clearTimeout(timeoutId);
      state.listeners.delete(listener);
      resolve(true);
    };

    state.listeners.add(listener);
  });
}

export function useAssistantPageReady(pageId: AssistantPageId) {
  useEffect(() => {
    setAssistantPageReady(pageId, true);

    return () => {
      setAssistantPageReady(pageId, false);
    };
  }, [pageId]);
}
