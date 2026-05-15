import { IconSparkles, IconX } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { cn } from "@/lib/utils";
import { isGlobalChatOpenAtom } from "@/lib/atoms/global-chat";

export function GlobalChatToggleButton() {
  const [isOpen, setIsOpen] = useAtom(isGlobalChatOpenAtom);

  return (
    <button
      type="button"
      onClick={() => setIsOpen((prev) => !prev)}
      aria-label={isOpen ? "Close AI chat" : "Open AI chat (Ctrl+Shift+K)"}
      title={isOpen ? "Close AI chat" : "Open AI chat (Ctrl+Shift+K)"}
      className={cn(
        "fixed bottom-20 right-4 z-50",
        "flex items-center justify-center w-12 h-12 rounded-full shadow-lg",
        "bg-primary text-primary-foreground",
        "hover:scale-105 active:scale-95 transition-all duration-200",
        isOpen && "scale-105",
      )}
    >
      {isOpen ? (
        <IconX className="size-5" />
      ) : (
        <IconSparkles className="size-5" />
      )}
    </button>
  );
}
