import { atomWithStorage } from "jotai/utils";
import type { SlotItemMap } from "swapy";

export type Language = "javascript" | "typescript";
export type PanelId = "playground" | "chat";
export type PanelSlotId = PanelId;

export type PanelSlots = Record<PanelSlotId, PanelId>;

export const DEFAULT_PANEL_SLOTS: PanelSlots = {
  playground: "playground",
  chat: "chat",
};

export const PANEL_SLOTS_STORAGE_KEY = "playground.panelSlots";

export const MIN_EDITOR_HEIGHT = 220;
export const MIN_OUTPUT_HEIGHT = 120;
export const MIN_DESKTOP_PANEL_WIDTH = 320;
export const MIN_MOBILE_PANEL_HEIGHT = 280;
export const OUTER_RESIZE_HANDLE_SIZE = 2;
export const COLLAPSED_CHAT_STRIP_SIZE = 28;

export const isOutputMinimizedAtom = atomWithStorage<boolean>(
  "playground.isOutputMinimized",
  false,
);

export const panelSlotsAtom = atomWithStorage<PanelSlots>(
  PANEL_SLOTS_STORAGE_KEY,
  DEFAULT_PANEL_SLOTS,
);

export const primaryPanelSizeAtom = atomWithStorage<number>(
  "playground.primaryPanelSize",
  68,
);

export function parsePanelSlots(value: unknown): PanelSlots | null {
  if (!value || typeof value !== "object") return null;

  const slots = value as Partial<Record<PanelSlotId, unknown>>;
  const playground = slots.playground;
  const chat = slots.chat;

  if (
    typeof playground !== "string" ||
    typeof chat !== "string" ||
    !isPanelId(playground) ||
    !isPanelId(chat) ||
    playground === chat
  ) {
    return null;
  }

  return { playground, chat };
}

export function getStoredPanelSlots(): PanelSlots {
  if (typeof window === "undefined") return DEFAULT_PANEL_SLOTS;

  try {
    const storedValue = window.localStorage.getItem(PANEL_SLOTS_STORAGE_KEY);
    if (!storedValue) return DEFAULT_PANEL_SLOTS;

    return parsePanelSlots(JSON.parse(storedValue)) ?? DEFAULT_PANEL_SLOTS;
  } catch {
    return DEFAULT_PANEL_SLOTS;
  }
}

export function isPanelId(value: string | undefined): value is PanelId {
  return value === "playground" || value === "chat";
}

export function getPanelSlots(slotItemMap: SlotItemMap): PanelSlots | null {
  return parsePanelSlots(slotItemMap.asObject);
}
