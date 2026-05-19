import { IconSparkles } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import {
  isGlobalChatOpenAtom,
  globalChatSizeAtom,
} from "@/lib/atoms/global-chat";
import { isDmChatOpenAtom } from "@/lib/atoms/dm-chat";
import { DM_SIDEBAR_WIDTH } from "@/components/chat/dm-toggle-button";
import { cn } from "@/lib/utils";

/** px offset from the right edge when no panel is open. */
const BASE_RIGHT = 16;
const BUBBLE_GAP = 12;
const BUBBLE_SIZE = 48;

export function GlobalChatToggleButton() {
  const [isOpen, setIsOpen] = useAtom(isGlobalChatOpenAtom);
  const isDmOpen = useAtomValue(isDmChatOpenAtom);
  const aiSize = useAtomValue(globalChatSizeAtom);
  const [popKey, setPopKey] = useState(0);

  // Keep the AI bubble left of the messages bubble and outside any open panel.
  const dmPanelWidth = isDmOpen ? DM_SIDEBAR_WIDTH : 0;
  const aiPanelWidth = isOpen ? (aiSize === "normal" ? 320 : 480) : 0;
  const rightPx =
    Math.max(dmPanelWidth, aiPanelWidth) +
    BASE_RIGHT +
    BUBBLE_SIZE +
    BUBBLE_GAP;

  return (
    <button
      type="button"
      onClick={() => {
        setPopKey((prev) => prev + 1);
        setIsOpen(!isOpen);
      }}
      aria-label={isOpen ? "Close AI chat" : "Open AI chat (Ctrl+Shift+K)"}
      title={isOpen ? "Close AI chat" : "Open AI chat (Ctrl+Shift+K)"}
      className={cn(
        "fixed bottom-4 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:scale-105 active:scale-95",
        isOpen && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
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
        <IconSparkles className="size-5" />
      </span>
    </button>
  );
}
