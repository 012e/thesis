import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { PlanToolUIs } from "@/components/assistant-ui/chat-tool-uis";

export function ChatAssistantEffects() {
  return (
    <>
      <PlanToolUIs />
      <ChatToolStateSync />
    </>
  );
}
