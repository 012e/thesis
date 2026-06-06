import { useAssistantInstructions } from "@assistant-ui/react";
import { ChatToolStateSync } from "@/components/assistant-ui/chat-tool-state-sync";
import { FormToolUIs } from "@/components/assistant-ui/chat-tool-uis";
import { useAssistantPageReady } from "@/lib/assistant/page-readiness";
import { useChatState } from "@/hooks/use-chat-state";

export function ChatPageAssistantTools() {
  const { activeForm, draftData } = useChatState();

  useAssistantInstructions(
    `Current Active Form: ${activeForm ?? "None"}\nCurrent Form State: ${JSON.stringify(draftData)}\n\nUse the open_form tool to select a form, and set_form_field to edit fields.`,
  );
  useAssistantPageReady("chat");

  return (
    <>
      <FormToolUIs />
      <ChatToolStateSync syncForms syncPlans={false} />
    </>
  );
}
