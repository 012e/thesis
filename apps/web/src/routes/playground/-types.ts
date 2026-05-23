import { atomWithStorage } from "jotai/utils";
import type { SlotItemMap } from "swapy";

export type Language = "javascript" | "typescript";
export type PanelId = "playground" | "chat";
export type PanelSlotId = "primary" | "secondary";

export type PanelSlots = Record<PanelSlotId, PanelId>;

export const MIN_EDITOR_HEIGHT = 220;
export const MIN_OUTPUT_HEIGHT = 120;
export const MIN_DESKTOP_PANEL_WIDTH = 320;
export const MIN_MOBILE_PANEL_HEIGHT = 280;
export const OUTER_RESIZE_HANDLE_SIZE = 12;
export const COLLAPSED_CHAT_STRIP_SIZE = 28;

export const isOutputMinimizedAtom = atomWithStorage<boolean>(
  "playground.isOutputMinimized",
  false,
);

export function isPanelId(value: string | undefined): value is PanelId {
  return value === "playground" || value === "chat";
}

export function getPanelSlots(slotItemMap: SlotItemMap): PanelSlots | null {
  const primary = slotItemMap.asObject.primary;
  const secondary = slotItemMap.asObject.secondary;

  if (!isPanelId(primary) || !isPanelId(secondary)) return null;
  return { primary, secondary };
}
