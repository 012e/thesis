import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { PlanToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { LineGraphAssistantTools } from "@/components/assistant-ui/comparison-chart-tools";
import { ContentReferenceAssistantTools } from "@/components/assistant-ui/content-reference-tools";
import { UserContextAssistantTool } from "@/components/assistant-ui/user-context-questionnaire";

export function ChatAssistantEffects() {
  return (
    <>
      <PlanToolUIs />
      <LineGraphAssistantTools />
      <ContentReferenceAssistantTools />
      <UserContextAssistantTool />
      <ChatToolStateSync />
    </>
  );
}
