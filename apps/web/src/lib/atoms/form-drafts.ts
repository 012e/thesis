import { atom } from "jotai";

export type FormDraftState = {
  activeForm?: string;
  data: Record<string, unknown>;
  /** Set to true by the submit_form tool call; cleared by PostCreationForm after submission. */
  submitRequest?: boolean;
};

export const formDraftsAtom = atom<Record<string, FormDraftState>>({});
