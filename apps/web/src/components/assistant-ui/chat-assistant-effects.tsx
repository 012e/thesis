import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import {
  FormToolUIs,
  PlanToolUIs,
  RequestUserContextToolUI,
} from "@/components/assistant-ui/chat-tool-uis";
import { LineGraphAssistantTools } from "@/components/assistant-ui/comparison-chart-tools";
import { ContentReferenceAssistantTools } from "@/components/assistant-ui/content-reference-tools";
import { PlaygroundToolUIs } from "@/components/assistant-ui/playground-tool-uis";
import { UserContextAssistantTool } from "@/components/assistant-ui/user-context-questionnaire";

export function ChatAssistantEffects() {
  return (
    <>
      <PlanToolUIs />
      <FormToolUIs />
      <PlaygroundToolUIs />
      <LineGraphAssistantTools />
      <ContentReferenceAssistantTools />
      <UserContextAssistantTool />
      <RequestUserContextToolUI />
      <ChatToolStateSync />
    </>
  );
}
