import { atom } from "jotai";
import { activePanelAtom } from "./panels";

/**
 * Whether the DM sidebar panel is open.
 * Derived from activePanelAtom — setting this to true closes the AI panel.
 */
export const isDmChatOpenAtom = atom(
  (get) => get(activePanelAtom) === "dm",
  (_get, set, value: boolean) => {
    set(activePanelAtom, value ? "dm" : null);
  },
);

/**
 * The conversation ID currently shown in the DM sidebar detail view.
 * null = list view.
 */
export const activeDmConversationAtom = atom<string | null>(null);
