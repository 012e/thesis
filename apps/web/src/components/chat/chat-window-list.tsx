import { useAtomValue } from "jotai";
import { openChatWindowsAtom } from "@/lib/atoms/chat-windows";
import { ChatWindow } from "./chat-window";

/**
 * Renders all currently-open chat windows, stacked from right to left
 * just to the left of the conversations bubble.
 */
export function ChatWindowList() {
  const windows = useAtomValue(openChatWindowsAtom);

  return (
    <>
      {windows.map((win, index) => (
        <ChatWindow
          key={win.conversationId}
          conversationId={win.conversationId}
          index={index}
          minimized={win.minimized}
        />
      ))}
    </>
  );
}
