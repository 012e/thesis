import type { PostDto } from "@repo/shared-dto";
import { produce } from "immer";

import { formDraftsAtom } from "@/lib/atoms/form-drafts";
import store from "@/lib/atoms/store";

type PendingSubmission = {
  resolve: (post: PostDto) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingSubmissions = new Map<string, PendingSubmission>();
const SUBMISSION_TIMEOUT_MS = 60_000;

export function requestFormSubmission(threadId: string): Promise<PostDto> {
  const requestId = crypto.randomUUID();

  return new Promise<PostDto>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingSubmissions.delete(requestId);
      clearSubmitRequest(threadId, requestId);
      reject(new Error("The form submission timed out."));
    }, SUBMISSION_TIMEOUT_MS);

    pendingSubmissions.set(requestId, { resolve, reject, timeoutId });

    store.set(
      formDraftsAtom,
      produce((drafts) => {
        if (!drafts[threadId]) {
          drafts[threadId] = { data: {} };
        }
        drafts[threadId]!.submitRequestId = requestId;
      }),
    );
  });
}

function clearSubmitRequest(threadId: string, requestId: string): void {
  store.set(
    formDraftsAtom,
    produce((drafts) => {
      if (drafts[threadId]?.submitRequestId === requestId) {
        drafts[threadId]!.submitRequestId = undefined;
      }
    }),
  );
}

export function completeFormSubmission(
  requestId: string,
  post: PostDto,
): void {
  const pending = pendingSubmissions.get(requestId);
  if (!pending) return;

  clearTimeout(pending.timeoutId);
  pendingSubmissions.delete(requestId);
  pending.resolve(post);
}

export function failFormSubmission(
  requestId: string,
  message: string,
): void {
  const pending = pendingSubmissions.get(requestId);
  if (!pending) return;

  clearTimeout(pending.timeoutId);
  pendingSubmissions.delete(requestId);
  pending.reject(new Error(message));
}
