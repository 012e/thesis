import { useAtom, useAtomValue } from "jotai";
import { IconMessageCircle2 } from "@tabler/icons-react";
import { useState } from "react";
import { isDmChatOpenAtom } from "@/lib/atoms/dm-chat";
import {
  isGlobalChatOpenAtom,
  globalChatSizeAtom,
} from "@/lib/atoms/global-chat";
import { useUnreadNotifications } from "@/hooks/messages/use-unread-notifications";
import { cn } from "@/lib/utils";

/** px offset from the right edge when no panel is open. */
const BASE_RIGHT = 16;
/** Width of the DM sidebar (w-80). */
export const DM_SIDEBAR_WIDTH = 320;

export function DmToggleButton() {
  const [isDmOpen, setIsDmOpen] = useAtom(isDmChatOpenAtom);
  const isAiOpen = useAtomValue(isGlobalChatOpenAtom);
  const aiSize = useAtomValue(globalChatSizeAtom);
  const { unreadCount } = useUnreadNotifications();
  const [popKey, setPopKey] = useState(0);

  // Shift the messages bubble outside whichever right-side panel is open.
  const aiPanelWidth = isAiOpen ? (aiSize === "normal" ? 320 : 480) : 0;
  const dmPanelWidth = isDmOpen ? DM_SIDEBAR_WIDTH : 0;
  const rightPx = Math.max(aiPanelWidth, dmPanelWidth) + BASE_RIGHT;

  return (
    <button
      type="button"
      onClick={() => {
        setPopKey((prev) => prev + 1);
        setIsDmOpen(!isDmOpen);
      }}
      aria-label={isDmOpen ? "Close messages" : "Open messages"}
      title={isDmOpen ? "Close messages" : "Open messages"}
      className={cn(
        "fixed bottom-4 z-50 flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-black text-white shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] hover:scale-105 hover:border-white/35 hover:bg-neutral-950 active:scale-95 dark:border-white/25",
        isDmOpen &&
          "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
      style={{
        right: `${rightPx}px`,
        transition: "right 300ms ease-in-out, transform 200ms ease-in-out",
      }}
    >
      <span
        key={popKey}
        className={cn(
          "flex items-center justify-center",
          popKey > 0 && "animate-chat-bubble-pop",
        )}
      >
        <IconMessageCircle2 className="size-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
    </button>
  );
}
