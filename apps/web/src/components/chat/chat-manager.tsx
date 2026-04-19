import { ConversationsBubble } from './conversations-bubble';
import { ChatWindowList } from './chat-window-list';

/**
 * Root chat UI component. Mount once inside AppLayout.
 * Renders the floating messenger bubble and all open chat windows.
 */
export function ChatManager() {
  return (
    <>
      <ChatWindowList />
      <ConversationsBubble />
    </>
  );
}
