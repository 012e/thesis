import { atomWithStorage } from "jotai/utils";

export type GlobalChatSize = "normal" | "large";

/** Whether the global AI chat panel is open (persisted across navigations). */
export const isGlobalChatOpenAtom = atomWithStorage<boolean>(
  "global_chat_open",
  false,
);

/** Panel width: 'normal' = 320 px, 'large' = 480 px (persisted). */
export const globalChatSizeAtom = atomWithStorage<GlobalChatSize>(
  "global_chat_size",
  "normal",
);
