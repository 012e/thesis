import { IconSparkles } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { isGlobalChatOpenAtom } from "@/lib/atoms/global-chat";
import { isDmChatOpenAtom } from "@/lib/atoms/dm-chat";
import { DM_SIDEBAR_WIDTH } from "@/components/chat/dm-toggle-button";

/** px offset from the right edge when no panel is open. */
const BASE_RIGHT = 16;

export function GlobalChatToggleButton() {
  const [isOpen, setIsOpen] = useAtom(isGlobalChatOpenAtom);
  const isDmOpen = useAtomValue(isDmChatOpenAtom);

  // Hidden while the AI panel is open — the panel header's ✕ handles closing.
  if (isOpen) return null;

  // Shift button outside the DM panel when it's open.
  const dmPanelWidth = isDmOpen ? DM_SIDEBAR_WIDTH : 0;
  const rightPx = dmPanelWidth + BASE_RIGHT;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label="Open AI chat (Ctrl+Shift+K)"
      title="Open AI chat (Ctrl+Shift+K)"
      className="fixed bottom-20 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:scale-105 active:scale-95"
      style={{
        right: `${rightPx}px`,
        transition:
          "right 300ms ease-in-out, transform 200ms ease-in-out",
      }}
    >
      <IconSparkles className="size-5" />
    </button>
  );
}
