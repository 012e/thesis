import { atom } from 'jotai';

export interface ChatWindowState {
  conversationId: string;
  minimized: boolean;
}

const MAX_OPEN_WINDOWS = 3;

/** Tracks which DM conversation windows are currently open on screen. */
export const openChatWindowsAtom = atom<ChatWindowState[]>([]);

/**
 * Write-only atom to open (or unminimize) a chat window for a given conversationId.
 * If MAX_OPEN_WINDOWS is reached, the oldest window is closed to make room.
 */
export const openChatWindowAtom = atom(
  null,
  (get, set, conversationId: string) => {
    const windows = get(openChatWindowsAtom);
    const existing = windows.find((w) => w.conversationId === conversationId);

    if (existing) {
      if (existing.minimized) {
        set(
          openChatWindowsAtom,
          windows.map((w) =>
            w.conversationId === conversationId
              ? { ...w, minimized: false }
              : w,
          ),
        );
      }
      return;
    }

    const trimmed =
      windows.length >= MAX_OPEN_WINDOWS ? windows.slice(1) : [...windows];

    set(openChatWindowsAtom, [
      ...trimmed,
      { conversationId, minimized: false },
    ]);
  },
);

/** Write-only atom to close a chat window. */
export const closeChatWindowAtom = atom(
  null,
  (get, set, conversationId: string) => {
    set(
      openChatWindowsAtom,
      get(openChatWindowsAtom).filter(
        (w) => w.conversationId !== conversationId,
      ),
    );
  },
);

/** Write-only atom to toggle the minimized state of a chat window. */
export const toggleMinimizeChatWindowAtom = atom(
  null,
  (get, set, conversationId: string) => {
    set(
      openChatWindowsAtom,
      get(openChatWindowsAtom).map((w) =>
        w.conversationId === conversationId
          ? { ...w, minimized: !w.minimized }
          : w,
      ),
    );
  },
);
