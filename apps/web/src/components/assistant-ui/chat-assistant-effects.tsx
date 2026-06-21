import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { PlanToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { LineGraphAssistantTools } from "@/components/assistant-ui/comparison-chart-tools";
import { ContentReferenceAssistantTools } from "@/components/assistant-ui/content-reference-tools";

export function ChatAssistantEffects() {
  return (
    <>
      <PlanToolUIs />
      <LineGraphAssistantTools />
      <ContentReferenceAssistantTools />
      <ChatToolStateSync />
    </>
  );
}
