import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { activePanelAtom } from "./panels";

export type GlobalChatSize = "normal" | "large";

/**
 * Whether the global AI chat panel is open.
 * Derived from activePanelAtom — setting this to true closes the DM panel.
 */
export const isGlobalChatOpenAtom = atom(
  (get) => get(activePanelAtom) === "ai",
  (_get, set, value: boolean) => {
    set(activePanelAtom, value ? "ai" : null);
  },
);

/** Panel width: 'normal' = 320 px, 'large' = 480 px (persisted). */
export const globalChatSizeAtom = atomWithStorage<GlobalChatSize>(
  "global_chat_size",
  "normal",
);
