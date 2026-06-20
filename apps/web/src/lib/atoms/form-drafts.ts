import { atom } from "jotai";

export type FormDraftState = {
  activeForm?: string;
  data: Record<string, unknown>;
  /** Correlates an awaited submit_form tool call with the mounted form. */
  submitRequestId?: string;
};

export const formDraftsAtom = atom<Record<string, FormDraftState>>({});
