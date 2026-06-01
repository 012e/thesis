import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { PlanToolUIs } from "@/components/assistant-ui/chat-tool-uis";

export function ChatAssistantEffects({ syncForms = false }: { syncForms?: boolean }) {
  return (
    <>
      <PlanToolUIs />
      <ChatToolStateSync syncForms={syncForms} />
    </>
  );
}
