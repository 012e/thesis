import { useAtom, useAtomValue } from "jotai";
import { IconMessageCircle2 } from "@tabler/icons-react";
import { isDmChatOpenAtom } from "@/lib/atoms/dm-chat";
import {
  isGlobalChatOpenAtom,
  globalChatSizeAtom,
} from "@/lib/atoms/global-chat";
import { useUnreadNotifications } from "@/hooks/messages/use-unread-notifications";

/** px offset from the right edge when no panel is open. */
const BASE_RIGHT = 16;
/** Width of the DM sidebar (w-80). */
export const DM_SIDEBAR_WIDTH = 320;

export function DmToggleButton() {
  const [isDmOpen, setIsDmOpen] = useAtom(isDmChatOpenAtom);
  const isAiOpen = useAtomValue(isGlobalChatOpenAtom);
  const aiSize = useAtomValue(globalChatSizeAtom);
  const { unreadCount } = useUnreadNotifications();

  // Hidden while the DM panel is open — the panel header's ✕ handles closing.
  if (isDmOpen) return null;

  // Shift button outside the AI panel when it's open.
  const aiPanelWidth = isAiOpen ? (aiSize === "normal" ? 320 : 480) : 0;
  const rightPx = aiPanelWidth + BASE_RIGHT;

  return (
    <button
      type="button"
      onClick={() => setIsDmOpen(true)}
      aria-label="Open messages"
      title="Open messages"
      className="fixed bottom-4 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:scale-105 active:scale-95"
      style={{
        right: `${rightPx}px`,
        transition:
          "right 300ms ease-in-out, transform 200ms ease-in-out",
      }}
    >
      <IconMessageCircle2 className="size-5" />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
