import { atom } from "jotai";

export type FormDraftState = {
  activeForm?: string;
  data: Record<string, any>;
};

export const formDraftsAtom = atom<Record<string, FormDraftState>>({});
