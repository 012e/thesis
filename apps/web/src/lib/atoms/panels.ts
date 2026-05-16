import { atomWithStorage } from "jotai/utils";

export type ActivePanel = "ai" | "dm" | null;

/**
 * Single source of truth for which panel is currently open.
 * Only one panel can be open at a time (mutual exclusivity).
 */
export const activePanelAtom = atomWithStorage<ActivePanel>(
  "active_panel",
  null,
);
