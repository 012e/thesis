import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { ChatToolUIs } from "@/components/assistant-ui/chat-tool-uis";

export function ChatAssistantEffects() {
  return (
    <>
      <ChatToolUIs />
      <ChatToolStateSync />
    </>
  );
}
